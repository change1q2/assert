/**
 * 多源股票数据获取模块
 *
 * 数据源优先级：
 *   1. 东方财富 (push2.eastmoney.com) — 主源，提供价格/涨跌/PE/市值/PB/换手率
 *   2. 腾讯财经 (qt.gtimg.cn) — 补全52周高低
 *   3. 新浪财经 (hq.sinajs.cn) — 备用，美股有完整字段
 *
 * 统一返回字段:
 * { name, price, chg_pct, chg_amt, open, high, low,
 *   high_52w, low_52w, volume, turnover, pe, market_cap,
 *   turnover_rate, datetime }
 *
 * 返回 null 表示未找到。
 */

const TIMEOUT_MS = 8000;

// -----------------------------------------------------------------------
// 夜盘检测 (美股)
// 美股夜盘 = 美东时间盘后(16:00-20:00) + 盘前(04:00-09:30)
// 对应北京时间 08:00-16:00
// -----------------------------------------------------------------------
function getBeijingMinutes() {
  const now = new Date();
  // 北京 = UTC+8
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const beijingMinutes = (utcMinutes + 8 * 60) % (24 * 60);
  return beijingMinutes;
}

function isUsNightSession() {
  // 北京时间 08:00 - 16:00 为美股夜盘时段
  const m = getBeijingMinutes();
  return m >= 8 * 60 && m < 16 * 60;
}

// -----------------------------------------------------------------------
// 工具函数
// -----------------------------------------------------------------------
function nowStr() {
  const d = new Date();
  const beijing = new Date(d.getTime() + (d.getTimezoneOffset() + 8 * 60) * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    beijing.getUTCFullYear() + '-' + pad(beijing.getUTCMonth() + 1) + '-' + pad(beijing.getUTCDate()) +
    ' ' + pad(beijing.getUTCHours()) + ':' + pad(beijing.getUTCMinutes()) + ':' + pad(beijing.getUTCSeconds())
  );
}

function safeNum(v) {
  if (v === null || v === undefined || v === '' || v === '-' || v === 'N/A') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function safeStr(v, def = '-') {
  if (v === null || v === undefined || v === '' || v === '-') return def;
  return String(v);
}

async function fetchWithTimeout(url, opts = {}, timeout = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const resp = await fetch(url, { ...opts, signal: controller.signal });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp;
  } finally {
    clearTimeout(timer);
  }
}

// -----------------------------------------------------------------------
// 东方财富 (主源)
// secid 前缀: A股 SH=1, SZ=0; 港股=116; 美股 NASDAQ=105, NYSE=106
// -----------------------------------------------------------------------
const EM_FIELDS = 'f43,f44,f45,f46,f47,f48,f55,f57,f58,f60,f116,f117,f162,f167,f169,f170,f173';

function emSecid(market, symbol) {
  if (market === 'a') {
    if (symbol.startsWith('6')) return `1.${symbol}`;
    if (symbol.startsWith('0') || symbol.startsWith('3')) return `0.${symbol}`;
    return `1.${symbol}`; // 北交所默认
  }
  if (market === 'hk') {
    const code = String(symbol).replace(/\.HK$/i, '').padStart(5, '0');
    return `116.${code}`;
  }
  if (market === 'us') {
    return `105.${symbol.toUpperCase()}`; // 先尝试 NASDAQ
  }
  return null;
}

function emSecidAlt(market, symbol) {
  // 备用 secid (NYSE)
  if (market === 'us') return `106.${symbol.toUpperCase()}`;
  return null;
}

async function fetchEastMoney(market, symbol) {
  const secid = emSecid(market, symbol);
  if (!secid) return null;

  const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=${EM_FIELDS}&fltt=2&invt=2`;
  let resp;
  try {
    resp = await fetchWithTimeout(url);
  } catch (e) {
    // 美股尝试 NYSE
    const altSecid = emSecidAlt(market, symbol);
    if (!altSecid) return null;
    const altUrl = `https://push2.eastmoney.com/api/qt/stock/get?secid=${altSecid}&fields=${EM_FIELDS}&fltt=2&invt=2`;
    resp = await fetchWithTimeout(altUrl);
  }

  const json = await resp.json();
  const d = json?.data;
  if (!d || !d.f43) return null;

  const price = safeNum(d.f43);
  if (price === null) return null;

  const prevClose = safeNum(d.f60);
  const chgAmt = safeNum(d.f169) ?? (prevClose ? price - prevClose : null);
  const chgPct = safeNum(d.f170) ?? (prevClose && prevClose !== 0 ? (chgAmt / prevClose) * 100 : null);

  // PE: 优先用 f162(TTM)，回退 f55(动态)
  const pe = safeNum(d.f162) ?? safeNum(d.f55);

  // 市值: f116 总市值
  const marketCap = safeNum(d.f116);

  // 夜盘检测：美股在北京时间 08:00-16:00 期间
  // 如果当前价 != 昨收价，说明夜盘交易已产生
  let session = 'regular';
  const isUsMarket = market === 'us';
  if (isUsMarket && isUsNightSession()) {
    if (prevClose !== null && price !== prevClose) {
      session = 'night';
    } else if (prevClose !== null && price === prevClose) {
      // 夜盘时段但价格未变动，可能夜盘尚未开始或该股无夜盘
      session = 'night_inactive';
    }
  }

  return {
    name: safeStr(d.f58, symbol),
    price,
    chg_pct: chgPct ?? 0,
    chg_amt: chgAmt ?? 0,
    open: safeNum(d.f46) ?? 0,
    high: safeNum(d.f44) ?? 0,
    low: safeNum(d.f45) ?? 0,
    high_52w: '-',
    low_52w: '-',
    volume: safeNum(d.f47) ?? 0,
    turnover: safeNum(d.f48) ?? 0,
    pe: pe !== null ? pe : '-',
    market_cap: marketCap !== null ? marketCap : '-',
    turnover_rate: safeNum(d.f173) ?? '-',
    pb: safeNum(d.f167) ?? '-',
    datetime: nowStr(),
    session,
    _source: 'eastmoney',
  };
}

// -----------------------------------------------------------------------
// 腾讯财经 (补全52周高低)
// -----------------------------------------------------------------------
function tencentSymbol(market, symbol) {
  if (market === 'a') {
    if (symbol.startsWith('6')) return 'sh' + symbol;
    if (symbol.startsWith('0') || symbol.startsWith('3')) return 'sz' + symbol;
    return 'sh' + symbol;
  }
  if (market === 'hk') {
    const code = String(symbol).replace(/\.HK$/i, '').padStart(5, '0');
    return 'hk' + code;
  }
  if (market === 'us') {
    return 'us' + symbol.toUpperCase();
  }
  return null;
}

async function fetchTencent52w(market, symbol) {
  const tq = tencentSymbol(market, symbol);
  if (!tq) return { high_52w: null, low_52w: null };

  const url = `https://qt.gtimg.cn/q=${tq}`;
  const resp = await fetchWithTimeout(url);
  const buf = await resp.arrayBuffer();
  // 腾讯返回 GBK 编码
  let text;
  try {
    text = new TextDecoder('gbk').decode(buf);
  } catch (_) {
    text = new TextDecoder('utf-8').decode(buf);
  }

  const parts = text.split('~');
  if (parts.length < 50) return { high_52w: null, low_52w: null };

  // A股: [47]=52w_high, [48]=52w_low
  // 港股/美股: [48]=52w_high, [49]=52w_low
  let idxHigh, idxLow;
  if (market === 'a') {
    idxHigh = 47;
    idxLow = 48;
  } else {
    idxHigh = 48;
    idxLow = 49;
  }

  const high52w = safeNum(parts[idxHigh]);
  const low52w = safeNum(parts[idxLow]);

  return {
    high_52w: high52w,
    low_52w: low52w,
  };
}

// -----------------------------------------------------------------------
// 新浪财经 (备用源)
// -----------------------------------------------------------------------
const SINA_HEADERS = { Referer: 'https://finance.sina.com.cn' };

async function fetchSinaRaw(url) {
  const resp = await fetchWithTimeout(url, { headers: SINA_HEADERS });
  const buf = await resp.arrayBuffer();
  try {
    return new TextDecoder('gbk').decode(buf);
  } catch (_) {
    return new TextDecoder('utf-8').decode(buf);
  }
}

function parseSinaLine(text, prefix) {
  const lines = text.split('\n');
  for (const line of lines) {
    const marker = `var hq_str_${prefix}`;
    const idx = line.indexOf(marker);
    if (idx === -1) continue;
    const eq = line.indexOf('="', idx);
    if (eq === -1) continue;
    const end = line.indexOf('";', eq + 2);
    if (end === -1) continue;
    const body = line.slice(eq + 2, end);
    if (!body) return null;
    return body.split(',');
  }
  return null;
}

async function fetchSinaA(symbol) {
  const prefix = symbol.startsWith('6') ? 'sh' : 'sz';
  const text = await fetchSinaRaw(`https://hq.sinajs.cn/list=${prefix}${symbol}`);
  const f = parseSinaLine(text, prefix + symbol);
  if (!f || f.length < 10) return null;

  const price = safeNum(f[3]);
  if (price === null) return null;
  const prevClose = safeNum(f[2]);

  return {
    name: safeStr(f[0], symbol),
    price,
    chg_pct: prevClose && prevClose !== 0 ? ((price - prevClose) / prevClose) * 100 : 0,
    chg_amt: prevClose ? price - prevClose : 0,
    open: safeNum(f[1]) ?? 0,
    high: safeNum(f[4]) ?? 0,
    low: safeNum(f[5]) ?? 0,
    high_52w: '-',
    low_52w: '-',
    volume: safeNum(f[8]) ?? 0,
    turnover: safeNum(f[9]) ?? 0,
    pe: '-',
    market_cap: '-',
    turnover_rate: '-',
    datetime: nowStr(),
    _source: 'sina',
  };
}

async function fetchSinaHk(symbol) {
  const code = String(symbol).replace(/\.HK$/i, '').padStart(5, '0');
  const text = await fetchSinaRaw(`https://hq.sinajs.cn/list=hk${code}`);
  const f = parseSinaLine(text, 'hk' + code);
  if (!f || f.length < 9) return null;

  const price = safeNum(f[6]);
  if (price === null) return null;

  return {
    name: safeStr(f[1], safeStr(f[0], symbol)),
    price,
    chg_pct: safeNum(f[8]) ?? 0,
    chg_amt: safeNum(f[7]) ?? 0,
    open: safeNum(f[2]) ?? 0,
    high: safeNum(f[4]) ?? 0,
    low: safeNum(f[5]) ?? 0,
    high_52w: '-',
    low_52w: '-',
    volume: 0,
    turnover: 0,
    pe: '-',
    market_cap: '-',
    turnover_rate: '-',
    datetime: nowStr(),
    _source: 'sina',
  };
}

async function fetchSinaUs(symbol) {
  const lower = String(symbol).toLowerCase();
  const text = await fetchSinaRaw(`https://hq.sinajs.cn/list=gb_${lower}`);
  const f = parseSinaLine(text, 'gb_' + lower);
  if (!f || f.length < 15) return null;

  const price = safeNum(f[1]);
  if (price === null) return null;

  const chgAmt = safeNum(f[4]) ?? 0;
  const prevClose = price - chgAmt;

  // 夜盘检测
  let session = 'regular';
  if (isUsNightSession()) {
    if (prevClose !== 0 && price !== prevClose) {
      session = 'night';
    } else {
      session = 'night_inactive';
    }
  }

  return {
    name: safeStr(f[0], symbol),
    price,
    chg_pct: safeNum(f[2]) ?? 0,
    chg_amt: chgAmt,
    open: safeNum(f[5]) ?? 0,
    high: safeNum(f[6]) ?? 0,
    low: safeNum(f[7]) ?? 0,
    high_52w: safeNum(f[8]) ?? '-',
    low_52w: safeNum(f[9]) ?? '-',
    volume: safeNum(f[10]) ?? 0,
    turnover: safeNum(f[10]) ?? 0,
    pe: safeNum(f[14]) ?? '-',
    market_cap: safeNum(f[12]) ?? '-',
    turnover_rate: safeNum(f[13]) ?? '-',
    datetime: safeStr(f[3], nowStr()),
    session,
    _source: 'sina',
  };
}

// -----------------------------------------------------------------------
// 统一入口
// -----------------------------------------------------------------------
export async function fetchStockData(market, symbol) {
  const m = String(market || '').toLowerCase();
  const sym = String(symbol || '').trim();
  if (!sym) return null;

  let result = null;
  const isUsNight = m === 'us' && isUsNightSession();

  // 1. 东方财富 (主源)
  try {
    result = await fetchEastMoney(m, sym);
  } catch (err) {
    console.error(`[stock-data] EastMoney failed (${m}, ${sym}):`, err?.message || err);
  }

  // 2. 新浪 + 雅虎 (备用 / 夜盘优先)
  // 美股夜盘时段: 新浪 → 雅虎（覆盖盘前盘后）→ 东方财富回退
  if (isUsNight) {
    // 2a. 新浪
    try {
      const sinaResult = await fetchSinaUs(sym);
      if (sinaResult) {
        if (sinaResult.session === 'night') {
          result = sinaResult;
        } else if (!result || result.session === 'night_inactive') {
          result = sinaResult;
        }
      }
    } catch (err) {
      console.error(`[stock-data] Sina night-session failed (${m}, ${sym}):`, err?.message || err);
    }

    // 2b. 雅虎 — 提供更准确的盘前/盘后价格
    try {
      const yahooResult = await fetchYahooUs(sym);
      if (yahooResult && yahooResult.session === 'night') {
        // 雅虎夜盘活跃 → 优先覆盖
        result = yahooResult;
      } else if (!result) {
        result = yahooResult;
      }
    } catch (err) {
      console.error(`[stock-data] Yahoo night-session failed (${m}, ${sym}):`, err?.message || err);
    }
  } else if (!result) {
    // 非夜盘 / 非美股：原备用逻辑
    try {
      if (m === 'a') result = await fetchSinaA(sym);
      else if (m === 'hk') result = await fetchSinaHk(sym);
      else if (m === 'us') result = await fetchSinaUs(sym);
    } catch (err) {
      console.error(`[stock-data] Sina failed (${m}, ${sym}):`, err?.message || err);
    }
  }

  if (!result) return null;

  // 3. 腾讯补全52周高低 (如果缺失)
  if (result.high_52w === '-' || result.low_52w === '-') {
    try {
      const tencent = await fetchTencent52w(m, sym);
      if (tencent.high_52w !== null) result.high_52w = tencent.high_52w;
      if (tencent.low_52w !== null) result.low_52w = tencent.low_52w;
    } catch (err) {
      // 52周高低获取失败不影响主流程
      console.error(`[stock-data] Tencent 52w failed (${m}, ${sym}):`, err?.message || err);
    }
  }

  // 清理内部字段
  delete result._source;

  return result;
}

// -----------------------------------------------------------------------
// 雅虎财经 (Yahoo Finance) — 美股夜盘补充源
// 提供盘前 (pre-market) 和盘后 (post-market) 价格
// 免费、无需 API Key
// -----------------------------------------------------------------------
async function fetchYahooUs(symbol) {
  const sym = String(symbol).toUpperCase();
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=5d`;
  try {
    const resp = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    }, 6000);
    const data = await resp.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const regularPrice = safeNum(meta.regularMarketPrice);
    const prevClose = safeNum(meta.chartPreviousClose) ?? safeNum(meta.previousClose);
    const preMarket = safeNum(meta.preMarketPrice);
    const postMarket = safeNum(meta.postMarketPrice);
    const preMarketChange = safeNum(meta.preMarketChangePercent);
    const postMarketChange = safeNum(meta.postMarketChangePercent);

    // 夜盘价格优先级: 盘后 > 盘前 > 常规
    let price = regularPrice;
    let session = 'regular';
    let chgPct = ((regularPrice - prevClose) / prevClose * 100);

    if (isUsNightSession()) {
      // 美东时间盘后: 北京时间 08:00-12:00 (前一天 16:00-20:00 ET)
      // 美东时间盘前: 北京时间 12:00-16:00 (当天 04:00-08:00 ET)
      const beijingMin = getBeijingMinutes();

      // 北京时间 08:00-12:00 → 前一日盘后
      if (beijingMin >= 8 * 60 && beijingMin < 12 * 60 && postMarket !== null && postMarket !== regularPrice) {
        price = postMarket;
        chgPct = postMarketChange ?? ((postMarket - prevClose) / prevClose * 100);
        session = 'night';
      }
      // 北京时间 12:00-16:00 → 当日盘前
      else if (beijingMin >= 12 * 60 && beijingMin < 16 * 60 && preMarket !== null && preMarket !== regularPrice) {
        price = preMarket;
        chgPct = preMarketChange ?? ((preMarket - prevClose) / prevClose * 100);
        session = 'night';
      } else if (regularPrice !== null && regularPrice !== prevClose) {
        session = 'night';
      } else {
        session = 'night_inactive';
      }
    }

    return {
      name: safeStr(meta.longName || meta.shortName, sym),
      price,
      chg_pct: Math.round(chgPct * 100) / 100,
      chg_amt: Math.round((price - prevClose) * 100) / 100,
      open: safeNum(meta.regularMarketOpen) ?? 0,
      high: safeNum(meta.regularMarketDayHigh) ?? 0,
      low: safeNum(meta.regularMarketDayLow) ?? 0,
      high_52w: safeNum(meta.fiftyTwoWeekHigh) ?? '-',
      low_52w: safeNum(meta.fiftyTwoWeekLow) ?? '-',
      volume: safeNum(meta.regularMarketVolume) ?? 0,
      turnover: 0,
      pe: '-',
      market_cap: '-',
      turnover_rate: '-',
      datetime: safeStr(meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : nowStr()),
      session,
      preMarketPrice: preMarket,
      postMarketPrice: postMarket,
      prevClose,
      _source: 'yahoo',
    };
  } catch (err) {
    console.error(`[stock-data] Yahoo failed (${sym}):`, err?.message || err);
    return null;
  }
}

export { nowStr };
