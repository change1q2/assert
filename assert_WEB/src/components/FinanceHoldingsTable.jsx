import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, Settings, Edit2, Trash2, Plus, X,
  Filter, Save, ChevronUp, ChevronDown, Check, Download,
} from 'lucide-react';
import MultiSelect from './MultiSelect';
import {
  getCurrencySymbol,
  formatCurrencyWithRate,
  formatPriceValue,
  formatPercentage,
  computeHoldingDays,
  formatNum,
  pnlClass,
  pnlSign,
  convertCurrency,
  DEFAULT_COLUMNS,
  ARCHIVED_COLUMNS,
  MONEY_FUND_COLUMNS,
  DEFAULT_FILTERS,
  ARCHIVED_FILTERS,
} from './FinanceHoldingsTable.utils';
import { HoldingsSummaryCard, Pagination } from './FinanceHoldingsTable.subcomponents';
import sanitizeText from '../utils/sanitizeText';
import { CURRENCIES, getCurrencyName } from '../utils/currency';

export default function FinanceHoldingsTable({
  readOnly = false,
  defaultAccountFilter = '',
  lockedAccountFilter = '',
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
  moneyFundMap = {},
  accountOptions = null,
}) {
  const storagePrefix = readOnly ? 'accounts_table_' : 'finance_';

  const filtersStorageKey = `${storagePrefix}filters_${categoryName}`;
  const persistedFilters = (() => {
    try {
      const saved = sessionStorage.getItem(filtersStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load filters:', e);
    }
    return {};
  })();

  const [filterText, setFilterText] = useState(persistedFilters.filterText || '');
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
  // 账户筛选：lockedAccountFilter 优先（锁定模式，不可修改），其次 defaultAccountFilter，最后 sessionStorage
  const _initialAccountFilter = (() => {
    if (lockedAccountFilter) return [lockedAccountFilter];
    if (persistedFilters.filterAccount) {
      return Array.isArray(persistedFilters.filterAccount) ? persistedFilters.filterAccount : [persistedFilters.filterAccount];
    }
    if (defaultAccountFilter) return [defaultAccountFilter];
    return [];
  })();
  const [filterAccount, _setFilterAccount] = useState(_initialAccountFilter);
  // 锁定模式下强制使用 lockedAccountFilter
  const effectiveFilterAccount = lockedAccountFilter ? [lockedAccountFilter] : filterAccount;
  const setFilterAccount = (v) => {
    if (lockedAccountFilter) return;
    _setFilterAccount(v);
    setPage(1);
  };
  const [filterMarket, setFilterMarket] = useState(persistedFilters.filterMarket ? (Array.isArray(persistedFilters.filterMarket) ? persistedFilters.filterMarket : [persistedFilters.filterMarket]) : []);
  const [filterCurrency, setFilterCurrency] = useState(persistedFilters.filterCurrency ? (Array.isArray(persistedFilters.filterCurrency) ? persistedFilters.filterCurrency : [persistedFilters.filterCurrency]) : []);
  const [filterAssetKind, setFilterAssetKind] = useState(persistedFilters.filterAssetKind ? (Array.isArray(persistedFilters.filterAssetKind) ? persistedFilters.filterAssetKind : [persistedFilters.filterAssetKind]) : []);

  const [filterAssetType, setFilterAssetType] = useState(persistedFilters.filterAssetType ? (Array.isArray(persistedFilters.filterAssetType) ? persistedFilters.filterAssetType : [persistedFilters.filterAssetType]) : []);
  const [filterCategoryL1, setFilterCategoryL1] = useState(persistedFilters.filterCategoryL1 ? (Array.isArray(persistedFilters.filterCategoryL1) ? persistedFilters.filterCategoryL1 : [persistedFilters.filterCategoryL1]) : []);
  const [filterCategoryL2, setFilterCategoryL2] = useState(persistedFilters.filterCategoryL2 ? (Array.isArray(persistedFilters.filterCategoryL2) ? persistedFilters.filterCategoryL2 : [persistedFilters.filterCategoryL2]) : []);
  const [filterCategoryL3, setFilterCategoryL3] = useState(persistedFilters.filterCategoryL3 ? (Array.isArray(persistedFilters.filterCategoryL3) ? persistedFilters.filterCategoryL3 : [persistedFilters.filterCategoryL3]) : []);
  const [filterCategoryL4, setFilterCategoryL4] = useState(persistedFilters.filterCategoryL4 ? (Array.isArray(persistedFilters.filterCategoryL4) ? persistedFilters.filterCategoryL4 : [persistedFilters.filterCategoryL4]) : []);
  const [filterPositionGroup, setFilterPositionGroup] = useState(persistedFilters.filterPositionGroup ? (Array.isArray(persistedFilters.filterPositionGroup) ? persistedFilters.filterPositionGroup : [persistedFilters.filterPositionGroup]) : []);
  const [filterPositionType, setFilterPositionType] = useState(persistedFilters.filterPositionType ? (Array.isArray(persistedFilters.filterPositionType) ? persistedFilters.filterPositionType : [persistedFilters.filterPositionType]) : []);
  const [filterTag, setFilterTag] = useState(persistedFilters.filterTag ? (Array.isArray(persistedFilters.filterTag) ? persistedFilters.filterTag : [persistedFilters.filterTag]) : []);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showFilterSettings, setShowFilterSettings] = useState(false);
  const [columnSettingsPosition, setColumnSettingsPosition] = useState('bottom');
  const columnSettingsRef = useRef(null);
  const filterSettingsRef = useRef(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [totalCurrency, setTotalCurrency] = useState(selectedCurrency || 'CNY');
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
      const saved = localStorage.getItem(`${storagePrefix}column_settings_v2_${categoryName}`);
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
      localStorage.setItem(`${storagePrefix}column_settings_v2_${categoryName}`, JSON.stringify(columns));
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

  useEffect(() => {
    try {
      sessionStorage.setItem(filtersStorageKey, JSON.stringify({
        filterText,
        filterAccount: effectiveFilterAccount,
        filterMarket,
        filterCurrency,
        filterAssetKind,
        filterAssetType,
        filterCategoryL1,
        filterCategoryL2,
        filterCategoryL3,
        filterCategoryL4,
        filterPositionGroup,
        filterPositionType,
        filterTag,
      }));
    } catch (e) {
      console.error('Failed to save filters:', e);
    }
  }, [filterText, effectiveFilterAccount, filterMarket, filterCurrency, filterAssetKind, filterAssetType, filterCategoryL1, filterCategoryL2, filterCategoryL3, filterCategoryL4, filterPositionGroup, filterPositionType, filterTag, filtersStorageKey]);

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

  // 判断是否为货币基金（货基）
  const isMoneyFundHold = (h) => {
    if (!h) return false;
    const at = h.assetType || '';
    const ak = h.assetKind || '';
    const catL1 = h.categoryL1 || '';
    const catL2 = h.categoryL2 || '';
    const catL4 = h.categoryL4 || '';
    const pType = h.positionType || '';
    const name = h.name || '';
    if (at === '货基' || ak === '货基' || at === '货币基金' || ak === '货币基金') return true;
    if (catL1 === '货币基金') return true;
    return catL2 === '货币型' || catL4 === '货币基金' || pType === '货币基金' || name.includes('货币');
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
        return sanitizeText(val, val) || '-';
      case 'name':
        return <span className="font-medium text-gray-900 dark:text-white">{sanitizeText(val, val) || '-'}</span>;
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
        // 优先使用 costPrice（与明细弹窗 avgBuyCost 计算公式一致，避免 cost/qty 四舍五入差异）
        const costPrice = parseFloat(h.costPrice) || 0;
        if (costPrice !== 0) {
          return formatCurrencyWithRate(costPrice, h.currency || 'CNY', h.currency || 'CNY', exchangeRates);
        }
        const costVal = parseFloat(h.cost) || 0;
        const qtyVal = parseFloat(h.quantity) || 0;
        if (costVal !== 0 && qtyVal !== 0) {
          const avg = costVal / qtyVal;
          return formatCurrencyWithRate(avg, h.currency || 'CNY', h.currency || 'CNY', exchangeRates);
        }
        return '—';
      }
      case 'currentValue': {
        if (h.assetType === '现金' || h.assetType === '现金余额') {
          const cp = parseFloat(h.currentPrice) || 0;
          const qty = parseFloat(h.quantity) || 0;
          return formatCurrencyWithRate(cp * qty, h.currency || 'CNY', h.currency || 'CNY', exchangeRates);
        }
        return formatCurrencyWithRate(val, h.currency || 'CNY', h.currency || 'CNY', exchangeRates);
      }
      case 'currentPrice':
        // 货币基金：现价默认为1（每份净值1元）
        if (h.categoryL2 === '货币型' || h.categoryL4 === '货币基金' || h.positionType === '货币基金' || (h.name && h.name.includes('货币'))) {
          const mfPrice = parseFloat(val) || 1;
          return <span className="text-gray-700 dark:text-gray-200 tabular-nums">{mfPrice.toFixed(4)}</span>;
        }
        let colorClass = '';
        if (h.priceChange === 'up') colorClass = 'text-green-600 dark:text-green-400';
        else if (h.priceChange === 'down') colorClass = 'text-red-500 dark:text-red-400';
        return <span className={colorClass}>{formatPriceValue(val)}</span>;
      case 'navPer10k': {
        // 优先使用用户手动填写的 navPer10k；其次使用 moneyFundMap 网络获取的值
        const userNav = parseFloat(h.navPer10k) || 0;
        if (userNav > 0) {
          return <span className="text-gray-700 dark:text-gray-200 tabular-nums" title="手动输入">{userNav.toFixed(4)}</span>;
        }
        const mf = h.code && moneyFundMap ? moneyFundMap[h.code] : null;
        if (!mf || mf.nav_per_10k == null) return <span className="text-gray-300 dark:text-slate-600">—</span>;
        return <span className="text-gray-700 dark:text-gray-200 tabular-nums" title={mf.date ? `日期: ${mf.date}` : ''}>{Number(mf.nav_per_10k).toFixed(4)}</span>;
      }
      case 'annualized7d': {
        if (h.assetType === '现金' || h.assetType === '现金余额') {
          return <span className="text-gray-300 dark:text-slate-600">—</span>;
        }
        const userAnn = parseFloat(h.annualized7d) || 0;
        if (userAnn > 0) {
          return <span className="text-green-600 dark:text-green-400 tabular-nums" title="手动输入">{userAnn.toFixed(4)}%</span>;
        }
        const mf = h.code && moneyFundMap ? moneyFundMap[h.code] : null;
        if (!mf || mf.annualized_7d == null) return <span className="text-gray-300 dark:text-slate-600">—</span>;
        const av = parseFloat(mf.annualized_7d);
        const cls = isNaN(av) ? '' : (av >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400');
        return <span className={`${cls} tabular-nums`} title={mf.date ? `日期: ${mf.date}` : ''}>{isNaN(av) ? '—' : `${av.toFixed(4)}%`}</span>;
      }
      case 'cumulativeReturn': {
        // 货币基金：优先使用存储的 cumulativeReturn；缺失则回退为实时重算
        // 持有收益 = 市值 - 成本价×份额
        const _cv = parseFloat(h.currentValue) || parseFloat(h.balance) || 0;
        const _c = parseFloat(h.cost) || 0;
        const _qty = parseFloat(h.quantity) || parseFloat(h.shares) || 0;
        const _cp = parseFloat(h.costPrice) || (_qty !== 0 ? _c / _qty : 1);
        const _costTotal = _cp * _qty;
        if (isMoneyFundHold(h)) {
          const stored = parseFloat(h.cumulativeReturn);
          const mfHoldingPnl = isNaN(stored) ? Math.round((_cv - _costTotal) * 100) / 100 : stored;
          return (
            <span className={pnlClass(mfHoldingPnl)}>
              {pnlSign(mfHoldingPnl)}
              {formatCurrencyWithRate(mfHoldingPnl, h.currency || 'CNY', h.currency || 'CNY', exchangeRates)
                .replace(getCurrencySymbol(h.currency || 'CNY'), '')}
            </span>
          );
        }
        // 非货基：优先使用存储的 cumulativeReturn/cumulativePnl；缺失则回退为 holdingPnl
        let stored = parseFloat(h.cumulativeReturn) || parseFloat(h.cumulativePnl);
        const value = isNaN(stored) ? (parseFloat(h.holdingPnl) || 0) : stored;
        return (
          <span className={pnlClass(value)}>
            {pnlSign(value)}
            {formatCurrencyWithRate(value, h.currency || 'CNY', h.currency || 'CNY', exchangeRates)
              .replace(getCurrencySymbol(h.currency || 'CNY'), '')}
          </span>
        );
      }
      case 'holdingDays': {
        const days = h.isArchived ? h.holdingDays : computeHoldingDays(h);
        return (days != null && days !== '') ? days : '-';
      }
      case 'archiveDate':
        return val || '-';
      case 'finalPnl':
      case 'holdingPnl':
      case 'dailyPnl': {
        const _cv = parseFloat(h.currentValue) || parseFloat(h.balance) || 0;
        const _c = parseFloat(h.cost) || 0;
        const _qty = parseFloat(h.quantity) || parseFloat(h.shares) || 0;
        const _cp = parseFloat(h.costPrice) || (_qty !== 0 ? _c / _qty : 1);
        // 货币基金：优先使用存储值；缺失则回退为实时重算
        if (isMoneyFundHold(h) && col.key === 'holdingPnl') {
          const stored = parseFloat(h.holdingPnl);
          const _v = isNaN(stored) ? Math.round((_cv - _cp * _qty) * 100) / 100 : stored;
          return <span className={pnlClass(_v)}>{pnlSign(_v)}{formatCurrencyWithRate(_v, h.currency || 'CNY', h.currency || 'CNY', exchangeRates).replace(getCurrencySymbol(h.currency || 'CNY'), '')}</span>;
        }
        let _v = parseFloat(val);
        return <span className={pnlClass(_v)}>{pnlSign(_v)}{formatCurrencyWithRate(_v, h.currency || 'CNY', h.currency || 'CNY', exchangeRates).replace(getCurrencySymbol(h.currency || 'CNY'), '')}</span>;
      }
      case 'finalPnlPercent':
      case 'holdingPnlRate':
      case 'dailyPnlRate': {
        const _cv = parseFloat(h.currentValue) || parseFloat(h.balance) || 0;
        const _c = parseFloat(h.cost) || 0;
        const _qty = parseFloat(h.quantity) || parseFloat(h.shares) || 0;
        const _cp = parseFloat(h.costPrice) || (_qty !== 0 ? _c / _qty : 1);
        const _costTotal = _cp * _qty;
        // 货币基金：优先使用存储值；缺失则回退为实时重算
        if (isMoneyFundHold(h) && col.key === 'holdingPnlRate') {
          const stored = parseFloat(h.holdingPnlRate);
          const _r = isNaN(stored) ? (_costTotal !== 0 ? Math.round(((_cv - _costTotal) / _costTotal) * 100 * 100) / 100 : 0) : stored;
          return <span className={pnlClass(_r)}>{formatPercentage(_r)}</span>;
        }
        let _r = parseFloat(val);
        return <span className={pnlClass(_r)}>{formatPercentage(_r)}</span>;
      }
      case 'positionRatio':
        const ratio = parseFloat(val);
        return <span className="text-gray-600 dark:text-gray-400">{isNaN(ratio) ? '—' : `${ratio.toFixed(2)}%`}</span>;
      case 'account':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">{sanitizeText(val, val) || '-'}</span>;
      case 'tags':
        return val && Array.isArray(val) ? val.join(', ') : '-';
      default:
        return val || '-';
    }
  };

  const uniqueAccounts = useMemo(() => {
    if (accountOptions && accountOptions.length > 0) {
      return [...new Set(accountOptions)].sort();
    }
    return [...new Set(holdings.map(h => h.account).filter(Boolean))].sort();
  }, [holdings, accountOptions]);
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
    const inArr = (arr, val) => Array.isArray(arr) && arr.length > 0 && arr.map(v => String(v)).includes(String(val));
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
      if (effectiveFilterAccount.length > 0 && !inArr(effectiveFilterAccount, h.account)) return false;
      if (filterMarket.length > 0 && !inArr(filterMarket, h.market)) return false;
      if (filterCurrency.length > 0 && !inArr(filterCurrency, h.currency)) return false;
      if (filterAssetKind.length > 0 && !inArr(filterAssetKind, h.assetKind)) return false;
      if (filterAssetType.length > 0 && !inArr(filterAssetType, h.assetType)) return false;
      if (filterCategoryL1.length > 0 && !inArr(filterCategoryL1, h.categoryL1 || h.category)) return false;
      if (filterCategoryL2.length > 0 && !inArr(filterCategoryL2, h.categoryL2)) return false;
      if (filterCategoryL3.length > 0 && !inArr(filterCategoryL3, h.categoryL3)) return false;
      if (filterCategoryL4.length > 0 && !inArr(filterCategoryL4, h.categoryL4)) return false;
      if (filterPositionGroup.length > 0 && !inArr(filterPositionGroup, h.positionGroup)) return false;
      if (filterPositionType.length > 0 && !inArr(filterPositionType, h.positionType)) return false;
      if (filterTag.length > 0) {
        const tags = h.tags || [];
        if (!filterTag.some(t => tags.includes(t))) return false;
      }
      return true;
    });
  }, [holdings, filterText, effectiveFilterAccount, filterMarket, filterCurrency, filterAssetKind, filterAssetType, filterCategoryL1, filterCategoryL2, filterCategoryL3, filterCategoryL4, filterPositionGroup, filterPositionType, filterTag]);

  const filteredWithRatio = useMemo(() => {
    const totalValue = filtered.reduce((sum, h) => sum + (parseFloat(h.currentValue) || parseFloat(h.balance) || 0), 0);
    return filtered.map(h => ({
      ...h,
      positionRatio: totalValue > 0 ? ((parseFloat(h.currentValue) || parseFloat(h.balance) || 0) / totalValue) * 100 : 0,
    }));
  }, [filtered]);

  const resetFilters = () => {
    setFilterText('');
    setFilterAccount([]);
    setFilterMarket([]);
    setFilterCurrency([]);
    setFilterAssetKind([]);
    setFilterAssetType([]);
    setFilterCategoryL1([]);
    setFilterCategoryL2([]);
    setFilterCategoryL3([]);
    setFilterCategoryL4([]);
    setFilterPositionGroup([]);
    setFilterPositionType([]);
    setFilterTag([]);
    setPage(1);
    try {
      sessionStorage.removeItem(filtersStorageKey);
    } catch (e) {
      console.error('Failed to clear filters:', e);
    }
  };

  const handleExportToCSV = () => {
    const headers = ['代码', '名称', '市场', '货币', '资产类型', '持仓成本', '现价', '数量', '当前市值', '持仓盈亏', '持仓收益率'];

    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const rows = filtered.map(h => {
      const totalCost = (parseFloat(h.costPrice) || 0) * (parseFloat(h.quantity) || 0);
      const pnlRate = parseFloat(h.holdingPnlRate);
      return [
        h.code || '',
        h.name || '',
        h.market || '',
        h.currency || '',
        h.assetType || '',
        totalCost.toFixed(2),
        h.currentPrice || '',
        h.quantity || '',
        h.currentValue || h.balance || '',
        h.holdingPnl || 0,
        isNaN(pnlRate) ? '' : `${pnlRate.toFixed(2)}%`,
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.map(escapeCSV).join(',')).join('\r\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    link.href = url;
    link.download = `持仓数据_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filteredWithRatio.slice((safePage - 1) * pageSize, safePage * pageSize);

  // 货基/非货基拆分：货基使用独立专用列和表格
  const { moneyFundItems, otherItems, mfPaged, otherPaged, mfTotalPages, otherTotalPages, mfSafePage, otherSafePage } = useMemo(() => {
    const m = [];
    const o = [];
    filteredWithRatio.forEach(h => { isMoneyFundHold(h) ? m.push(h) : o.push(h); });
    const mfTP = Math.max(1, Math.ceil(m.length / pageSize));
    const otTP = Math.max(1, Math.ceil(o.length / pageSize));
    const mfSP = Math.min(safePage, mfTP);
    const otSP = Math.min(safePage, otTP);
    return {
      moneyFundItems: m,
      otherItems: o,
      mfPaged: m.slice((mfSP - 1) * pageSize, mfSP * pageSize),
      otherPaged: o.slice((otSP - 1) * pageSize, otSP * pageSize),
      mfTotalPages: mfTP,
      otherTotalPages: otTP,
      mfSafePage: mfSP,
      otherSafePage: otSP,
    };
  }, [filteredWithRatio, safePage, pageSize]);

  const mfVisibleColumns = useMemo(() => MONEY_FUND_COLUMNS.filter(c => c.visible), []);

  const mfSummary = useMemo(() => {
    const target = totalCurrency || selectedCurrency || 'CNY';
    const totalValue = moneyFundItems.reduce((s, h) => {
      const value = parseFloat(h.currentValue) || parseFloat(h.balance) || 0;
      const currency = h.currency || 'CNY';
      return s + convertCurrency(value, currency, target, exchangeRates);
    }, 0);
    const totalCost = moneyFundItems.reduce((s, h) => {
      const cost = parseFloat(h.cost) || 0;
      const currency = h.currency || 'CNY';
      return s + convertCurrency(cost, currency, target, exchangeRates);
    }, 0);
    const totalPnl = moneyFundItems.reduce((s, h) => {
      const pnl = parseFloat(h.holdingPnl) || 0;
      const currency = h.currency || 'CNY';
      return s + convertCurrency(pnl, currency, target, exchangeRates);
    }, 0);
    const totalCumulative = moneyFundItems.reduce((s, h) => {
      const v = parseFloat(h.cumulativeReturn) || parseFloat(h.cumulativePnl) || parseFloat(h.holdingPnl) || 0;
      const currency = h.currency || 'CNY';
      return s + convertCurrency(v, currency, target, exchangeRates);
    }, 0);
    return {
      value: totalValue,
      cost: totalCost,
      pnl: totalPnl,
      cumulative: totalCumulative,
      pnlRate: totalCost > 0 ? (totalValue - totalCost) / totalCost * 100 : 0,
    };
  }, [moneyFundItems, exchangeRates, totalCurrency, selectedCurrency]);

  const summary = useMemo(() => {
    const target = totalCurrency || selectedCurrency || 'CNY';
    const totalValue = paged.reduce((s, h) => {
      const value = parseFloat(h.currentValue) || parseFloat(h.balance) || 0;
      const currency = h.currency || 'CNY';
      return s + convertCurrency(value, currency, target, exchangeRates);
    }, 0);
    const totalCost = paged.reduce((s, h) => {
      const cost = parseFloat(h.cost) || 0;
      const currency = h.currency || 'CNY';
      return s + convertCurrency(cost, currency, target, exchangeRates);
    }, 0);
    const totalPnl = paged.reduce((s, h) => {
      const pnl = parseFloat(h.holdingPnl) || 0;
      const currency = h.currency || 'CNY';
      return s + convertCurrency(pnl, currency, target, exchangeRates);
    }, 0);
    const totalDailyPnl = paged.reduce((s, h) => {
      const dailyPnl = parseFloat(h.dailyPnl) || 0;
      const currency = h.currency || 'CNY';
      return s + convertCurrency(dailyPnl, currency, target, exchangeRates);
    }, 0);
    return {
      value: totalValue,
      cost: totalCost,
      pnl: totalPnl,
      pnlRate: totalCost > 0 ? (totalPnl / totalCost) * 100 : 0,
      dailyPnl: totalDailyPnl,
      dailyPnlRate: totalValue > 0 ? (totalDailyPnl / totalValue) * 100 : 0,
    };
  }, [paged, exchangeRates, totalCurrency, selectedCurrency]);

  const filteredSummary = useMemo(() => {
    const target = totalCurrency || selectedCurrency || 'CNY';
    if (categoryName === 'archived') {
      const totalFinalPnl = filteredWithRatio.reduce((sum, a) => {
        const pnl = parseFloat(a.finalPnl) || 0;
        const currency = a.currency || 'CNY';
        return sum + convertCurrency(pnl, currency, target, exchangeRates);
      }, 0);
      const totalCostAll = financeAccounts.reduce((sum, a) => {
        if (a.isArchived) return sum;
        const cost = parseFloat(a.cost) || 0;
        const currency = a.currency || 'CNY';
        return sum + convertCurrency(cost, currency, target, exchangeRates);
      }, 0);
      return {
        totalCost: totalCostAll,
        totalFinalPnl,
        totalFinalPnlRate: totalCostAll > 0 ? (totalFinalPnl / totalCostAll) * 100 : 0,
      };
    } else {
      const all = filteredWithRatio;
      const totalCost = all.reduce((sum, a) => {
        const cost = parseFloat(a.cost) || 0;
        const currency = a.currency || 'CNY';
        return sum + convertCurrency(cost, currency, target, exchangeRates);
      }, 0);
      const totalMarketValue = all.reduce((sum, a) => {
        const value = parseFloat(a.currentValue) || parseFloat(a.balance) || 0;
        const currency = a.currency || 'CNY';
        return sum + convertCurrency(value, currency, target, exchangeRates);
      }, 0);
      const totalPnl = all.reduce((sum, a) => {
        const pnl = parseFloat(a.holdingPnl) || 0;
        const currency = a.currency || 'CNY';
        return sum + convertCurrency(pnl, currency, target, exchangeRates);
      }, 0);
      const totalDailyPnl = all.reduce((sum, a) => {
        const dailyPnl = parseFloat(a.dailyPnl) || 0;
        const currency = a.currency || 'CNY';
        return sum + convertCurrency(dailyPnl, currency, target, exchangeRates);
      }, 0);
      // 当前总现金 = 一级分类现金类 + 货币基金（复用 isMoneyFundHold 保持一致）
      const totalCash = all.reduce((sum, a) => {
        const catL1 = a.categoryL1 || a.category || '';
        const isCash = catL1 === '现金类';
        const isMoneyFund = isMoneyFundHold(a);
        if (isCash || isMoneyFund) {
          // 取值优先级：currentValue > balance > quantity×currentPrice
          const v1 = parseFloat(a.currentValue);
          const v2 = parseFloat(a.balance);
          const v3 = parseFloat(a.quantity) * (parseFloat(a.currentPrice) || 1);
          const value = (Number.isFinite(v1) && v1 > 0) ? v1 : (Number.isFinite(v2) && v2 > 0 ? v2 : v3);
          const currency = a.currency || 'CNY';
          return sum + convertCurrency(Number.isFinite(value) ? value : 0, currency, target, exchangeRates);
        }
        return sum;
      }, 0);
      return {
        totalCost,
        totalMarketValue,
        totalCash,
        totalPnl,
        totalPnlRate: totalCost > 0 ? (totalPnl / totalCost) * 100 : 0,
        totalDailyPnl,
        totalDailyPnlRate: totalMarketValue > 0 ? (totalDailyPnl / totalMarketValue) * 100 : 0,
      };
    }
  }, [filteredWithRatio, exchangeRates, categoryName, financeAccounts, totalCurrency, selectedCurrency]);

  const showCheckboxCol = !readOnly && showBatchEdit;
  const showOpsCol = !readOnly;
  const showAddBtn = !readOnly && onAdd;
  const showBatchEditBtn = !readOnly;
  const showSavedFiltersBtn = !readOnly;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-gray-100 dark:border-slate-700">
      {filtered.length > 0 && (
        <HoldingsSummaryCard summary={filteredSummary} selectedCurrency={totalCurrency || selectedCurrency} exchangeRates={exchangeRates} categoryName={categoryName} />
      )}

      <div className="p-4 pb-3 space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {filterSettings.find(f => f.key === 'account')?.visible && uniqueAccounts.length > 0 && (
            <MultiSelect
              value={effectiveFilterAccount}
              onChange={(val) => { setFilterAccount(val); setPage(1); }}
              options={uniqueAccounts.map(a => ({ value: a, label: sanitizeText(a, a) }))}
              placeholder="全部账户"
              disabled={!!lockedAccountFilter}
            />
          )}

          {filterSettings.find(f => f.key === 'market')?.visible && (
            <MultiSelect
              value={filterMarket}
              onChange={(val) => { setFilterMarket(val); setFilterCurrency([]); setPage(1); }}
              options={marketGroups.flatMap(g => g.options)}
              placeholder="全部市场"
            />
          )}

          {filterSettings.find(f => f.key === 'categoryL1')?.visible && (
            <MultiSelect
              value={filterCategoryL1}
              onChange={(val) => { setFilterCategoryL1(val); setFilterCategoryL2([]); setFilterCategoryL3([]); setPage(1); }}
              options={assetClassOptions}
              placeholder="全部一级分类"
            />
          )}

          {filterSettings.find(f => f.key === 'categoryL2')?.visible && (
            <MultiSelect
              value={filterCategoryL2}
              onChange={(val) => { setFilterCategoryL2(val); setFilterCategoryL3([]); setPage(1); }}
              options={allCategoryL2Options}
              placeholder="全部二级分类"
            />
          )}

          {filterSettings.find(f => f.key === 'categoryL3')?.visible && (
            <MultiSelect
              value={filterCategoryL3}
              onChange={(val) => { setFilterCategoryL3(val); setPage(1); }}
              options={['场内', '场外', ...categoryL3CustomOptions]}
              placeholder="全部三级分类"
            />
          )}

          {filterSettings.find(f => f.key === 'categoryL4')?.visible && (
            <MultiSelect
              value={filterCategoryL4}
              onChange={(val) => { setFilterCategoryL4(val); setPage(1); }}
              options={[...new Set(Object.values(categoryL4Options).flat())]}
              placeholder="全部四级分类"
            />
          )}

          {filterSettings.find(f => f.key === 'positionGroup')?.visible && (
            <MultiSelect
              value={filterPositionGroup}
              onChange={(val) => { setFilterPositionGroup(val); setPage(1); }}
              options={positionGroupOptions}
              placeholder="全部持仓分组"
            />
          )}

          {filterSettings.find(f => f.key === 'positionType')?.visible && (
            <MultiSelect
              value={filterPositionType}
              onChange={(val) => { setFilterPositionType(val); setPage(1); }}
              options={positionTypeOptions}
              placeholder="全部持仓分类"
            />
          )}

          {filterSettings.find(f => f.key === 'currency')?.visible && (
            <MultiSelect
              value={filterCurrency}
              onChange={(val) => { setFilterCurrency(val); setPage(1); }}
              options={getFilteredCurrencies(filterMarket).map(c => c)}
              placeholder="全部货币"
            />
          )}

          {filterSettings.find(f => f.key === 'assetKind')?.visible && (
            <MultiSelect
              value={filterAssetKind}
              onChange={(val) => { setFilterAssetKind(val); setPage(1); }}
              options={assetKindOptions}
              placeholder="全部资产种类"
            />
          )}

          {filterSettings.find(f => f.key === 'assetType')?.visible && (
            <MultiSelect
              value={filterAssetType}
              onChange={(val) => { setFilterAssetType(val); setPage(1); }}
              options={assetTypeOptions}
              placeholder="全部资产类型"
            />
          )}

          {filterSettings.find(f => f.key === 'tag')?.visible && uniqueTags.length > 0 && (
            <MultiSelect
              value={filterTag}
              onChange={(val) => { setFilterTag(val); setPage(1); }}
              options={uniqueTags}
              placeholder="全部标签"
            />
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
                            account: effectiveFilterAccount,
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

          <button
            onClick={handleExportToCSV}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> 导出
          </button>

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

      {/* ════════════════════════════════════════════
            分区渲染：货基专用表 + 其他资产通用表
          ════════════════════════════════════════════ */}
      {/* ─────────────── 货基专用表 ─────────────── */}
      {categoryName !== 'archived' && moneyFundItems.length > 0 && (
        <div className="px-4 pb-3 mb-3">
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="inline-block w-1 h-4 bg-emerald-500 rounded"></span>
            <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-400">💰 货币基金 (货基专用明细)</h3>
            <span className="text-xs text-gray-400">共 {moneyFundItems.length} 只</span>
          </div>
          <div className="overflow-x-auto border border-emerald-100 dark:border-emerald-900/40 rounded-xl bg-emerald-50/30 dark:bg-emerald-900/10">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-emerald-200/70 dark:border-emerald-900/40 text-emerald-700/80 dark:text-emerald-400/80 bg-emerald-50/60 dark:bg-emerald-900/20">
                  {showCheckboxCol && (
                    <th className="py-2 px-1.5 font-medium text-center w-10">
                      <input
                        type="checkbox"
                        checked={mfPaged.length > 0 && mfPaged.every(h => selectedIds.has(h.id))}
                        onChange={e => {
                          if (e.target.checked) {
                            const merged = new Set(selectedIds);
                            mfPaged.forEach(h => merged.add(h.id));
                            setSelectedIds(merged);
                          } else {
                            const merged = new Set(selectedIds);
                            mfPaged.forEach(h => merged.delete(h.id));
                            setSelectedIds(merged);
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                  )}
                  {mfVisibleColumns.map(col => (
                    <th
                      key={col.key}
                      className={`py-2 px-1.5 font-medium whitespace-nowrap ${
                        col.align === 'right' ? 'text-right' : 'text-left'
                      } ${col.bold ? 'font-semibold' : ''}`}
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
                {mfPaged.map((h, i) => (
                  <tr
                    key={`mf-${h.id || i}`}
                    onClick={() => onDetail && onDetail(h)}
                    className="border-b border-emerald-50/70 dark:border-emerald-900/20 hover:bg-emerald-100/40 dark:hover:bg-emerald-900/20 cursor-pointer group">
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
                          <span className="text-xs text-gray-400">{i + 1}</span>
                        </div>
                      </td>
                    )}
                    {mfVisibleColumns.map(col => {
                      return (
                      <td
                        key={col.key}
                        className={`py-2 px-1.5 ${
                          col.align === 'right' ? 'text-right tabular-nums' : ''
                        } ${col.bold ? 'font-semibold' : ''} ${
                          col.pnl ? pnlClass(
                            col.key === 'cumulativeReturn'
                              ? (parseFloat(h.cumulativeReturn) || parseFloat(h.cumulativePnl) || parseFloat(h.holdingPnl) || 0)
                              : h[col.key]
                          ) : ''
                        } ${col.key === 'currentValue' ? 'text-gray-900 dark:text-white' : ''}`}
                      >
                        {col.key === 'currentValue'
                          ? formatNum(h.currentValue || h.balance)
                          : renderCell(h, col)}
                      </td>
                    )})}
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
                          {onDelete && (
                            <button
                              onClick={() => onDelete && onDelete(h.id)}
                              className="p-1 rounded text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-900/20 font-semibold">
                  {showCheckboxCol && <td className="py-2 px-1.5"></td>}
                  {mfVisibleColumns.map((col, idx) => {
                    if (idx === 0) {
                      return (
                        <td key={col.key} className="py-2 px-1.5 text-xs text-emerald-700/70 dark:text-emerald-400/70">
                          <div className="flex items-center gap-2">
                            <span>合计 ({moneyFundItems.length}只)</span>
                            <select
                              value={totalCurrency}
                              onChange={(e) => setTotalCurrency(e.target.value)}
                              className="text-xs border border-emerald-300 dark:border-emerald-700 rounded px-1 py-0.5 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                              {CURRENCIES.map(c => (
                                <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                      );
                    }
                    if (col.key === 'quantity') {
                      const sum = moneyFundItems.reduce((s, h) => s + (parseFloat(h.quantity) || 0), 0);
                      return <td key={col.key} className="py-2 px-1.5 text-right tabular-nums">{formatNum(sum)}</td>;
                    }
                    if (col.key === 'currentValue') {
                      return (
                        <td key={col.key} className="py-2 px-1.5 text-right tabular-nums text-gray-900 dark:text-white">
                          {formatCurrencyWithRate(mfSummary.value, totalCurrency, totalCurrency, exchangeRates)}
                        </td>
                      );
                    }
                    if (col.key === 'cumulativeReturn') {
                      return (
                        <td key={col.key} className={`py-2 px-1.5 text-right tabular-nums ${pnlClass(mfSummary.cumulative)}`}>
                          {pnlSign(mfSummary.cumulative)}
                          {formatCurrencyWithRate(mfSummary.cumulative, totalCurrency, totalCurrency, exchangeRates)
                            .replace(getCurrencySymbol(totalCurrency), '')}
                        </td>
                      );
                    }
                    if (col.key === 'holdingPnl') {
                      return (
                        <td key={col.key} className={`py-2 px-1.5 text-right tabular-nums ${pnlClass(mfSummary.pnl)}`}>
                          {pnlSign(mfSummary.pnl)}
                          {formatCurrencyWithRate(mfSummary.pnl, totalCurrency, totalCurrency, exchangeRates)
                            .replace(getCurrencySymbol(totalCurrency), '')}
                        </td>
                      );
                    }
                    if (col.key === 'avgCost') {
                      const qty = moneyFundItems.reduce((s, h) => s + (parseFloat(h.quantity) || 0), 0);
                      const costBase = moneyFundItems.reduce((s, h) => {
                        const cp = parseFloat(h.costPrice);
                        const q = parseFloat(h.quantity) || 0;
                        return s + (isNaN(cp) ? (parseFloat(h.cost) || 0) : cp * q);
                      }, 0);
                      const avg = qty > 0 ? costBase / qty : 1;
                      return <td key={col.key} className="py-2 px-1.5 text-right tabular-nums">{formatCurrencyWithRate(avg, totalCurrency, totalCurrency, exchangeRates)}</td>;
                    }
                    return <td key={col.key} className="py-2 px-1.5"></td>;
                  })}
                  {showOpsCol && <td className="py-2 px-1.5"></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────── 其他资产通用表 ─────────────── */}
      <div className="overflow-x-auto px-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-700 text-gray-500">
              {showCheckboxCol && (
                <th className="py-2 px-1.5 font-medium text-center w-10">
                  <input
                    type="checkbox"
                    checked={otherPaged.length > 0 && otherPaged.every(h => selectedIds.has(h.id))}
                    onChange={e => {
                      if (e.target.checked) {
                        const merged = new Set(selectedIds);
                        otherPaged.forEach(h => merged.add(h.id));
                        setSelectedIds(merged);
                      } else {
                        const merged = new Set(selectedIds);
                        otherPaged.forEach(h => merged.delete(h.id));
                        setSelectedIds(merged);
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
            {otherPaged.map((h, i) => (
              <tr
                key={`oth-${h.id || i}`}
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
                      <span className="text-xs text-gray-400">{i + 1}</span>
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
            {otherPaged.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length + (showCheckboxCol ? 1 : 0) + (showOpsCol ? 1 : 0)} className="py-8 text-center text-gray-400 text-xs">
                  {(moneyFundItems.length > 0) ? '非货基资产无匹配结果' : (filterText ? '无匹配结果' : '暂无数据')}
                </td>
              </tr>
            )}
          </tbody>
          {otherItems.length > 0 && (
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
                        <div className="flex items-center gap-2">
                          <span>合计 ({otherItems.length}项)</span>
                          <select
                            value={totalCurrency}
                            onChange={(e) => setTotalCurrency(e.target.value)}
                            className="text-xs border border-gray-300 dark:border-slate-600 rounded px-1 py-0.5 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            {CURRENCIES.map(c => (
                              <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                    );
                  }
                  const target = totalCurrency || selectedCurrency || 'CNY';
                  if (col.key === 'cost') {
                    const otherCost = otherItems.reduce((s, h) => {
                      const cost = parseFloat(h.cost) || 0;
                      const currency = h.currency || 'CNY';
                      return s + convertCurrency(cost, currency, target, exchangeRates);
                    }, 0);
                    return (
                      <td key={col.key} className="py-2 px-1.5 text-right tabular-nums">
                        {formatCurrencyWithRate(otherCost, target, target, exchangeRates)}
                      </td>
                    );
                  }
                  if (col.key === 'currentValue') {
                    const otherValue = otherItems.reduce((s, h) => {
                      const value = parseFloat(h.currentValue) || parseFloat(h.balance) || 0;
                      const currency = h.currency || 'CNY';
                      return s + convertCurrency(value, currency, target, exchangeRates);
                    }, 0);
                    return (
                      <td key={col.key} className="py-2 px-1.5 text-right tabular-nums text-gray-900 dark:text-white">
                        {formatCurrencyWithRate(otherValue, target, target, exchangeRates)}
                      </td>
                    );
                  }
                  if (col.key === 'holdingPnl') {
                    const otherPnl = otherItems.reduce((s, h) => {
                      const pnl = parseFloat(h.holdingPnl) || 0;
                      const currency = h.currency || 'CNY';
                      return s + convertCurrency(pnl, currency, target, exchangeRates);
                    }, 0);
                    return (
                      <td key={col.key} className={`py-2 px-1.5 text-right tabular-nums ${pnlClass(otherPnl)}`}>
                        {pnlSign(otherPnl)}{formatCurrencyWithRate(otherPnl, target, target, exchangeRates).replace(getCurrencySymbol(target), '')}
                      </td>
                    );
                  }
                  if (col.key === 'holdingPnlRate') {
                    const otherCost = otherItems.reduce((s, h) => {
                      const cost = parseFloat(h.cost) || 0;
                      const currency = h.currency || 'CNY';
                      return s + convertCurrency(cost, currency, target, exchangeRates);
                    }, 0);
                    const otherPnl = otherItems.reduce((s, h) => {
                      const pnl = parseFloat(h.holdingPnl) || 0;
                      const currency = h.currency || 'CNY';
                      return s + convertCurrency(pnl, currency, target, exchangeRates);
                    }, 0);
                    const rate = otherCost > 0 ? (otherPnl / otherCost) * 100 : 0;
                    return (
                      <td key={col.key} className={`py-2 px-1.5 text-right tabular-nums ${pnlClass(rate)}`}>
                        {otherCost > 0 ? formatPercentage(rate) : '—'}
                      </td>
                    );
                  }
                  if (col.key === 'dailyPnl') {
                    const otherDaily = otherItems.reduce((s, h) => {
                      const dailyPnl = parseFloat(h.dailyPnl) || 0;
                      const currency = h.currency || 'CNY';
                      return s + convertCurrency(dailyPnl, currency, target, exchangeRates);
                    }, 0);
                    return (
                      <td key={col.key} className={`py-2 px-1.5 text-right tabular-nums font-semibold ${pnlClass(otherDaily)}`}>
                        {pnlSign(otherDaily)}{formatCurrencyWithRate(otherDaily, target, target, exchangeRates).replace(getCurrencySymbol(target), '')}
                      </td>
                    );
                  }
                  if (col.key === 'dailyPnlRate') {
                    const otherDaily = otherItems.reduce((s, h) => {
                      const dailyPnl = parseFloat(h.dailyPnl) || 0;
                      const currency = h.currency || 'CNY';
                      return s + convertCurrency(dailyPnl, currency, target, exchangeRates);
                    }, 0);
                    const otherValue = otherItems.reduce((s, h) => {
                      const value = parseFloat(h.currentValue) || parseFloat(h.balance) || 0;
                      const currency = h.currency || 'CNY';
                      return s + convertCurrency(value, currency, target, exchangeRates);
                    }, 0);
                    const rate = otherValue > 0 ? (otherDaily / otherValue) * 100 : 0;
                    return (
                      <td key={col.key} className={`py-2 px-1.5 text-right tabular-nums ${pnlClass(rate)}`}>
                        {otherValue > 0 ? formatPercentage(rate) : '—'}
                      </td>
                    );
                  }
                  if (col.key === 'finalPnl') {
                    const totalFinalPnl = otherItems.reduce((s, h) => {
                      const pnl = parseFloat(h.finalPnl) || 0;
                      const currency = h.currency || 'CNY';
                      return s + convertCurrency(pnl, currency, target, exchangeRates);
                    }, 0);
                    return (
                      <td key={col.key} className={`py-2 px-1.5 text-right tabular-nums font-semibold ${pnlClass(totalFinalPnl)}`}>
                        {pnlSign(totalFinalPnl)}{formatCurrencyWithRate(totalFinalPnl, target, target, exchangeRates).replace(getCurrencySymbol(target), '')}
                      </td>
                    );
                  }
                  if (col.key === 'finalPnlPercent') {
                    const totalFinalPnl = otherItems.reduce((s, h) => {
                      const pnl = parseFloat(h.finalPnl) || 0;
                      const currency = h.currency || 'CNY';
                      return s + convertCurrency(pnl, currency, target, exchangeRates);
                    }, 0);
                    const totalCost = otherItems.reduce((s, h) => {
                      const cost = parseFloat(h.cost) || 0;
                      const currency = h.currency || 'CNY';
                      return s + convertCurrency(cost, currency, target, exchangeRates);
                    }, 0);
                    const rate = totalCost > 0 ? (totalFinalPnl / totalCost) * 100 : 0;
                    return (
                      <td key={col.key} className={`py-2 px-1.5 text-right tabular-nums ${pnlClass(rate)}`}>
                        {totalCost > 0 ? formatPercentage(rate) : '—'}
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