import { useState, useEffect, useMemo } from 'react';
import { fetchState, saveState, fetchRealTimeExchangeRates, fetchFinanceQuotes } from '../api';
import { getCurrencySymbol, truncateNum } from '../utils/currency';
import FinanceHoldingsTable from '../components/FinanceHoldingsTable';
import {
  Wallet,
  Plus,
  Edit2,
  Trash2,
  X,
  RefreshCw,
  CreditCard,
  Building2,
  PiggyBank,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Settings2,
  FolderPlus,
  FolderMinus,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

function convertCurrency(value, fromCurrency, toCurrency, rates) {
  if (fromCurrency === toCurrency) return value;
  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;
  return value * (fromRate / toRate);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(truncateNum(value, 3));
}

function migrateAccountOwnership(acc) {
  const result = { ...acc };
  if (!Array.isArray(result.owners) || result.owners.length === 0) {
    result.ownershipType = 'personal';
    result.owners = [{ name: '默认', share: 100, isDefault: true }];
  } else {
    const normalizedOwners = result.owners.map(o => {
      const shareNum = parseFloat(o.share);
      return {
        name: (o.name && String(o.name).trim()) || '默认',
        share: isNaN(shareNum) ? 100 : shareNum,
        isDefault: o.isDefault === true,
      };
    });
    // Ensure exactly one default owner: keep the first isDefault===true (if any) and reset the rest.
    const firstDefaultIdx = normalizedOwners.findIndex(o => o.isDefault === true);
    const defaultIdx = firstDefaultIdx >= 0 ? firstDefaultIdx : 0;
    normalizedOwners.forEach((o, i) => {
      o.isDefault = i === defaultIdx;
    });
    result.owners = normalizedOwners;
    result.ownershipType = normalizedOwners.length > 1 ? 'multi' : 'personal';
  }
  return result;
}

function normalizeAccountsOwnership(accounts) {
  if (!Array.isArray(accounts)) return [];
  return accounts.map(acc => migrateAccountOwnership({ ...acc }));
}

function scaleAmountByOwner(val, share) {
  if (val == null || Number.isNaN(Number(val))) return val;
  const s = typeof share === 'number' ? share : 1;
  return Number(val) * s;
}

function getOwnerShare(account, ownerName) {
  if (!account || ownerName === '__ALL__' || !ownerName) return 1;
  const owner = (account.owners || []).find(o => o.name === ownerName);
  if (!owner) return 1;
  const share = Number(owner.share);
  if (Number.isNaN(share)) return 1;
  return share / 100;
}

function normalizeOwnersDefault(owners) {
  if (!Array.isArray(owners) || owners.length === 0) return owners;
  let defaultIdx = owners.findIndex(o => o.isDefault === true);
  if (defaultIdx === -1) defaultIdx = 0;
  return owners.map((o, i) => ({ ...o, isDefault: i === defaultIdx }));
}

export function calcCooperationFunds(accounts, getAccountAmount) {
  let defaultHeld = 0;
  let otherHeld = 0;
  let multiAccountCount = 0;
  if (!Array.isArray(accounts)) return { defaultHeld, otherHeld, multiAccountCount };
  accounts.forEach(acc => {
    if ((acc.ownershipType || 'personal') !== 'multi') return;
    if (!Array.isArray(acc.owners) || acc.owners.length === 0) return;
    multiAccountCount += 1;
    const defaultOwner = acc.owners.find(o => o.isDefault === true) || acc.owners[0];
    const ds = parseFloat(defaultOwner && defaultOwner.share);
    const share = isNaN(ds) ? 100 : ds;
    const raw = getAccountAmount ? getAccountAmount(acc) : 0;
    const amount = Math.abs(Number(raw) || 0);
    defaultHeld += amount * share / 100;
    otherHeld += amount * (100 - share) / 100;
  });
  return { defaultHeld, otherHeld, multiAccountCount };
}

function formatCurrencyWithRate(value, currency, targetCurrency, rates) {
  const converted = convertCurrency(value, currency, targetCurrency, rates);
  const symbol = getCurrencySymbol(targetCurrency);
  return `${symbol}${new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(truncateNum(converted, 3))}`;
}

const categoryIcons = {
  '银行': Building2,
  '券商': CreditCard,
  '基金平台': PiggyBank,
  '交易所': Wallet,
  '其他': Wallet,
};

const defaultCategories = {
  '银行': ['招商银行', '工商银行', '建设银行', '农业银行', '中国银行', '交通银行', '浦发银行', '中信银行', '光大银行', '民生银行', '华夏银行', '兴业银行', '平安银行', '广发银行', '邮储银行', '其他银行'],
  '券商': ['东方财富', '同花顺', '太平洋证券', '银河证券', '中信证券', '华泰证券', '海通证券', '广发证券', '招商证券', '申万宏源', '其他券商'],
  '基金平台': ['天天基金', '同花顺基金', '东方财富基金', '且慢', '支付宝基金', '微信理财通', '其他基金平台'],
  '交易所': ['欧易', '币安', 'AIDOG', '其他交易所'],
  '其他': ['支付宝', '微信支付', '信用卡', '储蓄', '其他'],
};

const currencies = [
  { value: 'CNY', label: '人民币 (¥)' },
  { value: 'HKD', label: '港元 (HK$)' },
  { value: 'USD', label: '美元 ($)' },
  { value: 'EUR', label: '欧元 (€)' },
  { value: 'JPY', label: '日元 (¥)' },
];

const defaultAccountTypes = ['独立资产', '理财资产', '负债', '打新', '生活', '死期', '活期'];

const independentAssetTypeLabels = {
  insurance: '保险',
  realestate: '房产',
  vehicle: '车辆',
  fixedinvestment: '固定投资',
  equity: '股权',
  fixeddeposit: '定期存款',
};

const marketOptions = ['国内市场', '港股市场', '美股市场', '其他'];
const currencyOptions = ['CNY', 'HKD', 'USD', 'EUR', 'JPY'];
const assetTypeOptions = ['股票', '基金', '债券', '现金', '保险', '理财', '其他'];
const assetClassOptions = ['现金类', '权益类', '固收类', '另类'];
const positionGroupOptions = ['核心仓位', '卫星仓位', '现金仓位', '观察仓位'];
const positionTypeOptions = ['成长仓位', '价值仓位', '均衡仓位', '现金管理'];
const allCategoryL2Options = ['A股', '港股', '美股', '场外'];
const marketGroups = [
  { label: '国内市场', options: ['国内市场'] },
  { label: '海外市场', options: ['港股市场', '美股市场', '其他'] },
];
const assetKindOptions = ['股票', '基金', '债券', '现金', '保险', '理财', '其他'];
const categoryL3CustomOptions = ['场内', '场外'];
const categoryL4Options = {
  '现金类': ['默认', '自定义'],
  '权益类': ['默认', '自定义'],
  '固收类': ['默认', '自定义'],
  '另类': ['默认', '自定义'],
};

export default function Accounts() {
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '银行',
    subCategory: '招商银行',
    liability: false,
    ownershipType: 'personal',
    owners: [{ name: '默认', share: 100, isDefault: true }],
  });
  const [extraOwnerNames, setExtraOwnerNames] = useState([]);
  const [ownershipDropdownOpen, setOwnershipDropdownOpen] = useState(false);
  const [ownerDropdownOpen, setOwnerDropdownOpen] = useState(false);
  const [multiOwnerPanelOpen, setMultiOwnerPanelOpen] = useState(true);
  const [personalNewName, setPersonalNewName] = useState('');
  const [multiNewName, setMultiNewName] = useState('');
  const [showPersonalAdd, setShowPersonalAdd] = useState(false);
  const [showMultiAdd, setShowMultiAdd] = useState(false);
  const [tempMultiCheckedNames, setTempMultiCheckedNames] = useState(new Set());
  const [lastPersonalOwner, setLastPersonalOwner] = useState('默认');
  const [filters, setFilters] = useState({
    name: '',
    category: '',
    type: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '' });
  const [editingSubCategory, setEditingSubCategory] = useState({ main: '', index: -1, name: '' });
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSubDropdown, setShowSubDropdown] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCatName, setEditingCatName] = useState({ value: '', name: '' });
  const [addingSub, setAddingSub] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [editingSubName, setEditingSubName] = useState({ index: -1, name: '' });
  // 来自 origin/main：账户类型管理与余额映射
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [addingType, setAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [editingTypeName, setEditingTypeName] = useState({ oldName: '', newName: '' });
  const [editingOwner, setEditingOwner] = useState({ oldName: '', newName: '' });
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [detailOwnerFilter, setDetailOwnerFilter] = useState('__ALL__');
  useEffect(() => { setDetailOwnerFilter('__ALL__'); }, [selectedAccountId]);
  const [balanceMapping, setBalanceMapping] = useState(() => {
    try {
      const saved = localStorage.getItem('wealth_os_account_balance_mapping');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const saveBalanceMapping = (newMapping) => {
    setBalanceMapping(newMapping);
    localStorage.setItem('wealth_os_account_balance_mapping', JSON.stringify(newMapping));
  };
  const [balanceCardExpanded, setBalanceCardExpanded] = useState(true);
  // 来自暂存：跨币种显示
  const [selectedCurrency, setSelectedCurrency] = useState('CNY');
  const [exchangeRates, setExchangeRates] = useState({ CNY: 1, USD: 7.15, JPY: 0.046, HKD: 0.86, EUR: 7.85 });
  const [quotesMap, setQuotesMap] = useState({});

  const { accounts = [], records = [], finance = {}, debts = [], accountCategories = {}, independentAssets = {}, accountTypes = [], financeAssets = [] } = stateData || {};

  const accountCatConfig = useMemo(() => {
    if (Object.keys(accountCategories).length === 0) {
      return defaultCategories;
    }
    return accountCategories;
  }, [accountCategories]);

  const categoryList = useMemo(() => {
    return Object.keys(accountCatConfig).map(key => ({ value: key, label: key }));
  }, [accountCatConfig]);

  const getSubCategories = (mainCategory) => {
    return (accountCatConfig[mainCategory] || []).map(name => ({ value: name, label: name }));
  };

  const accountTypesList = useMemo(() => {
    if (!accountTypes || accountTypes.length === 0) {
      return defaultAccountTypes;
    }
    return accountTypes;
  }, [accountTypes]);

  const getEffectiveType = (account) => {
    if (!account) return '资产';
    if (account.type) {
      if (account.type === '独立资产' || account.type === '理财资产' || account.type === '资产') {
        return account.type;
      }
      return account.type;
    }
    return account.liability ? '负债' : '资产';
  };

  const getDisplayType = (account) => {
    const effectiveType = getEffectiveType(account);
    if (effectiveType === '资产') return '独立资产';
    return effectiveType;
  };

  const calcIndependentAsset = (type, item) => {
    let mv = 0;
    let cost = 0;
    if (!item) return { mv, cost };
    if (type === 'insurance') {
      mv = parseFloat(item.cashValue) || 0;
      cost = parseFloat(item.paidAmount) || 0;
    } else if (type === 'realestate') {
      if (item.type === '自用') {
        const perSqm = parseFloat(item.selfUseMarketPricePerSqm) || 0;
        const area = parseFloat(item.selfUseMarketArea) || 0;
        const computed = perSqm * area;
        mv = computed || parseFloat(item.marketValue) || 0;
      } else {
        mv = parseFloat(item.marketValue) || 0;
      }
      cost = parseFloat(item.purchasePrice) || 0;
    } else if (type === 'vehicle') {
      mv = parseFloat(item.residualValue) || 0;
      cost = parseFloat(item.purchasePrice) || 0;
    } else if (type === 'fixedinvestment') {
      const baseCost = parseFloat(item.investmentCost) || 0;
      const annual = parseFloat(item.annualContribution) || 0;
      let years = 0;
      if (item.startYear) {
        const startYear = parseInt(item.startYear, 10);
        if (!isNaN(startYear)) {
          years = Math.max(0, new Date().getFullYear() - startYear);
        }
      }
      mv = baseCost + annual * years;
      cost = mv;
    } else if (type === 'equity') {
      const qty = parseFloat(item.quantity) || 0;
      mv = qty * (parseFloat(item.currentPrice) || 0);
      cost = qty * (parseFloat(item.cost) || 0);
    } else if (type === 'fixeddeposit') {
      mv = parseFloat(item.amount) || 0;
      cost = parseFloat(item.amount) || 0;
    }
    return { mv, cost };
  };

  const calcFinanceAsset = (a) => {
    let mv = 0;
    let cost = 0;
    let quantity = 0;
    let costPrice = 0;
    let currentPrice = 0;
    let holdingPnl = 0;
    let holdingPnlRate = 0;
    if (!a) return { mv, cost, quantity, costPrice, currentPrice, holdingPnl, holdingPnlRate };

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

    const _computedQty = buyTotalQty - sellTotalQty;
    const _qty = buyTotalQty > 0 ? _computedQty : (parseFloat(a.shares || a.quantity) || 0);
    const _computedCostPrice = buyTotalQty > 0 ? buyTotalAmount / buyTotalQty : 0;
    const _costPrice = buyTotalQty > 0 ? _computedCostPrice : (parseFloat(a.costPrice || a.cost) || 0);

    const isCashCategory = a.category === '现金类' || a.categoryL1 === '现金类';
    // 数量始终使用实际数量，不能用 currentValue 覆盖
    const _effectiveQty = _qty;
    // 允许现金类资产使用用户输入的价格，不再强制设为1
    const _effectivePrice = parseFloat(a.currentPrice) || 0;

    quantity = _effectiveQty;
    costPrice = _costPrice;
    currentPrice = _effectivePrice;
    mv = _effectivePrice * _effectiveQty;
    cost = costPrice * quantity;
    holdingPnl = isCashCategory ? 0 : (mv - cost);
    holdingPnlRate = cost > 0 ? (holdingPnl / cost) * 100 : 0;
    return { mv, cost, quantity, costPrice, currentPrice, holdingPnl, holdingPnlRate };
  };

  // 判断一条资产/记录是否明确归属到指定账户（accountId 或 account === 账户 id 或 name）
  function belongsToAccount(assetAccId, assetAccName, account) {
    if (!account) return false;
    const aId = assetAccId || assetAccName || '';
    if (!aId) return false;
    return aId === account.id || aId === account.name;
  }

  const accountStats = useMemo(() => {
    const stats = {};
    accounts.forEach(a => { stats[a.id] = { marketValue: 0, holdingCost: 0 }; });

    // 独立资产（只认 accountId / accountName === 本账户 id 或 name）
    if (independentAssets && typeof independentAssets === 'object') {
      Object.entries(independentAssets).forEach(([type, items]) => {
        if (!Array.isArray(items)) return;
        items.forEach(item => {
          const account = accounts.find(acct => belongsToAccount(item.accountId, null, acct));
          if (!account) return;
          const { mv, cost } = calcIndependentAsset(type, item);
          stats[account.id].marketValue += mv;
          stats[account.id].holdingCost += cost;
        });
      });
    }

    // 理财持仓（排除已归档资产）：仅当 asset.accountId || asset.account 明确等于本账户 id 或 name 才计入
    if (Array.isArray(financeAssets)) {
      accounts.forEach(account => {
        financeAssets.forEach(a => {
          if (a.status === 'archived' || a.isArchived) return;
          if (!belongsToAccount(a.accountId, a.account, account)) return;
          const { mv, cost } = calcFinanceAsset(a);
          stats[account.id].marketValue += mv;
          stats[account.id].holdingCost += cost;
        });
      });
    }

    // 收支记录：record.account 等于账户 id 或 name 才计入
    records.forEach(record => {
      const accName = record.account;
      const account = accounts.find(acct =>
        (accName && accName === acct.id) || (accName && accName === acct.name)
      );
      if (!account) return;
      stats[account.id].marketValue += parseFloat(record.amount) || 0;
    });

    // 债务记录（仅对负债类型账户）：debt.account 等于账户 id 或 name 才计入
    debts.forEach(debt => {
      if (!debt.account) return;
      const account = accounts.find(acct =>
        (debt.account === acct.id) || (debt.account === acct.name)
      );
      if (!account) return;
      if (getEffectiveType(account) !== '负债') return;
      stats[account.id].marketValue += parseFloat(debt.amount) || 0;
      stats[account.id].holdingCost += parseFloat(debt.principal) || 0;
    });

    return stats;
  }, [accounts, independentAssets, finance, financeAssets, records, debts]);

  const cooperationFunds = useMemo(() => {
    return calcCooperationFunds(accounts, acc => {
      const s = accountStats[acc.id];
      return s ? s.marketValue : 0;
    });
  }, [accounts, accountStats]);

  const allOwnerNames = useMemo(() => {
    const nameSet = new Set();
    if (Array.isArray(extraOwnerNames)) {
      extraOwnerNames.forEach(n => {
        if (n && String(n).trim()) nameSet.add(String(n).trim());
      });
    }
    if (Array.isArray(accounts)) {
      accounts.forEach(acc => {
        if (Array.isArray(acc.owners)) {
          acc.owners.forEach(o => {
            if (o && o.name && String(o.name).trim()) {
              nameSet.add(String(o.name).trim());
            }
          });
        }
      });
    }
    return [...nameSet];
  }, [extraOwnerNames, accounts]);

  useEffect(() => {
    loadData();
    loadExchangeRates();
    // 每30秒轮询获取最新汇率
    const timer = setInterval(() => {
      loadExchangeRates();
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedAccountId) return;
    const account = accounts.find(a => a.id === selectedAccountId);
    if (!account) return;
    const accountAssets = (financeAssets || []).filter(a => {
      const accId = a.accountId || a.account || '';
      return (accId === account.id || accId === account.name) && a.status !== 'archived';
    });
    loadQuotes(accountAssets);
  }, [selectedAccountId, accounts, financeAssets]);

  const loadQuotes = async (assets) => {
    if (!assets || assets.length === 0) return;
    const codes = assets
      .filter(a => {
        if (!a.code) return false;
        if (a.kind === 'cash' || a.categoryL2 === '现金') return false;
        return true;
      })
      .map(a => ({ code: a.code, market: a.market || '国内市场' }));
    if (codes.length === 0) return;
    try {
      const quotes = await fetchFinanceQuotes(codes);
      const map = {};
      quotes.forEach(q => {
        if (q && q.code) map[q.code] = q;
      });
      setQuotesMap(map);
    } catch (err) {
      console.error('Failed to load quotes:', err);
    }
  };

  const loadExchangeRates = async (force = false) => {
    try {
      const rates = await fetchRealTimeExchangeRates(force);
      setExchangeRates({ CNY: 1, ...rates });
    } catch (err) {
      console.error('Failed to load exchange rates:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    // 每次手动刷新全局数据时强制获取最新汇率（必须 await 确保汇率先加载）
    await loadExchangeRates(true);
    try {
      const data = await fetchState();
      const cachedAccounts = localStorage.getItem('wealth_os_accounts');
      if ((!data.accounts || data.accounts.length === 0) && cachedAccounts) {
        try {
          const parsed = JSON.parse(cachedAccounts);
          data.accounts = normalizeAccountsOwnership(parsed);
        } catch {
          /* ignore parse error */
        }
      }
      if (!data.accounts || data.accounts.length === 0) {
        const demoAccounts = [
          { id: 'demo-1', name: '招商银行', category: '银行', subCategory: '招商银行', currency: 'CNY', liability: false, balance: 10000 },
          { id: 'demo-2', name: '支付宝', category: '其他', subCategory: '支付宝', currency: 'CNY', liability: false, balance: 5000 },
          { id: 'demo-3', name: '微信支付', category: '其他', subCategory: '微信支付', currency: 'CNY', liability: false, balance: 2000 },
          { id: 'demo-4', name: '工商银行信用卡', category: '银行', subCategory: '工商银行', currency: 'CNY', liability: true, balance: 3000 },
        ];
        const normalizedDemoAccounts = normalizeAccountsOwnership(demoAccounts);
        data.accounts = normalizedDemoAccounts;
        localStorage.setItem('wealth_os_accounts', JSON.stringify(normalizedDemoAccounts));
      } else {
        data.accounts = normalizeAccountsOwnership(data.accounts);
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
          const fixedCV = Number.isFinite(origCV) ? Math.max(0, origCV) : 0;
          const fixedShares = Number.isFinite(origShares) ? Math.max(0, origShares) : 0;
          const fixedQty = Number.isFinite(origQty) ? Math.max(0, origQty) : 0;
          const fixedCost = Number.isFinite(origCost) ? Math.max(0, origCost) : 0;
          const fixedBalance = Number.isFinite(origBalance) ? Math.max(0, origBalance) : 0;
          const hasNeg =
            (Number.isFinite(origCV) && origCV < 0) ||
            (Number.isFinite(origShares) && origShares < 0) ||
            (Number.isFinite(origQty) && origQty < 0) ||
            (Number.isFinite(origCost) && origCost < 0) ||
            (Number.isFinite(origBalance) && origBalance < 0);
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
              shares: Number.isFinite(origShares) && origShares > 0 ? fixedShares : (fixedCV || fixedShares),
              quantity: Number.isFinite(origQty) && origQty > 0 ? fixedQty : (fixedCV || fixedQty),
              cost: fixedCost,
              balance: fixedBalance,
              availableShares: Number.isFinite(parseFloat(asset.availableShares)) ? Math.max(0, parseFloat(asset.availableShares)) : (fixedShares || fixedCV),
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
      setStateData(data);
      // 不再自动创建现金资产
      // const migrated = await migrateFinanceCashAssets(data);
      // if (migrated !== data) {
      //   setStateData(migrated);
      // }
    } catch (err) {
      console.error('Failed to load accounts data:', err);
      const cachedAccounts = localStorage.getItem('wealth_os_accounts');
      if (cachedAccounts) {
        try {
          const parsed = JSON.parse(cachedAccounts);
          const normalizedParsed = normalizeAccountsOwnership(parsed);
          setStateData({ accounts: normalizedParsed, records: [], finance: {}, debts: [] });
        } catch {
          setError('加载数据失败');
        }
      } else {
        setError('加载数据失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const migrateFinanceCashAssets = async (state) => {
    const accounts = state?.accounts || [];
    const financeAssets = state?.financeAssets || [];
    const financeAccounts = accounts.filter(
      a => a.type === '理财资产'
    );
    if (financeAccounts.length === 0) return state;

    let maxSeq = 0;
    financeAssets.forEach(a => {
      if (a.name && typeof a.name === 'string') {
        const match = a.name.match(/^ZZGL_(\d+)$/);
        if (match) {
          const seq = parseInt(match[1], 10);
          if (seq > maxSeq) maxSeq = seq;
        }
      }
    });
    const cashAssetCodeSeq = state?.cashAssetCodeSeq;
    if (cashAssetCodeSeq !== undefined && cashAssetCodeSeq !== null && cashAssetCodeSeq > maxSeq) {
      maxSeq = cashAssetCodeSeq;
    }

    const marketMap = {
      '国内资产': { market: '国内市场', currency: 'CNY', subcategory: 'A股' },
      '港股资产': { market: '港股市场', currency: 'HKD', subcategory: '港股' },
      '美股资产': { market: '美股市场', currency: 'USD', subcategory: '美股' },
    };

    const defaultMarket = { market: '国内市场', currency: 'CNY', subcategory: 'A股' };

    const newCashAssets = [];
    let nextSeq = maxSeq;

    for (const account of financeAccounts) {
      const hasCash = financeAssets.some(
        a => (a.accountId === account.name || a.account === account.name)
          && (a.category === '现金类' || a.categoryL1 === '现金类')
      );
      if (hasCash) continue;

      const mapped = account.financeMarket ? (marketMap[account.financeMarket] || defaultMarket) : defaultMarket;

      nextSeq += 1;
      const seqStr = String(nextSeq).padStart(3, '0');
      const name = `ZZGL_${seqStr}`;
      const code = `ZZDM_${seqStr}`;

      newCashAssets.push({
        id: `cash-asset-migrate-${Date.now()}-${newCashAssets.length}`,
        market: mapped.market,
        currency: mapped.currency,
        assetKind: '流动资产',
        kind: '现金',
        accountId: account.name,
        account: account.name,
        category: '现金类',
        subcategory: mapped.subcategory,
        tertiaryCategory: '场内',
        positionGroup: '现金仓位',
        positionCategory: '现金管理',
        name,
        code,
        costPrice: 1,
        shares: 0.1,
        quantity: 0.1,
        cost: 0.1,
        availableShares: 0.1,
        currentPrice: 1,
        prevPrice: 1,
        priceDate: '',
        avgBuyPrice: 1,
        holdingDays: 1,
        holdingDaysBase: 1,
        holdingDaysDate: new Date().toISOString().split('T')[0],
        pnl: 0,
        pnlPercent: 0,
        todayPnl: 0,
        todayPnlPercent: 0,
        holdingPnl: 0,
        holdingPnlRate: 0,
        dailyPnl: 0,
        dailyPnlRate: 0,
        currentValue: 0.1,
        positionWeight: 0,
        totalFees: 0,
        tags: '',
        transactions: [],
      });
    }

    if (newCashAssets.length === 0) return state;

    const updatedState = {
      ...state,
      financeAssets: [...financeAssets, ...newCashAssets],
      cashAssetCodeSeq: nextSeq,
    };

    try {
      await saveState(updatedState);
    } catch (_) { /* ignore */ }

    return updatedState;
  };

  const calculateAccountBalance = useMemo(() => {
    const balanceMap = {};
    accounts.forEach(account => {
      balanceMap[account.id] = parseFloat(account.balance) || 0;
    });
    return balanceMap;
  }, [accounts]);

  const computeStats = () => {
    const accountList = accounts || [];
    const assetAccounts = accountList.filter(a => getEffectiveType(a) !== '负债');
    const liabilityAccounts = accountList.filter(a => getEffectiveType(a) === '负债');

    const totalAssets = assetAccounts.reduce((sum, a) => {
      const balance = calculateAccountBalance[a.id] != null ? calculateAccountBalance[a.id] : 0;
      return sum + convertCurrency(balance, a.currency || 'CNY', selectedCurrency, exchangeRates);
    }, 0);
    const totalLiabilities = liabilityAccounts.reduce((sum, a) => {
      const balance = calculateAccountBalance[a.id] != null ? calculateAccountBalance[a.id] : 0;
      return sum + convertCurrency(Math.abs(balance), a.currency || 'CNY', selectedCurrency, exchangeRates);
    }, 0);
    const netWorth = totalAssets - totalLiabilities;

    return { totalAssets, totalLiabilities, netWorth, assetAccounts, liabilityAccounts };
  };

  const filteredAccounts = useMemo(() => {
    return accounts.filter(account => {
      if (filters.name && !account.name.includes(filters.name)) return false;
      if (filters.category && account.category !== filters.category) return false;
      if (filters.type === 'asset' && getEffectiveType(account) === '负债') return false;
      if (filters.type === 'liability' && getEffectiveType(account) !== '负债') return false;
      return true;
    });
  }, [accounts, filters]);

  function scaleAssetList(list, s) {
    if (s === 1 || !Array.isArray(list)) return list;
    return list.map(it => {
      const r = { ...it };
      ['mv','cost','holdingPnl','dailyPnl','currentValue','balance','marketValue','holdingCost','totalCost','pl','pnl','amount'].forEach(k => {
        if (typeof r[k] === 'number') r[k] = r[k] * s;
      });
      return r;
    });
  }

  // 统一资产列表（详情页用）- 必须在 renderDetailPage 之前定义
  const unifiedAssets = useMemo(() => {
    if (!selectedAccountId) return [];
    const account = accounts.find(a => a.id === selectedAccountId);
    if (!account) return [];

    const assets = [];

    if (Array.isArray(financeAssets)) {
      financeAssets
        .filter(a => {
          if (a.status === 'archived' || a.isArchived) return false;
          const accId = a.accountId || a.account || '';
          return accId === account.id || accId === account.name;
        })
        .forEach((item, index) => {
          const { mv, cost, quantity, costPrice, currentPrice, holdingPnl, holdingPnlRate } = calcFinanceAsset(item);
          assets.push({
            key: `finance_${item.id || index}`,
            name: item.name || item.symbol || item.code || '-',
            code: item.code || '',
            assetType: item.kind || item.assetType || '理财',
            categoryL1: item.category || item.categoryL1 || '',
            categoryL2: item.subcategory || item.categoryL2 || '',
            categoryL3: item.tertiaryCategory || item.categoryL3 || '',
            market: item.market || '国内市场',
            currency: item.currency || 'CNY',
            costPrice,
            quantity,
            currentPrice,
            mv,
            cost,
            holdingPnl,
            holdingPnlRate,
            holdingDays: item.holdingDays || 0,
            source: 'finance',
            defaultIncluded: (item.category || item.categoryL1) === '现金类',
            raw: item,
          });
        });
    }

    return assets;
  }, [selectedAccountId, accounts, financeAssets]);

  const balanceData = useMemo(() => {
    if (!selectedAccountId) {
      return { totalBalance: 0, balanceByType: {}, includedCount: 0 };
    }

    const account = accounts.find(a => a.id === selectedAccountId);
    if (!account) return { totalBalance: 0, balanceByType: {}, includedCount: 0 };

    // 只统计资产类型为现金或货币基金的当前市值作为余额
    const cashLikeAssets = unifiedAssets.filter(asset => {
      const type = (asset.assetType || '').trim();
      const kind = (asset.assetKind || '').trim();
      return type === '现金' || type === '货币基金' || kind === '现金' || kind === '货币基金';
    });

    const totalBalance = cashLikeAssets.reduce((sum, a) => sum + (a.mv || 0), 0);

    const balanceByType = {};
    cashLikeAssets.forEach(asset => {
      const type = asset.assetType || '其他';
      if (!balanceByType[type]) {
        balanceByType[type] = 0;
      }
      balanceByType[type] += asset.mv || 0;
    });

    return { totalBalance, balanceByType, includedCount: cashLikeAssets.length };
  }, [selectedAccountId, accounts, unifiedAssets]);

  const toggleAssetBalance = (accountId, assetKey) => {
    const mappingKey = `${accountId}_${assetKey}`;
    const currentAsset = unifiedAssets.find(a => a.key === assetKey);
    const isCurrentlyIncluded = mappingKey in balanceMapping
      ? balanceMapping[mappingKey]
      : (currentAsset?.defaultIncluded || false);
    const newMapping = { ...balanceMapping, [mappingKey]: !isCurrentlyIncluded };
    saveBalanceMapping(newMapping);
  };

  const totalPages = Math.ceil(filteredAccounts.length / pageSize);
  const paginatedAccounts = filteredAccounts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleAdd = () => {
    setEditingAccount(null);
    const firstCategory = categoryList[0]?.value || '银行';
    const defaultSub = (accountCatConfig[firstCategory] || [])[0] || '';
    const defaultOwner = allOwnerNames[0] || '默认';
    setFormData({
      name: '',
      category: firstCategory,
      subCategory: defaultSub,
      currency: 'CNY',
      liability: false,
      type: '独立资产',
      financeMarket: '',
      ownershipType: 'personal',
      owners: [{ name: defaultOwner, share: 100, isDefault: true }],
    });
    setLastPersonalOwner(defaultOwner);
    setTempMultiCheckedNames(new Set());
    setOwnershipDropdownOpen(false);
    setOwnerDropdownOpen(false);
    setShowPersonalAdd(false);
    setShowMultiAdd(false);
    setPersonalNewName('');
    setMultiNewName('');
    setShowModal(true);
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    const cat = account.category || categoryList[0]?.value || '银行';
    const subs = getSubCategories(cat);
    const subCat = subs.find(s => s.value === account.subCategory)
      ? account.subCategory
      : subs[0]?.value || '';
    let type = account.type;
    if (!type) {
      type = account.liability ? '负债' : '独立资产';
    } else if (type === '资产') {
      type = '独立资产';
    }
    const migratedAccount = migrateAccountOwnership({ ...account });
    setFormData({
      name: account.name,
      category: cat,
      subCategory: subCat,
      currency: account.currency || 'CNY',
      liability: account.liability || false,
      type,
      financeMarket: account.financeMarket || '',
      ownershipType: migratedAccount.ownershipType,
      owners: migratedAccount.owners,
    });
    if (migratedAccount.ownershipType === 'personal') {
      const personalName = migratedAccount.owners[0]?.name || '默认';
      setLastPersonalOwner(personalName);
      setTempMultiCheckedNames(new Set());
    } else {
      const checkedSet = new Set(migratedAccount.owners.map(o => o.name));
      setTempMultiCheckedNames(checkedSet);
    }
    setOwnershipDropdownOpen(false);
    setOwnerDropdownOpen(false);
    setShowPersonalAdd(false);
    setShowMultiAdd(false);
    setPersonalNewName('');
    setMultiNewName('');
    setShowModal(true);
  };

  const handleDelete = async (accountId) => {
    if (!confirm('确定要删除这个账户吗？')) return;

    try {
      const newAccounts = (stateData.accounts || []).filter(a => a.id !== accountId);
      const newState = { ...stateData, accounts: newAccounts };
      localStorage.setItem('wealth_os_accounts', JSON.stringify(newAccounts));
      const result = await saveState(newState);
      if (result.success !== false) {
        setStateData(newState);
      }
    } catch (err) {
      console.error('Failed to delete account:', err);
      alert('后端删除失败，但本地缓存已更新');
      const newAccounts = (stateData.accounts || []).filter(a => a.id !== accountId);
      const newState = { ...stateData, accounts: newAccounts };
      localStorage.setItem('wealth_os_accounts', JSON.stringify(newAccounts));
      setStateData(newState);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    try {
      let newAccounts = stateData.accounts || [];

      const ownersToSave = Array.isArray(formData.owners) && formData.owners.length > 0
        ? formData.owners
        : [{ name: '默认', share: 100, isDefault: true }];
      const ownershipTypeToSave = formData.ownershipType || (ownersToSave.length > 1 ? 'multi' : 'personal');

      const allOwnerNamesFromForm = ownersToSave.map(o => o.name).filter(n => n && String(n).trim());
      const mergedExtraOwnerNames = Array.from(new Set([...(extraOwnerNames || []), ...allOwnerNamesFromForm]));
      if (JSON.stringify(mergedExtraOwnerNames) !== JSON.stringify(extraOwnerNames || [])) {
        setExtraOwnerNames(mergedExtraOwnerNames);
      }

      if (editingAccount) {
        let saveType = formData.type;
        const originalType = editingAccount.type;
        if (originalType === '资产' && formData.type === '独立资产') {
          saveType = '资产';
        }
        if (originalType === undefined && !editingAccount.liability && formData.type === '独立资产') {
          saveType = undefined;
        }
        const saveData = { ...formData };
        saveData.ownershipType = ownershipTypeToSave;
        saveData.owners = ownersToSave;
        if (saveType === undefined) {
          delete saveData.type;
        } else {
          saveData.type = saveType;
        }
        if (saveData.type === '理财资产' && saveData.financeMarket) {
        } else {
          delete saveData.financeMarket;
        }
        newAccounts = newAccounts.map(a =>
          a.id === editingAccount.id
            ? { ...a, ...saveData }
            : a
        );
      } else {
        const isFinanceAsset = formData.type === '理财资产';
        const newAccount = {
          id: Date.now().toString(),
          name: formData.name,
          category: formData.category,
          subCategory: formData.subCategory,
          currency: formData.currency || 'CNY',
          liability: formData.liability,
          type: formData.type || '独立资产',
          balance: isFinanceAsset ? 0.1 : 0,
          ownershipType: ownershipTypeToSave,
          owners: ownersToSave,
        };
        if (isFinanceAsset && formData.financeMarket) {
          newAccount.financeMarket = formData.financeMarket;
        }
        newAccounts = [
          ...newAccounts,
          newAccount,
        ];

      }

      const newState = { ...stateData, accounts: newAccounts };

      localStorage.setItem('wealth_os_accounts', JSON.stringify(newAccounts));

      const result = await saveState(newState);
      if (result.success !== false) {
        setStateData(newState);
        setShowModal(false);
      } else {
        alert('后端保存失败，但数据已写入本地缓存');
        setStateData(newState);
        setShowModal(false);
      }
    } catch (err) {
      console.error('Failed to save account:', err);
      alert('后端保存失败：' + (err.message || '网络错误') + '，数据已写入本地缓存');
    }
  };

  const getCategoryIcon = (category) => {
    return categoryIcons[category] || Wallet;
  };

  const handleAddCategoryInModal = async () => {
    const name = newCategoryName.trim();
    if (!name || accountCatConfig[name]) return;

    const newCategories = { ...accountCatConfig, [name]: ['其他'] };
    const newState = { ...stateData, accountCategories: newCategories };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
      setFormData({ ...formData, category: name, subCategory: '其他' });
    }
    setNewCategoryName('');
    setAddingCategory(false);
  };

  const handleEditCategoryInModal = async () => {
    const { value, name } = editingCatName;
    const newName = name.trim();
    if (!newName || !value || newName === value) {
      setEditingCatName({ value: '', name: '' });
      return;
    }
    if (accountCatConfig[newName]) {
      alert('该大类名称已存在');
      return;
    }

    const newCategories = {};
    Object.keys(accountCatConfig).forEach(key => {
      if (key === value) {
        newCategories[newName] = accountCatConfig[key];
      } else {
        newCategories[key] = accountCatConfig[key];
      }
    });

    const newAccounts = (stateData.accounts || []).map(acc =>
      acc.category === value ? { ...acc, category: newName } : acc
    );

    const newState = { ...stateData, accountCategories: newCategories, accounts: newAccounts };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
      if (formData.category === value) {
        setFormData({ ...formData, category: newName });
      }
      localStorage.setItem('wealth_os_accounts', JSON.stringify(newAccounts));
    }
    setEditingCatName({ value: '', name: '' });
  };

  const handleDeleteCategoryInModal = async (catName) => {
    if (!confirm(`确定要删除大类「${catName}」吗？`)) return;

    const newCategories = { ...accountCatConfig };
    delete newCategories[catName];
    const firstCat = Object.keys(newCategories)[0] || '其他';
    const firstSub = newCategories[firstCat]?.[0] || '';

    const newAccounts = (stateData.accounts || []).map(acc =>
      acc.category === catName ? { ...acc, category: firstCat, subCategory: firstSub } : acc
    );

    const newState = { ...stateData, accountCategories: newCategories, accounts: newAccounts };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
      if (formData.category === catName) {
        setFormData({ ...formData, category: firstCat, subCategory: firstSub });
      }
      localStorage.setItem('wealth_os_accounts', JSON.stringify(newAccounts));
    }
  };

  const handleAddSubInModal = async () => {
    const name = newSubName.trim();
    if (!name) return;

    const subs = accountCatConfig[formData.category] || [];
    if (subs.includes(name)) {
      alert('该类名已存在');
      return;
    }
    const newSubs = [...subs, name];
    const newCategories = { ...accountCatConfig, [formData.category]: newSubs };
    const newState = { ...stateData, accountCategories: newCategories };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
      setFormData({ ...formData, subCategory: name });
    }
    setNewSubName('');
    setAddingSub(false);
  };

  const handleEditSubInModal = async () => {
    const { index, name } = editingSubName;
    const newName = name.trim();
    if (index < 0 || !newName) {
      setEditingSubName({ index: -1, name: '' });
      return;
    }
    const subs = accountCatConfig[formData.category] || [];
    if (subs.includes(newName) && subs[index] !== newName) {
      alert('该类名已存在');
      return;
    }
    const oldName = subs[index];
    const newSubs = [...subs];
    newSubs[index] = newName;
    const newCategories = { ...accountCatConfig, [formData.category]: newSubs };

    const newAccounts = (stateData.accounts || []).map(acc =>
      acc.category === formData.category && acc.subCategory === oldName
        ? { ...acc, subCategory: newName }
        : acc
    );

    const newState = { ...stateData, accountCategories: newCategories, accounts: newAccounts };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
      if (formData.subCategory === oldName) {
        setFormData({ ...formData, subCategory: newName });
      }
      localStorage.setItem('wealth_os_accounts', JSON.stringify(newAccounts));
    }
    setEditingSubName({ index: -1, name: '' });
  };

  const handleDeleteSubInModal = async (index) => {
    const subs = accountCatConfig[formData.category] || [];
    const subName = subs[index];
    if (!subName) return;
    if (!confirm(`确定要删除类名「${subName}」吗？`)) return;

    const newSubs = subs.filter((_, i) => i !== index);
    const newCategories = { ...accountCatConfig, [formData.category]: newSubs };
    const firstSub = newSubs[0] || '';

    const newAccounts = (stateData.accounts || []).map(acc =>
      acc.category === formData.category && acc.subCategory === subName
        ? { ...acc, subCategory: firstSub }
        : acc
    );

    const newState = { ...stateData, accountCategories: newCategories, accounts: newAccounts };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
      if (formData.subCategory === subName) {
        setFormData({ ...formData, subCategory: firstSub });
      }
      localStorage.setItem('wealth_os_accounts', JSON.stringify(newAccounts));
    }
  };

  const handleOpenCategoryModal = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '' });
    setEditingSubCategory({ main: '', index: -1, name: '' });
    setShowCategoryModal(true);
  };

  const handleAddCategory = async () => {
    const name = categoryForm.name.trim();
    if (!name || accountCatConfig[name]) return;

    const newCategories = { ...accountCatConfig, [name]: ['其他'] };
    const newState = { ...stateData, accountCategories: newCategories };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
      setCategoryForm({ name: '' });
    }
  };

  const handleDeleteCategory = async (catName) => {
    if (!confirm(`确定要删除大类「${catName}」吗？删除后相关账户的大类将变为「其他」。`)) return;

    const newCategories = { ...accountCatConfig };
    delete newCategories[catName];

    const newAccounts = (stateData.accounts || []).map(acc =>
      acc.category === catName ? { ...acc, category: '其他' } : acc
    );

    const newState = { ...stateData, accountCategories: newCategories, accounts: newAccounts };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
      localStorage.setItem('wealth_os_accounts', JSON.stringify(newAccounts));
    }
  };

  const handleAddSubCategory = async (mainCategory) => {
    const subName = editingSubCategory.name.trim();
    if (!subName) return;

    const newSubs = [...(accountCatConfig[mainCategory] || [])];
    if (!newSubs.includes(subName)) {
      newSubs.push(subName);
      const newCategories = { ...accountCatConfig, [mainCategory]: newSubs };
      const newState = { ...stateData, accountCategories: newCategories };
      const result = await saveState(newState);
      if (result.success !== false) {
        setStateData(newState);
      }
    }
    setEditingSubCategory({ main: '', index: -1, name: '' });
  };

  const handleEditSubCategory = (mainCategory, index, name) => {
    setEditingSubCategory({ main: mainCategory, index, name });
  };

  const handleSaveSubCategory = async () => {
    const { main, index, name } = editingSubCategory;
    const newName = name.trim();
    if (!newName || !main || index < 0) return;

    const newSubs = [...(accountCatConfig[main] || [])];
    newSubs[index] = newName;
    const newCategories = { ...accountCatConfig, [main]: newSubs };

    const newAccounts = (stateData.accounts || []).map(acc =>
      acc.category === main && acc.subCategory === accountCatConfig[main][index]
        ? { ...acc, subCategory: newName }
        : acc
    );

    const newState = { ...stateData, accountCategories: newCategories, accounts: newAccounts };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
      localStorage.setItem('wealth_os_accounts', JSON.stringify(newAccounts));
    }
    setEditingSubCategory({ main: '', index: -1, name: '' });
  };

  const handleDeleteSubCategory = async (mainCategory, index) => {
    const subName = accountCatConfig[mainCategory]?.[index];
    if (!subName) return;

    if (!confirm(`确定要删除类名「${subName}」吗？删除后相关账户的类名将变为空。`)) return;

    const newSubs = accountCatConfig[mainCategory].filter((_, i) => i !== index);
    const newCategories = { ...accountCatConfig, [mainCategory]: newSubs };

    const newAccounts = (stateData.accounts || []).map(acc =>
      acc.category === mainCategory && acc.subCategory === subName
        ? { ...acc, subCategory: '' }
        : acc
    );

    const newState = { ...stateData, accountCategories: newCategories, accounts: newAccounts };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
      localStorage.setItem('wealth_os_accounts', JSON.stringify(newAccounts));
    }
  };

  const handleAddTypeInModal = async () => {
    const name = newTypeName.trim();
    if (!name) return;
    if (accountTypesList.includes(name)) {
      alert('该类型已存在');
      return;
    }
    const newTypes = [...accountTypesList, name];
    const newState = { ...stateData, accountTypes: newTypes };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
      setFormData({ ...formData, type: name });
    }
    setNewTypeName('');
    setAddingType(false);
  };

  const handleEditTypeInModal = async () => {
    const { oldName, newName } = editingTypeName;
    const trimmedNew = newName.trim();
    if (!trimmedNew || !oldName || trimmedNew === oldName) {
      setEditingTypeName({ oldName: '', newName: '' });
      return;
    }
    // 内置类型不可编辑
    if (defaultAccountTypes.includes(oldName)) {
      setEditingTypeName({ oldName: '', newName: '' });
      return;
    }
    if (accountTypesList.includes(trimmedNew)) {
      alert('该类型已存在');
      return;
    }
    const newTypes = accountTypesList.map(t => (t === oldName ? trimmedNew : t));
    const newAccounts = (stateData.accounts || []).map(acc =>
      acc.type === oldName ? { ...acc, type: trimmedNew } : acc
    );
    const newState = { ...stateData, accountTypes: newTypes, accounts: newAccounts };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
      if (formData.type === oldName) {
        setFormData({ ...formData, type: trimmedNew });
      }
      localStorage.setItem('wealth_os_accounts', JSON.stringify(newAccounts));
    }
    setEditingTypeName({ oldName: '', newName: '' });
  };

  const handleDeleteTypeInModal = async (typeName) => {
    // 内置类型不可删除
    if (defaultAccountTypes.includes(typeName)) return;
    if (!confirm(`确定要删除类型「${typeName}」吗？相关账户类型将变为「独立资产」。`)) return;

    const newTypes = accountTypesList.filter(t => t !== typeName);
    const newAccounts = (stateData.accounts || []).map(acc =>
      acc.type === typeName ? { ...acc, type: '独立资产' } : acc
    );
    const newState = { ...stateData, accountTypes: newTypes, accounts: newAccounts };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
      if (formData.type === typeName) {
        setFormData({ ...formData, type: '独立资产' });
      }
      localStorage.setItem('wealth_os_accounts', JSON.stringify(newAccounts));
    }
  };

  const handleRenameOwnerGlobal = async () => {
    const { oldName, newName } = editingOwner;
    const trimmedNew = (newName || '').trim();
    if (!trimmedNew || !oldName || trimmedNew === oldName) {
      setEditingOwner({ oldName: '', newName: '' });
      return;
    }
    const existingNames = new Set(allOwnerNames);
    if (existingNames.has(trimmedNew)) {
      if (!confirm(`所有者「${trimmedNew}」已存在，将合并「${oldName}」到「${trimmedNew}」，是否继续？`)) {
        return;
      }
    }
    // Update all accounts: rename oldName -> trimmedNew; merge if both exist in same account (sum shares, keep isDefault true if either was)
    const newAccounts = (stateData.accounts || []).map(acc => {
      if (!Array.isArray(acc.owners)) return acc;
      const map = {};
      const merged = [];
      acc.owners.forEach(o => {
        const targetName = o.name === oldName ? trimmedNew : o.name;
        if (map[targetName] !== undefined) {
          const idx = map[targetName];
          const ex = merged[idx];
          const wasDefault = ex.isDefault === true || o.isDefault === true;
          merged[idx] = { ...ex, share: (parseFloat(ex.share) || 0) + (parseFloat(o.share) || 0), isDefault: wasDefault };
        } else {
          map[targetName] = merged.length;
          merged.push({ ...o, name: targetName });
        }
      });
      const normalized = normalizeOwnersDefault(merged);
      const newType = normalized.length > 1 ? 'multi' : 'personal';
      return { ...acc, owners: normalized, ownershipType: newType };
    });
    const newState = { ...stateData, accounts: newAccounts };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
      localStorage.setItem('wealth_os_accounts', JSON.stringify(newAccounts));
      // update formData.owners if it referenced oldName (apply same merge)
      if (Array.isArray(formData.owners) && formData.owners.some(o => o.name === oldName)) {
        const map2 = {};
        const merged2 = [];
        formData.owners.forEach(o => {
          const targetName = o.name === oldName ? trimmedNew : o.name;
          if (map2[targetName] !== undefined) {
            const idx = map2[targetName];
            const ex = merged2[idx];
            const wasDefault = ex.isDefault === true || o.isDefault === true;
            merged2[idx] = { ...ex, share: (parseFloat(ex.share) || 0) + (parseFloat(o.share) || 0), isDefault: wasDefault };
          } else {
            map2[targetName] = merged2.length;
            merged2.push({ ...o, name: targetName });
          }
        });
        const normalizedFd = normalizeOwnersDefault(merged2);
        setFormData({ ...formData, owners: normalizedFd, ownershipType: normalizedFd.length > 1 ? 'multi' : 'personal' });
      }
      // update extraOwnerNames
      const newExtra = Array.from(new Set([...(extraOwnerNames || [])].map(n => n === oldName ? trimmedNew : n).filter(n => n && String(n).trim())));
      setExtraOwnerNames(newExtra);
      // update tempMultiCheckedNames
      if (tempMultiCheckedNames.has(oldName)) {
        const newChecked = new Set(tempMultiCheckedNames);
        newChecked.delete(oldName);
        newChecked.add(trimmedNew);
        setTempMultiCheckedNames(newChecked);
      }
    } else {
      alert('后端保存失败，但数据已写入本地缓存');
    }
    setEditingOwner({ oldName: '', newName: '' });
  };

  const handleDeleteOwnerGlobal = async (ownerName) => {
    if (!ownerName) return;
    if (!confirm(`确定要删除所有者「${ownerName}」吗？此操作将影响所有包含该所有者的账户，剩余所有者占比将按比例补齐到 100%。`)) return;
    const newAccounts = (stateData.accounts || []).map(acc => {
      if (!Array.isArray(acc.owners)) return acc;
      const wasDefault = acc.owners.some(o => o.name === ownerName && o.isDefault === true);
      let remaining = acc.owners.filter(o => o.name !== ownerName).map(o => ({ ...o }));
      if (remaining.length === 0) {
        return { ...acc, ownershipType: 'personal', owners: [{ name: '默认', share: 100, isDefault: true }] };
      }
      // rescale shares to sum 100
      const sum = remaining.reduce((s, o) => s + (parseFloat(o.share) || 0), 0);
      if (sum > 0) {
        remaining = remaining.map(o => ({ ...o, share: Math.round(((parseFloat(o.share) || 0) / sum) * 100 * 100) / 100 }));
      } else {
        const eq = Math.round((100 / remaining.length) * 100) / 100;
        remaining = remaining.map((o, i) => ({ ...o, share: i === 0 ? eq + (100 - eq * remaining.length) : eq }));
      }
      // set default: if removed was default, first remaining becomes default
      if (wasDefault) {
        remaining = remaining.map((o, i) => ({ ...o, isDefault: i === 0 }));
      } else {
        remaining = normalizeOwnersDefault(remaining);
      }
      const newType = remaining.length > 1 ? 'multi' : 'personal';
      return { ...acc, owners: remaining, ownershipType: newType };
    });
    const newState = { ...stateData, accounts: newAccounts };
    const result = await saveState(newState);
    if (result.success !== false) {
      setStateData(newState);
      localStorage.setItem('wealth_os_accounts', JSON.stringify(newAccounts));
      // update formData.owners: remove the owner, rescale, fix default
      if (Array.isArray(formData.owners) && formData.owners.some(o => o.name === ownerName)) {
        const wasDefaultFd = formData.owners.some(o => o.name === ownerName && o.isDefault === true);
        let remainingFd = formData.owners.filter(o => o.name !== ownerName).map(o => ({ ...o }));
        if (remainingFd.length === 0) {
          remainingFd = [{ name: '默认', share: 100, isDefault: true }];
          setFormData({ ...formData, owners: remainingFd, ownershipType: 'personal' });
        } else {
          const sumFd = remainingFd.reduce((s, o) => s + (parseFloat(o.share) || 0), 0);
          if (sumFd > 0) {
            remainingFd = remainingFd.map(o => ({ ...o, share: Math.round(((parseFloat(o.share) || 0) / sumFd) * 100 * 100) / 100 }));
          } else {
            const eq = Math.round((100 / remainingFd.length) * 100) / 100;
            remainingFd = remainingFd.map((o, i) => ({ ...o, share: i === 0 ? eq + (100 - eq * remainingFd.length) : eq }));
          }
          if (wasDefaultFd) remainingFd = remainingFd.map((o, i) => ({ ...o, isDefault: i === 0 }));
          else remainingFd = normalizeOwnersDefault(remainingFd);
          setFormData({ ...formData, owners: remainingFd, ownershipType: remainingFd.length > 1 ? 'multi' : 'personal' });
        }
      }
      // update extraOwnerNames
      const newExtra = Array.from(new Set([...(extraOwnerNames || [])].filter(n => n !== ownerName)));
      setExtraOwnerNames(newExtra);
      // update tempMultiCheckedNames
      if (tempMultiCheckedNames.has(ownerName)) {
        const newChecked = new Set(tempMultiCheckedNames);
        newChecked.delete(ownerName);
        setTempMultiCheckedNames(newChecked);
      }
    } else {
      alert('后端保存失败，但数据已写入本地缓存');
    }
  };

  const handleSetDefaultOwner = (ownerName) => {
    if (!ownerName || !Array.isArray(formData.owners)) return;
    const newOwners = formData.owners.map(o => ({ ...o, isDefault: o.name === ownerName }));
    setFormData({ ...formData, owners: newOwners });
  };

  const { totalAssets, totalLiabilities, netWorth, assetAccounts, liabilityAccounts } = computeStats();

  const tags = useMemo(() => {
    if (!selectedAccountId) return [];
    const account = accounts.find(a => a.id === selectedAccountId);
    if (!account) return [];
    const tagSet = new Set();
    (financeAssets || [])
      .filter(a => {
        if (a.status === 'archived' || a.isArchived) return false;
        const accId = a.accountId || a.account || '';
        return accId === account.id || accId === account.name;
      })
      .forEach(a => {
        if (a.tags && Array.isArray(a.tags)) {
          a.tags.forEach(t => tagSet.add(t));
        } else if (a.tags && typeof a.tags === 'string' && a.tags.trim()) {
          tagSet.add(a.tags.trim());
        }
      });
    return [...tagSet].sort();
  }, [selectedAccountId, accounts, financeAssets]);

  const accountHoldings = useMemo(() => {
    if (!selectedAccountId) return [];
    const account = accounts.find(a => a.id === selectedAccountId);
    if (!account) return [];

    const isCashCategory = (a) => a.category === '现金类' || a.categoryL1 === '现金类';

    return (financeAssets || [])
      .filter(a => {
        if (a.status === 'archived' || a.isArchived) return false;
        const accId = a.accountId || a.account || '';
        return accId === account.id || accId === account.name;
      })
      .map((a) => {
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

        const _computedQty = buyTotalQty - sellTotalQty;
        const _qty = buyTotalQty > 0 ? _computedQty : (parseFloat(a.shares || a.quantity) || 0);
        const _computedCostPrice = buyTotalQty > 0 ? buyTotalAmount / buyTotalQty : 0;
        const _costPrice = buyTotalQty > 0 ? _computedCostPrice : (parseFloat(a.costPrice || a.cost) || 0);

        const isCash = isCashCategory(a);
        // 数量始终使用实际数量，不能用 currentValue 覆盖
        const _effectiveQty = _qty;
        const _quotePrice = parseFloat(quotesMap[a.code]?.price) || 0;
        // 允许现金类资产使用用户输入的价格，不再强制设为1
        const _effectivePrice = _quotePrice || parseFloat(a.currentPrice) || 0;

        const _unitCost = _costPrice;
        const _totalCost = _unitCost * _effectiveQty;
        // 当前市值始终使用 price × qty 计算，不依赖存储的 currentValue
        const _currentValue = _effectivePrice * _effectiveQty;
        const _holdingPnl = isCash ? 0 : (_currentValue - _totalCost);
        const _holdingPnlRate = _totalCost > 0 ? (_holdingPnl / _totalCost) * 100 : 0;

        const _prevPrice = parseFloat(a.prevPrice) || 0;
        const _dailyPnl = isCash ? 0 : ((_prevPrice > 0 && _effectivePrice > 0)
          ? (_effectivePrice - _prevPrice) * _effectiveQty
          : (parseFloat(a.todayPnl) || parseFloat(a.dailyPnl) || 0));
        const _dailyPnlRate = isCash ? 0 : ((_prevPrice > 0 && _effectivePrice > 0)
          ? ((_effectivePrice - _prevPrice) / _prevPrice) * 100
          : (parseFloat(a.todayPnlPercent) || parseFloat(a.dailyPnlRate) || 0));

        const _priceChange = _effectivePrice > _prevPrice ? 'up' : _effectivePrice < _prevPrice ? 'down' : 'unchanged';

        return {
          id: a.id,
          market: a.market || '国内市场',
          currency: a.currency || 'CNY',
          name: a.name || '-',
          code: a.code || '',
          assetType: a.kind || a.assetType || '',
          assetKind: a.assetKind || a.kind || '',
          account: account.name || '',
          categoryL1: a.category || a.categoryL1 || '',
          categoryL2: a.subcategory || a.categoryL2 || '',
          categoryL3: a.tertiaryCategory || a.categoryL3 || '',
          categoryL4: a.categoryL4 || '',
          positionGroup: a.positionGroup || '',
          positionType: a.positionCategory || a.positionType || '',
          tags: a.tags || [],
          costPrice: _unitCost,
          avgCost: _unitCost,
          quantity: _effectiveQty,
          cost: _totalCost,
          currentPrice: _effectivePrice,
          prevPrice: _prevPrice,
          priceChange: _priceChange,
          holdingDays: a.holdingDays || 0,
          balance: _currentValue,
          currentValue: _currentValue,
          holdingPnl: _holdingPnl,
          holdingPnlRate: _holdingPnlRate,
          dailyPnl: _dailyPnl,
          dailyPnlRate: _dailyPnlRate,
          positionRatio: 0,
        };
      });
  }, [selectedAccountId, accounts, financeAssets, quotesMap]);

  // 账户详情汇总：基于 accountHoldings（与持仓表合计行一致）
  // 总市值 = Σ currentValue（按币种转换为 CNY）；总成本 = Σ cost（按币种转换为 CNY）；余额 = Σ currentValue(一级分类为现金类)
  const holdingsSummary = useMemo(() => {
    let totalMv = 0;
    let totalCost = 0;
    let balance = 0;
    const balanceByType = {};
    let balanceCount = 0;
    accountHoldings.forEach(h => {
      const currency = h.currency || 'CNY';
      const mv = convertCurrency(parseFloat(h.currentValue) || 0, currency, 'CNY', exchangeRates);
      const cost = convertCurrency(parseFloat(h.cost) || 0, currency, 'CNY', exchangeRates);
      totalMv += mv;
      totalCost += cost;
      if (h.categoryL1 === '现金类') {
        balance += mv;
        balanceCount += 1;
        const typeKey = h.assetType || h.assetKind || '其他';
        balanceByType[typeKey] = (balanceByType[typeKey] || 0) + mv;
      }
    });
    return { totalMv, totalCost, balance, balanceByType, balanceCount };
  }, [accountHoldings, exchangeRates]);

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

  const renderDetailPage = () => {
    const account = accounts.find(a => a.id === selectedAccountId);
    if (!account) {
      return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 shadow-soft border border-gray-100 dark:border-slate-700 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">未找到该账户</p>
          <button
            onClick={() => setSelectedAccountId(null)}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            返回列表
          </button>
        </div>
      );
    }

    const currentOwnerShare = getOwnerShare(account, detailOwnerFilter);
    const s = currentOwnerShare;

    // 汇总卡片数据来源：优先使用 holdingsSummary（与持仓表合计行一致）
    // 当 accountHoldings 为空时（如负债账户无理财持仓），回退到 accountStats
    const fallbackStats = accountStats[selectedAccountId] || { marketValue: 0, holdingCost: 0 };
    const useHoldings = accountHoldings.length > 0;
    const summaryMv = useHoldings ? holdingsSummary.totalMv : fallbackStats.marketValue;
    const summaryCost = useHoldings ? holdingsSummary.totalCost : fallbackStats.holdingCost;
    const summaryBalance = useHoldings ? holdingsSummary.balance : (balanceData.totalBalance || 0);
    const summaryBalanceByType = useHoldings ? holdingsSummary.balanceByType : balanceData.balanceByType;
    const summaryBalanceCount = useHoldings ? holdingsSummary.balanceCount : balanceData.includedCount;

    const effectiveType = getEffectiveType(account);
    const isLiability = effectiveType === '负债';
    const rawPl = summaryMv - summaryCost;
    const pl = isLiability ? -rawPl : rawPl;
    const plRate = isLiability
      ? (summaryMv > 0 ? -rawPl / summaryMv : null)
      : (summaryCost > 0 ? rawPl / summaryCost : null);
    const plColor = pl > 0 ? 'text-green-600' : pl < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white';

    const scaledMv = summaryMv * s;
    const scaledCost = summaryCost * s;
    const scaledPl = (isLiability ? -rawPl : rawPl) * s;

    const scaledTotalBalance = summaryBalance * s;
    const scaledBalanceByType = {};
    Object.entries(summaryBalanceByType).forEach(([type, total]) => {
      scaledBalanceByType[type] = typeof total === 'number' ? total * s : total;
    });
    const scaledBalanceCount = summaryBalanceCount;
    const scaledAccountHoldings = scaleAssetList(accountHoldings, s);

    return (
      <>
        {/* 顶部栏 */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedAccountId(null)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                返回
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{account.name}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {account.category || '其他'} · {account.subCategory || '-'} · {getDisplayType(account)}{account.type === '理财资产' && account.financeMarket ? ` · ${account.financeMarket}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedAccountId(null);
                  handleEdit(account);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                编辑
              </button>
              <button
                onClick={() => {
                  if (!confirm('确定要删除这个账户吗？')) return;
                  const idToDelete = account.id;
                  setSelectedAccountId(null);
                  handleDelete(idToDelete);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
            </div>
          </div>
        </div>

        {/* 按所有者筛选条 */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">按所有者查看：</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={()=>setDetailOwnerFilter('__ALL__')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${detailOwnerFilter==='__ALL__' ? 'bg-primary-500 text-white shadow-sm' : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
                >全部</button>
                {(account.owners||[]).map((o,i)=>(
                  <button
                    key={o.name + '_' + i}
                    type="button"
                    onClick={()=>setDetailOwnerFilter(o.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${detailOwnerFilter===o.name ? 'bg-primary-500 text-white shadow-sm' : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
                  >{o.name} · {o.share}%</button>
                ))}
              </div>
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              {detailOwnerFilter === '__ALL__'
                ? <span>显示：全部 · 100%</span>
                : <span>显示：{detailOwnerFilter} · 占比 {currentOwnerShare*100}%</span>}
            </div>
          </div>
        </div>

        {/* 汇总卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full p-1.5">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">总市值</span>
            </div>
            <div className="text-lg font-bold text-green-600 tabular-nums whitespace-nowrap">
              {formatCurrencyWithRate(scaledMv, 'CNY', selectedCurrency, exchangeRates)}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 rounded-full p-1.5">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">总成本</span>
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
              {formatCurrencyWithRate(scaledCost, 'CNY', selectedCurrency, exchangeRates)}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className={`${scaledPl >= 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'} rounded-full p-1.5`}>
                {scaledPl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">总盈亏</span>
            </div>
            <div className={`text-lg font-bold tabular-nums whitespace-nowrap ${plColor}`}>
              {formatCurrencyWithRate(scaledPl, 'CNY', selectedCurrency, exchangeRates)}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className={`${pl >= 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'} rounded-full p-1.5`}>
                {pl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">总收益率</span>
            </div>
            <div className={`text-lg font-bold tabular-nums whitespace-nowrap ${plColor}`}>
              {plRate !== null ? `${(plRate * 100).toFixed(2)}%` : '—'}
            </div>
          </div>
        </div>

        {/* 现有余额卡片 */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
          <div
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => setBalanceCardExpanded(!balanceCardExpanded)}
          >
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full p-2">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">现有余额</div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatCurrencyWithRate(scaledTotalBalance, 'CNY', selectedCurrency, exchangeRates)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {scaledBalanceCount} 项资产计入
              </span>
              {balanceCardExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
          {balanceCardExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 transition-all duration-200">
              {scaledBalanceCount === 0 ? (
                <div className="text-center py-4 text-gray-400 dark:text-gray-500 text-sm">
                  暂无计入余额的资产，请在下方勾选资产
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(scaledBalanceByType).map(([type, total]) => (
                    <div key={type} className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 border border-emerald-100 dark:border-emerald-800/50">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{type}</div>
                      <div className="text-base font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
                        {formatCurrencyWithRate(total, 'CNY', selectedCurrency, exchangeRates)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <FinanceHoldingsTable
          categoryName="account_detail"
          holdings={scaledAccountHoldings}
          readOnly={true}
          defaultAccountFilter={account?.name || ''}
          colorIdx={0}
          marketOptions={marketOptions}
          currencyOptions={currencyOptions}
          assetTypeOptions={assetTypeOptions}
          assetClassOptions={assetClassOptions}
          positionGroupOptions={positionGroupOptions}
          positionTypeOptions={positionTypeOptions}
          allCategoryL2Options={allCategoryL2Options}
          marketGroups={marketGroups}
          tags={tags}
          categoryL3CustomOptions={categoryL3CustomOptions}
          categoryL4Options={categoryL4Options}
          selectedCurrency={selectedCurrency}
          exchangeRates={exchangeRates}
          assetKindOptions={assetKindOptions}
        />
      </>
    );
  };

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
              <h1 className="text-2xl font-bold text-gray-900">账户管理</h1>
              <p className="text-sm text-gray-600 mt-1">管理所有资产和负债账户</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm font-medium bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {currencies.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <button
                onClick={loadData}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-primary-500 text-primary-500 text-sm font-medium hover:bg-primary-500 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                刷新数据
              </button>
              <button
                onClick={handleOpenCategoryModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Settings2 className="w-4 h-4" />
                分类管理
              </button>
              <button
                onClick={handleAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                添加账户
              </button>
            </div>
          </div>
        </section>

        {selectedAccountId ? (
          renderDetailPage()
        ) : (
          <>
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full p-2">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">总资产</span>
            </div>
            <div className="text-2xl font-bold text-green-600 tabular-nums whitespace-nowrap">
              {formatCurrencyWithRate(totalAssets, 'CNY', selectedCurrency, exchangeRates)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {assetAccounts.length} 个账户
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full p-2">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">总负债</span>
            </div>
            <div className="text-2xl font-bold text-red-500 tabular-nums whitespace-nowrap">
              {formatCurrencyWithRate(totalLiabilities, 'CNY', selectedCurrency, exchangeRates)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {liabilityAccounts.length} 个账户
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full p-2">
                <PiggyBank className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">净资产</span>
            </div>
            <div className={`text-2xl font-bold tabular-nums whitespace-nowrap ${
              netWorth >= 0 ? 'text-green-600' : 'text-red-500'
            }`}>
              {formatCurrencyWithRate(netWorth, 'CNY', selectedCurrency, exchangeRates)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              资产 - 负债
            </div>
          </div>
        </section>

        {cooperationFunds.multiAccountCount > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* 默认持有 */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full p-2">
                  <PiggyBank className="w-5 h-5" />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">合作 · 默认持有</span>
              </div>
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400 tabular-nums whitespace-nowrap">
                {formatCurrencyWithRate(cooperationFunds.defaultHeld, 'CNY', selectedCurrency, exchangeRates)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                基于 {cooperationFunds.multiAccountCount} 个多人所有账户按默认占比拆分
              </div>
            </div>
            {/* 他人持有 */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full p-2">
                  <Wallet className="w-5 h-5" />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">合作 · 他人持有</span>
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums whitespace-nowrap">
                {formatCurrencyWithRate(cooperationFunds.otherHeld, 'CNY', selectedCurrency, exchangeRates)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                多人所有账户中非默认所有者按占比占有的资金
              </div>
            </div>
          </section>
        )}

        <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">账户列表</h3>
          
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-500">筛选：</span>
            </div>
            <div style={{ width: '140px' }}>
              <input
                type="text"
                value={filters.name}
                onChange={(e) => { setFilters({ ...filters, name: e.target.value }); setCurrentPage(1); }}
                placeholder="账户名称"
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
              />
            </div>
            <div style={{ width: '100px' }}>
              <select
                value={filters.category}
                onChange={(e) => { setFilters({ ...filters, category: e.target.value }); setCurrentPage(1); }}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
              >
                <option value="">全部分类</option>
                {categoryList.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div style={{ width: '100px' }}>
              <select
                value={filters.type}
                onChange={(e) => { setFilters({ ...filters, type: e.target.value }); setCurrentPage(1); }}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
              >
                <option value="">全部类型</option>
                <option value="asset">资产</option>
                <option value="liability">负债</option>
              </select>
            </div>
            {(filters.name || filters.category || filters.type) && (
              <button
                onClick={() => { setFilters({ name: '', category: '', type: '' }); setCurrentPage(1); }}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                清除筛选
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">账户名称</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">大类</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">类名</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">所有人</th>
                  <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">类型</th>
                  <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">当前市值</th>
                  <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">持有成本</th>
                  <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">盈亏额</th>
                  <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">收益率</th>
                  <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">余额</th>
                  <th className="text-center py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAccounts.map((account) => {
                  const Icon = getCategoryIcon(account.category);
                  const balance = calculateAccountBalance[account.id] || 0;
                  const stats = accountStats[account.id] || { marketValue: 0, holdingCost: 0 };
                  const effectiveType = getEffectiveType(account);
                  const isLiabilityType = effectiveType === '负债';
                  // 负债类型盈亏逻辑与资产相反
                  const rawPl = stats.marketValue - stats.holdingCost;
                  const pl = isLiabilityType ? -rawPl : rawPl;
                  const plRate = isLiabilityType
                    ? (stats.marketValue > 0 ? -rawPl / stats.marketValue : null)
                    : (stats.holdingCost > 0 ? rawPl / stats.holdingCost : null);
                  const hasAssets = stats.marketValue !== 0 || stats.holdingCost !== 0;
                  const plColor = pl > 0 ? 'text-green-600' : pl < 0 ? 'text-red-500' : 'text-gray-400';
                  const ownershipType = account.ownershipType || (Array.isArray(account.owners) && account.owners.length>1 ? 'multi' : 'personal');
                  const owners = Array.isArray(account.owners) && account.owners.length>0 ? account.owners : [{name:'默认', share:100}];
                  const ownerSummaryText = owners.length===1
                    ? (owners[0].name || '默认')
                    : ((owners[0].name || '默认') + ' + ' + (owners.length-1) + '人');
                  return (
                    <tr
                      key={account.id}
                      className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 cursor-pointer"
                      onClick={() => setSelectedAccountId(account.id)}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className={`rounded-lg p-2 ${
                            isLiabilityType
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                              : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">{account.name}</span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${ownershipType==='multi' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                            {ownershipType==='multi' ? '多人' : '个人'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400">
                          {account.category || '其他'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {account.subCategory || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {ownerSummaryText}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isLiabilityType
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        }`}>
                          {getDisplayType(account)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-medium tabular-nums text-gray-900 dark:text-white">
                        {hasAssets ? formatCurrency(stats.marketValue) : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-medium tabular-nums text-gray-900 dark:text-white">
                        {hasAssets ? formatCurrency(stats.holdingCost) : '—'}
                      </td>
                      <td className={`py-3 px-3 text-right font-medium tabular-nums ${
                        !hasAssets ? 'text-gray-400' : plColor
                      }`}>
                        {!hasAssets ? '—' : (pl === 0 ? '—' : formatCurrency(pl))}
                      </td>
                      <td className={`py-3 px-3 text-right font-medium tabular-nums ${
                        !hasAssets ? 'text-gray-400' : plColor
                      }`}>
                        {hasAssets && plRate !== null ? `${(plRate * 100).toFixed(2)}%` : '—'}
                      </td>
                      <td className={`py-3 px-3 text-right font-medium tabular-nums ${
                        balance < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'
                      }`}>
                        {formatCurrencyWithRate(balance, account.currency || 'CNY', selectedCurrency, exchangeRates)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(account); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(account.id); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {paginatedAccounts.length > 0 && (() => {
                  const totalMv = paginatedAccounts.reduce((sum, a) => sum + (accountStats[a.id]?.marketValue || 0), 0);
                  const totalCost = paginatedAccounts.reduce((sum, a) => sum + (accountStats[a.id]?.holdingCost || 0), 0);
                  const totalPl = totalMv - totalCost;
                  const totalBalance = paginatedAccounts.reduce((sum, a) => sum + (calculateAccountBalance[a.id] || 0), 0);
                  return (
                    <tr className="border-b-2 border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 font-semibold">
                      <td className="py-3 px-3 text-gray-900 dark:text-white" colSpan={5}>合计（{paginatedAccounts.length} 条）</td>
                      <td className="py-3 px-3 text-right tabular-nums text-gray-900 dark:text-white">{formatCurrency(totalMv)}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-gray-900 dark:text-white">{formatCurrency(totalCost)}</td>
                      <td className={`py-3 px-3 text-right tabular-nums ${totalPl > 0 ? 'text-green-600' : totalPl < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>{formatCurrency(totalPl)}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-gray-400">—</td>
                      <td className={`py-3 px-3 text-right tabular-nums ${totalBalance < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>{formatCurrency(totalBalance)}</td>
                      <td></td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
            {filteredAccounts.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p>暂无账户数据，点击右上角添加账户</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              共 {filteredAccounts.length} 条记录，当前显示第 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredAccounts.length)} 条
            </div>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
              >
                <option value={20}>20条/页</option>
                <option value={50}>50条/页</option>
                <option value={100}>100条/页</option>
              </select>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium min-w-[60px] text-center">
                {currentPage} / {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

          </>
        )}

        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => {
              setShowCategoryDropdown(false);
              setShowSubDropdown(false);
              setShowTypeDropdown(false);
              setOwnershipDropdownOpen(false);
              setOwnerDropdownOpen(false);
              setAddingCategory(false);
              setAddingSub(false);
              setAddingType(false);
              setEditingCatName({ value: '', name: '' });
              setEditingSubName({ index: -1, name: '' });
              setEditingTypeName({ oldName: '', newName: '' });
            }}
          >
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingAccount ? '编辑账户' : '添加账户'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    账户名称
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="请输入账户名称"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      大类
                    </label>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCategoryDropdown(!showCategoryDropdown);
                        setShowSubDropdown(false);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-left flex items-center justify-between hover:border-primary-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <span className="truncate">{formData.category}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showCategoryDropdown && (
                      <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}>
                        {categoryList.map(cat => (
                          <div key={cat.value} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-600">
                            {editingCatName.value === cat.value ? (
                              <input
                                type="text"
                                value={editingCatName.name}
                                onChange={(e) => setEditingCatName({ ...editingCatName, name: e.target.value })}
                                autoFocus
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-slate-500 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleEditCategoryInModal();
                                  if (e.key === 'Escape') setEditingCatName({ value: '', name: '' });
                                }}
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  const availableSubs = getSubCategories(cat.value);
                                  const defaultSub = availableSubs[0]?.value || '';
                                  setFormData({ ...formData, category: cat.value, subCategory: defaultSub });
                                  setShowCategoryDropdown(false);
                                }}
                                className={`flex-1 text-left text-sm ${formData.category === cat.value ? 'text-primary-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                              >
                                {cat.label}
                              </button>
                            )}
                            {editingCatName.value === cat.value ? (
                              <button
                                type="button"
                                onClick={handleEditCategoryInModal}
                                className="p-1 text-green-500 hover:text-green-600"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingCatName({ value: cat.value, name: cat.label });
                                  }}
                                  className="p-1 text-gray-400 hover:text-primary-500"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCategoryInModal(cat.value);
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-500"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                        <div className="border-t border-gray-100 dark:border-slate-600">
                          {addingCategory ? (
                            <div className="flex items-center gap-2 px-3 py-2">
                              <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="输入大类名称"
                                autoFocus
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-slate-500 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddCategoryInModal();
                                  if (e.key === 'Escape') { setAddingCategory(false); setNewCategoryName(''); }
                                }}
                              />
                              <button
                                type="button"
                                onClick={handleAddCategoryInModal}
                                className="px-2 py-1 text-xs rounded bg-primary-500 text-white hover:bg-primary-600"
                              >
                                添加
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setAddingCategory(true); setNewCategoryName(''); }}
                              className="w-full px-3 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-slate-600 flex items-center justify-center gap-1"
                            >
                              <Plus className="w-4 h-4" />
                              添加大类
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      类名
                    </label>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSubDropdown(!showSubDropdown);
                        setShowCategoryDropdown(false);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-left flex items-center justify-between hover:border-primary-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <span className="truncate">{formData.subCategory || '-'}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showSubDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showSubDropdown && (
                      <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}>
                        {getSubCategories(formData.category).map((sub, index) => (
                          <div key={sub.value} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-600">
                            {editingSubName.index === index ? (
                              <input
                                type="text"
                                value={editingSubName.name}
                                onChange={(e) => setEditingSubName({ ...editingSubName, name: e.target.value })}
                                autoFocus
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-slate-500 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleEditSubInModal();
                                  if (e.key === 'Escape') setEditingSubName({ index: -1, name: '' });
                                }}
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, subCategory: sub.value });
                                  setShowSubDropdown(false);
                                }}
                                className={`flex-1 text-left text-sm ${formData.subCategory === sub.value ? 'text-primary-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                              >
                                {sub.label}
                              </button>
                            )}
                            {editingSubName.index === index ? (
                              <button
                                type="button"
                                onClick={handleEditSubInModal}
                                className="p-1 text-green-500 hover:text-green-600"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSubName({ index, name: sub.label });
                                  }}
                                  className="p-1 text-gray-400 hover:text-primary-500"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSubInModal(index);
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-500"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                        <div className="border-t border-gray-100 dark:border-slate-600">
                          {addingSub ? (
                            <div className="flex items-center gap-2 px-3 py-2">
                              <input
                                type="text"
                                value={newSubName}
                                onChange={(e) => setNewSubName(e.target.value)}
                                placeholder="输入类名"
                                autoFocus
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-slate-500 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddSubInModal();
                                  if (e.key === 'Escape') { setAddingSub(false); setNewSubName(''); }
                                }}
                              />
                              <button
                                type="button"
                                onClick={handleAddSubInModal}
                                className="px-2 py-1 text-xs rounded bg-primary-500 text-white hover:bg-primary-600"
                              >
                                添加
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setAddingSub(true); setNewSubName(''); }}
                              className="w-full px-3 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-slate-600 flex items-center justify-center gap-1"
                            >
                              <Plus className="w-4 h-4" />
                              添加类名
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    货币
                  </label>
                  <select
                    value={formData.currency || 'CNY'}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {currencies.map(curr => (
                      <option key={curr.value} value={curr.value}>{curr.label}</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    所属
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOwnershipDropdownOpen(!ownershipDropdownOpen);
                      setOwnerDropdownOpen(false);
                      setShowCategoryDropdown(false);
                      setShowSubDropdown(false);
                      setShowTypeDropdown(false);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-left flex items-center justify-between hover:border-primary-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <span className="truncate">{formData.ownershipType === 'multi' ? '多人所有' : '个人所有'}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${ownershipDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {ownershipDropdownOpen && (
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg"
                      onClick={(e) => e.stopPropagation()}>
                      <div
                        className={`px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-600 ${formData.ownershipType !== 'multi' ? 'text-primary-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                        onClick={() => {
                          const ownerName = lastPersonalOwner || allOwnerNames[0] || '默认';
                          setFormData({
                            ...formData,
                            ownershipType: 'personal',
                            owners: [{ name: ownerName, share: 100, isDefault: true }],
                          });
                          setTempMultiCheckedNames(new Set());
                          setOwnershipDropdownOpen(false);
                        }}
                      >
                        个人所有
                      </div>
                      <div
                        className={`px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-600 ${formData.ownershipType === 'multi' ? 'text-primary-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                        onClick={() => {
                          let initialChecked;
                          if (formData.ownershipType === 'multi' && Array.isArray(formData.owners)) {
                            initialChecked = new Set(formData.owners.map(o => o.name));
                          } else {
                            initialChecked = new Set();
                          }
                          let multiOwners;
                          if (formData.ownershipType === 'multi' && Array.isArray(formData.owners) && formData.owners.length > 0) {
                            multiOwners = formData.owners;
                          } else {
                            multiOwners = [];
                          }
                          setTempMultiCheckedNames(initialChecked);
                          setFormData({
                            ...formData,
                            ownershipType: 'multi',
                            owners: multiOwners,
                          });
                          setOwnershipDropdownOpen(false);
                        }}
                      >
                        多人所有
                      </div>
                    </div>
                  )}
                </div>
                {formData.ownershipType !== 'multi' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      所有者
                    </label>
                    <div className="flex items-start gap-2">
                      <div className="relative flex-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOwnerDropdownOpen(!ownerDropdownOpen);
                            setOwnershipDropdownOpen(false);
                            setShowCategoryDropdown(false);
                            setShowSubDropdown(false);
                            setShowTypeDropdown(false);
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-left flex items-center justify-between hover:border-primary-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <span className="truncate">{formData.owners?.[0]?.name || '-'}</span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${ownerDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {ownerDropdownOpen && (
                          <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}>
                            {allOwnerNames.length === 0 ? (
                              <div className="px-3 py-2 text-sm text-gray-400">暂无所有者，点击右侧 + 新增</div>
                            ) : (
                              allOwnerNames.map(name => (
                                <div
                                  key={name}
                                  className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-600"
                                >
                                  {editingOwner.oldName === name ? (
                                    <input
                                      type="text"
                                      value={editingOwner.newName}
                                      onChange={(e) => setEditingOwner({ ...editingOwner, newName: e.target.value })}
                                      autoFocus
                                      className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-slate-500 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleRenameOwnerGlobal();
                                        if (e.key === 'Escape') setEditingOwner({ oldName: '', newName: '' });
                                      }}
                                    />
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormData({
                                          ...formData,
                                          owners: [{ name, share: 100, isDefault: true }],
                                        });
                                        setLastPersonalOwner(name);
                                        setOwnerDropdownOpen(false);
                                      }}
                                      className={`flex-1 text-left text-sm ${formData.owners?.[0]?.name === name ? 'text-primary-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                                    >
                                      {name}
                                    </button>
                                  )}
                                  {editingOwner.oldName === name ? (
                                    <button
                                      type="button"
                                      onClick={handleRenameOwnerGlobal}
                                      className="p-1 text-green-500 hover:text-green-600"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingOwner({ oldName: name, newName: name });
                                        }}
                                        className="p-1 text-gray-400 hover:text-primary-500"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteOwnerGlobal(name);
                                        }}
                                        className="p-1 text-gray-400 hover:text-red-500"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPersonalAdd(!showPersonalAdd);
                          setPersonalNewName('');
                        }}
                        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {showPersonalAdd && (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          value={personalNewName}
                          onChange={(e) => setPersonalNewName(e.target.value)}
                          placeholder="输入所有者姓名"
                          autoFocus
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const trimmed = personalNewName.trim();
                              if (trimmed) {
                                const newExtra = Array.from(new Set([...(extraOwnerNames || []), trimmed]));
                                setExtraOwnerNames(newExtra);
                                setFormData({
                                  ...formData,
                                  owners: [{ name: trimmed, share: 100, isDefault: true }],
                                });
                                setLastPersonalOwner(trimmed);
                              }
                              setShowPersonalAdd(false);
                              setPersonalNewName('');
                            }
                            if (e.key === 'Escape') {
                              setShowPersonalAdd(false);
                              setPersonalNewName('');
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = personalNewName.trim();
                            if (trimmed) {
                              const newExtra = Array.from(new Set([...(extraOwnerNames || []), trimmed]));
                              setExtraOwnerNames(newExtra);
                              setFormData({
                                ...formData,
                                owners: [{ name: trimmed, share: 100, isDefault: true }],
                              });
                              setLastPersonalOwner(trimmed);
                            }
                            setShowPersonalAdd(false);
                            setPersonalNewName('');
                          }}
                          className="px-3 py-2 text-sm rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors shrink-0"
                        >
                          保存
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {formData.ownershipType === 'multi' && (
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3 border border-gray-200 dark:border-slate-600">
                    <div
                      className="flex items-center justify-between cursor-pointer select-none mb-2"
                      onClick={() => setMultiOwnerPanelOpen(!multiOwnerPanelOpen)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">所有者（多人）</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">勾选后输入占比</span>
                      </div>
                      {multiOwnerPanelOpen ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    {multiOwnerPanelOpen && (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {allOwnerNames.map(name => {
                          const isChecked = tempMultiCheckedNames.has(name);
                          const ownerItem = Array.isArray(formData.owners) ? formData.owners.find(o => o.name === name) : null;
                          const shareValue = ownerItem ? ownerItem.share : 0;
                          return (
                            <div key={name} className="flex items-center gap-2 flex-wrap bg-white dark:bg-slate-800 rounded-lg p-2 border border-gray-200 dark:border-slate-600">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  const newChecked = new Set(tempMultiCheckedNames);
                                  let newOwners = Array.isArray(formData.owners) ? [...formData.owners] : [];
                                  if (checked) {
                                    newChecked.add(name);
                                    if (!newOwners.find(o => o.name === name)) {
                                      newOwners.push({ name, share: 0 });
                                    }
                                  } else {
                                    newChecked.delete(name);
                                    newOwners = newOwners.filter(o => o.name !== name);
                                  }
                                  setTempMultiCheckedNames(newChecked);
                                  setFormData({ ...formData, owners: newOwners });
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 shrink-0"
                              />
                              {editingOwner.oldName === name ? (
                                <div className="flex items-center gap-1 flex-1 min-w-[120px]">
                                  <input
                                    type="text"
                                    value={editingOwner.newName}
                                    onChange={(e) => setEditingOwner({ ...editingOwner, newName: e.target.value })}
                                    autoFocus
                                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-slate-500 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleRenameOwnerGlobal();
                                      if (e.key === 'Escape') setEditingOwner({ oldName: '', newName: '' });
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={handleRenameOwnerGlobal}
                                    className="px-2 py-1 text-xs rounded bg-primary-500 text-white hover:bg-primary-600"
                                  >
                                    保存
                                  </button>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">{name}</span>
                              )}
                              {isChecked && (
                                <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 shrink-0">
                                  <input
                                    type="radio"
                                    name="default-owner"
                                    checked={!!ownerItem?.isDefault}
                                    onChange={() => handleSetDefaultOwner(name)}
                                    className="w-3.5 h-3.5"
                                  />
                                  默认
                                </label>
                              )}
                              <div className="flex items-center gap-1 shrink-0">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={0.01}
                                  value={isChecked ? shareValue : ''}
                                  disabled={!isChecked}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    const shareNum = isNaN(val) ? 0 : Math.max(0, Math.min(100, val));
                                    const newOwners = (Array.isArray(formData.owners) ? [...formData.owners] : []).map(o =>
                                      o.name === name ? { ...o, share: shareNum } : o
                                    );
                                    if (!newOwners.find(o => o.name === name) && tempMultiCheckedNames.has(name)) {
                                      newOwners.push({ name, share: shareNum });
                                    }
                                    setFormData({ ...formData, owners: newOwners });
                                  }}
                                  className={`w-20 px-2 py-1 text-sm border rounded text-right tabular-nums ${isChecked ? 'border-gray-300 dark:border-slate-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white' : 'border-gray-200 dark:border-slate-600 bg-gray-100 dark:bg-slate-700/30 text-gray-400'}`}
                                />
                                <span className="text-xs text-gray-500 dark:text-gray-400">%</span>
                              </div>
                              {isChecked && (
                                <div className="flex items-center gap-1 shrink-0">
                                  {editingOwner.oldName !== name && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingOwner({ oldName: name, newName: name });
                                      }}
                                      className="p-1 text-gray-400 hover:text-primary-500"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteOwnerGlobal(name);
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-500"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <div className="flex items-center gap-2 pt-1">
                          {!showMultiAdd ? (
                            <button
                              type="button"
                              onClick={() => {
                                setShowMultiAdd(true);
                                setMultiNewName('');
                              }}
                              className="w-full px-3 py-2 text-sm text-primary-600 dark:text-primary-400 bg-white dark:bg-slate-800 rounded-lg border border-dashed border-primary-300 dark:border-primary-700 hover:bg-primary-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1"
                            >
                              <Plus className="w-4 h-4" />
                              新增所有者
                            </button>
                          ) : (
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="text"
                                value={multiNewName}
                                onChange={(e) => setMultiNewName(e.target.value)}
                                placeholder="输入姓名"
                                autoFocus
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-slate-500 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const trimmed = multiNewName.trim();
                                    if (trimmed) {
                                      const newExtra = Array.from(new Set([...(extraOwnerNames || []), trimmed]));
                                      setExtraOwnerNames(newExtra);
                                      const newChecked = new Set(tempMultiCheckedNames);
                                      newChecked.add(trimmed);
                                      const newOwners = [...(Array.isArray(formData.owners) ? formData.owners : []), { name: trimmed, share: 0 }];
                                      setTempMultiCheckedNames(newChecked);
                                      setFormData({ ...formData, owners: newOwners });
                                    }
                                    setShowMultiAdd(false);
                                    setMultiNewName('');
                                  }
                                  if (e.key === 'Escape') {
                                    setShowMultiAdd(false);
                                    setMultiNewName('');
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const trimmed = multiNewName.trim();
                                  if (trimmed) {
                                    const newExtra = Array.from(new Set([...(extraOwnerNames || []), trimmed]));
                                    setExtraOwnerNames(newExtra);
                                    const newChecked = new Set(tempMultiCheckedNames);
                                    newChecked.add(trimmed);
                                    const newOwners = [...(Array.isArray(formData.owners) ? formData.owners : []), { name: trimmed, share: 0 }];
                                    setTempMultiCheckedNames(newChecked);
                                    setFormData({ ...formData, owners: newOwners });
                                  }
                                  setShowMultiAdd(false);
                                  setMultiNewName('');
                                }}
                                className="px-2 py-1 text-xs rounded bg-primary-500 text-white hover:bg-primary-600 transition-colors shrink-0"
                              >
                                保存
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="mt-3 pt-2 border-t border-gray-200 dark:border-slate-600 flex items-center justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        合计占比：
                        <span className={`font-semibold tabular-nums ${Math.abs((Array.isArray(formData.owners) ? formData.owners.reduce((s, o) => s + (parseFloat(o.share) || 0), 0) : 0) - 100) > 0.01 ? 'text-red-500' : 'text-green-600'}`}>
                          {(Array.isArray(formData.owners) ? formData.owners.reduce((s, o) => s + (parseFloat(o.share) || 0), 0) : 0).toFixed(2)}%
                        </span>
                        / 100%
                      </span>
                    </div>
                    {Math.abs((Array.isArray(formData.owners) ? formData.owners.reduce((s, o) => s + (parseFloat(o.share) || 0), 0) : 0) - 100) > 0.01 && (
                      <div className="mt-1">
                        <span className="text-red-500 text-xs">
                          警告：当前合计 {(Array.isArray(formData.owners) ? formData.owners.reduce((s, o) => s + (parseFloat(o.share) || 0), 0) : 0).toFixed(2)}%，建议调整为 100%
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    类型
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTypeDropdown(!showTypeDropdown);
                      setShowCategoryDropdown(false);
                      setShowSubDropdown(false);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-left flex items-center justify-between hover:border-primary-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <span className="truncate">{formData.type || '独立资产'}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showTypeDropdown && (
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      onClick={(e) => e.stopPropagation()}>
                      {accountTypesList.map(t => (
                        <div key={t} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-600">
                          {editingTypeName.oldName === t ? (
                            <input
                              type="text"
                              value={editingTypeName.newName}
                              onChange={(e) => setEditingTypeName({ ...editingTypeName, newName: e.target.value })}
                              autoFocus
                              className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-slate-500 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEditTypeInModal();
                                if (e.key === 'Escape') setEditingTypeName({ oldName: '', newName: '' });
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (t !== '理财资产') {
                                  setFormData({ ...formData, type: t, financeMarket: '' });
                                } else {
                                  setFormData({ ...formData, type: t });
                                }
                                setShowTypeDropdown(false);
                              }}
                              className={`flex-1 text-left text-sm ${formData.type === t ? 'text-primary-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                            >
                              {t}
                            </button>
                          )}
                          {editingTypeName.oldName === t ? (
                            <button
                              type="button"
                              onClick={handleEditTypeInModal}
                              className="p-1 text-green-500 hover:text-green-600"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          ) : defaultAccountTypes.includes(t) ? (
                            <span className="text-xs text-gray-400">内置</span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTypeName({ oldName: t, newName: t });
                                }}
                                className="p-1 text-gray-400 hover:text-primary-500"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTypeInModal(t);
                                }}
                                className="p-1 text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      <div className="border-t border-gray-100 dark:border-slate-600">
                        {addingType ? (
                          <div className="flex items-center gap-2 px-3 py-2">
                            <input
                              type="text"
                              value={newTypeName}
                              onChange={(e) => setNewTypeName(e.target.value)}
                              placeholder="输入类型名称"
                              autoFocus
                              className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-slate-500 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddTypeInModal();
                                if (e.key === 'Escape') { setAddingType(false); setNewTypeName(''); }
                              }}
                            />
                            <button
                              type="button"
                              onClick={handleAddTypeInModal}
                              className="px-2 py-1 text-xs rounded bg-primary-500 text-white hover:bg-primary-600"
                            >
                              添加
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setAddingType(true); setNewTypeName(''); }}
                            className="w-full px-3 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-slate-600 flex items-center justify-center gap-1"
                          >
                            <Plus className="w-4 h-4" />
                            添加类型
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {formData.type === '理财资产' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      市场
                    </label>
                    <select
                      value={formData.financeMarket || ''}
                      onChange={(e) => {
                        const market = e.target.value;
                        let currency = formData.currency;
                        if (market === '国内资产') currency = 'CNY';
                        else if (market === '港股资产') currency = 'HKD';
                        else if (market === '美股资产') currency = 'USD';
                        setFormData({ ...formData, financeMarket: market, currency });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">请选择市场</option>
                      <option value="国内资产">国内资产</option>
                      <option value="港股资产">港股资产</option>
                      <option value="美股资产">美股资产</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formData.name.trim()}
                  className="px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}

        {showCategoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">分类管理</h3>
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ name: e.target.value })}
                  placeholder="输入新大类名称"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  onClick={handleAddCategory}
                  disabled={!categoryForm.name.trim() || accountCatConfig[categoryForm.name]}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FolderPlus className="w-4 h-4" />
                  添加大类
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4">
                {Object.entries(accountCatConfig).map(([mainCategory, subs]) => (
                  <div key={mainCategory} className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-gray-900 dark:text-white">{mainCategory}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingSubCategory({ main: mainCategory, index: -1, name: '' });
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          添加类名
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(mainCategory)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                        >
                          <FolderMinus className="w-3 h-3" />
                          删除
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {subs.map((subName, index) => (
                        <div key={index} className="flex items-center gap-1 bg-white dark:bg-slate-600 rounded-lg px-3 py-1.5 border border-gray-200 dark:border-slate-500">
                          {editingSubCategory.main === mainCategory && editingSubCategory.index === index ? (
                            <input
                              type="text"
                              value={editingSubCategory.name}
                              onChange={(e) => setEditingSubCategory({ ...editingSubCategory, name: e.target.value })}
                              autoFocus
                              className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-slate-500 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveSubCategory();
                                if (e.key === 'Escape') setEditingSubCategory({ main: '', index: -1, name: '' });
                              }}
                            />
                          ) : (
                            <span className="text-sm text-gray-700 dark:text-gray-300">{subName}</span>
                          )}
                          {editingSubCategory.main === mainCategory && editingSubCategory.index === index ? (
                            <button
                              onClick={handleSaveSubCategory}
                              className="p-1 text-green-500 hover:text-green-600"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditSubCategory(mainCategory, index, subName)}
                                className="p-1 text-gray-400 hover:text-primary-500"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteSubCategory(mainCategory, index)}
                                className="p-1 text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                    {editingSubCategory.main === mainCategory && editingSubCategory.index === -1 && (
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingSubCategory.name}
                          onChange={(e) => setEditingSubCategory({ ...editingSubCategory, name: e.target.value })}
                          placeholder="输入类名"
                          autoFocus
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-slate-500 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddSubCategory(mainCategory);
                            }
                            if (e.key === 'Escape') {
                              setEditingSubCategory({ main: '', index: -1, name: '' });
                            }
                          }}
                        />
                        <button
                          onClick={() => handleAddSubCategory(mainCategory)}
                          className="px-3 py-1 text-xs rounded bg-primary-500 text-white hover:bg-primary-600"
                        >
                          添加
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
