import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, Settings, Edit2, Trash2, Plus, X,
  Filter, Save, ChevronUp, ChevronDown, Check,
} from 'lucide-react';
import {
  getCurrencySymbol,
  formatCurrencyWithRate,
  formatPercentage,
  computeHoldingDays,
  formatNum,
  pnlClass,
  pnlSign,
  convertCurrency,
  DEFAULT_COLUMNS,
  ARCHIVED_COLUMNS,
  DEFAULT_FILTERS,
  ARCHIVED_FILTERS,
} from './FinanceHoldingsTable.utils';
import { HoldingsSummaryCard, Pagination } from './FinanceHoldingsTable.subcomponents';

export default function FinanceHoldingsTable({
  readOnly = false,
  defaultAccountFilter = '',
  categoryName,
  holdings,
  colorIdx,
  defaultPageSize = 10,
  onEdit,
  onDelete,
  onDetail,
  onAdd,
  onBatchEdit,
  marketOptions,
  currencyOptions,
  assetTypeOptions,
  assetClassOptions,
  positionGroupOptions = [],
  positionTypeOptions = [],
  allCategoryL2Options = [],
  marketGroups = [],
  tags = [],
  categoryL3CustomOptions = [],
  categoryL4Options = [],
  selectedCurrency = 'CNY',
  exchangeRates = {},
  financeAccounts = [],
  assetKindOptions = [],
}) {
  const storagePrefix = readOnly ? 'accounts_table_' : 'finance_';

  const [filterText, setFilterText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}page_size_${categoryName}`);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load page size:', e);
    }
    return defaultPageSize;
  });
  const [filterAccount, setFilterAccount] = useState(defaultAccountFilter);
  const [filterMarket, setFilterMarket] = useState('');
  const [filterCurrency, setFilterCurrency] = useState('');
  const [filterAssetKind, setFilterAssetKind] = useState('');

  const [filterAssetType, setFilterAssetType] = useState('');
  const [filterCategoryL1, setFilterCategoryL1] = useState('');
  const [filterCategoryL2, setFilterCategoryL2] = useState('');
  const [filterCategoryL3, setFilterCategoryL3] = useState('');
  const [filterCategoryL4, setFilterCategoryL4] = useState('');
  const [filterPositionGroup, setFilterPositionGroup] = useState('');
  const [filterPositionType, setFilterPositionType] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showFilterSettings, setShowFilterSettings] = useState(false);
  const [columnSettingsPosition, setColumnSettingsPosition] = useState('bottom');
  const columnSettingsRef = useRef(null);
  const filterSettingsRef = useRef(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [savedFilters, setSavedFilters] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}saved_filters`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showSavedFilters, setShowSavedFilters] = useState(false);

  const defaultFilters = categoryName === 'archived' ? ARCHIVED_FILTERS : DEFAULT_FILTERS;
  const defaultColumns = categoryName === 'archived' ? ARCHIVED_COLUMNS : DEFAULT_COLUMNS;

  const [filterSettings, setFilterSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}filter_settings_${categoryName}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const merged = defaultFilters.map(defaultFilter => {
            const savedFilter = parsed.find(f => f.key === defaultFilter.key);
            return savedFilter ? { ...defaultFilter, visible: savedFilter.visible } : defaultFilter;
          });
          return merged;
        }
      }
    } catch (e) { console.error(e); }
    return defaultFilters;
  });

  useEffect(() => {
    try {
      localStorage.setItem(`${storagePrefix}filter_settings_${categoryName}`, JSON.stringify(filterSettings));
    } catch (e) { console.error(e); }
  }, [filterSettings, categoryName, storagePrefix]);

  const toggleFilter = (key) => {
    setFilterSettings(prev => prev.map(f =>
      f.key === key ? { ...f, visible: !f.visible } : f
    ));
  };

  const resetFiltersSettings = () => {
    setFilterSettings([...defaultFilters]);
  };

  const getFilteredCurrencies = (market) => {
    if (!market) return currencyOptions;
    switch (market) {
      case '国内市场': return ['CNY'];
      case '港股市场': return ['HKD'];
      case '美股市场': return ['USD'];
      default: return currencyOptions;
    }
  };
  const [columns, setColumns] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}column_settings_${categoryName}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter(c => c.key !== 'avgBuyPrice');
          const merged = defaultColumns.map(def => {
            const savedCol = filtered.find(c => c.key === def.key);
            return savedCol || def;
          });
          return merged;
        }
      }
    } catch (e) {
      console.error('Failed to load column settings:', e);
    }
    return [...defaultColumns];
  });

  useEffect(() => {
    try {
      localStorage.setItem(`${storagePrefix}column_settings_${categoryName}`, JSON.stringify(columns));
    } catch (e) {
      console.error('Failed to save column settings:', e);
    }
  }, [columns, categoryName, storagePrefix]);

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

  useEffect(() => {
    try {
      localStorage.setItem(`${storagePrefix}page_size_${categoryName}`, String(pageSize));
    } catch (e) {
      console.error('Failed to save page size:', e);
    }
  }, [pageSize, categoryName, storagePrefix]);

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(1);
  };

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

  const resetColumns = () => {
    setColumns([...DEFAULT_COLUMNS]);
  };

  const renderCell = (h, col) => {
    const val = h[col.key];
    switch (col.key) {
      case 'market':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-slate-700 text-gray-500">{val || '-'}</span>;
      case 'currency':
        return val || '-';
      case 'assetKind':
      case 'assetType':
      case 'categoryL1':
      case 'categoryL2':
      case 'categoryL3':
      case 'categoryL4':
      case 'positionGroup':
      case 'positionType':
        return val || '-';
      case 'name':
        return <span className="font-medium text-gray-900 dark:text-white">{val || '-'}</span>;
      case 'code':
        return <span className="font-mono">{val || '-'}</span>;
      case 'quantity':
        return formatNum(val);
      case 'cost': {
        const unitCost = parseFloat(h.costPrice) || 0;
        const qtyVal = parseFloat(h.quantity) || 0;
        const totalCost = unitCost * qtyVal;
        return formatCurrencyWithRate(totalCost, h.currency || 'CNY', h.currency || 'CNY', exchangeRates);
      }
      case 'avgCost': {
        const costVal = parseFloat(h.cost) || 0;
        const qtyVal = parseFloat(h.quantity) || 0;
        if (costVal > 0 && qtyVal > 0) {
          const avg = costVal / qtyVal;
          return formatCurrencyWithRate(avg, h.currency || 'CNY', h.currency || 'CNY', exchangeRates);
        }
        const costPrice = parseFloat(h.costPrice) || 0;
        if (costPrice > 0) {
          return formatCurrencyWithRate(costPrice, h.currency || 'CNY', h.currency || 'CNY', exchangeRates);
        }
        return '—';
      }
      case 'currentValue':
        return formatCurrencyWithRate(val, h.currency || 'CNY', h.currency || 'CNY', exchangeRates);
      case 'currentPrice':
        let colorClass = '';
        if (h.priceChange === 'up') colorClass = 'text-green-600 dark:text-green-400';
        else if (h.priceChange === 'down') colorClass = 'text-red-500 dark:text-red-400';
        return <span className={colorClass}>{formatCurrencyWithRate(val, h.currency || 'CNY', h.currency || 'CNY', exchangeRates).replace(getCurrencySymbol(h.currency || 'CNY'), '')}</span>;
      case 'holdingDays':
        return computeHoldingDays(h) || '-';
      case 'archiveDate':
        return val || '-';
      case 'finalPnl':
      case 'holdingPnl':
      case 'dailyPnl':
        return <span className={pnlClass(val)}>{pnlSign(parseFloat(val))}{formatCurrencyWithRate(val, h.currency || 'CNY', h.currency || 'CNY', exchangeRates).replace(getCurrencySymbol(h.currency || 'CNY'), '')}</span>;
      case 'finalPnlPercent':
      case 'holdingPnlRate':
      case 'dailyPnlRate':
        return <span className={pnlClass(val)}>{formatPercentage(val)}</span>;
      case 'positionRatio':
        const ratio = parseFloat(val);
        return <span className="text-gray-600 dark:text-gray-400">{isNaN(ratio) ? '—' : `${ratio.toFixed(2)}%`}</span>;
      case 'account':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">{val || '-'}</span>;
      case 'tags':
        return val && Array.isArray(val) ? val.join(', ') : '-';
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
  const uniqueCategoryL1 = useMemo(() =>
    [...new Set(holdings.map(h => h.categoryL1 || h.category).filter(Boolean))].sort(),
    [holdings]
  );
  const uniqueCategoryL2 = useMemo(() =>
    [...new Set(holdings.map(h => h.categoryL2).filter(Boolean))].sort(),
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
  const uniqueTags = useMemo(() => {
    return [...tags].sort();
  }, [tags]);

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
      if (filterAssetKind && h.assetKind !== filterAssetKind) return false;
      if (filterAssetType && h.assetType !== filterAssetType) return false;
      if (filterCategoryL1 && (h.categoryL1 || h.category) !== filterCategoryL1) return false;
      if (filterCategoryL2 && h.categoryL2 !== filterCategoryL2) return false;
      if (filterCategoryL3 && h.categoryL3 !== filterCategoryL3) return false;
      if (filterCategoryL4 && h.categoryL4 !== filterCategoryL4) return false;
      if (filterPositionGroup && h.positionGroup !== filterPositionGroup) return false;
      if (filterPositionType && h.positionType !== filterPositionType) return false;
      if (filterTag && !(h.tags?.includes(filterTag))) return false;
      return true;
    });
  }, [holdings, filterText, filterAccount, filterMarket, filterCurrency, filterAssetKind, filterAssetType, filterCategoryL1, filterCategoryL2, filterCategoryL3, filterCategoryL4, filterPositionGroup, filterPositionType, filterTag]);

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
    setFilterCategoryL1('');
    setFilterCategoryL2('');
    setFilterPositionGroup('');
    setFilterPositionType('');
    setFilterTag('');
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filteredWithRatio.slice((safePage - 1) * pageSize, safePage * pageSize);

  const summary = useMemo(() => {
    const totalValue = filtered.reduce((s, h) => {
      const value = parseFloat(h.currentValue) || parseFloat(h.balance) || 0;
      const currency = h.currency || 'CNY';
      return s + convertCurrency(value, currency, 'CNY', exchangeRates);
    }, 0);
    const totalCost = filtered.reduce((s, h) => {
      const cost = parseFloat(h.cost) || 0;
      const currency = h.currency || 'CNY';
      return s + convertCurrency(cost, currency, 'CNY', exchangeRates);
    }, 0);
    const totalPnl = filtered.reduce((s, h) => {
      const pnl = parseFloat(h.holdingPnl) || 0;
      const currency = h.currency || 'CNY';
      return s + convertCurrency(pnl, currency, 'CNY', exchangeRates);
    }, 0);
    const totalDailyPnl = filtered.reduce((s, h) => {
      const dailyPnl = parseFloat(h.dailyPnl) || 0;
      const currency = h.currency || 'CNY';
      return s + convertCurrency(dailyPnl, currency, 'CNY', exchangeRates);
    }, 0);
    return {
      value: totalValue,
      cost: totalCost,
      pnl: totalPnl,
      pnlRate: totalCost > 0 ? (totalValue - totalCost) / totalCost * 100 : 0,
      dailyPnl: totalDailyPnl,
      dailyPnlRate: totalValue > 0 ? (totalDailyPnl / totalValue) * 100 : 0,
    };
  }, [filtered, exchangeRates]);

  const filteredSummary = useMemo(() => {
    if (categoryName === 'archived') {
      const totalFinalPnl = filtered.reduce((sum, a) => {
        const pnl = parseFloat(a.finalPnl) || 0;
        const currency = a.currency || 'CNY';
        return sum + convertCurrency(pnl, currency, 'CNY', exchangeRates);
      }, 0);
      const totalCostAll = financeAccounts.reduce((sum, a) => {
        if (a.isArchived) return sum;
        const cost = parseFloat(a.cost) || 0;
        const currency = a.currency || 'CNY';
        return sum + convertCurrency(cost, currency, 'CNY', exchangeRates);
      }, 0);
      return {
        totalCost: totalCostAll,
        totalFinalPnl,
        totalFinalPnlRate: totalCostAll > 0 ? (totalFinalPnl / totalCostAll) * 100 : 0,
      };
    } else {
      const totalCost = filtered.reduce((sum, a) => {
        const cost = parseFloat(a.cost) || 0;
        const currency = a.currency || 'CNY';
        return sum + convertCurrency(cost, currency, 'CNY', exchangeRates);
      }, 0);
      const totalMarketValue = filtered.reduce((sum, a) => {
        const value = parseFloat(a.currentValue) || parseFloat(a.balance) || 0;
        const currency = a.currency || 'CNY';
        return sum + convertCurrency(value, currency, 'CNY', exchangeRates);
      }, 0);
      const totalPnl = filtered.reduce((sum, a) => {
        const pnl = parseFloat(a.holdingPnl) || 0;
        const currency = a.currency || 'CNY';
        return sum + convertCurrency(pnl, currency, 'CNY', exchangeRates);
      }, 0);
      const totalDailyPnl = filtered.reduce((sum, a) => {
        const dailyPnl = parseFloat(a.dailyPnl) || 0;
        const currency = a.currency || 'CNY';
        return sum + convertCurrency(dailyPnl, currency, 'CNY', exchangeRates);
      }, 0);
      return {
        totalCost,
        totalMarketValue,
        totalPnl,
        totalPnlRate: totalCost > 0 ? (totalMarketValue - totalCost) / totalCost * 100 : 0,
        totalDailyPnl,
        totalDailyPnlRate: totalMarketValue > 0 ? (totalDailyPnl / totalMarketValue) * 100 : 0,
      };
    }
  }, [filtered, exchangeRates, categoryName, financeAccounts]);

  const showCheckboxCol = !readOnly && showBatchEdit;
  const showOpsCol = !readOnly;
  const showAddBtn = !readOnly && onAdd;
  const showBatchEditBtn = !readOnly;
  const showSavedFiltersBtn = !readOnly;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-gray-100 dark:border-slate-700">
      {filtered.length > 0 && (
        <HoldingsSummaryCard summary={filteredSummary} selectedCurrency={selectedCurrency} exchangeRates={exchangeRates} categoryName={categoryName} />
      )}

      <div className="p-4 pb-3 space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {filterSettings.find(f => f.key === 'account')?.visible && uniqueAccounts.length > 0 && (
            <select
              value={filterAccount}
              onChange={e => { setFilterAccount(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="">全部账户</option>
              {uniqueAccounts.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}

          {filterSettings.find(f => f.key === 'market')?.visible && (
            <select
              value={filterMarket}
              onChange={e => { setFilterMarket(e.target.value); setFilterCurrency(''); setPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="">全部市场</option>
              {marketGroups.map(g => (
                g.options.length === 1
                  ? <option key={g.options[0]} value={g.options[0]}>{g.options[0]}</option>
                  : <optgroup key={g.label} label={g.label}>
                    {g.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </optgroup>
              ))}
            </select>
          )}

          {filterSettings.find(f => f.key === 'categoryL1')?.visible && (
            <select
              value={filterCategoryL1}
              onChange={e => { setFilterCategoryL1(e.target.value); setFilterCategoryL2(''); setFilterCategoryL3(''); setPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="">全部一级分类</option>
              {assetClassOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {filterSettings.find(f => f.key === 'categoryL2')?.visible && (
            <select
              value={filterCategoryL2}
              onChange={e => { setFilterCategoryL2(e.target.value); setFilterCategoryL3(''); setPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="">全部二级分类</option>
              {allCategoryL2Options.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {filterSettings.find(f => f.key === 'categoryL3')?.visible && (
            <select
              value={filterCategoryL3}
              onChange={e => { setFilterCategoryL3(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="">全部三级分类</option>
              {['场内', '场外', ...categoryL3CustomOptions].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {filterSettings.find(f => f.key === 'categoryL4')?.visible && (
            <select
              value={filterCategoryL4}
              onChange={e => { setFilterCategoryL4(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="">全部四级分类</option>
              {[...new Set(Object.values(categoryL4Options).flat())].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {filterSettings.find(f => f.key === 'positionGroup')?.visible && (
            <select
              value={filterPositionGroup}
              onChange={e => { setFilterPositionGroup(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="">全部持仓分组</option>
              {positionGroupOptions.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          )}

          {filterSettings.find(f => f.key === 'positionType')?.visible && (
            <select
              value={filterPositionType}
              onChange={e => { setFilterPositionType(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="">全部持仓分类</option>
              {positionTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}

          {filterSettings.find(f => f.key === 'account')?.visible && (
            <select
              value={filterAccount}
              onChange={e => { setFilterAccount(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="">全部账户</option>
              {uniqueAccounts.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}

          {filterSettings.find(f => f.key === 'currency')?.visible && (
            <select
              value={filterCurrency}
              onChange={e => { setFilterCurrency(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="">全部货币</option>
              {getFilteredCurrencies(filterMarket).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {filterSettings.find(f => f.key === 'assetKind')?.visible && (
            <select
              value={filterAssetKind}
              onChange={e => { setFilterAssetKind(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="">全部资产种类</option>
              {assetKindOptions.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          )}

          {filterSettings.find(f => f.key === 'assetType')?.visible && (
            <select
              value={filterAssetType}
              onChange={e => { setFilterAssetType(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="">全部资产类型</option>
              {assetTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}

          {filterSettings.find(f => f.key === 'tag')?.visible && uniqueTags.length > 0 && (
            <select
              value={filterTag}
              onChange={e => { setFilterTag(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="">全部标签</option>
              {uniqueTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}

          <div className="relative" ref={filterSettingsRef}>
            <button
              onClick={() => setShowFilterSettings(!showFilterSettings)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border rounded-lg transition-colors ${
                showFilterSettings
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                  : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              筛选设置
            </button>

            {showFilterSettings && (
              <div className={`absolute right-0 mt-1 z-50 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg ${
                columnSettingsPosition === 'bottom' ? 'top-full' : 'bottom-full'
              }`}>
                <div className="p-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">筛选设置</span>
                  <button onClick={resetFiltersSettings} className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">重置</button>
                </div>
                <div className="p-2 space-y-1 max-h-[60vh] overflow-y-auto">
                  {filterSettings.map(f => (
                    <label key={f.key} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded cursor-pointer">
                      <span className="text-xs text-gray-700 dark:text-gray-300">{f.label}</span>
                      <input
                        type="checkbox"
                        checked={f.visible}
                        onChange={() => toggleFilter(f.key)}
                        className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {showSavedFiltersBtn && (
            <div className="relative">
              <button
                onClick={() => {
                  setShowSavedFilters(!showSavedFilters);
                  setShowFilterSettings(false);
                  setShowColumnSettings(false);
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border rounded-lg transition-colors ${
                  showSavedFilters
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                    : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                筛选组合
              </button>

              {showSavedFilters && (
                <div className={`absolute right-0 mt-1 z-50 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg ${
                  columnSettingsPosition === 'bottom' ? 'top-full' : 'bottom-full'
                }`}>
                  <div className="p-3 border-b border-gray-100 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">筛选组合</span>
                      <button onClick={() => {
                        const name = prompt('请输入筛选组合名称：');
                        if (name && name.trim()) {
                          const currentFilters = {
                            name: name.trim(),
                            account: filterAccount,
                            market: filterMarket,
                            currency: filterCurrency,
                            assetKind: filterAssetKind,
                            assetType: filterAssetType,
                            categoryL1: filterCategoryL1,
                            categoryL2: filterCategoryL2,
                            categoryL3: filterCategoryL3,
                            categoryL4: filterCategoryL4,
                            positionGroup: filterPositionGroup,
                            positionType: filterPositionType,
                            tag: filterTag,
                            text: filterText,
                          };
                          const newSavedFilters = [...savedFilters, currentFilters];
                          setSavedFilters(newSavedFilters);
                          localStorage.setItem(`${storagePrefix}saved_filters`, JSON.stringify(newSavedFilters));
                        }
                      }} className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">保存当前</button>
                    </div>
                  </div>
                  <div className="p-2 space-y-1 max-h-[40vh] overflow-y-auto">
                    {savedFilters.length > 0 ? (
                      savedFilters.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded cursor-pointer">
                          <button
                            onClick={() => {
                              setFilterAccount(f.account);
                              setFilterMarket(f.market);
                              setFilterCurrency(f.currency);
                              setFilterAssetKind(f.assetKind);
                              setFilterAssetType(f.assetType);
                              setFilterCategoryL1(f.categoryL1);
                              setFilterCategoryL2(f.categoryL2);
                              setFilterCategoryL3(f.categoryL3);
                              setFilterCategoryL4(f.categoryL4);
                              setFilterPositionGroup(f.positionGroup);
                              setFilterPositionType(f.positionType);
                              setFilterTag(f.tag);
                              setFilterText(f.text || '');
                              setPage(1);
                              setShowSavedFilters(false);
                            }}
                            className="flex-1 text-left text-xs text-gray-700 dark:text-gray-300"
                          >
                            {f.name}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newSavedFilters = savedFilters.filter((_, i) => i !== idx);
                              setSavedFilters(newSavedFilters);
                              localStorage.setItem(`${storagePrefix}saved_filters`, JSON.stringify(newSavedFilters));
                            }}
                            className="p-1 text-red-500 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-xs text-gray-400">暂无保存的筛选组合</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="relative" ref={columnSettingsRef}>
            <button
              onClick={() => setShowColumnSettings(!showColumnSettings)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border rounded-lg transition-colors ${
                showColumnSettings
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                  : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              列设置
            </button>

            {showColumnSettings && (
              <div className={`absolute right-0 mt-1 z-50 w-72 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg ${
                columnSettingsPosition === 'bottom' ? 'top-full' : 'bottom-full'
              }`}>
                <div className="p-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">列设置</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={resetColumns}
                      className="px-2 py-0.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
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
                        className="w-3.5 h-3.5 rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
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

          <div className="relative w-44 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={filterText}
              onChange={e => { setFilterText(e.target.value); setPage(1); }}
              placeholder="搜索名称/代码/类型..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {showBatchEditBtn && (
            <button
              onClick={() => { setShowBatchEdit(!showBatchEdit); setSelectedIds(new Set()); }}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-xl font-medium transition-all ${
                showBatchEdit
                  ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              <Edit2 className="w-3.5 h-3.5" /> 批量编辑
            </button>
          )}

          {showBatchEdit && selectedIds.size > 0 && !readOnly && (
            <button
              onClick={() => onBatchEdit && onBatchEdit(selectedIds)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 active:scale-[0.97] transition-all"
            >
              <Check className="w-3.5 h-3.5" /> 编辑选中 ({selectedIds.size})
            </button>
          )}

          {showAddBtn && (
            <button onClick={onAdd}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 active:scale-[0.97] transition-all">
              <Plus className="w-3.5 h-3.5" /> 新增
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto px-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-700 text-gray-500">
              {showCheckboxCol && (
                <th className="py-2 px-1.5 font-medium text-center w-10">
                  <input
                    type="checkbox"
                    checked={paged.length > 0 && paged.every(h => selectedIds.has(h.id))}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(paged.map(h => h.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
              )}
              {visibleColumns.map(col => (
                <th
                  key={col.key}
                  className={`py-2 px-1.5 font-medium whitespace-nowrap ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  } ${col.bold ? 'font-semibold text-gray-700 dark:text-gray-300' : ''} ${
                    col.indigo ? 'text-indigo-600 dark:text-indigo-400' : ''
                  }`}
                >
                  {col.label}
                </th>
              ))}
              {showOpsCol && (
                <th className="py-2 px-1.5 font-medium whitespace-nowrap text-center">操作</th>
              )}
            </tr>
          </thead>
          <tbody>
            {paged.map((h, i) => (
              <tr
                key={h.id || i}
                onClick={() => onDetail && onDetail(h)}
                className="border-b border-gray-50 dark:border-slate-700/30 hover:bg-gray-50/80 dark:hover:bg-slate-700/20 cursor-pointer">
                {showCheckboxCol && (
                  <td className="py-2 px-1.5 text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(h.id)}
                        onChange={e => {
                          const newSet = new Set(selectedIds);
                          if (e.target.checked) newSet.add(h.id);
                          else newSet.delete(h.id);
                          setSelectedIds(newSet);
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-gray-400">{(safePage - 1) * pageSize + i + 1}</span>
                    </div>
                  </td>
                )}
                {visibleColumns.map(col => (
                  <td
                    key={col.key}
                    className={`py-2 px-1.5 ${
                      col.align === 'right' ? 'text-right tabular-nums' : ''
                    } ${col.bold ? 'font-semibold' : ''} ${
                      col.pnl ? pnlClass(h[col.key]) : ''
                    } ${col.indigo ? 'text-indigo-600 dark:text-indigo-400' : ''} ${
                      col.key === 'currentValue' ? 'text-gray-900 dark:text-white' : ''
                    }`}
                  >
                    {col.key === 'currentValue'
                      ? formatNum(h.currentValue || h.balance)
                      : renderCell(h, col)}
                  </td>
                ))}
                {showOpsCol && (
                  <td className="py-2 px-1.5" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      {onEdit && (
                        <button
                          onClick={() => onEdit && onEdit(h)}
                          className="p-1 rounded text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="编辑"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onDetail && onDetail(h)}
                        className="px-1.5 py-0.5 text-xs rounded text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                        title="详情"
                      >
                        明细
                      </button>
                      <button
                        onClick={() => onDelete && onDelete(h.id)}
                        className="p-1 rounded text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length + (showCheckboxCol ? 1 : 0) + (showOpsCol ? 1 : 0)} className="py-8 text-center text-gray-400 text-xs">
                  {filterText ? '无匹配结果' : '暂无数据'}
                </td>
              </tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 dark:border-slate-600 bg-gray-50/80 dark:bg-slate-700/30 font-semibold">
                {showCheckboxCol && <td className="py-2 px-1.5"></td>}
                {visibleColumns.map((col, idx) => {
                  if (idx === 0) {
                    return (
                      <td
                        key={col.key}
                        className="py-2 px-1.5 text-xs text-gray-500"
                      >
                        合计 ({filtered.length}项)
                      </td>
                    );
                  }
                  if (col.key === 'cost') {
                    return (
                      <td key={col.key} className="py-2 px-1.5 text-right tabular-nums">
                        {formatCurrencyWithRate(summary.cost, 'CNY', selectedCurrency, exchangeRates)}
                      </td>
                    );
                  }
                  if (col.key === 'currentValue') {
                    return (
                      <td key={col.key} className="py-2 px-1.5 text-right tabular-nums text-gray-900 dark:text-white">
                        {formatCurrencyWithRate(summary.value, 'CNY', selectedCurrency, exchangeRates)}
                      </td>
                    );
                  }
                  if (col.key === 'holdingPnl') {
                    return (
                      <td key={col.key} className={`py-2 px-1.5 text-right tabular-nums ${pnlClass(summary.pnl)}`}>
                        {pnlSign(summary.pnl)}{formatCurrencyWithRate(summary.pnl, 'CNY', selectedCurrency, exchangeRates).replace(getCurrencySymbol(selectedCurrency), '')}
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
                        {pnlSign(summary.dailyPnl)}{formatCurrencyWithRate(summary.dailyPnl, 'CNY', selectedCurrency, exchangeRates).replace(getCurrencySymbol(selectedCurrency), '')}
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
                {showOpsCol && <td className="py-2 px-1.5"></td>}
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