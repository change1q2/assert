import https from "node:https";

const DEFAULT_RATES = {
  USD: 7.15,
  JPY: 0.046,
  HKD: 0.86,
  EUR: 7.85,
  CNY: 1,
};

let cachedRates = { ...DEFAULT_RATES };
let cachedAt = 0;
const CACHE_TTL = 60 * 1000; // 1分钟缓存

// 数据源1：exchangerate-api.com（免费、无需密钥、返回 JSON）
function fetchFromExchangeRateAPI() {
  return new Promise((resolve) => {
    const req = https.get('https://api.exchangerate-api.com/v4/latest/CNY', (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed.rates) {
            const rates = { ...DEFAULT_RATES };
            // API 返回 1 CNY = x 外币，需要转换为 1 外币 = x CNY
            for (const code of ['USD', 'JPY', 'HKD', 'EUR']) {
              const cnyToForeign = parsed.rates[code];
              if (cnyToForeign && cnyToForeign > 0) {
                rates[code] = Math.round((1 / cnyToForeign) * 10000) / 10000;
              }
            }
            // 验证 HKD 汇率在合理范围内
            if (rates.HKD > 0.7 && rates.HKD < 1.0) {
              resolve(rates);
              return;
            }
          }
          resolve(null);
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
  });
}

// 数据源2：shishihuilv.com（HTML 解析）
function parseExchangeRates(html) {
  const rates = { ...DEFAULT_RATES };
  const ratePatterns = {
    USD: /美元.*?([\d.]+)/i,
    JPY: /日元.*?([\d.]+)/i,
    HKD: /港元.*?([\d.]+)/i,
    EUR: /欧元.*?([\d.]+)/i,
  };
  for (const [code, pattern] of Object.entries(ratePatterns)) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const value = parseFloat(match[1]);
      if (!isNaN(value) && value > 0) {
        rates[code] = value;
      }
    }
  }
  const tablePattern = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  const rows = html.match(tablePattern) || [];
  for (const row of rows) {
    for (const [code, name] of [['USD', '美元'], ['JPY', '日元'], ['HKD', '港元'], ['EUR', '欧元']]) {
      if (row.includes(name)) {
        const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        const tds = [];
        let tdMatch;
        while ((tdMatch = tdPattern.exec(row)) !== null) {
          tds.push(tdMatch[1].replace(/<[^>]*>/g, '').trim());
        }
        for (const td of tds) {
          const value = parseFloat(td);
          if (!isNaN(value) && value > 0 && value < 100) {
            rates[code] = value;
            break;
          }
        }
      }
    }
  }
  return rates;
}

function fetchFromShishi() {
  return new Promise((resolve) => {
    const req = https.get('https://www.shishihuilv.com/zuixin/', (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(parseExchangeRates(data));
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(10000, () => { req.destroy(); resolve(null); });
  });
}

async function fetchExchangeRatesFromSource() {
  // 优先使用 exchangerate-api.com
  try {
    const apiRates = await fetchFromExchangeRateAPI();
    if (apiRates) return apiRates;
    console.warn('ExchangeRateAPI failed, trying fallback');
  } catch (err) {
    console.error('ExchangeRateAPI error:', err);
  }
  // 备用：shishihuilv.com
  try {
    const shishiRates = await fetchFromShishi();
    if (shishiRates) return shishiRates;
  } catch (err) {
    console.error('Shishihuilv error:', err);
  }
  // 最终回退到默认值
  return { ...DEFAULT_RATES };
}

async function getExchangeRates() {
  const now = Date.now();
  if (now - cachedAt < CACHE_TTL && Object.keys(cachedRates).length > 0) {
    return { rates: cachedRates, cached: true, cachedAt };
  }

  try {
    const rates = await fetchExchangeRatesFromSource();
    cachedRates = rates;
    cachedAt = now;
    return { rates, cached: false, cachedAt: now };
  } catch (err) {
    console.error('Error getting exchange rates:', err);
    return { rates: cachedRates, cached: true, cachedAt };
  }
}

function getCache() {
  return { rates: cachedRates, cachedAt };
}

export { getExchangeRates, getCache };
