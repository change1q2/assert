import { fetchStockData } from './api/_lib/stock-data.js';

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
  const d = await fetchStockData(m, s);
  if (d) {
    console.log(`${m} ${s} ${d.name}: price=${d.price} pe=${d.pe} mcap=${d.market_cap} 52wH=${d.high_52w} 52wL=${d.low_52w} turnover_rate=${d.turnover_rate}`);
  } else {
    console.log(`${m} ${s}: NOT FOUND`);
  }
}
