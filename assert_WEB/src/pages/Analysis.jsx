import { useState, useEffect } from 'react';
import { fetchState } from '../api';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  LineChart,
  PieChart,
  Activity,
  Calendar,
} from 'lucide-react';

function formatCurrency(value) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
  }).format(value);
}

function formatPercentage(value) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export default function Analysis() {
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { accounts = [], records = [], debts = [] } = stateData || {};

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchState();
      setStateData(data);
    } catch (err) {
      console.error('Failed to load analysis data:', err);
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const computeAnalysis = () => {
    const financeAccounts = (accounts || []).filter(a => !a.liability);
    const totalAssets = financeAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalCost = financeAccounts.reduce((sum, a) => sum + (a.cost || a.balance || 0), 0);
    const totalPnl = totalAssets - totalCost;
    const totalPnlRate = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

    const now = new Date();
    const currentYear = now.getFullYear();

    const monthlyData = [];
    for (let i = 0; i < 6; i++) {
      const monthDate = new Date(currentYear, i, 1);
      const monthLabel = `${i + 1}月`;
      const monthRecords = (records || []).filter(r => {
        const d = new Date(r.date);
        return d.getFullYear() === currentYear && d.getMonth() === i;
      });
      const income = monthRecords.filter(r => r.type === 'income').reduce((sum, r) => sum + Math.abs(r.amount || 0), 0);
      const expense = monthRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + Math.abs(r.amount || 0), 0);
      monthlyData.push({ month: monthLabel, income, expense, net: income - expense });
    }

    const years = [
      { year: '2021', value: 1800000 },
      { year: '2022', value: 2200000 },
      { year: '2023', value: 2800000 },
      { year: '2024', value: 3100000 },
      { year: '2025', value: 3400000 },
      { year: '2026', value: totalAssets },
    ];

    const totalDebts = (debts || []).reduce((sum, d) => sum + (d.amount || d.balance || 0), 0);
    const netWorth = totalAssets - totalDebts;

    return {
      totalAssets,
      totalCost,
      totalPnl,
      totalPnlRate,
      monthlyData,
      years,
      totalDebts,
      netWorth,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  const { totalAssets, totalPnl, totalPnlRate, monthlyData, years, totalDebts, netWorth } = computeAnalysis();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <section
          className="rounded-2xl p-6 sm:p-7"
          style={{
            background: 'linear-gradient(135deg, #EDE9FE 0%, #F5F3FF 100%)',
          }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">统计分析</h1>
              <p className="text-sm text-gray-600 mt-1">全方位资产数据分析</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={loadData}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-primary-500 text-primary-500 text-sm font-medium hover:bg-primary-500 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                刷新数据
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full p-2">
                <PieChart className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">总资产</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
              {formatCurrency(totalAssets)}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full p-2">
                <TrendingDown className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">总负债</span>
            </div>
            <div className="text-2xl font-bold text-red-600 tabular-nums whitespace-nowrap">
              {formatCurrency(totalDebts)}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full p-2">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">净资产</span>
            </div>
            <div className="text-2xl font-bold text-green-600 tabular-nums whitespace-nowrap">
              {formatCurrency(netWorth)}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className={`rounded-full p-2 ${
                totalPnlRate >= 0
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              }`}>
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">年化收益率</span>
            </div>
            <div className={`text-2xl font-bold tabular-nums whitespace-nowrap ${
              totalPnlRate >= 0 ? 'text-green-600' : 'text-red-500'
            }`}>
              {formatPercentage(totalPnlRate)}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-500" />
              月度收支分析
            </h3>
            <div className="mt-4">
              <svg viewBox="0 0 300 180" className="w-full h-auto">
                {(() => {
                  const maxVal = Math.max(...monthlyData.map(d => Math.max(d.income, d.expense)), 1);
                  const barWidth = 30;
                  const gap = 15;
                  const startX = 20;
                  const chartBottom = 150;
                  const chartTop = 20;
                  const chartHeight = chartBottom - chartTop;

                  return (
                    <>
                      {[0, 0.5, 1].map((ratio, idx) => {
                        const y = chartBottom - chartHeight * ratio;
                        return (
                          <line
                            key={idx}
                            x1={startX}
                            y1={y}
                            x2={280}
                            y2={y}
                            stroke="#E5E7EB"
                            strokeWidth="1"
                            strokeDasharray="4,4"
                          />
                        );
                      })}
                      {monthlyData.map((d, i) => {
                        const x = startX + i * (barWidth * 2 + gap);
                        const incomeHeight = (d.income / maxVal) * chartHeight;
                        const expenseHeight = (d.expense / maxVal) * chartHeight;
                        return (
                          <g key={d.month}>
                            <rect
                              x={x}
                              y={chartBottom - incomeHeight}
                              width={barWidth}
                              height={incomeHeight}
                              fill="#10B981"
                              rx="3"
                            />
                            <rect
                              x={x + barWidth}
                              y={chartBottom - expenseHeight}
                              width={barWidth}
                              height={expenseHeight}
                              fill="#EC4899"
                              rx="3"
                            />
                            <text
                              x={x + barWidth}
                              y={chartBottom + 15}
                              textAnchor="middle"
                              fontSize="10"
                              fill="#6B7280"
                            >
                              {d.month}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span className="text-gray-500 dark:text-gray-400">收入</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded bg-pink-500" />
                <span className="text-gray-500 dark:text-gray-400">支出</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <LineChart className="w-5 h-5 text-primary-500" />
              资产变化趋势
            </h3>
            <div className="mt-4">
              <svg viewBox="0 0 300 180" className="w-full h-auto">
                {(() => {
                  const values = monthlyData.map(d => d.income);
                  const maxVal = Math.max(...values, 1);
                  const minVal = Math.min(...values) * 0.9;
                  const range = maxVal - minVal;
                  const points = values.map((v, i) => {
                    const x = (i / (values.length - 1)) * 260 + 20;
                    const y = 150 - ((v - minVal) / range) * 110;
                    return `${x},${y}`;
                  });
                  const pathData = `M ${points.join(' L ')}`;
                  const areaData = `M 20,150 L ${points.join(' L ')} L 280,150 Z`;

                  return (
                    <>
                      <defs>
                        <linearGradient id="analysisAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.05" />
                        </linearGradient>
                      </defs>
                      <path d={areaData} fill="url(#analysisAreaGradient)" />
                      <path d={pathData} fill="none" stroke="#8B5CF6" strokeWidth="2" />
                      {values.map((v, i) => {
                        const x = (i / (values.length - 1)) * 260 + 20;
                        const y = 150 - ((v - minVal) / range) * 110;
                        return <circle key={i} cx={x} cy={y} r="3" fill="#8B5CF6" />;
                      })}
                      {monthlyData.map((d, i) => {
                        const x = (i / (monthlyData.length - 1)) * 260 + 20;
                        return (
                          <text key={i} x={x} y="168" textAnchor="middle" fontSize="9" fill="#9CA3AF">
                            {d.month}
                          </text>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-500" />
            年度收益分析
          </h3>
          <div className="mt-4">
            <svg viewBox="0 0 600 200" className="w-full h-auto">
              {(() => {
                const maxVal = Math.max(...years.map((d) => d.value)) * 1.1;
                const barWidth = 50;
                const gap = 40;
                const startX = 40;
                const chartBottom = 170;
                const chartTop = 20;
                const chartHeight = chartBottom - chartTop;

                return (
                  <>
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                      const y = chartBottom - chartHeight * ratio;
                      return (
                        <line
                          key={idx}
                          x1={startX}
                          y1={y}
                          x2={580}
                          y2={y}
                          stroke="#E5E7EB"
                          strokeWidth="1"
                          strokeDasharray="4,4"
                        />
                      );
                    })}
                    {years.map((d, i) => {
                      const barHeight = (d.value / maxVal) * chartHeight;
                      const x = startX + i * (barWidth + gap);
                      const y = chartBottom - barHeight;
                      return (
                        <g key={d.year}>
                          <rect x={x} y={y} width={barWidth} height={barHeight} fill="#8B5CF6" rx="4" />
                          <text
                            x={x + barWidth / 2}
                            y={chartBottom + 18}
                            textAnchor="middle"
                            fontSize="11"
                            fill="#6B7280"
                          >
                            {d.year}
                          </text>
                          <text
                            x={x + barWidth / 2}
                            y={y - 6}
                            textAnchor="middle"
                            fontSize="10"
                            fill="#6B7280"
                          >
                            {(d.value / 10000).toFixed(0)}万
                          </text>
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          </div>
        </section>
      </div>
    </div>
  );
}
