import { fetchStockData } from './api/_lib/stock-data.js';
import { generateAnalysis, calculateScores, generateDeepReport, nowTimestamp } from './api/_lib/analysis.js';
import { getStrategyRecommendationForScore } from './api/_lib/strategy.js';

const tests = [
  ['a', '600519'],
  ['a', '000858'],
  ['a', '300750'],
  ['hk', '00700'],
  ['hk', '09988'],
  ['us', 'AAPL'],
  ['us', 'NVDA'],
  ['us', 'TSM'],
];

for (const [m, s] of tests) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${m.toUpperCase()} ${s}`);
  console.log('='.repeat(60));

  const data = await fetchStockData(m, s);
  if (!data) {
    console.log('NOT FOUND');
    continue;
  }

  console.log(`name=${data.name} price=${data.price} pe=${data.pe} mcap=${data.market_cap}`);
  console.log(`52wH=${data.high_52w} 52wL=${data.low_52w} turnover=${data.turnover_rate}`);

  // 分析
  const analysis = generateAnalysis(m, s, { quotes: [data], klines: [] });
  console.log(`analysis length: ${analysis.length}`);

  // 评分
  const scores = calculateScores(m, s, data);
  console.log(`scores: total=${scores.total_score}/${scores.max_score} grade=${scores.grade} (${scores.recommendation})`);
  for (const [dim, d] of Object.entries(scores.dimensions)) {
    console.log(`  ${dim}: ${d.score}/${d.max}`);
  }

  // 深度报告
  const strategyRecs = {};
  for (const [dimKey, dimData] of Object.entries(scores.dimensions || {})) {
    strategyRecs[dimKey] = getStrategyRecommendationForScore(dimKey, dimData.score || 0, dimData.max || 1);
  }
  const report = generateDeepReport(m, s, data, scores, analysis, strategyRecs);
  console.log(`deep report length: ${report.length}`);
}

console.log('\n\n✅ All tests completed!');
