import { useState, useEffect, useMemo, useCallback } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Percent, LineChart as LineChartIcon, Calendar } from 'lucide-react';
import { getCurrencySymbol, DEFAULT_EXCHANGE_RATES, truncateNum } from '../utils/currency';
import { fetchFinanceQuotes, fetchFundNav } from '../api';

function convertCurrency(value, fromCurrency, toCurrency, rates) {
  if (fromCurrency === toCurrency) return value;
  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;
  return value * (fromRate / toRate);
}

function formatCurrencyWithRate(value, currency, targetCurrency, rates) {
  const converted = convertCurrency(value, currency, targetCurrency, rates);
  const symbol = getCurrencySymbol(targetCurrency);
  const n = truncateNum(converted, 3);
  const isNeg = n < 0;
  const absFormatted = new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(Math.abs(n));
  return `${symbol}${isNeg ? '-' : ''}${absFormatted}`;
}

function formatCurrency(value) {
  return `${truncateNum(value || 0, 3).toLocaleString('zh-CN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
}

function formatPercentage(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value >= 0 ? '+' : ''}${parseFloat(value).toFixed(2)}%`;
}

function daysBetween(d1, d2) {
  const a = new Date(d1);
  const b = new Date(d2);
  return (b - a) / (1000 * 60 * 60 * 24);
}

function calculateXIRR(cashflows) {
  if (!cashflows || cashflows.length < 2) return null;
  const sorted = [...cashflows].sort((a, b) => new Date(a.date) - new Date(b.date));
  const baseDate = new Date(sorted[0].date);

  function npv(rate) {
    return sorted.reduce((sum, cf) => {
      const days = daysBetween(baseDate, cf.date);
      return sum + cf.amount / Math.pow(1 + rate, days / 365);
    }, 0);
  }

  function npvPrime(rate) {
    return sorted.reduce((sum, cf) => {
      const days = daysBetween(baseDate, cf.date);
      return sum - (days / 365) * cf.amount / Math.pow(1 + rate, days / 365 + 1);
    }, 0);
  }

  let rate = 0.1;
  for (let i = 0; i < 100; i++) {
    const f = npv(rate);
    const fp = npvPrime(rate);
    if (Math.abs(fp) < 1e-14) break;
    const nextRate = rate - f / fp;
    if (Math.abs(nextRate - rate) < 1e-7) {
      rate = nextRate;
      break;
    }
    rate = nextRate;
  }

  if (!Number.isFinite(rate) || rate <= -1) return null;
  return rate * 100;
}

const DEFAULT_CPI_DATA = [
  { month: '2020-01', yoy: 5.4 }, { month: '2020-02', yoy: 5.2 }, { month: '2020-03', yoy: 4.3 },
  { month: '2020-04', yoy: 3.3 }, { month: '2020-05', yoy: 2.4 }, { month: '2020-06', yoy: 2.5 },
  { month: '2020-07', yoy: 2.7 }, { month: '2020-08', yoy: 2.4 }, { month: '2020-09', yoy: 1.7 },
  { month: '2020-10', yoy: 0.5 }, { month: '2020-11', yoy: -0.5 }, { month: '2020-12', yoy: 0.2 },
  { month: '2021-01', yoy: -0.3 }, { month: '2021-02', yoy: -0.2 }, { month: '2021-03', yoy: 0.4 },
  { month: '2021-04', yoy: 0.9 }, { month: '2021-05', yoy: 1.3 }, { month: '2021-06', yoy: 1.1 },
  { month: '2021-07', yoy: 1.0 }, { month: '2021-08', yoy: 0.8 }, { month: '2021-09', yoy: 0.7 },
  { month: '2021-10', yoy: 1.5 }, { month: '2021-11', yoy: 2.3 }, { month: '2021-12', yoy: 1.5 },
  { month: '2022-01', yoy: 0.9 }, { month: '2022-02', yoy: 0.9 }, { month: '2022-03', yoy: 1.5 },
  { month: '2022-04', yoy: 2.1 }, { month: '2022-05', yoy: 2.1 }, { month: '2022-06', yoy: 2.5 },
  { month: '2022-07', yoy: 2.7 }, { month: '2022-08', yoy: 2.5 }, { month: '2022-09', yoy: 2.8 },
  { month: '2022-10', yoy: 2.1 }, { month: '2022-11', yoy: 1.6 }, { month: '2022-12', yoy: 1.8 },
  { month: '2023-01', yoy: 2.1 }, { month: '2023-02', yoy: 1.0 }, { month: '2023-03', yoy: 0.7 },
  { month: '2023-04', yoy: 0.1 }, { month: '2023-05', yoy: 0.2 }, { month: '2023-06', yoy: 0.0 },
  { month: '2023-07', yoy: -0.3 }, { month: '2023-08', yoy: 0.1 }, { month: '2023-09', yoy: 0.0 },
  { month: '2023-10', yoy: -0.2 }, { month: '2023-11', yoy: -0.5 }, { month: '2023-12', yoy: -0.3 },
  { month: '2024-01', yoy: -0.8 }, { month: '2024-02', yoy: 0.7 }, { month: '2024-03', yoy: 0.1 },
  { month: '2024-04', yoy: 0.3 }, { month: '2024-05', yoy: 0.3 }, { month: '2024-06', yoy: 0.2 },
  { month: '2024-07', yoy: 0.5 }, { month: '2024-08', yoy: 0.6 }, { month: '2024-09', yoy: 0.4 },
  { month: '2024-10', yoy: 0.3 }, { month: '2024-11', yoy: 0.2 }, { month: '2024-12', yoy: 0.1 },
  { month: '2025-01', yoy: 0.5 }, { month: '2025-02', yoy: -0.7 }, { month: '2025-03', yoy: 0.1 },
  { month: '2025-04', yoy: -0.1 }, { month: '2025-05', yoy: -0.1 }, { month: '2025-06', yoy: 0.2 },
  { month: '2026-01', yoy: 0.2 }, { month: '2026-02', yoy: 1.3 }, { month: '2026-03', yoy: 1.0 },
  { month: '2026-04', yoy: 1.2 }, { month: '2026-05', yoy: 1.2 }, { month: '2026-06', yoy: 1.0 },
];

function getCpiCumulativeReturn(startDate, endDate, cpiData = DEFAULT_CPI_DATA) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const data = cpiData || DEFAULT_CPI_DATA;
  const relevant = data.filter(d => {
    const m = new Date(d.month + '-01');
    return m >= start && m <= end;
  });
  if (relevant.length === 0) return null;
  const average = relevant.reduce((acc, d) => acc + d.yoy, 0) / relevant.length;
  return average;
}

function extractCashflows(asset, filterStartDate, todayStr) {
  const flows = [];
  let txs = asset.transactions || [];
  if (filterStartDate && todayStr) {
    txs = txs.filter(t => {
      const d = t.date || t.transaction_date;
      return d >= filterStartDate && d <= todayStr;
    });
  }
  for (const t of txs) {
    const type = (t.type || '').trim();
    const amount = parseFloat(t.amount) || 0;
    const date = t.date || t.transaction_date;
    if (!date) continue;
    if (type === '买入' || type === '建仓') {
      flows.push({ date, amount: -Math.abs(amount) });
    } else if (type === '卖出' || type === '清仓') {
      flows.push({ date, amount: Math.abs(amount) });
    } else if (type === '分红') {
      flows.push({ date, amount: Math.abs(amount) });
    }
  }
  return flows;
}

export default function FinanceAnalysis({ stateData, timeMode, startDate, endDate, selectedYear, selectedMonth }) {
  const [indexData, setIndexData] = useState(null);
  const [indexLoading, setIndexLoading] = useState(false);
  const [updatedAssets, setUpdatedAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cpiData, setCpiData] = useState(null);

  const financeAssets = stateData?.financeAssets || [];

  // 获取沪深300历史数据
  useEffect(() => {
    let cancelled = false;
    async function fetchHS300() {
      setIndexLoading(true);
      try {
        const response = await fetch('/api/finance/index-history?code=1B0300&count=300');
        const result = await response.json();
        if (!cancelled && result.history && result.history.length > 0) {
          setIndexData(result.history);
        }
      } catch (e) {
        // ignore
      } finally {
        if (!cancelled) setIndexLoading(false);
      }
    }
    fetchHS300();
    return () => { cancelled = true; };
  }, []);

  // 获取CPI数据
  useEffect(() => {
    let cancelled = false;
    async function fetchCPI() {
      try {
        const year = new Date().getFullYear();
        const response = await fetch(`/api/finance/cpi?year=${year}`);
        const result = await response.json();
        if (!cancelled && result.monthly && result.monthly.length > 0) {
          const formattedData = result.monthly.map(m => ({
            month: m.month,
            yoy: m.value,
          }));
          setCpiData(formattedData);
        }
      } catch (e) {
        // ignore - use default data
      }
    }
    fetchCPI();
    return () => { cancelled = true; };
  }, []);

  // 获取实时行情数据更新资产（与理财模块一致）
  useEffect(() => {
    if (financeAssets.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadRealTimeData() {
      try {
        const updated = [...financeAssets];

        // 加载场内行情
        const stockCodes = financeAssets
          .filter(a => {
            if (!a.code) return false;
            const catL3 = a.categoryL3 || a.tertiaryCategory;
            if (catL3 === '场外' || (!catL3 && a.market === '场外基金')) return false;
            return true;
          })
          .map(a => ({ code: a.code, market: a.market || '国内市场' }));

        if (stockCodes.length > 0) {
          const quotes = await fetchFinanceQuotes(stockCodes);
          const quotesMap = {};
          quotes.forEach(q => {
            if (q && q.code) {
              quotesMap[q.code] = q;
            }
          });

          for (let i = 0; i < updated.length; i++) {
            const asset = updated[i];
            const quote = quotesMap[asset.code];
            const isManualPrice = asset.priceManualEdit === true || asset.priceManualEdit === 'true';
            if (quote && quote.price != null && !isManualPrice) {
              const price = parseFloat(quote.price);
              const quantity = parseFloat(asset.shares || asset.quantity) || 0;
              if (price > 0 && quantity > 0) {
                updated[i] = {
                  ...asset,
                  currentValue: String(price * quantity),
                  currentPrice: String(price),
                };
              }
            }
          }
        }

        // 加载场外基金净值
        const fundItems = financeAssets.filter(a => {
          if (!a.code || !/^\d{6}$/.test(String(a.code).trim())) return false;
          const catL3 = a.categoryL3 || a.tertiaryCategory;
          return catL3 === '场外' || (!catL3 && a.market === '场外基金');
        });

        if (fundItems.length > 0) {
          const codes = fundItems.map(a => ({ code: a.code }));
          const funds = await fetchFundNav(codes);

          for (let i = 0; i < updated.length; i++) {
            const asset = updated[i];
            const fund = funds.find(f => f.code === asset.code);
            const isManualPrice = asset.priceManualEdit === true || asset.priceManualEdit === 'true';
            if (fund && !isManualPrice) {
              const newNav = Number.isFinite(Number(fund.nav)) ? Number(fund.nav) : null;
              if (newNav != null) {
                const quantity = parseFloat(asset.shares || asset.quantity) || 0;
                if (quantity > 0) {
                  updated[i] = {
                    ...asset,
                    currentValue: String(Math.round(newNav * quantity * 100) / 100),
                    currentPrice: String(newNav),
                  };
                }
              }
            }
          }
        }

        if (!cancelled) {
          setUpdatedAssets(updated);
        }
      } catch (e) {
        console.error('Failed to load real-time data:', e);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRealTimeData();
    return () => { cancelled = true; };
  }, [financeAssets]);

  const { todayStr, filterStartDate } = useMemo(() => {
    const now = new Date();
    let end = new Date();
    let start = new Date();

    if (timeMode === 'day') {
      end = now;
      start = now;
    } else if (timeMode === 'month') {
      end = new Date(selectedYear, selectedMonth, 0);
      start = new Date(selectedYear, selectedMonth - 1, 1);
    } else if (timeMode === 'year') {
      end = new Date(selectedYear, 11, 31);
      start = new Date(selectedYear, 0, 1);
    } else if (timeMode === 'custom' && startDate && endDate) {
      end = new Date(endDate);
      start = new Date(startDate);
    }

    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { todayStr: fmt(end), filterStartDate: fmt(start) };
  }, [timeMode, startDate, endDate, selectedYear, selectedMonth]);

  const combinedAssets = useMemo(() => {
    const actualToday = new Date();
    const actualTodayStr = `${actualToday.getFullYear()}-${String(actualToday.getMonth() + 1).padStart(2, '0')}-${String(actualToday.getDate()).padStart(2, '0')}`;
    // 如果 todayStr 不是今天，不使用实时行情更新的数据
    if (todayStr !== actualTodayStr) {
      return financeAssets;
    }
    return updatedAssets.length > 0 ? updatedAssets : financeAssets;
  }, [updatedAssets, financeAssets, todayStr]);

  // 计算每个资产的指标和现金流（数据来源与理财模块一致）
  const assetMetrics = useMemo(() => {
    const exchangeRates = stateData?.exchangeRates || DEFAULT_EXCHANGE_RATES;
    return combinedAssets.map(asset => {
      const currency = asset.currency || 'CNY';
      const _costPrice = parseFloat(asset.costPrice) || parseFloat(asset.cost) || 0;
      const _qty = parseFloat(asset.shares) || parseFloat(asset.quantity) || 0;
      const _cost = _costPrice * _qty;
      const _price = parseFloat(asset.currentPrice) || _costPrice || 0;
      const _currentValue = _price * _qty;
      const currentValue = convertCurrency(_currentValue, currency, 'CNY', exchangeRates);
      const cost = convertCurrency(_cost, currency, 'CNY', exchangeRates);
      const holdingPnl = convertCurrency(parseFloat(asset.holdingPnl) || (_currentValue - _cost), currency, 'CNY', exchangeRates);
      const pnl = holdingPnl || (currentValue - cost);
      const pnlRate = cost > 0 ? (pnl / cost) * 100 : 0;
      const flows = extractCashflows(asset, filterStartDate, todayStr);
      const txs = (asset.transactions || []).filter(t => {
        const d = t.date || t.transaction_date;
        return d >= filterStartDate && d <= todayStr;
      });
      const dividendTotal = flows.filter(f => f.amount > 0 && txs.some(t => t.type === '分红' && t.date === f.date)).reduce((s, f) => s + f.amount, 0);
      // 追加终值
      if (currentValue > 0) {
        flows.push({ date: todayStr, amount: currentValue });
      }
      const irr = flows.length >= 2 ? calculateXIRR(flows) : null;
      return {
        name: asset.name || '—',
        code: asset.code || '—',
        currentValue,
        cost,
        pnl,
        pnlRate,
        dividendTotal,
        irr,
        hasTransactions: txs.length > 0,
      };
    });
  }, [combinedAssets, todayStr, filterStartDate, stateData]);

  // 组合级指标（数据来源与理财模块一致）
  const portfolioMetrics = useMemo(() => {
    const exchangeRates = stateData?.exchangeRates || DEFAULT_EXCHANGE_RATES;
    const totalValue = combinedAssets.reduce((s, h) => {
      const _price = parseFloat(h.currentPrice) || parseFloat(h.costPrice) || parseFloat(h.cost) || 0;
      const _qty = parseFloat(h.shares) || parseFloat(h.quantity) || 0;
      const value = _price * _qty;
      const currency = h.currency || 'CNY';
      return s + convertCurrency(value, currency, 'CNY', exchangeRates);
    }, 0);
    const totalCost = combinedAssets.reduce((s, h) => {
      const _costPrice = parseFloat(h.costPrice) || parseFloat(h.cost) || 0;
      const _qty = parseFloat(h.shares) || parseFloat(h.quantity) || 0;
      const cost = _costPrice * _qty;
      const currency = h.currency || 'CNY';
      return s + convertCurrency(cost, currency, 'CNY', exchangeRates);
    }, 0);
    const totalPnl = totalValue - totalCost;
    const totalPnlRate = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

    // 组合现金流
    const allFlows = [];
    for (const asset of combinedAssets) {
      const flows = extractCashflows(asset, filterStartDate, todayStr);
      allFlows.push(...flows);
    }
    // 追加所有资产当前市值作为终值
    if (totalValue > 0) {
      allFlows.push({ date: todayStr, amount: totalValue });
    }
    const portfolioIrr = allFlows.length >= 2 ? calculateXIRR(allFlows) : null;

    // 最早买入日
    let earliestDate = todayStr;
    for (const asset of combinedAssets) {
      const txs = (asset.transactions || []).filter(t => {
        const d = t.date || t.transaction_date;
        return d >= filterStartDate && d <= todayStr;
      });
      for (const t of txs) {
        const d = t.date || t.transaction_date;
        if (d && d < earliestDate) earliestDate = d;
      }
    }

    return { totalValue, totalCost, totalPnl, totalPnlRate, portfolioIrr, earliestDate };
  }, [assetMetrics, combinedAssets, todayStr, filterStartDate]);

  // 按一级分类聚合指标（数据来源与理财模块一致）
  const categoryMetrics = useMemo(() => {
    const exchangeRates = stateData?.exchangeRates || DEFAULT_EXCHANGE_RATES;
    const categoryMap = new Map();

    // 按 categoryL1 分组资产
    for (const asset of combinedAssets) {
      const categoryL1 = asset.category || asset.categoryL1 || '其他';
      if (!categoryMap.has(categoryL1)) {
        categoryMap.set(categoryL1, []);
      }
      categoryMap.get(categoryL1).push(asset);
    }

    const result = [];

    // 计算每个一级分类的指标
    for (const [category, assets] of categoryMap) {
      const currentValue = assets.reduce((s, a) => {
        const _price = parseFloat(a.currentPrice) || parseFloat(a.costPrice) || parseFloat(a.cost) || 0;
        const _qty = parseFloat(a.shares) || parseFloat(a.quantity) || 0;
        const value = _price * _qty;
        const currency = a.currency || 'CNY';
        return s + convertCurrency(value, currency, 'CNY', exchangeRates);
      }, 0);
      const cost = assets.reduce((s, a) => {
        const _costPrice = parseFloat(a.costPrice) || parseFloat(a.cost) || 0;
        const _qty = parseFloat(a.shares) || parseFloat(a.quantity) || 0;
        const costVal = _costPrice * _qty;
        const currency = a.currency || 'CNY';
        return s + convertCurrency(costVal, currency, 'CNY', exchangeRates);
      }, 0);
      const pnl = currentValue - cost;
      const pnlRate = cost > 0 ? (pnl / cost) * 100 : 0;

      // 收集该分类下所有资产的交易现金流
      const flows = [];
      for (const asset of assets) {
        const assetFlows = extractCashflows(asset, filterStartDate, todayStr);
        flows.push(...assetFlows);
      }
      // 追加当前总市值作为终值
      if (currentValue > 0) {
        flows.push({ date: todayStr, amount: currentValue });
      }
      const irr = flows.length >= 2 ? calculateXIRR(flows) : null;

      result.push({
        category,
        currentValue,
        cost,
        pnl,
        pnlRate,
        irr,
      });
    }

    // 按当前市值降序排序
    return result.sort((a, b) => b.currentValue - a.currentValue);
  }, [combinedAssets, todayStr, filterStartDate, stateData]);

  // 基准对比数据
  const benchmarkData = useMemo(() => {
    const { totalPnlRate, earliestDate } = portfolioMetrics;
    const cpiReturn = getCpiCumulativeReturn(earliestDate, todayStr, cpiData);

    let hs300Return = null;
    if (indexData && indexData.length > 0) {
      const start = new Date(earliestDate);
      const end = new Date(todayStr);
      const startPoint = indexData.find(d => new Date(d.date) >= start) || indexData[0];
      const endPoint = [...indexData].reverse().find(d => new Date(d.date) <= end) || indexData[indexData.length - 1];
      if (startPoint && endPoint && parseFloat(startPoint.close) > 0) {
        hs300Return = ((parseFloat(endPoint.close) - parseFloat(startPoint.close)) / parseFloat(startPoint.close)) * 100;
      }
    }

    const realReturn = (totalPnlRate !== null && cpiReturn !== null) ? (totalPnlRate - cpiReturn) : null;

    return [
      { name: '组合收益率（名义收益率）', value: totalPnlRate, color: '#3B82F6' },
      { name: 'CPI涨幅', value: cpiReturn, color: '#F59E0B' },
      { name: '沪深300', value: hs300Return, color: '#8B5CF6' },
      { name: '实际收益率', value: realReturn, color: '#10B981' },
    ];
  }, [portfolioMetrics, indexData, todayStr]);

  // 趋势数据（按月）
  const trendData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    return months.map(month => {
      const cpiItem = (cpiData || DEFAULT_CPI_DATA).find(d => d.month === month);
      const cpi = cpiItem ? cpiItem.yoy : null;

      let hs300 = null;
      if (indexData && indexData.length > 0) {
        const monthStart = new Date(month + '-01');
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
        const startPoint = indexData.find(d => new Date(d.date) >= monthStart);
        const endPoint = indexData.find(d => new Date(d.date) <= monthEnd);
        if (startPoint && endPoint && parseFloat(startPoint.close) > 0) {
          hs300 = ((parseFloat(endPoint.close) - parseFloat(startPoint.close)) / parseFloat(startPoint.close)) * 100;
        }
      }

      const irr = portfolioMetrics.portfolioIrr;
      const realReturn = (irr !== null && cpi !== null) ? (irr - cpi) : null;

      return { month, cpi, hs300, irr, realReturn };
    });
  }, [portfolioMetrics, indexData]);

  const StatCard = useCallback(({ title, value, subValue, icon: Icon, colorClass }) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200/60 dark:border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500 dark:text-gray-400">{title}</span>
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <div className="text-2xl font-bold font-mono text-gray-900 dark:text-white">{value}</div>
      {subValue && <div className="text-xs text-gray-400 mt-1">{subValue}</div>}
    </div>
  ), []);

  if (!financeAssets || financeAssets.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-10 shadow-sm border border-gray-200/60 dark:border-slate-800 text-center">
        <Wallet className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">暂无理财资产数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="总市值"
          value={`¥${formatCurrency(portfolioMetrics.totalValue)}`}
          icon={Wallet}
          colorClass="bg-blue-600"
        />
        <StatCard
          title="总成本"
          value={`¥${formatCurrency(portfolioMetrics.totalCost)}`}
          icon={PiggyBank}
          colorClass="bg-gray-600"
        />
        <StatCard
          title="总盈亏"
          value={`${portfolioMetrics.totalPnl >= 0 ? '+' : ''}¥${formatCurrency(portfolioMetrics.totalPnl)}`}
          subValue={formatPercentage(portfolioMetrics.totalPnlRate)}
          icon={portfolioMetrics.totalPnl >= 0 ? TrendingUp : TrendingDown}
          colorClass={portfolioMetrics.totalPnl >= 0 ? 'bg-red-500' : 'bg-green-500'}
        />
        <StatCard
          title="总收益率"
          value={formatPercentage(portfolioMetrics.totalPnlRate)}
          icon={Percent}
          colorClass="bg-indigo-500"
        />
        <StatCard
          title="年化"
          value={formatPercentage(portfolioMetrics.totalPnlRate)}
          icon={LineChartIcon}
          colorClass="bg-emerald-600"
        />
      </div>

      {/* 资产分类明细列表 */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-200/60 dark:border-slate-800">
        <h3 className="text-base font-semibold font-mono tracking-tight text-gray-900 dark:text-white mb-4">
          资产分类明细
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 font-medium text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">资产类型</th>
                <th className="text-right py-3 px-4 font-medium text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">当前总市值</th>
                <th className="text-right py-3 px-4 font-medium text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">总成本</th>
                <th className="text-right py-3 px-4 font-medium text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">总收益额</th>
                <th className="text-right py-3 px-4 font-medium text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">总收益率</th>
              </tr>
            </thead>
            <tbody>
              {categoryMetrics.map((cat, idx) => (
                <tr key={idx} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{cat.category}</td>
                  <td className="py-3 px-4 text-right text-gray-900 dark:text-white">¥{formatCurrency(cat.currentValue)}</td>
                  <td className="py-3 px-4 text-right text-gray-900 dark:text-white">¥{formatCurrency(cat.cost)}</td>
                  <td className={`py-3 px-4 text-right font-medium ${cat.pnl >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {cat.pnl >= 0 ? '+' : ''}¥{formatCurrency(cat.pnl)}
                  </td>
                  <td className={`py-3 px-4 text-right font-medium ${cat.pnlRate >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {formatPercentage(cat.pnlRate)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 dark:bg-slate-700/50 font-semibold">
                <td className="py-3 px-4 text-gray-900 dark:text-white">合计</td>
                <td className="py-3 px-4 text-right text-gray-900 dark:text-white">¥{formatCurrency(portfolioMetrics.totalValue)}</td>
                <td className="py-3 px-4 text-right text-gray-900 dark:text-white">¥{formatCurrency(portfolioMetrics.totalCost)}</td>
                <td className={`py-3 px-4 text-right ${portfolioMetrics.totalPnl >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {portfolioMetrics.totalPnl >= 0 ? '+' : ''}¥{formatCurrency(portfolioMetrics.totalPnl)}
                </td>
                <td className={`py-3 px-4 text-right ${portfolioMetrics.totalPnlRate >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {formatPercentage(portfolioMetrics.totalPnlRate)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 基准对比 */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-200/60 dark:border-slate-800">
        <h3 className="text-base font-semibold font-mono tracking-tight text-gray-900 dark:text-white mb-4">
          基准对比
        </h3>

        {/* 柱状图 */}
        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={benchmarkData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-700" />
              <XAxis dataKey="name" className="dark:text-gray-400" tick={{ fontSize: 12 }} />
              <YAxis className="dark:text-gray-400" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v?.toFixed(0)}%`} />
              <Tooltip
                formatter={(value) => [formatPercentage(value), '']}
                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {benchmarkData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || '#3B82F6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {benchmarkData.map((item, idx) => (
            <div key={idx} className="text-center p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{item.name}</div>
              <div className="text-lg font-bold font-mono" style={{ color: item.color }}>
                {formatPercentage(item.value)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
