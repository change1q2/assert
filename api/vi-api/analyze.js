import { fetchStockData } from '../_lib/stock-data.js';
import { generateAnalysis, nowTimestamp } from '../_lib/analysis.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const body = req.body && typeof req.body === 'object' ? req.body
    : typeof req.body === 'string' && req.body.length > 0 ? JSON.parse(req.body) : {};
  const market = String(body.market || 'a').toLowerCase();
  const symbol = String(body.symbol || '').trim();

  if (!symbol) return res.status(400).json({ error: '请输入股票代码' });

  const data = await fetchStockData(market, symbol);
  if (!data) return res.status(404).json({ error: `未找到股票代码 ${symbol}` });

  let analysis;
  try {
    analysis = generateAnalysis(market, symbol, { quotes: [data], klines: [] });
  } catch (e) {
    analysis = `分析生成失败: ${e?.message || e}`;
  }

  res.status(200).json({
    analysis,
    data: { quotes: [data], klines: [] },
    symbol: symbol.toUpperCase(),
    market,
    timestamp: nowTimestamp(),
  });
}
