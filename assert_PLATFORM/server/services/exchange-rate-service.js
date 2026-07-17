import https from "node:https";

const DEFAULT_RATES = {
  USD: 7.2,
  JPY: 0.048,
  HKD: 0.92,
  EUR: 7.8,
  CNY: 1,
};

let cachedRates = { ...DEFAULT_RATES };
let cachedAt = 0;
const CACHE_TTL = 30 * 60 * 1000;

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

async function fetchExchangeRatesFromSource() {
  return new Promise((resolve) => {
    const req = https.get('https://www.shishihuilv.com/zuixin/', (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const rates = parseExchangeRates(data);
          resolve(rates);
        } catch (err) {
          console.error('Failed to parse exchange rates:', err);
          resolve({ ...DEFAULT_RATES });
        }
      });
    });

    req.on('error', (err) => {
      console.error('Failed to fetch exchange rates:', err);
      resolve({ ...DEFAULT_RATES });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ ...DEFAULT_RATES });
    });
  });
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