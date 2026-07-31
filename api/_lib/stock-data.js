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

  return {
    name: safeStr(f[0], symbol),
    price,
    chg_pct: safeNum(f[2]) ?? 0,
    chg_amt: safeNum(f[4]) ?? 0,
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

  // 1. 东方财富 (主源)
  try {
    result = await fetchEastMoney(m, sym);
  } catch (err) {
    console.error(`[stock-data] EastMoney failed (${m}, ${sym}):`, err?.message || err);
  }

  // 2. 新浪 (备用)
  if (!result) {
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

export { nowStr };
