import { fetchStockData } from '../_lib/stock-data.js';
import { calculateScores, nowTimestamp } from '../_lib/analysis.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const body = req.body && typeof req.body === 'object' ? req.body
    : typeof req.body === 'string' && req.body.length > 0 ? JSON.parse(req.body) : {};
  const stocks = Array.isArray(body.stocks) ? body.stocks : [];

  if (!stocks || stocks.length < 2) {
    return res.status(400).json({ error: '至少需要2只股票进行对比' });
  }

  const results = [];
  for (const s of stocks) {
    const market = String(s?.market || 'a').toLowerCase();
    const symbol = String(s?.symbol || '').trim();
    if (!symbol) continue;

    const data = await fetchStockData(market, symbol);
    if (!data) {
      results.push({ symbol: symbol.toUpperCase(), market, error: `未找到代码 ${symbol}` });
      continue;
    }
    const scores = calculateScores(market, symbol, data);
    results.push({ symbol: symbol.toUpperCase(), market, data, scores });
  }

  res.status(200).json({
    count: results.length,
    results,
    timestamp: nowTimestamp(),
  });
}
