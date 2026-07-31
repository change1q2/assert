import { fetchStockData } from '../_lib/stock-data.js';
import { calculateScores, nowTimestamp } from '../_lib/analysis.js';
import { getStrategyRecommendationForScore } from '../_lib/strategy.js';

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

  const scores = calculateScores(market, symbol, data);
  const strategyRecommendations = {};
  for (const [dimKey, dimData] of Object.entries(scores.dimensions || {})) {
    strategyRecommendations[dimKey] = getStrategyRecommendationForScore(
      dimKey, dimData.score || 0, dimData.max || 1
    );
  }

  res.status(200).json({
    symbol: symbol.toUpperCase(),
    market,
    data,
    scores,
    strategy_recommendations: strategyRecommendations,
    timestamp: nowTimestamp(),
  });
}
