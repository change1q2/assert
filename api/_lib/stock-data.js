/**
 * Shared stock data fetching module.
 *
 * Fetches realtime stock data from Sina Finance HTTP API.
 * No external dependencies required (uses global fetch available in Node 18+ / Vercel).
 *
 * Unified return shape:
 * {
 *   name, price, chg_pct, chg_amt, open, high, low,
 *   high_52w, low_52w, volume, turnover, pe, market_cap,
 *   turnover_rate, datetime
 * }
 *
 * Returns null when the stock is not found.
 */

const SINA_HEADERS = { Referer: 'https://finance.sina.com.cn' };
const SINA_TIMEOUT_MS = 10000;

function nowStr() {
  // Beijing time (UTC+8) "YYYY-MM-DD HH:MM:SS"
  const d = new Date();
  const beijing = new Date(d.getTime() + (d.getTimezoneOffset() + 8 * 60) * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    beijing.getUTCFullYear() +
    '-' +
    pad(beijing.getUTCMonth() + 1) +
    '-' +
    pad(beijing.getUTCDate()) +
    ' ' +
    pad(beijing.getUTCHours()) +
    ':' +
    pad(beijing.getUTCMinutes()) +
    ':' +
    pad(beijing.getUTCSeconds())
  );
}

function safeNum(v) {
  if (v === null || v === undefined || v === '' || v === '-') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function safeStr(v, def = '-') {
  if (v === null || v === undefined || v === '' || v === '-') return def;
  return String(v);
}

async function fetchSina(url) {
  // fetch is global in Node 18+ / Vercel runtime
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SINA_TIMEOUT_MS);
  try {
    const resp = await fetch(url, { headers: SINA_HEADERS, signal: controller.signal });
    if (!resp.ok) {
      throw new Error(`Sina HTTP ${resp.status}`);
    }
    // Sina returns GBK-encoded content for A/HK shares; sinajs.cn serves UTF-8 for the
    // gb_* (US) endpoint. We use .text() which decodes as UTF-8; for A/HK the response
    // is mostly ASCII (numbers + quotes), with the name potentially garbled. To handle
    // Chinese names properly we try to decode via TextDecoder('gbk') when available.
    const buf = Buffer ? await resp.arrayBuffer() : null;
    if (buf) {
      // Try GBK first (covers sh/sz/hk endpoints), fall back to UTF-8.
      try {
        return new TextDecoder('gbk').decode(buf);
      } catch (_) {
        return new TextDecoder('utf-8').decode(buf);
      }
    }
    return await resp.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseSinaLine(text, prefix) {
  // Each line looks like:  var hq_str_sh600519="...";  or  var hq_str_gb_aapl="...";
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

// ---------------------------------------------------------------------------
// A-shares (market = 'a')
// ---------------------------------------------------------------------------
function aSharePrefix(symbol) {
  // 6xxxxx -> sh ; 0xxxxx / 3xxxxx -> sz
  if (symbol.startsWith('6')) return 'sh';
  if (symbol.startsWith('0') || symbol.startsWith('3')) return 'sz';
  // 8xxxxx / 4xxxxx (北交所) - default to sh
  return 'sh';
}

async function fetchAStock(symbol) {
  const prefix = aSharePrefix(symbol);
  const url = `https://hq.sinajs.cn/list=${prefix}${symbol}`;
  const text = await fetchSina(url);
  const fields = parseSinaLine(text, prefix + symbol);
  if (!fields || fields.length < 10) return null;

  // [0]name [1]today_open [2]yesterday_close [3]current_price [4]today_high
  // [5]today_low [6]buy [7]sell [8]volume [9]amount
  const name = safeStr(fields[0], symbol);
  const open = safeNum(fields[1]);
  const prevClose = safeNum(fields[2]);
  const price = safeNum(fields[3]);
  const high = safeNum(fields[4]);
  const low = safeNum(fields[5]);
  const volume = safeNum(fields[8]);
  const amount = safeNum(fields[9]);

  if (price === null) return null;

  const chgAmt = prevClose !== null ? price - prevClose : null;
  const chgPct = prevClose && prevClose !== 0 ? (chgAmt / prevClose) * 100 : null;

  return {
    name,
    price,
    chg_pct: chgPct ?? 0,
    chg_amt: chgAmt ?? 0,
    open: open ?? 0,
    high: high ?? 0,
    low: low ?? 0,
    high_52w: '-',
    low_52w: '-',
    volume: volume ?? 0,
    turnover: amount ?? 0,
    pe: '-',
    market_cap: '-',
    turnover_rate: '-',
    datetime: nowStr(),
  };
}

// ---------------------------------------------------------------------------
// HK stocks (market = 'hk')
// ---------------------------------------------------------------------------
async function fetchHkStock(symbol) {
  // pad to 5 digits
  const code = String(symbol).replace(/\.HK$/i, '').padStart(5, '0');
  const url = `https://hq.sinajs.cn/list=hk${code}`;
  const text = await fetchSina(url);
  const fields = parseSinaLine(text, 'hk' + code);
  if (!fields || fields.length < 9) return null;

  // [0]english_name [1]chinese_name [2]open [3]prev_close [4]high [5]low
  // [6]current [7]diff [8]chg_pct
  const chineseName = safeStr(fields[1], null);
  const englishName = safeStr(fields[0], null);
  const name = chineseName || englishName || symbol;
  const open = safeNum(fields[2]);
  const prevClose = safeNum(fields[3]);
  const high = safeNum(fields[4]);
  const low = safeNum(fields[5]);
  const price = safeNum(fields[6]);
  const diff = safeNum(fields[7]);
  const chgPct = safeNum(fields[8]);

  if (price === null) return null;

  return {
    name,
    price,
    chg_pct: chgPct ?? 0,
    chg_amt: diff ?? 0,
    open: open ?? 0,
    high: high ?? 0,
    low: low ?? 0,
    high_52w: '-',
    low_52w: '-',
    volume: 0,
    turnover: 0,
    pe: '-',
    market_cap: '-',
    turnover_rate: '-',
    datetime: nowStr(),
  };
}

// ---------------------------------------------------------------------------
// US stocks (market = 'us')
// ---------------------------------------------------------------------------
async function fetchUsStock(symbol) {
  const lower = String(symbol).toLowerCase();
  const url = `https://hq.sinajs.cn/list=gb_${lower}`;
  const text = await fetchSina(url);
  const fields = parseSinaLine(text, 'gb_' + lower);
  if (!fields || fields.length < 15) return null;

  // [0]name [1]price [2]chg_pct [3]datetime [4]chg_amt [5]open [6]high [7]low
  // [8]52w_high [9]52w_low [10]volume [12]market_cap [13]turnover_rate [14]pe
  const name = safeStr(fields[0], symbol);
  const price = safeNum(fields[1]);
  const chgPct = safeNum(fields[2]);
  const datetime = safeStr(fields[3], nowStr());
  const chgAmt = safeNum(fields[4]);
  const open = safeNum(fields[5]);
  const high = safeNum(fields[6]);
  const low = safeNum(fields[7]);
  const high52w = safeNum(fields[8]);
  const low52w = safeNum(fields[9]);
  const volume = safeNum(fields[10]);
  const marketCap = safeNum(fields[12]);
  const turnoverRate = safeNum(fields[13]);
  const pe = safeNum(fields[14]);

  if (price === null) return null;

  return {
    name,
    price,
    chg_pct: chgPct ?? 0,
    chg_amt: chgAmt ?? 0,
    open: open ?? 0,
    high: high ?? 0,
    low: low ?? 0,
    high_52w: high52w !== null ? high52w : '-',
    low_52w: low52w !== null ? low52w : '-',
    volume: volume ?? 0,
    turnover: volume ?? 0,
    pe: pe !== null ? pe : '-',
    market_cap: marketCap !== null ? marketCap : '-',
    turnover_rate: turnoverRate !== null ? turnoverRate : '-',
    datetime,
  };
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------
export async function fetchStockData(market, symbol) {
  const m = String(market || '').toLowerCase();
  const sym = String(symbol || '').trim();
  if (!sym) return null;

  try {
    if (m === 'a') return await fetchAStock(sym);
    if (m === 'hk') return await fetchHkStock(sym);
    if (m === 'us') return await fetchUsStock(sym);
    return null;
  } catch (err) {
    // Network / parse error — caller can decide how to surface.
    console.error(`[stock-data] fetchStockData(${m}, ${sym}) failed:`, err?.message || err);
    return null;
  }
}

export { nowStr };
