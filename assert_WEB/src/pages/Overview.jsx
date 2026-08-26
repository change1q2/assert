import { useState, useEffect, useRef, useMemo } from 'react';
import { fetchState, saveState, peekCachedState, invalidateStateCache } from '../api';
import { calcCooperationFunds } from './Accounts';
import { getCache, setCache } from '../utils/cache';
import { truncateNum } from '../utils/currency';
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
  Scale,
  LayoutGrid,
  GripVertical,
  X,
  Pencil,
  Move,
} from 'lucide-react';

const ASSET_CATEGORY_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#EF4444'];

const LAYOUT_CACHE_KEY = 'overview_dashboard_layout';

const TOPSIDE_CARDS = ['total-income', 'total-expense', 'finance-total', 'independent-total', 'total-liabilities'];

function getEffectiveAccountType(account) {
  if (!account) return '资产';
  if (account.type) return account.type;
  return account.liability ? '负债' : '资产';
}

// 文本清洗：过滤 GBK↔UTF-8 转换错误导致的乱码字符
function sanitizeText(str, fallback) {
  if (typeof str !== 'string') return fallback;
  const trimmed = str.trim();
  if (!trimmed) return fallback;
  // 移除 UTF-8 替换符 \uFFFD
  let cleaned = trimmed.replace(/\uFFFD/g, '');
  // 移除常见 GBK 误读乱码块：锟斤拷、烫烫烫、虉、锘、鍦 等
  cleaned = cleaned.replace(/锟斤拷/g, '').replace(/烫+/g, '').replace(/[虉锘鍦]/g, '');
  if (!cleaned.trim()) return fallback;
  // 检测：若含大量非可打印/非常见字符，判定为乱码
  const commonCharRegex = /[\u4e00-\u9fff\u3000-\u303fa-zA-Z0-9\s.,;:!?'""''()（）【】《》\-/&%.]/;
  let commonCount = 0;
  for (const ch of cleaned) {
    if (commonCharRegex.test(ch)) commonCount++;
  }
  if (cleaned.length > 0 && commonCount / cleaned.length < 0.5) {
    return fallback;
  }
  const result = cleaned.trim();
  return result || fallback;
}

function calcIndependentAssetMv(type, item) {
  if (!item) return 0;
  if (type === 'insurance') return parseFloat(item.cashValue) || 0;
  if (type === 'realestate') {
    if (item.type === '自用') {
      const perSqm = parseFloat(item.selfUseMarketPricePerSqm) || 0;
      const area = parseFloat(item.selfUseMarketArea) || 0;
      const computed = perSqm * area;
      return computed || parseFloat(item.marketValue) || 0;
    }
    return parseFloat(item.marketValue) || 0;
  }
  if (type === 'vehicle') return parseFloat(item.residualValue) || 0;
  if (type === 'fixedinvestment') {
    const baseCost = parseFloat(item.investmentCost) || 0;
    const annual = parseFloat(item.annualContribution) || 0;
    let years = 0;
    if (item.startYear) {
      const startYear = parseInt(item.startYear, 10);
      if (!isNaN(startYear)) years = Math.max(0, new Date().getFullYear() - startYear);
    }
    return baseCost + annual * years;
  }
  if (type === 'equity') {
    const qty = parseFloat(item.quantity) || 0;
    return qty * (parseFloat(item.currentPrice) || 0);
  }
  if (type === 'fixeddeposit') return parseFloat(item.amount) || 0;
  return 0;
}

function calcFinanceAssetMv(a, accounts) {
  if (!a) return 0;
  const transactions = a.transactions || [];
  let buyTotalQty = 0, sellTotalQty = 0;
  transactions.forEach(t => {
    const qty = parseFloat(t.quantity || t.shares) || 0;
    if (t.type === '建仓' || t.type === '买入') buyTotalQty += qty;
    else if (t.type === '卖出' || t.type === '清仓') sellTotalQty += Math.abs(qty);
  });
  const _computedQty = buyTotalQty - sellTotalQty;
  const _qty = buyTotalQty > 0 ? _computedQty : (parseFloat(a.shares || a.quantity) || 0);
  const isCashCategory = a.category === '现金类' || a.categoryL1 === '现金类';
  let _cashValue = 0;
  if (isCashCategory) {
    _cashValue = parseFloat(a.currentValue) || 0;
    if (_cashValue === 0 && Array.isArray(accounts)) {
      const accId = a.accountId || a.account || '';
      const matched = accounts.find(acct => acct.id === accId || acct.name === accId);
      if (matched) _cashValue = parseFloat(matched.balance) || 0;
    }
  }
  const _effectivePrice = parseFloat(a.currentPrice) || 0;
  return isCashCategory ? _cashValue : (parseFloat(a.currentValue) || (_effectivePrice * _qty));
}

function computeAccountAmountForCooperation(account, accounts, financeAssets, independentAssets, records, debts) {
  if (!account) return 0;
  const accId = account.id;
  const accName = account.name;
  const matchesAccount = (id, name) => {
    const a = id || name || '';
    return !!a && (a === accId || a === accName);
  };
  let amount = 0;
  if (independentAssets && typeof independentAssets === 'object') {
    Object.entries(independentAssets).forEach(([type, items]) => {
      if (!Array.isArray(items)) return;
      items.forEach(item => {
        if (!matchesAccount(item.accountId, null)) return;
        amount += calcIndependentAssetMv(type, item);
      });
    });
  }
  if (Array.isArray(financeAssets)) {
    financeAssets.forEach(a => {
      if (a.status === 'archived' || a.isArchived) return;
      if (!matchesAccount(a.accountId, a.account)) return;
      amount += calcFinanceAssetMv(a, accounts);
    });
  }
  if (Array.isArray(records)) {
    records.forEach(r => {
      if (matchesAccount(r.account, null)) amount += parseFloat(r.amount) || 0;
    });
  }
  if (Array.isArray(debts) && getEffectiveAccountType(account) === '负债') {
    debts.forEach(d => {
      if (matchesAccount(d.account, null)) amount += parseFloat(d.amount) || 0;
    });
  }
  return amount;
}

const CardWrapper = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200/60 dark:border-slate-700 overflow-hidden break-words ${className}`}>
    {children}
  </div>
);

const TruncateText = ({ children, className = '', title }) => (
  <span className={`truncate ${className}`} title={title || (typeof children === 'string' ? children : '')}>{children}</span>
);

const CurrencyText = ({ value, className = '' }) => (
  <span className={`font-mono tabular-nums truncate ${className}`} title={formatCurrency(value)}>
    {formatCurrency(value)}
  </span>
);

// 全局截断文本悬浮提示组件
// 通过事件委托检测所有 .truncate 元素，当文本被截断时显示完整内容
function useTruncateTooltip() {
  const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });

  useEffect(() => {
    const handleMouseOver = (e) => {
      const el = e.target;
      if (!el || !el.classList || !el.classList.contains('truncate')) return;
      // 检测文本是否被截断
      if (el.scrollWidth > el.clientWidth + 1) {
        const rect = el.getBoundingClientRect();
        setTooltip({
          visible: true,
          text: el.textContent || el.innerText || '',
          x: rect.left + rect.width / 2,
          y: rect.top - 4,
        });
      }
    };
    const handleMouseOut = (e) => {
      const el = e.target;
      if (!el || !el.classList || !el.classList.contains('truncate')) return;
      setTooltip(prev => ({ ...prev, visible: false }));
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
    };
  }, []);

  return tooltip;
}

const OVERVIEW_CARDS = [
  { id: 'progress-goal', name: '进度目标', defaultVisible: true, defaultOrder: 0, size: 'full' },
  { id: 'total-income', name: '总收入', defaultVisible: true, defaultOrder: 1, size: 'fifth' },
  { id: 'total-expense', name: '总支出', defaultVisible: true, defaultOrder: 2, size: 'fifth' },
  { id: 'finance-total', name: '理财总资产', defaultVisible: true, defaultOrder: 3, size: 'fifth' },
  { id: 'independent-total', name: '独立总资产', defaultVisible: true, defaultOrder: 4, size: 'fifth' },
  { id: 'total-liabilities', name: '负债总资产', defaultVisible: true, defaultOrder: 5, size: 'fifth' },
  { id: 'profit-pnl', name: '收益与盈亏', defaultVisible: true, defaultOrder: 6, size: 'full' },
  { id: 'finance-allocation', name: '理财资产配置', defaultVisible: true, defaultOrder: 7, size: 'third' },
  { id: 'independent-allocation', name: '独立资产配置', defaultVisible: true, defaultOrder: 8, size: 'third' },
  { id: 'comprehensive-allocation', name: '综合资产配置', defaultVisible: true, defaultOrder: 9, size: 'third' },
  { id: 'inflow-breakdown', name: '流入构成', defaultVisible: true, defaultOrder: 10, size: 'half' },
  { id: 'outflow-breakdown', name: '流出构成', defaultVisible: true, defaultOrder: 11, size: 'half' },
  { id: 'pnl-ranking', name: '品类盈亏排行', defaultVisible: true, defaultOrder: 12, size: 'half' },
  { id: 'asset-growth', name: '月均资产增长趋势', defaultVisible: true, defaultOrder: 13, size: 'half' },
  { id: 'yearly-change', name: '年均资产变化', defaultVisible: true, defaultOrder: 14, size: 'full' },
];

function formatCurrency(value) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(truncateNum(value, 3));
}

function formatPercentage(value) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export default function Overview() {
  // SWR: 同步预填缓存，避免闪烁；仅首次无缓存时显示loading
  const initialCache = peekCachedState() || null;
  const [stateData, setStateData] = useState(initialCache);
  const [excludeCooperationFunds, setExcludeCooperationFunds] = useState(() => {
    try { return localStorage.getItem('overview_exclude_cooperation') === '1'; } catch (_) { return false; }
  });
  const [assets, setAssets] = useState(() => {
    if (initialCache?.accounts) {
      const nonLiabilityAccounts = initialCache.accounts.filter(a => !a.liability);
      return initialCache.assets || nonLiabilityAccounts.map(a => ({
        id: a.id,
        name: a.name,
        category: a.category || '其他',
        rmbValue: a.balance || 0,
        costValue: a.balance || 0,
      }));
    }
    return [];
  });
  const [loading, setLoading] = useState(() => !initialCache);
  const [timePeriod, setTimePeriod] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState('current');
  const [expandedSections, setExpandedSections] = useState({
    assets: false,
    liabilities: false,
  });
  const truncateTooltip = useTruncateTooltip();
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

  const { debts = [], records = [], accounts = [], overviewGoals = {}, financeAssets = [], independentAssets = {}, budgets = [], survivalFunds = [], freedomBudgets = [] } = stateData || {};

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const hasExistingData = !!stateData;
    // SWR: 有数据时不显示loading，后台静默更新
    if (!hasExistingData) setLoading(true);
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
        const category = sanitizeText(record.category, '其他收入');
        incomeMap[category] = (incomeMap[category] || 0) + amount;
      } else if (record.type === 'expense') {
        totalExpense += amount;
        const category = sanitizeText(record.category, '其他支出');
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
    const _price = parseFloat(a.currentPrice);
    const _costPrice = parseFloat(a.costPrice);
    const _cost = parseFloat(a.cost);
    const safePrice = !isNaN(_price) ? _price : (!isNaN(_costPrice) ? _costPrice : (!isNaN(_cost) ? _cost : 0));
    const _qty = parseFloat(a.shares);
    const _qty2 = parseFloat(a.quantity);
    const safeQty = !isNaN(_qty) ? _qty : (!isNaN(_qty2) ? _qty2 : 0);
    const value = safePrice * safeQty;
    if (isNaN(value)) return sum;
    const currency = a.currency || 'CNY';
    const fromRate = exchangeRates[currency] ?? 1;
    const toRate = exchangeRates['CNY'] ?? 1;
    const rmbValue = currency === 'CNY' ? value : (value * fromRate) / toRate;
    return sum + (isNaN(rmbValue) ? 0 : rmbValue);
  }, 0);

  // 计算理财总成本和总盈亏
  const financeTotalCost = (financeAssets || []).reduce((sum, a) => {
    const _cost = parseFloat(a.cost);
    const _costPrice = parseFloat(a.costPrice);
    const safeCost = !isNaN(_cost) ? _cost : (!isNaN(_costPrice) ? _costPrice : 0);
    const _qty = parseFloat(a.shares);
    const _qty2 = parseFloat(a.quantity);
    const safeQty = !isNaN(_qty) ? _qty : (!isNaN(_qty2) ? _qty2 : 0);
    const cost = safeCost * safeQty;
    if (isNaN(cost)) return sum;
    const currency = a.currency || 'CNY';
    const fromRate = exchangeRates[currency] ?? 1;
    const toRate = exchangeRates['CNY'] ?? 1;
    const rmbCost = currency === 'CNY' ? cost : (cost * fromRate) / toRate;
    return sum + (isNaN(rmbCost) ? 0 : rmbCost);
  }, 0);
  const financeTotalPnl = financeTotalValue - financeTotalCost;
  const financeTotalPnlRate = financeTotalCost > 0 ? (financeTotalPnl / financeTotalCost) * 100 : 0;

  // 计算独立总资产（与 IndependentAssets.jsx 保持一致）
  let independentTotalValue = 0;
  Object.keys(independentAssets || {}).forEach(type => {
    const items = independentAssets[type] || [];
    items.forEach(item => {
      if (type === 'insurance') {
        if (item.insuranceType === '年金险') {
          const records = item.transactionRecords || [];
          const sortedByYear = [...records].sort((a, b) => (parseInt(a.year) || 0) - (parseInt(b.year) || 0));
          const latestRecord = sortedByYear.length > 0 ? sortedByYear[sortedByYear.length - 1] : null;
          const cashValue = latestRecord ? parseFloat(latestRecord.yearEndCashValue || 0) : parseFloat(item.cashValue || 0);
          const totalDividend = records.reduce((sum, r) => sum + parseFloat(r.annualActualDividend || 0), 0);
          independentTotalValue += cashValue + totalDividend;
        } else {
          const records = item.transactionRecords || [];
          const cashValue = parseFloat(item.cashValue || 0);
          const totalDividend = records.reduce((sum, r) => sum + parseFloat(r.actualProfitAmount || 0), 0);
          independentTotalValue += cashValue + totalDividend;
        }
      } else if (type === 'realestate') {
        if (item.usage === '出租') {
          independentTotalValue += parseFloat(item.purchasePrice || 0);
        } else {
          const marketValue = parseFloat(item.marketValue || 0);
          const taxAmount = parseFloat(item.taxAmount || 0);
          const agencyFee = parseFloat(item.agencyFeeAmount || 0);
          const actualValue = marketValue > 0 ? (marketValue - taxAmount - agencyFee) : parseFloat(item.purchasePrice || 0);
          independentTotalValue += actualValue;
        }
      } else if (type === 'vehicle') {
        const purchasePrice = parseFloat(item.purchasePrice || 0);
        const purchaseDate = item.purchaseDate ? new Date(item.purchaseDate) : null;
        const years = purchaseDate ? (new Date() - purchaseDate) / (1000 * 60 * 60 * 24 * 365) : 0;
        const residualRate = Math.max(0, 1 - years * 0.1);
        independentTotalValue += purchasePrice * residualRate;
      } else if (type === 'fixedinvestment') {
        independentTotalValue += parseFloat(item.investmentCost || 0);
      } else if (type === 'equity') {
        independentTotalValue += parseFloat(item.marketValue || item.investmentCost || 0);
      } else if (type === 'fixeddeposit') {
        independentTotalValue += parseFloat(item.amount || 0);
      }
    });
  });

  // 计算独立资产总成本和总盈亏
  let independentTotalCost = 0;
  Object.keys(independentAssets || {}).forEach(type => {
    const items = independentAssets[type] || [];
    items.forEach(item => {
      if (type === 'insurance') {
        independentTotalCost += parseFloat(item.paidAmount || item.premiumTotal || 0);
      } else if (type === 'realestate') {
        independentTotalCost += parseFloat(item.purchasePrice || 0);
      } else if (type === 'vehicle') {
        independentTotalCost += parseFloat(item.purchasePrice || 0);
      } else if (type === 'fixedinvestment') {
        independentTotalCost += parseFloat(item.investmentCost || 0);
      } else if (type === 'equity') {
        independentTotalCost += parseFloat(item.investmentCost || 0);
      } else if (type === 'fixeddeposit') {
        independentTotalCost += parseFloat(item.amount || 0);
      }
    });
  });
  const independentTotalPnl = independentTotalValue - independentTotalCost;
  const independentTotalPnlRate = independentTotalCost > 0 ? (independentTotalPnl / independentTotalCost) * 100 : 0;

  // 计算生存资金总额（与自由现金流计算逻辑一致）
  const survivalTotalValue = (survivalFunds || []).reduce((sum, fund) => {
    const meta = fund.metadata || {};
    const initialAmount = parseFloat(meta.initialAmount ?? fund.initialAmount ?? fund.amount) || 0;
    const transactions = meta.transactions ?? fund.transactions ?? [];
    const inflowSum = transactions
      .filter(t => t.status === 'inflow')
      .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const outflowSum = transactions
      .filter(t => t.status === 'outflow')
      .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const amount = initialAmount + inflowSum - outflowSum;
    if (isNaN(amount)) return sum;
    const currency = fund.currency || 'CNY';
    const fromRate = exchangeRates[currency] ?? 1;
    const toRate = exchangeRates['CNY'] ?? 1;
    const rmbValue = currency === 'CNY' ? amount : (amount * fromRate) / toRate;
    return sum + (isNaN(rmbValue) ? 0 : rmbValue);
  }, 0);

  // 资产总览 = 理财总资产 + 生存资金 + 独立总资产 - 总负债
  const netAssetValue = financeTotalValue + survivalTotalValue + independentTotalValue - liabilities.total;

  const cooperationFunds = useMemo(() => {
    return calcCooperationFunds(accounts, acc => computeAccountAmountForCooperation(acc, accounts, financeAssets, independentAssets, records, debts));
  }, [accounts, financeAssets, independentAssets, records, debts]);
  const displayNetAssetValue = excludeCooperationFunds ? netAssetValue - cooperationFunds.otherHeld : netAssetValue;

  const yearlyRecords = stateData?.yearlyRecords || [];
  const goals = computeGoals(overviewGoals, assets, yearlyRecords, netAssetValue);

  const totalValue = assets.reduce((sum, asset) => sum + asset.rmbValue, 0);
  const totalCost = assets.reduce((sum, asset) => sum + asset.costValue, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlRate = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  // 综合现金流计算
  const financePositivePnl = Math.max(financeTotalPnl, 0);
  const financeNegativePnl = Math.max(-financeTotalPnl, 0);
  const independentPositivePnl = Math.max(independentTotalPnl, 0);
  const independentNegativePnl = Math.max(-independentTotalPnl, 0);
  const totalInflow = incomeExpense.totalIncome + financePositivePnl + independentPositivePnl;
  const totalOutflow = incomeExpense.totalExpense + financeNegativePnl + independentNegativePnl - liabilities.total;
  const netCashflow = totalInflow - totalOutflow;

  // 自由现金流计算：生存资金模块中的资金结余总额
  const totalBudget = freedomBudgets.reduce((sum, b) => {
    const meta = b.metadata || {};
    const currency = meta.currency || b.currency || 'CNY';
    const amount = parseFloat(b.budgetAmount) || 0;
    if (isNaN(amount)) return sum;
    const fromRate = exchangeRates[currency] ?? 1;
    const toRate = exchangeRates['CNY'] ?? 1;
    const rmbValue = currency === 'CNY' ? amount : (amount * fromRate) / toRate;
    return sum + (isNaN(rmbValue) ? 0 : rmbValue);
  }, 0);
  const freeCashFlowCurrent = (survivalFunds || []).reduce((sum, fund) => {
    const meta = fund.metadata || {};
    const initialAmount = parseFloat(meta.initialAmount ?? fund.initialAmount ?? fund.amount) || 0;
    const transactions = meta.transactions ?? fund.transactions ?? [];
    const inflowSum = transactions
      .filter(t => t.status === 'inflow')
      .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const outflowSum = transactions
      .filter(t => t.status === 'outflow')
      .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const amount = initialAmount + inflowSum - outflowSum;
    if (isNaN(amount)) return sum;
    const currency = fund.currency || 'CNY';
    const fromRate = exchangeRates[currency] ?? 1;
    const toRate = exchangeRates['CNY'] ?? 1;
    const rmbValue = currency === 'CNY' ? amount : (amount * fromRate) / toRate;
    return sum + (isNaN(rmbValue) ? 0 : rmbValue);
  }, 0);
  const freeCashFlowExpected = totalBudget;

  // 独立资产配置计算
  const independentTypeLabels = {
    insurance: '保险',
    realestate: '房产',
    vehicle: '车辆',
    fixedinvestment: '固定投资',
    equity: '股权',
    fixeddeposit: '定期资产',
  };
  const independentTypeColors = ['#EC4899', '#06B6D4', '#F59E0B', '#8B5CF6', '#10B981', '#3B82F6'];

  const independentAllocation = [];
  Object.keys(independentAssets || {}).forEach((type, idx) => {
    const items = independentAssets[type] || [];
    let typeValue = 0;
    items.forEach(item => {
      if (type === 'insurance') {
        typeValue += parseFloat(item.premiumTotal || 0);
      } else if (type === 'realestate') {
        const marketValue = parseFloat(item.marketValue || 0);
        const taxAmount = parseFloat(item.taxAmount || 0);
        const agencyFee = parseFloat(item.agencyFee || 0);
        typeValue += marketValue > 0 ? (marketValue - taxAmount - agencyFee) : parseFloat(item.purchasePrice || 0);
      } else if (type === 'vehicle') {
        const purchasePrice = parseFloat(item.purchasePrice || 0);
        const depreciationRate = parseFloat(item.depreciationRate || 0);
        const years = parseFloat(item.ownershipYears || 0);
        typeValue += purchasePrice * Math.pow(1 - depreciationRate / 100, years);
      } else if (type === 'fixedinvestment') {
        typeValue += parseFloat(item.investmentCost || 0);
      } else if (type === 'equity') {
        typeValue += parseFloat(item.marketValue || item.investmentCost || 0);
      } else if (type === 'fixeddeposit') {
        typeValue += parseFloat(item.amount || 0);
      }
    });
    if (typeValue > 0) {
      independentAllocation.push({
        name: independentTypeLabels[type] || type,
        value: typeValue,
        color: independentTypeColors[idx % independentTypeColors.length],
      });
    }
  });
  const independentAssetAllocation = independentAllocation.sort((a, b) => b.value - a.value);

  // 综合资产配置计算
  const comprehensiveAssetAllocation = [
    { name: '理财资产', value: financeTotalValue, color: '#3B82F6' },
    { name: '独立资产', value: independentTotalValue, color: '#EC4899' },
  ].filter(d => d.value > 0);

  // 资产分类排行：基于理财资产的实际品类（category）分组计算盈亏
  const categoryGroups = (financeAssets || []).reduce((groups, asset) => {
    const category = asset.category || '其他';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(asset);
    return groups;
  }, {});

  const categoryStats = Object.entries(categoryGroups).map(([category, items]) => {
    const value = items.reduce((sum, a) => {
      const _price = parseFloat(a.currentPrice);
      const _costPrice = parseFloat(a.costPrice);
      const _cost = parseFloat(a.cost);
      const safePrice = !isNaN(_price) ? _price : (!isNaN(_costPrice) ? _costPrice : (!isNaN(_cost) ? _cost : 0));
      const _qty = parseFloat(a.shares);
      const _qty2 = parseFloat(a.quantity);
      const safeQty = !isNaN(_qty) ? _qty : (!isNaN(_qty2) ? _qty2 : 0);
      const val = safePrice * safeQty;
      if (isNaN(val)) return sum;
      const currency = a.currency || 'CNY';
      const fromRate = exchangeRates && exchangeRates[currency] ? exchangeRates[currency] : 1;
      const toRate = exchangeRates && exchangeRates['CNY'] ? exchangeRates['CNY'] : 1;
      const rate = currency === 'CNY' ? 1 : (fromRate / toRate);
      return sum + val * rate;
    }, 0);
    const cost = items.reduce((sum, a) => {
      const _cost = parseFloat(a.cost);
      const _costPrice = parseFloat(a.costPrice);
      const safeCost = !isNaN(_cost) ? _cost : (!isNaN(_costPrice) ? _costPrice : 0);
      const _qty = parseFloat(a.shares);
      const _qty2 = parseFloat(a.quantity);
      const safeQty = !isNaN(_qty) ? _qty : (!isNaN(_qty2) ? _qty2 : 0);
      const c = safeCost * safeQty;
      if (isNaN(c)) return sum;
      const currency = a.currency || 'CNY';
      const fromRate = exchangeRates && exchangeRates[currency] ? exchangeRates[currency] : 1;
      const toRate = exchangeRates && exchangeRates['CNY'] ? exchangeRates['CNY'] : 1;
      const rate = currency === 'CNY' ? 1 : (fromRate / toRate);
      return sum + c * rate;
    }, 0);
    return {
      category,
      value: isNaN(value) ? 0 : value,
      cost: isNaN(cost) ? 0 : cost,
      pnl: isNaN(value - cost) ? 0 : value - cost,
      count: items.length,
    };
  }).sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));

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
      const _price = parseFloat(asset.currentPrice);
      const _costPrice = parseFloat(asset.costPrice);
      const _cost = parseFloat(asset.cost);
      const safePrice = !isNaN(_price) ? _price : (!isNaN(_costPrice) ? _costPrice : (!isNaN(_cost) ? _cost : 0));
      const _qty = parseFloat(asset.shares);
      const _qty2 = parseFloat(asset.quantity);
      const safeQty = !isNaN(_qty) ? _qty : (!isNaN(_qty2) ? _qty2 : 0);
      const value = safePrice * safeQty;
      if (isNaN(value)) return;
      const currency = asset.currency || 'CNY';
      const fromRate = exchangeRates[currency] ?? 1;
      const toRate = exchangeRates['CNY'] ?? 1;
      const rmbValue = currency === 'CNY' ? value : (value * fromRate) / toRate;
      if (isNaN(rmbValue)) return;
      allocation[label] = (allocation[label] || 0) + rmbValue;
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

  const getDefaultLayout = () => ({
    cards: OVERVIEW_CARDS.map(c => ({ id: c.id, visible: c.defaultVisible, order: c.defaultOrder })),
  });

  const loadLayoutFromCache = () => {
    const cached = getCache(LAYOUT_CACHE_KEY);
    const defaults = getDefaultLayout();
    if (!cached || !cached.cards) return defaults;
    // 过滤掉已不存在的旧卡片，清理旧字段
    const validIds = new Set(OVERVIEW_CARDS.map(c => c.id));
    const merged = cached.cards
      .filter(c => validIds.has(c.id))
      .map(c => {
        const cleaned = { ...c };
        delete cleaned.customColSpan;
        delete cleaned.customCols;
        return cleaned;
      });
    // 补全缺失的新卡片，使用默认顺序
    const existingIds = new Set(merged.map(c => c.id));
    OVERVIEW_CARDS.forEach(card => {
      if (!existingIds.has(card.id)) {
        merged.push({ id: card.id, visible: card.defaultVisible, order: card.defaultOrder });
      }
    });
    // 按默认顺序重排（保证下次升级也能正确显示）
    const orderMap = new Map(OVERVIEW_CARDS.map((c, idx) => [c.id, c.defaultOrder]));
    merged.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999)).forEach((c, idx) => { c.order = idx; });
    return { cards: merged };
  };

  const [dashboardLayout, setDashboardLayout] = useState(() => loadLayoutFromCache());
  const [showDashboardSettings, setShowDashboardSettings] = useState(false);

  const saveLayout = (layout) => {
    setDashboardLayout(layout);
    setCache(LAYOUT_CACHE_KEY, layout);
  };

  const toggleCardVisible = (cardId) => {
    const newCards = dashboardLayout.cards.map(c =>
      c.id === cardId ? { ...c, visible: !c.visible } : c
    );
    saveLayout({ cards: newCards });
  };



  const resetLayout = () => {
    const defaults = getDefaultLayout();
    saveLayout(defaults);
  };

  const isCardVisible = (cardId) => {
    const card = dashboardLayout.cards.find(c => c.id === cardId);
    return card ? card.visible : true;
  };

  const getCardColSpan = (cardId) => {
    const meta = OVERVIEW_CARDS.find(c => c.id === cardId);
    const size = meta?.size || 'full';
    switch (size) {
      case 'full': return 'col-span-1 md:col-span-2 lg:col-span-6';
      case 'half': return 'col-span-1 md:col-span-1 lg:col-span-3';
      case 'third': return 'col-span-1 md:col-span-1 lg:col-span-2';
      case 'fifth': return 'col-span-1 md:col-span-1 lg:col-span-1';
      default: return 'col-span-1 md:col-span-2 lg:col-span-6';
    }
  };



  const renderCard = (cardId) => {
    switch (cardId) {
      case 'progress-goal':
        return (
          <CardWrapper>
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
                今年收益额 <strong className="font-semibold truncate">¥{goals.yearlyProfit.toLocaleString()}</strong>
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-blue-600">
                今年收益率 <strong className="font-semibold">{goals.yearlyProfitRate.toFixed(1)}%</strong>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg p-4" style={{ background: '#EFF6FF' }}>
                <div className="text-xs text-gray-500 mb-1">终极目标</div>
                <div className="text-sm font-semibold font-mono text-gray-900 mb-2 tabular-nums truncate">
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
                <div className="text-sm font-semibold font-mono text-gray-900 mb-2 tabular-nums truncate">
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
                      <td className="py-2.5 px-3 font-mono tabular-nums text-gray-900 dark:text-white truncate">{formatCurrency(row.openingAsset)}</td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-blue-600 dark:text-blue-400 truncate">{formatCurrency(row.closingAsset)}</td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-gray-900 dark:text-white truncate">{formatCurrency(row.targetProfit)}</td>
                      <td className={`py-2.5 px-3 font-mono tabular-nums truncate ${row.actualProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(row.actualProfit)}</td>
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
          </CardWrapper>
        );
      case 'total-income':
        return (
          <CardWrapper>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold font-mono text-gray-900 dark:text-white">总收入</h2>
              <Banknote className="w-4 h-4 text-green-500" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-600">
                {incomeExpense.income.length} 个来源
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-green-600 tabular-nums truncate">
              {formatCurrency(incomeExpense.totalIncome)}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {incomeExpense.income.slice(0, 3).map((item) => (
                <span
                  key={item.category}
                  className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600 truncate max-w-full"
                >
                  {sanitizeText(item.category, '其他收入')}
                </span>
              ))}
            </div>
          </CardWrapper>
        );
      case 'total-expense':
        return (
          <CardWrapper>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold font-mono text-gray-900 dark:text-white">总支出</h2>
              <CreditCard className="w-4 h-4 text-red-500" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                {incomeExpense.expense.length} 个类别
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-red-500 tabular-nums truncate">
              {formatCurrency(incomeExpense.totalExpense)}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {incomeExpense.expense.slice(0, 3).map((item) => (
                <span
                  key={item.category}
                  className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 truncate max-w-full"
                >
                  {item.category}
                </span>
              ))}
            </div>
          </CardWrapper>
        );
      case 'finance-total':
        return (
          <CardWrapper>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold font-mono text-gray-900 dark:text-white">理财总资产</h2>
              <PiggyBank className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
                {(financeAssets || []).length} 个持仓
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-blue-600 tabular-nums truncate">
              {formatCurrency(financeTotalValue)}
            </div>
            <div className={`mt-1 text-sm font-mono font-medium truncate ${financeTotalPnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {financeTotalPnl >= 0 ? '+' : ''}{formatCurrency(financeTotalPnl)} ({financeTotalPnl >= 0 ? '+' : ''}{financeTotalPnlRate.toFixed(2)}%)
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {Array.from(new Set((financeAssets || []).map(a => a.category).filter(Boolean))).slice(0, 3).map((cat) => (
                <span
                  key={cat}
                  className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 truncate max-w-full"
                >
                  {cat}
                </span>
              ))}
            </div>
          </CardWrapper>
        );
      case 'independent-total':
        return (
          <CardWrapper>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold font-mono text-gray-900 dark:text-white">独立总资产</h2>
              <Landmark className="w-4 h-4 text-purple-500" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-600">
                {Object.values(independentAssets || {}).reduce((sum, items) => sum + (items?.length || 0), 0)} 项资产
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-purple-600 tabular-nums truncate">
              {formatCurrency(independentTotalValue)}
            </div>
            <div className={`mt-1 text-sm font-mono font-medium truncate ${independentTotalPnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {independentTotalPnl >= 0 ? '+' : ''}{formatCurrency(independentTotalPnl)} ({independentTotalPnl >= 0 ? '+' : ''}{independentTotalPnlRate.toFixed(2)}%)
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {Object.keys(independentAssets || {}).slice(0, 3).map((type) => (
                <span
                  key={type}
                  className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-600 truncate max-w-full"
                >
                  {type === 'insurance' ? '保险' : type === 'realestate' ? '房产' : type === 'vehicle' ? '车辆' : type === 'fixedinvestment' ? '固定投资' : type === 'equity' ? '股权' : type === 'fixeddeposit' ? '定期' : type}
                </span>
              ))}
            </div>
          </CardWrapper>
        );
      case 'total-liabilities':
        return (
          <CardWrapper>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold font-mono text-gray-900 dark:text-white">负债总资产</h2>
              <Scale className="w-4 h-4 text-red-500" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 truncate">
                30天待还 {formatCurrency(liabilities.dueIn30Days)}
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-red-500 tabular-nums truncate">
              {formatCurrency(liabilities.total)}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {liabilities.items.slice(0, 3).map((item) => (
                <span
                  key={item.name}
                  className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 truncate max-w-full"
                >
                  {item.name}
                </span>
              ))}
            </div>
          </CardWrapper>
        );
      case 'profit-pnl':
        return (
          <CardWrapper>
            <h2 className="text-base font-semibold font-mono text-gray-900 dark:text-white">收益与盈亏</h2>
            <div className="grid grid-cols-4 gap-3 mt-3">
              <div className="text-center">
                <div className="text-xs text-green-600 dark:text-green-400">总流入</div>
                <div className="text-lg font-bold font-mono text-green-600 truncate">{formatCurrency(totalInflow)}</div>
                <div className="mt-2 space-y-0.5 text-xs">
                  <div className="flex justify-center gap-x-3">
                    <span className="whitespace-nowrap text-green-600 dark:text-green-400">收入流入:</span>
                    <span className="font-mono tabular-nums text-green-600 dark:text-green-400 truncate">{formatCurrency(incomeExpense.totalIncome)}</span>
                  </div>
                  <div className="flex justify-center gap-x-3">
                    <span className="whitespace-nowrap text-green-600 dark:text-green-400">理财流入:</span>
                    <span className="font-mono tabular-nums text-green-600 dark:text-green-400 truncate">{formatCurrency(financePositivePnl)}</span>
                  </div>
                  <div className="flex justify-center gap-x-3">
                    <span className="whitespace-nowrap text-green-600 dark:text-green-400">独立资产流入:</span>
                    <span className="font-mono tabular-nums text-green-600 dark:text-green-400 truncate">{formatCurrency(independentPositivePnl)}</span>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-red-500 dark:text-red-400">总流出</div>
                <div className="text-lg font-bold font-mono text-red-500 truncate">{formatCurrency(totalOutflow)}</div>
                <div className="mt-2 space-y-0.5 text-xs">
                  <div className="flex justify-center gap-x-3">
                    <span className="whitespace-nowrap text-red-500 dark:text-red-400">支出流出:</span>
                    <span className="font-mono tabular-nums text-red-500 dark:text-red-400 truncate">{formatCurrency(incomeExpense.totalExpense)}</span>
                  </div>
                  <div className="flex justify-center gap-x-3">
                    <span className="whitespace-nowrap text-red-500 dark:text-red-400">理财流出:</span>
                    <span className="font-mono tabular-nums text-red-500 dark:text-red-400 truncate">{formatCurrency(financeNegativePnl)}</span>
                  </div>
                  <div className="flex justify-center gap-x-3">
                    <span className="whitespace-nowrap text-red-500 dark:text-red-400">独立资产流出:</span>
                    <span className="font-mono tabular-nums text-red-500 dark:text-red-400 truncate">{formatCurrency(independentNegativePnl)}</span>
                  </div>
                  <div className="flex justify-center gap-x-3">
                    <span className="whitespace-nowrap text-red-500 dark:text-red-400">负债流出:</span>
                    <span className="font-mono tabular-nums text-red-500 dark:text-red-400 truncate">{formatCurrency(liabilities.total)}</span>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">综合现金流</div>
                <div className={`text-lg font-bold font-mono truncate ${netCashflow >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {netCashflow >= 0 ? '+' : ''}{formatCurrency(netCashflow)}
                </div>
                <div className="mt-2 space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex justify-center gap-x-3">
                    <span className="whitespace-nowrap text-green-600 dark:text-green-400">总流入:</span>
                    <span className="font-mono tabular-nums text-green-600 dark:text-green-400 truncate">{formatCurrency(totalInflow)}</span>
                  </div>
                  <div className="flex justify-center gap-x-3">
                    <span className="whitespace-nowrap text-red-500 dark:text-red-400">总流出:</span>
                    <span className="font-mono tabular-nums text-red-500 dark:text-red-400 truncate">{formatCurrency(totalOutflow)}</span>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-indigo-600 dark:text-indigo-400">自由现金流</div>
                <div className={`text-lg font-bold font-mono truncate ${freeCashFlowCurrent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {formatCurrency(freeCashFlowCurrent)}
                </div>
                <div className="mt-2 space-y-0.5 text-xs">
                  <div className="flex justify-center gap-x-3 pt-1 border-t border-gray-100 dark:border-gray-700">
                    <span className="whitespace-nowrap text-indigo-600 dark:text-indigo-400">预计自有现金流:</span>
                    <span className="font-mono tabular-nums text-indigo-600 dark:text-indigo-400 truncate">{formatCurrency(freeCashFlowExpected)}</span>
                  </div>
                  <div className="flex justify-center gap-x-3 pt-1 border-t border-gray-100 dark:border-gray-700">
                    <span className="whitespace-nowrap text-indigo-600 dark:text-indigo-400">自由月份:</span>
                    <span className="font-mono tabular-nums text-indigo-600 dark:text-indigo-400 truncate">{Math.floor(freeCashFlowCurrent / 36000)} 个月</span>
                  </div>
                </div>
              </div>
            </div>
          </CardWrapper>
        );
      case 'finance-allocation':
        return (
          <CardWrapper>
            <h2 className="text-base font-semibold font-mono text-gray-900 dark:text-white">理财资产配置</h2>
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
                      formatter={(value) => <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">暂无数据</div>
              )}
            </div>
          </CardWrapper>
        );
      case 'independent-allocation':
        return (
          <CardWrapper>
            <h2 className="text-base font-semibold font-mono text-gray-900 dark:text-white">独立资产配置</h2>
            <div className="mt-4 h-[260px]">
              {independentAssetAllocation.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ left: 40, right: 40, top: 10, bottom: 10 }}>
                    <Pie
                      data={independentAssetAllocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={55}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      labelLine={{ strokeWidth: 1, stroke: '#9CA3AF' }}
                      style={{ fontSize: '11px', fontWeight: '500', fill: '#374151' }}
                    >
                      {independentAssetAllocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [formatCurrency(value), name]} contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', fontWeight: '500' }} labelStyle={{ fontWeight: '600', fontSize: '13px', color: '#111827' }} />
                    <Legend iconType="circle" iconSize={10} formatter={(value) => <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">暂无数据</div>
              )}
            </div>
          </CardWrapper>
        );
      case 'comprehensive-allocation':
        return (
          <CardWrapper>
            <h2 className="text-base font-semibold font-mono text-gray-900 dark:text-white">综合资产配置</h2>
            <div className="mt-4 h-[240px]">
              {comprehensiveAssetAllocation.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={comprehensiveAssetAllocation}
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
                      {comprehensiveAssetAllocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [formatCurrency(value), name]} contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', fontWeight: '500' }} labelStyle={{ fontWeight: '600', fontSize: '13px', color: '#111827' }} />
                    <Legend iconType="circle" iconSize={10} formatter={(value) => <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">暂无数据</div>
              )}
            </div>
          </CardWrapper>
        );
      case 'inflow-breakdown':
        return (
          <CardWrapper>
            <h3 className="text-base font-semibold font-mono text-gray-900 dark:text-white">流入构成</h3>
            <div className="mt-3 h-[240px]">
              {totalInflow > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: '收入流入', value: incomeExpense.totalIncome, fill: '#3B82F6' },
                        { name: '理财流入', value: financePositivePnl, fill: '#10B981' },
                        { name: '独立资产流入', value: independentPositivePnl, fill: '#8B5CF6' },
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    >
                      {['#3B82F6', '#10B981', '#8B5CF6'].map((color, idx) => (
                        <Cell key={`cell-${idx}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [formatCurrency(value), name]} />
                    <Legend iconType="circle" iconSize={10} formatter={(value) => <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">暂无流入数据</div>
              )}
            </div>
          </CardWrapper>
        );
      case 'outflow-breakdown':
        return (
          <CardWrapper>
            <h3 className="text-base font-semibold font-mono text-gray-900 dark:text-white">流出构成</h3>
            <div className="mt-3 h-[240px]">
              {totalOutflow > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: '支出流出', value: incomeExpense.totalExpense, fill: '#F59E0B' },
                        { name: '理财流出', value: financeNegativePnl, fill: '#EF4444' },
                        { name: '独立资产流出', value: independentNegativePnl, fill: '#DC2626' },
                        { name: '负债流出', value: liabilities.total, fill: '#9CA3AF' },
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    >
                      {['#F59E0B', '#EF4444', '#DC2626', '#9CA3AF'].map((color, idx) => (
                        <Cell key={`cell-${idx}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [formatCurrency(value), name]} />
                    <Legend iconType="circle" iconSize={10} formatter={(value) => <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">暂无流出数据</div>
              )}
            </div>
          </CardWrapper>
        );
      case 'pnl-ranking':
        return (
          <CardWrapper>
            <h3 className="text-base font-semibold font-mono text-gray-900 dark:text-white">品类盈亏排行</h3>
            
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">资产类型盈亏</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-900 dark:text-white">理财盈亏</span>
                    <span className={`font-mono tabular-nums font-medium ${financeTotalPnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {financeTotalPnl >= 0 ? '+' : ''}{formatCurrency(financeTotalPnl)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-900 dark:text-white">独立资产盈亏</span>
                    <span className={`font-mono tabular-nums font-medium ${independentTotalPnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {independentTotalPnl >= 0 ? '+' : ''}{formatCurrency(independentTotalPnl)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-100 dark:border-slate-700 pt-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">资产分类排行</div>
                <div className="space-y-3">
                  {(() => {
                    if (categoryStats.length === 0) {
                      return <div className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">暂无品类盈亏数据</div>;
                    }
                    const maxPnl = Math.max(0, ...categoryStats.map((s) => Math.abs(isNaN(s.pnl) ? 0 : s.pnl)));
                    return categoryStats.map((stat) => {
                      const pnl = isNaN(stat.pnl) ? 0 : stat.pnl;
                      const cost = isNaN(stat.cost) ? 0 : stat.cost;
                      const isPositive = pnl >= 0;
                      const barWidth = maxPnl > 0 ? (Math.abs(pnl) / maxPnl) * 100 : 0;
                      const yieldRate = cost > 0 ? ((pnl / cost) * 100).toFixed(1) : 0;
                      return (
                        <div key={stat.category}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-900 dark:text-white truncate">{stat.category}</span>
                            <div className="flex items-center gap-2">
                              <span className={`font-mono tabular-nums font-medium truncate ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                                {isPositive ? '+' : ''}
                                {formatCurrency(pnl)}
                              </span>
                              <span className={`text-xs font-mono tabular-nums w-12 text-right ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                                {isPositive ? '+' : ''}{yieldRate}%
                              </span>
                            </div>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </CardWrapper>
        );
      case 'asset-growth':
        return (
          <CardWrapper>
            <h3 className="text-base font-semibold font-mono text-gray-900 dark:text-white">月均资产增长趋势</h3>
            <div className="mt-3 overflow-x-auto overflow-y-hidden">
              <div className="min-w-[500px]" style={{ width: 'max-content' }}>
                <svg viewBox="0 0 580 160" className="w-auto h-auto">
                  {(() => {
                    const now = new Date();
                    const currentYear = now.getFullYear();
                    const monthsToShow = 12;
                    const growthData = [];
                    
                    for (let i = 0; i < monthsToShow; i++) {
                      const monthDate = new Date(currentYear, i, 1);
                      const monthLabel = `${i + 1}月`;
                      const monthRecords = records.filter(r => {
                        const d = new Date(r.date);
                        return d.getFullYear() === currentYear && d.getMonth() === i;
                      });
                      const monthIncome = monthRecords.filter(r => r.type === 'income').reduce((sum, r) => sum + Math.abs(r.amount || 0), 0);
                      const monthExpense = monthRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + Math.abs(r.amount || 0), 0);
                      const monthNet = monthIncome - monthExpense;
                      growthData.push({ month: monthLabel, value: monthNet, monthNum: i });
                    }
                    
                    const values = growthData.map((d) => d.value).map(v => Number.isFinite(v) ? v : 0);
                    const maxVal = Math.max(...values, 0) * 1.15 || 1;
                    const minVal = Math.min(...values, 0) * 0.95 || 0;
                    const range = (maxVal - minVal) || 1;
                    
                    const paddingLeft = 60;
                    const paddingRight = 20;
                    const paddingTop = 20;
                    const paddingBottom = 30;
                    const chartWidth = 580 - paddingLeft - paddingRight;
                    const chartHeight = 160 - paddingTop - paddingBottom;
                    
                    const yTicks = 5;
                    
                    const points = values.map((v, i) => {
                      const x = paddingLeft + (i / (monthsToShow - 1)) * chartWidth;
                      const y = paddingTop + chartHeight - ((v - minVal) / range) * chartHeight;
                      return `${x},${y}`;
                    });
                    const pathData = `M ${points.join(' L ')}`;
                    const areaData = `M ${paddingLeft},${paddingTop + chartHeight} L ${points.join(' L ')} L ${paddingLeft + chartWidth},${paddingTop + chartHeight} Z`;
                    
                    return (
                      <>
                        <defs>
                          <linearGradient id="monthAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05" />
                          </linearGradient>
                        </defs>
                        <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={paddingTop + chartHeight} stroke="#E5E7EB" strokeWidth="1" />
                        <line x1={paddingLeft} y1={paddingTop + chartHeight} x2={paddingLeft + chartWidth} y2={paddingTop + chartHeight} stroke="#E5E7EB" strokeWidth="1" />
                        {Array.from({ length: yTicks }).map((_, idx) => {
                          const y = paddingTop + chartHeight - (idx / (yTicks - 1)) * chartHeight;
                          const val = minVal + (idx / (yTicks - 1)) * range;
                          return (
                            <g key={idx}>
                              <line x1={paddingLeft - 5} y1={y} x2={paddingLeft} y2={y} stroke="#E5E7EB" strokeWidth="1" />
                              <text x={paddingLeft - 10} y={y + 4} textAnchor="end" fontSize="9" fill="#9CA3AF">
                                {val >= 10000 ? `${(val / 10000).toFixed(0)}万` : val.toFixed(0)}
                              </text>
                            </g>
                          );
                        })}
                        <path d={areaData} fill="url(#monthAreaGradient)" />
                        <path d={pathData} fill="none" stroke="#3B82F6" strokeWidth="2" />
                        {values.map((v, i) => {
                          if (v === 0) return null;
                          const x = paddingLeft + (i / (monthsToShow - 1)) * chartWidth;
                          const y = paddingTop + chartHeight - ((v - minVal) / range) * chartHeight;
                          return (
                            <g key={i}>
                              <circle cx={x} cy={y} r="4" fill="#3B82F6" />
                              <text x={x} y={y - 8} textAnchor="middle" fontSize="9" fill={v >= 0 ? '#3B82F6' : '#EF4444'} fontWeight="500">
                                {v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v.toFixed(0)}
                              </text>
                            </g>
                          );
                        })}
                        {growthData.map((d, i) => {
                          const x = paddingLeft + (i / (monthsToShow - 1)) * chartWidth;
                          return (
                            <text key={i} x={x} y={paddingTop + chartHeight + 20} textAnchor="middle" fontSize="9" fill="#9CA3AF">
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
            
            <div className="mt-5 border-t border-gray-100 dark:border-slate-700 pt-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">年均资产增长趋势</div>
              <div className="overflow-x-auto overflow-y-hidden">
                <div className="min-w-[500px]" style={{ width: 'max-content' }}>
                  <svg viewBox="0 0 580 120" className="w-auto h-auto">
                    {(() => {
                      const yearlyRows = computeYearlyRows(stateData?.yearlyRecords, netAssetValue);
                      const yearsData = yearlyRows.map(row => ({
                        year: String(row.year),
                        value: row.closingAsset,
                      })).sort((a, b) => parseInt(a.year) - parseInt(b.year));
                      
                      if (yearsData.length === 0) {
                        return <text x="290" y="60" textAnchor="middle" fontSize="11" fill="#9CA3AF">暂无数据</text>;
                      }
                      
                      const values = yearsData.map((d) => d.value).map(v => Number.isFinite(v) ? v : 0);
                      const maxVal = Math.max(...values, 0) * 1.15 || 1;
                      const minVal = Math.min(...values, 0) * 0.95 || 0;
                      const range = (maxVal - minVal) || 1;

                      const paddingLeft = 50;
                      const paddingRight = 20;
                      const paddingTop = 15;
                      const paddingBottom = 25;
                      const chartWidth = 580 - paddingLeft - paddingRight;
                      const chartHeight = 120 - paddingTop - paddingBottom;

                      const yTicks = 4;
                      const denom = yearsData.length > 1 ? (yearsData.length - 1) : 1;

                      const points = values.map((v, i) => {
                        const x = paddingLeft + (i / denom) * chartWidth;
                        const y = paddingTop + chartHeight - ((v - minVal) / range) * chartHeight;
                        return `${x},${y}`;
                      });
                      const pathData = `M ${points.join(' L ')}`;
                      const areaData = `M ${paddingLeft},${paddingTop + chartHeight} L ${points.join(' L ')} L ${paddingLeft + chartWidth},${paddingTop + chartHeight} Z`;
                      
                      return (
                        <>
                          <defs>
                            <linearGradient id="yearAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#374151" stopOpacity="0.2" />
                              <stop offset="100%" stopColor="#374151" stopOpacity="0.05" />
                            </linearGradient>
                          </defs>
                          <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={paddingTop + chartHeight} stroke="#E5E7EB" strokeWidth="1" />
                          <line x1={paddingLeft} y1={paddingTop + chartHeight} x2={paddingLeft + chartWidth} y2={paddingTop + chartHeight} stroke="#E5E7EB" strokeWidth="1" />
                          {Array.from({ length: yTicks }).map((_, idx) => {
                            const y = paddingTop + chartHeight - (idx / (yTicks - 1)) * chartHeight;
                            const val = minVal + (idx / (yTicks - 1)) * range;
                            return (
                              <g key={idx}>
                                <line x1={paddingLeft - 5} y1={y} x2={paddingLeft} y2={y} stroke="#E5E7EB" strokeWidth="1" />
                                <text x={paddingLeft - 10} y={y + 4} textAnchor="end" fontSize="8" fill="#9CA3AF">
                                  {val >= 10000 ? `${(val / 10000).toFixed(0)}万` : val.toFixed(0)}
                                </text>
                              </g>
                            );
                          })}
                          {yearsData.length > 1 && (
                            <>
                              <path d={areaData} fill="url(#yearAreaGradient)" />
                              <path d={pathData} fill="none" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            </>
                          )}
                          {yearsData.length > 1 && values.map((v, i) => {
                            if (v === 0) return null;
                            const x = paddingLeft + (i / denom) * chartWidth;
                            const y = paddingTop + chartHeight - ((v - minVal) / range) * chartHeight;
                            return (
                              <g key={i}>
                                <circle cx={x} cy={y} r="5" fill="#1F2937" />
                                <text x={x} y={y - 8} textAnchor="middle" fontSize="8" fill="#1F2937" fontWeight="600">
                                  {v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v.toFixed(0)}
                                </text>
                              </g>
                            );
                          })}
                          {yearsData.map((d, i) => {
                            const x = paddingLeft + (i / denom) * chartWidth;
                            return (
                              <text key={i} x={x} y={paddingTop + chartHeight + 15} textAnchor="middle" fontSize="8" fill="#9CA3AF">
                                {d.year}
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
          </CardWrapper>
        );
      case 'yearly-change':
        return (
          <CardWrapper>
            <h3 className="text-base font-semibold font-mono text-gray-900 dark:text-white">年均资产变化</h3>
            <div className="mt-3 overflow-hidden">
              <svg viewBox="0 0 600 200" className="w-full h-auto">
                {(() => {
                  const yearlyRows = computeYearlyRows(stateData?.yearlyRecords, netAssetValue);
                  const years = yearlyRows.map(row => ({
                    year: String(row.year),
                    value: row.closingAsset,
                  })).sort((a, b) => parseInt(a.year) - parseInt(b.year));
                  if (years.length === 0) {
                    return (
                      <text x="300" y="100" textAnchor="middle" fontSize="12" fill="#9CA3AF">暂无数据</text>
                    );
                  }
                  const maxVal = Math.max(...years.map((d) => d.value)) * 1.1;
                  const safeMaxVal = (Number.isFinite(maxVal) && maxVal > 0) ? maxVal : 1;
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
                        const safeValue = Number.isFinite(d.value) ? d.value : 0;
                        const barHeight = (safeValue / safeMaxVal) * chartHeight;
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
                              {(safeValue / 10000).toFixed(1)}万
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>
          </CardWrapper>
        );
      default:
        return null;
    }
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
          className="relative rounded-xl p-6 sm:p-7"
          style={{
            background: 'linear-gradient(135deg, #DBEAFE 0%, #EFF6FF 100%)',
          }}
        >
          {/* 看板设置按钮 - 右上角 */}
          <button
            onClick={() => setShowDashboardSettings(true)}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all"
            title="看板设置"
          >
            <LayoutGrid className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold font-mono tracking-tight text-gray-900">资产总览</h1>
            </div>
            <div className="text-center lg:text-right">
              <div className="text-4xl sm:text-5xl font-bold font-mono text-gray-900 whitespace-nowrap tabular-nums tracking-tight">
                {formatCurrency(displayNetAssetValue)}
              </div>
              <div className="mt-1 flex items-center justify-center lg:justify-end gap-1 text-sm text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span>{excludeCooperationFunds ? '资产总览 = 理财 + 生存 + 独立 - 负债 - 合作资金' : '资产总览 = 理财 + 生存 + 独立 - 负债'}</span>
              </div>
              <label className="mt-2 flex items-center justify-center lg:justify-end gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={excludeCooperationFunds}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setExcludeCooperationFunds(v);
                    try { localStorage.setItem('overview_exclude_cooperation', v ? '1' : '0'); } catch (_) {}
                  }}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span>去除合作他人资金{cooperationFunds.multiAccountCount > 0 ? `（他人持有 ${formatCurrency(cooperationFunds.otherHeld)}）` : ''}</span>
              </label>
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

        {/* 进度目标卡片 - 整行放在资产总览下面 */}
        {dashboardLayout.cards.find(c => c.id === 'progress-goal' && c.visible) && (
          <div className="mb-4">
            {renderCard('progress-goal')}
          </div>
        )}

        {/* 顶部5个卡片 - 平均分配宽度 */}
        <div className="flex gap-4 mb-4">
          {dashboardLayout.cards
            .filter(c => c.visible && TOPSIDE_CARDS.includes(c.id))
            .sort((a, b) => a.order - b.order)
            .map(card => (
              <div key={card.id} className="flex-1">
                {renderCard(card.id)}
              </div>
            ))
          }
        </div>
        
        {/* 其他卡片 - grid 布局 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {dashboardLayout.cards
            .filter(c => c.visible && !TOPSIDE_CARDS.includes(c.id) && c.id !== 'progress-goal')
            .sort((a, b) => a.order - b.order)
            .map(card => {
              const colSpan = getCardColSpan(card.id);
              return (
                <div key={card.id} className={colSpan}>
                  {renderCard(card.id)}
                </div>
              );
            })
          }
        </div>

        {/* 数据来源说明 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200/60 dark:border-slate-800 overflow-hidden break-words">
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
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">合作资金：</span>
                多人所有账户中非默认所有者按占比占有的资金份额。勾选「去除合作他人资金」后，资产总览 = 理财 + 生存 + 独立 - 负债 - 合作资金
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

        {/* 看板设置弹窗 */}
        {showDashboardSettings && (
          <div
            className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-20"
            onClick={() => setShowDashboardSettings(false)}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-bold font-mono text-gray-900 dark:text-white">看板设置</h2>
                <button
                  onClick={() => setShowDashboardSettings(false)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">拖动调整顺序，勾选切换显示</p>

              <div className="space-y-2">
                {OVERVIEW_CARDS.map((meta) => {
                  const card = dashboardLayout.cards.find(c => c.id === meta.id);
                  if (!card) return null;
                  const isDragging = draggedCardId === card.id;
                  const isDragOver = dragOverCardId === card.id;
                  return (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggedCardId(card.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverCardId !== card.id) setDragOverCardId(card.id);
                      }}
                      onDragLeave={() => {
                        if (dragOverCardId === card.id) setDragOverCardId(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedCardId) reorderCards(draggedCardId, card.id);
                        setDraggedCardId(null);
                        setDragOverCardId(null);
                      }}
                      onDragEnd={() => {
                        setDraggedCardId(null);
                        setDragOverCardId(null);
                      }}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-move ${
                        isDragging ? 'opacity-50' : ''
                      } ${
                        isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-slate-700'
                      } ${
                        !card.visible ? 'bg-gray-50 dark:bg-slate-900/50' : 'bg-white dark:bg-slate-800'
                      }`}
                    >
                      <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className={`flex-1 text-sm font-medium ${card.visible ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                        {meta.name}
                      </span>
                      <button
                        onClick={() => toggleCardVisible(card.id)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                          card.visible ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                        role="switch"
                        aria-checked={card.visible}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            card.visible ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 flex justify-end">
                <button
                  onClick={resetLayout}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  恢复默认
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 截断文本悬浮提示 */}
      {truncateTooltip.visible && (
        <div
          className="fixed z-[9999] px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-700 text-white text-xs font-mono shadow-lg pointer-events-none whitespace-nowrap max-w-[400px] truncate"
          style={{
            left: truncateTooltip.x,
            top: truncateTooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {truncateTooltip.text}
        </div>
      )}
    </div>
  );
}
