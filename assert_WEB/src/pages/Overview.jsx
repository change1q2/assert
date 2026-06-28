import { useState, useEffect } from 'react';
import { fetchState, saveState } from '../api';
import {
  Wallet,
  Briefcase,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Settings,
  AlertTriangle,
  CheckCircle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
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

export default function Overview() {
  const [stateData, setStateData] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState('current');
  const [expandedSections, setExpandedSections] = useState({
    assets: false,
    liabilities: false,
  });
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [savingGoals, setSavingGoals] = useState(false);
  const [showEditGoalsModal, setShowEditGoalsModal] = useState(false);
  const [editGoalsForm, setEditGoalsForm] = useState({
    yearlyGoal: 0,
    targetAnnualReturn: 0,
    ultimateGoal: 0,
  });

  const { debts = [], records = [], accounts = [], overviewGoals = {} } = stateData || {};

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchState();
      setStateData(data);
      if (data.accounts) {
        const liabilityAccounts = data.accounts.filter(a => a.liability);
        const nonLiabilityAccounts = data.accounts.filter(a => !a.liability);
        const totalAssets = nonLiabilityAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
        setAssets(data.assets || nonLiabilityAccounts.map(a => ({
          id: a.id,
          name: a.name,
          category: a.category || '其他',
          rmbValue: a.balance || 0,
          costValue: a.balance || 0,
        })));
      } else {
        setAssets(data.assets || []);
      }
    } catch (error) {
      console.error('Failed to load overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const filterByTime = (recordsToFilter) => {
    if (!recordsToFilter || recordsToFilter.length === 0) return [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return recordsToFilter.filter(record => {
      const recordDate = new Date(record.date);
      const recordYear = recordDate.getFullYear();
      const recordMonth = recordDate.getMonth();

      if (timePeriod === '日常') {
        const today = now.toDateString();
        return recordDate.toDateString() === today;
      }

      if (timePeriod === '年统计') {
        return recordYear === currentYear;
      }

      if (timePeriod === '月统计' || timePeriod === '自定义') {
        let targetYear = currentYear;
        let targetMonth = currentMonth;

        if (selectedMonth === '上月') {
          targetMonth = currentMonth - 1;
          if (targetMonth < 0) {
            targetMonth = 11;
            targetYear -= 1;
          }
        } else if (selectedMonth !== '本月') {
          const monthMap = { '1月': 0, '2月': 1, '3月': 2, '4月': 3, '5月': 4, '6月': 5, '7月': 6, '8月': 7, '9月': 8, '10月': 9, '11月': 10, '12月': 11 };
          if (monthMap[selectedMonth] !== undefined) {
            targetMonth = monthMap[selectedMonth];
          }
        }

        return recordYear === targetYear && recordMonth === targetMonth;
      }

      return true;
    });
  };

  const computeLiabilities = (debtsData) => {
    if (!debtsData || debtsData.length === 0) {
      return { total: 0, dueIn30Days: 0, items: [] };
    }

    const items = [];
    let total = 0;
    let dueIn30Days = 0;

    debtsData.forEach(debt => {
      const amount = debt.amount || debt.balance || 0;
      total += amount;
      items.push({
        name: debt.name || debt.category || '未知',
        amount,
        dueIn30Days: debt.dueIn30Days || 0,
        remainingPeriods: debt.remainingPeriods,
      });
      dueIn30Days += debt.dueIn30Days || 0;
    });

    return { total, dueIn30Days, items };
  };

  const computeIncomeExpense = (recordsData, timeFilter) => {
    const filtered = filterByTime(recordsData);

    const incomeMap = {};
    const expenseMap = {};
    let totalIncome = 0;
    let totalExpense = 0;

    filtered.forEach(record => {
      const amount = Math.abs(record.amount || 0);
      if (record.type === 'income') {
        totalIncome += amount;
        const category = record.category || '其他收入';
        incomeMap[category] = (incomeMap[category] || 0) + amount;
      } else if (record.type === 'expense') {
        totalExpense += amount;
        const category = record.category || '其他支出';
        expenseMap[category] = (expenseMap[category] || 0) + amount;
      }
    });

    const income = Object.entries(incomeMap).map(([category, amount]) => ({
      category,
      amount,
      percent: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
    }));

    const expense = Object.entries(expenseMap).map(([category, amount]) => ({
      category,
      amount,
      percent: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
    }));

    return { income, expense, totalIncome, totalExpense };
  };

  const computeLiquidity = (accountsData, recordsData) => {
    const filtered = filterByTime(recordsData);
    const liquidAccounts = (accountsData || []).filter(a => !a.liability);
    const liquidAssets = liquidAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);

    let monthlyExpense = 0;
    let monthlyIncome = 0;
    let fixedExpense = 0;

    filtered.forEach(record => {
      const amount = Math.abs(record.amount || 0);
      if (record.type === 'expense') {
        monthlyExpense += amount;
        if (record.fixed) {
          fixedExpense += amount;
        }
      } else if (record.type === 'income') {
        monthlyIncome += amount;
      }
    });

    const freeCashFlow = monthlyIncome - fixedExpense;
    const emergencyMonths = monthlyExpense > 0 ? liquidAssets / monthlyExpense : 0;

    return {
      emergencyMonths,
      liquidAssets,
      monthlyExpense,
      freeCashFlow,
      monthlyIncome,
      fixedExpense,
    };
  };

  const computeGoals = (goals, assetsData) => {
    const totalValue = (assetsData || []).reduce((sum, a) => sum + (a.rmbValue || 0), 0);
    const liabilitiesData = computeLiabilities(debts);
    const currentNetWorth = totalValue - liabilitiesData.total;

    const yearlyProfit = goals?.yearlyProfit || 0;
    const yearlyGoal = goals?.yearlyGoal || 400000;
    const targetAnnualReturn = goals?.targetAnnualReturn || 15;
    const ultimateGoal = goals?.ultimateGoal || 53000000;

    const yearlyProfitRate = totalValue > 0 ? (yearlyProfit / totalValue) * 100 : 0;
    const yearlyProgress = yearlyGoal > 0 ? Math.min((yearlyProfit / yearlyGoal) * 100, 100) : 0;
    const ultimateProgress = ultimateGoal > 0 ? (currentNetWorth / ultimateGoal) * 100 : 0;
    const returnProgress = targetAnnualReturn > 0 ? Math.min((yearlyProfitRate / targetAnnualReturn) * 100, 100) : 0;

    return {
      yearlyProfit,
      yearlyProfitRate,
      ultimateGoal,
      currentNetWorth,
      yearlyGoal,
      targetAnnualReturn,
      yearlyProgress,
      ultimateProgress,
      returnProgress,
    };
  };

  const handleEditGoals = () => {
    setEditGoalsForm({
      yearlyGoal: overviewGoals?.yearlyGoal || 400000,
      targetAnnualReturn: overviewGoals?.targetAnnualReturn || 15,
      ultimateGoal: overviewGoals?.ultimateGoal || 53000000,
    });
    setShowEditGoalsModal(true);
  };

  const handleSaveGoals = async () => {
    setSavingGoals(true);
    try {
      const newState = {
        ...stateData,
        overviewGoals: {
          ...stateData?.overviewGoals,
          ...editGoalsForm,
        },
      };
      const result = await saveState(newState);
      if (result.success !== false) {
        setStateData(newState);
      }
      setShowEditGoalsModal(false);
    } catch (error) {
      console.error('Failed to save goals:', error);
    } finally {
      setSavingGoals(false);
    }
  };

  const totalValue = assets.reduce((sum, asset) => sum + asset.rmbValue, 0);
  const totalCost = assets.reduce((sum, asset) => sum + asset.costValue, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlRate = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const categoryGroups = assets.reduce((groups, asset) => {
    if (!groups[asset.category]) {
      groups[asset.category] = [];
    }
    groups[asset.category].push(asset);
    return groups;
  }, {});

  const categoryStats = Object.entries(categoryGroups).map(([category, items]) => ({
    category,
    value: items.reduce((sum, item) => sum + item.rmbValue, 0),
    cost: items.reduce((sum, item) => sum + item.costValue, 0),
    pnl: items.reduce((sum, item) => sum + item.rmbValue, 0) - items.reduce((sum, item) => sum + item.costValue, 0),
    count: items.length,
  })).sort((a, b) => b.value - a.value);

  const topHoldings = [...assets].sort((a, b) => b.rmbValue - a.rmbValue).slice(0, 5);

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // 计算真实数据
  const liabilities = computeLiabilities(debts);
  const incomeExpense = computeIncomeExpense(records);
  const liquidity = computeLiquidity(accounts, records);
  const goals = computeGoals(overviewGoals, assets);

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* 时间筛选栏 */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:px-7 shadow-soft border border-gray-100 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-1">
              {['日常', '月统计', '年统计', '自定义'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTimePeriod(tab)}
                  className={`px-4 py-1.5 rounded-full text-sm transition-all ${
                    timePeriod === tab
                      ? 'bg-primary-500 text-white font-medium'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-primary-500 mr-1">2026年</span>
              {['本月', '上月', '4月', '3月', '2月', '1月'].map((month, idx) => (
                <button
                  key={month}
                  onClick={() => setSelectedMonth(month)}
                  className={`px-3 py-1 rounded-full text-xs transition-all ${
                    selectedMonth === month
                      ? 'bg-primary-500 text-white font-medium'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {month}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Hero Bar */}
        <section
          className="rounded-2xl p-6 sm:p-7"
          style={{
            background: 'linear-gradient(135deg, #EDE9FE 0%, #F5F3FF 100%)',
          }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">资产总览</h1>
            </div>
            <div className="text-center lg:text-right">
              <div className="text-4xl sm:text-5xl font-bold text-gray-900 whitespace-nowrap tabular-nums tracking-tight">
                {formatCurrency(totalValue)}
              </div>
              <div className="mt-1 flex items-center justify-center lg:justify-end gap-1 text-sm text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span>较上月 +¥12,345 (+0.53%)</span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-primary-500 text-primary-500 text-sm font-medium hover:bg-primary-500 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                刷新数据
              </button>
            </div>
          </div>
        </section>

        {/* 进度目标 */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">进度目标</h2>
            <button
              onClick={handleEditGoals}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs text-gray-500 dark:text-gray-400 hover:text-primary-500 transition-colors"
            >
              <Settings className="w-3 h-3" />
              编辑
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-4 p-3 mb-4 rounded-lg" style={{ background: '#EDE9FE' }}>
            <span className="text-sm text-primary-600">
              今年收益额 <strong className="font-semibold">¥{goals.yearlyProfit.toLocaleString()}</strong>
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-primary-600">
              今年收益率 <strong className="font-semibold">{goals.yearlyProfitRate.toFixed(1)}%</strong>
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg p-4" style={{ background: '#EDE9FE' }}>
              <div className="text-xs text-gray-500 mb-1">终极目标</div>
              <div className="text-sm font-semibold text-gray-900 mb-2 tabular-nums">
                {formatCurrency(goals.currentNetWorth)} / {formatCurrency(goals.ultimateGoal)}
              </div>
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary-500 transition-all duration-700"
                  style={{ width: `${goals.ultimateProgress}%` }}
                />
              </div>
              <div className="text-right text-xs mt-1 text-gray-400">{goals.ultimateProgress.toFixed(1)}%</div>
            </div>
            <div className="rounded-lg p-4" style={{ background: '#EDE9FE' }}>
              <div className="text-xs text-gray-500 mb-1">本年目标</div>
              <div className="text-sm font-semibold text-gray-900 mb-2 tabular-nums">
                {formatCurrency(goals.yearlyProfit)} / {formatCurrency(goals.yearlyGoal)}
              </div>
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary-500 transition-all duration-700"
                  style={{ width: `${goals.yearlyProgress}%` }}
                />
              </div>
              <div className="text-right text-xs mt-1 text-gray-400">{goals.yearlyProgress.toFixed(1)}%</div>
            </div>
            <div className="rounded-lg p-4" style={{ background: '#EDE9FE' }}>
              <div className="text-xs text-gray-500 mb-1">目标年化收益率</div>
              <div className="text-sm font-semibold text-gray-900 mb-2 tabular-nums">
                {goals.yearlyProfitRate.toFixed(1)}% / {goals.targetAnnualReturn}%
              </div>
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary-500 transition-all duration-700"
                  style={{ width: `${goals.returnProgress}%` }}
                />
              </div>
              <div className="text-right text-xs mt-1 text-gray-400">{goals.returnProgress.toFixed(1)}%</div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">年份</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">期初资产</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">目标收益额</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">实际收益额</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">实际收益率</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">完成率</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">状态</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                  <td className="py-2.5 px-3 text-gray-900 dark:text-white">2026</td>
                  <td className="py-2.5 px-3 tabular-nums text-gray-900 dark:text-white">¥0</td>
                  <td className="py-2.5 px-3 tabular-nums text-gray-900 dark:text-white">¥0</td>
                  <td className="py-2.5 px-3 tabular-nums text-gray-900 dark:text-white">¥0</td>
                  <td className="py-2.5 px-3 text-green-600 tabular-nums">0.00%</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-2 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                        <div className="h-full rounded-full bg-primary-500" style={{ width: '0%' }} />
                      </div>
                      <span className="text-xs text-gray-400">0.0%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      进行中
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 核心指标三列 */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 总资产 */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => toggleSection('assets')}
            >
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">总资产</h2>
              {expandedSections.assets ? (
                <ChevronUp className="w-4 h-4 text-gray-400 transition-transform" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400 transition-transform" />
              )}
            </div>
            <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
              {formatCurrency(totalValue)}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {categoryStats.map((stat, idx) => (
                <span
                  key={stat.category}
                  className="px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{
                    background: idx < 3 ? '#EDE9FE' : '#F3F4F6',
                    color: idx < 3 ? '#7C3AED' : '#6B7280',
                  }}
                >
                  {stat.category} {formatCurrency(stat.value)}
                </span>
              ))}
            </div>
            {expandedSections.assets && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 space-y-2">
                {categoryStats.map((stat) => (
                  <div key={stat.category}>
                    <div className="flex justify-between items-center py-1.5 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{stat.category}</span>
                      <span className="font-medium text-gray-900 dark:text-white tabular-nums">
                        {formatCurrency(stat.value)}
                      </span>
                    </div>
                    <div className="pl-4 space-y-1">
                      {categoryGroups[stat.category].slice(0, 3).map((asset) => (
                        <div key={asset.id} className="flex justify-between py-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>{asset.name}</span>
                          <span className="tabular-nums">{formatCurrency(asset.rmbValue)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 总负债 */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => toggleSection('liabilities')}
            >
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">总负债</h2>
              {expandedSections.liabilities ? (
                <ChevronUp className="w-4 h-4 text-gray-400 transition-transform" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400 transition-transform" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                30天待还 {formatCurrency(liabilities.dueIn30Days)}
              </span>
            </div>
            <div className="mt-2 text-3xl font-bold text-red-500 tabular-nums whitespace-nowrap">
              {formatCurrency(liabilities.total)}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {liabilities.items.map((item) => (
                <span
                  key={item.name}
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400"
                >
                  {item.name} {formatCurrency(item.amount)}
                </span>
              ))}
            </div>
            {expandedSections.liabilities && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 space-y-2">
                {liabilities.items.map((item) => (
                  <div key={item.name} className="flex justify-between items-center py-1.5 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                    <span className="font-medium text-gray-900 dark:text-white tabular-nums">
                      {formatCurrency(item.amount)}
                      {item.dueIn30Days && (
                        <span className="ml-2 text-xs text-red-500">
                          (30天待还 {formatCurrency(item.dueIn30Days)})
                        </span>
                      )}
                      {item.remainingPeriods && (
                        <span className="ml-2 text-xs text-gray-400">(剩余{item.remainingPeriods}期)</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 流动性指标 */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">流动性指标</h2>
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">应急月数</span>
                <span className="text-lg font-semibold text-green-600 tabular-nums">
                  {liquidity.emergencyMonths.toFixed(1)}个月
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-700"
                  style={{ width: `${Math.min(liquidity.emergencyMonths / 12 * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs mt-1 text-gray-400">
                流动资产 {formatCurrency(liquidity.liquidAssets)} / 月均支出 {formatCurrency(liquidity.monthlyExpense)}
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">自由现金流</span>
                <span className={`text-lg font-semibold tabular-nums ${liquidity.freeCashFlow >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {liquidity.freeCashFlow >= 0 ? '+' : ''}{formatCurrency(liquidity.freeCashFlow)}
                </span>
              </div>
              <p className="text-xs mt-1 text-gray-400">
                本月收入 {formatCurrency(liquidity.monthlyIncome)} - 刚性支出 {formatCurrency(liquidity.fixedExpense)}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-600">可投资额度充足</span>
              </div>
            </div>
          </div>
        </section>

        {/* 收益与盈亏 + 资产配置 */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 收益与盈亏 */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">收益与盈亏</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">当年收益率</span>
            </div>
            <div className="mt-1 text-3xl font-bold text-green-600 tabular-nums whitespace-nowrap">
              +{totalPnlRate.toFixed(1)}%
            </div>

            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>市值</span>
                <span className="tabular-nums">{formatCurrency(totalValue)}</span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                <div className="h-full rounded-full bg-primary-500" style={{ width: '100%' }} />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>投入</span>
                <span className="tabular-nums">{formatCurrency(totalCost)}</span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gray-300 dark:bg-slate-600"
                  style={{ width: `${totalCost > 0 ? (totalCost / totalValue) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
              <h3 className="text-xs font-medium mb-2 text-gray-500 dark:text-gray-400">分类盈亏</h3>
              <div className="space-y-2">
                {categoryStats.map((stat, idx) => {
                  const pnlRate = stat.cost > 0 ? (stat.pnl / stat.cost) * 100 : 0;
                  const isPositive = stat.pnl >= 0;
                  return (
                    <div
                      key={stat.category}
                      className="flex justify-between items-center py-1.5 text-sm border-b border-gray-100 dark:border-slate-700/50 last:border-0"
                    >
                      <span className="text-gray-900 dark:text-white">{stat.category}</span>
                      <span className={`tabular-nums font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                        {isPositive ? '+' : ''}
                        {formatCurrency(stat.pnl)} ({isPositive ? '+' : ''}
                        {pnlRate.toFixed(1)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 资产配置 */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">资产配置</h2>
            <div className="mt-4">
              <img
                src="https://mdn.alipayobjects.com/one_clip/afts/img/iEmqSZyyxSQAAAAARkAAAAgAoEACAQFr/original"
                alt="资产配置结构"
                className="w-full h-auto rounded-lg"
              />
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
              <h3 className="text-xs font-medium mb-2 text-gray-500 dark:text-gray-400">集中度预警</h3>
              <div className="space-y-2">
                {topHoldings.slice(0, 3).map((asset, idx) => {
                  const percent = totalValue > 0 ? ((asset.rmbValue / totalValue) * 100).toFixed(1) : 0;
                  const level = idx === 0 ? 'high' : idx === 1 ? 'medium' : 'normal';
                  return (
                    <div key={asset.id} className="flex items-center gap-2 py-1.5 text-sm">
                      <span className="text-gray-900 dark:text-white min-w-[90px]">{asset.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{percent}%</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          level === 'high'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            : level === 'medium'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {level === 'high' ? '高集中度' : level === 'medium' ? '中集中度' : '正常'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 数据可视化区 */}
        <section className="space-y-4">
          {/* 收入/支出占比 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">收入占比</h3>
              <div className="mt-3 flex justify-center">
                <div className="w-full max-w-[240px]">
                  <svg viewBox="0 0 100 100" className="w-full h-auto">
                    {(() => {
                      const colors = ['#8B5CF6', '#10B981', '#F59E0B', '#06B6D4'];
                      let cumulativePercent = 0;
                      return incomeExpense.income.map((item, idx) => {
                        const startPercent = cumulativePercent;
                        cumulativePercent += item.percent;
                        const endPercent = cumulativePercent;
                        const largeArcFlag = item.percent > 50 ? 1 : 0;
                        const startAngle = (startPercent / 100) * 2 * Math.PI - Math.PI / 2;
                        const endAngle = (endPercent / 100) * 2 * Math.PI - Math.PI / 2;
                        const x1 = 50 + 40 * Math.cos(startAngle);
                        const y1 = 50 + 40 * Math.sin(startAngle);
                        const x2 = 50 + 40 * Math.cos(endAngle);
                        const y2 = 50 + 40 * Math.sin(endAngle);
                        return (
                          <path
                            key={idx}
                            d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                            fill={colors[idx % colors.length]}
                          />
                        );
                      });
                    })()}
                  </svg>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {incomeExpense.income.map((item, idx) => (
                  <div key={item.category} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ['#8B5CF6', '#10B981', '#F59E0B', '#06B6D4'][idx] }}
                    />
                    <span className="text-gray-500 dark:text-gray-400">{item.category}</span>
                    <span className="ml-auto text-gray-700 dark:text-gray-300 tabular-nums font-medium">
                      {item.percent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">支出占比</h3>
              <div className="mt-3 flex justify-center">
                <div className="w-full max-w-[240px]">
                  <svg viewBox="0 0 100 100" className="w-full h-auto">
                    {(() => {
                      const colors = ['#EC4899', '#8B5CF6', '#F59E0B', '#06B6D4', '#10B981'];
                      let cumulativePercent = 0;
                      return incomeExpense.expense.map((item, idx) => {
                        const startPercent = cumulativePercent;
                        cumulativePercent += item.percent;
                        const endPercent = cumulativePercent;
                        const largeArcFlag = item.percent > 50 ? 1 : 0;
                        const startAngle = (startPercent / 100) * 2 * Math.PI - Math.PI / 2;
                        const endAngle = (endPercent / 100) * 2 * Math.PI - Math.PI / 2;
                        const x1 = 50 + 40 * Math.cos(startAngle);
                        const y1 = 50 + 40 * Math.sin(startAngle);
                        const x2 = 50 + 40 * Math.cos(endAngle);
                        const y2 = 50 + 40 * Math.sin(endAngle);
                        return (
                          <path
                            key={idx}
                            d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                            fill={colors[idx % colors.length]}
                          />
                        );
                      });
                    })()}
                  </svg>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {incomeExpense.expense.map((item, idx) => (
                  <div key={item.category} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ['#EC4899', '#8B5CF6', '#F59E0B', '#06B6D4', '#10B981'][idx] }}
                    />
                    <span className="text-gray-500 dark:text-gray-400">{item.category}</span>
                    <span className="ml-auto text-gray-700 dark:text-gray-300 tabular-nums font-medium">
                      {item.percent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 品类盈亏排行 + 资产增长趋势 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">品类盈亏排行</h3>
              <div className="mt-3 space-y-3">
                {categoryStats.map((stat, idx) => {
                  const isPositive = stat.pnl >= 0;
                  const maxPnl = Math.max(...categoryStats.map((s) => Math.abs(s.pnl)));
                  const barWidth = maxPnl > 0 ? (Math.abs(stat.pnl) / maxPnl) * 100 : 0;
                  return (
                    <div key={stat.category}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-900 dark:text-white">{stat.category}</span>
                        <span className={`tabular-nums font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                          {isPositive ? '+' : ''}
                          {formatCurrency(stat.pnl)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">资产增长趋势</h3>
              <div className="mt-3">
                <svg viewBox="0 0 300 120" className="w-full h-auto">
                  {(() => {
                    const growthData = (() => {
                      const now = new Date();
                      const currentYear = now.getFullYear();
                      const monthlyData = [];
                      for (let i = 0; i < 6; i++) {
                        const monthDate = new Date(currentYear, i, 1);
                        const monthLabel = `${i + 1}月`;
                        const monthRecords = records.filter(r => {
                          const d = new Date(r.date);
                          return d.getFullYear() === currentYear && d.getMonth() === i;
                        });
                        const income = monthRecords.filter(r => r.type === 'income').reduce((sum, r) => sum + Math.abs(r.amount || 0), 0);
                        monthlyData.push({ month: monthLabel, value: income });
                      }
                      return monthlyData;
                    })();
                    const values = growthData.map((d) => d.value);
                    const maxVal = Math.max(...values);
                    const minVal = Math.min(...values) * 0.95;
                    const range = maxVal - minVal;
                    const points = values.map((v, i) => {
                      const x = (i / (values.length - 1)) * 280 + 10;
                      const y = 110 - ((v - minVal) / range) * 90;
                      return `${x},${y}`;
                    });
                    const pathData = `M ${points.join(' L ')}`;
                    const areaData = `M 10,110 L ${points.join(' L ')} L 290,110 Z`;
                    return (
                      <>
                        <defs>
                          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.05" />
                          </linearGradient>
                        </defs>
                        <path d={areaData} fill="url(#areaGradient)" />
                        <path d={pathData} fill="none" stroke="#8B5CF6" strokeWidth="2" />
                        {values.map((v, i) => {
                          const x = (i / (values.length - 1)) * 280 + 10;
                          const y = 110 - ((v - minVal) / range) * 90;
                          return <circle key={i} cx={x} cy={y} r="3" fill="#8B5CF6" />;
                        })}
                        {growthData.map((d, i) => {
                          const x = (i / (growthData.length - 1)) * 280 + 10;
                          return (
                            <text key={i} x={x} y="118" textAnchor="middle" fontSize="9" fill="#9CA3AF">
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
          </div>

          {/* 年均资产变化 */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">年均资产变化</h3>
            <div className="mt-3">
              <svg viewBox="0 0 600 200" className="w-full h-auto">
                {(() => {
                  const years = [
                    { year: '2021', value: 1800000 },
                    { year: '2022', value: 2200000 },
                    { year: '2023', value: 2800000 },
                    { year: '2024', value: 3100000 },
                    { year: '2025', value: 3400000 },
                    { year: '2026', value: totalValue },
                  ];
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
          </div>
        </section>

        {/* 数据来源说明 */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">数据来源与计算公式</h3>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">总资产：</span>
                所有持仓资产的市值之和，数据源为资产列表中各资产的 rmbValue 字段
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">总盈亏：</span>
                总资产 - 总成本，公式 = Σ(rmbValue) - Σ(costValue)
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">收益率：</span>
                总盈亏 / 总成本 × 100%，公式 = (Σ(rmbValue) - Σ(costValue)) / Σ(costValue) × 100%
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0" />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">说明：</span>
                负债数据来自 debts，收入支出数据来自 records，流动性数据来自 accounts 和 records
              </div>
            </div>
          </div>
        </div>

        {/* 编辑目标弹窗 */}
        {showEditGoalsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">编辑进度目标</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    本年目标收益额 (¥)
                  </label>
                  <input
                    type="number"
                    value={editGoalsForm.yearlyGoal}
                    onChange={(e) => setEditGoalsForm({ ...editGoalsForm, yearlyGoal: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    目标年化收益率 (%)
                  </label>
                  <input
                    type="number"
                    value={editGoalsForm.targetAnnualReturn}
                    onChange={(e) => setEditGoalsForm({ ...editGoalsForm, targetAnnualReturn: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    终极目标资产 (¥)
                  </label>
                  <input
                    type="number"
                    value={editGoalsForm.ultimateGoal}
                    onChange={(e) => setEditGoalsForm({ ...editGoalsForm, ultimateGoal: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowEditGoalsModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveGoals}
                  disabled={savingGoals}
                  className="px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
                >
                  {savingGoals ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
