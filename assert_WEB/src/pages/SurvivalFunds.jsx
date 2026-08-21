import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, X, Wallet, DollarSign, TrendingUp, Percent, PiggyBank, ChevronDown, ChevronUp, Settings, Bookmark } from 'lucide-react';
import { fetchState, saveState, invalidateStateCache } from '../api/index.js';
import { convertAmount, DEFAULT_EXCHANGE_RATES } from '../utils/currency.js';

const CURRENCY_OPTIONS = ['CNY', 'USD', 'HKD', 'JPY', 'EUR'];

const CURRENCY_SYMBOLS = {
  CNY: '¥',
  USD: '$',
  HKD: 'HK$',
  JPY: '¥',
  EUR: '€',
};

const SURVIVAL_FUND_TYPES = ['应急储备', '日常开支', '长期储备', '投资本金'];

// 资金记录类型
const FUND_RECORD_TYPES = ['工资', '理财', '兼职', '奖金', '投资收益', '转账', '其他收入', '支出', '其他支出'];

const DEFAULT_FREEDOM_CATEGORIES = {
  necessary: ['住房', '基础生活', '水电燃气', '交通', '医疗', '教育'],
  unnecessary: ['旅行', '娱乐', '购物', '餐饮', '运动健身', '其他'],
  extra: ['保险', '投资', '人情', '维修', '其他'],
};

const CATEGORY_TYPES = [
  { value: 'necessary', label: '必要消费' },
  { value: 'unnecessary', label: '非必要消费' },
  { value: 'extra', label: '额外消费' },
];

const PERIOD_OPTIONS = [
  { value: 'daily', label: '日' },
  { value: 'weekly', label: '周' },
  { value: 'monthly', label: '月' },
  { value: 'yearly', label: '年' },
];

function convertCurrency(amount, from, to, rates) {
  if (!from || !to) return amount || 0;
  if (from === to) return amount || 0;
  const ratesObj = rates && Object.keys(rates).length > 0 ? rates : DEFAULT_EXCHANGE_RATES;
  return convertAmount(parseFloat(amount) || 0, from, to, ratesObj);
}

function formatCurrency(value, currency = 'CNY') {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const symbol = CURRENCY_SYMBOLS[currency] || '¥';
  const formatted = new Intl.NumberFormat('zh-CN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(parseFloat(value) || 0);
  return `${symbol}${formatted}`;
}

function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseFloat(value) || 0);
}

// 拆分一级/二级分类，兼容新旧数据格式
// 返回 { primaryLabel, secondaryName, primaryValue, primary, secondary }
function splitCategory(category, categoryType) {
  let primaryValue = categoryType || '';
  let secondaryName = '';
  if (categoryType && category && !category.includes('-')) {
    secondaryName = category;
  } else if (category && category.includes('-')) {
    const [first, ...rest] = category.split('-');
    const matchPrefix = (s) => {
      if (s === 'necessary') return 'necessary';
      if (s === 'unnecessary') return 'unnecessary';
      if (s === 'extra') return 'extra';
      if (s === '必要消费') return 'necessary';
      if (s === '非必要消费') return 'unnecessary';
      if (s === '额外消费') return 'extra';
      return null;
    };
    let p = matchPrefix(first);
    let idx = 0;
    let lastP = p;
    while (p && idx < rest.length) {
      lastP = p;
      const nextP = matchPrefix(rest[idx]);
      if (nextP) { idx++; p = nextP; } else break;
    }
    if (lastP) {
      primaryValue = lastP;
      secondaryName = rest.slice(idx).join('-');
    } else {
      secondaryName = category;
    }
  } else {
    secondaryName = category || '';
  }
  const label = CATEGORY_TYPES.find(t => t.value === primaryValue)?.label;
  return {
    primaryValue,
    primaryLabel: label || '',
    secondaryName,
    primary: label || (primaryValue ? primaryValue : ''),
    secondary: secondaryName,
  };
}

function formatCategoryDisplay(category, categoryType) {
  if (!category) return '—';
  const { primary, secondary } = splitCategory(category, categoryType);
  if (primary && secondary) return `${primary} · ${secondary}`;
  return secondary || primary || category || '—';
}

function formatPercentage(value) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const n = parseFloat(value);
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
}

const DEFAULT_RATES = { ...DEFAULT_EXCHANGE_RATES };

// ========== 多选下拉组件 ==========
function MultiSelectDropdown({ label, options, values, onChange, placeholder = '全部' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const toggle = (val) => {
    if (values.includes(val)) {
      onChange(values.filter(v => v !== val));
    } else {
      onChange([...values, val]);
    }
  };

  const selectedLabels = options
    .filter(o => values.includes(o.value))
    .map(o => o.label);

  return (
    <div className="flex flex-col gap-1" ref={ref}>
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</span>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1 px-2 py-1 text-xs border rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white min-w-[140px] text-left ${
            open ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200 dark:border-slate-600'
          }`}
        >
          <span className="flex-1 truncate">
            {values.length === 0
              ? <span className="text-gray-400">{placeholder}</span>
              : selectedLabels.length <= 2
                ? selectedLabels.join(', ')
                : `${selectedLabels.slice(0, 2).join(', ')} +${selectedLabels.length - 2}`
            }
          </span>
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute z-50 mt-1 w-56 max-h-60 overflow-auto bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg">
            {options.length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-400">无选项</div>
            )}
            {options.map(opt => {
              const checked = values.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 ${
                    checked ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(opt.value)}
                    className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-200">{opt.label}</span>
                </label>
              );
            })}
            {values.length > 0 && (
              <div className="border-t border-gray-200 dark:border-slate-600 px-3 py-1">
                <button
                  onClick={(e) => { e.stopPropagation(); onChange([]); }}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  清空选择
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SurvivalFunds() {
  const [loading, setLoading] = useState(true);
  const [stateData, setStateData] = useState(null);
  const [survivalFunds, setSurvivalFunds] = useState([]);
  const [freedomBudgets, setFreedomBudgets] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [exchangeRates, setExchangeRates] = useState(DEFAULT_RATES);

  // 生存资金 - 合计显示币种
  const [survivalFundTotalCurrency, setSurvivalFundTotalCurrency] = useState('CNY');

  // 弹窗：生存资金
  const [showFundModal, setShowFundModal] = useState(false);
  const [editingFund, setEditingFund] = useState(null);
  const [fundForm, setFundForm] = useState({
    name: '',
    type: '应急储备',
    currency: 'CNY',
    amount: '',
    usedAmount: '',
    costBasis: '',
    accountId: '',
  });

  // 弹窗：自由现金流
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [budgetForm, setBudgetForm] = useState({
    name: '',
    category: '住房',
    categoryType: 'necessary',
    periodType: 'monthly',
    budgetAmount: '',
    currency: 'CNY',
  });

  // 自由现金流合计显示货币
  const [budgetTotalCurrency, setBudgetTotalCurrency] = useState('CNY');

  // 生存资金明细弹窗
  const [showFundDetailModal, setShowFundDetailModal] = useState(false);
  const [selectedFund, setSelectedFund] = useState(null);
  // 资金记录弹窗
  const [showFundRecordModal, setShowFundRecordModal] = useState(false);
  const [fundRecordForm, setFundRecordForm] = useState({
    type: '工资',
    amount: '',
    status: 'inflow', // inflow/outflow
    category: '',
    date: new Date().toISOString().slice(0, 10),
    note: '',
  });

  // 动态分类 (两级: necessary/unnecessary)
  const [freedomCategories, setFreedomCategories] = useState(DEFAULT_FREEDOM_CATEGORIES);
  const [categoryType, setCategoryType] = useState('necessary'); // 当前选择的一级分类
  const [showCategorySettings, setShowCategorySettings] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', type: 'necessary' });

  // 自由度显示周期
  const [freedomDisplayPeriod, setFreedomDisplayPeriod] = useState('yearly');

  // 筛选状态 (多选)
  const [filterCategoryTypes, setFilterCategoryTypes] = useState([]); // ['necessary', 'extra']
  const [filterCategories, setFilterCategories] = useState([]); // ['住房', '旅行']
  const [filterPeriod, setFilterPeriod] = useState(''); // '', 'daily', ...
  const [filterTemplates, setFilterTemplates] = useState([]); // [{id, name, categoryTypes:[], categories:[], period}]
  const [showFilterManager, setShowFilterManager] = useState(false);

  const userId = localStorage.getItem('wealth_os_user_id');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchState(userId);
      setStateData(data);
      setSurvivalFunds(data?.survivalFunds || []);
      setFreedomBudgets(data?.freedomBudgets || []);
      // 兼容旧版扁平数组格式
      let cats = data?.freedomCategories;
      if (Array.isArray(cats)) {
        const migrated = { necessary: [], unnecessary: [], extra: [] };
        cats.forEach(c => {
          if (typeof c === 'string') {
            if (c.startsWith('必要消费-')) migrated.necessary.push(c.replace('必要消费-', ''));
            else if (c.startsWith('非必要消费-')) migrated.unnecessary.push(c.replace('非必要消费-', ''));
            else if (c.startsWith('额外消费-')) migrated.extra.push(c.replace('额外消费-', ''));
            else migrated.unnecessary.push(c);
          }
        });
        cats = migrated;
      } else if (!cats || typeof cats !== 'object') {
        cats = DEFAULT_FREEDOM_CATEGORIES;
      }
      setFreedomCategories(cats);
      setFilterTemplates(data?.filterTemplates || []);
      setAccounts(data?.accounts || []);
      const rates = data?.exchangeRates && Object.keys(data.exchangeRates).length > 0
        ? data.exchangeRates
        : DEFAULT_RATES;
      setExchangeRates(rates);
    } catch (e) {
      console.error('加载生存资金数据失败:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toCNY = (value, fromCurrency) =>
    convertCurrency(value, fromCurrency, 'CNY', exchangeRates);

  // ========== 第一行：总览卡片 ==========
  const summaryData = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    survivalFunds.forEach(fund => {
      const cur = fund.currency || 'CNY';
      totalValue += toCNY(fund.amount, cur);
      const costBasis = fund.costBasis != null && fund.costBasis !== ''
        ? fund.costBasis
        : fund.amount;
      totalCost += toCNY(costBasis, cur);
    });
    const totalProfit = totalValue - totalCost;
    const totalProfitRate = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    return { totalValue, totalCost, totalProfit, totalProfitRate };
  }, [survivalFunds, exchangeRates]);

  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">总价值</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(summaryData.totalValue)}</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg shadow-orange-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-100 text-sm">总成本</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(summaryData.totalCost)}</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-5 text-white shadow-lg shadow-purple-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-sm">总收益</p>
            <p className={`text-2xl font-bold mt-1 ${summaryData.totalProfit >= 0 ? '' : 'text-red-200'}`}>
              {formatCurrency(summaryData.totalProfit)}
            </p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-sm">总收益率</p>
            <p className={`text-2xl font-bold mt-1 ${summaryData.totalProfitRate >= 0 ? '' : 'text-red-200'}`}>
              {formatPercentage(summaryData.totalProfitRate)}
            </p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <Percent className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );

  // ========== 第二行：自由度进度 + 自由现金流列表 ==========
  const freedomSummary = useMemo(() => {
    const periods = ['daily', 'weekly', 'monthly', 'yearly'];
    const result = {};
    periods.forEach(p => {
      const items = freedomBudgets.filter(b => b.periodType === p);
      const budgetAmount = items.reduce((s, b) => s + (parseFloat(b.budgetAmount) || 0), 0);
      const actualAmount = 0; // 实际金额字段已移除
      const degree = budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : 0;
      result[p] = { budgetAmount, actualAmount, degree };
    });
    return result;
  }, [freedomBudgets]);

  const getFreedomColor = (degree) => {
    if (degree >= 100) return 'text-emerald-600 dark:text-emerald-400';
    if (degree < 80) return 'text-red-600 dark:text-red-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  // 周期换算工具 (提取到顶层，供 useMemo 使用)
  const convertToPeriod = (amount, fromPeriod, toPeriod) => {
    const ratios = { daily: 1, weekly: 7, monthly: 30, yearly: 365 };
    const days = amount * (ratios[fromPeriod] || 30);
    return days / (ratios[toPeriod] || 365);
  };

  // 周期倍率：每种周期对应一年的数量
  const PERIODS_PER_YEAR = { daily: 365, weekly: 52, monthly: 12, yearly: 1 };
  // 年度天数（闰年自动处理）
  const DAYS_THIS_YEAR = (() => {
    const y = new Date().getFullYear();
    const isLeap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
    return isLeap ? 366 : 365;
  })();
  // 当前到年末的剩余天数（不含今天）
  const REMAINING_DAYS_THIS_YEAR = (() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), 11, 31);
    const diff = Math.floor((end - now) / (1000 * 60 * 60 * 24));
    return Math.max(diff, 0);
  })();

  // 生存资金总结余 (CNY 折算) — 用于自由度"实际现金"计算
  const survivalTotalCNY = useMemo(() => {
    return survivalFunds.reduce((s, f) => {
      const cur = f.currency || 'CNY';
      const amt = parseFloat(f.amount) || 0;
      const used = parseFloat(f.usedAmount) || 0;
      return s + convertCurrency(amt - used, cur, 'CNY', exchangeRates);
    }, 0);
  }, [survivalFunds, exchangeRates]);

  // 筛选后的自由现金流
  const filteredBudgets = useMemo(() => {
    return freedomBudgets.filter(b => {
      const cat = splitCategory(b.category, b.categoryType);
      // 一级分类筛选 (多选，匹配任一)
      if (filterCategoryTypes.length > 0 && !filterCategoryTypes.includes(cat.primaryValue)) {
        return false;
      }
      // 二级分类筛选 (多选，匹配任一)
      if (filterCategories.length > 0 && !filterCategories.includes(cat.secondaryName)) {
        return false;
      }
      // 周期筛选
      if (filterPeriod && b.periodType !== filterPeriod) return false;
      return true;
    });
  }, [freedomBudgets, filterCategoryTypes, filterCategories, filterPeriod]);

  // 自由度年度进度数据 (基于筛选后的数据)
  const yearProgressData = useMemo(() => {
    const byYear = {};
    filteredBudgets.forEach(b => {
      const year = new Date().getFullYear();
      if (!byYear[year]) byYear[year] = { currentBudget: 0, annualBudget: 0 };
      const period = b.periodType || 'monthly';
      const cur = b.currency || 'CNY';
      const annualAmt = convertCurrency((parseFloat(b.budgetAmount) || 0) * (PERIODS_PER_YEAR[period] || 12), cur, 'CNY', exchangeRates);
      byYear[year].annualBudget += annualAmt;
      // 当前所需预算 = 年度预算 / 当年天数 × 剩余天数
      const dailyAmt = annualAmt / DAYS_THIS_YEAR;
      byYear[year].currentBudget += dailyAmt * REMAINING_DAYS_THIS_YEAR;
    });
    if (Object.keys(byYear).length === 0) {
      const y = new Date().getFullYear();
      byYear[y] = { currentBudget: 0, annualBudget: 0 };
    }
    // 年度已使用 = 生存资金列表使用资金总和 (按汇率折算为 CNY)
    const annualUsedTotal = survivalFunds.reduce((s, f) => {
      const cur = f.currency || 'CNY';
      const used = parseFloat(f.usedAmount) || 0;
      return s + convertCurrency(used, cur, 'CNY', exchangeRates);
    }, 0);
    return Object.entries(byYear).map(([year, data]) => ({
      year,
      currentBudget: Math.round(data.currentBudget * 100) / 100,
      annualBudget: Math.round(data.annualBudget * 100) / 100,
      annualUsed: Math.round(annualUsedTotal * 100) / 100,
      actual: Math.round(survivalTotalCNY * 100) / 100,
      freedom: data.currentBudget > 0 ? Math.round((survivalTotalCNY / data.currentBudget) * 10000) / 100 : 0,
    }));
  }, [filteredBudgets, survivalTotalCNY, survivalFunds, exchangeRates]);

  // 4 个周期卡片数据
  const periodCardsData = useMemo(() => {
    const cards = {};
    const totalAnnual = yearProgressData.reduce((s, y) => s + y.annualBudget, 0) || 0;
    const totalActual = survivalTotalCNY;

    Object.keys(PERIODS_PER_YEAR).forEach(period => {
      const divisor = PERIODS_PER_YEAR[period];
      const budgetPerPeriod = totalAnnual / divisor;
      const actualPerPeriod = totalActual / divisor;
      // 自由时间 = 实际现金 / 预算该周期自由资金
      const freeTime = budgetPerPeriod > 0 ? Math.round((totalActual / budgetPerPeriod) * 10) / 10 : 0;

      cards[period] = {
        budget: Math.round(budgetPerPeriod * 100) / 100,
        actual: Math.round(actualPerPeriod * 100) / 100,
        freeTime,
      };
    });
    return cards;
  }, [yearProgressData, survivalTotalCNY]);

  const renderFreedomSection = () => {
    const periodUnitMap = { daily: '日', weekly: '周', monthly: '月', yearly: '年' };

    // 明细表带年度预算额 (基于筛选后的数据, 按显示货币折算)
    const budgetRows = filteredBudgets.map(b => {
      const period = b.periodType || 'monthly';
      const cur = b.currency || 'CNY';
      const rawAmount = parseFloat(b.budgetAmount) || 0;
      const annual = rawAmount * (PERIODS_PER_YEAR[period] || 12);
      // 年度已使用 = 生存资金列表中已使用金额的年度折算 (取同名/同分类的生存资金)
      const matchedFund = survivalFunds.find(f =>
        f.name === b.name && f.type === (b.categoryType === 'necessary' ? '日常开支' : '日常开支')
      );
      const usedAmount = matchedFund ? (parseFloat(matchedFund.usedAmount) || 0) : 0;
      const annualUsed = usedAmount * (PERIODS_PER_YEAR[period] || 12);
      // 折算到显示货币
      const displayAmount = convertCurrency(rawAmount, cur, budgetTotalCurrency, exchangeRates);
      const displayAnnual = convertCurrency(annual, cur, budgetTotalCurrency, exchangeRates);
      const displayAnnualUsed = convertCurrency(annualUsed, cur, budgetTotalCurrency, exchangeRates);
      return { ...b, annualBudget: displayAnnual, originalAnnual: annual, displayAmount, annualUsed: displayAnnualUsed };
    });
    const budgetTotals = budgetRows.reduce((acc, b) => {
      acc.budget += b.displayAmount || 0;
      acc.annual += b.annualBudget || 0;
      acc.annualUsed += b.annualUsed || 0;
      return acc;
    }, { budget: 0, annual: 0, annualUsed: 0 });

    const cardColors = {
      daily: 'from-blue-500 to-blue-600',
      weekly: 'from-purple-500 to-purple-600',
      monthly: 'from-emerald-500 to-emerald-600',
      yearly: 'from-orange-500 to-orange-600',
    };

    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-gray-100 dark:border-slate-700 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <PiggyBank className="w-5 h-5 text-emerald-500" />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">自由度进度</h2>
        </div>

        {/* 4 个周期卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {PERIOD_OPTIONS.map(p => {
            const card = periodCardsData[p.value];
            return (
              <div key={p.value} className={`rounded-2xl p-4 bg-gradient-to-br ${cardColors[p.value]} text-white shadow-lg`}>
                <div className="text-xs opacity-90 mb-1">{p.label}自由</div>
                <div className="text-lg font-bold mb-1">
                  自由时间：{card.freeTime}{p.label}
                </div>
                <div className="text-xs opacity-80 leading-relaxed">
                  <div>预算{p.label}自由资金 = {formatNumber(card.budget)}</div>
                  <div>实际{p.label}现金 = {formatNumber(card.actual)}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 年度预算汇总表 */}
        <div className="overflow-x-auto border border-gray-100 dark:border-slate-700 rounded-2xl mb-5">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">年份</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">当前所需预算</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">年度预算额</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">年度已使用</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">实际现金</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">自由度</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {yearProgressData.map(y => (
                <tr key={y.year} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{y.year}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white tabular-nums">{formatNumber(y.currentBudget)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white tabular-nums">{formatNumber(y.annualBudget)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white tabular-nums">{formatNumber(y.annualUsed)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white tabular-nums">{formatNumber(y.actual)}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden max-w-[120px]">
                        <div
                          className={`h-full rounded-full ${y.freedom >= 100 ? 'bg-emerald-500' : y.freedom < 80 ? 'bg-red-500' : 'bg-orange-500'}`}
                          style={{ width: `${Math.min(y.freedom, 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold ${getFreedomColor(y.freedom)}`}>
                        {y.freedom.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 筛选器 (下拉多选) */}
        <div className="border border-gray-100 dark:border-slate-700 rounded-2xl p-3 mb-4 bg-gray-50 dark:bg-slate-900/50">
          <div className="flex flex-wrap items-start gap-4 mb-3">
            {/* 一级分类多选下拉 */}
            <MultiSelectDropdown
              label="分类"
              options={CATEGORY_TYPES.map(t => ({ value: t.value, label: t.label }))}
              values={filterCategoryTypes}
              onChange={(vals) => {
                setFilterCategoryTypes(vals);
                // 清理不属于选中类型的子项
                if (vals.length > 0) {
                  setFilterCategories(prev => prev.filter(c =>
                    vals.some(t => (freedomCategories[t] || []).includes(c))
                  ));
                } else {
                  setFilterCategories([]);
                }
              }}
              placeholder="全部分类"
            />
            {/* 二级分类多选下拉 */}
            {filterCategoryTypes.length > 0 && (
              <MultiSelectDropdown
                label="子项"
                options={filterCategoryTypes.flatMap(t => (freedomCategories[t] || []).map(c => ({ value: c, label: c })))
                  .filter((v, i, arr) => arr.findIndex(x => x.value === v.value) === i)}
                values={filterCategories}
                onChange={setFilterCategories}
                placeholder="全部子项"
              />
            )}
            {/* 周期单选下拉 */}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">周期</span>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white min-w-[80px]"
              >
                <option value="">全部</option>
                {PERIOD_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            {/* 操作按钮 */}
            <div className="flex items-center gap-2 ml-auto">
              {(filterCategoryTypes.length > 0 || filterCategories.length > 0 || filterPeriod) && (
                <button
                  onClick={clearFilters}
                  className="px-2 py-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
                >
                  ✕ 清除
                </button>
              )}
              <button
                onClick={saveFilterTemplate}
                className="px-2 py-1 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Bookmark className="w-3 h-3" /> 保存为模板
              </button>
            </div>
          </div>
          {/* 模板列表 */}
          {filterTemplates.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200 dark:border-slate-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">模板：</span>
              {filterTemplates.map(tpl => (
                <div key={tpl.id} className="flex items-center gap-1">
                  <button
                    onClick={() => applyFilterTemplate(tpl)}
                    className="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    title={`${(tpl.categoryTypes || []).map(t => CATEGORY_TYPES.find(x => x.value === t)?.label || t).join(',') || '全部'} / ${(tpl.categories || []).join(',') || '全部'} / ${tpl.period || '全部'}`}
                  >
                    {tpl.name}
                  </button>
                  <button
                    onClick={() => deleteFilterTemplate(tpl.id)}
                    className="p-0.5 text-gray-400 hover:text-red-500"
                    title="删除模板"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 自由现金流明细 */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">自由现金流明细</h3>
          <button
            onClick={handleAddBudget}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>新增</span>
          </button>
        </div>
        <div className="overflow-x-auto border border-gray-100 dark:border-slate-700 rounded-2xl">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">自由名称</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">一级分类</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">二级分类</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">周期</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">预算金额</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">年度预算额</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {budgetRows.map(b => {
                const cat = splitCategory(b.category, b.categoryType);
                return (
                  <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{b.name || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      {cat.primary
                        ? <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            cat.primaryValue === 'necessary' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : cat.primaryValue === 'unnecessary' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                          }`}>{cat.primary}</span>
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{cat.secondary || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {PERIOD_OPTIONS.find(p => p.value === b.periodType)?.label || b.periodType || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white tabular-nums">
                      {formatNumber(b.budgetAmount)} <span className="text-xs text-gray-500">{b.currency || 'CNY'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white tabular-nums">
                      {b.currency && b.currency !== budgetTotalCurrency
                        ? <span className="text-indigo-600 dark:text-indigo-400" title={`原 ${formatNumber(b.originalAnnual)} ${b.currency}`}>{formatNumber(b.annualBudget)} {budgetTotalCurrency}</span>
                        : <>{formatNumber(b.annualBudget)} <span className="text-xs text-gray-500">{b.currency || 'CNY'}</span></>
                      }
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEditBudget(b)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="编辑">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteBudget(b)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="删除">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {budgetRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无自由现金流数据</td>
                </tr>
              )}
              {budgetRows.length > 0 && (
                <tr className="bg-indigo-50 dark:bg-indigo-900/20 font-semibold">
                  <td className="px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300" colSpan={3}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>合计</span>
                      <select
                        value={budgetTotalCurrency}
                        onChange={(e) => setBudgetTotalCurrency(e.target.value)}
                        className="text-xs border border-indigo-200 dark:border-indigo-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      >
                        {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <span className="text-xs text-gray-400 font-normal">（按汇率折算）</span>
                    </div>
                  </td>
                  <td></td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white tabular-nums">{formatNumber(budgetTotals.budget)} <span className="text-xs text-gray-500">{budgetTotalCurrency}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white tabular-nums">{formatNumber(budgetTotals.annual)} <span className="text-xs text-gray-500">{budgetTotalCurrency}</span></td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ========== 第三行：账户本网格 ==========
  const renderAccountsSection = () => {
    // 收集生存资金用到的唯一 accountId（同时支持 id 和 name 匹配）
    const usedAccountIds = new Set();
    const usedAccountNames = new Set();
    survivalFunds.forEach(f => {
      if (f.accountId) usedAccountIds.add(String(f.accountId).trim());
      if (f.accountName) usedAccountNames.add(String(f.accountName).trim());
    });

    const filteredAccounts = accounts.filter(a => {
      if (usedAccountIds.size === 0 && usedAccountNames.size === 0) return false;
      const aId = String(a.id || '').trim();
      const aName = String(a.name || '').trim();
      return usedAccountIds.has(aId) || usedAccountIds.has(aName)
        || usedAccountNames.has(aId) || usedAccountNames.has(aName);
    });

    const accountCount = filteredAccounts.length;
    let totalBalance = 0;

    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-gray-100 dark:border-slate-700 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">📒 账户本</h2>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
              共 {accountCount} 个账户
            </span>
          </div>
        </div>

        {filteredAccounts.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无关联账户，请先创建生存资金并选择账户本</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {filteredAccounts.map(account => {
                let accountAmount = 0;
                let accountCost = 0;
                survivalFunds.forEach(fund => {
                  const fundKey = String(fund.accountId || '').trim();
                  const fundName = String(fund.accountName || '').trim();
                  const accKey = String(account.id || '').trim();
                  const accName = String(account.name || '').trim();
                  const matches = fundKey === accKey || fundKey === accName
                    || fundName === accName || fundName === accKey;
                  if (matches) {
                    const cur = fund.currency || 'CNY';
                    // 结余资金 = amount - usedAmount（若无 usedAmount 则全额计入）
                    const remaining = (parseFloat(fund.amount) || 0) - (parseFloat(fund.usedAmount) || 0);
                    accountAmount += toCNY(remaining, cur);
                    const cb = fund.costBasis != null && fund.costBasis !== '' ? fund.costBasis : fund.amount;
                    accountCost += toCNY(cb, cur);
                  }
                });
                totalBalance += accountAmount;
                const profit = accountAmount - accountCost;
                const profitRate = accountCost > 0 ? (profit / accountCost) * 100 : 0;

                return (
                  <div key={account.id || account.name} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full p-1.5">
                          <Wallet className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">{account.name}</span>
                      </div>
                      <span className="text-xs text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                        {account.category || '未分类'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div>
                        <p className="text-gray-400 mb-0.5">当前余额</p>
                        <p className="font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(accountAmount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-0.5">收益率</p>
                        <p className={`font-bold tabular-nums ${profitRate >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                          {formatPercentage(profitRate)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
              <span>账户数：<span className="font-semibold text-gray-700 dark:text-gray-200">{accountCount}</span></span>
              <span>合计余额：<span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(totalBalance)}</span></span>
            </div>
          </>
        )}
      </div>
    );
  };

  // ========== 第四行：生存资金列表 ==========
  const renderSurvivalFundTable = () => {
    const survivalTotals = survivalFunds.reduce((acc, fund) => {
      const cur = fund.currency || 'CNY';
      const amt = parseFloat(fund.amount) || 0;
      const used = parseFloat(fund.usedAmount) || 0;
      acc.amount += convertCurrency(amt, cur, survivalFundTotalCurrency, exchangeRates);
      acc.used += convertCurrency(used, cur, survivalFundTotalCurrency, exchangeRates);
      acc.remaining += convertCurrency(amt - used, cur, survivalFundTotalCurrency, exchangeRates);
      return acc;
    }, { amount: 0, used: 0, remaining: 0 });

    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">生存资金</h3>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              合计金额: <span className="font-semibold text-blue-600">{formatCurrency(survivalTotals.amount, survivalFundTotalCurrency)}</span>
              <span className="mx-2 text-gray-300">|</span>
              使用: <span className="font-semibold text-orange-500">{formatCurrency(survivalTotals.used, survivalFundTotalCurrency)}</span>
              <span className="mx-2 text-gray-300">|</span>
              结余: <span className="font-semibold text-green-600">{formatCurrency(survivalTotals.remaining, survivalFundTotalCurrency)}</span>
            </span>
            <button
              onClick={handleAddFund}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>新增</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">名称</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">类型</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">币种</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">金额</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">使用资金</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">结余资金</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">账户本</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {survivalFunds.map(fund => (
                <tr key={fund.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{fund.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{fund.type || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{fund.currency || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white tabular-nums">
                    {fund.amount != null ? formatCurrency(fund.amount, fund.currency) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white tabular-nums">
                    {fund.usedAmount != null && fund.usedAmount !== '' ? formatCurrency(fund.usedAmount, fund.currency) : '¥0.00'}
                  </td>
                  <td className={`px-4 py-3 text-sm tabular-nums font-medium ${((parseFloat(fund.amount) || 0) - (parseFloat(fund.usedAmount) || 0)) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                    {formatCurrency((parseFloat(fund.amount) || 0) - (parseFloat(fund.usedAmount) || 0), fund.currency)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {fund.accountName || accounts.find(a => (a.id || a.name) === fund.accountId)?.name || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleShowFundDetail(fund)} className="px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors" title="查看明细">
                        明细
                      </button>
                      <button onClick={() => handleEditFund(fund)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="编辑">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteFund(fund)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="删除">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {survivalFunds.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无生存资金数据</td>
                </tr>
              )}
              {survivalFunds.length > 0 && (
                <tr className="bg-indigo-50 dark:bg-indigo-900/20 font-semibold">
                  <td className="px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300" colSpan={3}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>合计</span>
                      <select
                        value={survivalFundTotalCurrency}
                        onChange={(e) => setSurvivalFundTotalCurrency(e.target.value)}
                        className="text-xs border border-indigo-200 dark:border-indigo-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      >
                        {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <span className="text-xs text-gray-400 font-normal">（按汇率折算）</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white tabular-nums">{formatCurrency(survivalTotals.amount, survivalFundTotalCurrency)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white tabular-nums">{formatCurrency(survivalTotals.used, survivalFundTotalCurrency)}</td>
                  <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400 tabular-nums">{formatCurrency(survivalTotals.remaining, survivalFundTotalCurrency)}</td>
                  <td></td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ========== 操作函数：生存资金 ==========
  const handleAddFund = () => {
    setEditingFund(null);
    const defaultAccountId = accounts.length > 0 ? (accounts[0].id || accounts[0].name) : '';
    setFundForm({
      name: '',
      type: '应急储备',
      currency: 'CNY',
      amount: '',
      usedAmount: '',
      costBasis: '',
      accountId: defaultAccountId,
    });
    setShowFundModal(true);
  };

  const handleEditFund = (fund) => {
    setEditingFund(fund);
    setFundForm({
      name: fund.name || '',
      type: fund.type || '应急储备',
      currency: fund.currency || 'CNY',
      amount: fund.amount || '',
      usedAmount: fund.usedAmount != null ? fund.usedAmount : '',
      costBasis: fund.costBasis != null ? fund.costBasis : '',
      accountId: fund.accountId || '',
    });
    setShowFundModal(true);
  };

  const handleDeleteFund = async (fund) => {
    if (!confirm('确定删除该生存资金吗？')) return;
    const newArr = survivalFunds.filter(f => f.id !== fund.id);
    const newState = { ...stateData, survivalFunds: newArr };
    const result = await saveState(newState);
    setStateData(newState);
    setSurvivalFunds(newArr);
    invalidateStateCache();
    if (result?.cached === false) {
      await loadData();
    }
  };

  const handleSaveFund = async () => {
    if (!fundForm.name || !fundForm.name.trim()) {
      alert('请输入名称');
      return;
    }
    if (fundForm.amount === '' || fundForm.amount == null) {
      alert('请输入金额');
      return;
    }
    if (!fundForm.accountId) {
      alert('请选择账户本');
      return;
    }
    const account = accounts.find(a => (a.id || a.name) === fundForm.accountId);
    const costBasis = fundForm.costBasis != null && fundForm.costBasis !== ''
      ? parseFloat(fundForm.costBasis)
      : parseFloat(fundForm.amount);
    const usedAmount = fundForm.usedAmount != null && fundForm.usedAmount !== ''
      ? parseFloat(fundForm.usedAmount)
      : 0;

    let newArr;
    if (editingFund) {
      const oldAccountId = editingFund.accountId;
      const accountChanged = fundForm.accountId !== oldAccountId;
      const oldAccountName = accounts.find(a => (a.id || a.name) === oldAccountId)?.name || '';
      const newAccountName = account?.name || '';
      const existingTransactions = editingFund.transactions || [];
      let updatedTransactions = existingTransactions;
      // 账户间转账：A->B 自动生成出账/入账记录
      if (accountChanged) {
        const transferAmount = parseFloat(editingFund.amount) || 0;
        const transferDate = new Date().toISOString().slice(0, 10);
        // 出账记录（从旧账户）
        updatedTransactions = [
          ...updatedTransactions,
          {
            id: `fr_transfer_out_${Date.now()}`,
            type: '转账',
            amount: transferAmount,
            status: 'outflow',
            date: transferDate,
            note: `转出到 ${newAccountName || '新账户'}`,
            category: 'transfer',
          },
          {
            id: `fr_transfer_in_${Date.now() + 1}`,
            type: '转账',
            amount: transferAmount,
            status: 'inflow',
            date: transferDate,
            note: `从 ${oldAccountName || '旧账户'} 转入`,
            category: 'transfer',
          },
        ];
      }
      newArr = survivalFunds.map(f => f.id === editingFund.id
        ? {
            ...f,
            name: fundForm.name.trim(),
            type: fundForm.type,
            currency: fundForm.currency,
            amount: parseFloat(fundForm.amount),
            usedAmount,
            costBasis,
            accountId: fundForm.accountId,
            accountName: account?.name || '',
            transactions: updatedTransactions,
          }
        : f
      );
    } else {
      const initialAmount = parseFloat(fundForm.amount);
      newArr = [
        ...survivalFunds,
        {
          id: `sf_${Date.now()}`,
          name: fundForm.name.trim(),
          type: fundForm.type,
          currency: fundForm.currency,
          amount: initialAmount,
          usedAmount,
          costBasis,
          accountId: fundForm.accountId,
          accountName: account?.name || '',
          initialAmount,
          transactions: initialAmount > 0 ? [{
            id: `fr_init_${Date.now()}`,
            type: '初始资金',
            amount: initialAmount,
            status: 'inflow',
            date: new Date().toISOString().slice(0, 10),
            note: '初始创建',
            category: 'init',
          }] : [],
        },
      ];
    }
    const newState = { ...stateData, survivalFunds: newArr };
    const result = await saveState(newState);
    setStateData(newState);
    setSurvivalFunds(newArr);
    invalidateStateCache();
    setShowFundModal(false);
    setEditingFund(null);
    if (result?.cached === false) {
      await loadData();
    }
  };

  // ========== 操作函数：自由现金流 ==========
  const handleAddBudget = () => {
    setEditingBudget(null);
    const type = 'necessary';
    const list = freedomCategories[type] || [];
    setCategoryType(type);
    setBudgetForm({
      name: '',
      category: list[0] || '',
      categoryType: type,
      periodType: 'monthly',
      budgetAmount: '',
      currency: 'CNY',
    });
    setShowBudgetModal(true);
  };

  const handleEditBudget = (budget) => {
    setEditingBudget(budget);
    const { primaryValue, secondaryName } = splitCategory(budget.category, budget.categoryType);
    setCategoryType(primaryValue || 'necessary');
    setBudgetForm({
      name: budget.name || '',
      category: secondaryName || '',
      categoryType: primaryValue || 'necessary',
      periodType: budget.periodType || 'monthly',
      budgetAmount: budget.budgetAmount != null ? budget.budgetAmount : '',
      currency: budget.currency || 'CNY',
    });
    setShowBudgetModal(true);
  };

  const handleDeleteBudget = async (budget) => {
    if (!confirm('确定删除该自由现金流吗？')) return;
    const newArr = freedomBudgets.filter(b => b.id !== budget.id);
    const newState = { ...stateData, freedomBudgets: newArr };
    const result = await saveState(newState);
    setStateData(newState);
    setFreedomBudgets(newArr);
    invalidateStateCache();
    if (result?.cached === false) {
      await loadData();
    }
  };

  const handleSaveBudget = async () => {
    if (!budgetForm.name || !budgetForm.name.trim()) {
      alert('请输入自由名称');
      return;
    }
    if (budgetForm.budgetAmount === '' || budgetForm.budgetAmount == null) {
      alert('请输入预算金额');
      return;
    }
    const fullCategory = budgetForm.category ? `${budgetForm.categoryType || 'necessary'}-${budgetForm.category}` : '';
    const currency = budgetForm.currency || 'CNY';
    let newArr;
    if (editingBudget) {
      newArr = freedomBudgets.map(b => b.id === editingBudget.id
        ? {
            ...b,
            name: budgetForm.name.trim(),
            category: fullCategory,
            categoryType: budgetForm.categoryType || 'necessary',
            periodType: budgetForm.periodType,
            budgetAmount: parseFloat(budgetForm.budgetAmount),
            currency,
          }
        : b
      );
    } else {
      newArr = [
        ...freedomBudgets,
        {
          id: `fb_${Date.now()}`,
          name: budgetForm.name.trim(),
          category: fullCategory,
          categoryType: budgetForm.categoryType || 'necessary',
          periodType: budgetForm.periodType,
          budgetAmount: parseFloat(budgetForm.budgetAmount),
          currency,
        },
      ];
    }
    const newState = { ...stateData, freedomBudgets: newArr };
    const result = await saveState(newState);
    setStateData(newState);
    setFreedomBudgets(newArr);
    invalidateStateCache();
    setShowBudgetModal(false);
    setEditingBudget(null);
    if (result?.cached === false) {
      await loadData();
    }
  };

  // ========== 操作函数：生存资金明细+资金记录 ==========
  const handleShowFundDetail = async (fund) => {
    setSelectedFund({ fund });
    setShowFundDetailModal(true);
  };

  const handleAddFundRecord = () => {
    setFundRecordForm({
      type: '工资',
      amount: '',
      status: 'inflow',
      category: '',
      date: new Date().toISOString().slice(0, 10),
      note: '',
    });
    setShowFundRecordModal(true);
  };

  const handleSaveFundRecord = async () => {
    if (!selectedFund?.fund) {
      alert('请先选择一个生存资金');
      return;
    }
    if (fundRecordForm.amount === '' || fundRecordForm.amount == null) {
      alert('请输入金额');
      return;
    }
    const amt = parseFloat(fundRecordForm.amount);
    const status = fundRecordForm.status;
    // 创建资金记录
    const record = {
      id: `fr_${Date.now()}`,
      type: fundRecordForm.type,
      amount: amt,
      status,
      date: fundRecordForm.date,
      note: fundRecordForm.note || '',
      category: fundRecordForm.category || '',
    };
    // 更新 survivalFunds: transactions 数组 + 同步 usedAmount 或 amount
    const fundId = selectedFund.fund.id;
    const newFunds = survivalFunds.map(f => {
      if (f.id !== fundId) return f;
      const transactions = f.transactions ? [...f.transactions, record] : [record];
      // inflow: 增加 amount (如果是新增资金类型)
      // outflow: 增加 usedAmount
      let updated = { ...f, transactions };
      if (status === 'inflow') {
        const newAmount = (parseFloat(f.amount) || 0) + amt;
        updated.amount = newAmount;
      } else {
        const newUsed = (parseFloat(f.usedAmount) || 0) + amt;
        updated.usedAmount = newUsed;
      }
      return updated;
    });
    const newState = { ...stateData, survivalFunds: newFunds };
    const result = await saveState(newState);
    setStateData(newState);
    setSurvivalFunds(newFunds);
    invalidateStateCache();
    setShowFundRecordModal(false);
    setSelectedFund({ ...selectedFund, fund: newFunds.find(f => f.id === fundId) });
    if (result?.cached === false) {
      await loadData();
    }
  };

  const handleDeleteFundRecord = async (recordId) => {
    if (!confirm('确定删除该资金记录吗？')) return;
    if (!selectedFund?.fund) return;
    const fundId = selectedFund.fund.id;
    const fund = selectedFund.fund;
    const record = fund.transactions?.find(r => r.id === recordId);
    if (!record) return;
    const amt = parseFloat(record.amount) || 0;
    const newFunds = survivalFunds.map(f => {
      if (f.id !== fundId) return f;
      const transactions = f.transactions.filter(r => r.id !== recordId);
      let updated = { ...f, transactions };
      if (record.status === 'inflow') {
        updated.amount = Math.max(0, (parseFloat(f.amount) || 0) - amt);
      } else {
        updated.usedAmount = Math.max(0, (parseFloat(f.usedAmount) || 0) - amt);
      }
      return updated;
    });
    const newState = { ...stateData, survivalFunds: newFunds };
    const result = await saveState(newState);
    setStateData(newState);
    setSurvivalFunds(newFunds);
    invalidateStateCache();
    setSelectedFund({ ...selectedFund, fund: newFunds.find(f => f.id === fundId) });
    if (result?.cached === false) {
      await loadData();
    }
  };

  // ========== 操作函数：分类管理 ==========
  const handleAddCategory = async () => {
    const name = categoryForm.name.trim();
    const type = categoryForm.type || 'necessary';
    if (!name) return;
    if (freedomCategories[type]?.includes(name)) {
      alert('该分类已存在');
      return;
    }
    const newCats = {
      ...freedomCategories,
      [type]: [...(freedomCategories[type] || []), name],
    };
    setFreedomCategories(newCats);
    const newState = { ...stateData, freedomCategories: newCats };
    const result = await saveState(newState);
    setStateData(newState);
    if (result?.cached === false) {
      await loadData();
    }
    setCategoryForm({ name: '', type: 'necessary' });
  };

  const handleDeleteCategory = async (catName, catType) => {
    if (!confirm(`确定删除分类 "${catName}" 吗？`)) return;
    const newCats = {
      ...freedomCategories,
      [catType]: (freedomCategories[catType] || []).filter(c => c !== catName),
    };
    setFreedomCategories(newCats);
    const newState = { ...stateData, freedomCategories: newCats };
    const result = await saveState(newState);
    setStateData(newState);
    if (result?.cached === false) {
      await loadData();
    }
  };

  // ========== 筛选模板管理 ==========
  const saveFilterTemplate = async () => {
    const name = prompt('请输入模板名称');
    if (!name) return;
    const template = {
      id: `tpl_${Date.now()}`,
      name,
      categoryTypes: [...filterCategoryTypes],
      categories: [...filterCategories],
      period: filterPeriod,
    };
    const newTemplates = [...filterTemplates, template];
    setFilterTemplates(newTemplates);
    const newState = { ...stateData, filterTemplates: newTemplates };
    await saveState(newState);
    setStateData(newState);
  };

  const applyFilterTemplate = (tpl) => {
    setFilterCategoryTypes(tpl.categoryTypes || []);
    setFilterCategories(tpl.categories || []);
    setFilterPeriod(tpl.period || '');
  };

  const deleteFilterTemplate = async (id) => {
    if (!confirm('确定删除该筛选模板吗？')) return;
    const newTemplates = filterTemplates.filter(t => t.id !== id);
    setFilterTemplates(newTemplates);
    const newState = { ...stateData, filterTemplates: newTemplates };
    await saveState(newState);
    setStateData(newState);
  };

  const clearFilters = () => {
    setFilterCategoryTypes([]);
    setFilterCategories([]);
    setFilterPeriod('');
  };

  // ========== 弹窗：生存资金 ==========
  // ========== 弹窗：生存资金明细 ==========
  const renderFundDetailModal = () => {
    if (!showFundDetailModal || !selectedFund) return null;
    const { fund } = selectedFund;
    if (!fund) return null;
    const cur = fund.currency || 'CNY';
    const initialAmount = parseFloat(fund.initialAmount || fund.amount) || 0;
    const transactions = fund.transactions || [];
    const currentAmount = parseFloat(fund.amount) || 0;
    const usedAmount = parseFloat(fund.usedAmount) || 0;
    const netInflow = currentAmount - initialAmount;
    const inflowTotal = transactions.filter(t => t.status === 'inflow').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const outflowTotal = transactions.filter(t => t.status === 'outflow').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              明细：{fund.name || '—'} <span className="text-sm text-gray-500 font-normal">({fund.currency || 'CNY'})</span>
            </h2>
            <button onClick={() => setShowFundDetailModal(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 space-y-5">
            {/* 资金概览 */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">现有资金</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(currentAmount, cur)}</div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">已使用资金</div>
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatCurrency(usedAmount, cur)}</div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">原始资金</div>
                <div className="text-lg font-bold text-gray-800 dark:text-gray-200">{formatCurrency(initialAmount, cur)}</div>
              </div>
              <div className={`rounded-lg p-3 text-center ${netInflow >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                <div className="text-xs text-gray-500 dark:text-gray-400">增量资金</div>
                <div className={`text-lg font-bold ${netInflow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(netInflow, cur)}
                </div>
              </div>
            </div>

            {/* 资金记录表格 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">资金记录</h3>
                <button
                  onClick={handleAddFundRecord}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  新增记录
                </button>
              </div>
              <div className="overflow-x-auto border border-gray-100 dark:border-slate-700 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">类型</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">金额</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">状态</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">日期</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">备注</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-center text-xs text-gray-500">暂无资金记录</td>
                      </tr>
                    )}
                    {transactions.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                        <td className="px-3 py-2 text-gray-900 dark:text-white">{t.type || '—'}</td>
                        <td className="px-3 py-2 tabular-nums text-gray-900 dark:text-white">{formatCurrency(t.amount, cur)}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            t.status === 'inflow'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {t.status === 'inflow' ? '入账' : '出账'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">{t.date || '—'}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">{t.note || '—'}</td>
                        <td className="px-3 py-2">
                          <button onClick={() => handleDeleteFundRecord(t.id)} className="p-1 text-gray-400 hover:text-red-500 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {transactions.length > 0 && (
                    <tfoot className="bg-gray-50 dark:bg-slate-700/50">
                      <tr className="text-xs font-semibold">
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300">合计</td>
                        <td className="px-3 py-2 text-green-600 dark:text-green-400">
                          入账 {formatCurrency(inflowTotal, cur)}
                        </td>
                        <td className="px-3 py-2 text-red-600 dark:text-red-400">
                          出账 {formatCurrency(outflowTotal, cur)}
                        </td>
                        <td colSpan={3}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ========== 弹窗：新增资金记录 ==========
  const renderFundRecordModal = () => {
    if (!showFundRecordModal) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">新增资金记录</h3>
            <button onClick={() => setShowFundRecordModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">类型</label>
              <select
                value={fundRecordForm.type}
                onChange={(e) => setFundRecordForm({ ...fundRecordForm, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {FUND_RECORD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">金额</label>
              <input
                type="number"
                value={fundRecordForm.amount}
                onChange={(e) => setFundRecordForm({ ...fundRecordForm, amount: e.target.value })}
                placeholder="请输入金额"
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">状态</label>
              <div className="flex gap-3">
                <label className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  fundRecordForm.status === 'inflow'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400'
                }`}>
                  <input
                    type="radio"
                    name="fundStatus"
                    value="inflow"
                    checked={fundRecordForm.status === 'inflow'}
                    onChange={(e) => setFundRecordForm({ ...fundRecordForm, status: 'inflow' })}
                    className="w-4 h-4"
                  />
                  入账
                </label>
                <label className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  fundRecordForm.status === 'outflow'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400'
                }`}>
                  <input
                    type="radio"
                    name="fundStatus"
                    value="outflow"
                    checked={fundRecordForm.status === 'outflow'}
                    onChange={(e) => setFundRecordForm({ ...fundRecordForm, status: 'outflow' })}
                    className="w-4 h-4"
                  />
                  出账
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">日期</label>
              <input
                type="date"
                value={fundRecordForm.date}
                onChange={(e) => setFundRecordForm({ ...fundRecordForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">备注</label>
              <input
                type="text"
                value={fundRecordForm.note}
                onChange={(e) => setFundRecordForm({ ...fundRecordForm, note: e.target.value })}
                placeholder="可选备注"
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">
            <button
              onClick={() => setShowFundRecordModal(false)}
              className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSaveFundRecord}
              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderFundModal = () => {
    if (!showFundModal) return null;
    const hasAccounts = accounts.length > 0;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{editingFund ? '编辑' : '新增'}生存资金</h2>
            <button onClick={() => setShowFundModal(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fundForm.name}
                onChange={(e) => setFundForm({ ...fundForm, name: e.target.value })}
                placeholder="请输入名称，如：6个月应急储备金"
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">类型</label>
              <select
                value={fundForm.type}
                onChange={(e) => setFundForm({ ...fundForm, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SURVIVAL_FUND_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">币种</label>
                <select
                  value={fundForm.currency}
                  onChange={(e) => setFundForm({ ...fundForm, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  金额 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={fundForm.amount}
                  onChange={(e) => setFundForm({ ...fundForm, amount: e.target.value })}
                  placeholder="请输入金额"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  使用资金 <span className="text-xs text-gray-400">(可选，已取用)</span>
                </label>
                <input
                  type="number"
                  value={fundForm.usedAmount}
                  onChange={(e) => setFundForm({ ...fundForm, usedAmount: e.target.value })}
                  placeholder="已使用金额"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <div className="w-full bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2 text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400">结余资金</div>
                  <div className={`font-bold ${(parseFloat(fundForm.amount) || 0) - (parseFloat(fundForm.usedAmount) || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                    {formatCurrency((parseFloat(fundForm.amount) || 0) - (parseFloat(fundForm.usedAmount) || 0), fundForm.currency)}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                成本单价 <span className="text-xs text-gray-400">(默认 = 金额)</span>
              </label>
              <input
                type="number"
                value={fundForm.costBasis}
                onChange={(e) => setFundForm({ ...fundForm, costBasis: e.target.value })}
                placeholder="留空则等于金额"
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                账户本 <span className="text-red-500">*</span>
              </label>
              {hasAccounts ? (
                <select
                  value={fundForm.accountId || ''}
                  onChange={(e) => {
                    const accountId = e.target.value;
                    setFundForm({ ...fundForm, accountId });
                  }}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择账户本</option>
                  {accounts
                    .filter(acc => acc.type !== '理财资产' && acc.type !== '打新' && acc.type !== '负债' && !acc.liability)
                    .map(account => (
                      <option key={account.id || account.name} value={account.id || account.name}>
                        {account.name}
                      </option>
                    ))}
                </select>
              ) : (
                <p className="text-sm text-orange-500">暂无可用账户，请先在「账户管理」中创建账户</p>
              )}
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
            <button
              onClick={() => setShowFundModal(false)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSaveFund}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ========== 弹窗：自由现金流 ==========
  const renderBudgetModal = () => {
    if (!showBudgetModal) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{editingBudget ? '编辑' : '新增'}自由现金流</h2>
            <button onClick={() => setShowBudgetModal(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                自由名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={budgetForm.name}
                onChange={(e) => setBudgetForm({ ...budgetForm, name: e.target.value })}
                placeholder="如：房租、餐饮"
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">分类</label>
                <button 
                  onClick={() => setShowCategorySettings(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Settings className="w-3 h-3" /> 设置
                </button>
              </div>
              {/* 一级分类：Radio */}
              <div className="flex gap-4 mb-2">
                {CATEGORY_TYPES.map(t => (
                  <label key={t.value} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="categoryType"
                      value={t.value}
                      checked={budgetForm.categoryType === t.value}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setCategoryType(newType);
                        const list = freedomCategories[newType] || [];
                        setBudgetForm({
                          ...budgetForm,
                          categoryType: newType,
                          category: list[0] || '',
                        });
                      }}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t.label}</span>
                  </label>
                ))}
              </div>
              {/* 二级分类：Select */}
              <select
                value={budgetForm.category}
                onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {(freedomCategories[budgetForm.categoryType] || []).map(c =>
                  <option key={c} value={c}>{c}</option>
                )}
                {(!freedomCategories[budgetForm.categoryType] || []).length === 0 && (
                  <option value="">(请先添加分类)</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">周期</label>
              <select
                value={budgetForm.periodType}
                onChange={(e) => setBudgetForm({ ...budgetForm, periodType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PERIOD_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                预算金额 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={budgetForm.budgetAmount}
                  onChange={(e) => setBudgetForm({ ...budgetForm, budgetAmount: e.target.value })}
                  placeholder="请输入预算金额"
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={budgetForm.currency}
                  onChange={(e) => setBudgetForm({ ...budgetForm, currency: e.target.value })}
                  className="px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
            <button
              onClick={() => setShowBudgetModal(false)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSaveBudget}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ========== 弹窗：分类管理 ==========
  const renderCategorySettingsModal = () => {
    if (!showCategorySettings) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">分类管理</h2>
            <button onClick={() => setShowCategorySettings(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            {/* 添加新分类：先选类型，再输入名称 */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <select
                  value={categoryForm.type}
                  onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value })}
                  className="px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORY_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  placeholder="输入新分类名称"
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  添加
                </button>
              </div>
            </div>
            {/* 分类列表：按类型分组 */}
            {CATEGORY_TYPES.map(t => (
              <div key={t.value}>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t.label}</h3>
                <div className="space-y-2">
                  {(freedomCategories[t.value] || []).map(cat => (
                    <div key={cat} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-slate-700">
                      <span className="text-sm text-gray-900 dark:text-white">{cat}</span>
                      <button
                        onClick={() => handleDeleteCategory(cat, t.value)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {(freedomCategories[t.value] || []).length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-2">暂无分类</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
          <PiggyBank className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">生存资金管理</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">管理你的应急储备、日常开支与长期储备资金</p>
        </div>
      </div>

      {renderSummaryCards()}
      {renderFreedomSection()}
      {renderAccountsSection()}
      {renderSurvivalFundTable()}

      {renderFundModal()}
      {renderBudgetModal()}
      {renderFundDetailModal()}
      {renderFundRecordModal()}
      {renderCategorySettingsModal()}
    </div>
  );
}
