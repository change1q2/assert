import { useState, useEffect, useMemo, useRef } from 'react';
import { fetchState, saveState } from '../api';
import {
  ArrowLeft,
  Edit2,
  X,
  Wallet,
  Target,
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  BarChart3,
  Globe,
  Lock,
  Search,
  Filter,
  Settings,
  ChevronUp,
  ChevronDown,
  Scale,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { DEFAULT_EXCHANGE_RATES } from '../utils/currency.js';

function formatCurrency(value, currency = 'CNY') {
  const num = value == null || isNaN(value) ? 0 : Number(value);
  const options = {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  };
  return new Intl.NumberFormat(currency === 'CNY' ? 'zh-CN' : 'en-US', options).format(num);
}

function formatPercentage(value) {
  const n = value == null || isNaN(value) ? 0 : Number(value);
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function formatNum(value) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

const POS_CLASS = 'text-green-600 dark:text-green-400';
const NEG_CLASS = 'text-red-500 dark:text-red-400';

function pnlClass(val) {
  const n = parseFloat(val);
  return isNaN(n) ? '' : (n >= 0 ? POS_CLASS : NEG_CLASS);
}

function pnlSign(n) {
  return n > 0 ? '+' : '';
}

function computeHoldingDays(account) {
  if (!account) return 0;
  const base = parseInt(account.holdingDaysBase ?? account.holdingDays, 10) || 0;
  const baseDate = account.holdingDaysDate;
  if (!baseDate) return base;
  const d1 = new Date(baseDate);
  d1.setHours(0, 0, 0, 0);
  const d2 = new Date();
  d2.setHours(0, 0, 0, 0);
  const days = Math.max(0, Math.floor((d2 - d1) / 86400000));
  return base + days;
}

const PRESET_COLORS = [
  '#6366F1',
  '#F59E0B',
  '#10B981',
  '#06B6D4',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
];

const CATEGORY_COLORS = {
  '权益类': '#6366F1',
  '债权类': '#10B981',
  '现金类': '#06B6D4',
  '商品类': '#F59E0B',
  '分红类': '#EC4899',
  '固收类': '#8B5CF6',
  '另类投资': '#EF4444',
};

const ASSET_TYPE_OPTIONS = ['股票', '基金', '债券', '期货', '期权', '外汇', '数字货币', '银行理财', '保险', '房产', '其他'];
const DOMESTIC_MARKET = '国内市场';
const OVERSEAS_MARKET = '海外市场';

const CURRENCIES = ['CNY', 'USD', 'EUR', 'JPY', 'GBP'];

const DEFAULT_COLUMNS = [
  { key: 'market', label: '市场', visible: true, align: 'left' },
  { key: 'currency', label: '货币', visible: true, align: 'left' },
  { key: 'assetType', label: '资产类型', visible: true, align: 'left' },
  { key: 'name', label: '资产名称', visible: true, align: 'left' },
  { key: 'code', label: '代码', visible: true, align: 'left' },
  { key: 'categoryL2', label: '二级分类', visible: false, align: 'left' },
  { key: 'categoryL3', label: '三级分类', visible: false, align: 'left' },
  { key: 'positionGroup', label: '持仓分组', visible: false, align: 'left' },
  { key: 'positionType', label: '持仓分类', visible: false, align: 'left' },
  { key: 'cost', label: '持仓成本', visible: true, align: 'right' },
  { key: 'quantity', label: '数量', visible: true, align: 'right' },
  { key: 'currentPrice', label: '现价', visible: true, align: 'right' },
  { key: 'holdingDays', label: '天数', visible: true, align: 'right' },
  { key: 'currentValue', label: '当前市值', visible: true, align: 'right', bold: true },
  { key: 'holdingPnl', label: '持仓盈亏', visible: true, align: 'right', bold: true, pnl: true },
  { key: 'holdingPnlRate', label: '持仓盈亏率', visible: true, align: 'right', pnl: true },
  { key: 'dailyPnl', label: '当日盈亏', visible: true, align: 'right', bold: true, pnl: true, indigo: true },
  { key: 'dailyPnlRate', label: '当日收益率', visible: true, align: 'right', pnl: true },
  { key: 'positionRatio', label: '仓位占比', visible: true, align: 'right' },
  { key: 'account', label: '所属账户', visible: true, align: 'left' },
];

const DEFAULT_FILTERS = [
  { key: 'market', label: '市场', visible: true },
  { key: 'currency', label: '货币', visible: false },
  { key: 'assetType', label: '资产类型', visible: true },
  { key: 'categoryL2', label: '二级分类', visible: false },
  { key: 'categoryL3', label: '三级分类', visible: false },
  { key: 'positionGroup', label: '持仓分组', visible: false },
  { key: 'positionType', label: '持仓分类', visible: false },
  { key: 'account', label: '所属账户', visible: true },
];

function normalizeMarket(market) {
  if (!market) return DOMESTIC_MARKET;
  if (market === DOMESTIC_MARKET || market === '国内市场') return DOMESTIC_MARKET;
  return OVERSEAS_MARKET;
}

function aggregateClassesFromFinance(financeAccounts, existingClasses) {
  const accounts = financeAccounts || [];
  const existing = existingClasses || [];

  const existingMap = {};
  existing.forEach((cls) => {
    existingMap[cls.name] = cls;
  });

  const categoryMap = {};
  const childrenMap = {};

  accounts.forEach((account) => {
    const categoryL1 = account.categoryL1 || account.category || '其他';
    const assetType = account.assetType || account.category || '其他';
    const market = normalizeMarket(account.market);
    const value = parseFloat(account.currentValue || account.balance || 0);
    const cost = parseFloat(account.cost || 0);

    if (!categoryMap[categoryL1]) {
      categoryMap[categoryL1] = { value: 0, cost: 0, income: 0, expense: 0 };
    }
    categoryMap[categoryL1].value += value;
    categoryMap[categoryL1].cost += cost;

    const childKey = `${assetType}__${market}`;
    if (!childrenMap[categoryL1]) {
      childrenMap[categoryL1] = {};
    }
    if (!childrenMap[categoryL1][childKey]) {
      childrenMap[categoryL1][childKey] = {
        name: assetType,
        market,
        value: 0,
        cost: 0,
        openingValue: 0,
        isAutoSync: true,
      };
    }
    childrenMap[categoryL1][childKey].value += value;
    childrenMap[categoryL1][childKey].cost += cost;
    childrenMap[categoryL1][childKey].openingValue += cost;
  });

  const result = [];
  Object.keys(categoryMap).forEach((name) => {
    const existing = existingMap[name];
    const data = categoryMap[name];
    const autoChildren = childrenMap[name]
      ? Object.values(childrenMap[name]).sort((a, b) => b.value - a.value)
      : [];

    const existingChildren = existing?.children || [];
    const customChildren = existingChildren
      .filter((c) => !c.isAutoSync)
      .map((c) => ({
        ...c,
        market: c.market || '',
        isAutoSync: false,
      }));

    const autoTotal = autoChildren.reduce((sum, c) => sum + (c.value || 0), 0);
    const customTotal = customChildren.reduce((sum, c) => sum + (c.value || 0), 0);
    const combinedValue = data.value + customTotal;
    const combinedOpening = data.cost + customChildren.reduce((sum, c) => sum + (c.openingValue || 0), 0);

    result.push({
      id: existing?.id || `finance-${name}`,
      name,
      children: [...autoChildren, ...customChildren],
      visible: existing?.visible !== false,
      value: combinedValue,
      openingValue: combinedOpening,
      targetValue: existing?.targetValue || 0,
      income: existing?.income || 0,
      expense: existing?.expense || 0,
      laborIncome: existing?.laborIncome || 0,
      color: existing?.color || CATEGORY_COLORS[name] || PRESET_COLORS[result.length % PRESET_COLORS.length],
      expectedReturn: existing?.expectedReturn || 0,
    });
  });

  const financeCategoryNames = new Set(Object.keys(categoryMap));
  existing.forEach((cls) => {
    if (!financeCategoryNames.has(cls.name)) {
      const customChildren = (cls.children || []).map((c) => ({
        ...c,
        market: c.market || '',
        isAutoSync: false,
      }));
      result.push({
        ...cls,
        children: customChildren,
      });
    }
  });

  return result;
}

function convertValue(value, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return value;
  const fromRate = DEFAULT_EXCHANGE_RATES[fromCurrency] || 1;
  const toRate = DEFAULT_EXCHANGE_RATES[toCurrency] || 1;
  if (!toRate) return value;
  return (value * fromRate) / toRate;
}

// 海内外对比饼图：国内 / 港股 / 美股 / 其他（按一级分类筛选）
function computeCategoryDomesticOverseasPie(accounts, categoryName) {
  const filtered = (accounts || []).filter(
    (a) => (a.categoryL1 || a.category) === categoryName
  );
  let domestic = 0;
  let hk = 0;
  let us = 0;
  let other = 0;

  filtered.forEach((account) => {
    const value = parseFloat(account.currentValue || account.currentPrice * account.shares || account.balance || 0);
    const market = account.market || '';

    if (!market || market === DOMESTIC_MARKET || market === '国内市场') {
      domestic += value;
    } else if (market.includes('港股')) {
      hk += value;
    } else if (market.includes('美股')) {
      us += value;
    } else {
      other += value;
    }
  });

  const total = domestic + hk + us + other;
  return [
    { name: DOMESTIC_MARKET, value: domestic, percent: total > 0 ? (domestic / total) * 100 : 0, color: '#3B82F6' },
    { name: '港股市场', value: hk, percent: total > 0 ? (hk / total) * 100 : 0, color: '#F97316' },
    { name: '美股市场', value: us, percent: total > 0 ? (us / total) * 100 : 0, color: '#EF4444' },
    { name: '其他市场', value: other, percent: total > 0 ? (other / total) * 100 : 0, color: '#8B5CF6' },
  ];
}

// ── 持仓汇总卡片 ──
function HoldingsSummaryCard({ summary }) {
  const isPos = summary.totalPnl >= 0;
  const isDayPos = summary.totalDailyPnl >= 0;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-soft border border-gray-100 dark:border-slate-700 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full p-1.5">
          <PieChartIcon className="w-4 h-4" />
        </div>
        <span className="font-semibold text-gray-900 dark:text-white text-sm">筛选汇总</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center mb-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">当前总市值</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{formatNum(summary.totalMarketValue)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">持仓总成本</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{formatNum(summary.totalCost)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">持仓总盈亏</p>
          <p className={`text-sm font-bold tabular-nums ${isPos ? 'text-green-600' : 'text-red-500'}`}>
            {pnlSign(summary.totalPnl)}{formatNum(summary.totalPnl)}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">持仓总收益率</p>
          <p className={`text-sm font-bold tabular-nums ${isPos ? 'text-green-600' : 'text-red-500'}`}>
            {formatPercentage(summary.totalPnlRate)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">当日总盈亏</p>
          <p className={`text-sm font-bold tabular-nums ${isDayPos ? 'text-green-600' : 'text-red-500'}`}>
            {pnlSign(summary.totalDailyPnl)}{formatNum(summary.totalDailyPnl)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">当日总收益率</p>
          <p className={`text-sm font-bold tabular-nums ${isDayPos ? 'text-green-600' : 'text-red-500'}`}>
            {formatPercentage(summary.totalDailyPnlRate)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── 分页子组件 ──
function Pagination({ page, totalPages, totalCount, onPageChange, pageSize, onPageSizeChange, pageSizeOptions = [10, 20, 50, 100] }) {
  if (totalPages <= 1 && !onPageSizeChange) return null;
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        共 {totalCount} 条记录
      </div>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
            className="px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white cursor-pointer"
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>{size} 条/页</option>
            ))}
          </select>
        )}
        <button
          onClick={() => onPageChange(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          上一页
        </button>
        <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
          <span>第</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={page}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) {
                onPageChange(Math.max(1, Math.min(totalPages, val)));
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) {
                  onPageChange(Math.max(1, Math.min(totalPages, val)));
                }
              }
            }}
            className="w-14 px-2 py-1.5 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
          />
          <span>/ {totalPages} 页</span>
        </div>
        <button
          onClick={() => onPageChange(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          下一页
        </button>
      </div>
    </div>
  );
}

// ── 持仓明细表格子组件（含筛选+搜索+列设置+分页），结构延用理财模块 ──
function HoldingsTable({ holdings, categoryName }) {
  const [filterText, setFilterText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      const saved = localStorage.getItem(`category_detail_page_size_${categoryName}`);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch (e) { console.error(e); }
    return 10;
  });
  const [filterAccount, setFilterAccount] = useState('');
  const [filterMarket, setFilterMarket] = useState('');
  const [filterCurrency, setFilterCurrency] = useState('');
  const [filterAssetType, setFilterAssetType] = useState('');
  const [filterCategoryL2, setFilterCategoryL2] = useState('');
  const [filterCategoryL3, setFilterCategoryL3] = useState('');
  const [filterPositionGroup, setFilterPositionGroup] = useState('');
  const [filterPositionType, setFilterPositionType] = useState('');
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showFilterSettings, setShowFilterSettings] = useState(false);
  const [columnSettingsPosition, setColumnSettingsPosition] = useState('bottom');
  const columnSettingsRef = useRef(null);
  const filterSettingsRef = useRef(null);

  const [filterSettings, setFilterSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(`category_detail_filter_settings_${categoryName}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return DEFAULT_FILTERS.map(defaultFilter => {
            const savedFilter = parsed.find(f => f.key === defaultFilter.key);
            return savedFilter ? { ...defaultFilter, visible: savedFilter.visible } : defaultFilter;
          });
        }
      }
    } catch (e) { console.error(e); }
    return DEFAULT_FILTERS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(`category_detail_filter_settings_${categoryName}`, JSON.stringify(filterSettings));
    } catch (e) { console.error(e); }
  }, [filterSettings, categoryName]);

  const [columns, setColumns] = useState(() => {
    try {
      const saved = localStorage.getItem(`category_detail_column_settings_${categoryName}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return DEFAULT_COLUMNS.map(def => {
            const savedCol = parsed.find(c => c.key === def.key);
            return savedCol || def;
          });
        }
      }
    } catch (e) { console.error(e); }
    return [...DEFAULT_COLUMNS];
  });

  useEffect(() => {
    try {
      localStorage.setItem(`category_detail_column_settings_${categoryName}`, JSON.stringify(columns));
    } catch (e) { console.error(e); }
  }, [columns, categoryName]);

  useEffect(() => {
    try {
      localStorage.setItem(`category_detail_page_size_${categoryName}`, String(pageSize));
    } catch (e) { console.error(e); }
  }, [pageSize, categoryName]);

  useEffect(() => {
    if (!showColumnSettings) return;
    const handleClickOutside = (e) => {
      if (columnSettingsRef.current && !columnSettingsRef.current.contains(e.target)) {
        setShowColumnSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColumnSettings]);

  useEffect(() => {
    if (!showFilterSettings) return;
    const handleClickOutside = (e) => {
      if (filterSettingsRef.current && !filterSettingsRef.current.contains(e.target)) {
        setShowFilterSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterSettings]);

  useEffect(() => {
    if (!showColumnSettings || !columnSettingsRef.current) return;
    const button = columnSettingsRef.current.querySelector('button');
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const panelHeight = 400;
    const bottomSpace = window.innerHeight - rect.bottom;
    setColumnSettingsPosition(bottomSpace > panelHeight ? 'bottom' : 'top');
  }, [showColumnSettings]);

  const toggleFilter = (key) => {
    setFilterSettings(prev => prev.map(f =>
      f.key === key ? { ...f, visible: !f.visible } : f
    ));
  };

  const resetFiltersSettings = () => setFilterSettings([...DEFAULT_FILTERS]);

  const visibleColumns = useMemo(() => columns.filter(c => c.visible), [columns]);

  const toggleColumn = (key) => {
    setColumns(prev => prev.map(c =>
      c.key === key ? { ...c, visible: !c.visible } : c
    ));
  };

  const moveColumn = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === columns.length - 1) return;
    const newColumns = [...columns];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newColumns[index], newColumns[targetIndex]] = [newColumns[targetIndex], newColumns[index]];
    setColumns(newColumns);
  };

  const resetColumns = () => setColumns([...DEFAULT_COLUMNS]);

  const renderCell = (h, col) => {
    const val = h[col.key];
    switch (col.key) {
      case 'market':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-slate-700 text-gray-500">{val || '-'}</span>;
      case 'currency':
        return val || '-';
      case 'assetType':
      case 'categoryL2':
      case 'categoryL3':
      case 'positionGroup':
      case 'positionType':
        return val || '-';
      case 'name':
        return <span className="font-medium text-gray-900 dark:text-white">{val || '-'}</span>;
      case 'code':
        return <span className="font-mono">{val || '-'}</span>;
      case 'cost':
      case 'quantity':
      case 'currentValue':
        return formatNum(val);
      case 'currentPrice':
        return formatNum(val);
      case 'holdingDays':
        return computeHoldingDays(h) || '-';
      case 'holdingPnl':
      case 'dailyPnl':
        return <span className={pnlClass(val)}>{pnlSign(parseFloat(val))}{formatNum(val)}</span>;
      case 'holdingPnlRate':
      case 'dailyPnlRate':
        return <span className={pnlClass(val)}>{formatPercentage(val)}</span>;
      case 'positionRatio':
        const ratio = parseFloat(val);
        return <span className="text-gray-600 dark:text-gray-400">{isNaN(ratio) ? '—' : `${ratio.toFixed(2)}%`}</span>;
      case 'account':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">{val || '-'}</span>;
      default:
        return val || '-';
    }
  };

  const uniqueAccounts = useMemo(() =>
    [...new Set(holdings.map(h => h.account).filter(Boolean))].sort(),
    [holdings]
  );
  const uniqueMarkets = useMemo(() =>
    [...new Set(holdings.map(h => h.market).filter(Boolean))].sort(),
    [holdings]
  );
  const uniqueCurrencies = useMemo(() =>
    [...new Set(holdings.map(h => h.currency).filter(Boolean))].sort(),
    [holdings]
  );
  const uniqueAssetTypes = useMemo(() =>
    [...new Set(holdings.map(h => h.assetType).filter(Boolean))].sort(),
    [holdings]
  );
  const uniqueCategoryL2 = useMemo(() =>
    [...new Set(holdings.map(h => h.categoryL2).filter(Boolean))].sort(),
    [holdings]
  );
  const uniqueCategoryL3 = useMemo(() =>
    [...new Set(holdings.map(h => h.categoryL3).filter(Boolean))].sort(),
    [holdings]
  );
  const uniquePositionGroups = useMemo(() =>
    [...new Set(holdings.map(h => h.positionGroup).filter(Boolean))].sort(),
    [holdings]
  );
  const uniquePositionTypes = useMemo(() =>
    [...new Set(holdings.map(h => h.positionType).filter(Boolean))].sort(),
    [holdings]
  );

  const filtered = useMemo(() => {
    return holdings.filter(h => {
      if (filterText.trim()) {
        const q = filterText.toLowerCase();
        const matchText =
          (h.name || '').toLowerCase().includes(q) ||
          (h.code || '').toLowerCase().includes(q) ||
          (h.assetType || '').toLowerCase().includes(q) ||
          (h.positionGroup || '').toLowerCase().includes(q);
        if (!matchText) return false;
      }
      if (filterAccount && h.account !== filterAccount) return false;
      if (filterMarket && h.market !== filterMarket) return false;
      if (filterCurrency && h.currency !== filterCurrency) return false;
      if (filterAssetType && h.assetType !== filterAssetType) return false;
      if (filterCategoryL2 && h.categoryL2 !== filterCategoryL2) return false;
      if (filterCategoryL3 && h.categoryL3 !== filterCategoryL3) return false;
      if (filterPositionGroup && h.positionGroup !== filterPositionGroup) return false;
      if (filterPositionType && h.positionType !== filterPositionType) return false;
      return true;
    });
  }, [holdings, filterText, filterAccount, filterMarket, filterCurrency, filterAssetType, filterCategoryL2, filterCategoryL3, filterPositionGroup, filterPositionType]);

  const filteredWithRatio = useMemo(() => {
    const totalValue = filtered.reduce((sum, h) => sum + (parseFloat(h.currentValue) || parseFloat(h.balance) || 0), 0);
    return filtered.map(h => ({
      ...h,
      positionRatio: totalValue > 0 ? ((parseFloat(h.currentValue) || parseFloat(h.balance) || 0) / totalValue) * 100 : 0,
    }));
  }, [filtered]);

  const resetFilters = () => {
    setFilterText('');
    setFilterAccount('');
    setFilterMarket('');
    setFilterCurrency('');
    setFilterAssetType('');
    setFilterCategoryL2('');
    setFilterCategoryL3('');
    setFilterPositionGroup('');
    setFilterPositionType('');
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filteredWithRatio.slice((safePage - 1) * pageSize, safePage * pageSize);

  const summary = useMemo(() => {
    const totalValue = filtered.reduce((s, h) => s + (parseFloat(h.currentValue) || parseFloat(h.balance) || 0), 0);
    const totalCost = filtered.reduce((s, h) => s + (parseFloat(h.cost) || parseFloat(h.costPrice) * parseFloat(h.shares) || 0), 0);
    const totalPnl = filtered.reduce((s, h) => s + (parseFloat(h.holdingPnl) || 0), 0);
    const totalDailyPnl = filtered.reduce((s, h) => s + (parseFloat(h.dailyPnl) || 0), 0);
    return {
      value: totalValue,
      cost: totalCost,
      pnl: totalPnl,
      pnlRate: totalCost > 0 ? (totalValue - totalCost) / totalCost * 100 : 0,
      dailyPnl: totalDailyPnl,
      dailyPnlRate: totalValue > 0 ? (totalDailyPnl / totalValue) * 100 : 0,
    };
  }, [filtered]);

  const filteredSummary = useMemo(() => {
    const totalCost = filtered.reduce((sum, a) => sum + (parseFloat(a.cost) || parseFloat(a.costPrice) * parseFloat(a.shares) || 0), 0);
    const totalMarketValue = filtered.reduce((sum, a) => sum + (parseFloat(a.currentValue) || parseFloat(a.balance) || 0), 0);
    const totalPnl = filtered.reduce((sum, a) => sum + (parseFloat(a.holdingPnl) || 0), 0);
    const totalDailyPnl = filtered.reduce((sum, a) => sum + (parseFloat(a.dailyPnl) || 0), 0);
    return {
      totalCost,
      totalMarketValue,
      totalPnl,
      totalPnlRate: totalCost > 0 ? (totalMarketValue - totalCost) / totalCost * 100 : 0,
      totalDailyPnl,
      totalDailyPnlRate: totalMarketValue > 0 ? (totalDailyPnl / totalMarketValue) * 100 : 0,
    };
  }, [filtered]);

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(1);
  };

  const filterSelectClass = "px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 appearance-none cursor-pointer";

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-gray-100 dark:border-slate-700">
      {/* 筛选汇总卡片 */}
      {filtered.length > 0 && (
        <HoldingsSummaryCard summary={filteredSummary} />
      )}

      {/* 筛选栏 */}
      <div className="p-4 pb-3 space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {/* 市场 */}
          {filterSettings.find(f => f.key === 'market')?.visible && (
            <select
              value={filterMarket}
              onChange={e => { setFilterMarket(e.target.value); setPage(1); }}
              className={filterSelectClass}
            >
              <option value="">全部市场</option>
              {uniqueMarkets.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}

          {/* 资产类型 */}
          {filterSettings.find(f => f.key === 'assetType')?.visible && (
            <select
              value={filterAssetType}
              onChange={e => { setFilterAssetType(e.target.value); setPage(1); }}
              className={filterSelectClass}
            >
              <option value="">全部资产类型</option>
              {uniqueAssetTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}

          {/* 二级分类 */}
          {filterSettings.find(f => f.key === 'categoryL2')?.visible && uniqueCategoryL2.length > 0 && (
            <select
              value={filterCategoryL2}
              onChange={e => { setFilterCategoryL2(e.target.value); setPage(1); }}
              className={filterSelectClass}
            >
              <option value="">全部二级分类</option>
              {uniqueCategoryL2.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {/* 三级分类 */}
          {filterSettings.find(f => f.key === 'categoryL3')?.visible && uniqueCategoryL3.length > 0 && (
            <select
              value={filterCategoryL3}
              onChange={e => { setFilterCategoryL3(e.target.value); setPage(1); }}
              className={filterSelectClass}
            >
              <option value="">全部三级分类</option>
              {uniqueCategoryL3.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {/* 持仓分组 */}
          {filterSettings.find(f => f.key === 'positionGroup')?.visible && uniquePositionGroups.length > 0 && (
            <select
              value={filterPositionGroup}
              onChange={e => { setFilterPositionGroup(e.target.value); setPage(1); }}
              className={filterSelectClass}
            >
              <option value="">全部持仓分组</option>
              {uniquePositionGroups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          )}

          {/* 持仓分类 */}
          {filterSettings.find(f => f.key === 'positionType')?.visible && uniquePositionTypes.length > 0 && (
            <select
              value={filterPositionType}
              onChange={e => { setFilterPositionType(e.target.value); setPage(1); }}
              className={filterSelectClass}
            >
              <option value="">全部持仓分类</option>
              {uniquePositionTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}

          {/* 所属账户 */}
          {filterSettings.find(f => f.key === 'account')?.visible && uniqueAccounts.length > 0 && (
            <select
              value={filterAccount}
              onChange={e => { setFilterAccount(e.target.value); setPage(1); }}
              className={filterSelectClass}
            >
              <option value="">全部账户</option>
              {uniqueAccounts.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}

          {/* 货币 */}
          {filterSettings.find(f => f.key === 'currency')?.visible && (
            <select
              value={filterCurrency}
              onChange={e => { setFilterCurrency(e.target.value); setPage(1); }}
              className={filterSelectClass}
            >
              <option value="">全部货币</option>
              {uniqueCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {/* 筛选设置按钮 */}
          <div className="relative" ref={filterSettingsRef}>
            <button
              onClick={() => setShowFilterSettings(!showFilterSettings)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border rounded-lg transition-colors ${
                showFilterSettings
                  ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400'
                  : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              筛选设置
            </button>

            {/* 筛选设置面板 */}
            {showFilterSettings && (
              <div className={`absolute right-0 mt-1 z-50 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg ${
                columnSettingsPosition === 'bottom' ? 'top-full' : 'bottom-full'
              }`}>
                <div className="p-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">筛选设置</span>
                  <button onClick={resetFiltersSettings} className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400">重置</button>
                </div>
                <div className="p-2 space-y-1 max-h-[60vh] overflow-y-auto">
                  {filterSettings.map(f => (
                    <label key={f.key} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded cursor-pointer">
                      <span className="text-xs text-gray-700 dark:text-gray-300">{f.label}</span>
                      <input
                        type="checkbox"
                        checked={f.visible}
                        onChange={() => toggleFilter(f.key)}
                        className="w-3.5 h-3.5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 列设置按钮 */}
          <div className="relative" ref={columnSettingsRef}>
            <button
              onClick={() => setShowColumnSettings(!showColumnSettings)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border rounded-lg transition-colors ${
                showColumnSettings
                  ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400'
                  : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              列设置
            </button>

            {/* 列设置面板 */}
            {showColumnSettings && (
              <div className={`absolute right-0 mt-1 z-50 w-72 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg ${
                columnSettingsPosition === 'bottom' ? 'top-full' : 'bottom-full'
              }`}>
                <div className="p-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">列设置</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={resetColumns}
                      className="px-2 py-0.5 text-xs text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded transition-colors"
                    >
                      默认
                    </button>
                    <button
                      onClick={() => setShowColumnSettings(false)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-1">
                  {columns.map((col, index) => (
                    <div
                      key={col.key}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={col.visible}
                        onChange={() => toggleColumn(col.key)}
                        className="w-3.5 h-3.5 rounded border-gray-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">
                        {col.label}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => moveColumn(index, 'up')}
                          disabled={index === 0}
                          className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveColumn(index, 'down')}
                          disabled={index === columns.length - 1}
                          className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 搜索框 */}
          <div className="relative w-44 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={filterText}
              onChange={e => { setFilterText(e.target.value); setPage(1); }}
              placeholder="搜索名称/代码/类型..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            />
          </div>

          {/* 重置筛选按钮 */}
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            重置
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto px-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-700 text-gray-500">
              {visibleColumns.map(col => (
                <th
                  key={col.key}
                  className={`py-2 px-1.5 font-medium whitespace-nowrap ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  } ${col.bold ? 'font-semibold text-gray-700 dark:text-gray-300' : ''} ${
                    col.indigo ? 'text-primary-600 dark:text-primary-400' : ''
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((h, i) => (
              <tr key={h.id || i} className="border-b border-gray-50 dark:border-slate-700/30 hover:bg-gray-50/80 dark:hover:bg-slate-700/20">
                {visibleColumns.map(col => (
                  <td
                    key={col.key}
                    className={`py-2 px-1.5 ${
                      col.align === 'right' ? 'text-right tabular-nums' : ''
                    } ${col.bold ? 'font-semibold' : ''} ${
                      col.pnl ? pnlClass(h[col.key]) : ''
                    } ${col.indigo ? 'text-primary-600 dark:text-primary-400' : ''} ${
                      col.key === 'currentValue' ? 'text-gray-900 dark:text-white' : ''
                    }`}
                  >
                    {col.key === 'currentValue'
                      ? formatNum(h.currentValue || h.balance)
                      : renderCell(h, col)}
                  </td>
                ))}
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length} className="py-8 text-center text-gray-400 text-xs">
                  {filterText ? '无匹配结果' : '暂无数据'}
                </td>
              </tr>
            )}
          </tbody>
          {/* 汇总行 */}
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 dark:border-slate-600 bg-gray-50/80 dark:bg-slate-700/30 font-semibold">
                {visibleColumns.map((col, idx) => {
                  if (idx === 0) {
                    return (
                      <td key={col.key} className="py-2 px-1.5 text-xs text-gray-500">
                        合计 ({filtered.length}项)
                      </td>
                    );
                  }
                  if (col.key === 'cost') {
                    return (
                      <td key={col.key} className="py-2 px-1.5 text-right tabular-nums">
                        {formatNum(summary.cost)}
                      </td>
                    );
                  }
                  if (col.key === 'currentValue') {
                    return (
                      <td key={col.key} className="py-2 px-1.5 text-right tabular-nums text-gray-900 dark:text-white">
                        {formatNum(summary.value)}
                      </td>
                    );
                  }
                  if (col.key === 'holdingPnl') {
                    return (
                      <td key={col.key} className={`py-2 px-1.5 text-right tabular-nums ${pnlClass(summary.pnl)}`}>
                        {pnlSign(summary.pnl)}{formatNum(summary.pnl)}
                      </td>
                    );
                  }
                  if (col.key === 'holdingPnlRate') {
                    return (
                      <td key={col.key} className={`py-2 px-1.5 text-right tabular-nums ${pnlClass(summary.pnlRate)}`}>
                        {summary.value > 0 ? formatPercentage(summary.pnlRate) : '—'}
                      </td>
                    );
                  }
                  if (col.key === 'dailyPnl') {
                    return (
                      <td key={col.key} className={`py-2 px-1.5 text-right tabular-nums font-semibold ${pnlClass(summary.dailyPnl)}`}>
                        {pnlSign(summary.dailyPnl)}{formatNum(summary.dailyPnl)}
                      </td>
                    );
                  }
                  if (col.key === 'dailyPnlRate') {
                    return (
                      <td key={col.key} className={`py-2 px-1.5 text-right tabular-nums ${pnlClass(summary.dailyPnlRate)}`}>
                        {summary.value > 0 ? formatPercentage(summary.dailyPnlRate) : '—'}
                      </td>
                    );
                  }
                  return <td key={col.key} className="py-2 px-1.5"></td>;
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Pagination
        page={safePage}
        totalPages={totalPages}
        totalCount={filtered.length}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}

export default function CategoryDetail({ categoryName, onBack }) {
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState('CNY');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    targetValue: 0,
    expectedReturn: 0,
  });

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
      console.error('Failed to load data:', err);
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const { assetClasses = [], accounts = [] } = stateData || {};
  const hasFinanceData = accounts.length > 0;

  const enrichedClasses = useMemo(() => {
    return aggregateClassesFromFinance(accounts, assetClasses);
  }, [accounts, assetClasses]);

  const categoryInfo = useMemo(() => {
    if (!categoryName) return null;
    return enrichedClasses.find((cls) => cls.name === categoryName) || null;
  }, [categoryName, enrichedClasses]);

  const stats = useMemo(() => {
    if (!categoryInfo) return null;

    const pnl = (categoryInfo.value || 0) - (categoryInfo.openingValue || 0);
    const pnlRate = (categoryInfo.openingValue || 0) > 0 ? (pnl / categoryInfo.openingValue) * 100 : 0;

    return {
      value: categoryInfo.value || 0,
      openingValue: categoryInfo.openingValue || 0,
      pnl,
      pnlRate,
      targetValue: categoryInfo.targetValue || 0,
      expectedReturn: categoryInfo.expectedReturn || 0,
      income: categoryInfo.income || 0,
      expense: categoryInfo.expense || 0,
    };
  }, [categoryInfo]);

  // 对比卡片数据：当前价值 vs 目标价值，当前收益率 vs 期望收益率
  // 数据来自理财模块 stateData.financeAssets 中 category 为当前分类的持仓
  const comparisonData = useMemo(() => {
    const categoryAccounts = (stateData?.financeAssets || []).filter(
      (a) => (a.categoryL1 || a.category) === categoryName
    );
    const currentValue = categoryAccounts.reduce(
      (s, a) => s + (parseFloat(a.currentValue) || parseFloat(a.currentPrice) * parseFloat(a.shares) || parseFloat(a.balance) || 0),
      0
    );
    const totalCost = categoryAccounts.reduce(
      (s, a) => s + (parseFloat(a.cost) || parseFloat(a.costPrice) * parseFloat(a.shares) || 0),
      0
    );
    const currentReturnRate = totalCost > 0 ? ((currentValue - totalCost) / totalCost) * 100 : 0;
    return {
      currentValue,
      targetValue: categoryInfo?.targetValue || 0,
      totalCost,
      currentReturnRate,
      expectedReturn: categoryInfo?.expectedReturn || 0,
    };
  }, [stateData, categoryName, categoryInfo]);

  // 资产类型占比饼图数据（按 assetType，数据来自理财模块当前分类持仓）
  const chartData = useMemo(() => {
    if (!categoryInfo) return { pieData: [], barData: [] };

    const children = categoryInfo.children || [];
    const typeMap = {};

    children.forEach((child) => {
      const name = child.name || '其他';
      let value = parseFloat(child.value || 0);
      const childCurrency = child.currency || 'CNY';

      if (childCurrency !== selectedCurrency) {
        value = convertValue(value, childCurrency, selectedCurrency);
      }

      if (!typeMap[name]) {
        typeMap[name] = 0;
      }
      typeMap[name] += value;
    });

    const totalTypeValue = Object.values(typeMap).reduce((sum, v) => sum + v, 0);

    const pieData = Object.entries(typeMap)
      .map(([name, value], index) => ({
        name,
        value,
        percent: totalTypeValue > 0 ? (value / totalTypeValue) * 100 : 0,
        color: PRESET_COLORS[index % PRESET_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);

    const barData = Object.entries(typeMap)
      .map(([name, value], index) => ({
        name,
        value,
        color: PRESET_COLORS[index % PRESET_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);

    return { pieData, barData };
  }, [categoryInfo, selectedCurrency]);

  // 海内外对比饼图数据（国内/港股/美股/其他，按一级分类筛选）
  const domesticOverseasData = useMemo(() => {
    return computeCategoryDomesticOverseasPie(stateData?.financeAssets || [], categoryName);
  }, [stateData, categoryName]);

  // 持仓明细数据（仅当前分类，延用理财模块字段结构）
  const categoryHoldings = useMemo(() => {
    const categoryAccounts = (stateData?.financeAssets || []).filter(
      (a) => (a.categoryL1 || a.category) === categoryName
    );
    return categoryAccounts.map((a) => {
      const qty = parseFloat(a.shares || a.quantity) || 0;
      const price = parseFloat(a.currentPrice) || 0;
      return {
        id: a.id,
        market: a.market || '国内市场',
        currency: a.currency || 'CNY',
        name: a.name || '',
        code: a.code || '',
        assetType: a.kind || a.assetType || a.category || '',
        account: a.accountId || a.account || '',
        categoryL1: a.categoryL1 || a.category || '',
        categoryL2: a.subcategory || a.categoryL2 || '',
        categoryL3: a.tertiaryCategory || a.categoryL3 || '',
        categoryL4: a.categoryL4 || '',
        positionGroup: a.positionGroup || '',
        positionType: a.positionCategory || a.positionType || '',
        cost: a.cost || a.costPrice * qty || 0,
        quantity: qty,
        currentPrice: price,
        holdingDays: computeHoldingDays(a),
        balance: a.currentValue || a.balance || (price * qty),
        currentValue: a.currentValue || a.balance || (price * qty),
        holdingPnl: a.holdingPnl || 0,
        holdingPnlRate: a.holdingPnlRate || 0,
        dailyPnl: a.dailyPnl || 0,
        dailyPnlRate: a.dailyPnlRate || 0,
      };
    });
  }, [stateData, categoryName]);

  const { pieData = [], barData = [] } = chartData;

  // ── 编辑功能：保存 targetValue / expectedReturn ──
  const openEditModal = () => {
    setEditForm({
      targetValue: categoryInfo?.targetValue || 0,
      expectedReturn: categoryInfo?.expectedReturn || 0,
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
  };

  const handleEditSave = async () => {
    if (!categoryInfo?.id) {
      alert('分类信息异常，无法保存');
      return;
    }
    const clsId = categoryInfo.id;
    const newTargetValue = Number(editForm.targetValue) || 0;
    const newExpectedReturn = Number(editForm.expectedReturn) || 0;

    const arr = stateData.assetClasses || [];
    const newClasses = arr.map((c) =>
      c.id === clsId
        ? { ...c, targetValue: newTargetValue, expectedReturn: newExpectedReturn }
        : c
    );
    const newState = { ...stateData, assetClasses: newClasses };
    try {
      const result = await saveState(newState);
      if (result && result.success !== false) {
        setStateData(newState);
        setShowEditModal(false);
      } else {
        alert('保存失败：' + (result?.error || '未知错误'));
      }
    } catch (err) {
      console.error('Failed to save edit:', err);
      alert('保存失败：' + (err.message || '未知错误'));
    }
  };

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const p = payload[0];
      return (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg text-sm">
          <div className="font-medium text-gray-900 dark:text-white">{p.name}</div>
          <div className="text-gray-600 dark:text-gray-300">
            {formatCurrency(p.value, selectedCurrency)}（{p.percent?.toFixed(2)}%）
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const p = payload[0];
      return (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg text-sm">
          <div className="font-medium text-gray-900 dark:text-white">{p.name}</div>
          <div className="text-gray-600 dark:text-gray-300">
            {formatCurrency(p.value, selectedCurrency)}
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
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

  if (!categoryInfo) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">返回</span>
            </button>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 shadow-soft border border-gray-100 dark:border-slate-700 text-center">
            <p className="text-gray-500 dark:text-gray-400">分类不存在</p>
          </div>
        </div>
      </div>
    );
  }

  const { value = 0, pnl = 0, pnlRate = 0, targetValue = 0, expectedReturn = 0 } = stats || {};
  const { currentValue: cmpCurrentValue = 0, targetValue: cmpTargetValue = 0, currentReturnRate: cmpReturnRate = 0, expectedReturn: cmpExpectedReturn = 0 } = comparisonData || {};

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <section className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">返回</span>
            </button>
            <div className="h-6 w-px bg-gray-200 dark:bg-slate-700" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{categoryInfo.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer"
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <button
              onClick={openEditModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              编辑
            </button>
          </div>
        </section>

        {/* 第一行：统计卡片 */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full p-2">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">当前价值</span>
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
              {formatCurrency(value, selectedCurrency)}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className={`rounded-full p-2 ${
                pnl >= 0
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              }`}>
                {pnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">盈亏</span>
            </div>
            <div className={`text-lg font-bold tabular-nums ${
              pnl >= 0 ? 'text-green-600' : 'text-red-500'
            }`}>
              {pnl >= 0 ? '+' : ''}{formatCurrency(pnl, selectedCurrency)}
            </div>
            <div className={`text-xs ${pnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {formatPercentage(pnlRate)}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full p-2">
                <Target className="w-4 h-4" />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">目标价值</span>
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
              {formatCurrency(targetValue, selectedCurrency)}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full p-2">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">期望收益率</span>
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {(expectedReturn || 0).toFixed(2)}%
            </div>
          </div>
        </section>

        {/* 第二行：对比卡片 */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full p-2">
              <Scale className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">目标对比</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 当前价值 vs 目标价值 */}
            <div className="rounded-xl border border-gray-100 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">当前价值 vs 目标价值</span>
                {cmpTargetValue > 0 && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    cmpCurrentValue >= cmpTargetValue
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                  }`}>
                    {cmpCurrentValue >= cmpTargetValue ? '已达成' : '未达成'}
                  </span>
                )}
              </div>
              <div className="flex items-end justify-between gap-3 mb-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">当前价值</div>
                  <div className="text-base font-bold text-gray-900 dark:text-white tabular-nums">
                    {formatCurrency(cmpCurrentValue, selectedCurrency)}
                  </div>
                </div>
                <div className="text-gray-300 dark:text-gray-600 text-lg">→</div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">目标价值</div>
                  <div className="text-base font-bold text-gray-900 dark:text-white tabular-nums">
                    {formatCurrency(cmpTargetValue, selectedCurrency)}
                  </div>
                </div>
              </div>
              {cmpTargetValue > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>完成进度</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {((cmpCurrentValue / cmpTargetValue) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        cmpCurrentValue >= cmpTargetValue ? 'bg-green-500' : 'bg-primary-500'
                      }`}
                      style={{ width: `${Math.min((cmpCurrentValue / cmpTargetValue) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 当前收益率 vs 期望收益率 */}
            <div className="rounded-xl border border-gray-100 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">当前收益率 vs 期望收益率</span>
                {cmpExpectedReturn !== 0 && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    cmpReturnRate >= cmpExpectedReturn
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                  }`}>
                    {cmpReturnRate >= cmpExpectedReturn ? '已达标' : '未达标'}
                  </span>
                )}
              </div>
              <div className="flex items-end justify-between gap-3 mb-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">当前收益率</div>
                  <div className={`text-base font-bold tabular-nums ${
                    cmpReturnRate >= 0 ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {formatPercentage(cmpReturnRate)}
                  </div>
                </div>
                <div className="text-gray-300 dark:text-gray-600 text-lg">→</div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">期望收益率</div>
                  <div className="text-base font-bold text-gray-900 dark:text-white tabular-nums">
                    {(cmpExpectedReturn || 0).toFixed(2)}%
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {cmpExpectedReturn !== 0 ? (
                  <>
                    差距：
                    <span className={`font-medium ${
                      ((cmpReturnRate || 0) - (cmpExpectedReturn || 0)) >= 0 ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {((cmpReturnRate || 0) - (cmpExpectedReturn || 0)) >= 0 ? '+' : ''}
                      {((cmpReturnRate || 0) - (cmpExpectedReturn || 0)).toFixed(2)}%
                    </span>
                  </>
                ) : (
                  '未设置期望收益率'
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 第三行：资产类型占比饼图 + 金额柱状图 */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <PieChartIcon className="w-4 h-4 text-primary-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">资产类型占比</h3>
            </div>
            <div className="h-64">
              {pieData.length > 0 && pieData.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="40%"
                      outerRadius="70%"
                      paddingAngle={2}
                      label={({ name, payload }) => `${name} ${payload.percent?.toFixed(1) || 0}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`pie-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ReTooltip content={<CustomPieTooltip />} />
                    <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                  暂无数据
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-primary-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">资产类型金额</h3>
            </div>
            <div className="h-64">
              {barData.length > 0 && barData.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <ReTooltip content={<CustomBarTooltip />} />
                    <Bar dataKey="value" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                  暂无数据
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 第四行：海内外资产对比饼图（国内/港股/美股/其他） */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">海内外资产对比</h3>
          </div>
          <div className="h-64">
            {domesticOverseasData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={domesticOverseasData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="40%"
                    outerRadius="70%"
                    paddingAngle={2}
                    label={({ name, payload }) => `${name} ${payload.percent?.toFixed(1) || 0}%`}
                    labelLine={false}
                  >
                    {domesticOverseasData.map((entry, index) => (
                      <Cell key={`do-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ReTooltip content={<CustomPieTooltip />} />
                  <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                暂无数据
              </div>
            )}
          </div>
        </section>

        {/* 第五行：持仓明细列表（延用理财模块表单结构：筛选/搜索/列设置） */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-500" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">持仓明细</h2>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
              共 {categoryHoldings.length} 项
            </span>
          </div>
          {categoryHoldings.length > 0 ? (
            <HoldingsTable holdings={categoryHoldings} categoryName={categoryName} />
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center shadow-soft border border-gray-100 dark:border-slate-700">
              <p className="text-gray-400 text-sm">暂无持仓数据</p>
            </div>
          )}
        </section>

        {/* 编辑弹窗 */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">编辑{categoryInfo.name}</h3>
                <button
                  onClick={closeEditModal}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    目标价值
                  </label>
                  <input
                    type="number"
                    value={editForm.targetValue}
                    onChange={(e) => setEditForm({ ...editForm, targetValue: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    期望收益率 (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.expectedReturn}
                    onChange={(e) => setEditForm({ ...editForm, expectedReturn: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeEditModal}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleEditSave}
                  className="px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
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
