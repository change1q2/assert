import { useState, useEffect } from 'react';
import { fetchState } from '../api';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Activity,
  Calendar,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
} from 'lucide-react';
import BarChart from '../components/charts/BarChart.jsx';
import LineChart from '../components/charts/LineChart.jsx';
import PieChart from '../components/charts/PieChart.jsx';

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

    const categoryData = [
      { name: '股票', value: totalAssets * 0.35 },
      { name: '基金', value: totalAssets * 0.25 },
      { name: '存款', value: totalAssets * 0.2 },
      { name: '债券', value: totalAssets * 0.1 },
      { name: '其他', value: totalAssets * 0.1 },
    ];

    return {
      totalAssets,
      totalCost,
      totalPnl,
      totalPnlRate,
      monthlyData,
      years,
      totalDebts,
      netWorth,
      categoryData,
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

  const { totalAssets, totalPnl, totalPnlRate, monthlyData, years, totalDebts, netWorth, categoryData } = computeAnalysis();

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
                <PieChartIcon className="w-5 h-5" />
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
            <BarChart data={monthlyData} />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <LineChartIcon className="w-5 h-5 text-primary-500" />
              资产变化趋势
            </h3>
            <LineChart data={years} />
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-primary-500" />
              资产分类占比
            </h3>
            <PieChart data={categoryData} />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-500" />
              年度收益分析
            </h3>
            <LineChart data={years} />
          </div>
        </section>
      </div>
    </div>
  );
}
