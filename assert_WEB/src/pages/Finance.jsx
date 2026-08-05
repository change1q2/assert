import { useState, useEffect, useMemo, useRef } from 'react';
import { fetchState, saveState, createAccount, updateAccount, deleteAccount, fetchBooks, saveBooks, lookupFinance, fetchFinanceQuotes, fetchFundNav, fetchRealTimeExchangeRates } from '../api';
import { CURRENCIES, getCurrencySymbol, getCurrencyName, truncateNum } from '../utils/currency';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Wallet,
  Briefcase,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  X,
  Upload,
  Image,
  Camera,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Search,
  Settings,
  Edit2,
  Trash2,
  Eye,
  Check,
  Save,
  Archive,
} from 'lucide-react';
import FinanceHoldingsTable from '../components/FinanceHoldingsTable';
import { Pagination } from '../components/FinanceHoldingsTable.subcomponents';

// ── 工具函数 ──
function formatCurrency(value) {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(truncateNum(value, 3));
}

function convertCurrency(value, fromCurrency, toCurrency, rates) {
  if (fromCurrency === toCurrency) return value;
  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;
  return value * (fromRate / toRate);
}

function formatCurrencyWithRate(value, currency, targetCurrency, rates) {
  const converted = convertCurrency(value, currency, targetCurrency, rates);
  const symbol = getCurrencySymbol(targetCurrency);
  return `${symbol}${new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(truncateNum(converted, 3))}`;
}

function formatPercentage(value) {
  if (value === null || value === undefined) return '—';
  const n = parseFloat(value);
  if (isNaN(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
}

// 计算经过 N 天的实际持仓天数
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

const GARBLED_PATTERN = /^[?？�\s]+$/;
const sanitizeChineseText = (val, fallback = '') => {
  if (val == null) return fallback;
  const str = String(val).trim();
  if (!str || GARBLED_PATTERN.test(str)) return fallback;
  return val;
};

// ── OCR 字段中文标签映射 ──
const fieldLabelMap = {
  name: '资产名称',
  code: '资产代码',
  quantity: '份额/数量',
  currentPrice: '现价',
  holdingPnl: '持仓盈亏',
  holdingPnlRate: '盈亏率',
  dailyPnl: '当日参考盈亏',
  dailyPnlRate: '当日收益率',
  currentValue: '当前市值',
};

// ── 表单字段子组件 ──
function FormField({ label, required, markRequired, children, fullWidth }) {
  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {required && <span className="text-red-500 mr-0.5 font-bold" style={{ color: '#ef4444' }}>*</span>}
        {label}
        {markRequired && <span className="text-red-500 ml-0.5 font-bold" style={{ color: '#ef4444' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

// ── 共享表单样式 ──
const FORM_INPUT = 'w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors';
const FORM_SELECT = 'w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors appearance-none cursor-pointer';

// ── 账户卡片子组件 ──
function AccountCard({ name, totalValue, totalCost, totalPnl, totalPnlRate, totalDailyPnl, totalDailyPnlRate, count, selectedCurrency, exchangeRates, currency = 'CNY' }) {
  const isPos = totalPnl >= 0;
  const isDayPos = totalDailyPnl >= 0;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-soft border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full p-1.5">
            <Wallet className="w-4 h-4" />
          </div>
          <span className="font-semibold text-gray-900 dark:text-white text-sm">{name}</span>
          <span className="text-xs text-gray-400">({count}项)</span>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isPos ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {formatPercentage(totalPnlRate)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">当前总市值</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrencyWithRate(totalValue, currency, selectedCurrency, exchangeRates)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">持仓总成本</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrencyWithRate(totalCost, currency, selectedCurrency, exchangeRates)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">持仓总盈亏</p>
          <p className={`text-sm font-bold tabular-nums ${isPos ? 'text-green-600' : 'text-red-500'}`}>
            {pnlSign(totalPnl)}{formatCurrencyWithRate(totalPnl, currency, selectedCurrency, exchangeRates).replace(getCurrencySymbol(selectedCurrency), '')}
          </p>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-700 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">持仓总收益率</p>
          <p className={`text-sm font-bold ${isPos ? 'text-green-600' : 'text-red-500'}`}>{formatPercentage(totalPnlRate)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">当日总盈亏</p>
          <p className={`text-sm font-bold tabular-nums ${isDayPos ? 'text-green-600' : 'text-red-500'}`}>
            {pnlSign(totalDailyPnl)}{formatCurrencyWithRate(totalDailyPnl, currency, selectedCurrency, exchangeRates).replace(getCurrencySymbol(selectedCurrency), '')}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">当日总收益率</p>
          <p className={`text-sm font-bold ${isDayPos ? 'text-green-600' : 'text-red-500'}`}>{formatPercentage(totalDailyPnlRate)}</p>
        </div>
      </div>
    </div>
  );
}

// 交易本金与所属账户（accountId 所指账户）余额联动
const updateAccountBalance = (asset, record, accounts, fallbackAccounts, financeAssetsIn) => {
  const accountId = record.accountId || record.account || asset.accountId || asset.account;
  if (!accountId) {
    const financeAssetsCopy = Array.isArray(financeAssetsIn)
      ? JSON.parse(JSON.stringify(financeAssetsIn))
      : JSON.parse(JSON.stringify(fallbackAccounts?._financeAssets || []));
    return { accounts: accounts || fallbackAccounts || [], financeAssets: financeAssetsCopy };
  }

  const accountsCopy = Array.isArray(accounts)
    ? JSON.parse(JSON.stringify(accounts))
    : JSON.parse(JSON.stringify(fallbackAccounts || []));

  let financeAssetsCopy = Array.isArray(financeAssetsIn)
    ? JSON.parse(JSON.stringify(financeAssetsIn))
    : JSON.parse(JSON.stringify(fallbackAccounts?._financeAssets || []));

  // 定位所属账户：id 或 name 匹配，排除现金账户
  let targetAccount = accountsCopy.find(acc =>
    acc &&
    !['cash', 'wallet', 'bank'].includes(acc.type) &&
    (acc.id === accountId || acc.name === accountId)
  );
  if (!targetAccount) {
    return { accounts: accountsCopy, financeAssets: financeAssetsCopy };
  }

  // 货币单位不一致时跳过更新
  const tradeCurrency = record.currency || asset.currency || 'CNY';
  if (targetAccount.currency && targetAccount.currency !== tradeCurrency) {
    console.info('[updateAccountBalance] 货币单位不一致，跳过所属账户余额更新', {
      accountCurrency: targetAccount.currency,
      tradeCurrency,
    });
    return { accounts: accountsCopy, financeAssets: financeAssetsCopy };
  }

  const amount = Math.abs(parseFloat(record.amount) || 0);
  const fee = parseFloat(record.fee) || parseFloat(record.commission) || 0;

  if (record.type === '建仓' || record.type === '买入') {
    targetAccount.balance = (parseFloat(targetAccount.balance) || 0) - amount - fee;
  } else if (record.type === '卖出' || record.type === '清仓') {
    targetAccount.balance = (parseFloat(targetAccount.balance) || 0) + amount - fee;
  }
  // 分红交易：不调整所属账户余额

  // 同步现金类 financeAssets
  financeAssetsCopy = financeAssetsCopy.map(a => {
    const isAccountMatch = a.accountId === accountId || a.account === accountId || a.accountId === targetAccount.id || a.account === targetAccount.name || a.accountId === targetAccount.name || a.account === targetAccount.id;
    const isCashCategory = a.category === '现金类' || a.categoryL1 === '现金类';
    if (!isAccountMatch || !isCashCategory) return a;

    // 跳过货币不一致的条目
    if (a.currency && targetAccount.currency && a.currency !== targetAccount.currency) {
      return a;
    }

    const balance = parseFloat(targetAccount.balance) || 0;
    // 不再强制覆盖 currentPrice，允许用户自定义价格
    // 仅更新 currentValue 基于实际余额
    const _currentPrice = a.currentPrice != null ? parseFloat(a.currentPrice) : 1;
    const _shares = parseFloat(a.shares || a.quantity) || 0;
    const _newShares = _currentPrice > 0 ? balance / _currentPrice : _shares;
    return {
      ...a,
      currentValue: balance,
      shares: _newShares,
      quantity: _newShares,
    };
  });

  return { accounts: accountsCopy, financeAssets: financeAssetsCopy };
};

function DetailModal({ data, totalMarketValue, onClose, saveState, stateData, setStateData, onRefresh, selectedCurrency = 'CNY', exchangeRates = {}, quotesMap = {}, readOnly = false }) {
  const latestData = data?.isArchived
    ? data
    : (stateData?.financeAssets?.find(item => String(item.id) === String(data?.id)) || data);
  if (!latestData) return null;

  const [uploadedImages, setUploadedImages] = useState([]);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [tradeRecords, setTradeRecords] = useState(() => {
    if (data.transactions && Array.isArray(data.transactions)) {
      return data.transactions.map(t => {
        const [date, time] = (t.transaction_date || t.date || '').split(' ');
        return {
          ...t,
          id: t.id || Date.now() + Math.random(),
          type: t.direction || t.type,
          date: date || t.date || '',
          time: time || t.time || '',
          quantity: t.shares || t.quantity,
          fee: t.commission || t.fee,
        };
      });
    }
    return [];
  });

  // 归档模式下：根据交易明细实时计算最终盈亏/收益率（使用 tradeRecords 确保数据同步）
  // 公式：最终盈亏 = 卖出总金额 - 买入总金额 - 交易税费
  //      最终收益率 = 最终盈亏 / 买入总金额 × 100%
  const computedArchive = useMemo(() => {
    if (!latestData.isArchived) return null;
    const txs = tradeRecords || [];
    let buyTotalAmount = 0;
    let sellTotalAmount = 0;
    let totalFees = 0;
    txs.forEach(t => {
      const amount = parseFloat(t.amount) || 0;
      const fee = parseFloat(t.fee) || parseFloat(t.commission) || 0;
      if (!isNaN(fee)) totalFees += fee;
      if (t.type === '建仓' || t.type === '买入') {
        buyTotalAmount += amount;
      } else if (t.type === '卖出' || t.type === '清仓') {
        sellTotalAmount += Math.abs(amount);
      }
    });
    const finalPnl = sellTotalAmount - buyTotalAmount - totalFees;
    const finalPnlPercent = buyTotalAmount > 0 ? (finalPnl / buyTotalAmount) * 100 : 0;
    return { finalPnl, finalPnlPercent, buyTotalAmount, sellTotalAmount, totalFees };
  }, [tradeRecords, latestData.isArchived]);

  // 当 data.transactions 变化时（如父组件刷新后），同步更新本地 tradeRecords
  useEffect(() => {
    const latestItem = stateData?.financeAssets?.find(item => String(item.id) === String(data?.id));
    const transactions = latestItem?.transactions;
    if (transactions && Array.isArray(transactions)) {
      const formatted = transactions.map(t => {
        const [date, time] = (t.transaction_date || t.date || '').split(' ');
        return {
          ...t,
          id: t.id || Date.now() + Math.random(),
          type: t.direction || t.type,
          date: date || t.date || '',
          time: time || t.time || '',
          quantity: t.shares || t.quantity,
          fee: t.commission || t.fee,
        };
      });
      // 只在数据真正变化时更新，避免不必要的重渲染
      setTradeRecords(prev => {
        if (prev.length !== formatted.length) return formatted;
        const prevKey = prev.map(r => `${r.id}_${r.date}_${r.time}_${r.quantity}_${r.amount}`).join('|');
        const newKey = formatted.map(r => `${r.id}_${r.date}_${r.time}_${r.quantity}_${r.amount}`).join('|');
        return prevKey === newKey ? prev : formatted;
      });
    }
  }, [stateData?.financeAssets, data?.id]);

  const saveTradeRecords = async (records, updatedAccounts, updatedFinanceAssetsFromSync) => {
    if (!saveState || !stateData) return;
    try {
      const currentFinanceAssets = stateData?.financeAssets || [];
      const baseFinanceAssets = updatedFinanceAssetsFromSync && Array.isArray(updatedFinanceAssetsFromSync) && updatedFinanceAssetsFromSync.length > 0
        ? updatedFinanceAssetsFromSync
        : currentFinanceAssets;
      const updatedFinanceAssets = baseFinanceAssets.map(item => {
        if (String(item.id) === String(data.id)) {
          let buyTotalQty = 0;
          let buyTotalAmount = 0;
          let sellTotalQty = 0;
          let sellTotalAmount = 0;
          let totalFees = 0;
          records.forEach(t => {
            const qty = parseFloat(t.quantity || t.shares) || 0;
            const amount = parseFloat(t.amount) || 0;
            const fee = parseFloat(t.commission || t.fee) || 0;
            if (!isNaN(fee)) totalFees += fee;
            if (t.type === '建仓' || t.type === '买入') {
              buyTotalQty += qty;
              buyTotalAmount += amount;
            } else if (t.type === '卖出' || t.type === '清仓') {
              sellTotalQty += Math.abs(qty);
              sellTotalAmount += Math.abs(amount);
            }
          });
          const _computedQty = buyTotalQty - sellTotalQty;
          const _computedCostPrice = buyTotalQty > 0 ? buyTotalAmount / buyTotalQty : 0;
          const currentPrice = parseFloat(item.currentPrice) || 0;
          const shares = buyTotalQty > 0 ? _computedQty : (parseFloat(item.shares || item.quantity) || 0);
          const costPrice = buyTotalQty > 0 ? _computedCostPrice : (parseFloat(item.costPrice || item.cost) || 0);
          const cost = costPrice * shares;
          const currentValue = currentPrice * _computedQty;
          const holdingPnl = Math.round((currentValue - cost) * 100) / 100;
          const holdingPnlRate = cost > 0 ? Math.round(((currentValue - cost) / cost) * 100 * 100) / 100 : 0;
          return {
            ...item,
            transactions: records,
            shares,
            costPrice,
            cost,
            availableShares: _computedQty,
            totalFees,
            currentValue,
            holdingPnl,
            holdingPnlRate,
          };
        }
        return item;
      });
      // 若当前资产已归档，同步更新 financeAssetArchives 中的最终盈亏/收益率
      let updatedArchives = stateData?.financeAssetArchives || [];
      if (data.isArchived || data.status === 'archived') {
        let buyTotalAmount = 0;
        let sellTotalAmount = 0;
        let totalFees = 0;
        records.forEach(t => {
          const amount = parseFloat(t.amount) || 0;
          const fee = parseFloat(t.commission || t.fee) || 0;
          if (!isNaN(fee)) totalFees += fee;
          if (t.type === '建仓' || t.type === '买入') {
            buyTotalAmount += amount;
          } else if (t.type === '卖出' || t.type === '清仓') {
            sellTotalAmount += Math.abs(amount);
          }
        });
        const finalPnl = sellTotalAmount - buyTotalAmount - totalFees;
        const finalPnlPercent = buyTotalAmount > 0 ? Math.round((finalPnl / buyTotalAmount) * 100 * 100) / 100 : 0;
        updatedArchives = updatedArchives.map(arch => {
          if (String(arch.originalAssetId || arch.id) === String(data.id)) {
            return { ...arch, finalPnl, finalPnlPercent, transactions: records };
          }
          return arch;
        });
      }

      const newState = {
        ...stateData,
        financeAssets: updatedFinanceAssets,
        financeAssetArchives: updatedArchives,
        accounts: updatedAccounts || stateData.accounts,
      };
      if (typeof window !== 'undefined' && setStateData) {
        setStateData(newState);
      }
      await saveState(newState);
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error('Failed to save trade records:', err);
    }
  };

  const [newRecord, setNewRecord] = useState({
    type: '买入',
    date: new Date().toISOString().split('T')[0],
    time: '09:30',
    price: '',
    quantity: '',
    amount: '',
    fee: '',
  });
  const [editingRecord, setEditingRecord] = useState(null);

  const [recordPage, setRecordPage] = useState(1);
  const [recordPageSize, setRecordPageSize] = useState(5);

  const [recognizedRecords, setRecognizedRecords] = useState([]);
  const [showRecognizeModal, setShowRecognizeModal] = useState(false);

  const [showDcaModal, setShowDcaModal] = useState(false);
  const [dcaSettings, setDcaSettings] = useState({
    enabled: false,
    type: 'amount',
    cycle: 'weekly',
    amount: '',
    quantity: '',
  });

  const [filterRecordType, setFilterRecordType] = useState('');

  const sortedRecords = useMemo(() => {
    const deduplicated = {};
    tradeRecords.forEach(record => {
      const key = `${record.price}_${record.date}_${record.time}_${record.quantity}_${record.amount}`;
      if (!deduplicated[key]) {
        deduplicated[key] = record;
      }
    });
    let filtered = Object.values(deduplicated);
    if (filterRecordType) {
      filtered = filtered.filter(r => r.type === filterRecordType);
    }
    return filtered.sort((a, b) => {
      const dateA = `${a.date} ${a.time}`;
      const dateB = `${b.date} ${b.time}`;
      return dateB.localeCompare(dateA);
    });
  }, [tradeRecords, filterRecordType]);

  const totalRecordPages = Math.ceil(sortedRecords.length / recordPageSize);
  const paginatedRecords = sortedRecords.slice((recordPage - 1) * recordPageSize, recordPage * recordPageSize);

  const holdingDays = computeHoldingDays(latestData);
  const costPrice = parseFloat(latestData.costPrice || latestData.cost) || 0;
  const quantity = parseFloat(latestData.shares || latestData.quantity) || 0;
  const isBondFund = latestData.categoryL1 === '债权类' && latestData.categoryL3 === '场外';
  const isStock = latestData.kind === '股票' || latestData.assetType === '股票';
  const isDomesticIndoor = (latestData.market === '国内市场') && (latestData.tertiaryCategory === '场内' || latestData.categoryL3 === '场内');
  const isDomesticOutdoor = (latestData.market === '国内市场') && (latestData.tertiaryCategory === '场外' || latestData.categoryL3 === '场外');
  const _quote = quotesMap && latestData.code ? quotesMap[latestData.code] : null;
  const _quotePrice = _quote && _quote.price != null ? parseFloat(_quote.price) : null;
  const _quotePrevClose = _quote && _quote.prevClose != null ? parseFloat(_quote.prevClose) : null;
  const _quoteChangePct = _quote && _quote.changePct != null ? parseFloat(_quote.changePct) : null;
  const isUSMarket = latestData.market === '美股市场' || latestData.market === '美股';
  const _storedPrevPrice = parseFloat(latestData.prevPrice) || 0;

  const prevPrice = _quotePrevClose != null ? _quotePrevClose : (parseFloat(latestData.prevPrice) || 0);
  const currentPrice = _quotePrice != null ? _quotePrice : (parseFloat(latestData.currentPrice || costPrice) || 0);
  const priceDate = latestData.priceDate || '';

  const savedCostTotal = parseFloat(latestData.cost) || 0;
  const costTotal = savedCostTotal > 0 ? savedCostTotal : costPrice * quantity;

  const computedCurrentValue = isDomesticOutdoor && currentPrice > 0 && quantity > 0
    ? Math.round(currentPrice * quantity * 100) / 100
    : parseFloat(latestData.currentValue) || currentPrice * quantity;
  const currentValue = computedCurrentValue;

  const floatPnl = (currentValue - costTotal);
  const floatPnlRate = costTotal > 0 ? (floatPnl / costTotal) * 100 : 0;

  // 当日盈亏：优先使用实时行情（与列表保持一致），其次使用 stateData 中存储的 prevPrice/currentPrice，最后回退到 todayPnl/dailyPnl
  let computedDailyPnl = 0;
  if (_quotePrice != null && _quotePrevClose != null && _quotePrevClose !== 0 && quantity > 0) {
    // 美股市场：当实时价等于昨收价（盘外时间），改用昨收价与前一日收盘价计算
    if (isUSMarket && Math.abs(_quotePrice - _quotePrevClose) < 0.0001 && _storedPrevPrice > 0) {
      computedDailyPnl = Math.round((_quotePrevClose - _storedPrevPrice) * quantity * 100) / 100;
    } else {
      computedDailyPnl = Math.round((_quotePrice - _quotePrevClose) * quantity * 100) / 100;
    }
  } else if (_quotePrice != null && _quoteChangePct != null && quantity > 0) {
    // prevClose为0但changePct可用时，用changePct反推prevClose
    const _prevClose = _quotePrice / (1 + _quoteChangePct / 100);
    computedDailyPnl = Math.round((_quotePrice - _prevClose) * quantity * 100) / 100;
  } else if (isUSMarket && _quotePrevClose != null && _quotePrevClose > 0 && _storedPrevPrice > 0 && quantity > 0) {
    // 美股市场：price为空但prevClose可用，用prevClose和前一日收盘价计算
    computedDailyPnl = Math.round((_quotePrevClose - _storedPrevPrice) * quantity * 100) / 100;
  } else if (prevPrice > 0 && currentPrice > 0 && quantity > 0) {
    computedDailyPnl = Math.round((currentPrice - prevPrice) * quantity * 100) / 100;
  } else {
    computedDailyPnl = parseFloat(latestData.todayPnl) || 0;
  }
  const dailyPnl = (_quotePrice != null && (_quotePrevClose != null || _quoteChangePct != null)) || (isUSMarket && _quotePrevClose != null) ? computedDailyPnl : (parseFloat(latestData.dailyPnl) || computedDailyPnl);

  let computedDailyPnlRate = 0;
  if (_quoteChangePct != null) {
    // 美股市场：当实时价等于昨收价（盘外时间），changePct为0，改用昨收价与前一日收盘价计算
    if (isUSMarket && _quotePrice != null && _quotePrevClose != null && Math.abs(_quotePrice - _quotePrevClose) < 0.0001 && _storedPrevPrice > 0 && _quotePrevClose > 0) {
      computedDailyPnlRate = ((_quotePrevClose - _storedPrevPrice) / _storedPrevPrice) * 100;
    } else {
      computedDailyPnlRate = _quoteChangePct;
    }
  } else if (isUSMarket && _quotePrevClose != null && _quotePrevClose > 0 && _storedPrevPrice > 0) {
    // 美股市场：price为空但prevClose可用
    computedDailyPnlRate = ((_quotePrevClose - _storedPrevPrice) / _storedPrevPrice) * 100;
  } else if (Number.isFinite(parseFloat(latestData.dailyChangePct))) {
    computedDailyPnlRate = parseFloat(latestData.dailyChangePct);
  } else if (prevPrice > 0 && currentPrice > 0) {
    computedDailyPnlRate = ((currentPrice - prevPrice) / prevPrice) * 100;
  } else {
    computedDailyPnlRate = parseFloat(latestData.todayPnlPercent) || parseFloat(latestData.dailyPnlRate) || 0;
  }
  const dailyPnlRate = (_quoteChangePct != null || (isUSMarket && _quotePrevClose != null)) ? computedDailyPnlRate : (parseFloat(latestData.dailyPnlRate) || computedDailyPnlRate);

  const computedHoldingReturnRate = floatPnlRate;

  const tradeStats = useMemo(() => {
    let buyTotalAmount = 0;
    let sellTotalAmount = 0;
    let buyTotalQty = 0;
    let sellTotalQty = 0;
    let totalFee = 0;
    let dividendTotal = 0;

    tradeRecords.forEach(record => {
      const amount = parseFloat(record.amount) || 0;
      const qty = parseFloat(record.quantity) || 0;
      const fee = parseFloat(record.fee) || 0;

      if (record.type === '买入' || record.type === '建仓') {
        buyTotalAmount += amount;
        buyTotalQty += qty;
      } else if (record.type === '卖出' || record.type === '清仓') {
        sellTotalAmount += Math.abs(amount);
        sellTotalQty += Math.abs(qty);
      } else if (record.type === '分红') {
        dividendTotal += amount;
      }
      if (!isNaN(fee)) {
        totalFee += fee;
      }
    });

    const avgBuyCost = buyTotalQty > 0 ? buyTotalAmount / buyTotalQty : 0;
    const avgSellCost = sellTotalQty > 0 ? sellTotalAmount / sellTotalQty : 0;

    return { buyTotalAmount, sellTotalAmount, buyTotalQty, sellTotalQty, avgBuyCost, avgSellCost, totalFee, dividendTotal };
  }, [tradeRecords]);

  const isFloatPos = floatPnl >= 0;
  const isDayPos = dailyPnl >= 0;

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setUploadedImages(prev => [...prev, { id: Date.now() + Math.random(), src: event.target.result, name: file.name }]);
          
          const mockRecognized = [
            { id: Date.now() + Math.random(), type: '分红', date: '2026-06-30', time: '', price: '-', quantity: '0', amount: '66.60', fee: '-' },
            { id: Date.now() + Math.random() + 1, type: '买入', date: '2026-04-24', time: '09:30', price: '19.22', quantity: '100', amount: '1922.00', fee: '5.00' },
            { id: Date.now() + Math.random() + 2, type: '卖出', date: '2026-04-23', time: '14:45', price: '21.57', quantity: '-100', amount: '-2157.00', fee: '6.08' },
            { id: Date.now() + Math.random() + 3, type: '买入', date: '2026-03-23', time: '10:15', price: '18.63', quantity: '100', amount: '1863.00', fee: '5.00' },
            { id: Date.now() + Math.random() + 4, type: '买入', date: '2026-03-19', time: '', price: '19.91', quantity: '200', amount: '3982.00', fee: '5.00' },
            { id: Date.now() + Math.random() + 5, type: '买入', date: '2026-03-19', time: '', price: '20.20', quantity: '200', amount: '4040.00', fee: '5.00' },
            { id: Date.now() + Math.random() + 6, type: '买入', date: '2026-03-19', time: '14:30', price: '24.54', quantity: '500', amount: '12270.00', fee: '5.00' },
            { id: Date.now() + Math.random() + 7, type: '买入', date: '2026-03-09', time: '', price: '23.80', quantity: '400', amount: '9520.00', fee: '5.00' },
            { id: Date.now() + Math.random() + 8, type: '买入', date: '2026-03-06', time: '', price: '25.165', quantity: '400', amount: '10066.00', fee: '5.00' },
            { id: Date.now() + Math.random() + 9, type: '买入', date: '2026-03-05', time: '09:30', price: '22.96', quantity: '400', amount: '9184.00', fee: '5.00' },
            { id: Date.now() + Math.random() + 10, type: '买入', date: '2026-03-04', time: '', price: '22.07', quantity: '200', amount: '4414.00', fee: '5.00' },
            { id: Date.now() + Math.random() + 11, type: '买入', date: '2026-03-04', time: '', price: '22.08', quantity: '100', amount: '2208.00', fee: '5.00' },
            { id: Date.now() + Math.random() + 12, type: '买入', date: '2026-03-04', time: '14:00', price: '21.62', quantity: '300', amount: '6486.00', fee: '5.00' },
            { id: Date.now() + Math.random() + 13, type: '建仓', date: '2026-03-03', time: '', price: '22.04', quantity: '100', amount: '2204.00', fee: '5.00' },
          ].map(r => {
            // 无时间字段时，自动补充 9:30-15:00 之间的随机时间
            if (!r.time) {
              const startMinutes = 9 * 60 + 30; // 9:30 = 570 minutes
              const endMinutes = 15 * 60; // 15:00 = 900 minutes
              const randomMinutes = startMinutes + Math.floor(Math.random() * (endMinutes - startMinutes + 1));
              const hours = Math.floor(randomMinutes / 60);
              const mins = randomMinutes % 60;
              r.time = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
            }
            return r;
          }).sort((a, b) => {
            const dateA = `${a.date} ${a.time}`;
            const dateB = `${b.date} ${b.time}`;
            return dateB.localeCompare(dateA);
          });
          setRecognizedRecords(mockRecognized);
          setShowRecognizeModal(true);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (id) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id));
  };

  const handleLiquidateArchive = async (asset, updatedRecords, updatedAccounts, updatedFinanceAssetsFromSync) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const archiveDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    // 从交易明细统计最终盈亏
    let buyTotalAmount = 0;
    let sellTotalAmount = 0;
    let totalFees = 0;
    (updatedRecords || []).forEach(t => {
      const amount = parseFloat(t.amount) || 0;
      const fee = parseFloat(t.commission || t.fee) || 0;
      if (!isNaN(fee)) totalFees += fee;
      if (t.type === '建仓' || t.type === '买入') {
        buyTotalAmount += amount;
      } else if (t.type === '卖出' || t.type === '清仓') {
        sellTotalAmount += Math.abs(amount);
      }
    });
    const finalPnl = sellTotalAmount - buyTotalAmount - totalFees;
    const finalPnlPercent = buyTotalAmount > 0 ? Math.round((finalPnl / buyTotalAmount) * 100 * 100) / 100 : 0;

    const archiveRecord = {
      originalAssetId: asset.id,
      name: asset.name,
      code: asset.code,
      market: asset.market,
      currency: asset.currency,
      kind: asset.kind || asset.assetType,
      category: asset.category,
      subcategory: asset.subcategory,
      tertiaryCategory: asset.tertiaryCategory,
      accountId: asset.accountId || asset.account,
      costPrice: asset.costPrice,
      shares: asset.shares,
      finalPnl,
      finalPnlPercent,
      archiveDate,
      status: 'archived',
      isArchived: true,
      transactions: updatedRecords,
    };

    const currentFinanceAssets = stateData?.financeAssets || [];
    const baseFinanceAssets = updatedFinanceAssetsFromSync && Array.isArray(updatedFinanceAssetsFromSync) && updatedFinanceAssetsFromSync.length > 0
      ? updatedFinanceAssetsFromSync
      : currentFinanceAssets;

    const newState = {
      ...stateData,
      accounts: updatedAccounts || stateData.accounts,
      financeAssets: baseFinanceAssets.map(a =>
        a.id === asset.id ? { ...a, status: 'archived', archiveDate, transactions: updatedRecords } : a
      ),
      financeAssetArchives: [...(stateData.financeAssetArchives || []), archiveRecord],
    };

    await saveState(newState);
    setStateData(newState);
    if (onRefresh) await onRefresh();
  };

  const updateCashAccount = (asset, record) => {
    const accountName = record.accountId || record.account || asset.accountId || asset.account;
    const cashAccountName = `${accountName} 现金账户`;
    const accounts = JSON.parse(JSON.stringify(stateData.accounts || []));

    let cashAccount = accounts.find(acc =>
      acc.name === cashAccountName && (acc.type === 'cash' || acc.type === 'wallet' || acc.type === 'bank')
    );

    if (!cashAccount) {
      const newCashAccount = {
        id: `cash-${Date.now()}`,
        name: cashAccountName,
        type: 'cash',
        currency: record.currency || asset.currency || 'CNY',
        balance: 0,
        liability: false,
        enabled: true,
      };
      cashAccount = newCashAccount;
      accounts.push(newCashAccount);
    }

    const amount = Math.abs(parseFloat(record.amount) || 0);
    const fee = parseFloat(record.fee) || parseFloat(record.commission) || 0;

    if (record.type === '建仓' || record.type === '买入') {
      cashAccount.balance = (parseFloat(cashAccount.balance) || 0) - amount - fee;
    } else if (record.type === '卖出' || record.type === '清仓') {
      cashAccount.balance = (parseFloat(cashAccount.balance) || 0) + amount - fee;
    }

    record.cashAccountId = cashAccount.id;
    record.cashAccountName = cashAccount.name;

    return accounts;
  };

  const handleAddRecord = async () => {
    if (latestData.category === '现金类' || latestData.categoryL1 === '现金类') {
      alert('现金类资产不支持添加交易记录');
      return;
    }

    const record = {
      id: editingRecord ? editingRecord.id : Date.now(),
      direction: newRecord.type,
      type: newRecord.type,
      transaction_date: `${newRecord.date} ${newRecord.time}`,
      date: newRecord.date,
      time: newRecord.time,
      shares: newRecord.type === '分红' ? 0 : parseFloat(newRecord.quantity) || 0,
      quantity: newRecord.type === '分红' ? 0 : parseFloat(newRecord.quantity) || 0,
      price: newRecord.type === '分红' ? '-' : parseFloat(newRecord.price) || 0,
      net_value: isDomesticOutdoor ? (newRecord.type === '分红' ? '-' : parseFloat(newRecord.price) || 0) : undefined,
      amount: parseFloat(newRecord.amount) || 0,
      commission: newRecord.type === '分红' ? '-' : parseFloat(newRecord.fee) || 0,
      fee: newRecord.type === '分红' ? '-' : parseFloat(newRecord.fee) || 0,
      accountId: latestData.accountId || latestData.account,
      currency: latestData.currency,
    };

    // 买入/建仓时校验关联账户余额是否充足
    if (record.type === '买入' || record.type === '建仓') {
      const accountId = latestData.accountId || latestData.account;
      const linkedAccount = (stateData?.accounts || []).find(acc => acc.id === accountId || acc.name === accountId);
      if (linkedAccount) {
        const accountBalance = parseFloat(linkedAccount.balance) || 0;
        const requiredAmount = (parseFloat(record.amount) || 0) + (parseFloat(record.fee) || 0);
        // 货币单位一致时才进行余额校验
        const tradeCurrency = record.currency || latestData.currency || 'CNY';
        if ((!linkedAccount.currency || linkedAccount.currency === tradeCurrency) && accountBalance < requiredAmount) {
          alert(`余额不足。当前余额：${accountBalance.toFixed(2)}，所需金额：${requiredAmount.toFixed(2)}`);
          return;
        }
      }
    }

    let newRecords;
    if (editingRecord) {
      newRecords = tradeRecords.map(r => r.id === editingRecord.id ? record : r);
    } else {
      newRecords = [...tradeRecords, record];
    }

    setTradeRecords(newRecords);

    // 计算可用份额（从交易历史推算）
    const totalShares = parseFloat(latestData.shares || latestData.quantity || 0);
    const soldShares = tradeRecords
      .filter(r => r.type === '卖出' || r.type === '清仓')
      .reduce((sum, r) => sum + (Math.abs(parseFloat(r.quantity) || 0)), 0);
    const availableAfterTrade = totalShares - soldShares - Math.abs(parseFloat(record.quantity) || 0);

    // 清仓判断：显式选清仓 或 卖出后份额归零
    const isLiquidation = record.type === '清仓' ||
      (record.type === '卖出' && availableAfterTrade <= 0);

    if (isLiquidation) {
      record.type = '清仓';
      record.direction = '清仓';
      newRecords = newRecords.map(r => r.id === record.id ? { ...r, type: '清仓', direction: '清仓' } : r);
      setTradeRecords(newRecords);
    }

    let updatedAccounts = updateCashAccount(latestData, record);
    const syncResult = updateAccountBalance(latestData, record, updatedAccounts, undefined, stateData.financeAssets || []);
    updatedAccounts = syncResult.accounts;
    const updatedFinanceAssets = syncResult.financeAssets;

    if (isLiquidation) {
      await handleLiquidateArchive(latestData, newRecords, updatedAccounts, updatedFinanceAssets);
    } else {
      await saveTradeRecords(newRecords, updatedAccounts, updatedFinanceAssets);
    }

    setNewRecord({
      type: '买入',
      date: new Date().toISOString().split('T')[0],
      time: '09:30',
      price: '',
      quantity: '',
      amount: '',
      fee: '',
    });
    setEditingRecord(null);
    setShowAddRecord(false);
    setRecordPage(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full p-2">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">{latestData.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">代码: {latestData.code || '-'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {readOnly && (
          <div className="mx-4 mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-2">
              <Archive className="w-4 h-4" />
              <span className="text-sm font-medium">已归档持仓</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-gray-500 dark:text-gray-400">归档日期</span>
                <p className="text-gray-900 dark:text-white font-medium">{latestData.archiveDate || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">最终盈亏</span>
                <p className={`font-medium ${(computedArchive?.finalPnl ?? latestData.holdingPnl ?? 0) >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {(() => {
                    const v = computedArchive ? computedArchive.finalPnl : (latestData.holdingPnl || 0);
                    return `${v >= 0 ? '+' : ''}${formatCurrencyWithRate(v, latestData.currency || 'CNY', selectedCurrency, exchangeRates)}`;
                  })()}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">最终收益率</span>
                <p className={`font-medium ${(computedArchive?.finalPnlPercent ?? latestData.holdingPnlRate ?? 0) >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {(() => {
                    const v = computedArchive ? computedArchive.finalPnlPercent : (latestData.holdingPnlRate || 0);
                    return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
                  })()}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {isDomesticOutdoor ? (
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 mb-4">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">资产（{getCurrencyName(selectedCurrency)}）</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{formatCurrencyWithRate(currentValue, latestData.currency || 'CNY', selectedCurrency, exchangeRates)}</p>
                {latestData.positionGroup && (
                  <span className="inline-block mt-2 px-3 py-1 text-sm bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 rounded-full">关联组合: {latestData.positionGroup}</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">昨日收益</p>
                  <p className={`text-2xl font-semibold ${computedDailyPnl >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {computedDailyPnl >= 0 ? '+' : ''}{convertCurrency(computedDailyPnl, latestData.currency || 'CNY', selectedCurrency, exchangeRates).toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">持仓收益</p>
                  <p className={`text-2xl font-semibold ${floatPnl >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {floatPnl >= 0 ? '+' : ''}{convertCurrency(floatPnl, latestData.currency || 'CNY', selectedCurrency, exchangeRates).toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">持仓收益率</p>
                  <p className={`text-2xl font-semibold ${floatPnlRate >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {floatPnlRate >= 0 ? '+' : ''}{floatPnlRate.toFixed(2)}%
                  </p>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                <div className="grid grid-cols-[minmax(90px,auto)_1fr_minmax(80px,auto)_1fr] gap-x-3 gap-y-3 items-center">
                  {/* 第1行：单位净值 + 净值时间 | 值 | 日涨幅 | 值 */}
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-1">
                      <span className="text-base text-gray-600 dark:text-gray-300">单位净值</span>
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      净值时间: {priceDate ? (() => {
                        const m = priceDate.match(/(\d{4})-(\d{2})-(\d{2})/);
                        if (m) return `${m[2]}月${m[3]}日`;
                        const m2 = priceDate.match(/(\d{2})-(\d{2})/);
                        return m2 ? `${m2[1]}月${m2[2]}日` : priceDate;
                      })() : '—'}
                    </span>
                  </div>
                  <span className="text-xl font-semibold text-gray-900 dark:text-white">{currentPrice > 0 ? currentPrice.toFixed(4) : '—'}</span>
                  <span className="text-base text-gray-600 dark:text-gray-300">日涨幅</span>
                  <span className={`text-lg font-semibold ${computedDailyPnlRate >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {computedDailyPnlRate >= 0 ? '+' : ''}{computedDailyPnlRate.toFixed(2)}%
                  </span>

                  {/* 第2行：持仓成本单价 | 值 | 累计净值 | 值 */}
                  <span className="text-base text-gray-600 dark:text-gray-300">持仓成本单价</span>
                  <span className="text-xl font-semibold text-gray-900 dark:text-white">{costPrice > 0 ? costPrice.toFixed(4) : '—'}</span>
                  <span className="text-base text-gray-600 dark:text-gray-300">累计净值</span>
                  <span className="text-xl font-semibold text-gray-900 dark:text-white">{latestData.accumulatedNav > 0 ? latestData.accumulatedNav.toFixed(4) : '—'}</span>

                  {/* 第3行：全部份额 | 值 | 可用份额 | 值 */}
                  <span className="text-base text-gray-600 dark:text-gray-300">全部份额</span>
                  <span className="text-xl font-semibold text-gray-900 dark:text-white">{quantity > 0 ? quantity.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</span>
                  <span className="text-base text-gray-600 dark:text-gray-300">可用份额</span>
                  <span className="text-xl font-semibold text-gray-900 dark:text-white">{quantity > 0 ? quantity.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</span>

                  {/* 第4行：持有收益 | 值 | 持有收益率 | 值 */}
                  <span className="text-base text-gray-600 dark:text-gray-300">持有收益</span>
                  <span className={`text-lg font-semibold ${floatPnl >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {floatPnl >= 0 ? '+' : ''}{convertCurrency(floatPnl, latestData.currency || 'CNY', selectedCurrency, exchangeRates).toFixed(2)}
                  </span>
                  <span className="text-base text-gray-600 dark:text-gray-300">持有收益率</span>
                  <span className={`text-lg font-semibold ${computedHoldingReturnRate >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {computedHoldingReturnRate >= 0 ? '+' : ''}{computedHoldingReturnRate.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className={`${isFloatPos ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'} rounded-xl p-3`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">浮动盈亏</p>
                  <p className={`text-lg font-bold ${isFloatPos ? 'text-green-600' : 'text-red-500'}`}>
                    {isFloatPos ? '+' : '-'}{formatCurrencyWithRate(Math.abs(floatPnl), latestData.currency || 'CNY', selectedCurrency, exchangeRates).replace(getCurrencySymbol(selectedCurrency), '')}
                  </p>
                  <p className={`text-xs ${isFloatPos ? 'text-green-600' : 'text-red-500'}`}>
                    {isFloatPos ? '+' : ''}{floatPnlRate.toFixed(2)}%
                  </p>
                </div>
                <div className={`${isDayPos ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'} rounded-xl p-3`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">当日参考盈亏</p>
                  <p className={`text-lg font-bold ${isDayPos ? 'text-green-600' : 'text-red-500'}`}>
                    {isDayPos ? '+' : '-'}{formatCurrencyWithRate(Math.abs(dailyPnl), latestData.currency || 'CNY', selectedCurrency, exchangeRates).replace(getCurrencySymbol(selectedCurrency), '')}
                  </p>
                  <p className={`text-xs ${isDayPos ? 'text-green-600' : 'text-red-500'}`}>
                    {isDayPos ? '+' : ''}{dailyPnlRate.toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* 关联账户余额卡片 */}
              {(() => {
                const accountId = latestData.accountId || latestData.account;
                const linkedAccount = stateData?.accounts?.find(acc => acc.id === accountId || acc.name === accountId);
                if (!linkedAccount) return null;
                const balance = parseFloat(linkedAccount.balance) || 0;
                return (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 mb-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{linkedAccount.name} 账户余额</p>
                    <p className={`text-lg font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                      {formatCurrencyWithRate(balance, linkedAccount.currency || latestData.currency || 'CNY', selectedCurrency, exchangeRates)}
                    </p>
                  </div>
                );
              })()}

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">持仓天数</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{holdingDays}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">交易税费</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatNum(tradeStats.totalFee)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">分红收益</p>
                  <p className="text-sm font-semibold text-green-600">{formatNum(tradeStats.dividendTotal)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">买入总金额</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatNum(tradeStats.buyTotalAmount)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">卖出总金额</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatNum(tradeStats.sellTotalAmount)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">买入总数</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{tradeStats.buyTotalQty}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">卖出总数</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{tradeStats.sellTotalQty}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">平均买入成本</p>
                  <p className="text-sm font-semibold text-green-600">{formatNum(tradeStats.avgBuyCost)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">平均卖出成本</p>
                  <p className="text-sm font-semibold text-red-500">{formatNum(tradeStats.avgSellCost)}</p>
                </div>
              </div>
            </>
          )}

          {/* 数据校验区域 */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">数据校验</h4>
              {(() => {
                const computedCost = tradeStats.buyTotalAmount - tradeStats.sellTotalAmount;
                const listCost = costTotal;
                const fee = tradeStats.totalFee || 0;
                const diff = Math.round((computedCost - listCost + fee) * 100) / 100;
                const isMatch = Math.abs(diff) < 0.01;
                return (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isMatch ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {isMatch ? '校验通过' : '校验异常'}
                  </span>
                );
              })()}
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {(() => {
                const computedCost = tradeStats.buyTotalAmount - tradeStats.sellTotalAmount;
                const listCost = costTotal;
                const fee = tradeStats.totalFee || 0;
                const diff = Math.round((computedCost - listCost + fee) * 100) / 100;
                return (
                  <>
                    <div className="text-center">
                      <p className="text-gray-500 dark:text-gray-400 mb-0.5">明细持仓成本</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatNum(computedCost)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500 dark:text-gray-400 mb-0.5">列表持仓成本</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatNum(listCost)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500 dark:text-gray-400 mb-0.5">交易税费</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatNum(fee)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500 dark:text-gray-400 mb-0.5">差异</p>
                      <p className={`text-sm font-semibold ${Math.abs(diff) < 0.01 ? 'text-green-600' : 'text-red-500'}`}>
                        {diff > 0 ? '+' : ''}{formatNum(diff)}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">交易记录</h4>
              <div className="flex items-center gap-2">
                <select
                  value={filterRecordType}
                  onChange={e => { setFilterRecordType(e.target.value); setRecordPage(1); }}
                  className="px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white cursor-pointer"
                >
                  <option value="">全部类型</option>
                  <option value="建仓">建仓</option>
                  <option value="买入">买入</option>
                  <option value="卖出">卖出</option>
                  <option value="清仓">清仓</option>
                  <option value="分红">分红</option>
                </select>
                {latestData.category !== '现金类' && latestData.categoryL1 !== '现金类' ? (
                  <button
                    onClick={() => setShowAddRecord(!showAddRecord)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    新增记录
                  </button>
                ) : (
                  <span className="text-xs text-gray-400 flex items-center gap-1 cursor-not-allowed" title="现金类资产不支持添加交易记录">
                    <Plus className="w-3.5 h-3.5" />
                    新增记录
                  </span>
                )}
                {!readOnly && (
                  <label className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    图片识别上传
                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
                {!readOnly && (
                  <button
                    onClick={() => setShowDcaModal(true)}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    定投设置
                  </button>
                )}
              </div>
            </div>

            {showAddRecord && (
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 mb-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-gray-500 dark:text-gray-400 block mb-0.5">类型</label>
                    <select
                      value={newRecord.type}
                      onChange={e => {
                        const type = e.target.value;
                        if (type === '清仓') {
                          const qty = latestData.availableShares || latestData.shares || latestData.quantity || 0;
                          const price = latestData.currentPrice || latestData.costPrice || 0;
                          const amount = price && qty ? (parseFloat(price) * parseFloat(qty)).toFixed(2) : '';
                          setNewRecord(prev => ({ ...prev, type, quantity: String(qty), price: String(price), amount }));
                        } else {
                          setNewRecord(prev => ({ ...prev, type }));
                        }
                      }}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                    >
                      <option value="建仓">建仓</option>
                      <option value="买入">买入</option>
                      <option value="卖出">卖出</option>
                      <option value="清仓">清仓</option>
                      <option value="分红">分红</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-500 dark:text-gray-400 block mb-0.5">日期</label>
                    <input
                      type="date"
                      value={newRecord.date}
                      onChange={e => setNewRecord(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 dark:text-gray-400 block mb-0.5">时间</label>
                    <div className="flex gap-1.5">
                      <input
                        type="time"
                        value={newRecord.time}
                        onChange={e => setNewRecord(prev => ({ ...prev, time: e.target.value }))}
                        className="flex-1 px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          const hh = String(now.getHours()).padStart(2, '0');
                          const mm = String(now.getMinutes()).padStart(2, '0');
                          setNewRecord(prev => ({ ...prev, time: `${hh}:${mm}` }));
                        }}
                        className="px-2 py-1.5 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors whitespace-nowrap"
                      >
                        此时
                      </button>
                    </div>
                  </div>
                  {isDomesticIndoor ? (
                    <>
                      <div>
                        <label className="text-gray-500 dark:text-gray-400 block mb-0.5">价格</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newRecord.price}
                          onChange={e => {
                            const price = e.target.value;
                            const qty = newRecord.quantity;
                            const fee = newRecord.fee;
                            const amount = price && qty && fee !== '' ? (parseFloat(price) * parseFloat(qty)).toFixed(2) : '';
                            setNewRecord(prev => ({ ...prev, price, amount }));
                          }}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                          placeholder="价格"
                        />
                      </div>
                      <div>
                        <label className="text-gray-500 dark:text-gray-400 block mb-0.5">数量</label>
                        <input
                          type="number"
                          step="1"
                          value={newRecord.quantity}
                          onChange={e => {
                            const qty = e.target.value;
                            const price = newRecord.price;
                            const fee = newRecord.fee;
                            const amount = price && qty && fee !== '' ? (parseFloat(price) * parseFloat(qty)).toFixed(2) : '';
                            setNewRecord(prev => ({ ...prev, quantity: qty, amount }));
                          }}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                          placeholder="数量"
                        />
                      </div>
                      <div>
                        <label className="text-gray-500 dark:text-gray-400 block mb-0.5">费用</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newRecord.fee}
                          onChange={e => {
                            const fee = e.target.value;
                            const price = newRecord.price;
                            const qty = newRecord.quantity;
                            const amount = price && qty && fee !== '' ? (parseFloat(price) * parseFloat(qty)).toFixed(2) : '';
                            setNewRecord(prev => ({ ...prev, fee, amount }));
                          }}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                          placeholder="费用"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-gray-500 dark:text-gray-400 block mb-0.5">金额 (价格×数量)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newRecord.amount}
                          readOnly
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-gray-100 dark:bg-slate-600 cursor-not-allowed"
                          placeholder={newRecord.price && newRecord.quantity && newRecord.fee !== '' ? '自动计算' : '请填写价格、数量和费用'}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="text-gray-500 dark:text-gray-400 block mb-0.5">净值</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={newRecord.price}
                          onChange={e => {
                            const price = e.target.value;
                            const qty = newRecord.quantity;
                            const fee = newRecord.fee;
                            const amount = price && qty && fee !== '' ? (parseFloat(price) * parseFloat(qty)).toFixed(2) : '';
                            setNewRecord(prev => ({ ...prev, price, amount }));
                          }}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                          placeholder="净值"
                        />
                      </div>
                      <div>
                        <label className="text-gray-500 dark:text-gray-400 block mb-0.5">份额</label>
                        <input
                          type="number"
                          step="0.001"
                          value={newRecord.quantity}
                          onChange={e => {
                            const qty = e.target.value;
                            const price = newRecord.price;
                            const fee = newRecord.fee;
                            const amount = price && qty && fee !== '' ? (parseFloat(price) * parseFloat(qty)).toFixed(2) : '';
                            setNewRecord(prev => ({ ...prev, quantity: qty, amount }));
                          }}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                          placeholder="份额"
                        />
                      </div>
                      <div>
                        <label className="text-gray-500 dark:text-gray-400 block mb-0.5">费用</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newRecord.fee}
                          onChange={e => {
                            const fee = e.target.value;
                            const price = newRecord.price;
                            const qty = newRecord.quantity;
                            const amount = price && qty && fee !== '' ? (parseFloat(price) * parseFloat(qty)).toFixed(2) : '';
                            setNewRecord(prev => ({ ...prev, fee, amount }));
                          }}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                          placeholder="费用"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-gray-500 dark:text-gray-400 block mb-0.5">金额 (净值×份额)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newRecord.amount}
                          readOnly
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-gray-100 dark:bg-slate-600 cursor-not-allowed"
                          placeholder={newRecord.price && newRecord.quantity && newRecord.fee !== '' ? '自动计算' : '请填写净值、份额和费用'}
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleAddRecord}
                    className="flex-1 px-3 py-1.5 text-xs bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setShowAddRecord(false)}
                    className="flex-1 px-3 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {uploadedImages.map(img => (
                  <div key={img.id} className="relative rounded-lg overflow-hidden">
                    <img src={img.src} alt={img.name} className="w-full h-20 object-cover" />
                    <button onClick={() => removeImage(img.id)} className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-1">
              {paginatedRecords.map((record) => (
                <div key={record.id} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${record.type === '建仓' ? 'text-blue-600' : record.type === '买入' ? 'text-green-600' : record.type === '卖出' ? 'text-red-500' : record.type === '清仓' ? 'text-orange-500' : 'text-blue-600'}`}>
                      {record.type}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">{record.date} {record.time}</span>
                  </div>
                  {record.cashAccountName && (
                    <div className="mb-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Wallet className="w-3 h-3" />
                      <span>关联账户: {record.cashAccountName}</span>
                    </div>
                  )}
                  {isDomesticOutdoor ? (
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">净值</span>
                        <p className="text-gray-900 dark:text-white">{record.price}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">份额</span>
                        <p className="text-gray-900 dark:text-white">{record.quantity}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">金额</span>
                        <p className={`${record.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>{record.amount >= 0 ? '+' : ''}{record.amount}</p>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500 dark:text-gray-400">费用</span>
                        <div className="flex items-center gap-1 justify-end flex-1">
                          <span className="text-gray-900 dark:text-white">{record.fee}</span>
                          {!readOnly && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingRecord(record);
                                setNewRecord({
                                  type: record.type,
                                  date: record.date,
                                  time: record.time,
                                  price: record.price === '-' ? '' : String(record.price),
                                  quantity: String(record.quantity),
                                  amount: String(record.amount),
                                  fee: record.fee === '-' ? '' : String(record.fee),
                                });
                                setShowAddRecord(true);
                              }}
                              className="p-1.5 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                              title="修改"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!readOnly && (
                            <button
                              onClick={() => setTradeRecords(prev => {
                                const newRecords = prev.filter(r => r.id !== record.id);
                                saveTradeRecords(newRecords);
                                return newRecords;
                              })}
                              className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">价格</span>
                        <p className="text-gray-900 dark:text-white">{record.price}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">数量</span>
                        <p className="text-gray-900 dark:text-white">{record.quantity}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">金额</span>
                        <p className={`${record.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>{record.amount >= 0 ? '+' : ''}{record.amount}</p>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500 dark:text-gray-400">费用</span>
                        <div className="flex items-center gap-1 justify-end flex-1">
                          <span className="text-gray-900 dark:text-white">{record.fee}</span>
                          {!readOnly && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingRecord(record);
                                setNewRecord({
                                  type: record.type,
                                  date: record.date,
                                  time: record.time,
                                  price: record.price === '-' ? '' : String(record.price),
                                  quantity: String(record.quantity),
                                  amount: String(record.amount),
                                  fee: record.fee === '-' ? '' : String(record.fee),
                                });
                                setShowAddRecord(true);
                              }}
                              className="p-1.5 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                              title="修改"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!readOnly && (
                            <button
                              onClick={() => setTradeRecords(prev => {
                                const newRecords = prev.filter(r => r.id !== record.id);
                                saveTradeRecords(newRecords);
                                return newRecords;
                              })}
                              className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {sortedRecords.length > 0 && (
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  共 {sortedRecords.length} 条记录
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={recordPageSize}
                    onChange={(e) => {
                      setRecordPageSize(Number(e.target.value));
                      setRecordPage(1);
                    }}
                    className="px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {[5, 10, 20, 50].map(size => (
                      <option key={size} value={size}>{size} 条/页</option>
                    ))}
                  </select>
                  {totalRecordPages > 1 && (
                    <>
                      <button
                        onClick={() => setRecordPage(p => Math.max(1, p - 1))}
                        disabled={recordPage === 1}
                        className="px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        上一页
                      </button>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        第 {recordPage} / {totalRecordPages} 页
                      </span>
                      <button
                        onClick={() => setRecordPage(p => Math.min(totalRecordPages, p + 1))}
                        disabled={recordPage === totalRecordPages}
                        className="px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        下一页
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDcaModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">定投设置</h3>
              <button
                onClick={() => setShowDcaModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">开启定投</span>
                <button
                  onClick={() => setDcaSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${dcaSettings.enabled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${dcaSettings.enabled ? 'translate-x-7' : 'translate-x-1'}`}></span>
                </button>
              </div>
              
              {dcaSettings.enabled && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">定投方式</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDcaSettings(prev => ({ ...prev, type: 'amount' }))}
                        className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${dcaSettings.type === 'amount' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300'}`}
                      >
                        按金额定投
                      </button>
                      <button
                        onClick={() => setDcaSettings(prev => ({ ...prev, type: 'quantity' }))}
                        className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${dcaSettings.type === 'quantity' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300'}`}
                      >
                        按份额定投
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">定投周期</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { value: 'daily', label: '每日' },
                        { value: 'weekly', label: '每周' },
                        { value: 'biweekly', label: '每两周' },
                        { value: 'monthly', label: '每月' },
                      ].map(cycle => (
                        <button
                          key={cycle.value}
                          onClick={() => setDcaSettings(prev => ({ ...prev, cycle: cycle.value }))}
                          className={`px-2 py-1.5 text-xs rounded-lg border transition-colors ${dcaSettings.cycle === cycle.value ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300'}`}
                        >
                          {cycle.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {dcaSettings.type === 'amount' && (
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">定投金额（元）</label>
                      <input
                        type="number"
                        step="0.01"
                        value={dcaSettings.amount}
                        onChange={e => setDcaSettings(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                        placeholder="输入定投金额"
                      />
                    </div>
                  )}

                  {dcaSettings.type === 'quantity' && (
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">定投份额</label>
                      <input
                        type="number"
                        step="0.001"
                        value={dcaSettings.quantity}
                        onChange={e => setDcaSettings(prev => ({ ...prev, quantity: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                        placeholder="输入定投份额"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowDcaModal(false)}
                  className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => setShowDcaModal(false)}
                  className="flex-1 px-4 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRecognizeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">识别结果校验</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const newRecords = recognizedRecords.map(r => ({
                      id: Date.now() + Math.random(),
                      type: r.type,
                      direction: r.type,
                      date: r.date,
                      time: r.time,
                      transaction_date: `${r.date} ${r.time}`,
                      quantity: r.type === '分红' ? 0 : parseFloat(r.quantity) || 0,
                      shares: r.type === '分红' ? 0 : parseFloat(r.quantity) || 0,
                      price: r.type === '分红' ? '-' : parseFloat(r.price) || 0,
                      amount: parseFloat(r.amount) || 0,
                      fee: r.type === '分红' || r.fee === '-' ? '-' : parseFloat(r.fee) || 0,
                      commission: r.type === '分红' || r.fee === '-' ? '-' : parseFloat(r.fee) || 0,
                    })).sort((a, b) => {
                      const dateA = `${a.date} ${a.time}`;
                      const dateB = `${b.date} ${b.time}`;
                      return dateB.localeCompare(dateA);
                    });
                    setTradeRecords(prev => {
                      const updatedRecords = [...prev, ...newRecords];
                      saveTradeRecords(updatedRecords);
                      return updatedRecords;
                    });
                    setShowRecognizeModal(false);
                    setRecordPage(1);
                  }}
                  className="px-4 py-2 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                >
                  导入 ({recognizedRecords.length}条)
                </button>
                <button
                  onClick={() => setShowRecognizeModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">请检查识别出的交易记录，确认无误后点击导入</p>
              <div className="space-y-3">
                {recognizedRecords.map((record, idx) => (
                  <div key={record.id} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">记录 {idx + 1}</span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${record.type === '建仓' ? 'bg-blue-100 text-blue-600' : record.type === '买入' ? 'bg-green-100 text-green-600' : record.type === '卖出' ? 'bg-red-100 text-red-600' : record.type === '清仓' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                        {record.type}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-gray-500 dark:text-gray-400 block">日期</label>
                        <input
                          type="date"
                          value={record.date}
                          onChange={e => setRecognizedRecords(prev => prev.map(r => r.id === record.id ? { ...r, date: e.target.value } : r))}
                          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-gray-500 dark:text-gray-400 block">时间</label>
                        <input
                          type="time"
                          value={record.time}
                          onChange={e => setRecognizedRecords(prev => prev.map(r => r.id === record.id ? { ...r, time: e.target.value } : r))}
                          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                      {isDomesticIndoor ? (
                        <>
                          <div>
                            <label className="text-gray-500 dark:text-gray-400 block">价格</label>
                            <input
                              type="number"
                              step="0.01"
                              value={record.price}
                              onChange={e => {
                                const price = e.target.value;
                                const qty = record.quantity;
                                const amount = price && qty ? (parseFloat(price) * parseFloat(qty)).toFixed(2) : '';
                                setRecognizedRecords(prev => prev.map(r => r.id === record.id ? { ...r, price, amount } : r));
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-gray-500 dark:text-gray-400 block">数量</label>
                            <input
                              type="number"
                              step="1"
                              value={record.quantity}
                              onChange={e => {
                                const qty = e.target.value;
                                const price = record.price;
                                const amount = price && qty ? (parseFloat(price) * parseFloat(qty)).toFixed(2) : '';
                                setRecognizedRecords(prev => prev.map(r => r.id === record.id ? { ...r, quantity: qty, amount } : r));
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-gray-500 dark:text-gray-400 block">金额 (价格×数量)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={record.amount}
                              readOnly
                              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white bg-gray-100 dark:bg-slate-600 cursor-not-allowed"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-gray-500 dark:text-gray-400 block">费用</label>
                            <input
                              type="number"
                              step="0.01"
                              value={record.fee}
                              onChange={e => setRecognizedRecords(prev => prev.map(r => r.id === record.id ? { ...r, fee: e.target.value } : r))}
                              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="col-span-2">
                            <label className="text-gray-500 dark:text-gray-400 block">确认金额</label>
                            <input
                              type="number"
                              step="0.01"
                              value={record.amount}
                              onChange={e => setRecognizedRecords(prev => prev.map(r => r.id === record.id ? { ...r, amount: e.target.value } : r))}
                              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-gray-500 dark:text-gray-400 block">确认份额</label>
                            <input
                              type="number"
                              step="0.001"
                              value={record.quantity}
                              onChange={e => setRecognizedRecords(prev => prev.map(r => r.id === record.id ? { ...r, quantity: e.target.value } : r))}
                              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-gray-500 dark:text-gray-400 block">确认净值</label>
                            <input
                              type="number"
                              step="0.0001"
                              value={record.price}
                              onChange={e => setRecognizedRecords(prev => prev.map(r => r.id === record.id ? { ...r, price: e.target.value } : r))}
                              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-gray-500 dark:text-gray-400 block">手续费</label>
                            <input
                              type="number"
                              step="0.01"
                              value={record.fee}
                              onChange={e => setRecognizedRecords(prev => prev.map(r => r.id === record.id ? { ...r, fee: e.target.value } : r))}
                              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                            />
                          </div>
                        </>
                      )}
                      <div className="flex items-center justify-end col-span-2">
                        <button
                          onClick={() => setRecognizedRecords(prev => prev.filter(r => r.id !== record.id))}
                          className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="删除此条"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-slate-700">
              <button
                onClick={() => setRecognizedRecords(prev => [...prev, {
                  id: Date.now() + Math.random(),
                  type: '买入',
                  date: new Date().toISOString().split('T')[0],
                  time: '09:30',
                  price: '',
                  quantity: '',
                  amount: '',
                  fee: '',
                }])}
                className="w-full mb-3 px-4 py-2 text-sm border border-dashed border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors text-gray-500 dark:text-gray-400"
              >
                + 添加遗漏记录
              </button>
              <button
                onClick={() => setShowRecognizeModal(false)}
                className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ═══════════════════════════════════════════
//  主组件
// ═══════════════════════════════════════════

export default function Finance({ onAssetPenetration }) {
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [holdingsTab, setHoldingsTab] = useState('active');
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [quotesMap, setQuotesMap] = useState({});
  const [quotesLoading, setQuotesLoading] = useState(false);
  // 缓存上次成功获取的不为0的行情数据，当现价取不到最新值或为0时回退使用
  const lastValidQuotesRef = useRef({});

  // 汇率和币种切换状态
  const [exchangeRates, setExchangeRates] = useState({ CNY: 1, USD: 7.15, JPY: 0.046, HKD: 0.86, EUR: 7.85 });
  const [selectedCurrency, setSelectedCurrency] = useState('CNY');

  // 标签管理状态
  const [books, setBooks] = useState([]);
  const _LS_TAGS_KEY = 'finance_tags_global';
  const [tags, setTags] = useState(() => {
    try {
      const saved = localStorage.getItem(_LS_TAGS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  // 将标签变更持久化到 localStorage
  useEffect(() => {
    try { localStorage.setItem(_LS_TAGS_KEY, JSON.stringify(tags)); } catch {}
  }, [tags, _LS_TAGS_KEY]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagToEdit, setTagToEdit] = useState(null);
  const [newTagName, setNewTagName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [categoryL3CustomOptions, setCategoryL3CustomOptions] = useState([]);
  const [showCategoryL3Modal, setShowCategoryL3Modal] = useState(false);
  const [categoryL3ToEdit, setCategoryL3ToEdit] = useState(null);
  const [newCategoryL3Name, setNewCategoryL3Name] = useState('');

  const [categoryL4Options, setCategoryL4Options] = useState({});
  const [showCategoryL4Modal, setShowCategoryL4Modal] = useState(false);
  const [categoryL4ToEdit, setCategoryL4ToEdit] = useState(null);
  const [newCategoryL4Name, setNewCategoryL4Name] = useState('');

  // 资产类型自定义管理
  const DEFAULT_ASSET_TYPE_OPTIONS = ['股票', '基金', '债券', '现金', '期货', '期权', '外汇', '保险', '房产', '实体投资', '黄金', '白银', '原油', '数字货币', '银行理财', '其他'];
  // 一级分类 → 资产类型 映射（选择一级分类后联动筛选资产类型）
  const CATEGORY_L1_ASSET_TYPES = {
    '权益类': ['股票', '基金', '期货', '期权', '外汇'],
    '固收类': ['债券', '银行理财'],
    '现金类': ['现金', '银行理财'],
    '另类投资': ['房产', '实体投资', '数字货币', '其他'],
    '商品类': ['黄金', '白银', '原油'],
    '债权类': ['债券'],
    '分红类': ['股票', '基金'],
  };
  const [assetTypeOptions, setAssetTypeOptions] = useState(() => {
    const saved = localStorage.getItem('finance_asset_type_options');
    return saved ? JSON.parse(saved) : DEFAULT_ASSET_TYPE_OPTIONS;
  });
  const [showAssetTypeModal, setShowAssetTypeModal] = useState(false);
  const [assetTypeToEdit, setAssetTypeToEdit] = useState(null);
  const [newAssetTypeName, setNewAssetTypeName] = useState('');

  // 资产种类自定义管理
  const DEFAULT_ASSET_KIND_OPTIONS = ['流动资产', '非流动资产', '现金'];
  const [assetKindOptions, setAssetKindOptions] = useState(() => {
    const saved = localStorage.getItem('finance_asset_kind_options');
    const parsed = saved ? JSON.parse(saved) : DEFAULT_ASSET_KIND_OPTIONS;
    const deduped = [...new Set(parsed)];
    const garbledPattern = /^[?？�]+$/;
    const filtered = deduped.filter(item =>
      item && item.trim() && !garbledPattern.test(item.trim()) && item.trim() !== '??'
    );
    if (filtered.length !== deduped.length) {
      localStorage.setItem('finance_asset_kind_options', JSON.stringify(filtered));
    } else if (saved && deduped.length !== parsed.length) {
      localStorage.setItem('finance_asset_kind_options', JSON.stringify(deduped));
    }
    return filtered;
  });

  // 一级分类自定义管理（从资产分类模块动态获取）
  const DEFAULT_CATEGORY_L1_OPTIONS = ['权益类', '债权类', '现金类', '商品类', '分红类', '固收类', '另类投资'];
  const [categoryL1Options, setCategoryL1Options] = useState(DEFAULT_CATEGORY_L1_OPTIONS);

  // 当 assetClasses 数据加载后，动态更新一级分类选项（与本地存储的自定义选项合并去重）
  useEffect(() => {
    const saved = localStorage.getItem('finance_category_l1_options');
    const savedOptions = saved ? JSON.parse(saved) : [];
    const assetClassNames = stateData?.assetClasses?.map(c => c.name)?.filter(Boolean) || [];
    // 合并：以本地存储为主，补充资产分类模块新增的项
    const merged = [...new Set([...savedOptions, ...assetClassNames, ...DEFAULT_CATEGORY_L1_OPTIONS])].sort();
    setCategoryL1Options(merged);
  }, [stateData?.assetClasses]);
  const [showCategoryL1Modal, setShowCategoryL1Modal] = useState(false);
  const [categoryL1ToEdit, setCategoryL1ToEdit] = useState(null);
  const [newCategoryL1Name, setNewCategoryL1Name] = useState('');

  // 二级分类自定义管理（按一级分类 + 资产类型分组，key格式: `${l1}__${assetType}`）
  const [categoryL2OptionsMap, setCategoryL2OptionsMap] = useState(() => {
    const saved = localStorage.getItem('finance_category_l2_options_v2');
    if (saved) return JSON.parse(saved);
    // 初始化默认值（按一级分类 + 资产类型组合）
    return {
      '权益类__股票': ['A股', '港股', '美股', '其他'],
      '债权类__债券': ['中债', '美债', '其他'],
      '现金类__现金': ['活期存款', '定期存款'],
      '商品类__黄金': ['场内黄金', '场外黄金'],
      '商品类__白银': ['场内白银', '场外白银'],
      '商品类__原油': ['场内原油', '场外原油'],
      '分红类__股票': ['A股', '固定投资', '其他'],
      '固收类__债券': ['中债', '其他'],
      '另类投资__其他': ['其他'],
    };
  });
  const [showCategoryL2Modal, setShowCategoryL2Modal] = useState(false);
  const [categoryL2ToEdit, setCategoryL2ToEdit] = useState(null);
  const [newCategoryL2Name, setNewCategoryL2Name] = useState('');

  // 三级分类自定义管理（按一级+二级分类分组）
  const [categoryL3OptionsMap, setCategoryL3OptionsMap] = useState(() => {
    const saved = localStorage.getItem('finance_category_l3_options');
    if (saved) return JSON.parse(saved);
    return {};
  });

  const DEFAULT_POSITION_GROUP_OPTIONS = ['核心仓位', '卫星仓位', '观察仓位', '套利仓位', '现金仓位'];
  const [positionGroupOptions, setPositionGroupOptions] = useState(DEFAULT_POSITION_GROUP_OPTIONS);
  const [showPositionGroupModal, setShowPositionGroupModal] = useState(false);
  const [positionGroupToEdit, setPositionGroupToEdit] = useState(null);
  const [newPositionGroupName, setNewPositionGroupName] = useState('');

  // 批量编辑状态
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchEditData, setBatchEditData] = useState({
    market: '',
    currency: '',
    assetType: '',
    account: '',
    categoryL1: '',
    categoryL2: '',
    categoryL3: '',
    positionGroup: '',
    positionType: '',
    tag: ''
  });

  const [positionTypeOptionsMap, setPositionTypeOptionsMap] = useState({});
  const [deletedPositionTypeMap, setDeletedPositionTypeMap] = useState({});
  const [showPositionTypeModal, setShowPositionTypeModal] = useState(false);
  const [positionTypeToEdit, setPositionTypeToEdit] = useState(null);
  const [newPositionTypeName, setNewPositionTypeName] = useState('');

  // 新增弹窗表单状态
  const [newAccount, setNewAccount] = useState({
    market: '国内市场',
    currency: 'CNY',
    assetKind: '',
    assetType: '',
    account: '',
    categoryL1: '',
    categoryL2: '',
    categoryL3: '',
    positionGroup: '',
    positionType: '',
    name: '',
    code: '',
    cost: '',
    quantity: '',
    currentPrice: '',
    prevPrice: '',
    priceDate: '',
    avgBuyPrice: '',
    holdingDays: '',
    holdingPnl: '',
    holdingPnlRate: '',
    dailyPnl: '',
    dailyPnlRate: '',
    currentValue: '',
    tags: '',
  });

  // 自动计算当前市值
  useEffect(() => {
    const price = parseFloat(newAccount.currentPrice);
    const qty = parseFloat(newAccount.quantity);
    let newValue = '';
    if (!isNaN(price) && !isNaN(qty) && price > 0 && qty > 0) {
      newValue = (price * qty).toFixed(2);
    }
    setNewAccount(prev => {
      if (prev.currentValue === newValue) return prev;
      return { ...prev, currentValue: newValue };
    });
  }, [newAccount.currentPrice, newAccount.quantity]);

  const [saving, setSaving] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);

  const [lookupResults, setLookupResults] = useState([]);
  const [showLookupDropdown, setShowLookupDropdown] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const lookupTimerRef = useRef(null);

  // 搜索源配置：默认源 + 用户自定义源
  const DEFAULT_SEARCH_ENGINES = [
    { id: 'baidu', name: '百度财经', url: 'https://finance.baidu.com/search?keyword={q}' },
    { id: 'eastmoney', name: '东方财富', url: 'https://so.eastmoney.com/web/s?keyword={q}' },
    { id: 'xueqiu', name: '雪球', url: 'https://xueqiu.com/query/v1/search/web.json?q={q}' },
    { id: '10jqka', name: '同花顺', url: 'https://search.10jqka.com.cn/search?word={q}' },
    { id: 'sina', name: '新浪财经', url: 'https://search.sina.com.cn/news?q={q}' },
  ];
  const [searchEngines, setSearchEngines] = useState(() => {
    try {
      const saved = localStorage.getItem('finance_search_engines');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return DEFAULT_SEARCH_ENGINES;
  });
  const [showEngineMenu, setShowEngineMenu] = useState(false);
  const [showAddEngine, setShowAddEngine] = useState(false);
  const [newEngine, setNewEngine] = useState({ name: '', url: '' });
  const [engineToast, setEngineToast] = useState(null);
  const engineMenuRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem('finance_search_engines', JSON.stringify(searchEngines));
    } catch (e) {}
  }, [searchEngines]);

  useEffect(() => {
    if (!showEngineMenu) return;
    const handler = (e) => {
      if (engineMenuRef.current && !engineMenuRef.current.contains(e.target)) {
        setShowEngineMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEngineMenu]);

  const openSearchEngine = (engine, query) => {
    const url = engine.url.replace('{q}', encodeURIComponent(query));
    window.open(url, '_blank', 'noopener,noreferrer');
    setEngineToast({ message: `已切换到「${engine.name}」搜索源`, type: 'success' });
    setTimeout(() => setEngineToast(null), 2500);
  };

  const addSearchEngine = () => {
    if (!newEngine.name.trim() || !newEngine.url.trim()) return;
    if (!newEngine.url.includes('{q}')) return;
    setSearchEngines(prev => [...prev, {
      id: 'custom_' + Date.now(),
      name: newEngine.name.trim(),
      url: newEngine.url.trim(),
    }]);
    setNewEngine({ name: '', url: '' });
    setShowAddEngine(false);
  };

  const removeSearchEngine = (id) => {
    setSearchEngines(prev => prev.filter(e => e.id !== id || DEFAULT_SEARCH_ENGINES.some(d => d.id === id)));
  };

  const resetSearchEngines = () => {
    setSearchEngines(DEFAULT_SEARCH_ENGINES);
  };

  const renderNoMatchWithEngineSearch = (query) => (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-gray-400 dark:text-gray-500">无匹配结果</span>
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.stopPropagation(); setShowEngineMenu(!showEngineMenu); }}
            className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
          >
            <Search className="w-3 h-3" />
            换源搜索
          </button>
          {showEngineMenu && (
            <div
              ref={engineMenuRef}
              className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-50 py-1"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-600">
                外部搜索源
              </div>
              {searchEngines.map(engine => (
                <div key={engine.id} className="flex items-center group">
                  <button
                    type="button"
                    onClick={() => openSearchEngine(engine, query)}
                    className="flex-1 text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600 flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 flex-shrink-0" />
                    {engine.name}
                  </button>
                  {DEFAULT_SEARCH_ENGINES.some(d => d.id === engine.id) ? null : (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeSearchEngine(engine.id); }}
                      className="opacity-0 group-hover:opacity-100 pr-2 py-1 text-gray-400 hover:text-red-500 transition-opacity"
                      title="删除"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <div className="border-t border-gray-100 dark:border-slate-600 mt-1 pt-1">
                {showAddEngine ? (
                  <div className="px-3 py-2 space-y-1.5">
                    <input
                      type="text"
                      value={newEngine.name}
                      onChange={e => setNewEngine({ ...newEngine, name: e.target.value })}
                      placeholder="名称"
                      className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-slate-500 rounded bg-white dark:bg-slate-600 text-gray-800 dark:text-white"
                    />
                    <input
                      type="text"
                      value={newEngine.url}
                      onChange={e => setNewEngine({ ...newEngine, url: e.target.value })}
                      placeholder="URL (用 {q} 代表关键词)"
                      className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-slate-500 rounded bg-white dark:bg-slate-600 text-gray-800 dark:text-white"
                    />
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={addSearchEngine}
                        className="flex-1 px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      >
                        添加
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowAddEngine(false); setNewEngine({ name: '', url: '' }); }}
                        className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddEngine(true)}
                    className="w-full text-left px-3 py-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-gray-50 dark:hover:bg-slate-600 flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    添加搜索源
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetSearchEngines}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600 flex items-center gap-2 border-t border-gray-100 dark:border-slate-600"
                >
                  恢复默认
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {engineToast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 text-sm text-white ${engineToast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {engineToast.message}
        </div>
      )}
    </div>
  );

  const { accounts = [], assetClasses = [], financeAssets = [] } = stateData || {};

  // 页面级分页（账户本区域）
  const [accountBookPage, setAccountBookPage] = useState(1);
  const ACCOUNTS_PER_PAGE = 6;

  useEffect(() => {
    loadData();
    loadBooksAndTags();
    loadExchangeRates();
    const saved = localStorage.getItem('finance_categoryL3_options');
    if (saved) {
      try {
        setCategoryL3CustomOptions(JSON.parse(saved));
      } catch {
        setCategoryL3CustomOptions([]);
      }
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      loadExchangeRates();
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // 每30秒轮询行情数据（含港股通汇率转换 + 场外基金净值）
  useEffect(() => {
    const timer = setInterval(async () => {
      if (!stateData?.financeAssets || stateData.financeAssets.length === 0) return;
      try {
        const latestRates = await loadExchangeRates(false);
        await loadQuotes(stateData.financeAssets, stateData, latestRates);
        await loadFundNav(stateData.financeAssets, stateData);
      } catch (e) {
        console.warn('定时行情刷新失败:', e);
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [stateData]);

  // 汇率变化时，使用原始 HKD 价格重新计算港股通资产的折算价格
  useEffect(() => {
    if (!exchangeRates?.HKD || !stateData?.financeAssets) return;
    const hkdRate = Number(exchangeRates.HKD) || 0.86;
    const hkAssets = stateData.financeAssets.filter(a => a.categoryL2 === '港股通');
    if (hkAssets.length === 0) return;
    setQuotesMap(prev => {
      const next = { ...prev };
      let changed = false;
      hkAssets.forEach(asset => {
        const key = String(asset.code);
        const q = prev[key];
        if (q && q.rawCurrent != null) {
          const newPrice = Math.trunc(q.rawCurrent * hkdRate * 10000) / 10000;
          const newPrevClose = q.rawPreviousClose != null
            ? Math.trunc(q.rawPreviousClose * hkdRate * 10000) / 10000
            : null;
          if (Math.abs(newPrice - q.price) > 0.0001) {
            next[key] = {
              ...q,
              current: newPrice,
              price: newPrice,
              previousClose: newPrevClose,
              prevClose: newPrevClose,
            };
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [exchangeRates?.HKD]);

  const loadExchangeRates = async (force = false) => {
    try {
      const rates = await fetchRealTimeExchangeRates(force);
      setExchangeRates(rates);
      return rates;
    } catch (err) {
      console.error('Failed to load exchange rates:', err);
      return null;
    }
  };

  useEffect(() => {
    if (accounts && accounts.length > 0) {
      localStorage.setItem('wealth_os_accounts', JSON.stringify(accounts));
    }
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('finance_categoryL3_options', JSON.stringify(categoryL3CustomOptions));
  }, [categoryL3CustomOptions]);

  useEffect(() => {
    const saved = localStorage.getItem('finance_categoryL4_options');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCategoryL4Options(typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {});
      } catch {
        setCategoryL4Options({});
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('finance_categoryL4_options', JSON.stringify(categoryL4Options));
  }, [categoryL4Options]);

  useEffect(() => {
    const saved = localStorage.getItem('finance_position_group_options');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPositionGroupOptions(parsed);
        }
      } catch {
        setPositionGroupOptions(DEFAULT_POSITION_GROUP_OPTIONS);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('finance_position_group_options', JSON.stringify(positionGroupOptions));
  }, [positionGroupOptions]);

  useEffect(() => {
    const saved = localStorage.getItem('finance_position_type_options_map');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          setPositionTypeOptionsMap(parsed);
          return;
        }
      } catch {
        // ignore
      }
    }
    // 兼容旧版扁平数组格式
    const oldSaved = localStorage.getItem('finance_position_type_options');
    if (oldSaved) {
      try {
        const parsed = JSON.parse(oldSaved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const migrated = { '其他': parsed };
          setPositionTypeOptionsMap(migrated);
          localStorage.setItem('finance_position_type_options_map', JSON.stringify(migrated));
        }
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('finance_position_type_options_map', JSON.stringify(positionTypeOptionsMap));
  }, [positionTypeOptionsMap]);

  useEffect(() => {
    const saved = localStorage.getItem('finance_position_type_deleted_map');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setDeletedPositionTypeMap(parsed);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('finance_position_type_deleted_map', JSON.stringify(deletedPositionTypeMap));
  }, [deletedPositionTypeMap]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 每次手动刷新全局数据时强制获取最新汇率（必须 await 确保汇率先加载）
      const latestRates = await loadExchangeRates(true);
      const data = await fetchState();
      // 补充账户数据：如果 state 中 accounts 为空，从 localStorage 缓存中读取
      if (!data.accounts || data.accounts.length === 0) {
        const cachedAccounts = localStorage.getItem('wealth_os_accounts');
        if (cachedAccounts) {
          try {
            const parsed = JSON.parse(cachedAccounts);
            if (Array.isArray(parsed) && parsed.length > 0) {
              data.accounts = parsed;
            }
          } catch {
            /* ignore parse error */
          }
        }
        // 如果缓存也为空，使用默认账户
        if (!data.accounts || data.accounts.length === 0) {
          data.accounts = [
            { id: '1', name: '工商银行储蓄卡', owner: '本人', currency: 'CNY', type: 'bank', balance: 10000, liability: 0, enabled: true, is_default: true, sort_order: 0 },
            { id: '2', name: '支付宝余额', owner: '本人', currency: 'CNY', type: 'wallet', balance: 5000, liability: 0, enabled: true, is_default: false, sort_order: 1 },
            { id: '3', name: '微信零钱', owner: '本人', currency: 'CNY', type: 'wallet', balance: 2000, liability: 0, enabled: true, is_default: false, sort_order: 2 },
          ];
        }
      }
      // 为老数据补建仓交易记录
      if (data?.financeAssets && data.financeAssets.length > 0) {
        let needsUpdate = false;
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const _date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const _time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
        data.financeAssets = data.financeAssets.map(asset => {
          if (!asset.transactions || asset.transactions.length === 0) {
            needsUpdate = true;
            const _costPrice = parseFloat(asset.costPrice) || 0;
            const _qty = parseFloat(asset.shares) || 0;
            const isOutdoor = asset.tertiaryCategory === '场外' || asset.categoryL3 === '场外';
            return {
              ...asset,
              transactions: [{
                id: Date.now() + Math.random(),
                direction: '建仓',
                type: '建仓',
                transaction_date: `${_date} ${_time}`,
                date: _date,
                time: _time,
                shares: _qty,
                quantity: _qty,
                price: _costPrice,
                net_value: isOutdoor ? _costPrice : undefined,
                amount: _costPrice * _qty,
                commission: 0,
                fee: 0,
              }],
            };
          }
          return asset;
        });
        // 如果有数据被补充，异步保存
        if (needsUpdate) {
          saveState({ ...data }).catch(err => console.error('Failed to backfill transactions:', err));
        }
      }
      // 解析交易记录中的现金账户名称
      if (data?.financeAssets && data.financeAssets.length > 0) {
        const accountsMap = {};
        (data.accounts || []).forEach(acc => { accountsMap[acc.id] = acc.name; });
        data.financeAssets = data.financeAssets.map(asset => {
          if (!asset.transactions || asset.transactions.length === 0) return asset;
          return {
            ...asset,
            transactions: asset.transactions.map(t => ({
              ...t,
              cashAccountName: t.cashAccountName || accountsMap[t.cashAccountId] || '',
            })),
          };
        });
      }
      // 解析归档交易记录中的现金账户名称
      if (data?.financeAssetArchives && data.financeAssetArchives.length > 0) {
        const accountsMap = {};
        (data.accounts || []).forEach(acc => { accountsMap[acc.id] = acc.name; });
        data.financeAssetArchives = data.financeAssetArchives.map(archive => {
          if (!archive.transactions || archive.transactions.length === 0) return archive;
          return {
            ...archive,
            transactions: archive.transactions.map(t => ({
              ...t,
              cashAccountName: t.cashAccountName || accountsMap[t.cashAccountId] || '',
            })),
          };
        });
      }
      // 自动修复历史现金类资产数据：1)负数转非负 2)补全缺失的表单字段名 3)持久化
      if (data?.financeAssets && data.financeAssets.length > 0) {
        let cashDataDirty = false;
        data.financeAssets = data.financeAssets.map(asset => {
          const isCash = asset.category === '现金类' || asset.categoryL1 === '现金类';
          if (!isCash) return asset;
          const origCV = parseFloat(asset.currentValue);
          const origShares = parseFloat(asset.shares);
          const origQty = parseFloat(asset.quantity);
          const origCost = parseFloat(asset.cost);
          const origBalance = parseFloat(asset.balance);
          const fixedCV = Number.isFinite(origCV) ? origCV : 0;
          const fixedShares = Number.isFinite(origShares) ? Math.max(0, origShares) : 0;
          const fixedQty = Number.isFinite(origQty) ? Math.max(0, origQty) : 0;
          const fixedCost = Number.isFinite(origCost) ? Math.max(0, origCost) : 0;
          const fixedBalance = Number.isFinite(origBalance) ? origBalance : 0;
          const hasNeg =
            (Number.isFinite(origShares) && origShares < 0) ||
            (Number.isFinite(origQty) && origQty < 0) ||
            (Number.isFinite(origCost) && origCost < 0);
          // 检查是否缺少表单字段名（quantity 为 0 不算缺失，只检查 null/undefined/空串）
          const quantityMissing = asset.quantity == null || asset.quantity === '';
          const missingFormFields =
            !asset.assetType || !asset.categoryL1 || !asset.categoryL2 ||
            !asset.categoryL3 || !asset.positionType || !asset.account ||
            quantityMissing;
          if (hasNeg || missingFormFields) {
            cashDataDirty = true;
            return {
              ...asset,
              currentValue: fixedCV,
              // 注意：quantity/shares 用存储值（若非有效数值则回退到 currentValue），
              // 绝不允许用 currentValue 覆盖已有的有效数量
              shares: Number.isFinite(origShares) ? fixedShares : Math.max(0, fixedCV || fixedShares),
              quantity: Number.isFinite(origQty) ? fixedQty : Math.max(0, fixedCV || fixedQty),
              cost: fixedCost,
              balance: fixedBalance,
              availableShares: Number.isFinite(parseFloat(asset.availableShares)) ? Math.max(0, parseFloat(asset.availableShares)) : (fixedShares || fixedCV),
              // 补全表单字段名（使用已有存储字段的回退值）
              assetType: asset.assetType || asset.kind || '现金',
              categoryL1: asset.categoryL1 || asset.category || '现金类',
              categoryL2: asset.categoryL2 || asset.subcategory || '',
              categoryL3: asset.categoryL3 || asset.tertiaryCategory || '',
              positionType: asset.positionType || asset.positionCategory || '',
              account: asset.account || asset.accountId || '',
            };
          }
          return asset;
        });
        if (cashDataDirty) {
          saveState({ ...data }).catch(err => console.error('Failed to sanitize cash assets:', err));
        }
      }
      // 修复 "??" 乱码字段
      const GARBLED_PATTERN_LOCAL = /^[?？�\s]+$/;
      const sanitizeField = (val, fallback) => {
        if (!val || GARBLED_PATTERN_LOCAL.test(String(val).trim())) {
          return fallback || '';
        }
        return val;
      };
      if (data?.financeAssets && data.financeAssets.length > 0) {
        data.financeAssets = data.financeAssets.map(asset => ({
          ...asset,
          name: sanitizeField(asset.name, asset.name),
          market: sanitizeField(asset.market, '国内市场'),
          assetKind: sanitizeField(asset.assetKind || asset.kind, ''),
          category: sanitizeField(asset.category, ''),
          subcategory: sanitizeField(asset.subcategory, ''),
          tertiaryCategory: sanitizeField(asset.tertiaryCategory, ''),
          categoryL1: sanitizeField(asset.categoryL1 || asset.category, ''),
          categoryL2: sanitizeField(asset.categoryL2 || asset.subcategory, ''),
          categoryL3: sanitizeField(asset.categoryL3 || asset.tertiaryCategory, ''),
        }));
      }
      setStateData(data);
      setLoading(false);
      const financeAssetsData = data?.financeAssets || [];
      if (financeAssetsData.length > 0) {
        loadQuotes(financeAssetsData, data, latestRates).catch(err =>
          console.error('Background quotes load failed:', err)
        );
        loadFundNav(financeAssetsData, data).catch(err =>
          console.error('Background fund nav load failed:', err)
        );
      }
    } catch (err) {
      console.error('Failed to load finance data:', err);
      setError('加载数据失败');
      setLoading(false);
    }
  };

  const loadQuotes = async (financeAssetsData, currentState, latestRates = null) => {
    if (!financeAssetsData || financeAssetsData.length === 0) return;
    const codes = financeAssetsData
      .filter(a => {
        if (!a.code) return false;
        if (a.kind === 'cash' || a.categoryL2 === '现金' || a.assetType === '现金' || a.categoryL1 === '现金类') return false;
        const catL3 = a.categoryL3 || a.tertiaryCategory;
        const isStock = a.assetType === '股票' || a.kind === '股票';
        // 股票类资产无论场内/场外都获取实时行情
        // 只有基金类且标记为场外的才过滤掉（由 loadFundNav 处理）
        if (!isStock && (catL3 === '场外' || (!catL3 && a.market === '场外基金'))) return false;
        return true;
      })
      .map(a => ({ code: a.code, market: a.market || '国内市场' }));
    if (codes.length === 0) return;
    setQuotesLoading(true);
    try {
      const BATCH_SIZE = 20;
      const BATCH_DELAY = 100;
      const allQuotes = [];
      const firstBatch = codes.slice(0, BATCH_SIZE);
      const firstQuotes = await fetchFinanceQuotes(firstBatch);
      allQuotes.push(...firstQuotes);
      if (codes.length > BATCH_SIZE) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        const secondBatch = codes.slice(BATCH_SIZE);
        const secondQuotes = await fetchFinanceQuotes(secondBatch);
        allQuotes.push(...secondQuotes);
      }
      const quotes = allQuotes;
      const map = {};
      // 港股通汇率转换：优先使用传入的最新汇率，确保汇率值是最新的
      const hkdRate = Number(latestRates?.HKD || exchangeRates?.HKD) || 0.92;
      const hkStockConnectCodes = new Set(
        (financeAssetsData || [])
          .filter(a => a.categoryL2 === '港股通')
          .map(a => String(a.code))
      );
      // 调试日志
      const hkAssets = (financeAssetsData || []).filter(a => a.categoryL2 === '港股通');
      if (hkAssets.length > 0) {
        console.log('[DEBUG] 港股通资产:', JSON.stringify(hkAssets.map(a => ({ code: a.code, codeType: typeof a.code, categoryL2: a.categoryL2 }))));
        console.log('[DEBUG] 汇率 hkdRate:', hkdRate, 'latestRates:', latestRates?.HKD, 'state HKD:', exchangeRates?.HKD);
        console.log('[DEBUG] 获取到的行情数据:', JSON.stringify(quotes.filter(q => q && q.code)));
      }
      quotes.forEach(q => {
        if (q && q.code) {
          const codeKey = String(q.code);
          const prev = lastValidQuotesRef.current[codeKey];
          // 当现价取不到最新值或为0时，使用上一次保留不为0的数据
          if ((q.price == null || Number(q.price) === 0) && prev && prev.price != null && prev.price !== 0) {
            q = {
              ...prev,
              ...q,
              price: prev.price,
              prevClose: q.prevClose ?? prev.prevClose,
              changePct: q.changePct ?? prev.changePct,
              changeAmt: q.changeAmt ?? prev.changeAmt,
              high: q.high ?? prev.high,
              low: q.low ?? prev.low,
              name: q.name || prev.name,
            };
          }
          const isHKConnect = hkStockConnectCodes.has(codeKey);
          if (isHKConnect) {
            // 港股通资产：存储原始 HKD 价格 + 转换后的 CNY 价格
            const converted = { ...q };
            converted.rawCurrent = q.price != null ? Number(q.price) : null;
            converted.rawPreviousClose = q.prevClose != null ? Number(q.prevClose) : null;
            if (q.price != null && Number.isFinite(Number(q.price))) {
              converted.current = Math.trunc(Number(q.price) * hkdRate * 10000) / 10000;
              converted.price = converted.current;
            }
            if (q.prevClose != null && Number.isFinite(Number(q.prevClose))) {
              converted.previousClose = Math.trunc(Number(q.prevClose) * hkdRate * 10000) / 10000;
              converted.prevClose = converted.previousClose;
            }
            if (q.changePct != null && Number.isFinite(Number(q.changePct))) {
              converted.changePct = Number(q.changePct);
            }
            console.log('[DEBUG] 港股转换:', q.code, 'rawPrice=', q.price, 'hkdRate=', hkdRate, 'convertedPrice=', converted.price);
            map[codeKey] = converted;
          } else {
            map[codeKey] = q;
          }
          // 仅当 price 有效（非0非null）时更新缓存
          if (q.price != null && Number(q.price) !== 0) {
            lastValidQuotesRef.current[codeKey] = { ...q };
          }
        }
      });
      // 使用行情返回的正确名称覆盖"??"乱码
      let nameFixed = false;
      const fixedAssets = (currentState?.financeAssets || []).map(a => {
        const quote = quotes.find(r => r && r.code === a.code);
        if (quote?.name && (!a.name || GARBLED_PATTERN.test(String(a.name).trim()))) {
          nameFixed = true;
          return { ...a, name: quote.name };
        }
        return a;
      });
      if (nameFixed) {
        currentState.financeAssets = fixedAssets;
        setStateData({ ...currentState });
        saveState({ ...currentState }).catch(() => {});
      }
      setQuotesMap(map);
      // 把最新行情数据回写到 financeAssets 并保存
      if (currentState && Object.keys(map).length > 0) {
        let changed = false;
        const updatedAssets = (currentState.financeAssets || []).map(a => {
          const key = String(a.code);
          const q = map[key];
          if (!q) return a;
          let newPrice = Number.isFinite(Number(q.price)) ? Number(q.price) : null;
          // 备用：如果 price 为 0 但有 rawCurrent，用 rawCurrent * hkdRate 重算
          if ((newPrice == null || newPrice === 0) && q.rawCurrent != null) {
            newPrice = Math.trunc(Number(q.rawCurrent) * hkdRate * 10000) / 10000;
            console.log('[DEBUG] 使用备用计算:', a.code, 'rawCurrent=', q.rawCurrent, 'newPrice=', newPrice);
          }
          const newPrev = Number.isFinite(Number(q.prevClose)) ? Number(q.prevClose) : null;
          const newDate = q.date || a.priceDate || '';
          if (newPrice == null && newPrev == null) return a;
          changed = true;
          const qty = parseFloat(a.quantity) || parseFloat(a.shares) || 0;
          // 当现价取不到最新值或为0时，保留上一次不为0的 currentPrice，不覆盖为0
          const effectivePrice = (newPrice != null && newPrice !== 0) ? newPrice : a.currentPrice;
          const curVal = (effectivePrice != null && effectivePrice !== 0) ? effectivePrice * qty : a.currentValue;
          return {
            ...a,
            currentPrice: effectivePrice,
            prevPrice: newPrev != null ? newPrev : a.prevPrice,
            priceDate: newDate,
            currentValue: curVal,
          };
        });
        if (changed) {
          const newState = { ...currentState, financeAssets: updatedAssets };
          setStateData(newState);
          try {
            await saveState(newState);
          } catch (e) {
            console.warn('保存股票行情失败:', e);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load quotes:', err);
    } finally {
      setQuotesLoading(false);
    }
  };

  // 天天基金网：场外基金净值自动获取
  const loadFundNav = async (financeAssetsData, currentState) => {
    if (!financeAssetsData || financeAssetsData.length === 0) return;
    const fundItems = financeAssetsData.filter(a => {
      if (!a.code || !/^\d{6}$/.test(String(a.code).trim())) return false;
      const catL3 = a.categoryL3 || a.tertiaryCategory;
      const isFundOrBond = a.assetType === '基金' || a.assetType === '债券' || a.kind === '基金' || a.kind === '债券';
      return isFundOrBond && (catL3 === '场外' || (!catL3 && a.market === '场外基金'));
    });
    if (fundItems.length === 0) return;
    try {
      const codes = fundItems.map(a => ({ code: a.code }));
      const funds = await fetchFundNav(codes);
      console.log('[DEBUG-FRONT] 基金净值API返回:', JSON.stringify(funds, null, 2));
      if (!funds || funds.length === 0) return;
      let changed = false;
      const updatedAssets = (currentState?.financeAssets || []).map(a => {
        const fund = funds.find(f => f.code === a.code);
        if (!fund) return a;
        const newNav = Number.isFinite(Number(fund.nav)) ? Number(fund.nav) : null;
        const newPrevNav = Number.isFinite(Number(fund.prevNav)) ? Number(fund.prevNav) : null;
        const newAccNav = Number.isFinite(Number(fund.accumulatedNav)) ? Number(fund.accumulatedNav) : null;
        const newDate = fund.navDate || a.priceDate || '';
        const newChangePct = Number.isFinite(Number(fund.dailyChangePct)) ? Number(fund.dailyChangePct) : null;
        const storedCurrentPrice = parseFloat(a.currentPrice) || 0;
        // 回退链：
        // 1. API返回有效nav -> 使用nav
        // 2. nav无效但prevNav有效（上一交易日净值）-> 使用prevNav作为currentPrice
        // 3. 都无效 -> 保留用户上次输入的currentPrice
        let finalCurrentPrice = a.currentPrice;
        let finalPrevPrice = a.prevPrice;
        let finalPrevNavForPrev = null;
        if (newNav != null && newNav > 0) {
          // 正常获取到净值
          finalCurrentPrice = String(newNav);
          if (newPrevNav != null && newPrevNav > 0) {
            finalPrevPrice = String(newPrevNav);
          }
          changed = true;
        } else if (newPrevNav != null && newPrevNav > 0 && storedCurrentPrice === 0) {
          // nav为0/无效，但prevNav有效且当前存储价也为0 -> 使用prevNav作为当前价（上一交易日净值）
          finalCurrentPrice = String(newPrevNav);
          changed = true;
        } else if (storedCurrentPrice > 0) {
          // API没返回数据，但有用户输入的历史价格 -> 保留
          finalCurrentPrice = a.currentPrice;
        }
        if (newPrevNav != null && newPrevNav > 0) {
          finalPrevNavForPrev = newPrevNav;
          if (newNav == null || newNav === 0) {
            // 当前nav无效时，用prevNav作为计算基础
          } else {
            finalPrevPrice = String(newPrevNav);
          }
        }
        if (!changed && finalPrevPrice === a.prevPrice && finalCurrentPrice === a.currentPrice) return a;
        changed = true;
        return {
          ...a,
          currentPrice: finalCurrentPrice,
          prevPrice: finalPrevPrice,
          accumulatedNav: newAccNav != null ? newAccNav : a.accumulatedNav,
          priceDate: newDate,
          dailyChangePct: newChangePct != null ? newChangePct : a.dailyChangePct,
        };
      });
      if (!changed) return;
      const newState = { ...(currentState || {}), financeAssets: updatedAssets };
      setStateData(newState);
      try {
        await saveState(newState);
      } catch (e) {
        console.warn('保存基金净值失败:', e);
      }
    } catch (err) {
      console.error('Failed to load fund nav:', err);
    }
  };

  const loadBooksAndTags = async () => {
    try {
      const booksData = await fetchBooks();
      setBooks(booksData || []);
      // 从账本中提取所有唯一的标签，同时合并 localStorage 中的标签（避免账本无标签时丢失）
      const allTags = new Set();
      booksData?.forEach(book => {
        if (book.tags && Array.isArray(book.tags)) {
          book.tags.forEach(tag => allTags.add(tag));
        }
      });
      // 合并 localStorage 中的已有标签
      try {
        const saved = localStorage.getItem(_LS_TAGS_KEY);
        if (saved) JSON.parse(saved).forEach(t => t && allTags.add(t));
      } catch {}
      const mergedTags = Array.from(allTags).sort();
      setTags(mergedTags);
    } catch (err) {
      console.error('Failed to load books and tags:', err);
    }
  };

  const handleSaveAccount = async () => {
    if (!newAccount.name) return;
    // 必填字段校验
    const requiredFields = [
      { key: 'market', label: '市场' },
      { key: 'assetKind', label: '资产种类' },
      { key: 'categoryL1', label: '资产一级分类' },
      { key: 'assetType', label: '资产类型' },
      { key: 'account', label: '所属账户' },
      { key: 'categoryL2', label: '资产二级分类' },
      { key: 'categoryL3', label: '资产三级分类' },
      { key: 'positionGroup', label: '持仓分组' },
      { key: 'positionType', label: '持仓分类' },
    ];
    const missing = requiredFields.filter(f => !newAccount[f.key] || String(newAccount[f.key]).trim() === '');
    if (missing.length > 0) {
      alert(`请填写必填项：${missing.map(f => f.label).join('、')}`);
      return;
    }
    setSaving(true);
    try {
      const isCashAsset = newAccount.assetType === '现金' || newAccount.categoryL1 === '现金类';
      const _costPrice = parseFloat(newAccount.cost) || 0;
      const _quantity = parseFloat(newAccount.quantity) || 0;
      const _currentPrice = parseFloat(newAccount.currentPrice) || 0;
      const _prevPrice = parseFloat(newAccount.prevPrice) || 0;
      const _unitPnl = _currentPrice - _costPrice;
      const _holdingPnl = Math.round(_unitPnl * _quantity * 100) / 100;
      const _holdingPnlRate = _costPrice > 0 ? Math.round((_unitPnl / _costPrice) * 100 * 100) / 100 : 0;
      const _dailyPnl = _prevPrice > 0 ? Math.round((_currentPrice - _prevPrice) * _quantity * 100) / 100 : 0;
      const _dailyPnlRate = _prevPrice > 0 ? Math.round(((_currentPrice - _prevPrice) / _prevPrice) * 100 * 100) / 100 : 0;

      const payload = {
        id: editMode ? editingId : `fa${Date.now()}`,
        market: newAccount.market || '国内市场',
        currency: newAccount.currency || 'CNY',
        assetKind: newAccount.assetKind || '',
        kind: newAccount.assetType || '股票',
        assetType: newAccount.assetType || '股票',
        accountId: newAccount.account || '',
        account: newAccount.account || '',
        category: newAccount.categoryL1 || '',
        categoryL1: newAccount.categoryL1 || '',
        subcategory: newAccount.categoryL2 || '',
        categoryL2: newAccount.categoryL2 || '',
        tertiaryCategory: newAccount.categoryL3 || '',
        categoryL3: newAccount.categoryL3 || '',
        categoryL4: newAccount.categoryL4 || '',
        positionGroup: newAccount.positionGroup || '',
        positionCategory: newAccount.positionType || '',
        positionType: newAccount.positionType || '',
        name: newAccount.name,
        code: newAccount.code || '',
        costPrice: _costPrice,
        shares: _quantity,
        quantity: _quantity,
        cost: _costPrice * _quantity,
        availableShares: _quantity,
        currentPrice: _currentPrice,
        prevPrice: _prevPrice,
        priceDate: newAccount.priceDate || '',
        avgBuyPrice: parseFloat(newAccount.avgBuyPrice) || 0,
        holdingDays: parseInt(newAccount.holdingDays) || 0,
        holdingDaysBase: parseInt(newAccount.holdingDays) || 0,
        holdingDaysDate: new Date().toISOString().split('T')[0],
        pnl: _holdingPnl,
        pnlPercent: _holdingPnlRate,
        todayPnl: _dailyPnl,
        todayPnlPercent: _dailyPnlRate,
        holdingPnl: _holdingPnl,
        holdingPnlRate: _holdingPnlRate,
        dailyPnl: _dailyPnl,
        dailyPnlRate: _dailyPnlRate,
        currentValue: _currentPrice * _quantity,
        positionWeight: 0,
        totalFees: 0,
        tags: newAccount.tags ? [newAccount.tags] : [],
      };

      // 获取当前的 financeAssets 数组
      const currentFinanceAssets = stateData?.financeAssets || [];
      let updatedFinanceAssets;

      const isEditMode = editMode && editingId;
      let updatedAccounts = null;

      if (isEditMode) {
        // 编辑：保留已有交易记录，并同步更新首条建仓/买入记录的数量和价格
        const existingItem = currentFinanceAssets.find(item => String(item.id) === String(editingId));
        let existingTransactions = existingItem?.transactions || [];
        const isDomesticOutdoor = newAccount.market === '国内市场' && newAccount.categoryL3 === '场外';
        if (existingTransactions.length > 0) {
          const buildIndex = existingTransactions.findIndex(t => t.type === '建仓' || t.type === '买入');
          if (buildIndex >= 0) {
            const updatedTx = { ...existingTransactions[buildIndex] };
            updatedTx.shares = _quantity;
            updatedTx.quantity = _quantity;
            updatedTx.price = _costPrice;
            if (isDomesticOutdoor) updatedTx.net_value = _costPrice;
            updatedTx.amount = _costPrice * _quantity;
            existingTransactions = existingTransactions.map((t, i) => i === buildIndex ? updatedTx : t);
          }
        }
        payload.transactions = existingTransactions;
        updatedFinanceAssets = currentFinanceAssets.map(item =>
          String(item.id) === String(editingId) ? payload : item
        );
      } else {
        // 新增：自动创建一条建仓交易记录
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const _date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const _time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
        const isDomesticOutdoor = newAccount.market === '国内市场' && newAccount.categoryL3 === '场外';
        const buildRecord = {
          id: Date.now(),
          direction: '建仓',
          type: '建仓',
          transaction_date: `${_date} ${_time}`,
          date: _date,
          time: _time,
          shares: _quantity,
          quantity: _quantity,
          price: _costPrice,
          net_value: isDomesticOutdoor ? _costPrice : undefined,
          amount: _costPrice * _quantity,
          commission: 0,
          fee: 0,
          accountId: payload.accountId,
          currency: payload.currency,
          cashAccountName: (stateData?.accounts || []).find(a => a.id === payload.accountId || a.name === payload.accountId)?.name || payload.accountId,
        };
        payload.transactions = [buildRecord];
        updatedFinanceAssets = [...currentFinanceAssets, payload];

        // 现金账户联动：建仓扣减现金
        const accountName = payload.accountId || '';
        const cashAccountName = `${accountName} 现金账户`;
        const accountsForUpdate = JSON.parse(JSON.stringify(stateData.accounts || []));
        let cashAcct = accountsForUpdate.find(acc =>
          acc.name === cashAccountName && (acc.type === 'cash' || acc.type === 'wallet' || acc.type === 'bank')
        );
        if (!cashAcct) {
          cashAcct = {
            id: `cash-${Date.now()}`,
            name: cashAccountName,
            type: 'cash',
            currency: payload.currency || 'CNY',
            balance: 0,
            liability: false,
            enabled: true,
          };
          accountsForUpdate.push(cashAcct);
        }
        const _amount = Math.abs(parseFloat(buildRecord.amount) || 0);
        const _fee = parseFloat(buildRecord.fee) || 0;
        cashAcct.balance = (parseFloat(cashAcct.balance) || 0) - _amount - _fee;
        buildRecord.cashAccountId = cashAcct.id;
        buildRecord.cashAccountName = cashAcct.name;

        // 交易本金与所属账户余额联动（适配新返回结构）
        const syncResult = updateAccountBalance(payload, buildRecord, accountsForUpdate, undefined, updatedFinanceAssets);
        updatedAccounts = syncResult.accounts;
        updatedFinanceAssets = syncResult.financeAssets;
      }

      // 统一保存
      const finalState = updatedAccounts
        ? { ...stateData, financeAssets: updatedFinanceAssets, accounts: updatedAccounts }
        : { ...stateData, financeAssets: updatedFinanceAssets };
      await saveState(finalState);

      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Failed to save account:', err);
      alert('保存失败：' + (err.message || '未知错误'));
    } finally {
      setSaving(false);
    }
  };

  const handleBatchSave = async () => {
    setSaving(true);
    try {
      const currentFinanceAssets = stateData?.financeAssets || [];
      const updatedFinanceAssets = currentFinanceAssets.map(item => {
        if (!selectedIds.has(item.id)) return item;
        return {
          ...item,
          ...(batchEditData.market ? { market: batchEditData.market } : {}),
          ...(batchEditData.currency ? { currency: batchEditData.currency } : {}),
          ...(batchEditData.assetType ? { kind: batchEditData.assetType } : {}),
          ...(batchEditData.account ? { accountId: batchEditData.account } : {}),
          ...(batchEditData.categoryL1 ? { category: batchEditData.categoryL1 } : {}),
          ...(batchEditData.categoryL2 ? { subcategory: batchEditData.categoryL2 } : {}),
          ...(batchEditData.categoryL3 ? { tertiaryCategory: batchEditData.categoryL3 } : {}),
          ...(batchEditData.positionGroup ? { positionGroup: batchEditData.positionGroup } : {}),
          ...(batchEditData.positionType ? { positionCategory: batchEditData.positionType } : {}),
          ...(batchEditData.tag ? { tags: [batchEditData.tag] } : {}),
        };
      });

      await saveState({
        ...stateData,
        financeAssets: updatedFinanceAssets,
      });

      setShowBatchEditModal(false);
      setBatchEditData({ market: '', currency: '', assetType: '', account: '', categoryL1: '', categoryL2: '', categoryL3: '', positionGroup: '', positionType: '', tag: '' });
      setSelectedIds(new Set());
      setShowBatchEdit(false);
      loadData();
    } catch (err) {
      console.error('Failed to batch save:', err);
      alert('批量保存失败：' + (err.message || '未知错误'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (holding) => {
    const isCashAsset = holding.assetType === '现金' || holding.kind === '现金' || holding.category === '现金类' || holding.categoryL1 === '现金类';
    const marketSubcategoryMap = {
      '国内市场': 'A股',
      '港股市场': '港股',
      '美股市场': '美股',
    };
    const resolvedAssetKind = holding.assetKind || (isCashAsset ? '现金' : '');
    if (resolvedAssetKind && !assetKindOptions.includes(resolvedAssetKind)) {
      const updated = [...new Set([...assetKindOptions, resolvedAssetKind])];
      setAssetKindOptions(updated);
      localStorage.setItem('finance_asset_kind_options', JSON.stringify(updated));
    }
    const resolvedQuantity = holding.quantity || holding.shares || 
      (isCashAsset ? Math.max(0, parseFloat(holding.currentValue || holding.balance || 0)) : '');
    setNewAccount({
      market: holding.market || '国内市场',
      currency: holding.currency || '',
      assetKind: holding.assetKind || (isCashAsset ? '现金' : ''),
      assetType: holding.assetType || holding.kind || '股票',
      account: holding.accountId || holding.account || '',
      categoryL1: holding.categoryL1 || holding.category || (isCashAsset ? '现金类' : ''),
      categoryL2: holding.categoryL2 || holding.subcategory || (isCashAsset ? (marketSubcategoryMap[holding.market || '国内市场'] || 'A股') : ''),
      categoryL3: holding.categoryL3 || holding.tertiaryCategory || (isCashAsset ? '场内' : ''),
      categoryL4: holding.categoryL4 || '',
      positionGroup: holding.positionGroup || (isCashAsset ? '现金仓位' : ''),
      positionType: holding.positionType || holding.positionCategory || (isCashAsset ? '现金管理' : ''),
      name: holding.name || '',
      code: holding.code || '',
      cost: holding.costPrice || '',
      quantity: resolvedQuantity,
      currentPrice: holding.currentPrice || '',
      prevPrice: holding.prevPrice || '',
      priceDate: holding.priceDate || '',
      avgBuyPrice: holding.avgBuyPrice || '',
      holdingDays: holding.holdingDays || '',
      holdingPnl: holding.holdingPnl || '',
      holdingPnlRate: holding.holdingPnlRate || '',
      dailyPnl: holding.dailyPnl || '',
      dailyPnlRate: holding.dailyPnlRate || '',
      currentValue: holding.currentValue || resolvedQuantity || '',
      tags: Array.isArray(holding.tags) ? holding.tags[0] || '' : (holding.tags || ''),
    });
    setEditMode(true);
    setEditingId(holding.id);
    setShowAddModal(true);
  };

  const handleDetail = (holding) => {
    setDetailData(holding);
    setShowDetailModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除这条持仓记录吗？')) return;
    try {
      const currentFinanceAssets = stateData?.financeAssets || [];
      const updatedFinanceAssets = currentFinanceAssets.filter(item => String(item.id) !== String(id));
      await saveState({
        ...stateData,
        financeAssets: updatedFinanceAssets,
      });
      loadData();
    } catch (err) {
      console.error('Failed to delete account:', err);
      alert('删除失败：' + (err.message || '未知错误'));
    }
  };

  const handleDeleteArchive = async (id) => {
    if (!window.confirm('确定要彻底删除这条归档记录吗？此操作不可恢复。')) return;
    try {
      const updatedArchives = (stateData?.financeAssetArchives || []).filter(
        item => String(item.originalAssetId || item.id) !== String(id)
      );
      const newState = { ...stateData, financeAssetArchives: updatedArchives };
      await saveState(newState);
      setStateData(newState);
    } catch (err) {
      console.error('Failed to delete archive:', err);
      alert('删除归档失败：' + (err.message || '未知错误'));
    }
  };

  const resetForm = () => {
    setNewAccount({
      market: '国内市场',
      currency: 'CNY',
      assetType: '股票',
      account: '',
      categoryL1: '',
      categoryL2: '',
      categoryL3: '',
      positionGroup: '',
      positionType: '',
      name: '',
      code: '',
      cost: '',
      quantity: '',
      currentPrice: '',
      avgBuyPrice: '',
      holdingDays: '',
      holdingPnl: '',
      holdingPnlRate: '',
      dailyPnl: '',
      dailyPnlRate: '',
      currentValue: '',
      tags: '',
    });
    setUploadedImage(null);
    setOcrResult(null);
    setEditMode(false);
    setEditingId(null);
  };

  // ─ 账本管理 ──
  const handleSaveBooks = async (booksToSave) => {
    try {
      await saveBooks(booksToSave || books);
      loadBooksAndTags();
    } catch (err) {
      console.error('Failed to save books:', err);
    }
  };

  // ── 标签管理 ──
  const handleAddTag = () => {
    if (!newTagName.trim()) return;
    if (tags.includes(newTagName.trim())) return;
    const newTags = [...tags, newTagName.trim()].sort();
    setTags(newTags);
    setNewTagName('');
    const updatedBooks = books.map(book => ({
      ...book,
      tags: Array.from(new Set([...(book.tags || []), newTagName.trim()])),
    }));
    setBooks(updatedBooks);
    handleSaveBooks(updatedBooks);
  };

  const handleEditTag = (tagName) => {
    setTagToEdit(tagName);
  };

  const handleSaveTagEdit = () => {
    if (!tagToEdit || !newTagName.trim()) return;
    if (tags.includes(newTagName.trim()) && newTagName.trim() !== tagToEdit) return;
    
    const newTags = tags.map(t => t === tagToEdit ? newTagName.trim() : t).sort();
    setTags(newTags);
    
    const updatedBooks = books.map(book => ({
      ...book,
      tags: (book.tags || []).map(t => t === tagToEdit ? newTagName.trim() : t),
    }));
    setBooks(updatedBooks);
    
    setTagToEdit(null);
    setNewTagName('');
    handleSaveBooks(updatedBooks);
  };

  const handleDeleteTag = async (tagName) => {
    const newTags = tags.filter(t => t !== tagName);
    setTags(newTags);
    
    const updatedBooks = books.map(book => ({
      ...book,
      tags: (book.tags || []).filter(t => t !== tagName),
    }));
    setBooks(updatedBooks);
    
    setDeleteConfirm(null);
    handleSaveBooks(updatedBooks);
  };

  // ── 资产类型管理 ──
  const handleAddAssetType = () => {
    if (!newAssetTypeName.trim()) return;
    if (assetTypeOptions.includes(newAssetTypeName.trim())) return;
    const newOptions = [...assetTypeOptions, newAssetTypeName.trim()].sort();
    setAssetTypeOptions(newOptions);
    localStorage.setItem('finance_asset_type_options', JSON.stringify(newOptions));
    setNewAssetTypeName('');
  };
  const handleSaveAssetTypeEdit = () => {
    if (!assetTypeToEdit || !newAssetTypeName.trim()) return;
    if (assetTypeOptions.includes(newAssetTypeName.trim()) && newAssetTypeName.trim() !== assetTypeToEdit) return;
    const newOptions = assetTypeOptions.map(o => o === assetTypeToEdit ? newAssetTypeName.trim() : o).sort();
    setAssetTypeOptions(newOptions);
    localStorage.setItem('finance_asset_type_options', JSON.stringify(newOptions));
    setAssetTypeToEdit(null);
    setNewAssetTypeName('');
  };
  const handleDeleteAssetType = (name) => {
    const newOptions = assetTypeOptions.filter(o => o !== name);
    setAssetTypeOptions(newOptions);
    localStorage.setItem('finance_asset_type_options', JSON.stringify(newOptions));
    setDeleteConfirm(null);
  };

  // ── 一级分类管理 ──
  const handleAddCategoryL1 = () => {
    if (!newCategoryL1Name.trim()) return;
    if (categoryL1Options.includes(newCategoryL1Name.trim())) return;
    const newOptions = [...categoryL1Options, newCategoryL1Name.trim()].sort();
    setCategoryL1Options(newOptions);
    localStorage.setItem('finance_category_l1_options', JSON.stringify(newOptions));
    setNewCategoryL1Name('');
  };
  const handleSaveCategoryL1Edit = () => {
    if (!categoryL1ToEdit || !newCategoryL1Name.trim()) return;
    if (categoryL1Options.includes(newCategoryL1Name.trim()) && newCategoryL1Name.trim() !== categoryL1ToEdit) return;
    const newOptions = categoryL1Options.map(o => o === categoryL1ToEdit ? newCategoryL1Name.trim() : o).sort();
    setCategoryL1Options(newOptions);
    localStorage.setItem('finance_category_l1_options', JSON.stringify(newOptions));
    setCategoryL1ToEdit(null);
    setNewCategoryL1Name('');
  };
  const handleDeleteCategoryL1 = (name) => {
    const newOptions = categoryL1Options.filter(o => o !== name);
    setCategoryL1Options(newOptions);
    localStorage.setItem('finance_category_l1_options', JSON.stringify(newOptions));
    setDeleteConfirm(null);
  };

  // ── 二级分类管理（按一级分类 + 资产类型分组，key: `${l1}__${assetType}`）──
  const getL2Key = () => {
    const l1 = newAccount.categoryL1;
    const at = newAccount.assetType;
    return l1 && at ? `${l1}__${at}` : l1 || '';
  };
  const handleAddCategoryL2 = () => {
    if (!newCategoryL2Name.trim() || !newAccount.categoryL1) return;
    const key = getL2Key();
    const currentOptions = categoryL2OptionsMap[key] || [];
    if (currentOptions.includes(newCategoryL2Name.trim())) return;
    const newOptions = [...currentOptions, newCategoryL2Name.trim()].sort();
    setCategoryL2OptionsMap(prev => ({ ...prev, [key]: newOptions }));
    localStorage.setItem('finance_category_l2_options_v2', JSON.stringify({ ...categoryL2OptionsMap, [key]: newOptions }));
    setNewCategoryL2Name('');
  };
  const handleSaveCategoryL2Edit = () => {
    if (!categoryL2ToEdit || !newCategoryL2Name.trim() || !newAccount.categoryL1) return;
    const key = getL2Key();
    const currentOptions = categoryL2OptionsMap[key] || [];
    if (currentOptions.includes(newCategoryL2Name.trim()) && newCategoryL2Name.trim() !== categoryL2ToEdit) return;
    const newOptions = currentOptions.map(o => o === categoryL2ToEdit ? newCategoryL2Name.trim() : o).sort();
    setCategoryL2OptionsMap(prev => ({ ...prev, [key]: newOptions }));
    localStorage.setItem('finance_category_l2_options_v2', JSON.stringify({ ...categoryL2OptionsMap, [key]: newOptions }));
    setCategoryL2ToEdit(null);
    setNewCategoryL2Name('');
  };
  const handleDeleteCategoryL2 = (name) => {
    if (!newAccount.categoryL1) return;
    const key = getL2Key();
    const currentOptions = categoryL2OptionsMap[key] || [];
    const newOptions = currentOptions.filter(o => o !== name);
    setCategoryL2OptionsMap(prev => ({ ...prev, [key]: newOptions }));
    localStorage.setItem('finance_category_l2_options_v2', JSON.stringify({ ...categoryL2OptionsMap, [key]: newOptions }));
    setDeleteConfirm(null);
  };

  // ── 三级分类管理（按一级+二级分类分组）──
  const handleAddCategoryL3 = () => {
    if (!newCategoryL3Name.trim() || !newAccount.categoryL1 || !newAccount.categoryL2) return;
    const key = `${newAccount.categoryL1}__${newAccount.categoryL2}`;
    const currentOptions = categoryL3OptionsMap[key] || [];
    if (currentOptions.includes(newCategoryL3Name.trim())) return;
    const newOptions = [...currentOptions, newCategoryL3Name.trim()].sort();
    setCategoryL3OptionsMap(prev => ({ ...prev, [key]: newOptions }));
    localStorage.setItem('finance_category_l3_options', JSON.stringify({ ...categoryL3OptionsMap, [key]: newOptions }));
    setNewCategoryL3Name('');
  };
  const handleSaveCategoryL3Edit = () => {
    if (!categoryL3ToEdit || !newCategoryL3Name.trim() || !newAccount.categoryL1 || !newAccount.categoryL2) return;
    const key = `${newAccount.categoryL1}__${newAccount.categoryL2}`;
    const currentOptions = categoryL3OptionsMap[key] || [];
    if (currentOptions.includes(newCategoryL3Name.trim()) && newCategoryL3Name.trim() !== categoryL3ToEdit) return;
    const newOptions = currentOptions.map(o => o === categoryL3ToEdit ? newCategoryL3Name.trim() : o).sort();
    setCategoryL3OptionsMap(prev => ({ ...prev, [key]: newOptions }));
    localStorage.setItem('finance_category_l3_options', JSON.stringify({ ...categoryL3OptionsMap, [key]: newOptions }));
    setCategoryL3ToEdit(null);
    setNewCategoryL3Name('');
  };
  const handleDeleteCategoryL3 = (name) => {
    if (!newAccount.categoryL1 || !newAccount.categoryL2) return;
    const key = `${newAccount.categoryL1}__${newAccount.categoryL2}`;
    const currentOptions = categoryL3OptionsMap[key] || [];
    const newOptions = currentOptions.filter(o => o !== name);
    setCategoryL3OptionsMap(prev => ({ ...prev, [key]: newOptions }));
    localStorage.setItem('finance_category_l3_options', JSON.stringify({ ...categoryL3OptionsMap, [key]: newOptions }));
    setDeleteConfirm(null);
  };

  const handleAddCategoryL4 = () => {
    if (!newCategoryL4Name.trim() || !newAccount.categoryL1) return;
    const currentOptions = categoryL4Options[newAccount.categoryL1] || [];
    if (currentOptions.includes(newCategoryL4Name.trim())) return;
    const newOptions = [...currentOptions, newCategoryL4Name.trim()].sort();
    setCategoryL4Options(prev => ({ ...prev, [newAccount.categoryL1]: newOptions }));
    setNewCategoryL4Name('');
  };

  const handleSaveCategoryL4Edit = () => {
    if (!categoryL4ToEdit || !newCategoryL4Name.trim() || !newAccount.categoryL1) return;
    const currentOptions = categoryL4Options[newAccount.categoryL1] || [];
    if (currentOptions.includes(newCategoryL4Name.trim()) && newCategoryL4Name.trim() !== categoryL4ToEdit) return;
    const newOptions = currentOptions.map(o => o === categoryL4ToEdit ? newCategoryL4Name.trim() : o).sort();
    setCategoryL4Options(prev => ({ ...prev, [newAccount.categoryL1]: newOptions }));
    setCategoryL4ToEdit(null);
    setNewCategoryL4Name('');
  };

  const handleDeleteCategoryL4 = (name) => {
    if (!newAccount.categoryL1) return;
    const currentOptions = categoryL4Options[newAccount.categoryL1] || [];
    const newOptions = currentOptions.filter(o => o !== name);
    setCategoryL4Options(prev => ({ ...prev, [newAccount.categoryL1]: newOptions }));
    setDeleteConfirm(null);
  };

  const handleAddPositionGroup = () => {
    if (!newPositionGroupName.trim()) return;
    if (positionGroupOptions.includes(newPositionGroupName.trim())) return;
    const newOptions = [...positionGroupOptions, newPositionGroupName.trim()].sort();
    setPositionGroupOptions(newOptions);
    setNewPositionGroupName('');
  };

  const handleSavePositionGroupEdit = () => {
    if (!positionGroupToEdit || !newPositionGroupName.trim()) return;
    if (positionGroupOptions.includes(newPositionGroupName.trim()) && newPositionGroupName.trim() !== positionGroupToEdit) return;
    
    const newOptions = positionGroupOptions.map(o => o === positionGroupToEdit ? newPositionGroupName.trim() : o).sort();
    setPositionGroupOptions(newOptions);
    setPositionGroupToEdit(null);
    setNewPositionGroupName('');
  };

  const handleDeletePositionGroup = (name) => {
    const newOptions = positionGroupOptions.filter(o => o !== name);
    setPositionGroupOptions(newOptions);
    setDeleteConfirm(null);
  };

  const handleAddPositionType = () => {
    if (!newPositionTypeName.trim() || !newAccount.assetType) return;
    const key = newAccount.assetType;
    const name = newPositionTypeName.trim();
    const hardcoded = ASSET_TYPE_POSITION_TYPE_MAP[key] || [];
    const existing = positionTypeOptionsMap[key] || [];
    if (hardcoded.includes(name) || existing.includes(name)) return;
    // 如果该名称在删除列表中（被删除过的硬编码），恢复它
    const deleted = deletedPositionTypeMap[key] || [];
    if (deleted.includes(name)) {
      setDeletedPositionTypeMap({ ...deletedPositionTypeMap, [key]: deleted.filter(o => o !== name) });
      setNewPositionTypeName('');
      return;
    }
    const newOptions = [...existing, name].sort();
    setPositionTypeOptionsMap({ ...positionTypeOptionsMap, [key]: newOptions });
    setNewPositionTypeName('');
  };

  const handleSavePositionTypeEdit = () => {
    if (!positionTypeToEdit || !newPositionTypeName.trim() || !newAccount.assetType) return;
    const key = newAccount.assetType;
    const oldName = positionTypeToEdit;
    const newName = newPositionTypeName.trim();
    const hardcoded = ASSET_TYPE_POSITION_TYPE_MAP[key] || [];
    const existing = positionTypeOptionsMap[key] || [];
    if ((hardcoded.includes(newName) || existing.includes(newName)) && newName !== oldName) return;

    if (hardcoded.includes(oldName)) {
      // 编辑硬编码选项：旧名加入删除列表，新名加入自定义列表
      const deleted = deletedPositionTypeMap[key] || [];
      setDeletedPositionTypeMap({ ...deletedPositionTypeMap, [key]: [...new Set([...deleted, oldName])] });
      const newOptions = [...existing, newName].sort();
      setPositionTypeOptionsMap({ ...positionTypeOptionsMap, [key]: newOptions });
    } else {
      // 编辑自定义选项
      const newOptions = existing.map(o => o === oldName ? newName : o).sort();
      setPositionTypeOptionsMap({ ...positionTypeOptionsMap, [key]: newOptions });
    }
    setPositionTypeToEdit(null);
    setNewPositionTypeName('');
  };

  const handleDeletePositionType = (name) => {
    if (!newAccount.assetType) return;
    const key = newAccount.assetType;
    const hardcoded = ASSET_TYPE_POSITION_TYPE_MAP[key] || [];
    if (hardcoded.includes(name)) {
      // 删除硬编码选项：加入删除列表
      const deleted = deletedPositionTypeMap[key] || [];
      setDeletedPositionTypeMap({ ...deletedPositionTypeMap, [key]: [...new Set([...deleted, name])] });
    } else {
      // 删除自定义选项
      const existing = positionTypeOptionsMap[key] || [];
      const newOptions = existing.filter(o => o !== name);
      setPositionTypeOptionsMap({ ...positionTypeOptionsMap, [key]: newOptions });
    }
    setDeleteConfirm(null);
  };

  // ── OCR 图文识别 ──
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImage(ev.target.result);
      setOcrResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleOCR = () => {
    if (!uploadedImage) return;
    const mockOCRText = `
      持仓名称: 贵州茅台
      股票代码: 600519
      持仓数量: 100
      现价: 1680.00
      成本价: 1500.50
      持仓盈亏: +17,950.00
      盈亏率: +11.96%
      当日参考盈亏: +2,340.00
      当前价值: 168,000.00
    `;
    const result = {};
    const patterns = [
      ['name', /(?:持仓名称|资产名称|名称)[\s:：]+([^\n\r]+)/],
      ['code', /(?:股票代码|代码|证券代码)[\s:：]*(\d{6})/],
      ['quantity', /(?:持仓数量|份额|数量)[\s:：]*([\d,]+\.?\d*)/],
      ['currentPrice', /(?:现价|最新价|当前价)[\s:：]*([\d,]+\.?\d*)/],
      ['avgBuyPrice', /(?:成本价|买入均价|均价)[\s:：]*([\d,]+\.?\d*)/],
      ['holdingPnl', /(?:持仓盈亏|盈亏)[\s:：]*([+-]?[\d,]+\.?\d*)/],
      ['holdingPnlRate', /(?:盈亏率|收益率)[\s:：]*([+-]?[\d.]+%?)/],
      ['dailyPnl', /(?:当日参考盈亏|日盈亏|今日盈亏)[\s:：]*([+-]?[\d,]+\.?\d*)/],
      ['currentValue', /(?:当前价值|市值|总市值)[\s:：]*([\d,]+\.?\d*)/],
    ];
    patterns.forEach(([key, regex]) => {
      const match = mockOCRText.match(regex);
      if (match) result[key] = match[1].replace(/,/g, '');
    });
    setOcrResult(result);
  };

  // ── 搜索联想 ──
  const handleCodeSearch = (q) => {
    if (lookupTimerRef.current) {
      clearTimeout(lookupTimerRef.current);
    }
    if (!q || q.trim().length < 1) {
      setLookupResults([]);
      setShowLookupDropdown(false);
      return;
    }
    setLookupLoading(true);
    setShowLookupDropdown(true);
    lookupTimerRef.current = setTimeout(async () => {
      try {
        const results = await lookupFinance(q.trim());
        setLookupResults(results);
      } catch (e) {
        console.error('Lookup failed:', e);
        setLookupResults([]);
      } finally {
        setLookupLoading(false);
      }
    }, 300);
  };

  const handleSelectLookup = async (item) => {
    setShowLookupDropdown(false);
    // 检查是否为港股通（HKD计价）
    const isTonggupass = newAccount.categoryL2 === '港股通';
    const hkdToCnyRate = exchangeRates?.HKD || 0.92;
    
    setNewAccount(prev => {
      const qty = parseFloat(prev.quantity) || 0;
      const cost = parseFloat(prev.cost) || 0;
      let rawPrice = item.price ? parseFloat(item.price) : parseFloat(prev.currentPrice) || 0;
      // 港股通：将HKD价格折算为CNY
      let price = isTonggupass ? (rawPrice * hkdToCnyRate) : rawPrice;
      const currentValue = qty * price;
      const unitPnl = price - cost;
      const holdingPnl = unitPnl * qty;
      const holdingPnlRate = cost > 0 ? (unitPnl / cost) * 100 : 0;
      return {
        ...prev,
        code: item.code || prev.code,
        name: item.name || prev.name,
        currency: isTonggupass ? 'CNY' : (item.currency || prev.currency),
        currentPrice: price > 0 ? String(price.toFixed(4)) : (item.price || prev.currentPrice),
        currentValue: (qty && price) ? currentValue.toFixed(2) : prev.currentValue,
        holdingPnl: (cost || qty || price) ? holdingPnl.toFixed(2) : prev.holdingPnl,
        holdingPnlRate: (cost || qty || price) ? holdingPnlRate.toFixed(2) : prev.holdingPnlRate,
      };
    });

    if (!item.price && item.code) {
      try {
        const quotes = await fetchFinanceQuotes([item.code]);
        if (quotes && quotes.length > 0 && quotes[0].price) {
          setNewAccount(prev => {
            const qty = parseFloat(prev.quantity) || 0;
            const cost = parseFloat(prev.cost) || 0;
            let rawPrice = parseFloat(quotes[0].price) || 0;
            // 港股通：将HKD价格折算为CNY
            let price = isTonggupass ? (rawPrice * hkdToCnyRate) : rawPrice;
            const currentValue = qty * price;
            const unitPnl = price - cost;
            const holdingPnl = unitPnl * qty;
            const holdingPnlRate = cost > 0 ? (unitPnl / cost) * 100 : 0;
            return {
              ...prev,
              currency: isTonggupass ? 'CNY' : prev.currency,
              currentPrice: price > 0 ? String(price.toFixed(4)) : String(quotes[0].price),
              currentValue: (qty && price) ? currentValue.toFixed(2) : prev.currentValue,
              holdingPnl: (cost || qty || price) ? holdingPnl.toFixed(2) : prev.holdingPnl,
              holdingPnlRate: (cost || qty || price) ? holdingPnlRate.toFixed(2) : prev.holdingPnlRate,
            };
          });
        }
      } catch (e) {
        console.error('Fetch quotes failed:', e);
      }
    }
  };

  // ── 下拉选项常量 ──
  // 国内市场资产分类四级联动配置
  const CASCADE_OPTIONS = {
    '股票': {
      l1Options: ['权益类', '分红类'],
      l1Default: '权益类',
      l2Options: { '权益类': ['A股', '港股', '美股'], '分红类': ['A股'] },
      l2Default: { '权益类': 'A股', '分红类': 'A股' },
      l3Options: { '权益类': { 'A股': ['场内'] }, '分红类': { 'A股': ['场内'] } },
      l3Default: { '权益类': { 'A股': '场内' }, '分红类': { 'A股': '场内' } },
      l4Options: { '权益类': { 'A股': { '场内': ['长期', '短期'] } }, '分红类': { 'A股': { '场内': ['吃息'] } } }
    },
    '基金': {
      l1Options: ['权益类'],
      l1Default: '权益类',
      l2Options: { '权益类': ['A股'] },
      l2Default: { '权益类': 'A股' },
      l3Options: { '权益类': { 'A股': ['场内', '场外'] } },
      l3Default: { '权益类': { 'A股': '场内' } },
      l4Options: { '权益类': { 'A股': { '场内': ['长期', '短期'], '场外': ['长期', '短期'] } } }
    },
    '债券': {
      l1Options: ['债权类'],
      l1Default: '债权类',
      l2Options: { '债权类': ['中债', '美债', '其他'] },
      l2Default: { '债权类': '中债' },
      l3Options: { '债权类': { '中债': ['场内', '场外'], '美债': ['场内', '场外'], '其他': ['场内', '场外'] } },
      l3Default: { '债权类': { '中债': '场内', '美债': '场内', '其他': '场内' } },
      l4Options: { '债权类': { '中债': { '场内': ['国债', '可转债'], '场外': ['纯债', '混合债', '地方债', '企业债', '固收+'] }, '美债': { '场内': [], '场外': [] }, '其他': { '场内': [], '场外': [] } } }
    },
    '现金': {
      l1Options: ['现金类'],
      l1Default: '现金类',
      l2Options: { '现金类': ['活期存款', '定期存款'] },
      l2Default: { '现金类': '活期存款' },
      l3Options: { '现金类': { '活期存款': ['场内', '场外'], '定期存款': ['场内', '场外'] } },
      l3Default: { '现金类': { '活期存款': '场内', '定期存款': '场外' } },
      l4Options: { '现金类': { '活期存款': { '场内': ['货币基金', '短融'] }, '定期存款': { '场外': ['货币基金', '银行理财', '定期存款', '短期存款'] } } }
    },
    '期货': {
      l1Options: ['权益类'], l1Default: '权益类',
      l2Options: { '权益类': ['A股'] }, l2Default: { '权益类': 'A股' },
      l3Options: { '权益类': { 'A股': ['场内'] } }, l3Default: { '权益类': { 'A股': '场内' } },
      l4Options: { '权益类': { 'A股': { '场内': ['博弈', '对冲'] } } }
    },
    '期权': {
      l1Options: ['权益类'], l1Default: '权益类',
      l2Options: { '权益类': ['A股'] }, l2Default: { '权益类': 'A股' },
      l3Options: { '权益类': { 'A股': ['场内'] } }, l3Default: { '权益类': { 'A股': '场内' } },
      l4Options: { '权益类': { 'A股': { '场内': ['博弈', '对冲'] } } }
    },
    '外汇': {
      l1Options: ['现金类'], l1Default: '现金类',
      l2Options: { '现金类': ['欧元', '美元', '日元', '人民币'] },
      l2Default: { '现金类': '美元' },
      l3Options: { '现金类': { '欧元': ['场内'], '美元': ['场内'], '日元': ['场内'], '人民币': ['场内'] } },
      l3Default: { '现金类': { '欧元': '场内', '美元': '场内', '日元': '场内', '人民币': '场内' } },
      l4Options: { '现金类': { '欧元': { '场内': ['超期', '短期'] }, '美元': { '场内': ['超期', '短期'] }, '日元': { '场内': ['超期', '短期'] }, '人民币': { '场内': ['超期', '短期'] } } }
    },
    '保险': {
      l1Options: ['分红类'], l1Default: '分红类',
      l2Options: { '分红类': ['A股'] }, l2Default: { '分红类': 'A股' },
      l3Options: { '分红类': { 'A股': ['分红险', '储蓄险'] } }, l3Default: { '分红类': { 'A股': '分红险' } },
      l4Options: { '分红类': { 'A股': { '分红险': [], '储蓄险': [] } } }
    },
    '房产': {
      l1Options: ['分红类'], l1Default: '分红类',
      l2Options: { '分红类': ['固定投资'] }, l2Default: { '分红类': '固定投资' },
      l3Options: { '分红类': { '固定投资': ['房租'] } }, l3Default: { '分红类': { '固定投资': '房租' } },
      l4Options: { '分红类': { '固定投资': { '房租': [] } } }
    },
    '实体投资': {
      l1Options: ['分红类'], l1Default: '分红类',
      l2Options: { '分红类': ['固定投资'] }, l2Default: { '分红类': '固定投资' },
      l3Options: { '分红类': { '固定投资': ['营业收益'] } }, l3Default: { '分红类': { '固定投资': '营业收益' } },
      l4Options: { '分红类': { '固定投资': { '营业收益': [] } } }
    },
    '黄金': {
      l1Options: ['商品类'], l1Default: '商品类',
      l2Options: { '商品类': ['场内黄金', '场外黄金'] }, l2Default: { '商品类': '场内黄金' },
      l3Options: { '商品类': { '场内黄金': ['黄金股', '黄金ETF/LOF'], '场外黄金': ['实物黄金', '银行积存金', '纸黄金'] } }, l3Default: { '商品类': { '场内黄金': '黄金ETF/LOF', '场外黄金': '实物黄金' } },
      l4Options: { '商品类': { '场内黄金': { '黄金股': [], '黄金ETF/LOF': [] }, '场外黄金': { '实物黄金': [], '银行积存金': [], '纸黄金': [] } } }
    },
    '白银': {
      l1Options: ['商品类'], l1Default: '商品类',
      l2Options: { '商品类': ['场内白银', '场外白银'] }, l2Default: { '商品类': '场内白银' },
      l3Options: { '商品类': { '场内白银': ['白银股', '白银ETF/LOF'], '场外白银': ['实物白银', '银行积存银'] } }, l3Default: { '商品类': { '场内白银': '白银ETF/LOF', '场外白银': '实物白银' } },
      l4Options: { '商品类': { '场内白银': { '白银股': [], '白银ETF/LOF': [] }, '场外白银': { '实物白银': [], '银行积存银': [] } } }
    },
    '原油': {
      l1Options: ['商品类'], l1Default: '商品类',
      l2Options: { '商品类': ['场内原油', '场外原油'] }, l2Default: { '商品类': '场内原油' },
      l3Options: { '商品类': { '场内原油': ['原油股', '原油ETF/LOF'], '场外原油': ['实物原油', '银行积存油'] } }, l3Default: { '商品类': { '场内原油': '原油ETF/LOF', '场外原油': '实物原油' } },
      l4Options: { '商品类': { '场内原油': { '原油股': [], '原油ETF/LOF': [] }, '场外原油': { '实物原油': [], '银行积存油': [] } } }
    },
    '数字货币': {
      l1Options: ['另类投资'], l1Default: '另类投资',
      l2Options: { '另类投资': ['A股'] }, l2Default: { '另类投资': 'A股' },
      l3Options: { '另类投资': { 'A股': ['场内', '场外'] } }, l3Default: { '另类投资': { 'A股': '场内' } },
      l4Options: { '另类投资': { 'A股': { '场内': ['比特币', '以太坊', '其他'], '场外': ['比特币', '以太坊', '其他'] } } }
    },
    '银行理财': {
      l1Options: ['固收类'], l1Default: '固收类',
      l2Options: { '固收类': ['A股'] }, l2Default: { '固收类': 'A股' },
      l3Options: { '固收类': { 'A股': ['场外'] } }, l3Default: { '固收类': { 'A股': '场外' } },
      l4Options: { '固收类': { 'A股': { '场外': ['活期理财', '定期理财', '结构性理财'] } } }
    },
    '其他': {
      l1Options: ['另类投资'], l1Default: '另类投资',
      l2Options: { '另类投资': ['A股'] }, l2Default: { '另类投资': 'A股' },
      l3Options: { '另类投资': { 'A股': ['场内', '场外'] } }, l3Default: { '另类投资': { 'A股': '场内' } },
      l4Options: { '另类投资': { 'A股': { '场内': [], '场外': [] } } }
    }
  };
  const MARKET_OPTIONS = ['国内市场', '港股市场', '美股市场', '其他市场'];
  const MARKET_GROUPS = [
    { label: '国内市场', options: ['国内市场'] },
    { label: '海外市场', options: ['港股市场', '美股市场', '其他市场'] },
  ];
  const CURRENCY_SUGGESTIONS = ['CNY', 'CNH', 'USD', 'HKD', 'EUR', 'JPY', 'GBP', 'SGD'];
  const ASSET_TYPE_OPTIONS = ['股票', '基金', '债券', '现金', '期货', '期权', '外汇', '保险', '房产', '实体投资', '黄金', '白银', '原油', '数字货币', '银行理财', '其他'];
  const DEFAULT_CATEGORY_L1 = ['权益类', '固收类', '现金类', '另类投资', '商品'];
  const DEFAULT_CATEGORY_L2 = ['A股', '港股', '美股', '混合型', '指数型', '货币型', '债券型', 'QDII', '其他'];

  // 资产类型 → 持仓分组映射
  const ASSET_TYPE_POSITION_GROUP_MAP = {
    '股票': ['核心仓位', '卫星仓位', '观察仓位', '波段仓位'],
    '基金': ['核心仓位', '卫星仓位', '定投仓位', '观察仓位'],
    '债券': ['核心仓位', '保守仓位'],
    '现金': ['现金仓位'],
    '期货': ['投机仓位', '套保仓位', '套利仓位'],
    '期权': ['投机仓位', '套保仓位', '套利仓位'],
    '外汇': ['投机仓位', '套保仓位'],
    '保险': ['保障仓位'],
    '房产': ['核心仓位', '投资仓位'],
    '实体投资': ['核心仓位', '天使仓位'],
    '黄金': ['核心仓位', '避险仓位'],
    '白银': ['核心仓位', '投机仓位'],
    '原油': ['投机仓位', '套保仓位'],
    '数字货币': ['投机仓位', '核心仓位'],
    '银行理财': ['现金仓位', '保守仓位'],
    '其他': ['核心仓位', '卫星仓位', '观察仓位']
  };

  // 资产类型 → 持仓分类映射
  const ASSET_TYPE_POSITION_TYPE_MAP = {
    '股票': ['成长股仓位', '价值股仓位', '蓝筹股仓位', '周期股仓位', '消费股仓位', '科技股仓位', '打新仓位', '其他'],
    '基金': ['核心基金仓位', '卫星基金仓位', '定投仓位', 'ETF仓位', 'LOF仓位', '其他'],
    '债券': ['国债仓位', '企业债仓位', '可转债仓位', '债券基金仓位', '其他'],
    '现金': ['现金管理', '货币基金', '短期理财', '其他'],
    '期货': ['商品期货', '股指期货', '利率期货', '套利仓位', '其他'],
    '期权': ['股票期权', '指数期权', '商品期权', '套利仓位', '其他'],
    '外汇': ['主要货币对', '交叉货币对', '套利仓位', '其他'],
    '保险': ['寿险仓位', '健康险仓位', '财产险仓位', '其他'],
    '房产': ['住宅投资', '商业地产', '土地投资', '其他'],
    '实体投资': ['股权投资', '合伙投资', '天使投资', '其他'],
    '黄金': ['实物黄金', '纸黄金', '黄金ETF', '其他'],
    '白银': ['实物白银', '纸白银', '白银ETF', '其他'],
    '原油': ['原油期货', '原油ETF', '其他'],
    '数字货币': ['主流币仓位', '山寨币仓位', 'DeFi仓位', '其他'],
    '银行理财': ['固定收益', '浮动收益', '结构性存款', '其他'],
    '其他': ['其他仓位', '观察仓位']
  };

  // 当前资产类型的持仓分类选项（合并硬编码 + 自定义，排除已删除）
  const currentPositionTypeOptions = useMemo(() => {
    if (!newAccount.assetType) return [];
    const key = newAccount.assetType;
    const hardcoded = ASSET_TYPE_POSITION_TYPE_MAP[key] || [];
    const custom = positionTypeOptionsMap[key] || [];
    const deleted = deletedPositionTypeMap[key] || [];
    return [...new Set([...hardcoded, ...custom])].filter(o => !deleted.includes(o)).sort();
  }, [newAccount.assetType, positionTypeOptionsMap, deletedPositionTypeMap]);

  // 所有持仓分类选项（用于筛选器，排除已删除）
  const allPositionTypeOptions = useMemo(() => {
    const hardcoded = Object.values(ASSET_TYPE_POSITION_TYPE_MAP).flat();
    const custom = Object.values(positionTypeOptionsMap).flat();
    const allDeleted = Object.values(deletedPositionTypeMap).flat();
    return [...new Set([...hardcoded, ...custom])].filter(o => !allDeleted.includes(o)).sort();
  }, [positionTypeOptionsMap, deletedPositionTypeMap, ASSET_TYPE_POSITION_TYPE_MAP]);

  // ── 动态资产分类（从 assetClasses 获取，无数据时降级使用默认值）──
  const assetClassOptions = useMemo(() => {
    if (assetClasses && assetClasses.length > 0) {
      return assetClasses.map(c => c.name);
    }
    return DEFAULT_CATEGORY_L1;
  }, [assetClasses]);

  const categoryL2Options = useMemo(() => {
    // 商品类 + 黄金/白银/原油：优先级最高
    if (newAccount.categoryL1 === '商品类') {
      const _commodityMap = { '黄金': ['场内黄金', '场外黄金'], '白银': ['场内白银', '场外白银'], '原油': ['场内原油', '场外原油'] };
      const _defaults = _commodityMap[newAccount.assetType];
      if (_defaults) {
        const _l2Key = `商品类__${newAccount.assetType}`;
        const _custom = categoryL2OptionsMap[_l2Key] || [];
        return [...new Set([..._defaults, ..._custom])];
      }
    }
    // 债券 + 债权类
    if (newAccount.assetType === '债券' && newAccount.categoryL1 === '债权类') {
      return ['中债', '美债', '其他'];
    }
    if (newAccount.market === '港股市场') {
      return ['港股'];
    }
    if (newAccount.market === '美股市场') {
      return ['美股'];
    }
    if (newAccount.market === '国内市场') {
      return ['A股', '港股通'];
    }
    if (newAccount.assetType === '股票') {
      return ['A股', '港股', '美股', '其他'];
    }
    if (newAccount.assetType === '基金') {
      return ['混合型', '指数型', '货币型', '债券型', '行业主题型'];
    }
    if (newAccount.assetType === '商品') {
      return ['黄金', '白银', '原油', '其他'];
    }
    // 债权类默认
    if (newAccount.categoryL1 === '债权类') {
      return ['中债', '美债', '其他'];
    }
    // 其他合并逻辑
    const l1Key = newAccount.categoryL1;
    const atKey = newAccount.assetType;
    const l2Key = l1Key && atKey ? `${l1Key}__${atKey}` : l1Key;
    const moduleL2 = assetClasses && assetClasses.length > 0 && l1Key
      ? (() => {
          const l1 = assetClasses.find(c => c.name === l1Key);
          return l1?.children?.map(c => c.name) || [];
        })()
      : [];
    const customL2 = (categoryL2OptionsMap[l2Key] || []);
    const cascadeL2 = newAccount.assetType && CASCADE_OPTIONS[newAccount.assetType]?.l2Options?.[l1Key]
      ? CASCADE_OPTIONS[newAccount.assetType].l2Options[l1Key]
      : [];
    return [...new Set([...cascadeL2, ...moduleL2, ...customL2, ...DEFAULT_CATEGORY_L2])];
  }, [assetClasses, newAccount.categoryL1, newAccount.assetType, newAccount.market, categoryL2OptionsMap]);

  const allCategoryL2Options = useMemo(() => {
    const l2s = new Set();
    if (assetClasses && assetClasses.length > 0) {
      assetClasses.forEach(c => {
        if (c.children) {
          c.children.forEach(child => l2s.add(child.name));
        }
      });
    }
    // 合并所有一级分类下的自定义二级分类
    Object.values(categoryL2OptionsMap).forEach(arr => {
      (arr || []).forEach(o => l2s.add(o));
    });
    // 合并 CASCADE_OPTIONS 中的默认二级分类
    Object.values(CASCADE_OPTIONS).forEach(opt => {
      if (opt?.l2Options) {
        Object.values(opt.l2Options).forEach(arr => {
          (arr || []).forEach(o => l2s.add(o));
        });
      }
    });
    DEFAULT_CATEGORY_L2.forEach(o => l2s.add(o));
    return [...l2s].sort();
  }, [assetClasses, categoryL2OptionsMap]);

  const categoryL3Options = useMemo(() => {
    // 必须先选 L2 才能选 L3
    if (!newAccount.categoryL2) {
      return [];
    }
    // 资产分类三级统一为场内/场外
    const standardL3 = ['场内', '场外'];
    const merged = [...new Set([...standardL3, ...categoryL3CustomOptions])];
    return merged;
  }, [assetClasses, newAccount.categoryL1, newAccount.categoryL2, newAccount.assetType, categoryL3CustomOptions]);

  // ══════════════════════════════════════
  //  数据计算（核心）
  // ══════════════════════════════════════
  const computed = useMemo(() => {
    const getDailyPnl = (a) => {
      const qKey = String(a.code);
      const q = quotesMap[qKey] ? quotesMap[qKey] : null;
      const catL3 = a.categoryL3 || a.tertiaryCategory;
      const isOTC = catL3 === '场外' || (!catL3 && a.market === '场外基金');
      const isUSMarket = a.market === '美股市场' || a.market === '美股';
      const _storedPrevPrice = parseFloat(a.prevPrice) || 0;
      // 场外基金：优先用存储的 currentPrice/prevPrice（基金净值）
      const _curr = parseFloat(a.currentPrice) || 0;
      if (isOTC && _storedPrevPrice > 0 && _curr > 0) {
        const qty = parseFloat(a.shares || a.quantity) || 0;
        return (_curr - _storedPrevPrice) * qty;
      }
      if (q && q.price != null && q.prevClose != null && q.prevClose !== 0) {
        const qty = parseFloat(a.shares || a.quantity) || 0;
        // 美股市场：当实时价等于昨收价（盘外时间），改用昨收价与前一日收盘价计算
        if (isUSMarket && Math.abs(q.price - q.prevClose) < 0.0001 && _storedPrevPrice > 0) {
          return (q.prevClose - _storedPrevPrice) * qty;
        }
        return (q.price - q.prevClose) * qty;
      }
      // prevClose为0但changePct可用时，用changePct反推prevClose
      if (q && q.price != null && q.changePct != null) {
        const qty = parseFloat(a.shares || a.quantity) || 0;
        const prevClose = q.price / (1 + q.changePct / 100);
        return (q.price - prevClose) * qty;
      }
      // 美股市场：price为空但prevClose可用，用prevClose和前一日收盘价(prevPrice)计算
      if (isUSMarket && q && q.prevClose != null && q.prevClose > 0 && _storedPrevPrice > 0) {
        const qty = parseFloat(a.shares || a.quantity) || 0;
        return (q.prevClose - _storedPrevPrice) * qty;
      }
      // 其次使用资产自身存储的 prevPrice + currentPrice 计算（适用于场外基金）
      const _prevPrice = _storedPrevPrice;
      const _currPrice = parseFloat(a.currentPrice) || 0;
      if (_prevPrice > 0 && _currPrice > 0) {
        const qty = parseFloat(a.shares || a.quantity) || 0;
        return (_currPrice - _prevPrice) * qty;
      }
      return parseFloat(a.todayPnl) || parseFloat(a.dailyPnl) || 0;
    };

    const getDailyPnlRate = (a) => {
      const qKey = String(a.code);
      const q = quotesMap[qKey] ? quotesMap[qKey] : null;
      const catL3 = a.categoryL3 || a.tertiaryCategory;
      const isOTC = catL3 === '场外' || (!catL3 && a.market === '场外基金');
      const isUSMarket = a.market === '美股市场' || a.market === '美股';
      const _storedPrevPrice = parseFloat(a.prevPrice) || 0;
      // 场外基金：优先用存储的 currentPrice/prevPrice 计算日收益率
      const _currPrice = parseFloat(a.currentPrice) || 0;
      if (isOTC && _storedPrevPrice > 0 && _currPrice > 0) {
        return ((_currPrice - _storedPrevPrice) / _storedPrevPrice) * 100;
      }
      if (q && q.changePct != null) {
        // 美股市场：当实时价等于昨收价（盘外时间），changePct为0，改用昨收价与前一日收盘价计算
        if (isUSMarket && q.price != null && q.prevClose != null && Math.abs(q.price - q.prevClose) < 0.0001 && _storedPrevPrice > 0 && q.prevClose > 0) {
          return ((q.prevClose - _storedPrevPrice) / _storedPrevPrice) * 100;
        }
        return q.changePct;
      }
      // 美股市场：price为空但prevClose可用
      if (isUSMarket && q && q.prevClose != null && q.prevClose > 0 && _storedPrevPrice > 0) {
        return ((q.prevClose - _storedPrevPrice) / _storedPrevPrice) * 100;
      }
      const _prevPrice = _storedPrevPrice;
      // 对于场外基金，使用 (currentPrice - prevPrice) / prevPrice 计算日涨幅
      if (_prevPrice > 0 && _currPrice > 0) {
        return ((_currPrice - _prevPrice) / _prevPrice) * 100;
      }
      const dailyPnl = getDailyPnl(a);
      const cost = parseFloat(a.costPrice || a.cost) || 0;
      if (cost > 0) {
        return (dailyPnl / cost) * 100;
      }
      return parseFloat(a.todayPnlPercent) || parseFloat(a.dailyPnlRate) || 0;
    };

    // 将 financeAssets 映射到前端 holding 结构（倒序排列，最新数据在最上面）
    const financeAccounts = (financeAssets || []).slice().reverse().map(a => {
      const qKey = String(a.code);
      const quoteData = quotesMap[qKey];
      const catL3 = a.categoryL3 || a.tertiaryCategory;
      const isOTC = catL3 === '场外' || (!catL3 && a.market === '场外基金');

      // 价格计算优先级：
      // 1. 场外基金 → 使用存储的 currentPrice/prevPrice（基金净值，即上一交易日收盘价，由 loadFundNav 更新）
      // 2. 港股通等 → 优先使用 quotesMap（实时转换价），无效时用 rawCurrent*汇率 重算
      // 3. 其他 → 优先 quotesMap.price，回退到存储的 currentPrice
      let _price = 0;
      let _prevClose = 0;
      if (isOTC) {
        // 场外：用基金净值（由 loadFundNav 存入 currentPrice/prevPrice），确保显示上一交易日收盘价
        _price = parseFloat(a.currentPrice) || parseFloat(quoteData?.price) || 0;
        _prevClose = parseFloat(a.prevPrice) || parseFloat(quoteData?.prevClose) || 0;
      } else {
        _price = parseFloat(quoteData?.price);
        // 如果 price 为 0 但有 rawCurrent（港股通），用原始价格 * 当前汇率重算
        if ((!_price || _price === 0) && quoteData?.rawCurrent != null) {
          const hkdRate = Number(exchangeRates?.HKD) || 0.86;
          _price = Math.trunc(Number(quoteData.rawCurrent) * hkdRate * 10000) / 10000;
        }
        if (!_price || _price === 0) {
          _price = parseFloat(a.currentPrice) || 0;
        }
        _prevClose = parseFloat(quoteData?.prevClose) || parseFloat(a.prevPrice) || 0;
      }
      const _priceChange = _price > _prevClose ? 'up' : _price < _prevClose ? 'down' : 'unchanged';

      // 从交易明细动态计算持仓数据
      const transactions = a.transactions || [];
      let buyTotalQty = 0;
      let buyTotalAmount = 0;
      let sellTotalQty = 0;
      let sellTotalAmount = 0;
      let totalFees = 0;
      transactions.forEach(t => {
        const qty = parseFloat(t.quantity || t.shares) || 0;
        const amount = parseFloat(t.amount) || 0;
        const fee = parseFloat(t.commission || t.fee) || 0;
        if (!isNaN(fee)) totalFees += fee;
        if (t.type === '建仓' || t.type === '买入') {
          buyTotalQty += qty;
          buyTotalAmount += amount;
        } else if (t.type === '卖出' || t.type === '清仓') {
          sellTotalQty += Math.abs(qty);
          sellTotalAmount += Math.abs(amount);
        }
      });

      // 动态计算持仓数量（以交易明细为准）
      const _computedQty = buyTotalQty - sellTotalQty;
      const _qty = buyTotalQty > 0 ? _computedQty : (parseFloat(a.shares || a.quantity) || 0);
      // 动态计算成本价
      const _computedCostPrice = buyTotalQty > 0 ? buyTotalAmount / buyTotalQty : 0;
      const _cost = buyTotalQty > 0 ? _computedCostPrice : (parseFloat(a.costPrice || a.cost) || 0);

      const isCash = (a.category === '现金类' || a.categoryL1 === '现金类');

      // 现金类资产：currentValue 必须基于实际数量（_effectiveQty × 价格）计算，
      // 不能用存储的 currentValue 覆盖数量，避免数据错乱
      const _effectiveQty = _qty;
      // 允许现金类资产使用用户输入的价格，不再强制设为1
      const _effectivePrice = _price;
      const _costTotal = _cost * _effectiveQty;
      // 当前市值始终使用 price × qty 计算，确保与数量字段一致
      const _currentValue = _effectivePrice * _effectiveQty;

      const _holdingPnl = isCash ? 0 : Math.round((_currentValue - _costTotal) * 100) / 100;
      const _holdingPnlRate = isCash ? 0 : (_costTotal > 0 ? Math.round((_holdingPnl / _costTotal) * 100 * 100) / 100 : 0);
      return {
        id: a.id,
        market: a.market || '国内市场',
        currency: a.currency || 'CNY',
        name: a.name,
        code: a.code || '',
        assetType: a.kind || a.assetType || '',
        assetKind: a.assetKind || '',
        account: a.accountId || a.account || '',
        categoryL1: a.category || a.categoryL1 || '',
        categoryL2: a.subcategory || a.categoryL2 || '',
        categoryL3: a.tertiaryCategory || a.categoryL3 || '',
        categoryL4: a.categoryL4 || '',
        positionGroup: a.positionGroup || '',
        positionType: a.positionCategory || a.positionType || '',
        costPrice: _cost,
        quantity: _effectiveQty,
        cost: _costTotal,
        currentPrice: _effectivePrice,
        prevPrice: parseFloat(a.prevPrice) || _prevClose || 0,
        priceDate: a.priceDate || '',
        prevClose: _prevClose,
        priceChange: _priceChange,
        avgBuyPrice: a.avgBuyPrice || 0,
        holdingDays: computeHoldingDays(a),
        balance: _currentValue,
        currentValue: _currentValue,
        holdingPnl: _holdingPnl,
        holdingPnlRate: _holdingPnlRate,
        dailyPnl: isCash ? 0 : getDailyPnl(a),
        dailyPnlRate: isCash ? 0 : getDailyPnlRate(a),
        transactions: a.transactions || [],
        status: a.status || 'active',
        archiveDate: a.archiveDate || '',
        isArchived: a.status === 'archived',
        tags: Array.isArray(a.tags) ? a.tags : (a.tags ? [a.tags] : []),
      };
    });

    // 总览统计（与列表数据一致）
    const totalValue = financeAccounts.reduce((sum, a) => sum + (parseFloat(a.currentValue) || parseFloat(a.balance) || 0), 0);
    const totalCost = financeAccounts.reduce((sum, a) => sum + (parseFloat(a.cost) || 0), 0);
    const totalPnl = financeAccounts.reduce((sum, a) => sum + (parseFloat(a.holdingPnl) || 0), 0);
    const totalPnlRate = totalCost > 0 ? (totalValue - totalCost) / totalCost * 100 : 0;
    const totalDailyPnl = financeAccounts.reduce((sum, a) => sum + getDailyPnl(a), 0);
    const totalDailyPnlRate = totalValue > 0 ? (totalDailyPnl / totalValue) * 100 : 0;

    // 持仓明细汇总（基于筛选后的数据）
    const holdingsSummary = {
      totalCost: financeAccounts.reduce((sum, a) => sum + (parseFloat(a.cost) || 0), 0),
      totalMarketValue: financeAccounts.reduce((sum, a) => sum + (parseFloat(a.currentValue) || parseFloat(a.balance) || 0), 0),
      totalPnl: financeAccounts.reduce((sum, a) => sum + (parseFloat(a.holdingPnl) || 0), 0),
      totalDailyPnl: financeAccounts.reduce((sum, a) => sum + getDailyPnl(a), 0),
    };
    holdingsSummary.totalPnlRate = holdingsSummary.totalCost > 0 ? (holdingsSummary.totalMarketValue - holdingsSummary.totalCost) / holdingsSummary.totalCost * 100 : 0;
    holdingsSummary.totalDailyPnlRate = holdingsSummary.totalMarketValue > 0 ? (holdingsSummary.totalDailyPnl / holdingsSummary.totalMarketValue) * 100 : 0;

    // 分类统计
    const categoryMap = {};
    financeAccounts.forEach(account => {
      const cat = account.categoryL1 || account.category || '其他';
      if (!categoryMap[cat]) categoryMap[cat] = [];
      categoryMap[cat].push(account);
    });

    const categories = Object.entries(categoryMap).map(([name, items]) => ({
      name,
      value: items.reduce((s, a) => s + (a.balance || 0), 0),
      cost: items.reduce((s, a) => s + (a.cost || 0), 0),
      count: items.length,
      pnl: items.reduce((s, a) => s + ((a.balance || 0) - (a.cost || 0)), 0),
    })).sort((a, b) => b.value - a.value);

    // 账户本 — 按「所属账户」分组聚合
    const accountBookMap = {};
    financeAccounts.forEach(a => {
      const accName = a.account || a.name || '未分配账户';
      if (!accountBookMap[accName]) accountBookMap[accName] = [];
      accountBookMap[accName].push(a);
    });

    const accountBook = Object.entries(accountBookMap).map(([name, items]) => {
      const tv = items.reduce((s, a) => s + (parseFloat(a.currentValue) || parseFloat(a.balance) || 0), 0);
      const tc = items.reduce((s, a) => s + (parseFloat(a.cost) || 0), 0);
      const tp = items.reduce((s, a) => s + (parseFloat(a.holdingPnl) || 0), 0);
      const tdp = items.reduce((s, a) => s + (parseFloat(a.dailyPnl) || getDailyPnl(a)), 0);
      return {
        name,
        totalValue: tv,
        totalCost: tc,
        totalPnl: tp,
        totalPnlRate: tc > 0 ? (tv - tc) / tc * 100 : 0,
        totalDailyPnl: tdp,
        totalDailyPnlRate: tv > 0 ? (tdp / tv) * 100 : 0,
        count: items.length,
      };
    }).sort((a, b) => b.totalValue - a.totalValue);

    // 分类表格数据 — 带完整字段
    const categorizedHoldings = {};
    financeAccounts.forEach(a => {
      const cat = a.categoryL1 || a.category || '其他';
      if (!categorizedHoldings[cat]) categorizedHoldings[cat] = [];
      const _price = parseFloat(quotesMap[a.code]?.price) || parseFloat(a.currentPrice) || 0;
      const _prevClose = parseFloat(quotesMap[a.code]?.prevClose) || parseFloat(a.prevPrice) || 0;
      const _priceChange = _price > _prevClose ? 'up' : _price < _prevClose ? 'down' : 'unchanged';
      const _qty = parseFloat(a.quantity) || 0;
      categorizedHoldings[cat].push({
        id: a.id,
        market: a.market || '国内市场',
        currency: a.currency || 'CNY',
        name: a.name,
        code: a.code || '',
        assetType: a.assetType || a.category || '',
        account: a.account || '',
        categoryL1: a.categoryL1 || a.category || '',
        categoryL2: a.categoryL2 || '',
        categoryL3: a.categoryL3 || '',
        positionGroup: a.positionGroup || '',
        positionType: a.positionType || '',
        cost: a.cost || 0,
        quantity: a.quantity || 0,
        currentPrice: _price,
        prevPrice: parseFloat(a.prevPrice) || _prevClose || 0,
        priceDate: a.priceDate || '',
        prevClose: _prevClose,
        priceChange: _priceChange,
        avgBuyPrice: a.avgBuyPrice || 0,
        holdingDays: computeHoldingDays(a),
        balance: a.currentValue || (_price * _qty),
        currentValue: a.currentValue || (_price * _qty),
        holdingPnl: a.holdingPnl || 0,
        holdingPnlRate: a.holdingPnlRate || 0,
        dailyPnl: getDailyPnl(a),
        dailyPnlRate: getDailyPnlRate(a),
      });
    });

    return {
      totalValue, totalCost, totalPnl, totalPnlRate, totalDailyPnl, totalDailyPnlRate,
      categories, accountBook, categorizedHoldings,
      financeAccounts,
      holdingsSummary,
    };
  }, [financeAssets, quotesMap]);

  const activeHoldings = useMemo(() => {
    return computed.financeAccounts.filter(a => !a.isArchived);
  }, [computed.financeAccounts]);

  const archivedHoldings = useMemo(() => {
    const archives = stateData?.financeAssetArchives || [];
    return archives.map(a => {
      // 从交易明细实时计算最终盈亏/收益率（兼容老数据 finalPnl=0 的情况）
      const txs = a.transactions || [];
      let buyTotalAmount = 0;
      let sellTotalAmount = 0;
      let totalFees = 0;
      txs.forEach(t => {
        const amount = parseFloat(t.amount) || 0;
        const fee = parseFloat(t.commission || t.fee) || 0;
        if (!isNaN(fee)) totalFees += fee;
        if (t.type === '建仓' || t.type === '买入') {
          buyTotalAmount += amount;
        } else if (t.type === '卖出' || t.type === '清仓') {
          sellTotalAmount += Math.abs(amount);
        }
      });
      const computedFinalPnl = sellTotalAmount - buyTotalAmount - totalFees;
      const computedFinalPnlPercent = buyTotalAmount > 0 ? Math.round((computedFinalPnl / buyTotalAmount) * 100 * 100) / 100 : 0;
      // 优先使用交易明细实时计算结果；只有明细为空时才回退到数据库存档值
      const finalPnl = (txs.length > 0) ? computedFinalPnl : (parseFloat(a.finalPnl) || 0);
      const finalPnlPercent = (txs.length > 0) ? computedFinalPnlPercent : (parseFloat(a.finalPnlPercent) || 0);
      // 现金类归档资产成本和现价不再强制为1，允许用户自定义
      const isCashArchive = (a.category === '现金类' || a.kind === '现金');
      const _archiveCostPrice = parseFloat(a.costPrice) || 0;
      const _archiveShares = parseFloat(a.shares) || 0;
      const _archiveCurrentPrice = parseFloat(a.currentPrice) || 0;
      return {
        id: a.originalAssetId || a.id,
        market: a.market || '国内市场',
        currency: a.currency || 'CNY',
        name: a.name,
        code: a.code || '',
        assetType: a.kind || a.assetType || '',
        assetKind: a.kind || a.assetType || '',
        account: a.accountId || '',
        categoryL1: a.category || '',
        categoryL2: a.subcategory || '',
        categoryL3: a.tertiaryCategory || '',
        positionGroup: '',
        positionType: '',
        costPrice: _archiveCostPrice,
        quantity: _archiveShares,
        cost: _archiveCostPrice * _archiveShares,
        currentPrice: _archiveCurrentPrice,
        prevPrice: parseFloat(a.prevPrice) || 0,
        priceDate: a.archiveDate || '',
        prevClose: 0,
        priceChange: 'unchanged',
        avgBuyPrice: parseFloat(a.avgBuyPrice) || 0,
        holdingDays: 0,
        balance: 0,
        currentValue: isCashArchive ? _archiveShares : 0,
        finalPnl,
        finalPnlPercent,
        holdingPnl: finalPnl,
        holdingPnlRate: finalPnlPercent,
        dailyPnl: 0,
        dailyPnlRate: 0,
        isArchived: true,
        archiveDate: a.archiveDate,
        transactions: txs,
      };
    });
  }, [stateData?.financeAssetArchives]);

  // 账户本分页
  const accountBookTotalPages = Math.max(1, Math.ceil(computed.accountBook.length / ACCOUNTS_PER_PAGE));
  const safeAccountPage = Math.min(accountBookPage, accountBookTotalPages);
  const pagedAccountBook = computed.accountBook.slice(
    (safeAccountPage - 1) * ACCOUNTS_PER_PAGE,
    safeAccountPage * ACCOUNTS_PER_PAGE
  );

  // 加载态
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
          <button onClick={loadData} className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">
            重试
          </button>
        </div>
      </div>
    );
  }

  const { totalValue, totalCost, totalPnl, totalPnlRate, totalDailyPnl, totalDailyPnlRate,
          categories, categorizedHoldings } = computed;

  const isTotalPos = totalPnl >= 0;
  const isDayPos = totalDailyPnl >= 0;
  const categoryNames = Object.keys(categorizedHoldings).sort();

  // ══════════════════════════════════════
  //  渲染
  // ══════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30 dark:from-slate-900 dark:to-slate-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* ═══ 顶栏：标题 + 总值 + 操作按钮 ═══ */}
        <section className="rounded-2xl p-5 sm:p-6 shadow-soft"
          style={{ background: 'linear-gradient(135deg, #EEEDFF 0%, #F5F3FF 40%, #FEF3E2 100%)' }}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">💎 理财模块</h1>
                <p className="text-sm text-gray-500 mt-0.5">持仓管理 · 账户总览 · 实时盈亏</p>
              </div>
              <div className="relative">
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="appearance-none bg-white/80 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer">
                  {['CNY', 'USD', 'JPY', 'HKD', 'EUR'].map(code => (
                    <option key={code} value={code}>{getCurrencySymbol(code)} {getCurrencyName(code)}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="text-center lg:text-right">
              <div className="text-4xl sm:text-5xl font-black text-gray-900 whitespace-nowrap tabular-nums tracking-tight">
                {formatCurrencyWithRate(totalValue, 'CNY', selectedCurrency, exchangeRates)}
              </div>
              <div className="mt-1 flex items-center justify-center lg:justify-end gap-2 text-sm flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  isTotalPos ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {isTotalPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  总盈亏 {isTotalPos ? '+' : ''}{formatCurrencyWithRate(totalPnl, 'CNY', selectedCurrency, exchangeRates).replace(getCurrencySymbol(selectedCurrency), '')} ({formatPercentage(totalPnlRate)})
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  isDayPos ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  当日 {isDayPos ? '+' : ''}{formatCurrencyWithRate(totalDailyPnl, 'CNY', selectedCurrency, exchangeRates).replace(getCurrencySymbol(selectedCurrency), '')} ({formatPercentage(totalDailyPnlRate)})
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={onAssetPenetration}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-700 active:scale-[0.97] transition-all shadow-md">
                <PieChart className="w-4 h-4" /> 场内穿透
              </button>
              <button onClick={loadData}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-indigo-300 text-indigo-600 text-sm font-medium hover:bg-indigo-50 active:scale-[0.97] transition-all">
                <RefreshCw className={`w-4 h-4 ${loading || quotesLoading ? 'animate-spin' : ''}`} /> 刷新
              </button>
            </div>
          </div>
        </section>

        {/* ═══ 四张核心统计卡 ═══ */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            { IconComp: Wallet, label: '总市值', val: formatCurrencyWithRate(totalValue, 'CNY', selectedCurrency, exchangeRates), cls: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
            { IconComp: Briefcase, label: '总成本', val: formatCurrencyWithRate(totalCost, 'CNY', selectedCurrency, exchangeRates), cls: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
            { IconComp: isTotalPos ? TrendingUp : TrendingDown, label: '总盈亏', val: `${isTotalPos ? '+' : '-'}${formatCurrencyWithRate(Math.abs(totalPnl), 'CNY', selectedCurrency, exchangeRates).replace(getCurrencySymbol(selectedCurrency), '')}`, cls: `${isTotalPos ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'} dark:${isTotalPos ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}` },
            { IconComp: PieChart, label: '总收益率', val: formatPercentage(totalPnlRate), cls: `${isTotalPos ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'} dark:${isTotalPos ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}` },
          ].map((card, idx) => (
            <div key={idx} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 shadow-soft border border-gray-100/80 dark:border-slate-700/50 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className={`${card.cls} rounded-full p-1.5`}>
                  <card.IconComp className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{card.label}</span>
              </div>
              <div className={`text-lg sm:text-xl font-bold tabular-nums whitespace-nowrap ${
                card.label === '总盈亏' ? (isTotalPos ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400') :
                card.label === '总收益率' ? (isTotalPos ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400') :
                'text-gray-900 dark:text-white'
              }`}>
                {card.val}
              </div>
            </div>
          ))}
        </section>

        {/* ═══ 实时汇率卡片 ═══ */}
        <section className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-4 shadow-soft border border-gray-100/80 dark:border-slate-700/50">
          <div
            className="flex items-center gap-2 mb-3 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors select-none"
            onClick={() => loadExchangeRates(true)}
            title="点击刷新汇率"
          >
            <RefreshCw className={`w-4 h-4 text-indigo-500 ${quotesLoading ? 'animate-spin' : ''}`} />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">实时汇率</span>
            <span className="text-xs text-gray-400">基准：人民币(CNY) · 点击刷新</span>
          </div>
          <div className="flex flex-wrap gap-4 mb-2">
            {Object.entries(exchangeRates).filter(([code]) => ['USD', 'JPY', 'HKD', 'EUR'].includes(code)).map(([code, rate]) => (
              <div key={code} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{getCurrencyName(code)}</span>
                <span className="text-xs text-gray-400">1 {code}</span>
                <span className="text-base font-bold text-gray-900 dark:text-white tabular-nums">
                  = {getCurrencySymbol('CNY')}{rate.toFixed(code === 'JPY' ? 4 : 2)}
                </span>
              </div>
            ))}
          </div>
          {/* 反向汇率：1人民币对应多少其他货币 */}
          <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-100 dark:border-slate-700/50">
            {Object.entries(exchangeRates).filter(([code]) => ['USD', 'JPY', 'HKD', 'EUR'].includes(code)).map(([code, rate]) => {
              const inverseRate = rate > 0 ? 1 / rate : 0;
              return (
                <div key={`inv-${code}`} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">1 CNY</span>
                  <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                    = {inverseRate.toFixed(code === 'JPY' ? 2 : 4)} {code}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ═══ 账户本区域 ═══ */}
        <section className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-5 shadow-soft border border-gray-100/80 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-indigo-500" />
              <h2 className="text-base font-bold text-gray-900 dark:text-white">📒 账户本</h2>
              <span className="text-xs text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                共 {computed.accountBook.length} 个账户
              </span>
            </div>
            {accountBookTotalPages > 1 && (
              <Pagination page={safeAccountPage} totalPages={accountBookTotalPages} onPageChange={setAccountBookPage} />
            )}
          </div>

          {computed.accountBook.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pagedAccountBook.map(acc =>
                <AccountCard key={acc.name} {...acc} selectedCurrency={selectedCurrency} exchangeRates={exchangeRates} />
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 text-sm">
              暂无账户数据，点击「新增」添加第一笔持仓
            </div>
          )}

          {/* 账户本汇总条 */}
          {computed.accountBook.length > 1 && (
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-center text-xs">
              {[
                ['账户数', `${computed.accountBook.length}个`, ''],
                ['合计市值', formatCurrencyWithRate(totalValue, 'CNY', selectedCurrency, exchangeRates), ''],
                ['合计成本', formatCurrencyWithRate(totalCost, 'CNY', selectedCurrency, exchangeRates), ''],
                ['合计盈亏', `${isTotalPos?'+':''}${formatCurrencyWithRate(totalPnl, 'CNY', selectedCurrency, exchangeRates).replace(getCurrencySymbol(selectedCurrency), '')}`, isTotalPos?POS_CLASS:NEG_CLASS],
                ['合计收益率', formatPercentage(totalPnlRate), isTotalPos?POS_CLASS:NEG_CLASS],
                ['当日收益', `${isDayPos?'+':''}${formatCurrencyWithRate(totalDailyPnl, 'CNY', selectedCurrency, exchangeRates).replace(getCurrencySymbol(selectedCurrency), '')}`, isDayPos?POS_CLASS:NEG_CLASS],
              ].map(([label, val, cls], i) => (
                <div key={i}>
                  <p className="text-gray-400 mb-0.5">{label}</p>
                  <p className={`font-semibold tabular-nums ${cls || 'text-gray-900 dark:text-white'}`}>{val}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ═══ 持仓明细 ═══ */}
        <section className="space-y-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-500" />
              <h2 className="text-base font-bold text-gray-900 dark:text-white">📊 持仓明细</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-0.5">
                <button
                  onClick={() => setHoldingsTab('active')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    holdingsTab === 'active'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  活跃持仓 ({activeHoldings.length})
                </button>
                <button
                  onClick={() => setHoldingsTab('archived')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    holdingsTab === 'archived'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  归档持仓 ({archivedHoldings.length})
                </button>
              </div>
              {holdingsTab === 'active' && (
                <button onClick={() => { resetForm(); setShowAddModal(true); }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-700 active:scale-[0.97] transition-all shadow-md">
                  <Plus className="w-4 h-4" /> 新增持仓
                </button>
              )}
            </div>
          </div>

          {holdingsTab === 'active' ? (
            activeHoldings.length > 0 ? (
              <FinanceHoldingsTable
                key="active"
                categoryName="active"
                holdings={activeHoldings}
                colorIdx={0}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDetail={handleDetail}
                onAdd={() => { resetForm(); setShowAddModal(true); }}
                onBatchEdit={(ids) => { setSelectedIds(ids); setShowBatchEditModal(true); }}
                marketOptions={MARKET_OPTIONS}
                currencyOptions={CURRENCY_SUGGESTIONS}
                assetTypeOptions={ASSET_TYPE_OPTIONS}
                assetClassOptions={assetClassOptions}
                positionGroupOptions={positionGroupOptions}
                positionTypeOptions={allPositionTypeOptions}
                allCategoryL2Options={allCategoryL2Options}
                tags={tags}
                marketGroups={MARKET_GROUPS}
                categoryL3CustomOptions={categoryL3CustomOptions}
                categoryL4Options={categoryL4Options}
                selectedCurrency={selectedCurrency}
                exchangeRates={exchangeRates}
                financeAccounts={computed.financeAccounts}
                assetKindOptions={assetKindOptions}
              />
            ) : (
              <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-12 text-center shadow-soft border border-gray-100/80 dark:border-slate-700/50">
                <Briefcase className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm">暂无持仓数据</p>
                <button onClick={() => { resetForm(); setShowAddModal(true); }}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-700 active:scale-[0.97] transition-all shadow-md">
                  <Plus className="w-4 h-4" /> 新增持仓
                </button>
              </div>
            )
          ) : (
            archivedHoldings.length > 0 ? (
              <FinanceHoldingsTable
                key="archived"
                categoryName="archived"
                holdings={archivedHoldings}
                colorIdx={0}
                onEdit={null}
                onDelete={handleDeleteArchive}
                onDetail={handleDetail}
                onBatchEdit={(ids) => { setSelectedIds(ids); setShowBatchEditModal(true); }}
                marketOptions={MARKET_OPTIONS}
                currencyOptions={CURRENCY_SUGGESTIONS}
                assetTypeOptions={ASSET_TYPE_OPTIONS}
                assetClassOptions={assetClassOptions}
                positionGroupOptions={positionGroupOptions}
                positionTypeOptions={allPositionTypeOptions}
                allCategoryL2Options={allCategoryL2Options}
                tags={tags}
                marketGroups={MARKET_GROUPS}
                categoryL3CustomOptions={categoryL3CustomOptions}
                categoryL4Options={categoryL4Options}
                selectedCurrency={selectedCurrency}
                exchangeRates={exchangeRates}
                financeAccounts={computed.financeAccounts}
                assetKindOptions={assetKindOptions}
              />
            ) : (
              <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-12 text-center shadow-soft border border-gray-100/80 dark:border-slate-700/50">
                <Archive className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm">暂无归档持仓</p>
                <p className="text-gray-400 text-xs mt-1">卖出或清仓操作后持仓将自动归档</p>
              </div>
            )
          )}
        </section>

        {/* ══════════════════════════════════════
            详情弹窗
           ══════════════════════════════════════ */}
        {showDetailModal && (
          <DetailModal
            data={detailData}
            totalMarketValue={computed.totalMarketValue || 0}
            onClose={() => setShowDetailModal(false)}
            saveState={saveState}
            stateData={stateData}
            setStateData={setStateData}
            onRefresh={loadData}
            selectedCurrency={selectedCurrency}
            exchangeRates={exchangeRates}
            quotesMap={quotesMap}
            readOnly={detailData?.isArchived || detailData?.status === 'archived'}
          />
        )}

        {/* ══════════════════════════════════════
            新增弹窗（保持不变，仅改货币单位为可编辑）
           ══════════════════════════════════════ */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editMode ? '编辑持仓资产' : '新增持仓资产'}</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* 表单主体 */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center font-bold">1</div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">分类选择</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                  {/* Row 1: 市场 | 货币单位（可自由编辑） */}
                  <FormField label="市场" required>
                    <select value={newAccount.market} onChange={e => {
                      const market = e.target.value;
                      let currency = newAccount.currency;
                      if (market === '国内市场') currency = 'CNY';
                      else if (market === '港股市场') currency = 'HKD';
                      else if (market === '美股市场') currency = 'USD';

                      setNewAccount({ ...newAccount, market, currency });
                    }}
                      className={FORM_SELECT}>
                      {MARKET_GROUPS.map(g => (
                        g.options.length === 1
                          ? <option key={g.options[0]} value={g.options[0]}>{g.options[0]}</option>
                          : <optgroup key={g.label} label={g.label}>
                            {g.options.map(o => <option key={o} value={o}>{o}</option>)}
                          </optgroup>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="货币单位">
                    <div className="relative">
                      <input
                        type="text"
                        list="currency-suggestions"
                        value={newAccount.currency}
                        onChange={e => setNewAccount({ ...newAccount, currency: e.target.value.toUpperCase() })}
                        placeholder="CNY / CNH / USD / 自定义..."
                        className={`${FORM_INPUT} pr-8 font-mono`}
                      />
                      <datalist id="currency-suggestions">
                        {CURRENCY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                  </FormField>

                  {/* Row 2: 资产种类 | 资产分类一级 */}
                  <FormField label="资产种类" required>
                    <div className="flex gap-2">
                      <select value={newAccount.assetKind} onChange={e => {
                        setNewAccount({ ...newAccount, assetKind: e.target.value });
                      }}
                        className={`${FORM_SELECT} flex-1`}>
                        <option value="">请选择资产种类</option>
                        {assetKindOptions.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <button onClick={() => {
                        const newKind = prompt('请输入新的资产种类名称');
                        if (newKind && newKind.trim() && !assetKindOptions.includes(newKind.trim())) {
                          const updated = [...new Set([...assetKindOptions, newKind.trim()])];
                          setAssetKindOptions(updated);
                          localStorage.setItem('finance_asset_kind_options', JSON.stringify(updated));
                        }
                      }} className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors" title="添加资产种类">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </FormField>

                  <FormField label="资产分类一级" required>
                    <div className="flex gap-2">
                      <select value={newAccount.categoryL1} onChange={e => {
                        const l1 = e.target.value;
                        const cascade = CASCADE_OPTIONS[newAccount.assetType];
                        if (cascade && cascade.l2Default && cascade.l2Default[l1]) {
                          const l2 = cascade.l2Default[l1];
                          const l3 = cascade.l3Default?.[l1]?.[l2] || '';
                          setNewAccount({ ...newAccount, categoryL1: l1, categoryL2: l2, categoryL3: l3, categoryL4: '' });
                        } else {
                          setNewAccount({ ...newAccount, categoryL1: l1, categoryL2: '', categoryL3: '', categoryL4: '' });
                        }
                      }}
                        className={`${FORM_SELECT} flex-1`}>
                        <option value="">请选择</option>
                        {categoryL1Options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <button onClick={() => setShowCategoryL1Modal(true)} className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors" title="管理一级分类">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </FormField>

                  {/* Row 3: 资产类型 | 所属账户 */}
                  <FormField label="资产类型" required>
                    <div className="flex gap-2">
                      <select value={newAccount.assetType} onChange={e => {
                        const assetType = e.target.value;
                        const isCash = assetType === '现金';
                        const cascade = CASCADE_OPTIONS[assetType];
                        let updates = {
                          assetType: assetType,
                          positionGroup: '',
                          positionType: '',
                        };
                        if (cascade) {
                          const currentL1 = newAccount.categoryL1;
                          const l1Options = cascade.l1Options || [];
                          const l1Valid = currentL1 && l1Options.includes(currentL1);
                          const l1 = l1Valid ? currentL1 : (cascade.l1Default || currentL1 || '');
                          if (l1) {
                            const l2 = cascade.l2Default?.[l1] || '';
                            const l3 = cascade.l3Default?.[l1]?.[l2] || '';
                            updates = { ...updates, categoryL1: l1, categoryL2: l2, categoryL3: l3, categoryL4: '' };
                          }
                        }
                        setNewAccount({ ...newAccount, ...updates });
                      }}
                        className={`${FORM_SELECT} flex-1`}>
                        <option value="">请选择资产类型</option>
                        {(() => {
                          const mapped = CATEGORY_L1_ASSET_TYPES[newAccount.categoryL1];
                          if (mapped) {
                            return [...new Set([...mapped, ...assetTypeOptions])].map(o => <option key={o} value={o}>{o}</option>);
                          }
                          return assetTypeOptions.map(o => <option key={o} value={o}>{o}</option>);
                        })()}
                      </select>
                      <button onClick={() => setShowAssetTypeModal(true)} className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors" title="管理资产类型">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </FormField>

                  <FormField label="所属账户" required>
                    <select value={newAccount.account} onChange={e => setNewAccount({ ...newAccount, account: e.target.value })}
                      className={FORM_SELECT}>
                      <option value="">请选择账户</option>
                      {accounts.filter(acc => !acc.liability && acc.type !== '负债').map(acc =>
                        <option key={acc.id || acc.name} value={acc.name}>{acc.name}</option>
                      )}
                    </select>
                  </FormField>

                  {newAccount.categoryL1 && (<>
                  {/* Row 4: 资产分类二级 */}
                  <FormField label="资产分类二级" required>
                    <div className="flex gap-2">
                      <select value={newAccount.categoryL2} onChange={e => {
                        const l2 = e.target.value;
                        const cascade = CASCADE_OPTIONS[newAccount.assetType];
                        if (cascade && cascade.l3Default && cascade.l3Default[newAccount.categoryL1] && cascade.l3Default[newAccount.categoryL1][l2]) {
                          const l3 = cascade.l3Default[newAccount.categoryL1][l2];
                          setNewAccount({ ...newAccount, categoryL2: l2, categoryL3: l3, categoryL4: '' });
                        } else {
                          setNewAccount({ ...newAccount, categoryL2: l2, categoryL3: '', categoryL4: '' });
                        }
                      }}
                        className={`${FORM_SELECT} flex-1`}>
                        <option value="">请选择</option>
                        {categoryL2Options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <button onClick={() => { if (newAccount.categoryL1) setShowCategoryL2Modal(true); }} disabled={!newAccount.categoryL1} className={`p-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors ${!newAccount.categoryL1 ? 'opacity-50 cursor-not-allowed' : ''}`} title="管理二级分类">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </FormField>
                  </>)}

                  {newAccount.categoryL2 && (<>
                  {/* Row 4: 资产分类三级 | 资产分类四级 */}
                  <FormField label="资产分类三级" required>
                    <div className="flex gap-2">
                      <select value={newAccount.categoryL3} onChange={e => setNewAccount({ ...newAccount, categoryL3: e.target.value, categoryL4: '' })}
                        className={`${FORM_SELECT} flex-1`}>
                        <option value="">请选择</option>
                        {categoryL3Options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <button onClick={() => { if (newAccount.categoryL2) setShowCategoryL3Modal(true); }} disabled={!newAccount.categoryL2} className={`p-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors ${!newAccount.categoryL2 ? 'opacity-50 cursor-not-allowed' : ''}`} title="管理三级分类">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </FormField>
                  </>)}

                  {newAccount.categoryL3 && (<>
                  <FormField label="资产分类四级">
                    <div className="flex gap-2">
                      <select value={newAccount.categoryL4 || ''} onChange={e => setNewAccount({ ...newAccount, categoryL4: e.target.value })}
                        className={`${FORM_SELECT} flex-1`}>
                        <option value="">请选择</option>
                        {(() => {
                          const cascade = CASCADE_OPTIONS[newAccount.assetType];
                          if (newAccount.market === '国内市场' && cascade && cascade.l4Options[newAccount.categoryL1] && cascade.l4Options[newAccount.categoryL1][newAccount.categoryL2] && cascade.l4Options[newAccount.categoryL1][newAccount.categoryL2][newAccount.categoryL3]) {
                            return cascade.l4Options[newAccount.categoryL1][newAccount.categoryL2][newAccount.categoryL3].map(o => <option key={o} value={o}>{o}</option>);
                          }
                          return (categoryL4Options[newAccount.categoryL1] || []).map(o => <option key={o} value={o}>{o}</option>);
                        })()}
                      </select>
                      <button onClick={() => { if (newAccount.categoryL3) setShowCategoryL4Modal(true); }} disabled={!newAccount.categoryL3} className={`p-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors ${!newAccount.categoryL3 ? 'opacity-50 cursor-not-allowed' : ''}`} title="管理四级分类">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </FormField>
                  </>)}

                  {/* Row 5: 持仓分组 | 持仓分类 */}
                  <FormField label="持仓分组" required>
                    <div className="flex gap-2">
                      <select
                        value={newAccount.positionGroup}
                        onChange={e => setNewAccount({ ...newAccount, positionGroup: e.target.value })}
                        disabled={!newAccount.assetType}
                        className={`${FORM_SELECT} flex-1 ${!newAccount.assetType ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <option value="">{newAccount.assetType ? '请选择' : '请先选择资产类型'}</option>
                        {(ASSET_TYPE_POSITION_GROUP_MAP[newAccount.assetType] || []).map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <button onClick={() => setShowPositionGroupModal(true)} className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors" title="管理持仓分组">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </FormField>

                  <FormField label="持仓分类" required>
                    <div className="flex gap-2">
                      <select
                        value={newAccount.positionType}
                        onChange={e => setNewAccount({ ...newAccount, positionType: e.target.value })}
                        disabled={!newAccount.assetType}
                        className={`${FORM_SELECT} flex-1 ${!newAccount.assetType ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <option value="">{newAccount.assetType ? '请选择' : '请先选择资产类型'}</option>
                        {currentPositionTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <button onClick={() => { if (newAccount.assetType) setShowPositionTypeModal(true); }} disabled={!newAccount.assetType} className={`p-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 transition-colors ${!newAccount.assetType ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-slate-600'}`} title={newAccount.assetType ? '管理持仓分类' : '请先选择资产类型'}>
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </FormField>

                </div>

                {/* === 第二步：资产详情（分类选择完成后显示）=== */}
                {newAccount.market && newAccount.assetType && newAccount.categoryL1 && newAccount.categoryL2 && newAccount.categoryL3 ? (
                  <>
                    <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center font-bold">2</div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">资产详情</span>
                        <span className="text-xs text-gray-400">
                          {newAccount.market === '国内市场' && newAccount.assetType === '股票' && '· 股票'}
                          {newAccount.market === '国内市场' && newAccount.assetType === '基金' && newAccount.categoryL3 === '场内' && '· 场内基金'}
                          {newAccount.market === '国内市场' && newAccount.assetType === '基金' && newAccount.categoryL3 === '场外' && '· 场外基金'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                      {/* 资产名称 */}
                      <FormField label="资产名称" required>
                        <div className="relative">
                          <input
                            type="text"
                            value={newAccount.name}
                            onChange={e => {
                              setNewAccount({ ...newAccount, name: e.target.value });
                              handleCodeSearch(e.target.value);
                            }}
                            onFocus={() => newAccount.name && handleCodeSearch(newAccount.name)}
                            onBlur={() => { setShowLookupDropdown(false); setShowEngineMenu(false); }}
                            placeholder="基金、股票或自定义资产名称"
                            className={FORM_INPUT}
                          />
                          {showLookupDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-50 max-h-52 overflow-y-auto">
                              {lookupLoading ? (
                                <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">搜索中...</div>
                              ) : lookupResults.length === 0 ? (
                                renderNoMatchWithEngineSearch(newAccount.name || newAccount.code || '')
                              ) : (
                                lookupResults.map((item, idx) => (
                                  <div
                                    key={idx}
                                    onMouseDown={(e) => { e.preventDefault(); handleSelectLookup(item); }}
                                    className="px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-600 border-b border-gray-100 dark:border-slate-600 last:border-b-0"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{item.code}</span>
                                      {item.price && <span className="text-xs text-gray-500 dark:text-gray-400">¥{item.price}</span>}
                                    </div>
                                    <div className="text-sm text-gray-800 dark:text-gray-200 truncate">{item.name}</div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </FormField>

                      {/* 资产代码 */}
                      <FormField label="资产代码" required>
                        <div className="relative">
                          <input
                            type="text"
                            value={newAccount.code}
                            onChange={e => {
                              setNewAccount({ ...newAccount, code: e.target.value });
                              handleCodeSearch(e.target.value);
                            }}
                            onFocus={() => newAccount.code && handleCodeSearch(newAccount.code)}
                            onBlur={() => { setShowLookupDropdown(false); setShowEngineMenu(false); }}
                            placeholder="输入代码如 600519"
                            className={`${FORM_INPUT} font-mono`}
                          />
                          {showLookupDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-50 max-h-52 overflow-y-auto">
                              {lookupLoading ? (
                                <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">搜索中...</div>
                              ) : lookupResults.length === 0 ? (
                                renderNoMatchWithEngineSearch(newAccount.code || newAccount.name || '')
                              ) : (
                                lookupResults.map((item, idx) => (
                                  <div
                                    key={idx}
                                    onMouseDown={(e) => { e.preventDefault(); handleSelectLookup(item); }}
                                    className="px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-600 border-b border-gray-100 dark:border-slate-600 last:border-b-0"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{item.code}</span>
                                      {item.price && <span className="text-xs text-gray-500 dark:text-gray-400">¥{item.price}</span>}
                                    </div>
                                    <div className="text-sm text-gray-800 dark:text-gray-200 truncate">{item.name}</div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </FormField>

                      {/* 平均买入成本 */}
                      <FormField label="平均买入成本" required>
                        <input type="number" step="0.001"
                          value={newAccount.cost}
                          onChange={e => {
                            const val = e.target.value;
                            setNewAccount(p => {
                              const qty = parseFloat(p.quantity) || 0;
                              const cost = parseFloat(val) || 0;
                              const price = parseFloat(p.currentPrice) || 0;
                              const currentValue = qty * price;
                              const unitPnl = price - cost;
                              const holdingPnl = unitPnl * qty;
                              const holdingPnlRate = cost > 0 ? (unitPnl / cost) * 100 : 0;
                              return {
                                ...p,
                                cost: val,
                                currentValue: currentValue ? currentValue.toFixed(2) : p.currentValue,
                                holdingPnl: (cost || qty || price) ? holdingPnl.toFixed(2) : p.holdingPnl,
                                holdingPnlRate: (cost || qty || price) ? holdingPnlRate.toFixed(2) : p.holdingPnlRate,
                              };
                            });
                          }}
                          placeholder="0.00"
                          className={FORM_INPUT} />
                      </FormField>

                      {/* 份额/数量 - 根据资产类型动态显示标签 */}
                      <FormField label={
                        newAccount.market === '国内市场' && newAccount.assetType === '基金' && newAccount.categoryL3 === '场外'
                          ? '持仓份额'
                          : (newAccount.market === '国内市场' && (newAccount.assetType === '股票' || (newAccount.assetType === '基金' && newAccount.categoryL3 === '场内')))
                            ? '持仓数量'
                            : '份额 / 数量'
                      } required>
                        <input type="number" step="0.0001" value={newAccount.quantity} onChange={e => {
                          const val = e.target.value;
                          setNewAccount(p => {
                            const qty = parseFloat(val) || 0;
                            const cost = parseFloat(p.cost) || 0;
                            const price = parseFloat(p.currentPrice) || 0;
                            const currentValue = qty * price;
                            const unitPnl = price - cost;
                            const holdingPnl = unitPnl * qty;
                            const holdingPnlRate = cost > 0 ? (unitPnl / cost) * 100 : 0;
                            return {
                              ...p,
                              quantity: val,
                              currentValue: currentValue ? currentValue.toFixed(2) : p.currentValue,
                              holdingPnl: (cost || qty || price) ? holdingPnl.toFixed(2) : p.holdingPnl,
                              holdingPnlRate: (cost || qty || price) ? holdingPnlRate.toFixed(2) : p.holdingPnlRate,
                            };
                          });
                        }}
                          placeholder="0" className={FORM_INPUT} />
                      </FormField>

                      {/* 持仓天数 */}
                      <FormField label="持仓天数">
                        <input type="number" value={newAccount.holdingDays} onChange={e => setNewAccount({ ...newAccount, holdingDays: e.target.value })}
                          placeholder="0" className={FORM_INPUT} />
                      </FormField>

                      {/* 现价 — 所有场景都显示，支持自动获取和手动输入 */}
                      <FormField label="现价">
                        <input type="number" step="0.0001"
                          value={newAccount.currentPrice}
                          onChange={e => {
                            const val = e.target.value;
                            setNewAccount(p => {
                              const qty = parseFloat(p.quantity) || 0;
                              const cost = parseFloat(p.cost) || 0;
                              const price = parseFloat(val) || 0;
                              const currentValue = qty * price;
                              const unitPnl = price - cost;
                              const holdingPnl = unitPnl * qty;
                              const holdingPnlRate = cost > 0 ? (unitPnl / cost) * 100 : 0;
                              return {
                                ...p,
                                currentPrice: val,
                                currentValue: currentValue ? currentValue.toFixed(2) : p.currentValue,
                                holdingPnl: (cost || qty || price) ? holdingPnl.toFixed(2) : p.holdingPnl,
                                holdingPnlRate: (cost || qty || price) ? holdingPnlRate.toFixed(2) : p.holdingPnlRate,
                              };
                            });
                          }} placeholder="搜索资产自动获取，或手动输入"
                          className={FORM_INPUT} />
                      </FormField>

                      {/* 以下字段仅在非国内市场简单模式（股票/基金场内/基金场外）时显示 */}
                      {!(newAccount.market === '国内市场' && (newAccount.assetType === '股票' || (newAccount.assetType === '基金' && (newAccount.categoryL3 === '场内' || newAccount.categoryL3 === '场外')))) && (
                        <>
                          <FormField label="持仓盈亏">
                            <div className="relative">
                              <input type="number" step="0.001" value={newAccount.holdingPnl}
                                onChange={e => setNewAccount({ ...newAccount, holdingPnl: e.target.value })}
                                placeholder="自动计算 或 手动输入"
                                className={`${FORM_INPUT} pl-7 ${pnlClass(newAccount.holdingPnl)}`} />
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">¥</span>
                            </div>
                          </FormField>

                          <FormField label="持仓盈亏率">
                            <div className="relative">
                              <input type="number" step="0.001" value={newAccount.holdingPnlRate}
                                onChange={e => setNewAccount({ ...newAccount, holdingPnlRate: e.target.value })}
                                placeholder="自动计算 或 手动输入" className={`${FORM_INPUT} pr-7 ${pnlClass(newAccount.holdingPnlRate)}`} />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                            </div>
                          </FormField>

                          <div className="sm:col-span-2">
                            <FormField label="当前市值" markRequired fullWidth>
                              <div className="relative">
                                <input type="number" step="0.001" value={newAccount.currentValue}
                                  readOnly
                                  placeholder="自动计算"
                                  className={`${FORM_INPUT} pl-7 font-semibold bg-gray-50 dark:bg-slate-700 cursor-not-allowed`} />
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">¥</span>
                              </div>
                              {(newAccount.quantity && newAccount.currentPrice) && (
                                <p className="mt-1 text-xs text-gray-400">
                                  = {newAccount.quantity} × {newAccount.currentPrice} = {(parseFloat(newAccount.quantity) * parseFloat(newAccount.currentPrice)).toFixed(2)}
                                </p>
                              )}
                            </FormField>
                          </div>
                        </>
                      )}

                      {/* 标签 — 全宽 */}
                      <div className="sm:col-span-2">
                        <FormField label="标签" fullWidth>
                          <div className="flex gap-2">
                            <select
                              value={newAccount.tags || ''}
                              onChange={e => setNewAccount({ ...newAccount, tags: e.target.value })}
                              className={`${FORM_SELECT} flex-1`}>
                              <option value="">请选择标签</option>
                              {tags.map(tag => (
                                <option key={tag} value={tag}>{tag}</option>
                              ))}
                            </select>
                            <button onClick={() => setShowTagModal(true)} className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                              <Settings className="w-4 h-4" />
                            </button>
                          </div>
                        </FormField>
                      </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-slate-600 text-gray-500 text-xs flex items-center justify-center font-bold">2</div>
                      <span className="text-sm text-gray-400 dark:text-gray-500">资产详情</span>
                    </div>
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">请先完成上方市场、资产类型和分类选择</p>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                  <button onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 font-medium transition-colors">
                    取消
                  </button>
                  <button onClick={handleSaveAccount} disabled={saving || !newAccount.name}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 font-semibold transition-colors shadow-md shadow-indigo-200">
                    {saving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ 标签管理弹窗 ═══ */}
        {showTagModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">标签管理</h3>
                <button onClick={() => setShowTagModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={newTagName} onChange={e => setNewTagName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTag()} placeholder="输入标签名称" className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  <button onClick={handleAddTag} className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {tags.length > 0 ? (
                    tags.map((tag) => (
                      <div key={tag} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        {tagToEdit === tag ? (
                          <>
                            <input type="text" value={newTagName || tag} onChange={e => setNewTagName(e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-600 dark:text-white" autoFocus />
                            <button onClick={handleSaveTagEdit} className="p-1 text-green-600 hover:bg-green-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => { setTagToEdit(null); setNewTagName(''); }} className="p-1 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-gray-700 dark:text-gray-300">{tag}</span>
                            <button onClick={() => { setTagToEdit(tag); setNewTagName(tag); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            {deleteConfirm === `tag-${tag}` ? (
                              <button onClick={() => handleDeleteTag(tag)} className="p-1 text-red-600 hover:bg-red-100 rounded">确认</button>
                            ) : (
                              <button onClick={() => setDeleteConfirm(`tag-${tag}`)} className="p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">暂无标签</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ 批量编辑弹窗 ═══ */}
        {showBatchEditModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">批量编辑 ({selectedIds.size} 条记录)</h3>
                <button onClick={() => { setShowBatchEditModal(false); setBatchEditData({ market: '', currency: '', assetType: '', account: '', categoryL1: '', categoryL2: '', categoryL3: '', positionGroup: '', positionType: '', tag: '' }); }} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                <FormField label="市场">
                  <select value={batchEditData.market} onChange={e => setBatchEditData({ ...batchEditData, market: e.target.value })} className={FORM_SELECT}>
                    <option value="">不修改</option>
                    {MARKET_GROUPS.map(g => (
                      g.options.length === 1
                        ? <option key={g.options[0]} value={g.options[0]}>{g.options[0]}</option>
                        : <optgroup key={g.label} label={g.label}>
                          {g.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </optgroup>
                    ))}
                  </select>
                </FormField>

                <FormField label="货币单位">
                  <div className="relative">
                    <input type="text" list="batch-currency-suggestions" value={batchEditData.currency} onChange={e => setBatchEditData({ ...batchEditData, currency: e.target.value.toUpperCase() })} placeholder="不修改 / CNY / USD..." className={`${FORM_INPUT} pr-8 font-mono`} />
                    <datalist id="batch-currency-suggestions">
                      {CURRENCY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                </FormField>

                <FormField label="资产类型">
                  <select value={batchEditData.assetType} onChange={e => setBatchEditData({ ...batchEditData, assetType: e.target.value, categoryL2: '', categoryL3: '' })} className={FORM_SELECT}>
                    <option value="">不修改</option>
                    {ASSET_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </FormField>

                <FormField label="所属账户">
                  <select value={batchEditData.account} onChange={e => setBatchEditData({ ...batchEditData, account: e.target.value })} className={FORM_SELECT}>
                    <option value="">不修改</option>
                    {accounts.filter(acc => !acc.liability && acc.type !== '负债').map(acc => <option key={acc.id || acc.name} value={acc.name}>{acc.name}</option>)}
                  </select>
                </FormField>

                <FormField label="资产分类">
                  <select value={batchEditData.categoryL1} onChange={e => {
                    setBatchEditData({ ...batchEditData, categoryL1: e.target.value, categoryL2: '', categoryL3: '' });
                  }} className={FORM_SELECT}>
                    <option value="">不修改</option>
                    {assetClassOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </FormField>

                <FormField label="资产分类二级">
                  <select value={batchEditData.categoryL2} onChange={e => {
                    setBatchEditData({ ...batchEditData, categoryL2: e.target.value, categoryL3: '' });
                  }} className={FORM_SELECT}>
                    <option value="">不修改</option>
                    {categoryL2Options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </FormField>

                <FormField label="资产三级分类">
                  <select value={batchEditData.categoryL3} onChange={e => setBatchEditData({ ...batchEditData, categoryL3: e.target.value })} className={FORM_SELECT}>
                    <option value="">不修改</option>
                    <option value="">未分类</option>
                    {categoryL3Options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </FormField>

                <FormField label="持仓分组">
                  <select value={batchEditData.positionGroup} onChange={e => setBatchEditData({ ...batchEditData, positionGroup: e.target.value })} className={FORM_SELECT}>
                    <option value="">不修改</option>
                    {positionGroupOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </FormField>

                <FormField label="持仓分类">
                  <select value={batchEditData.positionType} onChange={e => setBatchEditData({ ...batchEditData, positionType: e.target.value })} className={FORM_SELECT}>
                    <option value="">不修改</option>
                    {allPositionTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </FormField>

                <FormField label="标签">
                  <select value={batchEditData.tag} onChange={e => setBatchEditData({ ...batchEditData, tag: e.target.value })} className={FORM_SELECT}>
                    <option value="">不修改</option>
                    {tags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                  </select>
                </FormField>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700 mt-4">
                <button onClick={() => { setShowBatchEditModal(false); setBatchEditData({ market: '', currency: '', assetType: '', account: '', categoryL1: '', categoryL2: '', categoryL3: '', positionGroup: '', positionType: '', tag: '' }); }} className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 font-medium transition-colors">
                  取消
                </button>
                <button onClick={handleBatchSave} className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 font-semibold transition-colors shadow-md shadow-indigo-200">
                  保存修改
                </button>
              </div>
            </div>
          </div>
        )}

        {showAssetTypeModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">资产类型管理</h3>
                <button onClick={() => setShowAssetTypeModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={newAssetTypeName} onChange={e => setNewAssetTypeName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddAssetType()} placeholder="输入资产类型名称" className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  <button onClick={handleAddAssetType} className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {assetTypeOptions.length > 0 ? (
                    assetTypeOptions.map((item) => (
                      <div key={item} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        {assetTypeToEdit === item ? (
                          <>
                            <input type="text" value={newAssetTypeName || item} onChange={e => setNewAssetTypeName(e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-600 dark:text-white" autoFocus />
                            <button onClick={handleSaveAssetTypeEdit} className="p-1 text-green-600 hover:bg-green-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => { setAssetTypeToEdit(null); setNewAssetTypeName(''); }} className="p-1 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-gray-700 dark:text-gray-300">{item}</span>
                            <button onClick={() => { setAssetTypeToEdit(item); setNewAssetTypeName(item); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            {deleteConfirm === `at-${item}` ? (
                              <button onClick={() => handleDeleteAssetType(item)} className="p-1 text-red-600 hover:bg-red-100 rounded">确认</button>
                            ) : (
                              <button onClick={() => setDeleteConfirm(`at-${item}`)} className="p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">暂无资产类型</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showCategoryL1Modal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">资产分类一级管理</h3>
                <button onClick={() => setShowCategoryL1Modal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={newCategoryL1Name} onChange={e => setNewCategoryL1Name(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCategoryL1()} placeholder="输入一级分类名称" className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  <button onClick={handleAddCategoryL1} className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {categoryL1Options.length > 0 ? (
                    categoryL1Options.map((item) => (
                      <div key={item} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        {categoryL1ToEdit === item ? (
                          <>
                            <input type="text" value={newCategoryL1Name || item} onChange={e => setNewCategoryL1Name(e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-600 dark:text-white" autoFocus />
                            <button onClick={handleSaveCategoryL1Edit} className="p-1 text-green-600 hover:bg-green-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => { setCategoryL1ToEdit(null); setNewCategoryL1Name(''); }} className="p-1 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-gray-700 dark:text-gray-300">{item}</span>
                            <button onClick={() => { setCategoryL1ToEdit(item); setNewCategoryL1Name(item); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            {deleteConfirm === `catL1-${item}` ? (
                              <button onClick={() => handleDeleteCategoryL1(item)} className="p-1 text-red-600 hover:bg-red-100 rounded">确认</button>
                            ) : (
                              <button onClick={() => setDeleteConfirm(`catL1-${item}`)} className="p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">暂无一级分类</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showCategoryL2Modal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">资产分类二级管理</h3>
                <button onClick={() => setShowCategoryL2Modal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                当前一级分类: {newAccount.categoryL1 || '未选择'}
                {newAccount.assetType && <span className="ml-2">资产类型: {newAccount.assetType}</span>}
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={newCategoryL2Name} onChange={e => setNewCategoryL2Name(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCategoryL2()} placeholder="输入二级分类名称" className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  <button onClick={handleAddCategoryL2} disabled={!newAccount.categoryL1 || !newAccount.assetType} className={`px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors ${(!newAccount.categoryL1 || !newAccount.assetType) ? 'opacity-50 cursor-not-allowed' : ''}`}><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(() => {
                    const l2Key = getL2Key();
                    const options = categoryL2OptionsMap[l2Key] || [];
                    // 合并 cascade 默认值（作为基础选项，不可删除）
                    const cascadeDefaults = CASCADE_OPTIONS[newAccount.assetType]?.l2Options?.[newAccount.categoryL1] || [];
                    const allItems = [...new Set([...cascadeDefaults, ...options])];
                    return allItems.length > 0 ? (
                      allItems.map((item) => (
                        <div key={item} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                          {categoryL2ToEdit === item ? (
                            <>
                              <input type="text" value={newCategoryL2Name || item} onChange={e => setNewCategoryL2Name(e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-600 dark:text-white" autoFocus />
                              <button onClick={handleSaveCategoryL2Edit} className="p-1 text-green-600 hover:bg-green-100 rounded"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => { setCategoryL2ToEdit(null); setNewCategoryL2Name(''); }} className="p-1 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 text-gray-700 dark:text-gray-300">
                                {item}
                                {cascadeDefaults.includes(item) && !options.includes(item) && (
                                  <span className="ml-1 text-xs text-gray-400">(默认)</span>
                                )}
                              </span>
                              <button onClick={() => { setCategoryL2ToEdit(item); setNewCategoryL2Name(item); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
                              {(options.includes(item) || !cascadeDefaults.includes(item)) && (
                                deleteConfirm === `catL2-${item}` ? (
                                  <button onClick={() => handleDeleteCategoryL2(item)} className="p-1 text-red-600 hover:bg-red-100 rounded">确认</button>
                                ) : (
                                  <button onClick={() => setDeleteConfirm(`catL2-${item}`)} className="p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                                )
                              )}
                            </>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        {newAccount.assetType ? '暂无二级分类，可添加新选项' : '请先选择资产类型'}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {showCategoryL3Modal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">资产分类三级管理</h3>
                <button onClick={() => setShowCategoryL3Modal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">当前一级分类: {newAccount.categoryL1 || '未选择'} | 二级分类: {newAccount.categoryL2 || '未选择'}</div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={newCategoryL3Name} onChange={e => setNewCategoryL3Name(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCategoryL3()} placeholder="输入三级分类名称" className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  <button onClick={handleAddCategoryL3} className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(() => {
                    const key = `${newAccount.categoryL1}__${newAccount.categoryL2}`;
                    const options = categoryL3OptionsMap[key] || [];
                    return options.length > 0 ? (
                      options.map((item) => (
                        <div key={item} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                          {categoryL3ToEdit === item ? (
                            <>
                              <input type="text" value={newCategoryL3Name || item} onChange={e => setNewCategoryL3Name(e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-600 dark:text-white" autoFocus />
                              <button onClick={handleSaveCategoryL3Edit} className="p-1 text-green-600 hover:bg-green-100 rounded"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => { setCategoryL3ToEdit(null); setNewCategoryL3Name(''); }} className="p-1 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 text-gray-700 dark:text-gray-300">{item}</span>
                              <button onClick={() => { setCategoryL3ToEdit(item); setNewCategoryL3Name(item); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
                              {deleteConfirm === `catL3-${item}` ? (
                                <button onClick={() => handleDeleteCategoryL3(item)} className="p-1 text-red-600 hover:bg-red-100 rounded">确认</button>
                              ) : (
                                <button onClick={() => setDeleteConfirm(`catL3-${item}`)} className="p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                              )}
                            </>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-400 text-sm">暂无三级分类</div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {showCategoryL4Modal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">资产四级分类管理</h3>
                <button onClick={() => setShowCategoryL4Modal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">当前一级分类: {newAccount.categoryL1 || '未选择'}</div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={newCategoryL4Name} onChange={e => setNewCategoryL4Name(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCategoryL4()} placeholder="输入分类名称" className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  <button onClick={handleAddCategoryL4} className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(categoryL4Options[newAccount.categoryL1] || []).length > 0 ? (
                    (categoryL4Options[newAccount.categoryL1] || []).map((item) => (
                      <div key={item} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        {categoryL4ToEdit === item ? (
                          <>
                            <input type="text" value={newCategoryL4Name || item} onChange={e => setNewCategoryL4Name(e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-600 dark:text-white" autoFocus />
                            <button onClick={handleSaveCategoryL4Edit} className="p-1 text-green-600 hover:bg-green-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => { setCategoryL4ToEdit(null); setNewCategoryL4Name(''); }} className="p-1 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-gray-700 dark:text-gray-300">{item}</span>
                            <button onClick={() => { setCategoryL4ToEdit(item); setNewCategoryL4Name(item); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            {deleteConfirm === `catL4-${item}` ? (
                              <button onClick={() => handleDeleteCategoryL4(item)} className="p-1 text-red-600 hover:bg-red-100 rounded">确认</button>
                            ) : (
                              <button onClick={() => setDeleteConfirm(`catL4-${item}`)} className="p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">暂无自定义分类</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showPositionGroupModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">持仓分组管理</h3>
                <button onClick={() => setShowPositionGroupModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={newPositionGroupName} onChange={e => setNewPositionGroupName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddPositionGroup()} placeholder="输入分组名称" className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  <button onClick={handleAddPositionGroup} className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {positionGroupOptions.length > 0 ? (
                    positionGroupOptions.map((item) => (
                      <div key={item} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        {positionGroupToEdit === item ? (
                          <>
                            <input type="text" value={newPositionGroupName || item} onChange={e => setNewPositionGroupName(e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-600 dark:text-white" autoFocus />
                            <button onClick={handleSavePositionGroupEdit} className="p-1 text-green-600 hover:bg-green-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => { setPositionGroupToEdit(null); setNewPositionGroupName(''); }} className="p-1 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-gray-700 dark:text-gray-300">{item}</span>
                            <button onClick={() => { setPositionGroupToEdit(item); setNewPositionGroupName(item); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            {deleteConfirm === `pg-${item}` ? (
                              <button onClick={() => handleDeletePositionGroup(item)} className="p-1 text-red-600 hover:bg-red-100 rounded">确认</button>
                            ) : (
                              <button onClick={() => setDeleteConfirm(`pg-${item}`)} className="p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">暂无持仓分组</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showPositionTypeModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">持仓分类管理{newAccount.assetType ? ` - ${newAccount.assetType}` : ''}</h3>
                <button onClick={() => setShowPositionTypeModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={newPositionTypeName} onChange={e => setNewPositionTypeName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddPositionType()} placeholder="输入分类名称" className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" />
                  <button onClick={handleAddPositionType} className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {newAccount.assetType && currentPositionTypeOptions.length > 0 ? (
                    currentPositionTypeOptions.map((item) => {
                      const isHardcoded = (ASSET_TYPE_POSITION_TYPE_MAP[newAccount.assetType] || []).includes(item);
                      const isDeleted = (deletedPositionTypeMap[newAccount.assetType] || []).includes(item);
                      return (
                        <div key={item} className={`flex items-center gap-2 p-2 rounded-lg ${isHardcoded ? 'bg-gray-100 dark:bg-slate-600' : 'bg-gray-50 dark:bg-slate-700'}`}>
                          {positionTypeToEdit === item ? (
                            <>
                              <input type="text" value={newPositionTypeName || item} onChange={e => setNewPositionTypeName(e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-600 dark:text-white" autoFocus />
                              <button onClick={handleSavePositionTypeEdit} className="p-1 text-green-600 hover:bg-green-100 rounded"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => { setPositionTypeToEdit(null); setNewPositionTypeName(''); }} className="p-1 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 text-gray-700 dark:text-gray-300 text-sm">
                                {item}
                                {isHardcoded && <span className="ml-1 text-xs text-gray-400 bg-gray-200 dark:bg-slate-500 px-1 rounded">默认</span>}
                                {isDeleted && <span className="ml-1 text-xs text-red-400">（已删除，可重新添加）</span>}
                              </span>
                              <button onClick={() => { setPositionTypeToEdit(item); setNewPositionTypeName(item); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="编辑"><Edit2 className="w-4 h-4" /></button>
                              {deleteConfirm === `pt-${item}` ? (
                                <button onClick={() => handleDeletePositionType(item)} className="p-1 text-red-600 hover:bg-red-100 rounded">确认</button>
                              ) : (
                                <button onClick={() => setDeleteConfirm(`pt-${item}`)} className="p-1 text-red-500 hover:bg-red-100 rounded" title="删除"><Trash2 className="w-4 h-4" /></button>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">暂无持仓分类</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
