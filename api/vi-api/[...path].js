/**
 * Catch-all route handler for /vi-api/* endpoints.
 *
 * Vercel exposes catch-all path segments as `req.query.path` (string[]).
 * We statically import the lib modules so they are bundled with the route.
 */

import { fetchStockData } from '../_lib/stock-data.js';
import {
  generateAnalysis,
  calculateScores,
  generateDeepReport,
  nowTimestamp,
} from '../_lib/analysis.js';
import {
  getStrategySummary,
  getStrategySection,
  getAllStrategyContent,
  getStrategyRecommendationForScore,
} from '../_lib/strategy.js';

// Static example symbols — mirrors python-server/app.py GET /api/symbols
const STATIC_SYMBOLS = {
  a: [
    { code: '600519', name: '贵州茅台' },
    { code: '000858', name: '五粮液' },
    { code: '601318', name: '中国平安' },
    { code: '300750', name: '宁德时代' },
  ],
  hk: [
    { code: '00700', name: '腾讯控股' },
    { code: '09988', name: '阿里巴巴-W' },
    { code: '01810', name: '小米集团-W' },
    { code: '02259', name: '紫金黄金' },
  ],
  us: [
    { code: 'AAPL', name: '苹果' },
    { code: 'TSM', name: '台积电' },
    { code: 'NVDA', name: '英伟达' },
    { code: 'SNDK', name: '闪迪' },
    { code: 'MU', name: '美光' },
  ],
};

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function getBody(req) {
  // Vercel parses JSON bodies automatically and exposes via req.body.
  // Fallback to manual parse for raw payloads / non-JSON content-types.
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.length > 0) {
    try {
      return JSON.parse(req.body);
    } catch (_) {
      return {};
    }
  }
  return {};
}

async function handleAnalyze(req, res) {
  const body = getBody(req);
  const market = String(body.market || 'a').toLowerCase();
  const symbol = String(body.symbol || '').trim();

  if (!symbol) {
    return res.status(400).json({ error: '请输入股票代码' });
  }

  const data = await fetchStockData(market, symbol);
  if (!data) {
    return res.status(404).json({ error: `未找到股票代码 ${symbol}` });
  }

  let analysis;
  try {
    analysis = generateAnalysis(market, symbol, { quotes: [data], klines: [] });
  } catch (e) {
    analysis = `分析生成失败: ${e?.message || e}`;
  }

  return res.status(200).json({
    analysis,
    data: { quotes: [data], klines: [] },
    symbol: symbol.toUpperCase(),
    market,
    timestamp: new Date().toISOString(),
  });
}

async function handleScore(req, res) {
  const body = getBody(req);
  const market = String(body.market || 'a').toLowerCase();
  const symbol = String(body.symbol || '').trim();

  if (!symbol) {
    return res.status(400).json({ error: '请输入股票代码' });
  }

  const data = await fetchStockData(market, symbol);
  if (!data) {
    return res.status(404).json({ error: `未找到股票代码 ${symbol}` });
  }

  const scores = calculateScores(market, symbol, data);

  const strategyRecommendations = {};
  for (const [dimKey, dimData] of Object.entries(scores.dimensions || {})) {
    strategyRecommendations[dimKey] = getStrategyRecommendationForScore(
      dimKey,
      dimData.score || 0,
      dimData.max || 1
    );
  }

  return res.status(200).json({
    symbol: symbol.toUpperCase(),
    market,
    data,
    scores,
    strategy_recommendations: strategyRecommendations,
    timestamp: new Date().toISOString(),
  });
}

async function handleCompare(req, res) {
  const body = getBody(req);
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
      results.push({
        symbol: symbol.toUpperCase(),
        market,
        error: `未找到代码 ${symbol}`,
      });
      continue;
    }
    const scores = calculateScores(market, symbol, data);
    results.push({
      symbol: symbol.toUpperCase(),
      market,
      data,
      scores,
    });
  }

  return res.status(200).json({
    count: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
}

async function handleDeepReport(req, res) {
  const body = getBody(req);
  const market = String(body.market || 'a').toLowerCase();
  const symbol = String(body.symbol || '').trim();

  if (!symbol) {
    return res.status(400).json({ error: '请输入股票代码' });
  }

  const data = await fetchStockData(market, symbol);
  if (!data) {
    return res.status(404).json({ error: `未找到股票代码 ${symbol}` });
  }

  const scores = calculateScores(market, symbol, data);
  const analysis = generateAnalysis(market, symbol, { quotes: [data], klines: [] });

  // Strategy recommendations per dimension
  const strategyRecommendations = {};
  for (const [dimKey, dimData] of Object.entries(scores.dimensions || {})) {
    strategyRecommendations[dimKey] = getStrategyRecommendationForScore(
      dimKey,
      dimData.score || 0,
      dimData.max || 1
    );
  }

  const report = generateDeepReport(
    market,
    symbol,
    data,
    scores,
    analysis,
    strategyRecommendations
  );

  return res.status(200).json({
    symbol: symbol.toUpperCase(),
    market,
    data,
    scores,
    report,
    strategy_recommendations: strategyRecommendations,
    timestamp: new Date().toISOString(),
  });
}

function handleStrategy(req, res, pathSegments) {
  // /vi-api/strategy                -> summary
  // /vi-api/strategy/full           -> full markdown content
  // /vi-api/strategy/<sectionId>    -> single section
  if (pathSegments.length === 1) {
    return res.status(200).json(getStrategySummary());
  }

  const seg2 = pathSegments[1];
  if (seg2 === 'full') {
    return res.status(200).json({
      title: getStrategySummary().title,
      subtitle: getStrategySummary().subtitle,
      content: getAllStrategyContent(),
    });
  }

  const section = getStrategySection(seg2);
  if (!section) {
    return res.status(404).json({ error: `未找到章节 ${seg2}` });
  }
  return res.status(200).json(section);
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Vercel catch-all: req.query.path is string[]
  const rawPath = req.query.path;
  const pathSegments = Array.isArray(rawPath)
    ? rawPath
    : rawPath
    ? [rawPath]
    : [];

  const route = pathSegments[0];

  try {
    if (req.method === 'GET' && route === 'symbols') {
      return res.status(200).json(STATIC_SYMBOLS);
    }

    if (req.method === 'POST' && route === 'analyze') {
      return await handleAnalyze(req, res);
    }

    if (req.method === 'POST' && route === 'score') {
      return await handleScore(req, res);
    }

    if (req.method === 'POST' && route === 'compare') {
      return await handleCompare(req, res);
    }

    if (req.method === 'POST' && route === 'deep-report') {
      return await handleDeepReport(req, res);
    }

    if (req.method === 'GET' && route === 'strategy') {
      return handleStrategy(req, res, pathSegments);
    }

    return res.status(404).json({
      error: `未找到路由: ${req.method} /vi-api/${pathSegments.join('/')}`,
    });
  } catch (err) {
    console.error('[vi-api] handler error:', err);
    return res.status(500).json({
      error: `服务器内部错误: ${err?.message || err}`,
      timestamp: nowTimestamp(),
    });
  }
}
