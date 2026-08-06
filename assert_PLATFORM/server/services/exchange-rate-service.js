import https from "node:https";

const DEFAULT_RATES = {
  USD: 7.15,
  JPY: 0.046,
  HKD: 0.86,
  EUR: 7.85,
  CNY: 1,
};

// 港股通参考汇率缓存
let cachedHkConnectRate = null;
let cachedHkConnectAt = 0;
const HK_CONNECT_CACHE_TTL = 10 * 60 * 1000; // 10分钟缓存

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

// 港股通参考汇率
// 港股通参考汇率基于离岸市场港币兑人民币（CNH）报价的中间价
// 中间价 = (买报价 + 卖报价) / 2
// 买入参考汇率（卖出股票）= 中间价 × (1 - 3%)
// 卖出参考汇率（买入股票）= 中间价 × (1 + 3%)

// 从实时汇率网站获取港币兑人民币的买卖报价
function fetchHkCnhBidAsk() {
  return new Promise((resolve) => {
    // 方法1：从汇率API获取（尝试获取更详细的汇率数据）
    const url = 'https://api.exchangerate-api.com/v4/latest/HKD';
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed.rates && parsed.rates.CNY) {
            // 获取到基础汇率后，模拟买卖价差（实际中买卖价差约为0.01%-0.05%）
            const midRate = parsed.rates.CNY; // 1 HKD = x CNY
            const spread = midRate * 0.002; // 0.2% 价差
            const bid = midRate - spread / 2;  // 买报价（卖出HKD换CNY）
            const ask = midRate + spread / 2;  // 卖报价（买入HKD用CNY）
            resolve({
              bid: Math.round(bid * 10000) / 10000,
              ask: Math.round(ask * 10000) / 10000,
              mid: Math.round(midRate * 10000) / 10000,
              source: 'exchangerate-api',
            });
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
  });
}

// 备用：使用当前系统汇率计算合理的买卖价差
function getDefaultBidAsk() {
  const hkdRate = cachedRates.HKD || 0.86;
  const spread = hkdRate * 0.002; // 0.2% 价差
  return {
    bid: Math.round((hkdRate - spread / 2) * 10000) / 10000,
    ask: Math.round((hkdRate + spread / 2) * 10000) / 10000,
    mid: Math.round(hkdRate * 10000) / 10000,
    source: 'default',
  };
}

async function getHkConnectRate(force = false) {
  const now = Date.now();
  if (!force && cachedHkConnectRate && now - cachedHkConnectAt < HK_CONNECT_CACHE_TTL) {
    return { ...cachedHkConnectRate, cached: true };
  }

  try {
    // 尝试获取真实的买卖报价
    const bidAsk = await fetchHkCnhBidAsk();
    const data = bidAsk || getDefaultBidAsk();

    // 计算港股通参考汇率
    const referenceMid = data.mid;
    const buyReferenceRate = Math.round(referenceMid * (1 - 0.03) * 10000) / 10000; // 买入参考汇率（卖出股票）
    const sellReferenceRate = Math.round(referenceMid * (1 + 0.03) * 10000) / 10000; // 卖出参考汇率（买入股票）

    const result = {
      bid: data.bid,
      ask: data.ask,
      mid: referenceMid,
      buyReferenceRate,   // 买入参考汇率（用于卖出股票时的人民币结算）
      sellReferenceRate,  // 卖出参考汇率（用于买入股票时的人民币结算）
      spread: data.ask - data.bid,
      spreadPercent: Math.round(((data.ask - data.bid) / referenceMid) * 10000) / 10000,
      source: data.source,
      calculatedAt: new Date().toISOString(),
    };

    cachedHkConnectRate = result;
    cachedHkConnectAt = now;

    return { ...result, cached: false };
  } catch (err) {
    console.error('Error getting HK Connect rate:', err);
    if (cachedHkConnectRate) {
      return { ...cachedHkConnectRate, cached: true };
    }
    // 返回默认值
    const defaultData = getDefaultBidAsk();
    const buyRate = Math.round(defaultData.mid * (1 - 0.03) * 10000) / 10000;
    const sellRate = Math.round(defaultData.mid * (1 + 0.03) * 10000) / 10000;
    return {
      ...defaultData,
      buyReferenceRate: buyRate,
      sellReferenceRate: sellRate,
      spread: defaultData.ask - defaultData.bid,
      spreadPercent: 0.002,
      source: 'default-fallback',
      calculatedAt: new Date().toISOString(),
      cached: false,
    };
  }
}

function getHkConnectCache() {
  return cachedHkConnectRate
    ? { ...cachedHkConnectRate, cachedAt: cachedHkConnectAt }
    : null;
}

export { getExchangeRates, getCache, getHkConnectRate, getHkConnectCache };
