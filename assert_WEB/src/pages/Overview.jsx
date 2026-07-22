import { useState, useEffect } from 'react';
import { fetchState, saveState } from '../api';
import { PieChart, Pie, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
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
  PiggyBank,
  Landmark,
  Banknote,
  CreditCard,
} from 'lucide-react';

const ASSET_CATEGORY_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#EF4444'];

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
  const [showEditYearlyModal, setShowEditYearlyModal] = useState(false);
  const [editYearlyForm, setEditYearlyForm] = useState({
    year: new Date().getFullYear(),
    openingAsset: 0,
    closingAsset: 0,
    targetProfit: 0,
  });
  const [editingYearIndex, setEditingYearIndex] = useState(-1);

  const { debts = [], records = [], accounts = [], overviewGoals = {}, financeAssets = [], independentAssets = {} } = stateData || {};

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchState();
      setStateData(data);
      if (data.accounts) {
        const nonLiabilityAccounts = data.accounts.filter(a => !a.liability);
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

  const computeYearlyRows = (yearlyRecords, netAssetVal) => {
    const currentYear = new Date().getFullYear();
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(currentYear, 0, 0)) / 1000 / 60 / 60 / 24);
    const sorted = [...(yearlyRecords || [])].sort((a, b) => a.year - b.year);

    const rows = [];
    sorted.forEach((record, idx) => {
      const prevRecord = rows[idx - 1];
      const prevClosing = prevRecord ? prevRecord.closingAsset : 0;
      const rawOpening = parseFloat(record.openingAsset) || 0;
      const openingAsset = idx === 0 ? (rawOpening || prevClosing) : prevClosing;
      const closingAsset = parseFloat(record.closingAsset) || netAssetVal;
      const targetProfit = parseFloat(record.targetProfit) || 0;
      const actualProfit = closingAsset - openingAsset;
      const actualRate = openingAsset > 0 ? (actualProfit / openingAsset) * 100 : 0;
      const completionRate = targetProfit > 0 ? (actualProfit / targetProfit) * 100 : 0;
      const isCurrentYear = record.year === currentYear;

      // 累计年化收益率（CAGR）: 从第一年期初到当前行期末的累计年化
      const firstOpening = rows[0]?.openingAsset || openingAsset;
      let yearsElapsed;
      if (isCurrentYear) {
        // 当前年份按实际已过天数折算
        yearsElapsed = (record.year - sorted[0].year) + dayOfYear / 365;
      } else {
        // 历史完整年份
        yearsElapsed = record.year - sorted[0].year + 1;
      }
      let annualizedRate = 0;
      if (firstOpening > 0 && yearsElapsed > 0 && closingAsset > 0) {
        annualizedRate = (Math.pow(closingAsset / firstOpening, 1 / yearsElapsed) - 1) * 100;
      }

      const isCompleted = completionRate >= 100;

      rows.push({
        ...record,
        originalIndex: (yearlyRecords || []).findIndex(r => r.year === record.year),
        openingAsset,
        closingAsset,
        targetProfit,
        actualProfit,
        actualRate,
        annualizedRate,
        completionRate,
        isCurrentYear,
        isCompleted,
      });
    });

    // 本年未录入时的自动计算行
    const hasCurrentYear = sorted.some(r => r.year === currentYear);
    if (!hasCurrentYear) {
      const lastRecord = rows[rows.length - 1];
      const openingAsset = lastRecord ? lastRecord.closingAsset : 0;
      const closingAsset = netAssetVal;
      const actualProfit = openingAsset > 0 ? closingAsset - openingAsset : 0;
      const actualRate = openingAsset > 0 ? (actualProfit / openingAsset) * 100 : 0;
      // 累计年化：从第一年期初到当前期末
      const firstOpening = rows[0]?.openingAsset || openingAsset;
      const yearsElapsed = sorted.length > 0
        ? (currentYear - sorted[0].year) + dayOfYear / 365
        : dayOfYear / 365;
      let annualizedRate = 0;
      if (firstOpening > 0 && yearsElapsed > 0 && closingAsset > 0) {
        annualizedRate = (Math.pow(closingAsset / firstOpening, 1 / yearsElapsed) - 1) * 100;
      }
      rows.push({
        year: currentYear,
        openingAsset,
        closingAsset,
        targetProfit: 0,
        actualProfit,
        actualRate,
        annualizedRate,
        completionRate: 0,
        isCurrentYear: true,
        isCompleted: false,
        isAuto: true,
      });
    }

    return rows.reverse();
  };

  const computeGoals = (goals, assetsData, yearlyRecords, netAssetVal) => {
    const currentYear = new Date().getFullYear();
    const currentYearRecord = (yearlyRecords || []).find(r => r.year === currentYear);
    const sortedRecords = [...(yearlyRecords || [])].sort((a, b) => a.year - b.year);
    const lastRecord = sortedRecords[sortedRecords.length - 1];
    const prevClosing = lastRecord ? (parseFloat(lastRecord.closingAsset) || 0) : 0;

    const openingAsset = currentYearRecord
      ? (parseFloat(currentYearRecord.openingAsset) || prevClosing)
      : prevClosing;
    const closingAsset = netAssetVal;
    const yearlyProfit = closingAsset - openingAsset;
    const yearlyProfitRate = openingAsset > 0 ? (yearlyProfit / openingAsset) * 100 : 0;

    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(currentYear, 0, 0)) / 1000 / 60 / 60 / 24);
    const annualizedReturn = dayOfYear > 0 ? yearlyProfitRate * (365 / dayOfYear) : yearlyProfitRate;

    const yearlyGoal = currentYearRecord?.targetProfit || goals?.yearlyGoal || 400000;
    const targetAnnualReturn = goals?.targetAnnualReturn || 15;
    const ultimateGoal = goals?.ultimateGoal || 53000000;

    const yearlyProgress = yearlyGoal > 0 ? Math.min((yearlyProfit / yearlyGoal) * 100, 100) : 0;
    const ultimateProgress = ultimateGoal > 0 ? (netAssetVal / ultimateGoal) * 100 : 0;
    const returnProgress = targetAnnualReturn > 0 ? Math.min((annualizedReturn / targetAnnualReturn) * 100, 100) : 0;

    return {
      yearlyProfit,
      yearlyProfitRate,
      annualizedReturn,
      ultimateGoal,
      currentNetWorth: netAssetVal,
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

  // 计算真实数据
  const liabilities = computeLiabilities(debts);
  const incomeExpense = computeIncomeExpense(records);
  const liquidity = computeLiquidity(accounts, records);

  // 计算理财总资产（与理财模块的总市值计算保持一致：currentValue = currentPrice × shares，货币汇率折算）
  const exchangeRates = stateData?.exchangeRates || { CNY: 1 };
  const financeTotalValue = (financeAssets || []).reduce((sum, a) => {
    const _price = parseFloat(a.currentPrice) || parseFloat(a.costPrice) || parseFloat(a.cost) || 0;
    const _qty = parseFloat(a.shares) || parseFloat(a.quantity) || 0;
    const value = _price * _qty;
    const currency = a.currency || 'CNY';
    const fromRate = exchangeRates[currency] ?? 1;
    const toRate = exchangeRates['CNY'] ?? 1;
    const rmbValue = currency === 'CNY' ? value : (value * fromRate) / toRate;
    return sum + rmbValue;
  }, 0);

  // 计算独立总资产
  let independentTotalValue = 0;
  Object.values(independentAssets || {}).forEach(items => {
    (items || []).forEach(item => {
      const type = item.type || item.category;
      if (type === 'insurance') {
        independentTotalValue += parseFloat(item.premiumTotal || 0);
      } else if (type === 'realestate') {
        const marketValue = parseFloat(item.marketValue || 0);
        const taxAmount = parseFloat(item.taxAmount || 0);
        const agencyFee = parseFloat(item.agencyFee || 0);
        const actualValue = marketValue > 0 ? (marketValue - taxAmount - agencyFee) : parseFloat(item.purchasePrice || 0);
        independentTotalValue += actualValue;
      } else if (type === 'vehicle') {
        const purchasePrice = parseFloat(item.purchasePrice || 0);
        const depreciationRate = parseFloat(item.depreciationRate || 0);
        const years = parseFloat(item.ownershipYears || 0);
        const residualValue = purchasePrice * Math.pow(1 - depreciationRate / 100, years);
        independentTotalValue += residualValue;
      } else if (type === 'fixedinvestment') {
        independentTotalValue += parseFloat(item.investmentCost || 0);
      } else if (type === 'equity') {
        independentTotalValue += parseFloat(item.marketValue || item.investmentCost || 0);
      } else if (type === 'fixeddeposit') {
        independentTotalValue += parseFloat(item.amount || 0);
      }
    });
  });

  // 资产总览 = 理财总资产 + 独立总资产 - 总负债
  const netAssetValue = financeTotalValue + independentTotalValue - liabilities.total;

  const yearlyRecords = stateData?.yearlyRecords || [];
  const goals = computeGoals(overviewGoals, assets, yearlyRecords, netAssetValue);

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

  const assetAllocationData = () => {
    const allocation = {};

    const financeKindLabels = {
      stock: '股票',
      fund: '基金',
      commodity: '商品',
      futures: '期货',
      options: '期权',
      crypto: '加密货币',
      cashflow: '现金',
      custom: '其他理财',
    };

    (financeAssets || []).forEach(asset => {
      const category = asset.category || asset.kind || '其他理财';
      const label = financeKindLabels[asset.kind] || category;
      const _price = parseFloat(asset.currentPrice) || parseFloat(asset.costPrice) || parseFloat(asset.cost) || 0;
      const _qty = parseFloat(asset.shares) || parseFloat(asset.quantity) || 0;
      const value = _price * _qty;
      const currency = asset.currency || 'CNY';
      const fromRate = exchangeRates[currency] ?? 1;
      const toRate = exchangeRates['CNY'] ?? 1;
      const rmbValue = currency === 'CNY' ? value : (value * fromRate) / toRate;
      allocation[label] = (allocation[label] || 0) + rmbValue;
    });

    const independentTypeLabels = {
      insurance: '保险',
      realestate: '房产',
      vehicle: '车辆',
      fixedinvestment: '固定投资',
      equity: '股权',
      fixeddeposit: '定期资产',
    };

    Object.values(independentAssets || {}).forEach(items => {
      (items || []).forEach(item => {
        const type = item.type || item.category;
        const label = independentTypeLabels[type] || type;
        let value = 0;
        if (type === 'insurance') {
          value = parseFloat(item.premiumTotal || 0);
        } else if (type === 'realestate') {
          const marketValue = parseFloat(item.marketValue || 0);
          const taxAmount = parseFloat(item.taxAmount || 0);
          const agencyFee = parseFloat(item.agencyFee || 0);
          value = marketValue > 0 ? (marketValue - taxAmount - agencyFee) : parseFloat(item.purchasePrice || 0);
        } else if (type === 'vehicle') {
          const purchasePrice = parseFloat(item.purchasePrice || 0);
          const depreciationRate = parseFloat(item.depreciationRate || 0);
          const years = parseFloat(item.ownershipYears || 0);
          value = purchasePrice * Math.pow(1 - depreciationRate / 100, years);
        } else if (type === 'fixedinvestment') {
          value = parseFloat(item.investmentCost || 0);
        } else if (type === 'equity') {
          value = parseFloat(item.marketValue || item.investmentCost || 0);
        } else if (type === 'fixeddeposit') {
          value = parseFloat(item.amount || 0);
        }
        allocation[label] = (allocation[label] || 0) + value;
      });
    });

    return Object.entries(allocation)
      .filter(([, value]) => value > 0)
      .map(([name, value], idx) => ({
        name,
        value,
        color: ASSET_CATEGORY_COLORS[idx % ASSET_CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  };

  const assetAllocation = assetAllocationData();

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Hero Bar */}
        <section
          className="rounded-xl p-6 sm:p-7"
          style={{
            background: 'linear-gradient(135deg, #DBEAFE 0%, #EFF6FF 100%)',
          }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold font-mono tracking-tight text-gray-900">资产总览</h1>
            </div>
            <div className="text-center lg:text-right">
              <div className="text-4xl sm:text-5xl font-bold font-mono text-gray-900 whitespace-nowrap tabular-nums tracking-tight">
                {formatCurrency(netAssetValue)}
              </div>
              <div className="mt-1 flex items-center justify-center lg:justify-end gap-1 text-sm text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span>资产总览 = 理财 + 独立 - 负债</span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                刷新数据
              </button>
            </div>
          </div>
        </section>

        {/* 进度目标 */}
        <section className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200/60 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold font-mono text-gray-900 dark:text-white">进度目标</h2>
            <button
              onClick={handleEditGoals}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 transition-colors"
            >
              <Settings className="w-3 h-3" />
              编辑
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-4 p-3 mb-4 rounded-lg" style={{ background: '#EFF6FF' }}>
            <span className="text-sm text-blue-600">
              今年收益额 <strong className="font-semibold">¥{goals.yearlyProfit.toLocaleString()}</strong>
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-blue-600">
              今年收益率 <strong className="font-semibold">{goals.yearlyProfitRate.toFixed(1)}%</strong>
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg p-4" style={{ background: '#EFF6FF' }}>
              <div className="text-xs text-gray-500 mb-1">终极目标</div>
              <div className="text-sm font-semibold font-mono text-gray-900 mb-2 tabular-nums">
                {formatCurrency(goals.currentNetWorth)} / {formatCurrency(goals.ultimateGoal)}
              </div>
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-700"
                  style={{ width: `${goals.ultimateProgress}%` }}
                />
              </div>
              <div className="text-right text-xs mt-1 font-mono text-gray-400">{goals.ultimateProgress.toFixed(1)}%</div>
            </div>
            <div className="rounded-lg p-4" style={{ background: '#EFF6FF' }}>
              <div className="text-xs text-gray-500 mb-1">本年目标</div>
              <div className="text-sm font-semibold font-mono text-gray-900 mb-2 tabular-nums">
                {formatCurrency(goals.yearlyProfit)} / {formatCurrency(goals.yearlyGoal)}
              </div>
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-700"
                  style={{ width: `${goals.yearlyProgress}%` }}
                />
              </div>
              <div className="text-right text-xs mt-1 font-mono text-gray-400">{goals.yearlyProgress.toFixed(1)}%</div>
            </div>
            <div className="rounded-lg p-4" style={{ background: '#EFF6FF' }}>
              <div className="text-xs text-gray-500 mb-1">目标年化收益率</div>
              <div className="text-sm font-semibold font-mono text-gray-900 mb-2 tabular-nums">
                {goals.annualizedReturn.toFixed(1)}% / {goals.targetAnnualReturn}%
              </div>
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-700"
                  style={{ width: `${goals.returnProgress}%` }}
                />
              </div>
              <div className="text-right text-xs mt-1 font-mono text-gray-400">{goals.returnProgress.toFixed(1)}%</div>
            </div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">历史年份可手动录入，本年数据自动计算</span>
            <button
              onClick={() => {
                setEditingYearIndex(-1);
                setEditYearlyForm({
                  year: new Date().getFullYear() - 1,
                  openingAsset: 0,
                  targetProfit: 0,
                });
                setShowEditYearlyModal(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs text-blue-600 hover:bg-blue-50 transition-colors"
            >
              + 新增年份
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">年份</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">期初资产</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">期末资产</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">目标收益额</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">实际收益额</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">实际收益率</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">年化收益率</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">完成率</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">状态</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody>
                {computeYearlyRows(stateData?.yearlyRecords, netAssetValue).map((row) => (
                  <tr key={row.year} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-150">
                    <td className="py-2.5 px-3 text-gray-900 dark:text-white">{row.year}</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-gray-900 dark:text-white">{formatCurrency(row.openingAsset)}</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-blue-600 dark:text-blue-400">{formatCurrency(row.closingAsset)}</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-gray-900 dark:text-white">{formatCurrency(row.targetProfit)}</td>
                    <td className={`py-2.5 px-3 font-mono tabular-nums ${row.actualProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(row.actualProfit)}</td>
                    <td className={`py-2.5 px-3 font-mono tabular-nums ${row.actualRate >= 0 ? 'text-green-600' : 'text-red-500'}`}>{row.actualRate.toFixed(2)}%</td>
                    <td className={`py-2.5 px-3 font-mono tabular-nums ${row.annualizedRate >= 0 ? 'text-green-600' : 'text-red-500'}`}>{row.annualizedRate.toFixed(2)}%</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-2 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                          <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(Math.abs(row.completionRate), 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-400">{row.completionRate.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${row.isCompleted ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                        {row.isCompleted ? '已完成' : '未完成'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingYearIndex(row.isAuto ? -1 : row.originalIndex);
                            setEditYearlyForm({
                              year: row.year,
                              openingAsset: row.isAuto ? row.openingAsset : (row.openingAsset || 0),
                              closingAsset: row.isAuto ? 0 : (row.closingAsset || 0),
                              targetProfit: row.targetProfit || 0,
                            });
                            setShowEditYearlyModal(true);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          编辑
                        </button>
                        {!row.isAuto && <span className="text-gray-300">|</span>}
                        {!row.isAuto && (
                          <button
                            onClick={async () => {
                              if (confirm(`确定删除 ${row.year} 年的记录吗？`)) {
                                try {
                                  const existing = stateData?.yearlyRecords || [];
                                  const updated = existing.filter((_, i) => i !== row.originalIndex);
                                  await saveState({ ...stateData, yearlyRecords: updated });
                                  setStateData(prev => ({ ...prev, yearlyRecords: updated }));
                                } catch (err) {
                                  console.error('删除失败:', err);
                                  alert('删除失败，请重试');
                                }
                              }
                            }}
                            className="text-xs text-red-500 hover:text-red-600 transition-colors"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 核心指标五列 */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 总收入 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold font-mono text-gray-900 dark:text-white">总收入</h2>
              <Banknote className="w-4 h-4 text-green-500" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-600">
                {incomeExpense.income.length} 个来源
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-green-600 tabular-nums whitespace-nowrap">
              {formatCurrency(incomeExpense.totalIncome)}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {incomeExpense.income.slice(0, 3).map((item) => (
                <span
                  key={item.category}
                  className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600"
                >
                  {item.category}
                </span>
              ))}
            </div>
          </div>

          {/* 总支出 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold font-mono text-gray-900 dark:text-white">总支出</h2>
              <CreditCard className="w-4 h-4 text-red-500" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                {incomeExpense.expense.length} 个类别
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-red-500 tabular-nums whitespace-nowrap">
              {formatCurrency(incomeExpense.totalExpense)}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {incomeExpense.expense.slice(0, 3).map((item) => (
                <span
                  key={item.category}
                  className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600"
                >
                  {item.category}
                </span>
              ))}
            </div>
          </div>

          {/* 理财总资产 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold font-mono text-gray-900 dark:text-white">理财总资产</h2>
              <PiggyBank className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
                {(financeAssets || []).length} 个持仓
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-blue-600 tabular-nums whitespace-nowrap">
              {formatCurrency(financeTotalValue)}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {Array.from(new Set((financeAssets || []).map(a => a.category).filter(Boolean))).slice(0, 3).map((cat) => (
                <span
                  key={cat}
                  className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>

          {/* 独立总资产 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold font-mono text-gray-900 dark:text-white">独立总资产</h2>
              <Landmark className="w-4 h-4 text-purple-500" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-600">
                {Object.values(independentAssets || {}).reduce((sum, items) => sum + (items?.length || 0), 0)} 项资产
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-purple-600 tabular-nums whitespace-nowrap">
              {formatCurrency(independentTotalValue)}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {Object.keys(independentAssets || {}).slice(0, 3).map((type) => (
                <span
                  key={type}
                  className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-600"
                >
                  {type === 'insurance' ? '保险' : type === 'realestate' ? '房产' : type === 'vehicle' ? '车辆' : type === 'fixedinvestment' ? '固定投资' : type === 'equity' ? '股权' : type === 'fixeddeposit' ? '定期' : type}
                </span>
              ))}
            </div>
          </div>

          {/* 总负债 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold font-mono text-gray-900 dark:text-white">总负债</h2>
              <CreditCard className="w-4 h-4 text-red-500" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                30天待还 {formatCurrency(liabilities.dueIn30Days)}
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-red-500 tabular-nums whitespace-nowrap">
              {formatCurrency(liabilities.total)}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {liabilities.items.slice(0, 3).map((item) => (
                <span
                  key={item.name}
                  className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600"
                >
                  {item.name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* 收益与盈亏 + 资产配置 */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 收益与盈亏 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200/60 dark:border-slate-800">
            <h2 className="text-base font-semibold font-mono text-gray-900 dark:text-white">收益与盈亏</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">当年收益率</span>
            </div>
            <div className="mt-1 text-3xl font-bold font-mono text-green-600 tabular-nums whitespace-nowrap">
              +{totalPnlRate.toFixed(1)}%
            </div>

            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>市值</span>
                <span className="font-mono tabular-nums">{formatCurrency(totalValue)}</span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                <div className="h-full rounded-full bg-blue-600" style={{ width: '100%' }} />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>投入</span>
                <span className="font-mono tabular-nums">{formatCurrency(totalCost)}</span>
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
                      <span className={`font-mono tabular-nums font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
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
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200/60 dark:border-slate-800">
            <h2 className="text-base font-semibold font-mono text-gray-900 dark:text-white">资产配置</h2>
            <div className="mt-4 h-[240px]">
              {assetAllocation.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetAllocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={65}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => {
                        const text = `${name}: ${(percent * 100).toFixed(1)}%`;
                        return text.length > 16 ? text.slice(0, 15) + '…' : text;
                      }}
                      labelLine={{ strokeWidth: 1, stroke: '#9CA3AF' }}
                      style={{ fontSize: '11px', fontWeight: '500' }}
                    >
                      {assetAllocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [formatCurrency(value), name]}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '13px',
                        fontWeight: '500',
                      }}
                      labelStyle={{
                        fontWeight: '600',
                        fontSize: '13px',
                        color: '#111827',
                      }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={10}
                      formatter={(value) => <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">暂无数据</div>
              )}
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
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200/60 dark:border-slate-800">
              <h3 className="text-base font-semibold font-mono text-gray-900 dark:text-white">收入占比</h3>
              <div className="mt-3 h-[240px]">
                {incomeExpense.income.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={incomeExpense.income}
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        dataKey="amount"
                        nameKey="category"
                        label={({ percent }) => percent * 100 > 1 ? `${(percent * 100).toFixed(2)}%` : ''}
                        labelLine={({ percent }) => percent * 100 > 1}
                      >
                        {incomeExpense.income.map((_, idx) => (
                          <Cell key={`cell-${idx}`} fill={['#3B82F6', '#10B981', '#F59E0B', '#06B6D4'][idx % 4]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [formatCurrency(value), name]}
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '13px',
                          fontWeight: '500',
                        }}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={10}
                        formatter={(value) => <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">暂无数据</div>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {incomeExpense.income.map((item, idx) => (
                  <div key={item.category} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#06B6D4'][idx % 4] }}
                    />
                    <span className="text-gray-500 dark:text-gray-400 truncate">{item.category}</span>
                    <span className="ml-auto text-gray-700 dark:text-gray-300 font-mono tabular-nums font-medium">
                      {item.percent.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200/60 dark:border-slate-800">
              <h3 className="text-base font-semibold font-mono text-gray-900 dark:text-white">支出占比</h3>
              <div className="mt-3 h-[240px]">
                {incomeExpense.expense.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={incomeExpense.expense}
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        dataKey="amount"
                        nameKey="category"
                      >
                        {incomeExpense.expense.map((_, idx) => (
                          <Cell key={`cell-${idx}`} fill={['#EC4899', '#3B82F6', '#F59E0B', '#06B6D4', '#10B981', '#8B5CF6', '#F97316', '#EF4444'][idx % 8]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [formatCurrency(value), name]}
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '13px',
                          fontWeight: '500',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">暂无数据</div>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {incomeExpense.expense.map((item, idx) => (
                  <div key={item.category} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ['#EC4899', '#3B82F6', '#F59E0B', '#06B6D4', '#10B981', '#8B5CF6', '#F97316', '#EF4444'][idx % 8] }}
                    />
                    <span className="text-gray-500 dark:text-gray-400 truncate">{item.category}</span>
                    <span className="ml-auto text-gray-700 dark:text-gray-300 font-mono tabular-nums font-medium">
                      {item.percent.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 品类盈亏排行 + 资产增长趋势 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200/60 dark:border-slate-800">
              <h3 className="text-base font-semibold font-mono text-gray-900 dark:text-white">品类盈亏排行</h3>
              <div className="mt-3 space-y-3">
                {categoryStats.map((stat, idx) => {
                  const isPositive = stat.pnl >= 0;
                  const maxPnl = Math.max(...categoryStats.map((s) => Math.abs(s.pnl)));
                  const barWidth = maxPnl > 0 ? (Math.abs(stat.pnl) / maxPnl) * 100 : 0;
                  return (
                    <div key={stat.category}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-900 dark:text-white">{stat.category}</span>
                        <span className={`font-mono tabular-nums font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
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

            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200/60 dark:border-slate-800">
              <h3 className="text-base font-semibold font-mono text-gray-900 dark:text-white">资产增长趋势</h3>
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
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05" />
                          </linearGradient>
                        </defs>
                        <path d={areaData} fill="url(#areaGradient)" />
                        <path d={pathData} fill="none" stroke="#3B82F6" strokeWidth="2" />
                        {values.length > 1 && range > 0 && values.map((v, i) => {
                          const x = (i / (values.length - 1)) * 280 + 10;
                          const y = 110 - ((v - minVal) / range) * 90;
                          return <circle key={i} cx={x} cy={y} r="3" fill="#3B82F6" />;
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
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200/60 dark:border-slate-800">
            <h3 className="text-base font-semibold font-mono text-gray-900 dark:text-white">年均资产变化</h3>
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
                            <rect x={x} y={y} width={barWidth} height={barHeight} fill="#3B82F6" rx="4" />
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
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200/60 dark:border-slate-800">
          <h3 className="text-base font-semibold font-mono text-gray-900 dark:text-white mb-3">数据来源与计算公式</h3>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">总资产：</span>
                所有持仓资产的市值之和，数据源为资产列表中各资产的 rmbValue 字段
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">总盈亏：</span>
                总资产 - 总成本，公式 = Σ(rmbValue) - Σ(costValue)
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
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
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl">
              <h3 className="text-lg font-semibold font-mono text-gray-900 dark:text-white mb-4">编辑进度目标</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    本年目标收益额 (¥)
                  </label>
                  <input
                    type="number"
                    value={editGoalsForm.yearlyGoal}
                    onChange={(e) => setEditGoalsForm({ ...editGoalsForm, yearlyGoal: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowEditGoalsModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveGoals}
                  disabled={savingGoals}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {savingGoals ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 编辑年份记录弹窗 */}
        {showEditYearlyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl">
              <h3 className="text-lg font-semibold font-mono text-gray-900 dark:text-white mb-4">
                {editingYearIndex >= 0 ? '编辑年份记录' : '新增年份记录'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">年份</label>
                  <input
                    type="number"
                    value={editYearlyForm.year || ''}
                    onChange={(e) => setEditYearlyForm({ ...editYearlyForm, year: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">期初资产 (¥)</label>
                  <input
                    type="number"
                    value={editYearlyForm.openingAsset === 0 ? '' : editYearlyForm.openingAsset}
                    onChange={(e) => setEditYearlyForm({ ...editYearlyForm, openingAsset: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">期末资产 (¥)</label>
                  <input
                    type="number"
                    value={editYearlyForm.closingAsset === 0 ? '' : editYearlyForm.closingAsset}
                    onChange={(e) => setEditYearlyForm({ ...editYearlyForm, closingAsset: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">目标收益额 (¥)</label>
                  <input
                    type="number"
                    value={editYearlyForm.targetProfit === 0 ? '' : editYearlyForm.targetProfit}
                    onChange={(e) => setEditYearlyForm({ ...editYearlyForm, targetProfit: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowEditYearlyModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={async () => {
                    try {
                      const newRecord = {
                        year: Number(editYearlyForm.year),
                        openingAsset: Number(editYearlyForm.openingAsset),
                        closingAsset: Number(editYearlyForm.closingAsset),
                        targetProfit: Number(editYearlyForm.targetProfit),
                      };
                      let updated = [...(stateData?.yearlyRecords || [])];
                      const existsIndex = updated.findIndex(r => r.year === newRecord.year);
                      if (existsIndex >= 0) {
                        updated[existsIndex] = newRecord;
                      } else {
                        updated.push(newRecord);
                      }
                      // 年份唯一：同一年份已覆盖
                      // 级联更新：按年份排序后，每一年期初=上一年期末
                      updated = updated.sort((a, b) => a.year - b.year).map((r, idx, arr) => {
                        if (idx === 0) return r;
                        return { ...r, openingAsset: parseFloat(arr[idx - 1].closingAsset) || 0 };
                      });
                      await saveState({ ...stateData, yearlyRecords: updated });
                      setStateData(prev => ({ ...prev, yearlyRecords: updated }));
                      setShowEditYearlyModal(false);
                    } catch (err) {
                      console.error('保存年份记录失败:', err);
                      alert('保存失败，请重试');
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
