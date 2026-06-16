const modules = [
  ["overview", "资产总览", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'],
  ["records", "收支分析", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>'],
  ["finance", "理财模块", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>'],
  ["debts", "债务模块", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>'],
  ["classes", "资产分类", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>'],
  ["analysis", "统计分析", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>'],
  ["tools", "辅助工具", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'],
  ["strategies", "业务设计", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'],
  ["accounts", "账户管理", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'],
];

const fixedAssetClassNames = {
  equity: "权益类",
  commodity: "商品类",
  debt: "债权类",
  cashClass: "现金类",
};

const today = new Date().toISOString().slice(0, 10);
const API_BASE = ["127.0.0.1", "localhost"].includes(window.location.hostname)
  ? "http://127.0.0.1:3000/api"
  : "/api";
let legacyStatePending = Boolean(localStorage.getItem("asset-platform-v18")) && !localStorage.getItem("asset-platform-token");
const seed = {
  user: {
    name: "演示用户",
    account: "demo",
    phone: "13888888888",
    email: "demo@example.com",
    currency: "CNY",
    theme: "light",
    avatar: "",
    birthday: "1992-05-18",
    city: "上海",
    occupation: "产品经理",
    riskLevel: "稳健型",
    privacyLock: "已开启",
    dataMask: "已开启",
    deviceName: "PC / APP / 小程序",
  },
  rates: { CNY: 1, CNH: 1, USD: 7.22, HKD: 0.92, EUR: 7.82, JPY: 0.046, GBP: 9.18 },
  accounts: [
    { id: "cash", name: "招商储蓄卡", owner: "本人", currency: "CNY", type: "现金账户", balance: 128000, liability: 0, enabled: true, default: true },
    { id: "broker", name: "证券账户", owner: "本人", currency: "CNY", type: "投资账户", balance: 268000, liability: 0, enabled: true },
    { id: "usd", name: "美元现金账户", owner: "本人", currency: "USD", type: "外币账户", balance: 8200, liability: 0, enabled: true },
    { id: "mortgage", name: "房贷账户", owner: "家庭", currency: "CNY", type: "负债账户", balance: 0, liability: 520000, enabled: true },
  ],
  assetClasses: [
    { id: "cashClass", name: "现金类", children: ["活期", "货币基金"], visible: true, value: 1641827, openingValue: 1200000, targetValue: 12000000, income: 36300, expense: 28200, laborIncome: 106300, color: "#10b981" },
    { id: "equity", name: "权益类", children: ["股票", "基金"], visible: true, value: 1276482, openingValue: 900000, targetValue: 18000000, income: 172419, expense: 4600, laborIncome: 0, color: "#6366f1" },
    { id: "debt", name: "债权类", children: ["债券", "定期"], visible: true, value: 202912, openingValue: 180000, targetValue: 8000000, income: 12600, expense: 18000, laborIncome: 0, color: "#f59e0b" },
    { id: "commodity", name: "商品类", children: ["黄金"], visible: true, value: 74375, openingValue: 62000, targetValue: 5000000, income: 6800, expense: 0, laborIncome: 0, color: "#8b5cf6" },
    { id: "crypto", name: "加密类", children: ["BTC", "ETH"], visible: true, value: 364227.7, openingValue: 110000, targetValue: 7000000, income: 27400, expense: 0, laborIncome: 0, color: "#f97316" },
    { id: "incomeClass", name: "吃息类", children: ["红利股票", "债券基金", "股息"], visible: true, value: 0, openingValue: 0, targetValue: 3000000, income: 0, expense: 0, laborIncome: 0, color: "#06b6d4" },
  ],
  records: [
    { id: 1, type: "income", category: "劳动收入", sub: "工资", amount: 36000, currency: "CNY", accountId: "cash", date: "2026-01-15", note: "工资收入" },
    { id: 2, type: "income", category: "理财收入", sub: "基金", amount: 12600, currency: "CNY", accountId: "broker", date: "2026-02-20", note: "基金赎回收益" },
    { id: 3, type: "expense", category: "生活消费", sub: "餐饮购物", amount: 8200, currency: "CNY", accountId: "cash", date: "2026-03-02", note: "家庭消费" },
    { id: 4, type: "expense", category: "偿债支出", sub: "房贷", amount: 18000, currency: "CNY", accountId: "mortgage", date: "2026-04-05", note: "含利息 6400" },
    { id: 5, type: "expense", category: "理财亏损", sub: "股票亏损", amount: 4600, currency: "CNY", accountId: "broker", date: "2026-04-18", note: "调仓损耗" },
    { id: 6, type: "transfer", category: "跨币种转账", sub: "USD", amount: 2000, currency: "USD", accountId: "usd", date: "2026-05-08", note: "记录汇率 7.22" },
  ],
  budgets: [
    { id: "b1", name: "月度总预算", category: "全部支出", amount: 18000, used: 13200 },
    { id: "b2", name: "生活消费", category: "生活消费", amount: 9000, used: 8200 },
    { id: "b3", name: "理财亏损", category: "理财亏损", amount: 6000, used: 4600 },
  ],
  financeAssets: [
    { id: 1, kind: "fund", accountId: "broker", category: "权益类", market: "domestic", name: "沪深300ETF", code: "510300", costPrice: 3.82, shares: 12000, pnl: 3200 },
    { id: 2, kind: "stock", accountId: "broker", category: "权益类", market: "domestic", name: "招商银行", code: "600036", costPrice: 34.5, shares: 1000, pnl: -1800 },
    { id: 3, kind: "custom", accountId: "cash", category: "商品类", market: "domestic", name: "黄金定投", code: "AU", costPrice: 520, shares: 80, pnl: 2200 },
  ],
  customCategories: { records: { income: [], expense: [], transfer: [] }, finance: [] },
  feeConfig: {
    stampDutyRate: 0.05,       // 印花税率 (%)，卖出时收取
    commissionRate: 0.025,     // 佣金费率 (%)，含净佣金+手续费+证管费
    commissionMin: 5,          // 佣金最低收费 (元)
    transferFeeRateSH: 0.001,  // 沪市过户费率 (%)
    transferFeeRateSZ: 0,      // 深市过户费率 (%)，已含在佣金内
    dividendTaxRate: 0,        // 股息红利税率 (%)
  },
  overviewGoals: {
    overall: 53000000,
    thisYear: 4000000,
    annualizedRate: 15,
  },
  recordTags: { tagsByCategory: {}, lastByCategory: {} },
  recorders: [],
  reminders: [
    { date: "2026-06-01", title: "房贷还款提醒", type: "还款" },
    { date: "2026-06-15", title: "指数基金定投", type: "定投" },
    { date: "2026-07-01", title: "定期理财到期", type: "到期" },
  ],
  debts: [
    { id: 1, category: "payable", type: "借入", name: "房贷账户", principal: 520000, annualRate: 4.2, amount: 552760, note: "家庭住房贷款", attachment: "", startDate: "2026-01-01", dueDate: "2026-12-31", repaymentMethod: "equalPrincipalInterest" },
    { id: 2, category: "receivable", type: "借出", name: "朋友周转", principal: 12000, annualRate: 3.6, amount: 12432, note: "短期借款", attachment: "", startDate: "2026-03-10", dueDate: "2026-09-10", repaymentMethod: "equalPrincipalEqualInterest" },
  ],
  strategies: Array.from({ length: 9 }, (_, index) => ({
    id: index + 1,
    name: `方案 ${index + 1}`,
    active: index === 0,
    target: index === 0 ? "稳健增值" : "待设计",
    allocation: [35, 40, 20, 5],
    debtLimit: 45 - index,
    annualReturn: 6 + index * 0.4,
    risk: index < 3 ? "低回撤" : index < 6 ? "均衡" : "进取",
  })),
};

let state = loadState();
let auth = loadAuth();
let stateSaveTimer = null;
let stateSaveInFlight = Promise.resolve();
let authMode = "login";
let authLoginMethod = "account";
let currentModule = "overview";
let ledgerPeriodMode = "month";
let ledgerPeriod = `month-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
let ledgerDayDate = formatDate(new Date());
let ledgerCalendarMonth = ledgerDayDate.slice(0, 7);
let ledgerTrendMode = "expense";
let financeAnalysisScope = "all";
let financeAnalysisSelection = "all";
let financeAnalysisMetric = "profit";
let financeAnalysisPeriod = "day";
let financeCalendarMode = "day";
let financeCalendarValue = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
let financeCalendarMetric = "amount";
let financeStockFilters = {
  query: "",
  kind: "all",
  category: "all",
  subcategory: "all",
  tertiaryCategory: "all",
  positionGroup: "all",
  positionCategory: "all",
  market: "all",
  currency: "all",
  accountId: "all",
};

// ── 股票列表列配置 ──
const STOCK_COLUMN_DEFS = [
  { key: "name", label: "名称/市值", sortable: true, defaultVisible: true },
  { key: "code", label: "代码", sortable: true, defaultVisible: true },
  { key: "shares", label: "持仓/可用", sortable: true, defaultVisible: true },
  { key: "price", label: "现价/成本", sortable: true, defaultVisible: true },
  { key: "pnl", label: "持仓盈亏", sortable: true, defaultVisible: true },
  { key: "todayPnl", label: "当日盈亏", sortable: true, defaultVisible: true },
  { key: "positionWeight", label: "仓位", sortable: true, defaultVisible: true },
  { key: "category", label: "资产分类", sortable: true, defaultVisible: false },
  { key: "subcategory", label: "二级分类", sortable: true, defaultVisible: false },
  { key: "tertiaryCategory", label: "三级分类", sortable: true, defaultVisible: false },
  { key: "market", label: "市场", sortable: true, defaultVisible: false },
  { key: "currency", label: "货币", sortable: true, defaultVisible: false },
  { key: "account", label: "所属账户", sortable: true, defaultVisible: false },
  { key: "costPrice", label: "买入均价", sortable: true, defaultVisible: false },
  { key: "marketValue", label: "当前价值", sortable: true, defaultVisible: false },
  { key: "rmbValue", label: "折合RMB", sortable: true, defaultVisible: false },
  { key: "actions", label: "操作", sortable: false, defaultVisible: true },
];

let stockTableConfig = {
  columns: STOCK_COLUMN_DEFS.map((c) => c.key),
  visible: Object.fromEntries(STOCK_COLUMN_DEFS.map((c) => [c.key, c.defaultVisible])),
  sortKey: "",
  sortDir: "asc",
};
let pendingFinanceOcrTransactions = [];
let pendingFinanceOcrResult = null;
let pendingFinanceOcrAssets = [];
let pendingFinanceOcrRawText = "";
let pendingFinanceOcrUnassignedTransactions = [];
let pendingFinanceOcrFile = null;
let pendingFinanceOcrConfirmed = false;
let pendingTradeOcrTransactions = [];
let pendingTradeOcrAssetPatch = null;
let pendingTradeOcrAssetId = null;
let pendingTradeOcrFile = null;
let pendingTradeOcrPreviewUrl = "";
let analysisPeriodMode = "year";
let analysisPeriod = String(new Date().getFullYear());
let analysisShowTotalDebt = false;
// ── 实时行情 ──
let realtimeQuoteMap = {}; // code -> { price, changePct, changeAmt, prevClose, name }
let premiumRows = [];
let premiumLoading = false;
let premiumError = "";
let premiumLoadedAt = 0;
let premiumFetchedAt = "";
let premiumSource = "";
let premiumQuery = "";
let premiumRefreshTimer = null;
// Store custom dataType2 selections: { code: '商品' | '权益基金' }
let premiumDataType2Map = {};
// Store holdings data for premium table: { code: { amount: number, ratio: number, timestamp: number } }
let premiumHoldingsMap = {};
// New filter variables
let premiumType1Filter = "all"; // ETF, LOF, or all
let premiumDataType2Filter = "all"; // 权益基金, 商品, or all
let premiumArbitrageFilter = "all"; // yes, no, or all
let premiumTransferFilter = "all"; // must-sell, suggest-sell, can-sell, suggest-buy, strong-buy, or all
let premiumStatusFilter = "all"; // premium, discount, or all
let premiumQuickFilter = "all"; // all, premium, arbitrage, transfer, buy, holding - for quick filter from summary cards
let premiumSortField = "premiumRate"; // default sort by premiumRate
let premiumSortOrder = "desc"; // 'asc' or 'desc'
// Pagination state
let premiumPageSize = 100; // default 100 items per page
let premiumCurrentPage = 1; // current page number
let filters = {
  account: "all",
  periodPreset: "year",
  startDate: "",
  endDate: "",
  assetClass: "all",
  currency: state.user.currency,
};

function loadState() {
  const saved = localStorage.getItem("asset-platform-v18");
  return normalizeLoadedState(saved ? JSON.parse(saved) : structuredClone(seed));
}

function normalizeLoadedState(source) {
  const loaded = source || structuredClone(seed);
  loaded.user = { ...seed.user, ...loaded.user };
  loaded.assetClasses = normalizeAssetClasses(loaded.assetClasses);
  loaded.debts = loaded.debts || structuredClone(seed.debts);
  loaded.financeAssets = normalizeFinanceAssets(Array.isArray(loaded.financeAssets) ? loaded.financeAssets : structuredClone(seed.financeAssets), loaded.assetClasses);
  loaded.financeAssetDrafts = loaded.financeAssetDrafts || {};
  // 兼容旧版单草稿迁移
  if (loaded.financeAssetDraft && Object.keys(loaded.financeAssetDraft).length) {
    const oldKind = loaded.financeAssetDraft.kind || "stock";
    loaded.financeAssetDrafts[oldKind] = loaded.financeAssetDraft;
    delete loaded.financeAssetDraft;
  }
  loaded.feeConfig = { ...seed.feeConfig, ...(loaded.feeConfig || {}) };
  loaded.overviewGoals = { ...seed.overviewGoals, ...(loaded.overviewGoals || {}) };
  loaded.customCategories = normalizeCustomCategories(loaded.customCategories);
  loaded.recordTags = {
    tagsByCategory: { ...seed.recordTags.tagsByCategory, ...(loaded.recordTags?.tagsByCategory || {}) },
    lastByCategory: { ...seed.recordTags.lastByCategory, ...(loaded.recordTags?.lastByCategory || {}) },
  };
  loaded.recorders = Array.isArray(loaded.recorders) ? loaded.recorders : [];
  return loaded;
}

function normalizeCustomCategories(categories = {}) {
  const savedRecords = categories.records;
  const records = Array.isArray(savedRecords)
    ? { income: [], expense: savedRecords, transfer: [] }
    : { ...seed.customCategories.records, ...(savedRecords || {}) };
  const savedFinance = categories.finance;
  const finance = Array.isArray(savedFinance)
    ? { tertiaryByScope: {} }
    : { tertiaryByScope: {}, ...(savedFinance || {}) };
  finance.tertiaryByScope = finance.tertiaryByScope || {};
  return { ...seed.customCategories, ...categories, records, finance };
}

function normalizeAssetClasses(classes = []) {
  const baseById = new Map(seed.assetClasses.map((item) => [item.id, item]));
  const normalized = classes.map((item) => ({
    ...(baseById.get(item.id) || {}),
    ...item,
    name: fixedAssetClassNames[item.id] || item.name,
    expectedReturn: Number(item.expectedReturn) || 0,
  }));
  seed.assetClasses.forEach((item) => {
    if (!normalized.some((saved) => saved.id === item.id)) {
      normalized.push({ ...item, name: fixedAssetClassNames[item.id] || item.name, expectedReturn: 0 });
    }
  });
  return normalized;
}

function normalizeFinanceAssets(assets = [], classes = []) {
  const classNames = new Set(classes.map((item) => item.name));
  return assets.map((item) => {
    const kind = normalizeFinanceKind(item.kind);
    const market = item.market === "overseas" || ["HK", "US"].includes(item.market) ? "overseas" : "domestic";
    const currency = normalizeFinanceCurrency(item.currency, market);
    const category = classNames.has(item.category) ? item.category : inferFinanceAssetClass(kind);
    const subcategoryOptions = financeSubcategoryOptions(kind);
    const subcategory = subcategoryOptions.includes(item.subcategory) ? item.subcategory : subcategoryOptions[0];
    const positionGroup = normalizeFinancePositionGroup(item.positionGroup, kind);
    const positionOptions = financePositionCategoryOptions(kind, positionGroup);
    const savedPositionCategory = item.positionCategory === "持续股票" ? "吃息股票" : item.positionCategory;
    const positionCategory = positionOptions.includes(savedPositionCategory) ? savedPositionCategory : positionOptions[0];
    return { ...item, kind, market, currency, category, subcategory, tertiaryCategory: item.tertiaryCategory || "未分类", positionGroup, positionCategory, transactions: Array.isArray(item.transactions) ? item.transactions : [] };
  });
}

function normalizeFinanceKind(kind) {
  return ["stock", "fund", "commodity", "futures", "options", "crypto", "cashflow", "custom"].includes(kind) ? kind : "custom";
}

function inferFinanceAssetClass(kind) {
  return ({ stock: "权益类", fund: "权益类", commodity: "商品类", futures: "商品类", options: "权益类", crypto: "加密类", cashflow: "现金类", custom: "现金类" })[kind] || "现金类";
}

function saveState() {
  localStorage.setItem("asset-platform-v18", JSON.stringify(state));
  if (!isAuthenticated()) return;
  clearTimeout(stateSaveTimer);
  stateSaveTimer = setTimeout(() => {
    const snapshot = structuredClone(state);
    stateSaveInFlight = stateSaveInFlight
      .catch(() => {})
      .then(() => apiRequest("/state", { method: "PUT", body: { state: snapshot } }))
      .catch((error) => {
        console.error("数据库保存失败", error);
        showSyncStatus("数据暂未同步到服务器");
      });
  }, 180);
}

function financeAssetClassValue(className) {
  return (state.financeAssets || [])
    .filter((asset) => asset.category === className)
    .reduce((sum, asset) => sum + financeAssetValueRmb(asset), 0);
}

function syncAssetClassValuesFromFinance() {
  state.assetClasses.forEach((item) => {
    item.value = financeAssetClassValue(item.name);
  });
}

function loadAuth() {
  const token = localStorage.getItem("asset-platform-token") || "";
  const account = localStorage.getItem("asset-platform-account") || "";
  return {
    token,
    currentUser: account,
    users: account ? [{ account, profile: { ...seed.user, account } }] : [],
  };
}

function saveAuth() {
  if (auth.token) localStorage.setItem("asset-platform-token", auth.token);
  else localStorage.removeItem("asset-platform-token");
  if (auth.currentUser) localStorage.setItem("asset-platform-account", auth.currentUser);
  else localStorage.removeItem("asset-platform-account");
  localStorage.removeItem("asset-platform-auth-v1");
}

function isAuthenticated() {
  return Boolean(auth.currentUser && auth.token);
}

function syncUserFromAuth() {
  const user = auth.users.find((item) => item.account === auth.currentUser);
  if (!user) return;
  state.user = { ...state.user, ...user.profile, account: user.account };
  filters.currency = state.user.currency;
  saveState();
}

function saveProfileToAuth() {
  const user = auth.users.find((item) => item.account === auth.currentUser);
  if (!user) return;
  user.profile = { ...state.user };
  saveAuth();
}

async function apiRequest(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/login") {
      auth = { token: "", currentUser: "", users: [] };
      saveAuth();
    }
    throw new Error(payload.message || "服务器请求失败");
  }
  return payload;
}

async function bootstrapSession() {
  if (!auth.token) return;
  try {
    const [{ user }, stateResponse] = await Promise.all([
      apiRequest("/auth/me"),
      apiRequest("/state"),
    ]);
    auth.currentUser = user.account;
    auth.users = [{ account: user.account, profile: user }];
    state = normalizeLoadedState(stateResponse.state);
    localStorage.setItem("asset-platform-v18", JSON.stringify(state));
    saveAuth();
  } catch (error) {
    console.warn("登录会话恢复失败", error);
    auth = { token: "", currentUser: "", users: [] };
    state = normalizeLoadedState(structuredClone(seed));
    saveAuth();
  }
}

function showSyncStatus(message) {
  const status = document.querySelector("#syncStatus");
  if (status) status.textContent = message;
}

function money(value, currency = filters.currency) {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency, maximumFractionDigits: 0 }).format(value || 0);
}

function compactMoney(value, currency = filters.currency) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);
}

function percent(value) {
  return `${((value || 0) * 100).toFixed(2)}%`;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeek(date) {
  const day = date.getDay() || 7;
  const result = new Date(date);
  result.setDate(date.getDate() - day + 1);
  return result;
}

function presetRange(preset) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const ranges = {
    today: [now, now],
    week: [startOfWeek(now), now],
    month: [new Date(year, month, 1), now],
    year: [new Date(year, 0, 1), now],
    lastMonth: [new Date(year, month - 1, 1), new Date(year, month, 0)],
    all: ["", ""],
  };
  return ranges[preset] || [filters.startDate ? new Date(filters.startDate) : "", filters.endDate ? new Date(filters.endDate) : ""];
}

function syncDateRangeFromPreset() {
  if (filters.periodPreset === "custom") return;
  const [start, end] = presetRange(filters.periodPreset);
  filters.startDate = start ? formatDate(start) : "";
  filters.endDate = end ? formatDate(end) : "";
}

function convert(amount, from, to = filters.currency) {
  const cny = amount * (state.rates[from] || 1);
  return cny / (state.rates[to] || 1);
}

function filteredRecords() {
  const start = filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : null;
  const end = filters.endDate ? new Date(`${filters.endDate}T23:59:59`) : null;
  return state.records.filter((r) => {
    if (filters.account !== "all" && r.accountId !== filters.account) return false;
    const d = new Date(r.date);
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
}

function compute() {
  const accounts = state.accounts.filter((a) => a.enabled && (filters.account === "all" || a.id === filters.account));
  const records = filteredRecords();
  const totalAssets = accounts.reduce((sum, a) => sum + convert(a.balance, a.currency), 0);
  const totalLiabilities = accounts.reduce((sum, a) => sum + convert(a.liability, a.currency), 0);
  const income = records.filter((r) => r.type === "income").reduce((sum, r) => sum + convert(r.amount, r.currency), 0);
  const expense = records.filter((r) => r.type === "expense").reduce((sum, r) => sum + convert(r.amount, r.currency), 0);
  const laborIncome = sumCategory(records, "劳动收入", "income");
  const lifeExpense = sumCategory(records, "生活消费", "expense");
  const debtExpense = sumCategory(records, "偿债支出", "expense");
  const otherExpense = sumCategory(records, "其他支出", "expense");
  const investIncome = sumCategory(records, "理财收入", "income");
  const investLoss = sumCategory(records, "理财亏损", "expense");
  const debtStart = 560000 / (state.rates[filters.currency] || 1);
  const debtChange = totalLiabilities - debtStart;
  const laborNet = laborIncome - lifeExpense - debtExpense - otherExpense;
  const investNet = investIncome - investLoss;
  const debtContribution = -debtChange;
  const annualGrowth = laborNet + investNet + debtContribution;
  const initialAssets = 360000 / (state.rates[filters.currency] || 1);
  const analysisStats = annualAnalysisStats();

  return {
    accounts,
    records,
    totalAssets,
    totalLiabilities,
    netAssets: totalAssets - totalLiabilities,
    income,
    expense,
    balance: income - expense,
    laborNet,
    investNet,
    debtContribution,
    annualGrowth,
    initialAssets,
    laborRate: laborNet / initialAssets,
    investRate: investNet / initialAssets,
    debtRate: debtContribution / initialAssets,
    totalRate: annualGrowth / initialAssets,
    debtCost: debtExpense * 0.36,
    avgDebtRate: debtExpense ? (debtExpense * 0.36) / ((debtStart + totalLiabilities) / 2) : 0,
    analysisStats,
  };
}

function annualAnalysisStats() {
  const now = new Date();
  const year = now.getFullYear();
  const yearRecords = state.records.filter((record) => new Date(`${record.date}T00:00:00`).getFullYear() === year);
  const ledgerRecords = yearRecords.filter((record) => !isFinanceRecord(record));
  const ledgerIncome = ledgerRecords
    .filter((record) => record.type === "income")
    .reduce((sum, record) => sum + convert(record.amount, record.currency), 0);
  const consumption = ledgerRecords
    .filter((record) => record.type === "expense")
    .reduce((sum, record) => sum + convert(record.amount, record.currency), 0);
  const laborIncome = ledgerRecords
    .filter((record) => record.type === "income" && record.category === "劳动收入")
    .reduce((sum, record) => sum + convert(record.amount, record.currency), 0);
  const ledgerBalance = ledgerIncome - consumption;
  const financeIncome = financeProfitAmountForYear(state.financeAssets || [], year, now);
  const payableDebt = (state.debts || [])
    .filter((debt) => debt.category === "payable")
    .reduce((sum, debt) => sum + Math.max(Number(debt.amount) || Number(debt.principal) || 0, 0), 0);
  const annualNetGrowth = ledgerBalance + financeIncome - payableDebt;
  return {
    year,
    ledgerIncome,
    laborIncome,
    consumption,
    ledgerBalance,
    financeIncome,
    payableDebt,
    annualNetGrowth,
  };
}

function financeProfitAmountForYear(assets, year, throughDate = new Date()) {
  const lastDate = year === throughDate.getFullYear() ? throughDate : new Date(year, 11, 31);
  const cursor = new Date(year, 0, 1);
  const currentYear = throughDate.getFullYear();
  const activeFrom = new Map(assets.map((asset) => {
    const dates = (asset.transactions || []).map((transaction) => transaction.date).filter(Boolean).sort();
    return [asset.id, dates[0] ? new Date(`${dates[0]}T00:00:00`) : new Date(currentYear, 0, 1)];
  }));
  let total = 0;
  while (cursor <= lastDate) {
    total += assets.reduce((sum, asset) => cursor >= activeFrom.get(asset.id) ? sum + financeAssetDailyProfit(asset, cursor) : sum, 0);
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}

function monthlySeries() {
  const year = new Date().getFullYear();
  const months = Array.from({ length: 12 }, (_, index) => ({
    label: `${year}年${index + 1}月`,
    shortLabel: `${index + 1}月`,
    income: 0,
    expense: 0,
    growth: 0,
    yoy: 0,
  }));
  const lastYearBase = [18000, 22000, 26000, 21000, 28000, 32000, 30000, 36000, 34000, 39000, 42000, 46000];

  state.records.forEach((record) => {
    const date = new Date(record.date);
    if (date.getFullYear() !== year || record.type === "transfer") return;
    const item = months[date.getMonth()];
    const value = convert(record.amount, record.currency);
    if (record.type === "income") item.income += value;
    if (record.type === "expense") item.expense += value;
  });

  months.forEach((item, index) => {
    const liabilityDrop = index < 5 ? 8000 : 0;
    item.growth = item.income - item.expense + liabilityDrop;
    item.yoy = lastYearBase[index] ? (item.growth - lastYearBase[index]) / lastYearBase[index] : 0;
  });

  return months;
}

function dailyCalendarSeries() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const cells = Array.from({ length: firstDay }, () => null);

  for (let day = 1; day <= days; day += 1) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const records = state.records.filter((record) => record.date === key);
    const income = records.filter((record) => record.type === "income").reduce((sum, record) => sum + convert(record.amount, record.currency), 0);
    const expense = records.filter((record) => record.type === "expense").reduce((sum, record) => sum + convert(record.amount, record.currency), 0);
    cells.push({ day, income, expense, growth: income - expense });
  }

  return cells;
}

function backtestModel() {
  const principal = 100000;
  const monthlyInvest = 3000;
  const annualReturn = 0.072;
  const maxDrawdown = 0.118;
  const months = 36;
  const monthlyRate = annualReturn / 12;
  let value = principal;
  const series = [];

  for (let index = 1; index <= months; index += 1) {
    value = value * (1 + monthlyRate) + monthlyInvest;
    if (index === 18) value *= 1 - maxDrawdown;
    series.push({ month: index, value });
  }

  const invested = principal + monthlyInvest * months;
  const finalValue = series.at(-1).value;
  return {
    principal,
    monthlyInvest,
    annualReturn,
    maxDrawdown,
    months,
    invested,
    finalValue,
    profit: finalValue - invested,
    annualized: Math.pow(finalValue / invested, 12 / months) - 1,
    winRate: 0.64,
    series,
  };
}

function sumCategory(records, category, type) {
  return records.filter((r) => r.category === category && (!type || r.type === type)).reduce((sum, r) => sum + convert(r.amount, r.currency), 0);
}

async function init() {
  await bootstrapSession();
  syncUserFromAuth();
  syncDateRangeFromPreset();
  loadPremiumHoldingsData(); // Load saved holdings data
  document.body.classList.toggle("dark", state.user.theme === "dark");
  renderNav();
  renderFilters();
  bindGlobalActions();
  initDialogCloseButtons();
  render();
  if (currentModule === "finance") fetchRealtimeQuotes();
  startQuoteAutoRefresh();
}

// ── 理财行情自动刷新定时器 ──
let quoteAutoTimer = null;
function startQuoteAutoRefresh() {
  stopQuoteAutoRefresh();
  quoteAutoTimer = setInterval(() => {
    if (currentModule === "finance") fetchRealtimeQuotes();
  }, 300000); // 5 分钟
}
function stopQuoteAutoRefresh() {
  if (quoteAutoTimer) { clearInterval(quoteAutoTimer); quoteAutoTimer = null; }
}

// ── 所有弹窗右上角添加关闭按钮 ──
function initDialogCloseButtons() {
  document.querySelectorAll("dialog").forEach((dialog) => {
    if (dialog.querySelector(".dialog-close-btn")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dialog-close-btn";
    btn.innerHTML = "×";
    btn.title = "关闭";
    btn.addEventListener("click", () => dialog.close());
    dialog.style.position || (dialog.style.position = "relative");
    dialog.prepend(btn);
  });
}

function renderNav() {
  const nav = document.querySelector("#moduleNav");
  nav.innerHTML = modules.map(([id, name, icon]) => `<button data-module="${id}" class="${id === currentModule ? "active" : ""}"><span class="nav-icon">${icon}</span><span class="nav-label">${name}</span></button>`).join("");
  const bottomNav = document.querySelector("#mobileBottomNav");
  if (bottomNav) {
    bottomNav.querySelectorAll("button[data-module]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.module === currentModule);
    });
  }
}

function renderUserEntry() {
  const entry = document.querySelector("#userEntry");
  if (!entry) return;
  entry.innerHTML = state.user.avatar
    ? `<img src="${state.user.avatar}" alt="头像" />`
    : `<span>${state.user.name.slice(0, 1)}</span>`;
  entry.title = isAuthenticated() ? "个人中心" : "登录 / 注册";
}

function renderFilters() {
  const accountFilter = document.querySelector("#accountFilter");
  accountFilter.innerHTML = `<option value="all">全部账户</option>${state.accounts.map((a) => `<option value="${a.id}">${a.name}</option>`).join("")}`;
  document.querySelector("#assetClassFilter").innerHTML = `<option value="all">全部大类</option>${state.assetClasses.map((c) => `<option value="${c.id}">${c.name}</option>`).join("")}`;
  document.querySelector("#currencyFilter").innerHTML = Object.keys(state.rates).map((c) => `<option value="${c}">${c}</option>`).join("");
  accountFilter.value = filters.account;
  document.querySelector("#periodPreset").value = filters.periodPreset;
  document.querySelector("#startDateFilter").value = filters.startDate;
  document.querySelector("#endDateFilter").value = filters.endDate;
  document.querySelector("#startDateFilter").disabled = filters.periodPreset !== "custom";
  document.querySelector("#endDateFilter").disabled = filters.periodPreset !== "custom";
  document.querySelector("#assetClassFilter").value = filters.assetClass;
  document.querySelector("#currencyFilter").value = filters.currency;

}

// Premium holdings data management functions (must be defined before init)
function savePremiumHoldingsData() {
  if (auth.currentUser) {
    localStorage.setItem(`premium_holdings_${auth.currentUser}`, JSON.stringify(premiumHoldingsMap));
  }
}

function loadPremiumHoldingsData() {
  if (auth.currentUser) {
    const saved = localStorage.getItem(`premium_holdings_${auth.currentUser}`);
    if (saved) {
      try {
        premiumHoldingsMap = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load premium holdings data:', e);
        premiumHoldingsMap = {};
      }
    }
  }
}

// Get color class for premium row based on holdings data (must be defined before premiumRow)
function getPremiumRowColorClass(amount, ratio) {
  if (amount === '' || amount === undefined || amount === null) {
    return ''; // White/default for empty/cleared position
  }
  
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) return '';
  
  if (numAmount > 0) {
    return 'premium-row-increased'; // Red for holding or adding position
  } else if (numAmount < 0) {
    return 'premium-row-decreased'; // Green for reducing position
  } else if (numAmount === 0 && ratio !== '' && ratio !== undefined) {
    return 'premium-row-unchanged'; // Yellow for unchanged/watching (position cleared but still watching)
  }
  
  return ''; // White for cleared position with no ratio
}

function premiumRowHasHolding(row) {
  const holdingsData = premiumHoldingsMap[row.code] || {};
  const amount = Number(holdingsData.amount);
  const ratio = Number(holdingsData.ratio);
  return Number.isFinite(amount) && Number.isFinite(ratio) && amount !== 0 && ratio !== 0;
}

function normalizePremiumHoldingCode(value = "") {
  return normalizeFinanceOcrCode(value)
    .replace(/\.(SH|SZ)$/i, "")
    .replace(/^SH|^SZ/i, "");
}

// Sync holdings data from finance assets (must be defined before loadPremiumMarket)
function syncHoldingsFromFinance() {
  const financeAssets = state.financeAssets || [];
  
  premiumRows.forEach((row) => {
    const normalizedRowCode = normalizePremiumHoldingCode(row.code);
    const currentHolding = premiumHoldingsMap[row.code] || {};
    const matchingAssets = financeAssets.filter((asset) =>
      normalizePremiumHoldingCode(asset.code) === normalizedRowCode
    );

    if (!matchingAssets.length) {
      if (currentHolding.autoSynced) {
        delete currentHolding.amount;
        delete currentHolding.ratio;
        delete currentHolding.autoSynced;
        delete currentHolding.timestamp;
        if (Object.keys(currentHolding).length) premiumHoldingsMap[row.code] = currentHolding;
        else delete premiumHoldingsMap[row.code];
      }
      return;
    }

    if (!premiumHoldingsMap[row.code]) {
      premiumHoldingsMap[row.code] = {};
    }

    const shouldSyncAmount = currentHolding.amount === undefined || currentHolding.autoSynced === true;
    if (shouldSyncAmount) {
      const marketValue = matchingAssets.reduce((sum, asset) => sum + financeAssetMarketValue(asset), 0);
      premiumHoldingsMap[row.code].amount = parseFloat(marketValue.toFixed(2));
      premiumHoldingsMap[row.code].autoSynced = true;
      premiumHoldingsMap[row.code].timestamp = Date.now();
    }
  });
  
  // Auto-calculate ratios after syncing amounts
  recalculateAllRatios();
  savePremiumHoldingsData();
}

// Recalculate all ratios based on total amount (must be defined before syncHoldingsFromFinance)
function recalculateAllRatios() {
  const filteredRows = getFilteredPremiumRows();
  const totalAmount = filteredRows.reduce((sum, row) => {
    const rowHoldings = premiumHoldingsMap[row.code];
    return sum + (rowHoldings && rowHoldings.amount ? rowHoldings.amount : 0);
  }, 0);
  
  if (totalAmount > 0) {
    filteredRows.forEach((row) => {
      const rowHoldings = premiumHoldingsMap[row.code];
      if (rowHoldings && rowHoldings.amount && rowHoldings.amount > 0) {
        rowHoldings.ratio = parseFloat(((rowHoldings.amount / totalAmount) * 100).toFixed(2));
      }
    });
  }
}

// Get filtered premium rows based on current filters (must be defined before recalculateAllRatios)
function getFilteredPremiumRows() {
  const query = premiumQuery.trim().toLowerCase();
  return premiumRows.filter((row) => {
    const dataType2 = premiumDataType2Map[row.code] || row.dataType2 || '其他国家标的';
    
    let matchesType1 = premiumType1Filter === "all" || row.type === premiumType1Filter;
    let matchesDataType2 = premiumDataType2Filter === "all" || dataType2 === premiumDataType2Filter;
    
    let matchesArbitrage = true;
    if (premiumArbitrageFilter === "yes") {
      matchesArbitrage = row.canArbitrage === true;
    } else if (premiumArbitrageFilter === "no") {
      matchesArbitrage = row.canArbitrage === false;
    }
    
    let matchesTransfer = true;
    if (premiumTransferFilter !== "all") {
      matchesTransfer = row.transferRecommend && row.transferRecommend.level === premiumTransferFilter;
    }
    
    let matchesStatus = true;
    if (premiumStatusFilter === "premium") {
      matchesStatus = row.status === "premium";
    } else if (premiumStatusFilter === "discount") {
      matchesStatus = row.status === "discount";
    }
    
    const matchesQuery = !query || 
      `${row.code} ${row.name} ${row.direction || ""} ${row.type} ${dataType2}`.toLowerCase().includes(query);
    
    return matchesType1 && matchesDataType2 && matchesArbitrage && matchesTransfer && matchesStatus && matchesQuery;
  });
}

function bindGlobalActions() {
  document.querySelector("#moduleNav").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-module]");
    if (!button) return;
    currentModule = button.dataset.module;
    document.querySelector(".shell").scrollTop = 0;
    const sb = document.querySelector("#sidebar");
    const ov = document.querySelector("#sidebarOverlay");
    if (sb) sb.classList.remove("is-open");
    if (ov) ov.classList.remove("is-open");
    render();
    if (currentModule === "finance") fetchRealtimeQuotes();
  });
  document.querySelector(".filters").addEventListener("change", () => {
    filters = {
      account: document.querySelector("#accountFilter").value,
      periodPreset: document.querySelector("#periodPreset").value,
      startDate: document.querySelector("#startDateFilter").value,
      endDate: document.querySelector("#endDateFilter").value,
      assetClass: document.querySelector("#assetClassFilter").value,
      currency: document.querySelector("#currencyFilter").value,
    };
    syncDateRangeFromPreset();
    state.user.currency = filters.currency;
    saveState();
    saveProfileToAuth();
    render();
  });
  document.querySelector("#startDateFilter").addEventListener("input", () => {
    document.querySelector("#periodPreset").value = "custom";
  });
  document.querySelector("#endDateFilter").addEventListener("input", () => {
    document.querySelector("#periodPreset").value = "custom";
  });
  document.querySelector("#themeToggle").addEventListener("click", () => {
    state.user.theme = state.user.theme === "dark" ? "light" : "dark";
    document.body.classList.toggle("dark", state.user.theme === "dark");
    saveState();
    saveProfileToAuth();
  });
  document.querySelector("#screenToggle").addEventListener("click", () => document.documentElement.requestFullscreen?.());
  const mobileMenuToggle = document.querySelector("#mobileMenuToggle");
  const sidebar = document.querySelector("#sidebar");
  const sidebarOverlay = document.querySelector("#sidebarOverlay");
  if (mobileMenuToggle && sidebar && sidebarOverlay) {
    mobileMenuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("is-open");
      sidebarOverlay.classList.toggle("is-open");
    });
    sidebarOverlay.addEventListener("click", () => {
      sidebar.classList.remove("is-open");
      sidebarOverlay.classList.remove("is-open");
    });
  }
  const bottomNav = document.querySelector("#mobileBottomNav");
  if (bottomNav) {
    bottomNav.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-module]");
      if (!button) return;
      currentModule = button.dataset.module;
      document.querySelector(".shell").scrollTop = 0;
      const sb = document.querySelector("#sidebar");
      const ov = document.querySelector("#sidebarOverlay");
      if (sb) sb.classList.remove("is-open");
      if (ov) ov.classList.remove("is-open");
      render();
      if (currentModule === "finance") fetchRealtimeQuotes();
    });
  }
  document.querySelector("#userEntry").addEventListener("click", () => {
    currentModule = "profile";
    document.querySelector(".shell").scrollTop = 0;
    render();
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action='new-record']");
    if (!button) return;
    event.preventDefault();
    openRecordDialog();
  });
  document.querySelector("#cancelRecord").addEventListener("click", () => document.querySelector("#recordDialog").close());
  document.querySelector("#cancelDebt").addEventListener("click", () => document.querySelector("#debtDialog").close());
  document.querySelector("#cancelAccount").addEventListener("click", () => document.querySelector("#accountDialog").close());
  document.querySelector("#cancelFeeDetail")?.addEventListener("click", () => document.querySelector("#feeDetailDialog").close());
  document.querySelector("#cancelFeeConfig")?.addEventListener("click", () => document.querySelector("#feeConfigDialog").close());
  document.querySelector("#feeConfigForm")?.addEventListener("submit", handleFeeConfigSubmit);
  
  // ─── Edit fee total dialog bindings ───
  document.querySelector("#cancelEditFeeTotal")?.addEventListener("click", () => document.querySelector("#editFeeTotalDialog").close());
  document.querySelector("#editFeeTotalForm")?.addEventListener("submit", handleEditFeeTotalSubmit);
  
  // ─── Holding detail dialog bindings ───
  document.querySelectorAll(".holding-tab").forEach((tab) => tab.addEventListener("click", () => {
    document.querySelectorAll(".holding-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const assetId = Number(document.querySelector("#holdingDetailDialog").dataset.assetId);
    renderHoldingTabContent(tab.dataset.tab, assetId);
  }));
  // ─── K-line chart dialog bindings ───
  document.querySelectorAll("#klineTimeTabs button").forEach((btn) => btn.addEventListener("click", () => switchKlineRange(btn.dataset.range)));
  document.querySelector("#klineChartDialog")?.addEventListener("close", () => {
    if (klineChartInstance) { klineChartInstance.dispose(); klineChartInstance = null; }
    if (klineResizeObserver) { klineResizeObserver.disconnect(); klineResizeObserver = null; }
  });
  document.querySelector("#cancelTradeRecord")?.addEventListener("click", () => document.querySelector("#tradeRecordDialog").close());
  document.querySelector("#tradeRecordForm")?.addEventListener("submit", handleTradeRecordSubmit);
  // Auto-calc amount when shares or price changes in trade form
  document.querySelector("#tradeRecordForm")?.addEventListener("input", (e) => {
    if (e.target.name === "shares" || e.target.name === "price") {
      const form = e.currentTarget;
      form.amount.value = ((Number(form.shares.value) || 0) * (Number(form.price.value) || 0)).toFixed(2);
    }
  });
  document.querySelector("#cancelAssetClass").addEventListener("click", () => document.querySelector("#assetClassDialog").close());
  document.querySelector("#cancelGoals").addEventListener("click", () => document.querySelector("#goalsDialog").close());
  document.querySelector("#cancelAnnualGoal").addEventListener("click", () => document.querySelector("#annualGoalDialog").close());
  document.querySelector("#annualGoalForm").addEventListener("submit", handleAnnualGoalSubmit);
  document.querySelector("#cancelFinanceAsset").addEventListener("click", () => document.querySelector("#financeAssetDialog").close());
  document.querySelector("#cancelFinanceTertiary").addEventListener("click", () => document.querySelector("#financeTertiaryDialog").close());
  document.querySelector("#cancelRecordOption").addEventListener("click", () => document.querySelector("#recordOptionDialog").close());
  document.querySelector("#recordForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const account = state.accounts.find((a) => a.id === data.accountId);
    const category = String(data.category || "").trim();
    if (!category) return;
    saveCustomRecordCategory(category, data.type);
    const tag = String(data.tag || "").trim();
    saveRecordTag(category, tag);
    const recorder = String(data.recorder || "").trim() || state.user.name || "本人";
    saveRecorder(recorder);
    const id = Number(data.recordId);
    const existing = state.records.find((record) => record.id === id);
    const createdDate = localDateString();
    const payload = {
      id: id || Date.now(),
      type: data.type,
      category,
      sub: "自定义",
      tag,
      amount: Number(data.amount),
      currency: account.currency,
      accountId: data.accountId,
      date: data.date,
      recorder,
      note: data.note || "手动记账",
      createdAt: existing?.createdAt || createdDate,
    };
    const index = state.records.findIndex((record) => record.id === id);
    if (index >= 0) {
      state.records[index] = payload;
    } else {
      state.records.unshift(payload);
    }
    saveState();
    document.querySelector("#recordDialog").close();
    render();
  });
  document.querySelector("#debtForm").addEventListener("input", updateDebtPreview);
  document.querySelector("#debtForm").addEventListener("change", updateDebtPreview);
  document.querySelector("#debtForm").addEventListener("submit", handleDebtSubmit);
  document.querySelector("#accountForm").addEventListener("submit", handleAccountSubmit);
  document.querySelector("#assetClassForm").addEventListener("submit", handleAssetClassSubmit);
  document.querySelector("#financeAssetForm").addEventListener("submit", handleFinanceAssetSubmit);
  document.querySelector("#financeAssetForm").addEventListener("input", handleFinanceAssetFormChange);
  document.querySelector("#financeAssetForm").addEventListener("change", handleFinanceAssetFormChange);
  document.querySelector("#financeAssetForm [name='kind']").addEventListener("change", handleFinanceKindChange);
  document.querySelector("#financeAssetForm [name='market']").addEventListener("change", () => updateFinanceCurrencyOptions());
  document.querySelector("#financeAssetForm [name='currency']").addEventListener("change", handleFinanceCurrencyChange);
  document.querySelector("#financeAssetForm [name='subcategory']").addEventListener("change", () => updateFinanceTertiaryCategories());
  document.querySelector("#financeAssetForm [name='positionGroup']").addEventListener("change", () => updateFinancePositionCategories());
  document.querySelector("#financeAssetForm [name='assetImage']").addEventListener("change", handleFinanceImageSelection);
  document.querySelector(".finance-ocr-panel")?.addEventListener("paste", handleFinanceOcrPaste);
  
  // ─── 平台选择联动逻辑 ───
  const platformRegion = document.querySelector("#ocrPlatformRegion");
  const platformType = document.querySelector("#ocrPlatformType");
  const platformName = document.querySelector("#ocrPlatformName");
  
  // 平台配置
  const PLATFORM_OPTIONS = {
    domestic: {
      broker: ["同花顺", "东方财富", "华泰证券", "中信证券", "国泰君安", "招商证券", "广发证券", "海通证券"],
      bank: ["工商银行", "建设银行", "农业银行", "中国银行", "招商银行", "交通银行"],
      fund: ["天天基金", "蚂蚁财富", "京东金融", "陆金所"],
    },
    overseas: {
      broker: ["富途牛牛", "老虎证券", "雪盈证券", "华盛通", "长桥证券"],
      bank: ["汇丰银行", "渣打银行", "花旗银行", "摩根大通"],
      fund: ["Vanguard", "Fidelity", "Charles Schwab"],
    },
  };
  
  function updatePlatformOptions() {
    const region = platformRegion?.value || "domestic";
    const type = platformType?.value || "broker";
    const options = PLATFORM_OPTIONS[region]?.[type] || [];
    
    if (platformName) {
      platformName.innerHTML = `<option value="">请选择平台</option>` + 
        options.map(opt => `<option value="${opt}">${opt}</option>`).join("");
    }
  }
  
  platformRegion?.addEventListener("change", updatePlatformOptions);
  platformType?.addEventListener("change", updatePlatformOptions);
  // 初始化
  updatePlatformOptions();
  
  document.querySelector("#financeOcrTransactions")?.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    const action = target?.dataset.action;
    if (action === "confirm-finance-ocr") confirmFinanceOcrResult();
    if (action === "discard-finance-ocr") discardFinanceOcrResult();
    if (action === "remove-finance-ocr-asset") {
      const index = Number(target.dataset.index);
      pendingFinanceOcrAssets.splice(index, 1);
      renderFinanceOcrResultPreview();
    }
    if (action === "select-security-candidate") {
      const index = Number(target.dataset.index);
      openSecurityCandidateDialog(index);
    }
  });
  document.querySelector("#financeOcrTransactions")?.addEventListener("input", handleFinanceOcrPreviewInput);
  document.querySelector("#financeOcrTransactions")?.addEventListener("change", handleFinanceOcrPreviewChange);
  // Finance code lookup autocomplete
  {
    const codeInput = document.querySelector("#financeAssetForm [name='code']");
    let lookupTimer = null;
    let lookupActiveIdx = -1;
    codeInput.addEventListener("input", () => {
      clearTimeout(lookupTimer);
      const val = codeInput.value.trim();
      if (val.length < 2) { hideCodeLookupDropdown(); return; }
      lookupActiveIdx = -1;
      lookupTimer = setTimeout(() => fetchCodeLookup(val), 400);
    });
    codeInput.addEventListener("keydown", (e) => {
      const dropdown = document.querySelector("#codeLookupDropdown");
      if (!dropdown || dropdown.hidden) return;
      const items = dropdown.querySelectorAll(".code-lookup-item");
      if (!items.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        lookupActiveIdx = Math.min(lookupActiveIdx + 1, items.length - 1);
        items.forEach((el, i) => el.classList.toggle("active", i === lookupActiveIdx));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        lookupActiveIdx = Math.max(lookupActiveIdx - 1, 0);
        items.forEach((el, i) => el.classList.toggle("active", i === lookupActiveIdx));
      } else if (e.key === "Enter" && lookupActiveIdx >= 0) {
        e.preventDefault();
        items[lookupActiveIdx].dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      } else if (e.key === "Escape") {
        hideCodeLookupDropdown();
      }
    });
    codeInput.addEventListener("blur", () => {
      setTimeout(() => hideCodeLookupDropdown(), 200);
      // Auto-infer board (三级分类) from code prefix on blur
      const val = codeInput.value.trim();
      const form = document.querySelector("#financeAssetForm");
      if (!form) return;
      const fields = form.elements;
      if (fields.kind.value === "stock" && fields.subcategory.value === "A股" && val) {
        const board = inferBoardFromCode(val);
        if (board) updateFinanceTertiaryCategories(board);
      }
    });
  }
  document.querySelector("[data-action='recognize-finance-image']").addEventListener("click", handleFinanceImageRecognition);
  document.querySelector("[data-action='manage-finance-tertiary']").addEventListener("click", openFinanceTertiaryDialog);
  document.querySelector("#financeTertiaryForm").addEventListener("submit", handleFinanceTertiarySubmit);
  document.querySelector("#recordOptionForm").addEventListener("submit", handleRecordOptionSubmit);
  document.querySelector("#recordForm [name='type']").addEventListener("change", () => updateRecordCategoryOptions());
  document.querySelector("#recordForm [name='category']").addEventListener("change", () => updateRecordTagOptions());
  document.querySelector("#recordForm [name='recorder']").addEventListener("input", updateRecorderOptions);
  document.querySelector("[data-action='add-category']").addEventListener("click", () => openRecordOptionDialog("category"));
  document.querySelector("[data-action='add-tag']").addEventListener("click", () => openRecordOptionDialog("tag"));
}

function render() {
  const app = document.querySelector("#app");
  app.classList.toggle("auth-mode", !isAuthenticated());
  renderNav();
  renderUserEntry();
  renderFilters();
  if (!isAuthenticated()) {
    document.querySelector(".filters").classList.add("is-hidden");
    document.querySelector("#pageTitle").textContent = authMode === "register"
      ? "账号注册"
      : authMode === "forgot"
        ? "找回密码"
        : authLoginMethod === "phone"
          ? "手机号登录"
          : "账号登录";
    document.querySelector("#view").innerHTML = authPage();
    bindViewActions();
    return;
  }
  document.querySelector(".filters").classList.toggle("is-hidden", ["overview", "profile", "records", "finance", "financeAnalysis", "debts", "tools", "premiumTool", "analysis", "classes"].includes(currentModule));
  const moduleName = currentModule === "profile"
    ? "个人中心"
    : currentModule === "financeAnalysis"
      ? "汇总盈亏分析"
      : currentModule === "premiumTool"
        ? "溢价查询"
      : modules.find(([id]) => id === currentModule)?.[1] || "资产总览";
  document.querySelector("#pageTitle").textContent = moduleName;
  const view = document.querySelector("#view");
  syncAssetClassValuesFromFinance();
  const data = compute();
  const renderers = { overview, records, finance, financeAnalysis, debts, analysis, accounts, classes: assetClasses, tools, premiumTool, strategies, profile };
  view.innerHTML = renderers[currentModule](data);
  bindViewActions();
  syncPremiumAutoRefresh();
  if (currentModule === "premiumTool" && !premiumLoading && !premiumLoadedAt) {
    void loadPremiumMarket();
  }
}

function metric(label, value, hint = "") {
  return `<article class="card metric"><span>${label}</span><strong>${value}</strong><p class="muted">${hint}</p></article>`;
}

function formatPlainNumber(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatCurrencyNumber(value) {
  return `￥${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
}

function formatChartNumber(value) {
  const sign = value < 0 ? "-" : "";
  return `${sign}￥${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(value))}`;
}

function overviewTotal(rows) {
  return rows.reduce((sum, row) => sum + row.value, 0) || 1;
}

function overviewLegend(rows) {
  return `<div class="overview-legend">${rows.map((row) => `<span><i style="--tone:${row.color}"></i>${row.name}</span>`).join("")}</div>`;
}

function pieSegments(rows) {
  let offset = 0;
  const total = overviewTotal(rows);
  return rows.map((row) => {
    const start = offset;
    const end = offset + row.value / total * 100;
    offset = end;
    return `${row.color} ${start}% ${end}%`;
  }).join(", ");
}

function overviewPieCard(title, rows) {
  const safeRows = rows.length ? rows : [{ name: "暂无数据", value: 1, color: "#c7d2fe" }];
  const total = overviewTotal(safeRows);
  return `<section class="overview-card overview-chart-card">
    <h2>${title}</h2>
    ${overviewLegend(safeRows)}
    <div class="overview-pie-wrap">
      <div class="overview-pie" style="--segments:${pieSegments(safeRows)}"></div>
      <div class="pie-labels">${safeRows.map((row) => `<span>${row.name}: ${row.value.toFixed(1)} (${(row.value / total * 100).toFixed(2)}%)</span>`).join("")}</div>
    </div>
  </section>`;
}

function overviewDonutCard(title, rows, centerValue, centerLabel, showWarning = false) {
  const safeRows = rows.length ? rows : [{ name: "暂无数据", value: 1, color: "#c7d2fe" }];
  const total = overviewTotal(safeRows);
  return `<section class="overview-card overview-chart-card${showWarning ? ' debt-warning' : ''}">
    <h2>${title}${showWarning ? '<span class="warning-badge">⚠️ 负债预警</span>' : ''}</h2>
    ${overviewLegend(safeRows)}
    <div class="overview-donut-wrap">
      <div class="overview-donut" style="--segments:${pieSegments(safeRows)}"><strong>${centerValue}</strong><span>${centerLabel}</span></div>
      <div class="pie-labels">${safeRows.map((row) => `<span>${row.name}: ${formatCurrencyNumber(row.value)} (${(row.value / total * 100).toFixed(2)}%)</span>`).join("")}</div>
    </div>
  </section>`;
}

function overviewBarCard(title, legend, rows, mode) {
  const maxAbs = Math.max(...rows.map((row) => Math.abs(row.value)), 1);
  return `<section class="overview-card overview-bar-card">
    <h2>${title}</h2>
    <div class="overview-legend"><span><i></i>${legend}</span></div>
    <div class="overview-bars">
      <div class="bar-axis">${[1, 0.75, 0.5, 0.25, 0].map((step) => `<span>${formatChartNumber(mode === "money" ? maxAbs * step : maxAbs * (step * 2 - 1))}</span>`).join("")}</div>
      <div class="single-bar-area">${rows.map((row) => `<div class="single-bar ${row.value < 0 ? "negative" : ""}" style="--height:${Math.max(Math.abs(row.value) / maxAbs * 84, 6)}%"><b>${formatChartNumber(row.value)}</b></div>`).join("")}</div>
      <div class="bar-labels">${rows.map((row) => `<span>${row.label}</span>`).join("")}</div>
    </div>
  </section>`;
}

function assetGrowthLineCard(rows) {
  const width = 720;
  const height = 320;
  const padding = 48;
  const values = rows.flatMap((row) => [row.original, row.current]);
  const max = Math.max(...values, 1) * 1.12;
  const point = (value, index) => {
    const x = padding + (index / Math.max(rows.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - (value / max) * (height - padding * 2);
    return [x, y];
  };
  const originalPoints = rows.map((row, index) => point(row.original, index).map((num) => num.toFixed(1)).join(",")).join(" ");
  const currentPoints = rows.map((row, index) => point(row.current, index).map((num) => num.toFixed(1)).join(",")).join(" ");
  return `<section class="overview-card asset-growth-card">
    <h2>资产增长表</h2>
    ${overviewLegend([{ name: "原有总资产", color: "#f97316" }, { name: "现有总资产", color: "#6366f1" }])}
    <svg class="asset-growth-line" viewBox="0 0 ${width} ${height}" role="img" aria-label="资产增长表">
      ${[0, 1, 2, 3, 4].map((line) => `<line x1="${padding}" y1="${padding + line * 52}" x2="${width - padding}" y2="${padding + line * 52}" />`).join("")}
      <polyline class="original" points="${originalPoints}" style="stroke: #f97316;" />
      <polyline class="current" points="${currentPoints}" style="stroke: #6366f1;" />
      ${rows.map((row, index) => {
        const [ox, oy] = point(row.original, index);
        const [cx, cy] = point(row.current, index);
        return `<text class="original-text" x="${ox}" y="${oy - 8}" fill="#f97316">${row.original.toFixed(2)}</text><text class="current-text" x="${cx}" y="${cy - 8}" fill="#6366f1">${formatCurrencyNumber(row.current)}</text><text class="axis-text" x="${ox}" y="${height - 12}">${row.date}</text>`;
      }).join("")}
    </svg>
  </section>`;
}

function annualAssetChangeCard(rows) {
  const maxAbs = Math.max(...rows.flatMap((row) => [Math.abs(row.original), Math.abs(row.current), Math.abs(row.growth)]), 1);
  return `<section class="overview-card annual-change-card">
    <h2>年均资产变化</h2>
    ${overviewLegend([{ name: "原有总资产", color: "#f97316" }, { name: "现有总资产", color: "#6366f1" }, { name: "增长额", color: "#fbbf24" }])}
    <div class="annual-bars">
      ${rows.map((row) => `<div class="annual-group">
        ${annualBar(row.original, maxAbs, "#f97316")}
        ${annualBar(row.current, maxAbs, "#6366f1")}
        ${annualBar(row.growth, maxAbs, "#fbbf24")}
        <span>${row.year}</span>
      </div>`).join("")}
    </div>
  </section>`;
}

function annualBar(value, maxAbs, color) {
  return `<i class="${value < 0 ? "negative" : ""}" style="--height:${Math.max(Math.abs(value) / maxAbs * 82, 5)}%;--tone:${color}"><b>${value.toFixed(2)}</b></i>`;
}

function overview(data) {
  const dashboard = overviewDashboardData(data);
  return `
    <div class="overview-dashboard">
      <section class="overview-card asset-value" title="计算公式：总资产价值 = Σ(各资产分类当前价值)">
        <span>总资产价值</span>
        <strong>${formatPlainNumber(dashboard.totalAssetValue)}</strong>
        <small>= Σ(资产分类当前价值)</small>
      </section>
      <section class="overview-card progress-goal">
        <div class="progress-goal-head">
          <h2>进度目标</h2>
          <button class="goal-edit-btn" data-action="edit-goals" title="编辑目标">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            编辑
          </button>
        </div>
        <div class="overview-rate-line">
          <span>今年收益额</span>
          <strong class="${dashboard.annualNetGrowth >= 0 ? 'income' : 'expense'}">${money(dashboard.annualNetGrowth)}</strong>
          <span class="overview-rate-divider">|</span>
          <span>今年收益率</span>
          <strong class="${dashboard.annualRate >= 0 ? 'income' : 'expense'}">${percent(dashboard.annualRate)}</strong>
        </div>
        <div class="goal-grid">
          ${dashboard.goals.map(g => `
            <div class="goal-item${g.pct >= 100 ? ' goal-done' : ''}">
              <div class="goal-item-head">
                <span class="goal-item-label">${g.label}</span>
                ${g.pct >= 100
                  ? '<span class="goal-done-badge">已完成</span>'
                  : `<span class="goal-item-pct">${g.pct.toFixed(1)}%</span>`}
              </div>
              <div class="goal-bar-track">
                <i style="--width:${Math.min(g.pct, 100)}%;--tone:${g.pct >= 100 ? '#10b981' : g.pct >= 50 ? '#6366f1' : '#f59e0b'}"></i>
              </div>
              <div class="goal-item-sub">${g.isRate ? `${g.current.toFixed(2)}% / ${g.target.toFixed(2)}%` : `${money(g.current)} / ${money(g.target)}`}</div>
            </div>
          `).join('')}
        </div>
        <div class="annual-goal-progress">
          <div class="annual-goal-progress-head">
            <h3>每年完成情况</h3>
            <span>年度收益目标 = 期初资产 × 目标年化收益率</span>
            <button class="goal-add-btn" data-action="add-annual-goal" title="新增年份">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              新增年份
            </button>
          </div>
          <div class="annual-goal-table-wrap">
            <table class="annual-goal-table">
              <thead><tr><th>年份</th><th>期初资产</th><th>目标收益额</th><th>实际收益额</th><th>实际收益率</th><th>完成率</th><th>状态</th><th>操作</th></tr></thead>
              <tbody>${dashboard.annualGoalRows.map((row) => `<tr>
                <td>${row.year}</td>
                <td>${money(row.opening)}</td>
                <td>${money(row.targetProfit)}</td>
                <td class="${row.actualProfit >= 0 ? "income" : "expense"}">${money(row.actualProfit)}</td>
                <td class="${row.actualRate >= 0 ? "income" : "expense"}">${percent(row.actualRate)}</td>
                <td><div class="annual-completion-cell"><span>${row.completion.toFixed(1)}%</span><i><b style="--width:${Math.min(Math.max(row.completion, 0), 100)}%"></b></i></div></td>
                <td><span class="annual-goal-status ${row.statusClass}">${row.status}</span></td>
                <td class="annual-goal-actions">
                  <button data-action="edit-annual-goal" data-year="${row.year}" title="编辑">编辑</button>
                  <button data-action="delete-annual-goal" data-year="${row.year}" title="删除">删除</button>
                </td>
              </tr>`).join("")}</tbody>
            </table>
          </div>
        </div>
      </section>
      <!-- 第一行：基础收支 -->
      <section class="overview-card overview-stat-row">
        <div class="overview-stat-item" title="计算公式：今年总收入 = 收支分析中的今年收入">
          <span>今年总收入</span>
          <strong class="${dashboard.totalIncome >= 0 ? 'income' : 'expense'}">${formatPlainNumber(dashboard.totalIncome)}</strong>
          <small>= 收支分析今年收入</small>
        </div>
        <div class="overview-stat-divider"></div>
        <div class="overview-stat-item" title="计算公式：今年净收入 = 今年总收入 - 今年总支出">
          <span>今年净收入</span>
          <strong class="${dashboard.yearNetIncome >= 0 ? 'income' : 'expense'}">${formatPlainNumber(dashboard.yearNetIncome)}</strong>
          <small>= 总收入 - 总支出</small>
        </div>
        <div class="overview-stat-divider"></div>
        <div class="overview-stat-item" title="计算公式：今年总支出 = 收支分析中的今年支出">
          <span>今年总支出</span>
          <strong class="expense">${formatPlainNumber(dashboard.totalExpense)}</strong>
          <small>= 收支分析今年支出</small>
        </div>
      </section>

      <!-- 第二行：收支分析 -->
      <section class="overview-card overview-stat-row">
        <div class="overview-stat-item" title="计算公式：今年总收支 = 今年总收入 - 今年总消费">
          <span>今年总收支</span>
          <strong class="${dashboard.incomeExpenseBalance >= 0 ? 'income' : 'expense'}">${formatPlainNumber(dashboard.incomeExpenseBalance)}</strong>
          <small>= 总收入 - 总消费</small>
        </div>
        <div class="overview-stat-divider"></div>
        <div class="overview-stat-item" title="计算公式：今年总消费 = Σ(所有一级分类的消费总额)">
          <span>今年总消费</span>
          <strong class="expense">${formatPlainNumber(dashboard.consumptionTotal)}</strong>
          <small>= Σ(一级分类消费)</small>
        </div>
      </section>

      <!-- 第三行：理财分析 -->
      <section class="overview-card overview-stat-row">
        <div class="overview-stat-item" title="计算公式：今年总盈利 = Σ(今年理财资产盈利部分)">
          <span>今年总盈利</span>
          <strong class="${dashboard.financeIncome >= 0 ? 'income' : 'expense'}">${formatPlainNumber(dashboard.financeIncome)}</strong>
          <small>= Σ(理财盈利资产)</small>
        </div>
        <div class="overview-stat-divider"></div>
        <div class="overview-stat-item" title="计算公式：今年总亏损 = Σ(今年理财资产亏损部分)">
          <span>今年总亏损</span>
          <strong class="expense">${formatPlainNumber(dashboard.financeLoss)}</strong>
          <small>= Σ(理财亏损资产)</small>
        </div>
      </section>

      <!-- 第四行：债务分析 -->
      <section class="overview-card overview-stat-row">
        <div class="overview-stat-item" title="计算公式：债务总额 = Σ(所有应付债务的本金 + 利息)">
          <span>债务总额</span>
          <strong class="expense">${formatPlainNumber(dashboard.debtTotalAmount)}</strong>
          <small>= Σ(债务本金 + 利息)</small>
        </div>
        <div class="overview-stat-divider"></div>
        <div class="overview-stat-item" title="计算公式：债务本金 = Σ(所有应付债务的本金)">
          <span>债务本金</span>
          <strong class="expense">${formatPlainNumber(dashboard.debtTotalPrincipal)}</strong>
          <small>= Σ(债务本金)</small>
        </div>
        <div class="overview-stat-divider"></div>
        <div class="overview-stat-item" title="计算公式：债务总利息 = Σ(所有应付债务的利息)">
          <span>债务总利息</span>
          <strong class="expense">${formatPlainNumber(dashboard.debtTotalInterest)}</strong>
          <small>= Σ(债务利息)</small>
        </div>
      </section>

      ${overviewPieCard("收入占比", dashboard.incomeRatio)}
      ${overviewPieCard("支出占比", dashboard.expenseRatio)}
      ${overviewDonutCard("负债占比", dashboard.debtRatio, formatPlainNumber(dashboard.debtTotalAmount), "债务总额", dashboard.debtWarning)}

      ${assetGrowthLineCard(dashboard.assetGrowth)}
      ${annualAssetChangeCard(dashboard.annualChange)}
    </div>`;
}

function overviewDashboardData(data) {
  // Total asset value from asset classes (not accounts)
  const visibleClasses = (state.assetClasses || []).filter(c => c.visible !== false);
  const totalAssetValue = visibleClasses.reduce((sum, c) => sum + (Number(c.value) || 0), 0);
  const totalOpeningValue = visibleClasses.reduce((sum, c) => sum + (Number(c.openingValue) || 0), 0);
  const totalTargetValue = visibleClasses.reduce((sum, c) => sum + (Number(c.targetValue) || 0), 0);

  const goalValue = Math.max(totalTargetValue, totalAssetValue, 1);
  const yearIncome = data.income;
  const yearSpend = -data.expense;
  const yearNetIncome = data.balance;
  const monthIncome = yearIncome / 12;
  const monthSpend = yearSpend / 12;
  const monthBalance = yearNetIncome / 12;

  // Goals
  const g = state.overviewGoals || {};
  const overallTarget = g.overall || totalTargetValue || 1;
  const thisYearTarget = g.thisYear || totalOpeningValue * 1.1;
  const annualizedRateTarget = g.annualizedRate || 15;
  const yearFraction = (new Date() - new Date(new Date().getFullYear(), 0, 1)) / (new Date(new Date().getFullYear(), 11, 31) - new Date(new Date().getFullYear(), 0, 1) + 1);
  const annualGoalRows = annualGoalCompletionRows(totalOpeningValue, annualizedRateTarget);
  const currentAnnualRow = annualGoalRows.at(-1) || { actualProfit: 0, actualRate: 0 };
  const annualizedActual = currentAnnualRow.actualRate / Math.max(yearFraction, 0.01) * 100;

  const goals = [
    { label: "终极目标", target: overallTarget, current: totalAssetValue, pct: overallTarget > 0 ? totalAssetValue / overallTarget * 100 : 0 },
    { label: "本年目标", target: thisYearTarget, current: totalAssetValue, pct: thisYearTarget > 0 ? totalAssetValue / thisYearTarget * 100 : 0 },
    { label: "目标年化收益率", target: annualizedRateTarget, current: annualizedActual, pct: annualizedRateTarget > 0 ? annualizedActual / annualizedRateTarget * 100 : 0, isRate: true },
  ];

  // Stats from analysis module
  const stats = data.analysisStats || {};
  const statsYearIncome = (stats.ledgerIncome || 0) + (stats.financeIncome || 0);
  const statsYearNetIncome = stats.annualNetGrowth || 0;
  const statsYearSpend = stats.consumption || 0;

  // 收支分析数据（来自今年所有记录）
  const yearRecords = state.records.filter((record) => new Date(`${record.date}T00:00:00`).getFullYear() === new Date().getFullYear());
  
  // 计算今年总消费：所有一级分类的消费总额
  const consumptionTotal = yearRecords
    .filter((record) => record.type === "expense")
    .reduce((sum, record) => sum + convert(record.amount, record.currency), 0);

  // 今年总收入 = 收支分析中的今年收入（所有收入记录的总和）
  const totalIncome = yearRecords
    .filter((record) => record.type === "income")
    .reduce((sum, record) => sum + convert(record.amount, record.currency), 0);

  // 今年总收支 = 今年总收入 - 今年总消费
  const incomeExpenseBalance = totalIncome - consumptionTotal;

  // 今年总支出 = 收支分析中的今年支出（所有支出记录的总和）
  const totalExpense = consumptionTotal;

  // 理财分析数据（今年理财盈亏）
  const currentYear = new Date().getFullYear();
  const financeIncome = (state.financeAssets || []).reduce((sum, asset) => {
    const assetPnl = financeAssetValueRmb(asset) - financeAssetCostRmb(asset);
    // 只统计今年新增的资产
    const firstTransactionDate = (asset.transactions || []).map(t => t.date).filter(Boolean).sort()[0];
    const assetYear = firstTransactionDate ? new Date(firstTransactionDate).getFullYear() : currentYear;
    return assetYear === currentYear ? sum + Math.max(assetPnl, 0) : sum;
  }, 0);
  const financeLoss = (state.financeAssets || []).reduce((sum, asset) => {
    const assetPnl = financeAssetValueRmb(asset) - financeAssetCostRmb(asset);
    const firstTransactionDate = (asset.transactions || []).map(t => t.date).filter(Boolean).sort()[0];
    const assetYear = firstTransactionDate ? new Date(firstTransactionDate).getFullYear() : currentYear;
    return assetYear === currentYear ? sum + Math.abs(Math.min(assetPnl, 0)) : sum;
  }, 0);

  // 债务分析数据
  const payableDebts = (state.debts || []).filter((debt) => debt.category === "payable");
  const debtTotalAmount = payableDebts.reduce((sum, debt) => {
    const plan = debtPlan(debt);
    return sum + (plan.totalAmount || Number(debt.principal) || 0);
  }, 0);
  const debtTotalPrincipal = payableDebts.reduce((sum, debt) => sum + (Number(debt.principal) || 0), 0);
  const debtTotalInterest = payableDebts.reduce((sum, debt) => {
    const plan = debtPlan(debt);
    return sum + (plan.totalInterest || 0);
  }, 0);

  // 收入占比：由劳动收入和理财收入组成
  const laborIncome = yearRecords
    .filter((record) => record.type === "income" && record.category === "劳动收入")
    .reduce((sum, record) => sum + convert(record.amount, record.currency), 0);
  const financeIncomeFromRecords = yearRecords
    .filter((record) => record.type === "income" && record.category === "理财收入")
    .reduce((sum, record) => sum + convert(record.amount, record.currency), 0);
  const incomeRatio = [
    { name: "劳动收入", value: laborIncome, color: "#10b981" },
    { name: "理财收入", value: financeIncomeFromRecords, color: "#6366f1" },
  ].filter((item) => item.value > 0);

  // 支出占比：由理财亏损、今年总消费、债务总利息组成
  const expenseRatio = [
    { name: "理财亏损", value: financeLoss, color: "#ef4444" },
    { name: "今年总消费", value: consumptionTotal, color: "#f43f5e" },
    { name: "债务总利息", value: debtTotalInterest, color: "#dc2626" },
  ].filter((item) => item.value > 0);

  // 负债占比：债务总额与总资产价值的对比
  const debtRatio = [
    { name: "负债", value: debtTotalAmount, color: "#ef4444" },
    { name: "净资产", value: Math.max(totalAssetValue - debtTotalAmount, 0), color: "#10b981" },
  ];
  const debtWarning = debtTotalAmount > totalAssetValue * 0.2;

  return {
    totalAssetValue,
    totalOpeningValue,
    goalValue,
    progressPercent: totalAssetValue / goalValue * 100,
    annualNetGrowth: currentAnnualRow.actualProfit,
    annualRate: currentAnnualRow.actualRate,
    yearIncome,
    yearSpend,
    monthIncome,
    monthSpend,
    monthBalance,
    assetGrowth: generateMonthlyAssetGrowth(totalOpeningValue, totalAssetValue),
    annualChange: [
      { year: "期初", original: totalOpeningValue, current: totalOpeningValue, growth: 0 },
      { year: "当前", original: totalOpeningValue, current: totalAssetValue, growth: totalAssetValue - totalOpeningValue },
    ],
    liveNetAssets: data.netAssets,
    goals,
    annualGoalRows,
    statsYearIncome,
    statsYearNetIncome,
    statsYearSpend,
    // 第一行：基础收支
    totalIncome,
    totalExpense,
    yearNetIncome: totalIncome - totalExpense,
    // 第二行：收支分析
    incomeExpenseBalance,
    consumptionTotal,
    // 第三行：理财分析
    financeIncome,
    financeLoss,
    // 第四行：债务分析
    debtTotalAmount,
    debtTotalPrincipal,
    debtTotalInterest,
    // 饼图数据
    incomeRatio,
    expenseRatio,
    debtRatio,
    debtWarning,
  };
}

// 生成按月资产增长数据（结合每年完成情况）
function generateMonthlyAssetGrowth(openingValue, currentValue) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  
  // 获取今年的年度目标数据
  const currentYearGoal = state.annualGoals?.find(g => g.year === currentYear);
  
  // 如果有自定义年度目标，使用目标的期初资产；否则使用传入的openingValue
  const yearOpening = currentYearGoal?.opening || openingValue;
  
  // 计算每月资产值（按期初到当前的线性增长，或按实际收益分布）
  const months = [];
  for (let m = 0; m <= currentMonth; m++) {
    // 如果有年度实际收益数据，按月分配
    let monthlyValue;
    if (currentYearGoal && currentYearGoal.actualProfit !== undefined) {
      // 使用实际收益，按月平均分配
      const monthlyProgress = currentYearGoal.actualProfit * (m / currentMonth);
      monthlyValue = yearOpening + monthlyProgress;
    } else {
      // 没有实际数据，按期初到当前值的线性增长
      const progress = currentMonth > 0 ? m / currentMonth : 1;
      monthlyValue = yearOpening + (currentValue - yearOpening) * progress;
    }
    
    months.push({
      date: `${currentYear}年${m + 1}月`,
      original: yearOpening,
      current: Math.round(monthlyValue * 100) / 100,
    });
  }
  
  return months;
}

function annualGoalCompletionRows(currentYearOpening, targetRatePercent) {
  const currentYear = new Date().getFullYear();
  const years = [
    ...(state.records || []).map((record) => Number(String(record.date || "").slice(0, 4))),
    ...(state.financeAssets || []).flatMap((asset) => (asset.transactions || []).map((transaction) => Number(String(transaction.date || "").slice(0, 4)))),
    ...(state.debts || []).map((debt) => Number(String(debt.startDate || "").slice(0, 4))),
  ].filter((year) => Number.isInteger(year) && year >= 2000 && year <= currentYear);
  
  // 如果有自定义年度目标，合并到年份列表
  if (state.annualGoals && state.annualGoals.length > 0) {
    state.annualGoals.forEach(goal => {
      if (!years.includes(goal.year) && goal.year >= 2000 && goal.year <= currentYear + 5) {
        years.push(goal.year);
      }
    });
    years.sort((a, b) => a - b);
  }
  
  const firstYear = years.length ? Math.min(...years) : currentYear;
  const annualResults = new Map();
  for (let year = firstYear; year <= currentYear; year += 1) {
    annualResults.set(year, annualActualProfit(year));
  }
  
  // 如果有自定义目标，使用自定义的实际收益
  if (state.annualGoals) {
    state.annualGoals.forEach(goal => {
      if (goal.actualProfit !== undefined) {
        annualResults.set(goal.year, goal.actualProfit);
      }
    });
  }
  
  const openings = new Map([[currentYear, Math.max(Number(currentYearOpening) || 0, 0)]]);
  for (let year = currentYear - 1; year >= firstYear; year -= 1) {
    openings.set(year, Math.max((openings.get(year + 1) || 0) - (annualResults.get(year) || 0), 0));
  }
  
  // 如果有自定义期初资产，使用自定义值
  if (state.annualGoals) {
    state.annualGoals.forEach(goal => {
      if (goal.opening !== undefined) {
        openings.set(goal.year, goal.opening);
      }
    });
  }
  
  return Array.from({ length: currentYear - firstYear + 1 }, (_, index) => {
    const year = firstYear + index;
    const opening = openings.get(year) || 0;
    const actualProfit = annualResults.get(year) || 0;
    
    // 检查是否有自定义目标收益率
    const customGoal = state.annualGoals?.find(g => g.year === year);
    const useTargetRate = customGoal?.targetRate !== undefined ? customGoal.targetRate : (Number(targetRatePercent) || 0);
    const targetProfit = opening * useTargetRate / 100;
    
    const actualRate = opening > 0 ? actualProfit / opening : 0;
    const completion = targetProfit > 0 ? actualProfit / targetProfit * 100 : 0;
    const current = year === currentYear;
    const completed = completion >= 100;
    return {
      year,
      opening,
      targetProfit,
      actualProfit,
      actualRate,
      completion,
      status: current ? "进行中" : completed ? "已完成" : "未完成",
      statusClass: current ? "is-progress" : completed ? "is-done" : "is-missed",
    };
  });
}

function annualActualProfit(year) {
  const yearRecords = (state.records || []).filter((record) => Number(String(record.date || "").slice(0, 4)) === year && !isFinanceRecord(record));
  const ledgerIncome = yearRecords
    .filter((record) => record.type === "income")
    .reduce((sum, record) => sum + convert(record.amount, record.currency), 0);
  const consumption = yearRecords
    .filter((record) => record.type === "expense")
    .reduce((sum, record) => sum + convert(record.amount, record.currency), 0);
  const financeIncome = financeProfitAmountForYear(state.financeAssets || [], year, new Date());
  const payableDebt = (state.debts || [])
    .filter((debt) => debt.category === "payable" && Number(String(debt.startDate || "").slice(0, 4)) === year)
    .reduce((sum, debt) => sum + Math.max(Number(debt.amount) || Number(debt.principal) || 0, 0), 0);
  return ledgerIncome - consumption + financeIncome - payableDebt;
}

function records(data) {
  const period = ledgerPeriodRange(ledgerPeriod);
  const rows = state.records.filter((record) => {
    if (filters.account !== "all" && record.accountId !== filters.account) return false;
    return recordInRange(record, period) && !isFinanceRecord(record);
  });
  const latestRecord = [...rows].sort((a, b) => b.date.localeCompare(a.date))[0];
  const expenseRecords = rows.filter((record) => record.type === "expense");
  const incomeRecords = rows.filter((record) => record.type === "income");
  const dailyRows = ledgerTrendRows(rows, period);
  const yoyRows = ledgerYoyRows(period);
  const expenseTotal = expenseRecords.reduce((sum, record) => sum + convert(record.amount, record.currency), 0);
  const incomeTotal = incomeRecords.reduce((sum, record) => sum + convert(record.amount, record.currency), 0);
  const balance = incomeTotal - expenseTotal;
  return `
    <div class="ledger-web">
      <section class="ledger-filter-row">
        <div class="ledger-period-filter">
          <div class="ledger-periods ledger-mode-tabs">
            ${[
              ["day", "日常"],
              ["month", "月统计"],
              ["year", "年统计"],
              ["custom", "自定义"],
            ].map(([id, label]) => `<button data-action="ledger-mode" data-mode="${id}" class="${ledgerPeriodMode === id ? "active" : ""}">${label}</button>`).join("")}
          </div>
          ${ledgerPeriodOptionRow()}
        </div>
        <div class="ledger-custom-range ${ledgerPeriodMode === "custom" ? "active" : ""}">
          <input id="ledgerStartDate" type="date" value="${filters.startDate}" />
          <input id="ledgerEndDate" type="date" value="${filters.endDate}" />
        </div>
      </section>

      <section class="ledger-kpi-panel">
        <div class="ledger-kpi-grid simple-kpis">
          ${ledgerKpi(`${period.metricLabel}支出`, expenseTotal, "全部支出合计", "expense")}
          ${ledgerKpi(`${period.metricLabel}收入`, incomeTotal, "全部收入合计", "income")}
          ${ledgerKpi(`${period.metricLabel}结余`, balance, "收入 - 支出", balance >= 0 ? "income" : "expense")}
        </div>
      </section>

      <div class="trend-yoy-row">
        <section class="ledger-web-card trend-card">
          <div class="ledger-web-title">
            <h3>收支趋势统计</h3>
            <div class="segmented">
              ${[
                ["expense", "支出"],
                ["income", "收入"],
                ["balance", "结余"],
              ].map(([id, label]) => `<button data-action="ledger-trend" data-mode="${id}" class="${ledgerTrendMode === id ? "active" : ""}">${label}</button>`).join("")}
            </div>
          </div>
          ${ledgerTrendChart(dailyRows, ledgerTrendMode)}
        </section>

        <button type="button" class="layout-resizer" aria-label="调整同比分析宽度"></button>

        <section class="ledger-web-card yoy-card">
          <div class="ledger-web-title"><h3>同比分析</h3><span>${period.label} / 去年同期</span></div>
          <div class="yoy-list">${yoyRows.map(ledgerYoyRow).join("")}</div>
        </section>
      </div>

      <section class="ledger-web-card table-card record-list-card">
        <div class="ledger-web-title">
          <h3>记账明细</h3>
          <div class="ledger-panel-actions inline">
            <button class="primary" data-action="new-record">新增</button>
          </div>
        </div>
        ${ledgerRecordTable(rows)}
      </section>
    </div>`;
}

function finance() {
  calculatePositionWeights();
  const assets = state.financeAssets || [];
  const displayAssets = assets.filter(financeAssetHasMarketValue);
  const assetKinds = ["stock", "fund", "commodity", "futures", "options", "crypto", "cashflow", "custom"];
  const availableKinds = assetKinds.filter((kind) => displayAssets.some((item) => item.kind === kind));
  const visibleKinds = financeStockFilters.kind === "all"
    ? availableKinds
    : availableKinds.includes(financeStockFilters.kind) ? [financeStockFilters.kind] : [];
  const filteredAssets = filterFinanceAssets(displayAssets);
  const totalValue = displayAssets.reduce((sum, item) => sum + financeAssetValueRmb(item), 0);
  const totalCost = displayAssets.reduce((sum, item) => sum + financeAssetCostRmb(item), 0);
  const totalPnl = displayAssets.reduce((sum, item) => sum + financeAmountToRmb(item.pnl, item.currency), 0);
  return `<div class="finance-mvp">
    <section class="finance-hero">
      <div>
        <p class="eyebrow">统一资产管理 · MVP</p>
        <h2>个人理财资产管理</h2>
        <p class="muted">统一管理股票、基金、商品、期货、期权、加密货币、现金流资产与自定义理财，资产归属账户后自动汇总总资产。</p>
      </div>
      <button class="primary" data-action="new-finance-asset" data-kind="stock">+ 新增资产</button>
    </section>

    <section class="ledger-kpi-grid simple-kpis">
      <article class="ledger-kpi income finance-total-kpi">
        <div class="finance-kpi-title">
          <span>理财总资产（RMB）</span>
          <button type="button" data-action="open-finance-analysis">场内穿透</button>
        </div>
        <strong>${money(totalValue, "CNY")}</strong>
        <p>${displayAssets.length} 个资产 · 已统一折算</p>
      </article>
      ${ledgerKpi("持仓成本（RMB）", totalCost, "按货币汇率统一折算", "neutral", "CNY")}
      ${ledgerKpi("浮动盈亏（RMB）", totalPnl, "外币盈亏同步折算", totalPnl >= 0 ? "income" : "expense", "CNY")}
    </section>

    <section class="finance-card">
      <div class="ledger-web-title"><h3>账户汇总</h3><span>按所属账户自动汇总</span></div>
      ${financeAccountSummary(displayAssets)}
    </section>

    <section class="finance-card finance-global-filter-card">
      <div class="ledger-web-title"><h3>资产筛选</h3><span>筛选条件应用于下方全部资产列表</span></div>
      ${financeAssetFilterBar(displayAssets, filteredAssets.length)}
    </section>

    ${visibleKinds.map((kind) => {
      const visibleAssets = filteredAssets.filter((item) => item.kind === kind);
      const summaryBar = renderStockSummaryBar(visibleAssets, kind);
      return `<section class="finance-card">
      <div class="ledger-web-title"><div style="display:flex;align-items:baseline;gap:10px"><h3>${financeKindSectionTitle(kind)}</h3><span>${financeKindDescription(kind)}</span></div><button class="primary" data-action="new-finance-asset" data-kind="${kind}" style="padding:5px 14px;font-size:12px;white-space:nowrap">+ 新增</button></div>
      ${summaryBar}
      ${financeAssetTable(visibleAssets, kind)}
    </section>`;
    }).join("")}
    ${visibleKinds.length ? "" : `<section class="finance-card"><p class="muted">暂无有市值的理财资产，新增资产后将在这里显示。</p></section>`}
  </div>`;
}

function financeAnalysis() {
  const allAssets = state.financeAssets || [];
  const scopedAssets = financeAnalysisAssets(allAssets);
  const totalValue = scopedAssets.reduce((sum, item) => sum + financeAssetValueRmb(item), 0);
  const holdingProfit = scopedAssets.reduce((sum, item) => sum + financeAmountToRmb(item.pnl, item.currency), 0);
  const todayProfit = scopedAssets.reduce((sum, item) => sum + financeAssetDailyProfit(item, new Date()), 0);
  const todayRate = totalValue ? todayProfit / totalValue : 0;
  const shRate = financeBenchmarkRate(new Date());
  const periodRows = financeProfitTrend(scopedAssets, financeAnalysisPeriod);
  return `<div class="finance-analysis-page">
    <section class="finance-analysis-toolbar">
      <button type="button" class="icon-button" data-action="back-finance" title="返回理财模块" aria-label="返回理财模块">←</button>
      <div>
        <h2>汇总盈亏分析</h2>
        <p>按账户或资产类型穿透查看持有收益与当日收益</p>
      </div>
    </section>

    <section class="finance-scope-panel">
      <div class="finance-scope-tabs">
        ${[["all", "全部"], ["account", "按账户"], ["kind", "按资产类型"]].map(([value, label]) => `<button type="button" data-action="finance-analysis-scope" data-scope="${value}" class="${financeAnalysisScope === value ? "active" : ""}">${label}</button>`).join("")}
      </div>
      ${financeAnalysisScope === "all" ? "" : financeAnalysisFilterOptions(allAssets)}
    </section>

    <section class="finance-analysis-summary">
      <div class="finance-analysis-total">
        <div class="finance-analysis-total-head">
          <span>${financeAnalysisMetric === "profit" ? "当日收益" : "总资产（元）"}</span>
          <button type="button" class="finance-metric-switch" data-action="finance-analysis-metric">${financeAnalysisMetric === "profit" ? "切换为总资产" : "切换为当日收益"}</button>
        </div>
        <strong class="${(financeAnalysisMetric === "profit" ? todayProfit : totalValue) < 0 ? "expense" : "income"}">${money(financeAnalysisMetric === "profit" ? todayProfit : totalValue, "CNY")}</strong>
        <div class="finance-analysis-return">
          <span>当日收益</span>
          <b class="${todayProfit < 0 ? "expense" : "income"}">${money(todayProfit, "CNY")}</b>
          <small class="${todayRate < 0 ? "expense" : "income"}">${formatSignedPercent(todayRate)}</small>
        </div>
      </div>
      <div class="finance-return-pairs">
        <article><span>持有收益</span><strong class="${holdingProfit < 0 ? "expense" : "income"}">${money(holdingProfit, "CNY")}</strong><small>${formatSignedPercent(totalValue ? holdingProfit / Math.max(totalValue - holdingProfit, 1) : 0)}</small></article>
        <article><span>当日收益</span><strong class="${todayProfit < 0 ? "expense" : "income"}">${money(todayProfit, "CNY")}</strong><small>${formatSignedPercent(todayRate)}</small></article>
      </div>
    </section>

    <section class="finance-period-panel">
      <div class="finance-period-tabs">
        ${[["day", "当日"], ["week", "本周"], ["month", "本月"], ["year", "今年"], ["all", "全部"]].map(([value, label]) => `<button type="button" data-action="finance-analysis-period" data-period="${value}" class="${financeAnalysisPeriod === value ? "active" : ""}">${label}</button>`).join("")}
      </div>
    </section>

    <section class="finance-analysis-card finance-profit-chart-card">
      <div class="finance-analysis-card-title">
        <div><h3>收益走势</h3><span>我的收益 · 对标指数：上证指数</span></div>
        <div class="chart-legend"><span class="mine">我的收益</span><span class="benchmark">上证指数</span></div>
      </div>
      ${financeComparisonChart(periodRows)}
      <div class="finance-chart-footer">
        <div><span>${financePeriodLabel(financeAnalysisPeriod)}收益率</span><strong class="${todayRate < 0 ? "expense" : "income"}">${formatSignedPercent(financeTrendReturn(periodRows, "mine"))}</strong></div>
        <div><span>跑赢上证指数</span><strong class="${financeTrendReturn(periodRows, "mine") - financeTrendReturn(periodRows, "benchmark") < 0 ? "expense" : "income"}">${formatSignedPercent(financeTrendReturn(periodRows, "mine") - financeTrendReturn(periodRows, "benchmark"))}</strong><small>上证指数 ${formatSignedPercent(shRate)}</small></div>
      </div>
    </section>

    <section class="finance-analysis-card">
      <div class="finance-analysis-card-title"><div><h3>收益排行</h3><span>当前筛选范围的相对位置</span></div></div>
      <div class="finance-ranking-grid">
        ${financeRankCard("个人理财用户排行", scopedAssets, "超过同类用户", 82)}
        ${financeRankCard("全部基金排行", scopedAssets.filter((item) => item.kind === "fund"), "超过全部基金", 68)}
      </div>
    </section>

    <section class="finance-analysis-card">
      <div class="finance-analysis-card-title">
        <div><h3>盈亏日历</h3><span>按日、月、年查看收益表现</span></div>
        <button type="button" class="text-button" data-action="finance-calendar-metric">${financeCalendarMetric === "amount" ? "切换为收益率" : "切换为收益额"}</button>
      </div>
      <div class="finance-calendar-controls">
        <div class="finance-calendar-modes">
          ${[["day", "日"], ["month", "月"], ["year", "年"]].map(([value, label]) => `<button type="button" data-action="finance-calendar-mode" data-mode="${value}" class="${financeCalendarMode === value ? "active" : ""}">${label}</button>`).join("")}
        </div>
        ${financeCalendarSelect()}
      </div>
      ${financePnlCalendar(scopedAssets)}
    </section>
  </div>`;
}

function financeAnalysisAssets(assets) {
  if (financeAnalysisScope === "account" && financeAnalysisSelection !== "all") {
    return assets.filter((item) => item.accountId === financeAnalysisSelection);
  }
  if (financeAnalysisScope === "kind" && financeAnalysisSelection !== "all") {
    return assets.filter((item) => item.kind === financeAnalysisSelection);
  }
  return assets;
}

function financeAnalysisFilterOptions(assets) {
  const options = financeAnalysisScope === "account"
    ? state.accounts.map((account) => ({ value: account.id, label: account.name }))
    : [...new Set(assets.map((item) => item.kind))]
      .map((kind) => ({ value: kind, label: financeKindSectionTitle(kind) }));
  return `<div class="finance-scope-options">
    <button type="button" data-action="finance-analysis-filter" data-value="all" class="${financeAnalysisSelection === "all" ? "active" : ""}">
      <strong>全部</strong><span>持有收益 ${money(assets.reduce((sum, item) => sum + financeAmountToRmb(item.pnl, item.currency), 0), "CNY")}</span><small>当日收益 ${money(assets.reduce((sum, item) => sum + financeAssetDailyProfit(item, new Date()), 0), "CNY")}</small>
    </button>
    ${options.map((option) => {
      const optionAssets = financeAnalysisScope === "account"
        ? assets.filter((item) => item.accountId === option.value)
        : assets.filter((item) => item.kind === option.value);
      const holding = optionAssets.reduce((sum, item) => sum + financeAmountToRmb(item.pnl, item.currency), 0);
      const daily = optionAssets.reduce((sum, item) => sum + financeAssetDailyProfit(item, new Date()), 0);
      return `<button type="button" data-action="finance-analysis-filter" data-value="${option.value}" class="${financeAnalysisSelection === option.value ? "active" : ""}">
        <strong>${option.label}</strong><span>持有收益 ${money(holding, "CNY")}</span><small>当日收益 ${money(daily, "CNY")}</small>
      </button>`;
    }).join("")}
  </div>`;
}

function financeAssetDailyProfit(asset, date) {
  const numericId = String(asset.id || asset.code || asset.name).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const dateSeed = date.getFullYear() * 372 + (date.getMonth() + 1) * 31 + date.getDate();
  const movement = Math.sin((numericId + dateSeed) * 1.73) * 0.00125 + Math.cos((numericId * 3 + dateSeed) * 0.61) * 0.00055;
  return financeAssetValueRmb(asset) * movement;
}

function financeBenchmarkRate(date) {
  const dateSeed = date.getFullYear() * 372 + (date.getMonth() + 1) * 31 + date.getDate();
  return Math.sin(dateSeed * 0.47) * 0.0045 + Math.cos(dateSeed * 0.19) * 0.002;
}

function formatSignedPercent(value) {
  const number = Number(value) || 0;
  return `${number > 0 ? "+" : ""}${(number * 100).toFixed(2)}%`;
}

function financePeriodStart(period, now) {
  if (period === "day") {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    return start;
  }
  if (period === "week") {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    return start;
  }
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "year") return new Date(now.getFullYear(), 0, 1);
  const start = new Date(now);
  start.setFullYear(start.getFullYear() - 1);
  return start;
}

function financeProfitTrend(assets, period) {
  const now = new Date();
  const start = financePeriodStart(period, now);
  const totalValue = Math.max(assets.reduce((sum, item) => sum + financeAssetValueRmb(item), 0), 1);
  const rows = [];
  let mine = 0;
  let benchmark = 0;
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  while (cursor <= end) {
    mine += assets.reduce((sum, item) => sum + financeAssetDailyProfit(item, cursor), 0) / totalValue;
    benchmark += financeBenchmarkRate(cursor);
    rows.push({
      date: formatDate(cursor),
      label: `${cursor.getMonth() + 1}/${cursor.getDate()}`,
      mine,
      benchmark,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return rows;
}

function financeTrendReturn(rows, key) {
  return rows.length ? rows[rows.length - 1][key] : 0;
}

function financePeriodLabel(period) {
  return ({ day: "当日", week: "本周", month: "本月", year: "今年", all: "全部" })[period] || "当日";
}

function financeComparisonChart(rows) {
  const width = 920;
  const height = 300;
  const padding = { top: 30, right: 24, bottom: 38, left: 64 };
  const values = rows.flatMap((item) => [item.mine, item.benchmark]);
  let min = Math.min(0, ...values);
  let max = Math.max(0, ...values);
  if (min === max) {
    min -= 0.01;
    max += 0.01;
  }
  const x = (index) => padding.left + (index / Math.max(rows.length - 1, 1)) * (width - padding.left - padding.right);
  const y = (value) => padding.top + ((max - value) / (max - min)) * (height - padding.top - padding.bottom);
  const minePoints = rows.map((item, index) => `${x(index)},${y(item.mine)}`).join(" ");
  const benchmarkPoints = rows.map((item, index) => `${x(index)},${y(item.benchmark)}`).join(" ");
  const yTicks = Array.from({ length: 5 }, (_, index) => max - ((max - min) * index) / 4);
  const labelIndexes = [...new Set([0, Math.floor((rows.length - 1) / 2), rows.length - 1].filter((index) => index >= 0))];
  return `<div class="finance-comparison-chart">
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="我的收益与上证指数趋势对比">
      ${yTicks.map((tick) => `<g><line x1="${padding.left}" y1="${y(tick)}" x2="${width - padding.right}" y2="${y(tick)}" /><text x="${padding.left - 10}" y="${y(tick) + 4}" text-anchor="end">${formatSignedPercent(tick)}</text></g>`).join("")}
      <line class="zero-line" x1="${padding.left}" y1="${y(0)}" x2="${width - padding.right}" y2="${y(0)}" />
      <polyline class="mine-line" points="${minePoints}" />
      <polyline class="benchmark-line" points="${benchmarkPoints}" />
      ${labelIndexes.map((index) => `<text class="x-label" x="${x(index)}" y="${height - 10}" text-anchor="middle">${rows[index]?.label || ""}</text>`).join("")}
    </svg>
  </div>`;
}

function financeRankCard(title, assets, description, percentile) {
  const profit = assets.reduce((sum, item) => sum + financeAmountToRmb(item.pnl, item.currency), 0);
  const value = assets.reduce((sum, item) => sum + financeAssetValueRmb(item), 0);
  const rate = value ? profit / Math.max(value - profit, 1) : 0;
  return `<article class="finance-rank-card">
    <div><span>${title}</span><b>前 ${100 - percentile}%</b></div>
    <strong>${percentile}%</strong>
    <div class="finance-rank-track"><i style="width:${percentile}%"></i></div>
    <p>${description} ${percentile}% · 持有收益率 ${formatSignedPercent(rate)}</p>
  </article>`;
}

function financeCalendarSelect() {
  const now = new Date();
  if (financeCalendarMode === "day") {
    const options = [];
    for (let offset = 0; offset < 18; offset += 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      options.push(`<option value="${value}" ${financeCalendarValue === value ? "selected" : ""}>${date.getFullYear()}年${date.getMonth() + 1}月</option>`);
    }
    return `<select data-action="finance-calendar-value">${options.join("")}</select>`;
  }
  if (financeCalendarMode === "month") {
    const options = Array.from({ length: 10 }, (_, index) => now.getFullYear() - index);
    return `<select data-action="finance-calendar-value">${options.map((year) => `<option value="${year}" ${String(financeCalendarValue) === String(year) ? "selected" : ""}>${year}年</option>`).join("")}</select>`;
  }
  const ranges = [["1", "近1年"], ["3", "近3年"], ["5", "近5年"], ["10", "近10年"], ["all", "全部"]];
  return `<select data-action="finance-calendar-value">${ranges.map(([value, label]) => `<option value="${value}" ${financeCalendarValue === value ? "selected" : ""}>${label}</option>`).join("")}</select>`;
}

function financePnlCalendar(assets) {
  if (financeCalendarMode === "day") return financeDailyPnlCalendar(assets);
  if (financeCalendarMode === "month") return financeMonthlyPnlCalendar(assets);
  return financeYearlyPnlCalendar(assets);
}

function financeCalendarDisplay(value, assets) {
  if (financeCalendarMetric === "rate") {
    const total = Math.max(assets.reduce((sum, item) => sum + financeAssetValueRmb(item), 0), 1);
    return formatSignedPercent(value / total);
  }
  return compactMoney(value, "CNY");
}

function financeDailyPnlCalendar(assets) {
  const [year, month] = String(financeCalendarValue).split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  const cells = [...Array.from({ length: firstDay }, () => null), ...Array.from({ length: days }, (_, index) => index + 1)];
  return `<div class="finance-pnl-calendar">
    <div class="finance-pnl-weekdays">${["日", "一", "二", "三", "四", "五", "六"].map((item) => `<span>${item}</span>`).join("")}</div>
    <div class="finance-pnl-days">${cells.map((day) => {
      if (!day) return `<span></span>`;
      const value = assets.reduce((sum, item) => sum + financeAssetDailyProfit(item, new Date(year, month - 1, day)), 0);
      return `<article class="${value > 0 ? "positive" : value < 0 ? "negative" : "zero"}"><b>${day}</b><small>${financeCalendarDisplay(value, assets)}</small></article>`;
    }).join("")}</div>
  </div>`;
}

function financeMonthlyPnlCalendar(assets) {
  const year = Number(financeCalendarValue) || new Date().getFullYear();
  return `<div class="finance-pnl-months">${Array.from({ length: 12 }, (_, month) => {
    const days = new Date(year, month + 1, 0).getDate();
    const value = Array.from({ length: days }, (_, index) => assets.reduce((sum, item) => sum + financeAssetDailyProfit(item, new Date(year, month, index + 1)), 0)).reduce((sum, item) => sum + item, 0);
    return `<article class="${value > 0 ? "positive" : value < 0 ? "negative" : "zero"}"><b>${month + 1}月</b><strong>${financeCalendarDisplay(value, assets)}</strong></article>`;
  }).join("")}</div>`;
}

function financeYearlyPnlCalendar(assets) {
  const now = new Date();
  const range = financeCalendarValue === "all" ? 10 : Number(financeCalendarValue) || 1;
  return `<div class="finance-pnl-years">${Array.from({ length: range }, (_, index) => now.getFullYear() - range + 1 + index).map((year) => {
    let value = 0;
    for (let month = 0; month < 12; month += 1) {
      const days = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= days; day += 1) value += assets.reduce((sum, item) => sum + financeAssetDailyProfit(item, new Date(year, month, day)), 0);
    }
    return `<article class="${value > 0 ? "positive" : value < 0 ? "negative" : "zero"}"><b>${year}年</b><strong>${financeCalendarDisplay(value, assets)}</strong></article>`;
  }).join("")}</div>`;
}

function financeAssetCost(item) {
  return (Number(item.costPrice) || 0) * (Number(item.shares) || 0);
}

function financeAssetValue(item) {
  return financeAssetCost(item) + (Number(item.pnl) || 0);
}

function financeAssetMarketValue(item) {
  const shares = Number(item?.shares) || 0;
  const price = resolveAssetPrice(item);
  const liveValue = price > 0 && shares > 0 ? price * shares : 0;
  return liveValue || financeAssetValue(item);
}

function financeAssetHasMarketValue(item) {
  return financeAssetMarketValue(item) > 0.000001;
}

function financeAmountToRmb(amount, currency = "CNH") {
  const code = currency === "CNH" ? "CNH" : currency;
  return (Number(amount) || 0) * (state.rates[code] || 1);
}

function financeAssetCostRmb(item) {
  return financeAmountToRmb(financeAssetCost(item), item.currency);
}

function financeAssetValueRmb(item) {
  return financeAmountToRmb(financeAssetValue(item), item.currency);
}

function financeLocalMoney(value, currency = "CNH") {
  return `${currency} ${new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(Number(value) || 0)}`;
}

// ─── 税费计算（A股股票交易） ───
// 规则：印花税 0.05%（卖出）、佣金（含净佣金+手续费+证管费）、过户费（沪市单独收）、股息红利税
function calculateStockFees(item) {
  const isStock = item.kind === "stock";
  const isDomestic = item.market === "domestic";
  const isShanghai = isStock && isDomestic && item.code && item.code.startsWith("6");
  const isShenzhen = isStock && isDomestic && item.code && (item.code.startsWith("0") || item.code.startsWith("3"));
  if (!isStock || !isDomestic) {
    return { stampDuty: 0, commission: 0, transferFee: 0, dividendTax: 0, total: 0, applicable: false };
  }
  const cfg = state.feeConfig || seed.feeConfig;
  const transactionAmount = financeAssetMarketValue(item); // 按最新行情估算当前持仓卖出费用
  // 印花税：卖出时按配置费率收取
  const stampDuty = transactionAmount * (cfg.stampDutyRate / 100);
  // 佣金：按配置费率，最低配置金额
  let commission = transactionAmount * (cfg.commissionRate / 100);
  if (commission < cfg.commissionMin) commission = cfg.commissionMin;
  // 过户费：沪市/深市按各自费率
  const transferFee = isShanghai
    ? transactionAmount * (cfg.transferFeeRateSH / 100)
    : transactionAmount * (cfg.transferFeeRateSZ / 100);
  // 股息红利税
  const dividendTax = transactionAmount * (cfg.dividendTaxRate / 100);
  const total = stampDuty + commission + transferFee + dividendTax;
  return { stampDuty, commission, transferFee, dividendTax, total, applicable: true };
}

function calculateRecordedTransactionFees(item) {
  const detailed = (item.transactions || []).reduce((sum, transaction) => ({
    commission: sum.commission + (Number(transaction.commission) || 0),
    stampDuty: sum.stampDuty + (Number(transaction.stampDuty) || 0),
    transferFee: sum.transferFee + (Number(transaction.transferFee) || 0),
  }), { commission: 0, stampDuty: 0, transferFee: 0 });
  detailed.total = detailed.commission + detailed.stampDuty + detailed.transferFee;
  return {
    ...detailed,
    total: detailed.total,
  };
}

function calculateAssetFeeSummary(item) {
  const recorded = calculateRecordedTransactionFees(item);
  const projected = calculateStockFees(item);
  
  // 优先使用手动设置的税费合计值
  if (item.customFeeTotal !== undefined && item.customFeeTotal !== null) {
    return {
      recorded,
      projected,
      total: Number(item.customFeeTotal),
      isCustom: true,
    };
  }
  
  return {
    recorded,
    projected,
    // 税费合计 = 已记录交易费用（不包含预估卖出费用）
    total: recorded.total,
    isCustom: false,
  };
}

function validateFinanceAssetWithLatestData(asset) {
  if (!asset) return;
  const latestPrice = resolveAssetPrice(asset);
  const shares = Number(asset.shares) || 0;
  const costPrice = Number(asset.costPrice) || 0;
  if (latestPrice > 0) {
    asset.currentPrice = latestPrice;
    asset.currentValue = latestPrice * shares;
    asset.currentValueSource = "calculated";
    if (shares > 0 && costPrice > 0) {
      asset.pnl = (latestPrice - costPrice) * shares;
      asset.pnlPercent = (latestPrice - costPrice) / costPrice * 100;
    }
  }
}

function formatFeeDetail(fees, currency = "CNH") {
  if (!fees.applicable) return "非 A 股股票，不适用";
  return `税费合计: ${financeLocalMoney(fees.total, currency)}`;
}

function financeKindLabel(kind) {
  return ({ stock: "股票", fund: "基金", commodity: "商品", futures: "期货", options: "期权", crypto: "加密货币", cashflow: "现金流资产", custom: "自定义理财" })[kind] || kind;
}

function financeKindSectionTitle(kind) {
  const label = financeKindLabel(kind);
  return label.endsWith("资产") ? label : `${label}资产`;
}

function financeKindDescription(kind) {
  return ({
    stock: "股票类资产",
    fund: "基金类资产",
    commodity: "贵金属及其他商品",
    futures: "期货合约",
    options: "期权合约",
    crypto: "数字货币资产",
    cashflow: "现金流与备用金资产",
    custom: "其他自定义理财资产",
  })[kind] || "资产明细";
}

function financeMarketLabel(market) {
  return market === "overseas" ? "海外市场" : "国内市场";
}

function financeCurrencyOptions() {
  return ["CNH", "HKD", "USD", "EUR", "JPY", "GBP"];
}

function normalizeFinanceCurrency(currency, market = "domestic") {
  const normalized = currency === "HK" ? "HKD" : currency === "RMB" || currency === "CNY" ? "CNH" : currency;
  const options = financeCurrencyOptions();
  if (!options.includes(normalized)) return market === "overseas" ? "HKD" : "CNH";
  return normalized;
}

function financeAccountSummary(assets) {
  const rows = state.accounts.map((account) => {
    const accountAssets = assets.filter((item) => item.accountId === account.id);
    return {
      account,
      count: accountAssets.length,
      value: accountAssets.reduce((sum, item) => sum + financeAssetValueRmb(item), 0),
      pnl: accountAssets.reduce((sum, item) => sum + financeAmountToRmb(item.pnl, item.currency), 0),
    };
  }).filter((row) => row.count > 0);
  return `<div class="finance-account-grid">${rows.map((row) => `<article>
    <strong>${row.account.name}</strong>
    <span>${row.account.type} · ${row.account.currency}</span>
    <b>${money(row.value, "CNY")}</b>
    <small>${row.count} 个资产 · 浮动盈亏 ${money(row.pnl, "CNY")} RMB</small>
  </article>`).join("") || `<p class="muted">暂无理财资产归属账户。</p>`}</div>`;
}

function filterFinanceAssets(assets) {
  return assets.filter((item) => {
    const account = state.accounts.find((entry) => entry.id === item.accountId);
    const searchable = [item.name, item.code, financeKindLabel(item.kind), item.category, item.subcategory, item.tertiaryCategory, account?.name]
      .join(" ")
      .toLowerCase();
    if (financeStockFilters.query && !searchable.includes(financeStockFilters.query.toLowerCase())) return false;
    return ["kind", "category", "subcategory", "tertiaryCategory", "positionGroup", "positionCategory", "market", "currency", "accountId"]
      .every((field) => financeStockFilters[field] === "all" || String(item[field] || "") === financeStockFilters[field]);
  });
}

function financeAssetFilterOptions(assets, field, labeler = (value) => value) {
  const values = field === "kind"
    ? ["stock", "fund", "commodity", "futures", "options", "crypto", "cashflow", "custom"]
    : [...new Set(assets.map((item) => item[field]).filter(Boolean))];
  return `<option value="all">全部</option>${values.map((value) => `
    <option value="${escapeAttr(value)}" ${financeStockFilters[field] === String(value) ? "selected" : ""}>${labeler(value)}</option>
  `).join("")}`;
}

function financeAssetFilterBar(assets, resultCount) {
  const accountOptions = [...new Set(assets.map((item) => item.accountId).filter(Boolean))];
  return `<form id="financeStockFilterForm" class="finance-stock-filter">
    <label class="finance-stock-search">名称 / 代码
      <input name="query" value="${escapeAttr(financeStockFilters.query)}" placeholder="搜索名称、代码或分类" />
    </label>
    <label>资产类型<select name="kind">${financeAssetFilterOptions(assets, "kind", financeKindLabel)}</select></label>
    <label>资产分类<select name="category">${financeAssetFilterOptions(assets, "category")}</select></label>
    <label>二级分类<select name="subcategory">${financeAssetFilterOptions(assets, "subcategory")}</select></label>
    <label>三级分类<select name="tertiaryCategory">${financeAssetFilterOptions(assets, "tertiaryCategory")}</select></label>
    <label>仓位分组<select name="positionGroup">${financeAssetFilterOptions(assets, "positionGroup", financePositionGroupLabel)}</select></label>
    <label>仓位分类<select name="positionCategory">${financeAssetFilterOptions(assets, "positionCategory")}</select></label>
    <label>市场<select name="market">${financeAssetFilterOptions(assets, "market", financeMarketLabel)}</select></label>
    <label>币种<select name="currency">${financeAssetFilterOptions(assets, "currency")}</select></label>
    <label>账户<select name="accountId">
      <option value="all">全部</option>
      ${accountOptions.map((accountId) => {
        const account = state.accounts.find((item) => item.id === accountId);
        return `<option value="${escapeAttr(accountId)}" ${financeStockFilters.accountId === accountId ? "selected" : ""}>${account?.name || accountId}</option>`;
      }).join("")}
    </select></label>
    <div class="finance-stock-filter-actions">
      <span>显示 ${resultCount} / ${assets.length} 项</span>
      <button type="button" class="primary" data-action="refresh-quotes">刷新行情</button>
      <button type="button" data-action="reset-finance-filter">重置</button>
      <button type="submit" class="primary">筛选</button>
    </div>
  </form>`;
}

// ── 实时行情获取 ──
async function fetchRealtimeQuotes() {
  const quotedAssets = (state.financeAssets || []).filter((asset) =>
    ["stock", "fund"].includes(asset.kind) && asset.code);
  if (!quotedAssets.length) return;
  const codes = quotedAssets.map((a) => ({
    code: a.code,
    market: a.market || "domestic",
  }));
  try {
    const data = await apiRequest("/finance/quotes", {
      method: "POST",
      body: { codes },
    });
    const quotes = data.quotes || [];
    // Build map: code -> quote data
    for (let i = 0; i < codes.length; i++) {
      const q = quotes[i];
      if (q && q.price != null && q.price > 0) {
        realtimeQuoteMap[codes[i].code] = {
          price: q.price,
          changePct: q.changePct,
          changeAmt: q.changeAmt,
          prevClose: q.prevClose,
          name: q.name,
        };
      }
    }
    applyRealtimeQuotes();
    await saveState();
    render();
  } catch (error) {
    console.warn("实时行情刷新失败", error);
  }
}

function refreshFinanceAssetAfterTransaction(assetId) {
  const dialog = document.querySelector("#holdingDetailDialog");
  const activeTab = dialog?.open
    ? document.querySelector(".holding-tab.active")?.dataset.tab || "trade"
    : null;
  const content = document.querySelector("#holdingTabContent");
  const contentScrollTop = content?.scrollTop || 0;
  fetchRealtimeQuotes().then(() => {
    if (!dialog?.open || Number(dialog.dataset.assetId) !== Number(assetId)) return;
    renderHoldingTabContent(activeTab, assetId);
    const refreshedContent = document.querySelector("#holdingTabContent");
    if (refreshedContent) refreshedContent.scrollTop = contentScrollTop;
  });
}

// ── 统一取价：实时价 → 昨收价 → 保存的currentPrice → 成本+盈亏反算 ──
function resolveAssetPrice(asset) {
  const q = realtimeQuoteMap[asset.code] || {};
  const cost = Number(asset.costPrice) || 0;
  const shares = Number(asset.shares) || 0;
  const calcPrice = (shares > 0 && cost > 0) ? (cost + (Number(asset.pnl) || 0) / shares) : 0;
  return q.price || q.prevClose || Number(asset.currentPrice) || (calcPrice > 0 ? calcPrice : 0);
}

// ── 个股仓位计算（独立于行情接口，每次渲染都可调用）──
function calculatePositionWeights() {
  const stockAssets = (state.financeAssets || []).filter((a) => a.kind === "stock");
  if (!stockAssets.length) return;
  let totalStockValue = 0;
  for (const asset of stockAssets) {
    const price = resolveAssetPrice(asset);
    const cost = Number(asset.costPrice) || 0;
    const shares = Number(asset.shares) || 0;
    const marketVal = price > 0 ? price * shares : (cost * shares + (Number(asset.pnl) || 0));
    totalStockValue += financeAmountToRmb(marketVal, asset.currency);
  }
  for (const asset of stockAssets) {
    const price = resolveAssetPrice(asset);
    const cost = Number(asset.costPrice) || 0;
    const shares = Number(asset.shares) || 0;
    const assetValue = price > 0 ? price * shares : (cost * shares + (Number(asset.pnl) || 0));
    asset.positionWeight = totalStockValue > 0
      ? parseFloat((financeAmountToRmb(assetValue, asset.currency) / totalStockValue * 100).toFixed(2))
      : 0;
  }
}

function applyRealtimeQuotes() {
  const stockAssets = (state.financeAssets || []).filter((a) => ["stock", "fund"].includes(a.kind));
  // First pass: update current prices and calculate per-asset values
  for (const asset of stockAssets) {
    const q = realtimeQuoteMap[asset.code];
    if (q && q.price > 0) {
      asset.currentPrice = q.price;
      // Recalculate market value
      const shares = Number(asset.shares) || 0;
      const costPrice = Number(asset.costPrice) || 0;
      // 持仓盈亏 = (现价 - 成本) × 份额
      if (shares > 0 && costPrice > 0) {
        asset.pnl = parseFloat(((q.price - costPrice) * shares).toFixed(2));
        asset.pnlPercent = parseFloat(((q.price - costPrice) / costPrice * 100).toFixed(2));
      }
      // 当日盈亏 = 实时现价 × 当前持仓 × 当日涨跌率。
      if (shares > 0 && q.changePct != null) {
        asset.todayPnl = parseFloat((q.price * shares * q.changePct / 100).toFixed(2));
      } else if (shares > 0 && q.changeAmt != null) {
        asset.todayPnl = parseFloat((q.changeAmt * shares).toFixed(2));
      }
      if (q.changePct != null) {
        asset.todayPnlPercent = parseFloat((q.changePct || 0).toFixed(2));
      }
    }
  }
  // Second pass: auto-calculate 个股仓位
  calculatePositionWeights();
}

// ── K-line 走势图 ──
let echartsLoaded = false;
let echartsLoading = null;
let klineChartInstance = null;
let klineCurrentAsset = null;
let klineCurrentRange = "6m";
let klineDataCache = {};
let klineResizeObserver = null;

function loadECharts() {
  if (echartsLoaded) return Promise.resolve();
  if (echartsLoading) return echartsLoading;
  echartsLoading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js";
    s.onload = () => { echartsLoaded = true; resolve(); };
    s.onerror = () => { echartsLoading = null; reject(new Error("ECharts CDN failed")); };
    document.head.appendChild(s);
  });
  return echartsLoading;
}

async function fetchKlineData(code, market, range) {
  const cacheKey = `${code}_${range}`;
  const cached = klineDataCache[cacheKey];
  if (cached && Date.now() - cached.ts < 300000) return cached.data;
  const end = new Date().toISOString().slice(0, 10);
  let start = "", count = 320;
  if (range === "3m") { start = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10); count = 90; }
  else if (range === "6m") { start = new Date(Date.now() - 180 * 864e5).toISOString().slice(0, 10); count = 180; }
  else if (range === "1y") { start = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10); count = 320; }
  else { count = 800; }
  const url = `${API_BASE}/finance/kline?code=${encodeURIComponent(code)}&market=${encodeURIComponent(market)}&start=${start}&end=${end}&count=${count}`;
  const headers = {};
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error("K-line fetch failed");
  const data = await resp.json();
  klineDataCache[cacheKey] = { data, ts: Date.now() };
  return data;
}

function calculateMA(klineData, period) {
  const result = [];
  for (let i = 0; i < klineData.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += parseFloat(klineData[j][2]);
    result.push(+(sum / period).toFixed(2));
  }
  return result;
}

function prepareTransactionMarkers(asset, klineDates, klineData) {
  const txns = (asset.transactions || []).slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const effectiveTxns = txns.length > 0 ? txns : [{
    direction: "buy",
    date: klineDates[0] || new Date().toISOString().slice(0, 10),
    price: Number(asset.costPrice) || 0,
    shares: Number(asset.shares) || 0,
  }];
  const byDate = new Map();
  for (const txn of effectiveTxns) {
    if (!byDate.has(txn.date)) byDate.set(txn.date, []);
    byDate.get(txn.date).push(txn);
  }
  const dateIdx = new Map(klineDates.map((d, i) => [d, i]));
  const markers = [];
  byDate.forEach((txns, dt) => {
    const idx = dateIdx.get(dt);
    if (idx == null) return;
    const hasBuy = txns.some(t => t.direction === "buy");
    const hasSell = txns.some(t => t.direction === "sell");
    const closePrice = parseFloat(klineData[idx]?.[2]) || 0;
    if (hasBuy && hasSell) {
      markers.push({ type: "T", index: idx, date: dt, price: closePrice });
    } else {
      const dir = hasBuy ? "buy" : "sell";
      const rel = txns.filter(t => t.direction === dir);
      const totalAmt = rel.reduce((s, t) => s + (Number(t.price) * Number(t.shares)), 0);
      const totalSh = rel.reduce((s, t) => s + Number(t.shares), 0);
      const avgPrice = totalSh > 0 ? totalAmt / totalSh : Number(rel[0].price) || closePrice;
      markers.push({ type: dir, index: idx, date: dt, price: avgPrice });
    }
  });
  return markers;
}

function renderKlineChart(klineData, markers) {
  const container = document.getElementById("klineChartContainer");
  const loading = document.getElementById("klineLoading");
  if (loading) loading.style.display = "none";
  if (klineChartInstance) { klineChartInstance.dispose(); }
  klineChartInstance = echarts.init(container);
  if (klineResizeObserver) klineResizeObserver.disconnect();
  klineResizeObserver = new ResizeObserver(() => klineChartInstance?.resize());
  klineResizeObserver.observe(container);

  const dates = klineData.map(d => d[0]);
  const ohlc = klineData.map(d => [+d[1], +d[2], +d[4], +d[3]]);
  const volumes = klineData.map(d => +(d[5] || 0));
  const ma5 = calculateMA(klineData, 5);
  const ma10 = calculateMA(klineData, 10);
  const ma20 = calculateMA(klineData, 20);
  const volColors = klineData.map(d => +d[2] >= +d[1] ? "#ef4444" : "#10b981");

  const buyScatter = markers.filter(m => m.type === "buy").map(m => ({
    coord: [m.date, m.price], value: m.price,
    symbol: "triangle", symbolSize: 14, symbolRotate: 0,
    itemStyle: { color: "#ef4444" },
  }));
  const sellScatter = markers.filter(m => m.type === "sell").map(m => ({
    coord: [m.date, m.price], value: m.price,
    symbol: "triangle", symbolSize: 14, symbolRotate: 180,
    itemStyle: { color: "#10b981" },
  }));
  const tScatter = markers.filter(m => m.type === "T").map(m => ({
    coord: [m.date, m.price], value: "T",
    symbol: "none", symbolSize: 0,
    label: { show: true, formatter: "T", color: "#f59e0b", fontWeight: "bold", fontSize: 14, position: "top" },
  }));

  const option = {
    animation: false,
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis", axisPointer: { type: "cross" },
      formatter: function (params) {
        const k = params.find(p => p.seriesName === "K线");
        if (!k) return "";
        const d = k.data;
        const dt = k.axisValue;
        let s = `<b>${dt}</b><br/>开: ${d[1]}<br/>收: ${d[2]}<br/>低: ${d[3]}<br/>高: ${d[4]}`;
        const v = params.find(p => p.seriesName === "成交量");
        if (v) s += `<br/>量: ${Number(v.value).toLocaleString()}`;
        return s;
      },
    },
    axisPointer: { link: [{ xAxisIndex: "all" }] },
    grid: [
      { left: "9%", right: "3%", top: "6%", height: "55%" },
      { left: "9%", right: "3%", top: "70%", height: "20%" },
    ],
    xAxis: [
      { type: "category", data: dates, gridIndex: 0, axisLabel: { show: false }, axisTick: { show: false } },
      { type: "category", data: dates, gridIndex: 1, axisLabel: { fontSize: 10 } },
    ],
    yAxis: [
      { scale: true, gridIndex: 0, splitLine: { lineStyle: { color: "#e8e8e8" } }, axisLabel: { fontSize: 10 } },
      { scale: true, gridIndex: 1, splitLine: { show: false }, axisLabel: { show: false } },
    ],
    dataZoom: [
      { type: "inside", xAxisIndex: [0, 1], start: klineData.length > 120 ? 50 : 0, end: 100 },
    ],
    series: [
      {
        name: "K线", type: "candlestick", data: ohlc, xAxisIndex: 0, yAxisIndex: 0,
        itemStyle: { color: "#ef4444", color0: "#10b981", borderColor: "#ef4444", borderColor0: "#10b981" },
      },
      { name: "MA5", type: "line", data: ma5, smooth: true, lineStyle: { width: 1, color: "#f5a623" }, symbol: "none", xAxisIndex: 0, yAxisIndex: 0 },
      { name: "MA10", type: "line", data: ma10, smooth: true, lineStyle: { width: 1, color: "#6366f1" }, symbol: "none", xAxisIndex: 0, yAxisIndex: 0 },
      { name: "MA20", type: "line", data: ma20, smooth: true, lineStyle: { width: 1, color: "#06b6d4" }, symbol: "none", xAxisIndex: 0, yAxisIndex: 0 },
      {
        name: "成交量", type: "bar", data: volumes.map((v, i) => ({ value: v, itemStyle: { color: volColors[i] } })),
        xAxisIndex: 1, yAxisIndex: 1,
      },
      {
        name: "买入", type: "scatter", data: buyScatter, xAxisIndex: 0, yAxisIndex: 0, z: 10,
      },
      {
        name: "卖出", type: "scatter", data: sellScatter, xAxisIndex: 0, yAxisIndex: 0, z: 10,
      },
      {
        name: "做T", type: "scatter", data: tScatter, xAxisIndex: 0, yAxisIndex: 0, z: 10,
      },
    ],
  };
  klineChartInstance.setOption(option);
}

async function openKlineChart(assetId) {
  const asset = (state.financeAssets || []).find(a => a.id === assetId);
  if (!asset || !asset.code) return;
  klineCurrentAsset = asset;
  klineCurrentRange = "6m";
  const dialog = document.querySelector("#klineChartDialog");
  const quote = realtimeQuoteMap[asset.code] || {};
  document.getElementById("klineChartTitle").textContent = `${asset.name} (${asset.code})`;
  document.getElementById("klineChartSubtitle").textContent = `${financeMarketLabel(asset.market)} · ${asset.kind === "stock" ? "股票" : asset.kind}`;
  const cp = resolveAssetPrice(asset);
  const priceEl = document.getElementById("klineChartPrice");
  if (cp > 0) {
    const chg = quote.changePct || 0;
    const cls = chg >= 0 ? "income" : "expense";
    priceEl.innerHTML = `<span class="${cls}">${cp.toFixed(3)} ${chg ? (chg >= 0 ? "+" : "") + chg.toFixed(2) + "%" : ""}</span>`;
  } else {
    priceEl.textContent = "--";
  }
  document.querySelectorAll("#klineTimeTabs button").forEach(btn => btn.classList.toggle("active", btn.dataset.range === "6m"));
  dialog.showModal();
  const container = document.getElementById("klineChartContainer");
  container.innerHTML = '<div class="kline-loading" id="klineLoading">加载图表库...</div>';
  try { await loadECharts(); } catch (_) { container.innerHTML = '<div class="kline-loading">图表库加载失败，请检查网络</div>'; return; }
  container.innerHTML = '<div class="kline-loading" id="klineLoading">加载K线数据...</div>';
  try {
    const data = await fetchKlineData(asset.code, asset.market || "domestic", "6m");
    if (!data.kline || !data.kline.length) { container.innerHTML = '<div class="kline-loading">暂无K线数据</div>'; return; }
    const dates = data.kline.map(d => d[0]);
    const markers = prepareTransactionMarkers(asset, dates, data.kline);
    renderKlineChart(data.kline, markers);
  } catch (_) { container.innerHTML = '<div class="kline-loading">K线数据加载失败</div>'; }
}

function switchKlineRange(range) {
  if (range === klineCurrentRange || !klineCurrentAsset) return;
  klineCurrentRange = range;
  document.querySelectorAll("#klineTimeTabs button").forEach(btn => btn.classList.toggle("active", btn.dataset.range === range));
  const container = document.getElementById("klineChartContainer");
  if (klineChartInstance) { klineChartInstance.dispose(); klineChartInstance = null; }
  container.innerHTML = '<div class="kline-loading">加载K线数据...</div>';
  fetchKlineData(klineCurrentAsset.code, klineCurrentAsset.market || "domestic", range)
    .then(data => {
      if (!data.kline || !data.kline.length) { container.innerHTML = '<div class="kline-loading">暂无K线数据</div>'; return; }
      const dates = data.kline.map(d => d[0]);
      const markers = prepareTransactionMarkers(klineCurrentAsset, dates, data.kline);
      renderKlineChart(data.kline, markers);
    })
    .catch(() => { container.innerHTML = '<div class="kline-loading">K线数据加载失败</div>'; });
}

function calculateFinanceTodayPnl(asset, quote = {}, percentOverride = null) {
  const shares = Number(asset?.shares) || 0;
  const currentPrice = Number(quote?.price) || Number(asset?.currentPrice) || resolveAssetPrice(asset);
  const percent = percentOverride === null
    ? (quote?.changePct != null ? Number(quote.changePct) : Number(asset?.todayPnlPercent) || 0)
    : Number(percentOverride) || 0;
  if (!(shares > 0) || !(currentPrice > 0)) return Number(asset?.todayPnl) || 0;
  if (percent) return currentPrice * shares * percent / 100;
  if (quote?.changeAmt != null) return Number(quote.changeAmt) * shares;
  if (!percent && Number(asset?.todayPnl)) return Number(asset.todayPnl);
  return 0;
}

// ── 股票汇总栏 ──
function renderStockSummaryBar(assets, kind = "stock") {
  // Use resolveAssetPrice for consistent fallback chain
  const totalMV = assets.reduce((s, a) => {
    const price = resolveAssetPrice(a);
    const shares = Number(a.shares) || 0;
    return s + financeAmountToRmb(price * shares || financeAssetValue(a), a.currency);
  }, 0);
  const totalPnl = assets.reduce((s, a) => {
    const price = resolveAssetPrice(a);
    const cost = Number(a.costPrice) || 0;
    const shares = Number(a.shares) || 0;
    const pnl = (price > 0 && cost > 0 && shares > 0) ? (price - cost) * shares : (Number(a.pnl) || 0);
    return s + financeAmountToRmb(pnl, a.currency);
  }, 0);
  const totalTodayPnl = assets.reduce((s, a) => {
    const q = realtimeQuoteMap[a.code];
    const todayPnl = calculateFinanceTodayPnl(a, q);
    return s + financeAmountToRmb(todayPnl, a.currency);
  }, 0);
  const allFinanceValue = (state.financeAssets || []).reduce((s, a) => {
    const q = realtimeQuoteMap[a.code];
    const price = q?.price || Number(a.currentPrice) || 0;
    const shares = Number(a.shares) || 0;
    return s + financeAmountToRmb(price * shares || financeAssetValue(a), a.currency);
  }, 0);
  const posWeight = allFinanceValue > 0 ? (totalMV / allFinanceValue * 100) : 0;
  const pnlCls = totalPnl >= 0 ? "income" : "expense";
  const todayCls = totalTodayPnl >= 0 ? "income" : "expense";
  // 根据资产类型使用不同标签
  const labels = ({
    stock:     ["市值", "持仓盈亏", "当日盈亏", "仓位"],
    fund:      ["净值总额", "持有收益", "当日收益", "占比"],
    commodity: ["持有价值", "持仓盈亏", "当日盈亏", "占比"],
    futures:   ["合约价值", "持仓盈亏", "当日盈亏", "占比"],
    options:   ["权利金价值", "持仓盈亏", "当日盈亏", "占比"],
    crypto:    ["持有价值", "持仓盈亏", "当日盈亏", "占比"],
    cashflow:  ["本金总额", "累计收益", "当期收益", "占比"],
    custom:    ["持有价值", "累计收益", "当期收益", "占比"],
  })[kind] || ["总市值", "总盈亏", "当日盈亏", "占比"];
  return `<div class="stock-summary-bar">
    <div class="stock-summary-item"><span>${labels[0]}</span><strong>${money(totalMV, "CNY")}</strong></div>
    <div class="stock-summary-item"><span>${labels[1]}</span><strong class="${pnlCls}">${money(totalPnl, "CNY")}</strong></div>
    <div class="stock-summary-item"><span>${labels[2]}</span><strong class="${todayCls}">${money(totalTodayPnl, "CNY")}</strong></div>
    <div class="stock-summary-item"><span>${labels[3]}</span><strong>${posWeight.toFixed(2)}%</strong></div>
  </div>`;
}

// ── 股票列排序 ──
function sortStockAssets(assets) {
  const key = stockTableConfig.sortKey;
  if (!key) return assets;
  const dir = stockTableConfig.sortDir === "desc" ? -1 : 1;
  return [...assets].sort((a, b) => {
    let va, vb;
    switch (key) {
      case "name": va = a.name || ""; vb = b.name || ""; return va.localeCompare(vb, "zh-CN") * dir;
      case "shares": va = Number(a.shares) || 0; vb = Number(b.shares) || 0; break;
      case "price": va = Number(a.currentPrice) || 0; vb = Number(b.currentPrice) || 0; break;
      case "pnl": va = Number(a.pnl) || 0; vb = Number(b.pnl) || 0; break;
      case "todayPnl": va = calculateFinanceTodayPnl(a, realtimeQuoteMap[a.code]); vb = calculateFinanceTodayPnl(b, realtimeQuoteMap[b.code]); break;
      case "positionWeight": va = Number(a.positionWeight) || 0; vb = Number(b.positionWeight) || 0; break;
      case "code": va = a.code || ""; vb = b.code || ""; return va.localeCompare(vb) * dir;
      case "category": va = a.category || ""; vb = b.category || ""; return va.localeCompare(vb, "zh-CN") * dir;
      case "subcategory": va = a.subcategory || ""; vb = b.subcategory || ""; return va.localeCompare(vb, "zh-CN") * dir;
      case "tertiaryCategory": va = a.tertiaryCategory || ""; vb = b.tertiaryCategory || ""; return va.localeCompare(vb, "zh-CN") * dir;
      case "market": va = a.market || ""; vb = b.market || ""; return va.localeCompare(vb) * dir;
      case "currency": va = a.currency || ""; vb = b.currency || ""; return va.localeCompare(vb) * dir;
      case "account": {
        const acA = state.accounts.find((e) => e.id === a.accountId);
        const acB = state.accounts.find((e) => e.id === b.accountId);
        va = acA ? acA.name : ""; vb = acB ? acB.name : "";
        return va.localeCompare(vb, "zh-CN") * dir;
      }
      case "costPrice": va = Number(a.costPrice) || 0; vb = Number(b.costPrice) || 0; break;
      case "marketValue": va = financeAssetValue(a); vb = financeAssetValue(b); break;
      case "rmbValue": va = financeAssetValueRmb(a); vb = financeAssetValueRmb(b); break;
      default: return 0;
    }
    return (va - vb) * dir;
  });
}

// ── 股票卡片式单元格渲染 ──
function stockCellContent(item, colKey) {
  const account = state.accounts.find((e) => e.id === item.accountId);
  // 现价：实时价 → 昨收价 → 保存的currentPrice → 成本+盈亏反算
  const quoteData = realtimeQuoteMap[item.code] || {};
  const cp = resolveAssetPrice(item);
  const cost = Number(item.costPrice) || 0;
  const shares = Number(item.shares) || 0;
  // 使用实时计算的盈亏
  const pnl = (cp > 0 && cost > 0 && shares > 0) ? (cp - cost) * shares : (Number(item.pnl) || 0);
  const pnlPct = (cp > 0 && cost > 0) ? ((cp - cost) / cost * 100) : (Number(item.pnlPercent) || 0);
  const todayPnlPct = quoteData.changePct != null
    ? quoteData.changePct
    : (Number(item.todayPnlPercent) || 0);
  const todayPnl = calculateFinanceTodayPnl(item, quoteData, todayPnlPct);
  const pnlCls = pnl >= 0 ? "income" : "expense";
  const todayCls = todayPnl >= 0 ? "income" : "expense";
  switch (colKey) {
    case "name": {
      const nameLink = (item.kind === "stock" && item.code)
        ? `<a href="javascript:void(0)" data-action="show-kline-chart" data-id="${item.id}" class="kline-name-link">${item.name}</a>`
        : item.name;
      return `<div class="stock-cell-main">${nameLink}</div><div class="stock-cell-sub">${financeLocalMoney(cp * shares || financeAssetValue(item), item.currency)}</div>`;
    }
    case "shares": return `<div class="stock-cell-main">${shares}</div><div class="stock-cell-sub">${shares}</div>`;
    case "price": return `<div class="stock-cell-main">${cp > 0 ? cp.toFixed(3) : "--"}${quoteData.price ? ' <span class="holding-live-dot"></span>' : ''}</div><div class="stock-cell-sub">${cost > 0 ? cost.toFixed(3) : "--"}</div>`;
    case "pnl": return `<div class="stock-cell-main ${pnlCls}">${pnl >= 0 ? "+" : ""}${financeLocalMoney(pnl, item.currency)}</div><div class="stock-cell-sub ${pnlCls}">${pnl >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%</div>`;
    case "todayPnl": return `<div class="stock-cell-main ${todayCls}">${todayPnl !== 0 ? (todayPnl >= 0 ? "+" : "") + financeLocalMoney(todayPnl, item.currency) : "--"}</div><div class="stock-cell-sub ${todayCls}">${todayPnlPct ? (todayPnlPct >= 0 ? "+" : "") + todayPnlPct.toFixed(2) + "%" : "--"}</div>`;
    case "positionWeight": return `<div class="stock-cell-main">${(Number(item.positionWeight) || 0).toFixed(2)}%</div>`;
    case "code": return `<div class="stock-cell-main">${item.code || "-"}</div>`;
    case "category": return `<div class="stock-cell-main">${item.category || "-"}</div>`;
    case "subcategory": return `<div class="stock-cell-main">${item.subcategory || "-"}</div>`;
    case "tertiaryCategory": return `<div class="stock-cell-main">${item.tertiaryCategory || "-"}</div>`;
    case "market": return `<div class="stock-cell-main">${financeMarketLabel(item.market)}</div>`;
    case "currency": return `<div class="stock-cell-main">${item.currency || "CNH"}</div>`;
    case "account": return `<div class="stock-cell-main">${account?.name || "-"}</div>`;
    case "costPrice": return `<div class="stock-cell-main">${financeLocalMoney(financeAssetCost(item), item.currency)}</div>`;
    case "marketValue": return `<div class="stock-cell-main">${financeLocalMoney(financeAssetValue(item), item.currency)}</div>`;
    case "rmbValue": return `<div class="stock-cell-main">${money(financeAssetValueRmb(item), "CNY")}</div>`;
    case "actions": {
      return `<div class="stock-cell-actions"><button data-action="show-holding-detail" data-id="${item.id}">明细</button><button data-action="edit-finance-asset" data-id="${item.id}">编辑</button><button data-action="delete-finance-asset" data-id="${item.id}">删除</button></div>`;
    }
    default: return "";
  }
}

// ── 股票列可见性面板 ──
function renderStockColumnPanel() {
  return `<div class="stock-col-panel" id="stockColPanel" hidden>
    <strong>显示字段</strong>
    <div class="stock-col-panel-list">${STOCK_COLUMN_DEFS.map((col) => {
      const checked = stockTableConfig.visible[col.key] ? "checked" : "";
      const disabled = col.key === "actions" ? "disabled" : "";
      return `<label class="stock-col-check"><input type="checkbox" data-col="${col.key}" ${checked} ${disabled} />${col.label}</label>`;
    }).join("")}</div>
  </div>`;
}

function financeAssetTable(assets, kind) {
  // 所有资产类型统一使用卡片式布局
  const visibleCols = stockTableConfig.columns.filter((key) => stockTableConfig.visible[key]);
  const sorted = sortStockAssets(assets);
  const sortIcon = (key) => stockTableConfig.sortKey === key ? (stockTableConfig.sortDir === "asc" ? " ↑" : " ↓") : "";
  const kindLabel = financeKindLabel(kind);
  const panelId = "colPanel_" + kind;
  return `<div class="stock-table-wrap" data-kind="${kind}">
      <div class="stock-table-toolbar">
        <button type="button" class="stock-col-toggle-btn" data-panel="${panelId}">显示字段 ▾</button>
        <div class="stock-col-panel" id="${panelId}" hidden>
          <strong>显示字段</strong>
          <div class="stock-col-panel-list">${STOCK_COLUMN_DEFS.map((col) => {
            const checked = stockTableConfig.visible[col.key] ? "checked" : "";
            const disabled = col.key === "actions" ? "disabled" : "";
            return `<label class="stock-col-check"><input type="checkbox" data-col="${col.key}" ${checked} ${disabled} />${col.label}</label>`;
          }).join("")}</div>
        </div>
      </div>
      <table class="stock-card-table">
        <thead><tr>${visibleCols.map((key) => {
          const def = STOCK_COLUMN_DEFS.find((d) => d.key === key);
          const sortable = def?.sortable ? ' data-sort-key="' + key + '"' : "";
          const dragAttr = key !== "actions" ? ' draggable="true"' : "";
          return `<th${sortable}${dragAttr} data-col="${key}">${def?.label || key}${sortIcon(key)}</th>`;
        }).join("")}</tr></thead>
        <tbody>${sorted.map((item) =>
          `<tr data-asset-id="${item.id}">${visibleCols.map((key) => `<td data-col="${key}">${stockCellContent(item, key)}</td>`).join("")}</tr>`
        ).join("") || `<tr><td colspan="${visibleCols.length}" class="muted">暂无${kindLabel}资产</td></tr>`}</tbody>
      </table>
    </div>`;
}

function debts() {
  const payable = state.debts.filter((item) => item.category === "payable");
  const receivable = state.debts.filter((item) => item.category === "receivable");
  const payableTotal = payable.reduce((sum, item) => sum + debtPlan(item).totalAmount, 0);
  const payablePrincipal = payable.reduce((sum, item) => sum + (Number(item.principal) || 0), 0);
  const payableInterest = payable.reduce((sum, item) => sum + debtPlan(item).totalInterest, 0);
  const payableDebtRate = payablePrincipal ? payableInterest / payablePrincipal * 100 : 0;
  const receivableTotal = receivable.reduce((sum, item) => sum + debtPlan(item).totalAmount, 0);
  const receivablePrincipal = receivable.reduce((sum, item) => sum + (Number(item.principal) || 0), 0);
  const receivableInterest = receivable.reduce((sum, item) => sum + debtPlan(item).totalInterest, 0);
  return `<div class="debt-page">
    <section class="debt-hero">
      <div>
        <p class="eyebrow">债务模块</p>
        <h2>应付借入与应收借出管理</h2>
        <p class="muted">记录借入、借出、利息、附件和还款日期，按还款方式自动计算。</p>
      </div>
      <button class="primary" data-action="new-debt">新增债务</button>
    </section>
    <section class="ledger-kpi-grid simple-kpis debt-kpi-row">
      ${ledgerKpi("应付/借入总额", payableTotal, `${payable.length} 笔待管理`, "expense")}
      ${ledgerKpi("应付/借入总本金", payablePrincipal, "本金合计", "expense")}
      ${ledgerKpi("应付/借入总利息", payableInterest, "利息合计", "expense")}
      ${debtRateKpi("总债务利率", payableDebtRate, "总利息 / 总本金 * 100%", "expense")}
      ${debtRateKpi("日利率", payableDebtRate / 365, `日利息 ${money(payableInterest / 365)}`, "expense")}
      ${debtRateKpi("月利率", payableDebtRate / 12, `月利息 ${money(payableInterest / 12)}`, "expense")}
      ${debtRateKpi("年利率", payableDebtRate, `年利息 ${money(payableInterest)}`, "expense")}
    </section>
    <section class="ledger-kpi-grid simple-kpis debt-kpi-row">
      ${ledgerKpi("应收/借出总额", receivableTotal, `${receivable.length} 笔待回收`, "income")}
      ${ledgerKpi("应收/借出总本金", receivablePrincipal, "本金合计", "income")}
      ${ledgerKpi("应收/借出总利息", receivableInterest, "利息合计", "income")}
    </section>
    <section class="ledger-kpi-grid simple-kpis debt-kpi-row">
      ${ledgerKpi("净债务", receivableTotal - payableTotal, "应收/借出总额 - 应付/借入总额", receivableTotal >= payableTotal ? "income" : "expense")}
      ${ledgerKpi("净本金", payablePrincipal - receivablePrincipal, "应付/借入总本金 - 应收/借出总本金", payablePrincipal >= receivablePrincipal ? "expense" : "income")}
      ${ledgerKpi("净利息", payableInterest - receivableInterest, "应付/借入总利息 - 应收/借出总利息", payableInterest >= receivableInterest ? "expense" : "income")}
    </section>
    <div class="debt-columns">
      ${debtGroup("应付 / 借入", payable, "payable")}
      ${debtGroup("应收款 / 借出", receivable, "receivable")}
    </div>
  </div>`;
}

function debtGroup(title, rows, tone) {
  return `<section class="debt-group ${tone}">
    <div class="ledger-web-title"><h3>${title}</h3><span>${rows.length} 笔</span></div>
    <div class="debt-list">${rows.map(debtCard).join("") || `<p class="muted">暂无记录，点击新增债务添加。</p>`}</div>
  </section>`;
}

function debtCard(item) {
  const plan = debtPlan(item);
  const creditorName = item.creditorName || item.name || "未填写";
  const debtorName = item.debtorName || "未填写";
  return `<article class="debt-card" data-debt-id="${item.id}">
    <div>
      <strong>${creditorName} → ${debtorName}</strong>
      <span>${item.type} · ${repaymentMethodLabel(item.repaymentMethod)}</span>
      <div class="debt-actions">
        <button data-action="edit-debt" data-id="${item.id}">编辑</button>
        <button data-action="delete-debt" data-id="${item.id}">删除</button>
      </div>
    </div>
    <b class="${item.category === "payable" ? "expense" : "income"}">${money(plan.totalAmount)}</b>
    ${recordsRows([
      ["债权人/借款人", creditorName, "债务人/付款人", debtorName],
      ["本金", money(item.principal), "年利率", `${Number(item.annualRate).toFixed(2)}%`],
      ["总利息", money(plan.totalInterest), "期数", `${plan.months} 期`],
      ["每期金额", money(plan.monthlyPayment), "剩余金额", money(debtRemainingAmount(item, plan))],
      ["附件", item.attachment || "无", "备注", item.note || "无"],
    ])}
    ${debtPaymentSchedule(item, plan)}
  </article>`;
}

function debtPlan(item) {
  const principal = Number(item.principal) || 0;
  const annualRate = Number(item.annualRate) || 0;
  const months = Math.max(monthsBetween(item.startDate, item.dueDate), 1);
  const monthlyRate = annualRate / 100 / 12;
  if (item.repaymentMethod === "singlePayment") {
    const totalInterest = principal * annualRate / 100 / 12 * months;
    const totalAmount = principal + totalInterest;
    return {
      months: 1,
      monthlyPayment: totalAmount,
      totalAmount,
      totalInterest,
      schedule: [{ period: 1, dueDate: item.dueDate || item.startDate || today, amount: totalAmount }],
    };
  }
  if (item.repaymentMethod === "equalPrincipalInterest" && monthlyRate > 0) {
    const monthlyPayment = principal * monthlyRate * ((1 + monthlyRate) ** months) / (((1 + monthlyRate) ** months) - 1);
    const totalAmount = monthlyPayment * months;
    const schedule = Array.from({ length: months }, (_, index) => debtInstallment(item.startDate, index + 1, monthlyPayment));
    return { months, monthlyPayment, totalAmount, totalInterest: totalAmount - principal, schedule };
  }
  if (item.repaymentMethod === "interestOnly") {
    const monthlyInterest = principal * monthlyRate;
    const totalInterest = monthlyInterest * months;
    const schedule = Array.from({ length: months }, (_, index) => {
      const last = index === months - 1;
      return debtInstallment(item.startDate, index + 1, monthlyInterest + (last ? principal : 0));
    });
    return { months, monthlyPayment: monthlyInterest, totalAmount: principal + totalInterest, totalInterest, schedule };
  }
  const totalInterest = principal * annualRate / 100 / 12 * months;
  const totalAmount = principal + totalInterest;
  const monthlyPayment = totalAmount / months;
  const schedule = Array.from({ length: months }, (_, index) => debtInstallment(item.startDate, index + 1, monthlyPayment));
  return { months, monthlyPayment, totalAmount, totalInterest, schedule };
}

function debtRemainingAmount(item, plan = debtPlan(item)) {
  return Math.max((Number(plan.totalAmount) || 0) - (Number(item.paidAmount) || 0), 0);
}

function debtInstallment(startDate, period, amount) {
  const date = startDate ? new Date(`${startDate}T00:00:00`) : new Date();
  date.setMonth(date.getMonth() + period);
  return { period, dueDate: formatDate(date), amount };
}

function debtPaymentSchedule(item, plan) {
  return `<div class="debt-schedule">
    <div class="debt-schedule-head"><strong>每期还款计划</strong><span>${plan.schedule.length} 期</span></div>
    ${plan.schedule.map((row) => {
      const status = debtPaymentStatus(item, row);
      return `<div class="debt-installment">
        <span>第 ${row.period} 期</span>
        <b>${money(row.amount)}</b>
        <small>${row.dueDate}</small>
        <button class="payment-status ${status}" data-action="toggle-debt-payment" data-id="${item.id}" data-period="${row.period}">${debtStatusLabel(status)}</button>
      </div>`;
    }).join("")}
  </div>`;
}

function debtPaymentStatus(item, row) {
  const saved = item.payments?.[row.period];
  if (saved) return item.category === "receivable" && saved === "pending" ? "unpaid" : saved;
  const due = new Date(`${row.dueDate}T23:59:59`);
  return due < new Date() ? "overdue" : "unpaid";
}

function debtStatusLabel(status) {
  return ({ paid: "已还款", pending: "待还款", overdue: "逾期", unpaid: "未还款" })[status] || "未还款";
}

function nextDebtStatus(status, category) {
  const flow = category === "receivable"
    ? ["unpaid", "paid", "overdue"]
    : ["unpaid", "pending", "paid", "overdue"];
  return flow[(flow.indexOf(status) + 1) % flow.length] || "unpaid";
}

function monthsBetween(startDate, endDate) {
  const start = startDate ? new Date(`${startDate}T00:00:00`) : new Date();
  const end = endDate ? new Date(`${endDate}T00:00:00`) : start;
  const months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  return months + (end.getDate() > start.getDate() ? 1 : 0);
}

function repaymentMethodLabel(method) {
  return ({ equalPrincipalInterest: "等额本息", equalPrincipalEqualInterest: "等本等息", interestOnly: "先息后本", singlePayment: "一次性还款" })[method] || method;
}

function ledgerKpi(label, value, hint, tone, currency = filters.currency) {
  return `<article class="ledger-kpi ${tone}">
    <span>${label}</span>
    <strong>${money(value, currency)}</strong>
    <p>${hint}</p>
  </article>`;
}

function debtRateKpi(label, rate, hint, tone) {
  return `<article class="ledger-kpi debt-rate-kpi ${tone}">
    <span>${label}</span>
    <strong>${Number(rate || 0).toFixed(label === "日利率" ? 4 : 2)}%</strong>
    <p>${hint}</p>
  </article>`;
}

function ledgerPeriodOptionRow() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (ledgerPeriodMode === "day") {
    return ledgerDayCalendar();
  }
  if (ledgerPeriodMode === "month") {
    const options = Array.from({ length: month + 1 }, (_, index) => {
      const targetMonth = month - index;
      const value = `month-${year}-${String(targetMonth + 1).padStart(2, "0")}`;
      const label = index === 0 ? "本月" : index === 1 ? "上月" : `${targetMonth + 1}月`;
      return [value, label];
    });
    return `<div class="ledger-period-options">
      <span class="ledger-period-year">${year}年</span>
      ${options.map(([value, label]) => `<button data-action="ledger-period" data-period="${value}" class="${ledgerPeriod === value ? "active" : ""}">${label}</button>`).join("")}
    </div>`;
  }
  if (ledgerPeriodMode === "year") {
    const options = [["year-all", "所有"]];
    for (let item = year; item >= 2000; item -= 1) {
      options.push([`year-${item}`, item === year ? "今年" : item === year - 1 ? "去年" : `${item}年`]);
    }
    return `<div class="ledger-period-options ledger-year-options">
      ${options.map(([value, label]) => `<button data-action="ledger-period" data-period="${value}" class="${ledgerPeriod === value ? "active" : ""}">${label}</button>`).join("")}
    </div>`;
  }
  return `<div class="ledger-period-options"><span class="ledger-period-year">请选择开始和结束日期</span></div>`;
}

function ledgerDayCalendar() {
  const [year, month] = ledgerCalendarMonth.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const dayCount = new Date(year, month, 0).getDate();
  const today = formatDate(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = formatDate(yesterdayDate);
  const cells = [
    ...Array.from({ length: firstDay }, () => ""),
    ...Array.from({ length: dayCount }, (_, index) => `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`),
  ];
  const dailyTotals = new Map();
  state.records.forEach((record) => {
    if (!record.date?.startsWith(`${ledgerCalendarMonth}-`) || isFinanceRecord(record)) return;
    if (filters.account !== "all" && record.accountId !== filters.account) return;
    const item = dailyTotals.get(record.date) || { income: 0, expense: 0 };
    const value = convert(record.amount, record.currency);
    if (record.type === "income") item.income += value;
    if (record.type === "expense") item.expense += value;
    dailyTotals.set(record.date, item);
  });
  return `<div class="ledger-day-picker">
    <div class="ledger-day-calendar">
      <div class="ledger-calendar-head">
        <button type="button" data-action="ledger-calendar-month" data-offset="-1" title="上个月">‹</button>
        <strong>${year}年${month}月</strong>
        <button type="button" data-action="ledger-calendar-month" data-offset="1" title="下个月">›</button>
      </div>
      <div class="ledger-calendar-weekdays">${["日", "一", "二", "三", "四", "五", "六"].map((item) => `<span>${item}</span>`).join("")}</div>
      <div class="ledger-calendar-days">${cells.map((date) => {
        if (!date) return `<span></span>`;
        const totals = dailyTotals.get(date) || { income: 0, expense: 0 };
        return `<button type="button" data-action="ledger-day" data-date="${date}" class="${date === ledgerDayDate ? "active" : ""} ${date === today ? "today" : ""}" title="${date} 支出 ${money(totals.expense)}，收入 ${money(totals.income)}">
          <b>${Number(date.slice(-2))}</b>
          <small class="calendar-expense">支 ${compactMoney(totals.expense)}</small>
          <small class="calendar-income">收 ${compactMoney(totals.income)}</small>
        </button>`;
      }).join("")}</div>
    </div>
    ${ledgerDailyWealthTrend(dailyTotals, year, month, dayCount)}
    <div class="ledger-day-shortcuts">
      <button type="button" data-action="ledger-day" data-date="${today}" class="${ledgerDayDate === today ? "active" : ""}">今日</button>
      <button type="button" data-action="ledger-day" data-date="${yesterday}" class="${ledgerDayDate === yesterday ? "active" : ""}">昨日</button>
    </div>
  </div>`;
}

function ledgerDailyWealthTrend(dailyTotals, year, month, dayCount) {
  const width = 520;
  const height = 250;
  const padding = { top: 38, right: 18, bottom: 34, left: 62 };
  let cumulative = 0;
  const rows = Array.from({ length: dayCount }, (_, index) => {
    const day = index + 1;
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const totals = dailyTotals.get(date) || { income: 0, expense: 0 };
    cumulative += totals.income - totals.expense;
    return { day, date, value: cumulative };
  });
  const values = rows.map((item) => item.value);
  let minValue = Math.min(0, ...values);
  let maxValue = Math.max(0, ...values);
  if (minValue === maxValue) {
    const paddingValue = Math.max(Math.abs(maxValue) * 0.2, 1);
    minValue -= paddingValue;
    maxValue += paddingValue;
  }
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const x = (index) => padding.left + (index / Math.max(rows.length - 1, 1)) * plotWidth;
  const y = (value) => padding.top + ((maxValue - value) / (maxValue - minValue)) * plotHeight;
  const points = rows.map((item, index) => `${x(index).toFixed(1)},${y(item.value).toFixed(1)}`).join(" ");
  const selectedIndex = rows.findIndex((item) => item.date === ledgerDayDate);
  const selected = selectedIndex >= 0 ? rows[selectedIndex] : null;
  const yTicks = Array.from({ length: 5 }, (_, index) => maxValue - ((maxValue - minValue) * index) / 4);
  const xTickDays = [...new Set([1, 5, 10, 15, 20, 25, dayCount].filter((day) => day <= dayCount))];
  return `<section class="ledger-wealth-trend">
    <div class="ledger-wealth-trend-head">
      <div>
        <strong>财富增长趋势</strong>
        <span>每日净增长累计</span>
      </div>
      <b class="${cumulative < 0 ? "expense" : "income"}">${money(cumulative)}</b>
    </div>
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${year}年${month}月每日财富增长趋势">
      ${yTicks.map((tick) => `<g>
        <line x1="${padding.left}" y1="${y(tick)}" x2="${width - padding.right}" y2="${y(tick)}" />
        <text x="${padding.left - 8}" y="${y(tick) + 4}" text-anchor="end">${compactMoney(tick)}</text>
      </g>`).join("")}
      <line class="zero-line" x1="${padding.left}" y1="${y(0)}" x2="${width - padding.right}" y2="${y(0)}" />
      <polyline points="${points}" />
      ${rows.map((item, index) => `<circle class="${item.date === ledgerDayDate ? "selected" : ""}" cx="${x(index)}" cy="${y(item.value)}" r="${item.date === ledgerDayDate ? 4.5 : 2.5}">
        <title>${item.date} 累计增长 ${money(item.value)}</title>
      </circle>`).join("")}
      ${selected ? `<text class="selected-value" x="${x(selectedIndex)}" y="${Math.max(y(selected.value) - 10, 16)}" text-anchor="middle">${compactMoney(selected.value)}</text>` : ""}
      ${xTickDays.map((day) => `<text class="x-label" x="${x(day - 1)}" y="${height - 10}" text-anchor="middle">${day}日</text>`).join("")}
    </svg>
  </section>`;
}

function ledgerPeriodRange(period) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (ledgerPeriodMode === "day") {
    const selected = new Date(`${ledgerDayDate}T00:00:00`);
    const today = formatDate(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const label = ledgerDayDate === today ? "今日" : ledgerDayDate === formatDate(yesterday) ? "昨日" : ledgerDayDate;
    return { label, metricLabel: label, start: selected, end: new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 23, 59, 59), calendarDate: selected, granularity: "day" };
  }
  if (ledgerPeriodMode === "custom") {
    return {
      label: "自定义",
      metricLabel: "自定义",
      start: filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : new Date(year, month, 1),
      end: filters.endDate ? new Date(`${filters.endDate}T23:59:59`) : new Date(year, month + 1, 0),
      calendarDate: filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : now,
      granularity: "month",
    };
  }
  if (period === "year-all") {
    const recordDates = state.records.filter((record) => !isFinanceRecord(record)).map((record) => record.date).filter(Boolean).sort();
    const start = recordDates.length ? new Date(`${recordDates[0]}T00:00:00`) : new Date(year, 0, 1);
    return { label: "所有", metricLabel: "累计", start, end: now, calendarDate: now, granularity: "month" };
  }
  if (period.startsWith("year-")) {
    const selectedYear = Number(period.slice(5)) || year;
    return {
      label: `${selectedYear}年`,
      metricLabel: selectedYear === year ? "今年" : `${selectedYear}年`,
      start: new Date(selectedYear, 0, 1),
      end: selectedYear === year ? now : new Date(selectedYear, 11, 31, 23, 59, 59),
      calendarDate: new Date(selectedYear, 0, 1),
      granularity: "month",
    };
  }
  const match = period.match(/^month-(\d{4})-(\d{2})$/);
  const selectedYear = match ? Number(match[1]) : year;
  const selectedMonth = match ? Number(match[2]) - 1 : month;
  const isCurrent = selectedYear === year && selectedMonth === month;
  const isLast = selectedYear === new Date(year, month - 1, 1).getFullYear() && selectedMonth === new Date(year, month - 1, 1).getMonth();
  return {
    label: isCurrent ? "本月" : isLast ? "上月" : `${selectedYear}年${selectedMonth + 1}月`,
    metricLabel: isCurrent ? "本月" : isLast ? "上月" : `${selectedMonth + 1}月`,
    start: new Date(selectedYear, selectedMonth, 1),
    end: isCurrent ? now : new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59),
    calendarDate: new Date(selectedYear, selectedMonth, 1),
    granularity: "day",
  };
}

function recordInRange(record, range) {
  const date = new Date(`${record.date}T00:00:00`);
  return date >= range.start && date <= range.end;
}

function isFinanceRecord(record) {
  return ["理财收入", "理财亏损"].includes(record.category);
}

function ledgerSummaryItem(label, value) {
  return `<div><span>${label}</span><strong class="${value < 0 ? "negative" : ""}">${money(value)}</strong></div>`;
}

function sumRecordCategory(records, category) {
  return records.filter((record) => record.category === category).reduce((sum, record) => sum + convert(record.amount, record.currency), 0);
}

function sumRecordCategories(records, categories) {
  return records.filter((record) => categories.includes(record.category)).reduce((sum, record) => sum + convert(record.amount, record.currency), 0);
}

function expenseBreakdown(records) {
  return groupRecordRows(records, (record) => record.category, ["#6366f1", "#f43f5e", "#fbbf24", "#06b6d4", "#10b981", "#8b5cf6", "#ec4899", "#64748b"]);
}

function incomeSourceBreakdown(records) {
  const rows = [
    { name: "劳动收入", value: sumRecordCategory(records, "劳动收入"), count: records.filter((record) => record.category === "劳动收入").length, color: "#10b981" },
    { name: "资产收入", value: records.filter((record) => record.category !== "劳动收入").reduce((sum, record) => sum + convert(record.amount, record.currency), 0), count: records.filter((record) => record.category !== "劳动收入").length, color: "#6366f1" },
  ].filter((item) => item.value > 0);
  const total = rows.reduce((sum, item) => sum + item.value, 0) || 1;
  return rows.map((item) => ({ ...item, share: item.value / total }));
}

function expenseRankBreakdown(records) {
  const rows = [
    { name: "生活消费", value: sumRecordCategory(records, "生活消费"), count: records.filter((record) => record.category === "生活消费").length, color: "#ec4899" },
  ].filter((item) => item.value > 0);
  const total = rows.reduce((sum, item) => sum + item.value, 0) || 1;
  return rows.sort((a, b) => b.value - a.value).map((item) => ({ ...item, share: item.value / total }));
}

function ledgerYoyRows(period) {
  const current = ledgerPeriodTotals(period);
  const lastYear = ledgerPeriodTotals(previousYearRange(period));
  return [
    { label: "支出", current: current.expense, previous: lastYear.expense, tone: "expense" },
    { label: "收入", current: current.income, previous: lastYear.income, tone: "income" },
    { label: "结余", current: current.balance, previous: lastYear.balance, tone: current.balance >= 0 ? "income" : "expense" },
  ].map((row) => ({ ...row, change: row.previous ? (row.current - row.previous) / Math.abs(row.previous) : null }));
}

function ledgerPeriodTotals(period) {
  const records = state.records.filter((record) => {
    if (filters.account !== "all" && record.accountId !== filters.account) return false;
    return recordInRange(record, period) && !isFinanceRecord(record);
  });
  const income = records.filter((record) => record.type === "income").reduce((sum, record) => sum + convert(record.amount, record.currency), 0);
  const expense = records.filter((record) => record.type === "expense").reduce((sum, record) => sum + convert(record.amount, record.currency), 0);
  return { income, expense, balance: income - expense };
}

function previousYearRange(period) {
  return {
    ...period,
    label: `去年${period.label}`,
    start: shiftYear(period.start, -1),
    end: shiftYear(period.end, -1),
  };
}

function shiftYear(date, offset) {
  const shifted = new Date(date);
  shifted.setFullYear(shifted.getFullYear() + offset);
  return shifted;
}

function ledgerYoyRow(row) {
  const hasPrevious = row.change !== null;
  const positive = hasPrevious && row.change >= 0;
  return `<article class="yoy-row">
    <span>${row.label}</span>
    <strong class="${row.tone}">${money(row.current)}</strong>
    <small>去年同期 ${money(row.previous)}</small>
    <b class="${!hasPrevious ? "neutral" : positive ? "income" : "expense"}">${hasPrevious ? `${positive ? "+" : ""}${percent(row.change)}` : "暂无去年数据"}</b>
  </article>`;
}

function tagBreakdown(records) {
  return groupRecordRows(records, (record) => record.sub || record.note || "未标记", ["#06b6d4", "#f97316", "#3b82f6", "#fbbf24", "#10b981", "#f43f5e"]);
}

function groupRecordRows(records, getName, colors) {
  const total = records.reduce((sum, record) => sum + convert(record.amount, record.currency), 0) || 1;
  const map = new Map();
  records.forEach((record) => {
    const name = getName(record);
    const item = map.get(name) || { name, value: 0, count: 0 };
    item.value += convert(record.amount, record.currency);
    item.count += 1;
    map.set(name, item);
  });
  return Array.from(map.values()).sort((a, b) => b.value - a.value).map((item, index) => ({
    ...item,
    share: item.value / total,
    color: colors[index % colors.length],
  }));
}

function monthlyLedgerRows(records, period) {
  const map = new Map();
  eachMonthInRange(period).forEach((date) => {
    const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    map.set(label, { label, monthLabel: `${date.getFullYear()}年${date.getMonth() + 1}月`, income: 0, expense: 0 });
  });
  records.forEach((record) => {
    const date = new Date(`${record.date}T00:00:00`);
    const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const item = map.get(label) || { label, monthLabel: `${date.getFullYear()}年${date.getMonth() + 1}月`, income: 0, expense: 0 };
    const value = convert(record.amount, record.currency);
    if (record.type === "income") item.income += value;
    if (record.type === "expense") item.expense += value;
    map.set(label, item);
  });
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label)).map((item) => ({ ...item, balance: item.income - item.expense }));
}

function ledgerTrendRows(records, period) {
  if (period.granularity !== "day") return monthlyLedgerRows(records, period);
  const map = new Map();
  const cursor = new Date(period.start.getFullYear(), period.start.getMonth(), period.start.getDate());
  const end = new Date(period.end.getFullYear(), period.end.getMonth(), period.end.getDate());
  while (cursor <= end) {
    const label = formatDate(cursor);
    map.set(label, { label, monthLabel: `${cursor.getMonth() + 1}月${cursor.getDate()}日`, income: 0, expense: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  records.forEach((record) => {
    const item = map.get(record.date);
    if (!item) return;
    const value = convert(record.amount, record.currency);
    if (record.type === "income") item.income += value;
    if (record.type === "expense") item.expense += value;
  });
  return Array.from(map.values()).map((item) => ({ ...item, balance: item.income - item.expense }));
}

function eachMonthInRange(period) {
  const todayDate = new Date();
  const end = period.end > todayDate ? todayDate : period.end;
  const months = [];
  let cursor = new Date(period.start.getFullYear(), period.start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= last) {
    months.push(new Date(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return months;
}

function expenseBarChart(rows) {
  const ordered = [...rows].sort((a, b) => a.label.localeCompare(b.label));
  const max = Math.max(...ordered.map((row) => row.expense), 1);
  return `<div class="ledger-bars">
    ${ordered.map((row) => `<div><i style="--height:${Math.max(row.expense / max * 100, 4)}%"></i><span>${Number(row.label.slice(3))}</span></div>`).join("")}
  </div>`;
}

function ledgerTrendChart(rows, mode, labels = { expense: "支出", income: "收入", balance: "结余" }) {
  const ordered = [...rows].sort((a, b) => a.label.localeCompare(b.label));
  const valueOf = (row) => mode === "income" ? row.income : mode === "balance" ? row.balance : row.expense;
  if (!ordered.length) return `<div class="empty-summary"><span>∅</span><p>当前周期暂无${labels[mode]}数据</p></div>`;
  const max = Math.max(...ordered.map((row) => Math.abs(valueOf(row))), 1);
  const ticks = [max, max * 0.75, max * 0.5, max * 0.25, 0];
  return `<div class="trend-chart-scroll">
    <div class="trend-chart-grid" style="--columns:${ordered.length}">
      <div class="trend-axis" aria-hidden="true">
        ${ticks.map((tick) => `<span>${compactMoney(tick)}</span>`).join("")}
      </div>
      <div class="ledger-bars trend-bars">
        ${ordered.map((row) => {
          const value = valueOf(row);
          const tone = value === 0 ? `${mode} zero` : value >= 0 ? mode : "expense";
          const height = value === 0 ? 0 : Math.max(Math.abs(value) / max * 100, 4);
          return `<div title="${row.monthLabel} ${row.label} ${labels[mode]} ${money(value)}">
            <i class="${tone}" style="--height:${height}%"><b>${money(value)}</b></i>
            <span>${row.monthLabel}</span>
          </div>`;
        }).join("")}
      </div>
    </div>
  </div>`;
}

function assetTrendChart(rows, netAssets) {
  const ordered = [...rows].sort((a, b) => a.label.localeCompare(b.label));
  const values = ordered.reduce((list, row, index) => {
    const previous = list[index - 1] ?? netAssets - ordered.reduce((sum, item) => sum + item.balance, 0);
    list.push(previous + row.balance);
    return list;
  }, []);
  const width = 360;
  const height = 120;
  const min = Math.min(...values, netAssets - 1);
  const max = Math.max(...values, netAssets + 1);
  const points = values.map((value, index) => {
    const x = 12 + (index / Math.max(values.length - 1, 1)) * (width - 24);
    const y = height - 18 - ((value - min) / Math.max(max - min, 1)) * (height - 36);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return `<svg class="ledger-line" viewBox="0 0 ${width} ${height}" role="img" aria-label="资产走势">
    <polyline points="${points}" />
  </svg>`;
}

function ledgerDonut(rows, label) {
  let offset = 0;
  const segments = rows.length ? rows.map((row) => {
    const start = offset;
    const end = offset + row.share * 100;
    offset = end;
    return `${row.color} ${start}% ${end}%`;
  }).join(", ") : "#c7d2fe 0% 100%";
  return `<div class="ledger-donut" style="--segments:${segments}"><span>${label}</span></div>`;
}

function ledgerCategoryRow(item, total) {
  return `<article class="category-row">
    <div class="category-icon" style="--tone:${item.color}">${item.name.slice(0, 1)}</div>
    <div>
      <div><strong>${item.name}</strong><span>${percent(item.share)}</span></div>
      <small>${item.count}笔 · 日均 ${money(item.value / Math.max(item.count, 1))}</small>
      <i style="--width:${Math.max(item.value / Math.max(total, 1) * 100, 4)}%"></i>
    </div>
    <b>${money(-item.value)}</b>
  </article>`;
}

function analysis(data) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  /* ---- 计算期间范围 ---- */
  let pStart, pEnd, pLabel, pMetricLabel;
  if (analysisPeriodMode === "day") {
    pStart = new Date(year, month, now.getDate());
    pEnd = new Date(year, month, now.getDate(), 23, 59, 59);
    pLabel = `${month + 1}月${now.getDate()}日`;
    pMetricLabel = "今日";
  } else if (analysisPeriodMode === "month") {
    const m = analysisPeriod.match(/^(\d{4})-(\d{2})$/);
    const sy = m ? Number(m[1]) : year;
    const sm = m ? Number(m[2]) - 1 : month;
    const isCur = sy === year && sm === month;
    pStart = new Date(sy, sm, 1);
    pEnd = isCur ? now : new Date(sy, sm + 1, 0, 23, 59, 59);
    pLabel = isCur ? "本月" : `${sy}年${sm + 1}月`;
    pMetricLabel = pLabel;
  } else if (analysisPeriodMode === "year") {
    const sy = Number(analysisPeriod) || year;
    const isCur = sy === year;
    pStart = new Date(sy, 0, 1);
    pEnd = isCur ? now : new Date(sy, 11, 31, 23, 59, 59);
    pLabel = isCur ? "今年" : `${sy}年`;
    pMetricLabel = pLabel;
  } else {
    pStart = filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : new Date(year, 0, 1);
    pEnd = filters.endDate ? new Date(`${filters.endDate}T23:59:59`) : now;
    pLabel = "自定义";
    pMetricLabel = "自定义";
  }

  /* ---- 天数计算 ---- */
  const daysElapsed = Math.max(Math.floor((Math.min(pEnd, now) - pStart) / 86400000) + 1, 1);
  const daysTotal = Math.max(Math.floor((pEnd - pStart) / 86400000) + 1, 1);
  const yearFraction = daysElapsed / (new Date(year, 11, 31) - new Date(year, 0, 1) + 1) * 365;

  /* ---- 收支分析：按期间筛选 ---- */
  const periodRecords = state.records.filter((r) => {
    const d = new Date(`${r.date}T00:00:00`);
    return d >= pStart && d <= pEnd;
  });
  const ledgerRecords = periodRecords.filter((r) => !isFinanceRecord(r));
  const incomeRecords = ledgerRecords.filter((r) => r.type === "income");
  const expenseRecords = ledgerRecords.filter((r) => r.type === "expense");
  const ledgerIncome = incomeRecords.reduce((s, r) => s + convert(r.amount, r.currency), 0);
  const ledgerExpense = expenseRecords.reduce((s, r) => s + convert(r.amount, r.currency), 0);
  const ledgerBalance = ledgerIncome - ledgerExpense;
  const laborIncome = incomeRecords.filter((r) => r.category === "劳动收入").reduce((s, r) => s + convert(r.amount, r.currency), 0);

  /* ---- 理财模块：浮动盈亏 ---- */
  const assets = state.financeAssets || [];
  const totalValue = assets.reduce((s, a) => s + financeAssetValueRmb(a), 0);
  const totalCost = assets.reduce((s, a) => s + financeAssetCostRmb(a), 0);
  const totalPnl = assets.reduce((s, a) => s + financeAmountToRmb(a.pnl, a.currency), 0);
  const financeIncomeForPeriod = totalPnl >= 0 ? totalPnl : 0;
  const financeLossForPeriod = totalPnl < 0 ? Math.abs(totalPnl) : 0;

  /* ---- 年度净资产增值 ---- */
  const annualNetGrowth = data.analysisStats.annualNetGrowth;
  const annualRate = data.initialAssets ? annualNetGrowth / data.initialAssets : 0;

  /* ---- 债务模块 ---- */
  const allDebts = state.debts || [];
  const payable = allDebts.filter((d) => d.category === "payable");
  const receivable = allDebts.filter((d) => d.category === "receivable");
  const payableTotalAll = payable.reduce((s, d) => s + debtPlan(d).totalAmount, 0);
  const receivableTotalAll = receivable.reduce((s, d) => s + debtPlan(d).totalAmount, 0);
  const payableInterestTotal = payable.reduce((s, d) => s + debtPlan(d).totalInterest, 0);
  const receivableInterestTotal = receivable.reduce((s, d) => s + debtPlan(d).totalInterest, 0);
  const payablePrincipalAll = payable.reduce((s, d) => s + (Number(d.principal) || 0), 0);
  const receivablePrincipalAll = receivable.reduce((s, d) => s + (Number(d.principal) || 0), 0);

  /* ---- 期间利息（按比例） ---- */
  const periodInterest = payableInterestTotal * (yearFraction / 365);
  const periodReceivableInterest = receivableInterestTotal * (yearFraction / 365);

  /* ---- 收入构成饼图 ---- */
  const incTotal = laborIncome + financeIncomeForPeriod;
  const incPcts = incTotal > 0
    ? [laborIncome / incTotal * 100, financeIncomeForPeriod / incTotal * 100]
    : [50, 50];
  const pR = 68, pCx = 80, pCy = 80;
  const pC = 2 * Math.PI * pR;
  const incSegs = incTotal > 0
    ? [
        { pct: incPcts[0], color: "#10b981", label: "劳动收入", val: laborIncome },
        { pct: incPcts[1], color: "#6366f1", label: "理财收入", val: financeIncomeForPeriod },
      ]
    : [];
  let incOffset = 0;
  const incCircles = incSegs.map((seg) => {
    const s = (seg.pct / 100) * pC;
    const c = `<circle cx="${pCx}" cy="${pCy}" r="${pR}" fill="none"
      stroke="${seg.color}" stroke-width="24"
      stroke-dasharray="${s.toFixed(2)} ${(pC - s).toFixed(2)}"
      stroke-dashoffset="${(-incOffset).toFixed(2)}"
      transform="rotate(-90 ${pCx} ${pCy})"/>`;
    incOffset += s;
    return c;
  }).join("\n");

  /* ---- 支出构成饼图 ---- */
  const expTotal = ledgerExpense + financeLossForPeriod + periodInterest;
  const expPcts = expTotal > 0
    ? [ledgerExpense / expTotal * 100, financeLossForPeriod / expTotal * 100, periodInterest / expTotal * 100]
    : [33.3, 33.3, 33.4];
  const expSegs = expTotal > 0
    ? [
        { pct: expPcts[0], color: "#f43f5e", label: "消费支出", val: ledgerExpense },
        { pct: expPcts[1], color: "#f59e0b", label: "理财亏损", val: financeLossForPeriod },
        { pct: expPcts[2], color: "#ef4444", label: "债务利息", val: periodInterest },
      ]
    : [];
  let expOffset = 0;
  const expCircles = expSegs.map((seg) => {
    const s = (seg.pct / 100) * pC;
    const c = `<circle cx="${pCx}" cy="${pCy}" r="${pR}" fill="none"
      stroke="${seg.color}" stroke-width="24"
      stroke-dasharray="${s.toFixed(2)} ${(pC - s).toFixed(2)}"
      stroke-dashoffset="${(-expOffset).toFixed(2)}"
      transform="rotate(-90 ${pCx} ${pCy})"/>`;
    expOffset += s;
    return c;
  }).join("\n");

  /* ---- 期间选项生成 ---- */
  let periodOptionHtml = "";
  if (analysisPeriodMode === "day") {
    periodOptionHtml = `<span class="badge">${year}年${month + 1}月${now.getDate()}日</span>`;
  } else if (analysisPeriodMode === "month") {
    const options = Array.from({ length: month + 1 }, (_, i) => {
      const tm = month - i;
      const v = `${year}-${String(tm + 1).padStart(2, "0")}`;
      const l = i === 0 ? "本月" : i === 1 ? "上月" : `${tm + 1}月`;
      return [v, l];
    });
    periodOptionHtml = `<div class="ledger-period-options">
      <span class="ledger-period-year">${year}年</span>
      ${options.map(([v, l]) => `<button data-action="analysis-period" data-period="${v}" class="${analysisPeriod === v ? 'active' : ''}">${l}</button>`).join("")}
    </div>`;
  } else if (analysisPeriodMode === "year") {
    const options = [];
    for (let y = year; y >= Math.min(year, 2020); y--) {
      options.push([String(y), y === year ? "今年" : y === year - 1 ? "去年" : `${y}年`]);
    }
    periodOptionHtml = `<div class="ledger-period-options">
      ${options.map(([v, l]) => `<button data-action="analysis-period" data-period="${v}" class="${analysisPeriod === v ? 'active' : ''}">${l}</button>`).join("")}
    </div>`;
  } else {
    periodOptionHtml = `<div class="ledger-period-options"><span class="ledger-period-year">自定义日期范围</span></div>`;
  }

  /* ---- 增长趋势（根据筛选模式切换） ---- */
  const currentMonth = now.getMonth();
  let trendLabels = [], growthSeries = [];

  if (analysisPeriodMode === "day") {
    // 日模式：当月每天
    const daysInMonth = new Date(year, currentMonth + 1, 0).getDate();
    trendLabels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
    growthSeries = Array.from({ length: daysInMonth }, (_, i) => {
      const dayStr = `${year}-${String(currentMonth + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
      const dayRecords = state.records.filter((r) => r.date === dayStr && r.type !== "transfer");
      const inc = dayRecords.filter((r) => r.type === "income").reduce((s, r) => s + convert(r.amount, r.currency), 0);
      const exp = dayRecords.filter((r) => r.type === "expense").reduce((s, r) => s + convert(r.amount, r.currency), 0);
      return inc - exp;
    });
    var trendSvgW = 30 + 10 + Math.max(daysInMonth - 1, 1) * 22;
  } else if (analysisPeriodMode === "month") {
    // 月模式：当年每月
    trendLabels = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);
    const months = monthlySeries();
    growthSeries = months.map((m) => m.income - m.expense);
    var trendSvgW = 30 + 10 + 11 * 52;
  } else {
    // 年模式
    const startYear = 2020;
    const years = Array.from({ length: year - startYear + 1 }, (_, i) => startYear + i);
    trendLabels = years.map((y) => `${y}`);
    growthSeries = years.map((y) => {
      const yRecords = state.records.filter((r) => {
        const d = new Date(r.date);
        return d.getFullYear() === y && r.type !== "transfer";
      });
      const inc = yRecords.filter((r) => r.type === "income").reduce((s, r) => s + convert(r.amount, r.currency), 0);
      const exp = yRecords.filter((r) => r.type === "expense").reduce((s, r) => s + convert(r.amount, r.currency), 0);
      return inc - exp;
    });
    var trendSvgW = 30 + 10 + Math.max(years.length - 1, 1) * 80;
  }

  const maxAbsVal = Math.max(...growthSeries.map((v) => Math.abs(v)), 1);
  const svgH = 200, padT = 20, padB = 30, padL = 30, padR = 10;
  const plotW = trendSvgW - padL - padR;
  const plotH = svgH - padT - padB;
  const zeroY = padT + plotH / 2;
  const nPts = trendLabels.length || 1;
  const xStep = nPts > 1 ? plotW / (nPts - 1) : 0;
  const yOf = (v) => zeroY - (v / maxAbsVal) * (plotH / 2);
  const growthPts = growthSeries.map((v, i) => [padL + i * xStep, yOf(v)]);
  const toPolyline = (pts) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const toArea = (pts) => {
    if (!pts.length) return "";
    const base = `${padL},${zeroY.toFixed(1)} `;
    const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const end = ` ${pts[pts.length - 1][0].toFixed(1)},${zeroY.toFixed(1)}`;
    return base + line + end;
  };

    return `<div class="analysis-page">

    <!-- 筛选 Tab -->
    <section class="analysis-filter-bar">
      <div class="ledger-periods ledger-mode-tabs">
        ${[
          ["day", "日常"],
          ["month", "月统计"],
          ["year", "年统计"],
          ["custom", "自定义"],
        ].map(([id, label]) => `<button data-action="analysis-mode" data-mode="${id}" class="${analysisPeriodMode === id ? "active" : ""}">${label}</button>`).join("")}
      </div>
      ${periodOptionHtml}
      <div class="analysis-custom-range ${analysisPeriodMode === 'custom' ? 'active' : ''}">
        <input id="analysisStartDate" type="date" value="${filters.startDate}" />
        <input id="analysisEndDate" type="date" value="${filters.endDate}" />
      </div>
    </section>

    <!-- 收支分析 -->
    <section class="analysis-row analysis-dual-pie-row card">
      <h3 class="analysis-dual-pie-title">收支分析</h3>
      <div class="analysis-kpi-bar">
        <div class="analysis-kpi-item" style="--accent:#10b981">
          <span>总收入</span>
          <strong class="income">${money(ledgerIncome)}</strong>
        </div>
        <div class="analysis-kpi-item" style="--accent:#f43f5e">
          <span>总消费</span>
          <strong class="expense">${money(ledgerExpense)}</strong>
        </div>
        <div class="analysis-kpi-item" style="--accent:${ledgerBalance >= 0 ? '#10b981' : '#f43f5e'}">
          <span>结余</span>
          <strong class="${ledgerBalance >= 0 ? 'income' : 'expense'}">${money(ledgerBalance)}</strong>
        </div>
      </div>
      <div class="analysis-dual-pie-grid">
        <div class="analysis-pie-card">
          <h4>收入构成</h4>
          <div class="analysis-pie-wrap">
            <svg viewBox="0 0 160 160" class="analysis-pie-svg">
              <circle cx="${pCx}" cy="${pCy}" r="${pR}" fill="none" stroke="var(--panel-3)" stroke-width="24"/>
              ${incCircles}
              <text x="${pCx}" y="${pCy - 6}" text-anchor="middle" class="pie-center-label">${incTotal > 0 ? "收入" : "暂无"}</text>
              <text x="${pCx}" y="${pCy + 12}" text-anchor="middle" class="pie-center-sub">构成</text>
            </svg>
            <div class="analysis-pie-legend">
              ${incSegs.map((seg) => `<div class="pie-legend-item">
                <span class="pie-dot" style="background:${seg.color}"></span>
                <span>${seg.label}</span>
                <strong>${seg.pct.toFixed(1)}%</strong>
              </div>`).join("")}
            </div>
          </div>
          <div class="analysis-pie-amounts">
            ${incSegs.map((seg) => `<div class="pie-amount-item">
              <span class="pie-dot" style="background:${seg.color}"></span>
              <span>${seg.label}</span>
              <strong>${money(seg.val)}</strong>
            </div>`).join("")}
          </div>
        </div>
        <div class="analysis-pie-card">
          <h4>支出构成</h4>
          <div class="analysis-pie-wrap">
            <svg viewBox="0 0 160 160" class="analysis-pie-svg">
              <circle cx="${pCx}" cy="${pCy}" r="${pR}" fill="none" stroke="var(--panel-3)" stroke-width="24"/>
              ${expCircles}
              <text x="${pCx}" y="${pCy - 6}" text-anchor="middle" class="pie-center-label">${expTotal > 0 ? "支出" : "暂无"}</text>
              <text x="${pCx}" y="${pCy + 12}" text-anchor="middle" class="pie-center-sub">构成</text>
            </svg>
            <div class="analysis-pie-legend">
              ${expSegs.map((seg) => `<div class="pie-legend-item">
                <span class="pie-dot" style="background:${seg.color}"></span>
                <span>${seg.label}</span>
                <strong>${seg.pct.toFixed(1)}%</strong>
              </div>`).join("")}
            </div>
          </div>
          <div class="analysis-pie-amounts">
            ${expSegs.map((seg) => `<div class="pie-amount-item">
              <span class="pie-dot" style="background:${seg.color}"></span>
              <span>${seg.label}</span>
              <strong>${money(seg.val)}</strong>
            </div>`).join("")}
          </div>
        </div>
      </div>
    </section>

    <!-- 理财分析 -->
    <section class="analysis-row analysis-finance-row card">
      <h3>理财分析</h3>
      <div class="analysis-finance-grid">
        <div class="analysis-finance-col">
          <div class="consumption-header" style="--tone:#6366f1">
            <span>总盈亏</span>
            <strong class="${totalPnl >= 0 ? 'income' : 'expense'}">${money(totalPnl)}</strong>
          </div>
          <div class="consumption-bar-track">
            <i style="--width:${Math.min(Math.abs(totalPnl) / Math.max(totalCost, 1) * 100, 100)}%;--tone:${totalPnl >= 0 ? '#10b981' : '#f43f5e'}"></i>
          </div>
          <div class="debt-detail-mini">
            <div><span>持仓市值</span><b>${money(totalValue)}</b></div>
            <div><span>持仓成本</span><b>${money(totalCost)}</b></div>
            <div><span>资产总数</span><b>${assets.length}</b></div>
            <div><span>收益率</span><b class="${totalPnl >= 0 ? 'income' : 'expense'}">${totalCost > 0 ? (totalPnl / totalCost * 100).toFixed(2) + '%' : '--'}</b></div>
          </div>
        </div>
      </div>
    </section>

    <!-- 债务分析 -->
    <section class="analysis-row analysis-debt-row card">
      <h3>债务分析</h3>
      <div class="analysis-finance-grid">
        <div class="analysis-finance-col">
          <div class="consumption-header" style="--tone:#f59e0b">
            <span>债务总额</span>
            <strong>${money(payableTotalAll)}</strong>
          </div>
          <div class="consumption-bar-track">
            <i style="--width:${Math.min(payableTotalAll / Math.max(payableTotalAll + receivableTotalAll, 1) * 100, 100)}%;--tone:#f59e0b"></i>
          </div>
          <div class="debt-detail-mini">
            <div><span>应付总额</span><b>${money(payableTotalAll)}</b></div>
            <div><span>应收总额</span><b>${money(receivableTotalAll)}</b></div>
            <div><span>净债务</span><b class="${payableTotalAll - receivableTotalAll > 0 ? 'expense' : 'income'}">${money(payableTotalAll - receivableTotalAll)}</b></div>
            <div><span>总笔数</span><b>${payable.length + receivable.length}</b></div>
          </div>
        </div>
        <div class="analysis-finance-col">
          <div class="consumption-header" style="--tone:#ef4444">
            <span>债务利息</span>
            <strong>${money(payableInterestTotal)}</strong>
          </div>
          <div class="consumption-bar-track">
            <i style="--width:${Math.min(payableInterestTotal / Math.max(payableTotalAll, 1) * 100, 100)}%;--tone:#ef4444"></i>
          </div>
          <div class="debt-detail-mini">
            <div><span>应付利息</span><b>${money(payableInterestTotal)}</b></div>
            <div><span>应收利息</span><b>${money(receivableInterestTotal)}</b></div>
            <div><span>当年利息</span><b>${money(periodInterest)}</b></div>
            <div><span>当年应收</span><b>${money(periodReceivableInterest)}</b></div>
          </div>
        </div>
      </div>
    </section>

    <!-- 第四行：增长趋势 -->
    <section class="analysis-row analysis-trend-row card">
      <div class="analysis-trend-head">
        <h3>收支趋势</h3>
        <div class="analysis-monthly-legend">
          <span><i style="--tone:#6366f1"></i>增长</span>
        </div>
      </div>
      <div class="analysis-trend-chart trend-scrollable">
        <svg viewBox="0 0 ${trendSvgW} ${svgH}" class="trend-line-svg" preserveAspectRatio="none" style="min-width:${trendSvgW}px">
          <defs>
            <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#10b981"/>
              <stop offset="50%" stop-color="#10b981" stop-opacity="0.02"/>
              <stop offset="50%" stop-color="#f43f5e" stop-opacity="0.02"/>
              <stop offset="100%" stop-color="#f43f5e"/>
            </linearGradient>
          </defs>
          <!-- Zero line -->
          <line x1="${padL}" y1="${zeroY.toFixed(1)}" x2="${trendSvgW - padR}" y2="${zeroY.toFixed(1)}" stroke="var(--line)" stroke-width="1"/>
          <!-- Positive/negative boundary lines -->
          <line x1="${padL}" y1="${padT}" x2="${trendSvgW - padR}" y2="${padT}" stroke="var(--line)" stroke-width="0.5" stroke-dasharray="4,4"/>
          <line x1="${padL}" y1="${(padT + plotH).toFixed(1)}" x2="${trendSvgW - padR}" y2="${(padT + plotH).toFixed(1)}" stroke="var(--line)" stroke-width="0.5" stroke-dasharray="4,4"/>
          <!-- Area fill -->
          <polygon points="${toArea(growthPts)}" fill="url(#growthGrad)" opacity="0.2"/>
          <!-- Growth line -->
          <polyline points="${toPolyline(growthPts)}" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
          <!-- Data points -->
          ${growthPts.map(([x, y], i) => {
            const v = growthSeries[i];
            const clr = v >= 0 ? "#10b981" : "#f43f5e";
            return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="${clr}" stroke="var(--panel)" stroke-width="1.5"><title>${trendLabels[i]}: ${v >= 0 ? "+" : ""}${money(v)}</title></circle>`;
          }).join("")}
        </svg>
        <div class="trend-x-labels" style="min-width:${trendSvgW}px">
          ${trendLabels.map((l) => `<span>${l}</span>`).join("")}
        </div>
      </div>
    </section>

  </div>`;
}

function accounts() {
  // 计算每个账户的税费汇总
  const accountFees = state.accounts.map((a) => {
    const accountAssets = (state.financeAssets || []).filter((item) => item.accountId === a.id);
    const stockAssets = accountAssets.filter((item) => item.kind === "stock" && item.market === "domestic");
    const totalFees = stockAssets.reduce((sum, item) => sum + calculateAssetFeeSummary(item).total, 0);
    return { account: a, stockCount: stockAssets.length, totalFees, assets: accountAssets };
  });

  return `<section class="card">
    <div class="section-title">
      <h2>多账户 + 多币种</h2>
      <div class="section-actions">
        <span class="badge">原始流水永远保留原币种</span>
        <button class="primary" data-action="new-account">新增</button>
      </div>
    </div>
    <table class="table"><thead><tr><th>账户</th><th>所有人</th><th>币种</th><th>类型</th><th>余额</th><th>负债</th><th>股票税费</th><th>操作</th></tr></thead>
    <tbody>${accountFees.map(({ account: a, stockCount, totalFees }) => `<tr>
      <td>${a.name}</td>
      <td>${a.owner}</td>
      <td>${a.currency}</td>
      <td>${a.type}</td>
      <td>${money(convert(a.balance, a.currency))}</td>
      <td>${money(convert(a.liability, a.currency))}</td>
      <td class="${stockCount > 0 ? 'fee-cell' : ''}">
        ${stockCount > 0 ? `${money(totalFees, a.currency)}<button class="fee-detail-btn" data-action="show-account-fees" data-account-id="${a.id}">详情</button>` : '-'}
      </td>
      <td class="table-actions">
        <button data-action="edit-account" data-id="${a.id}">编辑</button>
        <button data-action="delete-account" data-id="${a.id}">删除</button>
      </td>
    </tr>`).join("")}</tbody></table>
  </section>`;
}

function assetClasses() {
  const now = new Date();
  const year = now.getFullYear();
  const currentMonth = now.getMonth();
  const visibleClasses = state.assetClasses.filter((c) => c.visible !== false);
  const totalValue = visibleClasses.reduce((sum, item) => sum + Math.max(Number(item.value) || 0, 0), 0);

  /* ---- 期间筛选 ---- */
  let pStart, pEnd, pLabel;
  if (analysisPeriodMode === "day") {
    pStart = new Date(year, currentMonth, now.getDate());
    pEnd = new Date(year, currentMonth, now.getDate(), 23, 59, 59);
    pLabel = `${currentMonth + 1}月${now.getDate()}日`;
  } else if (analysisPeriodMode === "month") {
    const pm = parseInt((analysisPeriod || "").split("-")[1], 10) - 1;
    pStart = new Date(year, isNaN(pm) ? currentMonth : pm, 1);
    pEnd = new Date(year, (isNaN(pm) ? currentMonth : pm) + 1, 0, 23, 59, 59);
    pLabel = `${(isNaN(pm) ? currentMonth : pm) + 1}月`;
  } else if (analysisPeriodMode === "year") {
    pStart = new Date(year, 0, 1);
    pEnd = new Date(year, 11, 31, 23, 59, 59);
    pLabel = `${year}年`;
  } else {
    pStart = new Date(year, 0, 1);
    pEnd = now;
    pLabel = "自定义";
  }

  /* ---- 饼图：各类别占比 ---- */
  const pR = 80, pCx = 100, pCy = 100;
  const pCirc = 2 * Math.PI * pR;
  const pieSegs = totalValue > 0
    ? visibleClasses.filter((c) => (Number(c.value) || 0) > 0).map((c) => ({
        pct: (Number(c.value) || 0) / totalValue * 100,
        color: c.color || "#6366f1",
        label: c.name,
        val: Number(c.value) || 0,
      }))
    : [];
  let pieOffset = 0;
  const pieCircles = pieSegs.map((seg) => {
    const s = (seg.pct / 100) * pCirc;
    const c = `<circle cx="${pCx}" cy="${pCy}" r="${pR}" fill="none"
      stroke="${seg.color}" stroke-width="24"
      stroke-dasharray="${s.toFixed(2)} ${(pCirc - s).toFixed(2)}"
      stroke-dashoffset="${(-pieOffset).toFixed(2)}"
      transform="rotate(-90 ${pCx} ${pCy})"/>`;
    pieOffset += s;
    return c;
  }).join("\n");

  /* ---- 趋势图：根据筛选模式计算时间序列 ---- */
  const svgH = 240, padT = 24, padB = 30, padL = 50, padR = 16;
  let trendLabels = [], trendSeries = [];

  if (analysisPeriodMode === "day") {
    // 日模式：当月每天
    const daysInMonth = new Date(year, currentMonth + 1, 0).getDate();
    trendLabels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
    const xStepBase = 22;
    var svgW = padL + padR + Math.max(daysInMonth - 1, 1) * xStepBase;
    trendSeries = visibleClasses.map((c) => {
      const openV = Number(c.openingValue) || 0;
      const curV = Number(c.value) || 0;
      const vals = Array.from({ length: daysInMonth }, (_, i) => {
        const progress = (i + 1) / daysInMonth;
        return openV + (curV - openV) * progress;
      });
      return { name: c.name, color: c.color || "#6366f1", vals };
    });
  } else if (analysisPeriodMode === "month") {
    // 月模式：当年每月
    trendLabels = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);
    const xStepBase = 52;
    var svgW = padL + padR + 11 * xStepBase;
    trendSeries = visibleClasses.map((c) => {
      const openV = Number(c.openingValue) || 0;
      const curV = Number(c.value) || 0;
      const vals = Array.from({ length: 12 }, (_, i) => {
        const progress = (i + 1) / 12;
        return openV + (curV - openV) * progress;
      });
      return { name: c.name, color: c.color || "#6366f1", vals };
    });
  } else {
    // 年模式：多年数据
    const startYear = 2020;
    const years = Array.from({ length: year - startYear + 1 }, (_, i) => startYear + i);
    trendLabels = years.map((y) => `${y}`);
    const xStepBase = 80;
    var svgW = padL + padR + Math.max(years.length - 1, 1) * xStepBase;
    trendSeries = visibleClasses.map((c) => {
      const openV = Number(c.openingValue) || 0;
      const curV = Number(c.value) || 0;
      const growthPerYear = (curV - openV) / Math.max(years.length, 1);
      const vals = years.map((_, i) => openV + growthPerYear * (i + 1));
      return { name: c.name, color: c.color || "#6366f1", vals };
    });
  }

  const nPts = trendLabels.length;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;
  const xStep = nPts > 1 ? plotW / (nPts - 1) : 0;

  // Y 轴范围（支持负数）
  const allVals = trendSeries.flatMap((s) => s.vals);
  const minV = allVals.length ? Math.min(...allVals, 0) : 0;
  const maxV = allVals.length ? Math.max(...allVals, 1) : 1;
  const range = maxV - minV || 1;
  const zeroY = padT + plotH * (maxV / range);
  const yOf = (v) => padT + plotH - ((v - minV) / range) * plotH;
  const toPoly = (vals) => vals.map((v, i) => `${(padL + i * xStep).toFixed(1)},${yOf(v).toFixed(1)}`).join(" ");

  // Y 轴刻度
  const yTicks = 4;
  const yTickHtml = Array.from({ length: yTicks + 1 }, (_, i) => {
    const v = minV + (range / yTicks) * i;
    const y = yOf(v);
    const label = Math.abs(v) >= 10000 ? (v / 10000).toFixed(1) + "万" : v.toFixed(0);
    return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${svgW - padR}" y2="${y.toFixed(1)}" stroke="var(--line)" stroke-width="0.5" stroke-dasharray="4,4"/>
      <text x="${padL - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end" fill="var(--muted)" font-size="9">${label}</text>`;
  }).join("\n");

  // 零线（当有负数时显示）
  const zeroLineHtml = minV < 0
    ? `<line x1="${padL}" y1="${zeroY.toFixed(1)}" x2="${svgW - padR}" y2="${zeroY.toFixed(1)}" stroke="var(--ink)" stroke-width="1" stroke-opacity="0.3"/>`
    : "";

  // 每条线
  const linesHtml = trendSeries.map((s) => {
    const pts = toPoly(s.vals);
    const dots = s.vals.map((v, i) =>
      `<circle cx="${(padL + i * xStep).toFixed(1)}" cy="${yOf(v).toFixed(1)}" r="3" fill="${s.color}" stroke="var(--panel)" stroke-width="1.5"><title>${s.name} ${trendLabels[i]}: ${money(v)}</title></circle>`
    ).join("");
    return `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${dots}`;
  }).join("\n");

  /* ---- 柱状图数据 ---- */
  const barH = 220, barPadT = 20, barPadB = 30, barPadL = 50, barPadR = 16;
  const barPlotH = barH - barPadT - barPadB;
  const barPlotW = svgW - barPadL - barPadR;
  const barGroupW = visibleClasses.length > 0 ? barPlotW / visibleClasses.length : barPlotW;
  const barMaxV = Math.max(...visibleClasses.map((c) => Math.max(Number(c.value) || 0, Number(c.openingValue) || 0)), 1);
  const barTicks = 4;
  const barYTickHtml = Array.from({ length: barTicks + 1 }, (_, i) => {
    const v = (barMaxV / barTicks) * i;
    const y = barPadT + barPlotH - (v / barMaxV) * barPlotH;
    return `<line x1="${barPadL}" y1="${y.toFixed(1)}" x2="${svgW - barPadR}" y2="${y.toFixed(1)}" stroke="var(--line)" stroke-width="0.5" stroke-dasharray="4,4"/>
      <text x="${barPadL - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end" fill="var(--muted)" font-size="9">${v >= 10000 ? (v / 10000).toFixed(1) + "万" : v.toFixed(0)}</text>`;
  }).join("\n");

  /* ---- 筛选栏 HTML ---- */
  let periodOptionHtml = "";
  if (analysisPeriodMode === "day") {
    periodOptionHtml = `<span class="badge">${year}年${currentMonth + 1}月${now.getDate()}日</span>`;
  } else if (analysisPeriodMode === "month") {
    const options = Array.from({ length: currentMonth + 1 }, (_, i) => {
      const tm = currentMonth - i;
      const v = `${year}-${String(tm + 1).padStart(2, "0")}`;
      const l = i === 0 ? "本月" : i === 1 ? "上月" : `${tm + 1}月`;
      return [v, l];
    });
    periodOptionHtml = `<div class="ledger-period-options">
      <span class="ledger-period-year">${year}年</span>
      ${options.map(([v, l]) => `<button data-action="analysis-period" data-period="${v}" class="${analysisPeriod === v ? 'active' : ''}">${l}</button>`).join("")}
    </div>`;
  } else if (analysisPeriodMode === "year") {
    const options = [];
    for (let y = year; y >= Math.min(year, 2020); y--) {
      options.push([String(y), y === year ? "今年" : y === year - 1 ? "去年" : `${y}年`]);
    }
    periodOptionHtml = `<div class="ledger-period-options">
      ${options.map(([v, l]) => `<button data-action="analysis-period" data-period="${v}" class="${analysisPeriod === v ? 'active' : ''}">${l}</button>`).join("")}
    </div>`;
  } else {
    periodOptionHtml = `<div class="ledger-period-options"><span class="ledger-period-year">自定义日期范围</span></div>`;
  }

  return `<div class="analysis-page">
    <!-- 筛选栏 -->
    <section class="analysis-filter-bar">
      <div class="ledger-periods ledger-mode-tabs">
        ${[
          ["day", "日常"],
          ["month", "月统计"],
          ["year", "年统计"],
          ["custom", "自定义"],
        ].map(([id, label]) => `<button data-action="analysis-mode" data-mode="${id}" class="${analysisPeriodMode === id ? "active" : ""}">${label}</button>`).join("")}
      </div>
      ${periodOptionHtml}
      <div class="analysis-custom-range ${analysisPeriodMode === 'custom' ? 'active' : ''}">
        <input id="analysisStartDate" type="date" value="${filters.startDate}" />
        <input id="analysisEndDate" type="date" value="${filters.endDate}" />
      </div>
    </section>

    <!-- 资产分类饼图 + 统计卡片 -->
    <section class="analysis-row card">
      <div class="section-title" style="margin-bottom:20px">
        <h3 style="margin:0">资产分类占比</h3>
        <span class="badge">总价值 ${money(totalValue)}</span>
      </div>
      <div class="class-pie-layout">
        <div class="class-pie-center">
          <svg viewBox="0 0 200 200" class="class-pie-svg-lg">
            <circle cx="${pCx}" cy="${pCy}" r="${pR}" fill="none" stroke="var(--panel-3)" stroke-width="28"/>
            ${pieCircles}
            <text x="${pCx}" y="${pCy - 6}" text-anchor="middle" class="pie-center-label" font-size="13">${pieSegs.length > 0 ? '资产' : '暂无'}</text>
            <text x="${pCx}" y="${pCy + 12}" text-anchor="middle" class="pie-center-sub">占比</text>
          </svg>
        </div>
        <div class="class-pie-list">
          ${pieSegs.map((seg) => {
            const cls = visibleClasses.find((c) => c.name === seg.label);
            const profit = cls ? (Number(cls.value) || 0) - (Number(cls.openingValue) || 0) : 0;
            return `<div class="class-pie-list-item">
              <span class="pie-dot" style="background:${seg.color};width:12px;height:12px"></span>
              <span class="class-pie-list-name">${seg.label}</span>
              <span class="class-pie-list-pct">${seg.pct.toFixed(1)}%</span>
              <span class="class-pie-list-val">${money(seg.val)}</span>
              <span class="class-pie-list-profit ${profit >= 0 ? 'income' : 'expense'}">${profit >= 0 ? '+' : ''}${money(profit)}</span>
            </div>`;
          }).join("")}
        </div>
      </div>
    </section>

    <!-- 趋势折线图 + 分类对比 (左右布局) -->
    <div class="analysis-charts-row">
      <section class="card">
        <div class="section-title" style="margin-bottom:12px">
          <h3 style="margin:0">资产增长趋势</h3>
          <div class="analysis-monthly-legend" style="display:flex;gap:10px;flex-wrap:wrap">
            ${trendSeries.map((s) => `<span style="display:flex;align-items:center;gap:4px;font-size:11px"><i style="--tone:${s.color};display:inline-block;width:8px;height:8px;border-radius:50%;background:${s.color}"></i>${s.name}</span>`).join("")}
          </div>
        </div>
        <div class="analysis-trend-chart trend-scrollable">
          <svg viewBox="0 0 ${svgW} ${svgH}" class="trend-line-svg" preserveAspectRatio="none" style="min-width:${svgW}px">
            ${yTickHtml}
            ${zeroLineHtml}
            ${linesHtml}
          </svg>
          <div class="trend-x-labels" style="min-width:${svgW}px">
            ${trendLabels.map((l) => `<span>${l}</span>`).join("")}
          </div>
        </div>
      </section>

      <section class="card">
        <div class="section-title" style="margin-bottom:12px">
          <h3 style="margin:0">分类对比</h3>
          <span class="badge">${year}年 vs 期初</span>
        </div>
        <div class="class-bar-chart-wrap">
          <svg viewBox="0 0 ${svgW} ${barH}" class="trend-line-svg" preserveAspectRatio="none">
            ${barYTickHtml}
            ${visibleClasses.map((c, i) => {
              const cx = barPadL + (i + 0.5) * barGroupW;
              const openV = Number(c.openingValue) || 0;
              const curV = Number(c.value) || 0;
              const barW2 = barGroupW * 0.35;
              const hOpen = openV / barMaxV * barPlotH;
              const hCur = curV / barMaxV * barPlotH;
              return `
                <rect x="${cx - barW2 - 2}" y="${barPadT + barPlotH - hOpen}" width="${barW2}" height="${hOpen}" rx="3" fill="var(--panel-3)" stroke="var(--line)" stroke-width="0.5"><title>${c.name} 期初: ${money(openV)}</title></rect>
                <rect x="${cx + 2}" y="${barPadT + barPlotH - hCur}" width="${barW2}" height="${hCur}" rx="3" fill="${c.color || '#6366f1'}" opacity="0.85"><title>${c.name} 当前: ${money(curV)}</title></rect>
                <text x="${cx}" y="${barPadT + barPlotH + 14}" text-anchor="middle" fill="var(--muted)" font-size="10">${c.name}</text>`;
            }).join("")}
          </svg>
          <div style="display:flex;gap:12px;justify-content:center;margin-top:8px;font-size:11px;color:var(--muted)">
            <span style="display:flex;align-items:center;gap:4px"><i style="display:inline-block;width:12px;height:12px;border-radius:2px;background:var(--panel-3);border:1px solid var(--line)"></i>期初价值</span>
            <span style="display:flex;align-items:center;gap:4px"><i style="display:inline-block;width:12px;height:12px;border-radius:2px;background:#6366f1;opacity:0.85"></i>当前价值</span>
          </div>
        </div>
        <div class="class-yoy-grid">
          ${(() => {
            const avgValue = totalValue / (visibleClasses.length || 1);
            return visibleClasses.map((c) => {
              const openV = Number(c.openingValue) || 0;
              const curV = Number(c.value) || 0;
              const yoyRate = openV ? (curV - openV) / openV : 0;
              const incomeTotal = Number(c.income) || 0;
              const returnRate = openV ? incomeTotal / openV : 0;
              const target = Number(c.targetValue) || avgValue;
              const targetProgress = target ? curV / target : 0;
              return `<div class="class-yoy-item">
                <div class="class-yoy-head">
                  <span class="pie-dot" style="background:${c.color || '#6366f1'}"></span>
                  <span style="flex:1">${c.name}</span>
                  <button data-action="edit-class-target" data-id="${c.id}" class="class-target-btn" title="设置目标">⚙</button>
                </div>
                <div class="class-yoy-vals-4">
                  <div><span>当前值</span><b>${money(curV)}</b></div>
                  <div><span>同比</span><b class="${yoyRate >= 0 ? 'income' : 'expense'}">${yoyRate >= 0 ? '+' : ''}${(yoyRate * 100).toFixed(1)}%</b></div>
                  <div><span>收益率</span><b class="${returnRate >= 0 ? 'income' : 'expense'}">${(returnRate * 100).toFixed(1)}%</b></div>
                  <div><span>目标</span><b>${targetProgress >= 1 ? '100' : (targetProgress * 100).toFixed(0)}%</b></div>
                </div>
                <div class="class-yoy-bar"><i style="width:${Math.min(targetProgress * 100, 100)}%;background:${c.color || '#6366f1'}"></i></div>
              </div>`;
            }).join("");
          })()}
        </div>
      </section>
    </div>

    <!-- 资产分类卡片 -->
    <section class="analysis-row card">
      <div class="section-title" style="margin-bottom:12px">
        <h3 style="margin:0">分类管理</h3>
        <div class="section-actions">
          <span class="badge">拖拽或前后移调整顺序</span>
          <button class="primary" data-action="new-asset-class">新增分类</button>
        </div>
      </div>
      <div class="grid cols-4 asset-class-grid">${state.assetClasses.map((c, index) => {
      const profit = (Number(c.value) || 0) - (Number(c.openingValue) || 0);
      const profitRate = Number(c.openingValue) ? profit / Number(c.openingValue) : 0;
      const allocation = totalValue ? (Number(c.value) || 0) / totalValue : 0;
      const fixed = Boolean(fixedAssetClassNames[c.id]);
      return `<article class="card asset-class-card" draggable="true" data-class-id="${c.id}">
      <div class="section-title">
        <h3><span class="class-drag-handle" title="拖动调整顺序">⋮⋮</span>${c.name}${fixed ? `<small>固定</small>` : ""}</h3>
        <span class="badge">${c.visible ? "参与总览" : "已隐藏"}</span>
      </div>
      <p class="muted">${c.children.join(" / ")}</p>
      <div class="asset-class-kpis">
        <div><span>总资金占比</span><strong>${percent(allocation)}</strong></div>
        <div><span>当前收益额</span><strong class="${profit < 0 ? "negative" : ""}">${money(profit)}</strong></div>
        <div><span>当前收益率</span><strong class="${profitRate < 0 ? "negative" : ""}">${percent(profitRate)}</strong></div>
      </div>
      ${recordsRows([
        ["当前价值", money(c.value)],
        ["期初价值", money(c.openingValue)],
        ["目标价值", money(c.targetValue)],
        ["期望收益率", `${Number(c.expectedReturn || 0).toFixed(2)}%`],
        ["年度收益", money(c.income)],
        ["年度支出", money(c.expense)],
      ])}
      <div class="class-actions">
        <button data-action="move-asset-class" data-id="${c.id}" data-offset="-1" ${index === 0 ? "disabled" : ""}>前移</button>
        <button data-action="move-asset-class" data-id="${c.id}" data-offset="1" ${index === state.assetClasses.length - 1 ? "disabled" : ""}>后移</button>
        <button data-action="edit-asset-class" data-id="${c.id}">编辑</button>
        <button data-action="toggle-class" data-id="${c.id}">${c.visible ? "隐藏" : "显示"}</button>
        ${fixed ? "" : `<button data-action="delete-asset-class" data-id="${c.id}">删除</button>`}
      </div>
    </article>`;
    }).join("")}</div>
    </section>
  </div>`;
}

function tools() {
  return `<section class="tool-hub">
    <div class="tool-hub-intro">
      <div>
        <p class="eyebrow">行情与分析工具</p>
        <h2>辅助工具</h2>
        <p class="muted">把常用的投资研究能力集中在这里，减少在多个网站之间切换。</p>
      </div>
    </div>
    <div class="tool-grid">
      <button class="tool-entry" data-action="open-premium-tool">
        <span class="tool-entry-icon" aria-hidden="true">％</span>
        <span class="tool-entry-copy">
          <strong>溢价查询</strong>
          <small>实时筛选 ETF、LOF、QDII 溢价标的</small>
        </span>
        <span class="tool-entry-arrow" aria-hidden="true">›</span>
      </button>
    </div>
  </section>`;
}

function premiumTool() {
  syncHoldingsFromFinance();
  const query = premiumQuery.trim().toLowerCase();
  let rows = premiumRows.filter((row) => {
    // Use custom dataType2 if set, otherwise use default from backend
    const dataType2 = premiumDataType2Map[row.code] || row.dataType2 || '权益基金';
    
    // Filter by type1 (ETF/LOF)
    let matchesType1 = premiumType1Filter === "all" || row.type === premiumType1Filter;
    
    // Filter by dataType2 (权益基金/商品)
    let matchesDataType2 = premiumDataType2Filter === "all" || dataType2 === premiumDataType2Filter;
    
    // Filter by arbitrage
    let matchesArbitrage = true;
    if (premiumArbitrageFilter === "yes") {
      matchesArbitrage = row.canArbitrage === true;
    } else if (premiumArbitrageFilter === "no") {
      matchesArbitrage = row.canArbitrage === false;
    }
    
    // Filter by transfer recommendation
    let matchesTransfer = true;
    if (premiumTransferFilter !== "all") {
      matchesTransfer = row.transferRecommend && row.transferRecommend.level === premiumTransferFilter;
    }
    
    // Filter by status (premium/discount)
    let matchesStatus = true;
    if (premiumStatusFilter === "premium") {
      matchesStatus = row.status === "premium";
    } else if (premiumStatusFilter === "discount") {
      matchesStatus = row.status === "discount";
    }
    
    const matchesQuery = !query || 
      `${row.code} ${row.name} ${row.direction || ""} ${row.type} ${dataType2}`.toLowerCase().includes(query);
    
    // Apply quick filter
    let matchesQuickFilter = true;
    if (premiumQuickFilter === 'premium') {
      matchesQuickFilter = row.status === "premium";
    } else if (premiumQuickFilter === 'arbitrage') {
      matchesQuickFilter = row.canArbitrage === true;
    } else if (premiumQuickFilter === 'transfer') {
      const rec = row.transferRecommend;
      matchesQuickFilter = rec && (rec.level === 'must-sell' || rec.level === 'suggest-sell' || rec.level === 'can-sell');
    } else if (premiumQuickFilter === 'buy') {
      matchesQuickFilter = row.premiumRate < 2;
    } else if (premiumQuickFilter === 'holding') {
      matchesQuickFilter = premiumRowHasHolding(row);
    }
    
    return matchesType1 && matchesDataType2 && matchesArbitrage && matchesTransfer && matchesStatus && matchesQuery && matchesQuickFilter;
  });
  
  // Sort rows based on sort field and order
  rows.sort((a, b) => {
    let valueA = a[premiumSortField];
    let valueB = b[premiumSortField];
    
    // Handle null/undefined values
    if (valueA === null || valueA === undefined) valueA = -Infinity;
    if (valueB === null || valueB === undefined) valueB = -Infinity;
    
    // Convert to numbers for comparison
    valueA = Number(valueA);
    valueB = Number(valueB);
    
    if (premiumSortOrder === 'asc') {
      return valueA - valueB;
    } else {
      return valueB - valueA;
    }
  });
  
  // Calculate pagination
  const totalRows = rows.length;
  const totalPages = Math.ceil(totalRows / premiumPageSize);
  // Ensure current page is valid
  if (premiumCurrentPage > totalPages && totalPages > 0) {
    premiumCurrentPage = totalPages;
  }
  if (premiumCurrentPage < 1) {
    premiumCurrentPage = 1;
  }
  // Get paginated rows
  const startIndex = (premiumCurrentPage - 1) * premiumPageSize;
  const endIndex = startIndex + premiumPageSize;
  const paginatedRows = rows.slice(startIndex, endIndex);
  
  const premiumTargets = premiumRows.filter((row) => row.status === "premium");
  const arbitrageTargets = premiumRows.filter((row) => row.canArbitrage);
  // Transfer targets: premiumRate > 6%
  const transferTargets = premiumRows.filter((row) => {
    const rec = row.transferRecommend;
    return rec && (rec.level === 'must-sell' || rec.level === 'suggest-sell' || rec.level === 'can-sell');
  });
  // Buy targets: premiumRate < 2% (including negative)
  const buyTargets = premiumRows.filter((row) => row.premiumRate < 2);
  const holdingTargets = premiumRows.filter((row) => premiumRowHasHolding(row));
  const highest = premiumTargets[0] || premiumRows[0];
  const fetchedTime = premiumFetchedAt
    ? new Date(premiumFetchedAt).toLocaleString("zh-CN", { hour12: false })
    : "尚未获取";
  return `<section class="premium-page">
    <div class="premium-toolbar">
      <div class="premium-title">
        <button class="icon-button premium-back" data-action="back-tools" title="返回辅助工具" aria-label="返回辅助工具">‹</button>
        <div>
          <p class="eyebrow">辅助工具 / 行情</p>
          <h2>溢价查询</h2>
        </div>
      </div>
      <div class="premium-refresh-group">
        <span class="premium-live"><i></i>每 5 分钟自动刷新</span>
        <button class="primary premium-refresh" data-action="refresh-premium" ${premiumLoading ? "disabled" : ""}>
          ${premiumLoading ? "正在刷新..." : "刷新行情"}
        </button>
      </div>
    </div>

    <div class="premium-summary">
      <article class="summary-card-clickable" data-quick-filter="all" title="点击显示全部数据">
        <span>覆盖标的</span>
        <strong>${premiumRows.length}</strong>
        <small>ETF / LOF</small>
      </article>
      <article class="summary-card-clickable ${premiumQuickFilter === 'premium' ? 'active-filter' : ''}" data-quick-filter="premium" title="点击筛选溢价标的">
        <span>溢价标的</span>
        <strong>${premiumTargets.length}</strong>
        <small>溢价率高于 0.50%</small>
      </article>
      <article class="summary-card-clickable ${premiumQuickFilter === 'arbitrage' ? 'active-filter' : ''}" data-quick-filter="arbitrage" title="点击筛选可套利标的">
        <span>可套利标的</span>
        <strong class="positive">${arbitrageTargets.length}</strong>
        <small>溢价>4%且申购上限≠0</small>
      </article>
      <article class="summary-card-clickable ${premiumQuickFilter === 'transfer' ? 'active-filter' : ''}" data-quick-filter="transfer" title="点击筛选建议转仓标的">
        <span>建议转仓标的</span>
        <strong class="transfer-count">${transferTargets.length}</strong>
        <small>溢价率>6%</small>
      </article>
      <article class="summary-card-clickable ${premiumQuickFilter === 'buy' ? 'active-filter' : ''}" data-quick-filter="buy" title="点击筛选建议转入标的">
        <span>建议转入标的</span>
        <strong class="buy-count">${buyTargets.length}</strong>
        <small>溢价率<2%</small>
      </article>
      <article class="summary-card-clickable ${premiumQuickFilter === 'holding' ? 'active-filter' : ''}" data-quick-filter="holding" title="点击筛选持有标的">
        <span>持有标的</span>
        <strong>${holdingTargets.length}</strong>
        <small>持有金额和比例均不为 0</small>
      </article>
      <article><span>最高参考溢价</span><strong class="${highest?.premiumRate >= 0 ? "positive" : "negative"}">${highest ? formatPremiumRate(highest.premiumRate) : "--"}</strong><small>${highest ? `${escapeHtml(highest.code)} ${escapeHtml(highest.name)}` : "等待行情"}</small></article>
      <article>
        <span>行情时间</span>
        <strong class="premium-time">${fetchedTime}</strong>
        <small>${escapeHtml(premiumSource || "Sea叔")}</small>
      </article>
    </div>

    <div class="premium-holdings-legend">
      <div class="legend-title">持有颜色说明：</div>
      <div class="legend-items">
        <span class="legend-item"><span class="legend-color legend-red"></span>红色 = 有持仓或加仓（金额 &gt; 0）</span>
        <span class="legend-item"><span class="legend-color legend-green"></span>绿色 = 减仓操作（金额 &lt; 0）</span>
        <span class="legend-item"><span class="legend-color legend-yellow"></span>黄色 = 持仓不变/关注中（金额 = 0，有比例）</span>
        <span class="legend-item"><span class="legend-color legend-white"></span>白色 = 无数据或已清仓（默认）</span>
      </div>
    </div>

    <div class="premium-controls">
      <div class="premium-filters-row">
        <label class="premium-filter-label">
          类型一
          <select id="premiumType1Filter" class="premium-filter-select" onchange="updatePremiumFilter('type1', this.value)">
            <option value="all" ${premiumType1Filter === 'all' ? 'selected' : ''}>全部</option>
            <option value="ETF" ${premiumType1Filter === 'ETF' ? 'selected' : ''}>ETF</option>
            <option value="LOF" ${premiumType1Filter === 'LOF' ? 'selected' : ''}>LOF</option>
          </select>
        </label>
        <label class="premium-filter-label">
          数据类型二
          <div class="premium-datatype2-wrapper">
            <select id="premiumDataType2Filter" class="premium-filter-select" onchange="updatePremiumFilter('dataType2', this.value)">
              <option value="all" ${premiumDataType2Filter === 'all' ? 'selected' : ''}>全部</option>
              <option value="美国标的" ${premiumDataType2Filter === '美国标的' ? 'selected' : ''}>美国标的</option>
              <option value="其他国家标的" ${premiumDataType2Filter === '其他国家标的' ? 'selected' : ''}>其他国家标的</option>
              <optgroup label="商品">
                <option value="原油" ${premiumDataType2Filter === '原油' ? 'selected' : ''}>  原油</option>
                <option value="黄金" ${premiumDataType2Filter === '黄金' ? 'selected' : ''}>  黄金</option>
                <option value="白银" ${premiumDataType2Filter === '白银' ? 'selected' : ''}>  白银</option>
                <option value="其他商品" ${premiumDataType2Filter === '其他商品' ? 'selected' : ''}>  其他商品</option>
              </optgroup>
            </select>
          </div>
        </label>
        <label class="premium-filter-label">
          可套利
          <select id="premiumArbitrageFilter" class="premium-filter-select" onchange="updatePremiumFilter('arbitrage', this.value)">
            <option value="all" ${premiumArbitrageFilter === 'all' ? 'selected' : ''}>全部</option>
            <option value="yes" ${premiumArbitrageFilter === 'yes' ? 'selected' : ''}>可套利</option>
            <option value="no" ${premiumArbitrageFilter === 'no' ? 'selected' : ''}>不可套利</option>
          </select>
        </label>
        <label class="premium-filter-label">
          转仓推荐
          <select id="premiumTransferFilter" class="premium-filter-select" onchange="updatePremiumFilter('transfer', this.value)">
            <option value="all" ${premiumTransferFilter === 'all' ? 'selected' : ''}>全部</option>
            <option value="must-sell" ${premiumTransferFilter === 'must-sell' ? 'selected' : ''}>必须转出</option>
            <option value="suggest-sell" ${premiumTransferFilter === 'suggest-sell' ? 'selected' : ''}>建议转出</option>
            <option value="can-sell" ${premiumTransferFilter === 'can-sell' ? 'selected' : ''}>可以转出</option>
            <option value="suggest-buy" ${premiumTransferFilter === 'suggest-buy' ? 'selected' : ''}>建议转入</option>
            <option value="strong-buy" ${premiumTransferFilter === 'strong-buy' ? 'selected' : ''}>强烈转入</option>
          </select>
        </label>
        <label class="premium-filter-label">
          溢价状态
          <div style="display: flex; gap: 8px; align-items: center;">
            <select id="premiumStatusFilter" class="premium-filter-select" onchange="updatePremiumFilter('status', this.value)">
              <option value="all" ${premiumStatusFilter === 'all' ? 'selected' : ''}>全部</option>
              <option value="premium" ${premiumStatusFilter === 'premium' ? 'selected' : ''}>溢价</option>
              <option value="discount" ${premiumStatusFilter === 'discount' ? 'selected' : ''}>折价</option>
            </select>
            ${premiumQuickFilter !== 'all' ? '<button class="premium-reset-btn-inline" data-action="reset-premium-filter" title="还原全部数据">↺ 还原</button>' : ''}
          </div>
        </label>
      </div>
      <form id="premiumSearchForm" class="premium-search">
        <input name="query" value="${escapeAttr(premiumQuery)}" placeholder="搜索代码、名称、方向或类型" aria-label="搜索溢价标的" />
        <button type="submit">查询</button>
      </form>
    </div>

    ${premiumError ? `<div class="premium-alert" role="alert">${escapeHtml(premiumError)}</div>` : ""}
    <div class="premium-table-wrap">
      <table class="premium-table premium-table-left">
        <thead>
          <tr>
            <th style="width: 50px;">#</th>
            <th>代码</th>
            <th>投资方向</th>
            <th>名称</th>
            <th>类型</th>
            <th>数据类型二</th>
            <th>LOF基金申购上限</th>
            <th>T0净值模拟</th>
            <th>现价</th>
            <th class="sortable-header" onclick="togglePremiumSort('premiumRate')" style="cursor: pointer;">
              实时溢价
              <span class="sort-icon ${premiumSortField === 'premiumRate' ? 'active ' + premiumSortOrder : ''}">
                ${premiumSortField === 'premiumRate' ? (premiumSortOrder === 'asc' ? '▲' : '▼') : '⇅'}
              </span>
            </th>
            <th>是否可以套利</th>
            <th>转仓推荐</th>
            <th>持有金额</th>
            <th>持有比例</th>
          </tr>
        </thead>
        <tbody>
          ${premiumLoading && !premiumRows.length
            ? `<tr><td colspan="13" class="premium-empty">正在获取实时行情...</td></tr>`
            : rows.map((row, index) => premiumRow(row, index + 1)).join("") || `<tr><td colspan="13" class="premium-empty">当前条件下暂无标的</td></tr>`}
        </tbody>
      </table>
    </div>
    <p class="premium-disclaimer">参考溢价率根据公开行情中的实时价格、IOPV、估算净值或最新净值计算，仅用于数据观察，不构成投资建议。跨境品种可能受时差、汇率及净值披露延迟影响。</p>
  </section>`;
}

function premiumRow(row, index) {
  const tone = row.status === "premium" ? "positive" : row.status === "discount" ? "negative" : "";
  // Use custom dataType2 if set, otherwise use the default from backend
  const dataType2 = premiumDataType2Map[row.code] || row.dataType2 || '其他国家标的';
  
  // Get holdings data
  const holdingsData = premiumHoldingsMap[row.code] || {};
  const holdingAmount = holdingsData.amount !== undefined ? holdingsData.amount : '';
  const holdingRatio = holdingsData.ratio !== undefined ? holdingsData.ratio : '';
  
  // Determine row color class
  const rowColorClass = getPremiumRowColorClass(holdingAmount, holdingRatio);
  
  return `<tr data-code="${escapeAttr(row.code)}" class="${rowColorClass}">
    <td style="text-align: center; color: var(--muted); font-weight: 500;">${index}</td>
    <td><div class="premium-symbol"><strong>${escapeHtml(row.code)}</strong></div></td>
    <td><span class="premium-type">${escapeHtml(row.direction || "--")}</span></td>
    <td><div class="premium-symbol"><strong>${escapeHtml(row.name)}</strong></div></td>
    <td><span class="premium-type">${escapeHtml(row.type)}</span></td>
    <td>
      <select class="premium-datatype-select" data-code="${escapeAttr(row.code)}" onchange="updateDataType2('${escapeAttr(row.code)}', this.value)">
        <option value="美国标的" ${dataType2 === '美国标的' ? 'selected' : ''}>美国标的</option>
        <option value="其他国家标的" ${dataType2 === '其他国家标的' ? 'selected' : ''}>其他国家标的</option>
        <optgroup label="商品">
          <option value="原油" ${dataType2 === '原油' ? 'selected' : ''}>  原油</option>
          <option value="黄金" ${dataType2 === '黄金' ? 'selected' : ''}>  黄金</option>
          <option value="白银" ${dataType2 === '白银' ? 'selected' : ''}>  白银</option>
          <option value="其他商品" ${dataType2 === '其他商品' ? 'selected' : ''}>  其他商品</option>
        </optgroup>
      </select>
    </td>
    <td>${row.applyLimit !== undefined && row.applyLimit !== 0 ? Number(row.applyLimit).toLocaleString() : "--"}</td>
    <td>${row.t0Nav !== undefined && row.t0Nav !== 0 ? Number(row.t0Nav).toFixed(4) : "--"}</td>
    <td>${Number(row.price).toFixed(3)}</td>
    <td><strong class="premium-rate ${tone}">${formatPremiumRate(row.premiumRate)}</strong></td>
    <td>${row.canArbitrage ? '<span class="premium-arbitrage-tag">✓ 可套利</span>' : '<span class="premium-no-arbitrage">✗</span>'}</td>
    <td>${renderTransferRecommend(row.transferRecommend)}</td>
    <td><input type="number" class="premium-holding-amount" data-code="${escapeAttr(row.code)}" value="${holdingAmount}" placeholder="输入金额" onchange="updatePremiumHolding('${escapeAttr(row.code)}', 'amount', this.value)" /></td>
    <td><input type="number" class="premium-holding-ratio" data-code="${escapeAttr(row.code)}" value="${holdingRatio}" placeholder="自动计算" step="0.01" min="0" max="100" onchange="updatePremiumHolding('${escapeAttr(row.code)}', 'ratio', this.value)" />%</td>
  </tr>`;
}

function formatPremiumRate(value) {
  const number = Number(value) || 0;
  return `${number > 0 ? "+" : ""}${number.toFixed(2)}%`;
}

function renderTransferRecommend(recommend) {
  if (!recommend) return '<span class="transfer-none">--</span>';
  
  const colorClass = `transfer-${recommend.color}`;
  return `<span class="transfer-tag ${colorClass}" title="${escapeHtml(recommend.text)}">${escapeHtml(recommend.text)}</span>`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function loadPremiumMarket(force = false) {
  if (premiumLoading) return;
  premiumLoading = true;
  premiumError = "";
  if (currentModule === "premiumTool") render();
  try {
    const payload = await apiRequest(`/tools/premium${force ? "?refresh=1" : ""}`);
    premiumRows = Array.isArray(payload.rows) ? payload.rows : [];
    premiumFetchedAt = payload.fetchedAt || new Date().toISOString();
    premiumSource = payload.source || "公开基金行情聚合";
    premiumLoadedAt = Date.now();
    if (payload.stale) premiumError = "行情源暂时不可用，当前显示最近一次缓存数据。";
    if (payload.failedSources) premiumError = `部分行情源暂时不可用，已展示其余 ${payload.sourceCount || 0} 个来源的数据。`;
    
    // Auto-sync holdings data from finance assets
    syncHoldingsFromFinance();
  } catch (error) {
    premiumError = error.message || "行情获取失败，请稍后重试。";
  } finally {
    premiumLoading = false;
    if (currentModule === "premiumTool") render();
  }
}

function resetPremiumFilters({ refresh = false } = {}) {
  premiumType1Filter = "all";
  premiumDataType2Filter = "all";
  premiumArbitrageFilter = "all";
  premiumTransferFilter = "all";
  premiumStatusFilter = "all";
  premiumQuickFilter = "all";
  premiumQuery = "";
  premiumSortField = "premiumRate";
  premiumSortOrder = "desc";
  premiumCurrentPage = 1;
  premiumError = "";
  if (refresh) {
    void loadPremiumMarket(true);
    return;
  }
  render();
}

function syncPremiumAutoRefresh() {
  if (currentModule !== "premiumTool") {
    if (premiumRefreshTimer) window.clearInterval(premiumRefreshTimer);
    premiumRefreshTimer = null;
    return;
  }
  if (premiumRefreshTimer) return;
  premiumRefreshTimer = window.setInterval(() => {
    if (currentModule === "premiumTool" && document.visibilityState === "visible" && !premiumLoading) {
      void loadPremiumMarket(true);
    }
  }, 300_000); // 5 minutes = 5 * 60 * 1000 = 300000ms
}

function portfolioBacktestPage(model) {
  const funds = [
    ["天弘中证银行ETF联接C", "20%"],
    ["天弘纳斯达克100指数发起(QDII)C", "30%"],
    ["博时标普500ETF联接C", "30%"],
    ["国泰黄金ETF联接C", "20%"],
  ];
  return `<div class="portfolio-phone">
    <section class="portfolio-hero">
      <div class="portfolio-topline"><button>‹</button><button>•••</button></div>
      <div class="hero-orbit"><i></i></div>
      <h2>组合<span>回</span>测</h2>
      <p>回测基金组合历史业绩 <b>使用指南</b> ›</p>
    </section>

    <section class="portfolio-section mine">
      <div class="portfolio-tab">◴ 我的组合回测</div>
      <div class="portfolio-card my-backtest">
        <div>
          <h3>海哥组合 <span>查看详情 ›</span></h3>
          <p>回测时间&nbsp;&nbsp;2024.11.26-2026.01.27</p>
          <p>收益率 <strong>22.95%</strong></p>
        </div>
        <button>管理</button>
      </div>
    </section>

    <section class="portfolio-section recommend">
      <div class="portfolio-tab">◴ 推荐组合回测</div>
      <div class="portfolio-card">
        <h3>组合配置</h3>
        <p class="recommend-title"><b>推荐</b>A股+美股+黄金，历史多年涨势领先</p>
        <div class="fund-list">${funds.map(([name, ratio]) => `<div><span>${name}</span><i></i><strong>${ratio}</strong></div>`).join("")}</div>
        <div class="portfolio-metrics">
          <span class="hot">● 组合: <b>34.78%</b></span>
          <span>累计收益 <b>3478</b></span>
          <span>● 沪深300: <b class="green">-18.72%</b>⌄</span>
          <span class="green-dot">● 最大回撤: <b>7.95%</b></span>
        </div>
        ${portfolioLineChart(model)}
      </div>
    </section>

    <section class="portfolio-action-bar">
      <p>开始创建组合回测，挑选你的回测基金吧</p>
      <div>
        <button>导入已有持仓</button>
        <button class="primary">添加基金</button>
      </div>
    </section>
  </div>`;
}

function portfolioLineChart(model) {
  const width = 360;
  const height = 210;
  const padding = 32;
  const values = model.series.map((item, index) => 0.06 + index / Math.max(model.series.length - 1, 1) * 0.28 + Math.sin(index * 0.7) * 0.025);
  const max = 0.5;
  const points = values.map((value, index) => {
    const x = padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - (value / max) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return `<div class="portfolio-chart">
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="组合回测收益曲线">
      <defs>
        <linearGradient id="portfolioFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#6366f1" stop-opacity="0.34" />
          <stop offset="1" stop-color="#6366f1" stop-opacity="0" />
        </linearGradient>
      </defs>
      <line x1="${padding}" y1="40" x2="${width - padding}" y2="40" />
      <line x1="${padding}" y1="104" x2="${width - padding}" y2="104" />
      <line x1="${padding}" y1="168" x2="${width - padding}" y2="168" />
      <text x="6" y="44">50.00%</text>
      <text x="6" y="108">30.00%</text>
      <text x="6" y="172">10.00%</text>
      <polygon points="${padding},${height - padding} ${points} ${width - padding},${height - padding}" />
      <polyline points="${points}" />
      <rect class="rebalance" x="${padding}" y="52" width="8" height="116" rx="3" />
      <text class="rebalance-text" x="${padding + 8}" y="66">调仓</text>
      <text class="peak" x="${width - 92}" y="84">36.43%</text>
    </svg>
  </div>`;
}

function strategies() {
  return `<section>
    <div class="section-title"><h2>1-9 套理财业务策略</h2><span class="badge">同一时间仅一套主方案</span></div>
    <div class="strategy-list">${state.strategies.map((s) => `<article class="card strategy ${s.active ? "active" : ""}">
      <div class="section-title"><h3>${s.name}</h3><span class="badge">${s.active ? "启用" : "归档"}</span></div>
      <p class="muted">${s.target} · 风控：${s.risk}</p>
      ${recordsRows([["年度收益目标", `${s.annualReturn.toFixed(1)}%`], ["最大负债比例", `${s.debtLimit}%`], ["配置比例", s.allocation.join(" / ")]])}
      <button data-action="activate-strategy" data-id="${s.id}">设为主方案</button>
    </article>`).join("")}</div>
  </section>`;
}

function authPage() {
  const isLogin = authMode === "login";
  const isRegister = authMode === "register";
  const isForgot = authMode === "forgot";
  const isPhoneLogin = isLogin && authLoginMethod === "phone";
  const title = isRegister ? "注册账号" : isForgot ? "找回密码" : "登录账号";
  const subtitle = isRegister ? "创建独立数据账号" : isForgot ? "验证手机号并设置新密码" : "欢迎回来";
  const codeField = (purpose) => `<label>短信验证码
    <div class="auth-code-row">
      <input name="smsCode" inputmode="numeric" autocomplete="one-time-code" required maxlength="6" placeholder="6 位验证码" />
      <button type="button" data-action="send-auth-code" data-purpose="${purpose}">获取验证码</button>
    </div>
  </label>`;
  const passwordField = `<label>${isForgot ? "新密码" : "密码"}
    <div class="password-field">
      <input name="password" type="password" autocomplete="${isLogin ? "current-password" : "new-password"}" required minlength="6" placeholder="至少 6 位" />
      <button type="button" class="password-toggle" data-action="toggle-password" aria-label="显示密码" title="显示密码">
        <span class="password-eye" aria-hidden="true"></span>
      </button>
    </div>
  </label>`;
  return `<section class="auth-panel">
    <div class="auth-card">
      <div class="section-title">
        <h2>${title}</h2>
        <span class="badge">${subtitle}</span>
      </div>
      ${isLogin ? `<div class="auth-tabs">
        <button class="${authLoginMethod === "account" ? "active" : ""}" data-action="auth-login-method" data-method="account">账号登录</button>
        <button class="${authLoginMethod === "phone" ? "active" : ""}" data-action="auth-login-method" data-method="phone">手机号登录</button>
      </div>` : ""}
      <form id="authForm" class="profile-form" autocomplete="on">
        ${isLogin && !isPhoneLogin ? `<label>账号
          <input name="account" autocomplete="username" required placeholder="请输入用户名" />
        </label>` : ""}
        ${isPhoneLogin || isForgot ? `<label>手机号
          <input name="phone" inputmode="tel" autocomplete="tel" required maxlength="11" placeholder="请输入手机号" />
        </label>` : ""}
        ${isPhoneLogin ? codeField("login") : ""}
        ${isRegister ? `<label>账号
          <input name="account" autocomplete="username" required placeholder="至少 3 位用户名" />
        </label>
        <label>昵称
          <input name="name" required placeholder="用于个人中心展示" />
        </label>` : ""}
        ${isRegister ? `<label>手机
          <input name="phone" inputmode="tel" autocomplete="tel" required maxlength="11" placeholder="请输入手机号" />
        </label>` : ""}
        ${isRegister ? codeField("register") : ""}
        ${isRegister ? `<label>邮箱
          <input name="email" type="email" autocomplete="email" placeholder="用于找回和通知" />
        </label>` : ""}
        ${isForgot ? codeField("reset") : ""}
        ${!isPhoneLogin ? passwordField : ""}
        ${isRegister ? `<label>默认汇总币种
          <select name="currency">${currencyOptions(state.user.currency)}</select>
        </label>` : ""}
        <div class="auth-links">
          ${isLogin ? `<button type="button" class="auth-link" data-action="auth-mode" data-mode="forgot">忘记密码</button>
          <button type="button" class="auth-link auth-link-primary" data-action="auth-mode" data-mode="register">注册</button>` : `
          <button type="button" class="auth-link" data-action="auth-mode" data-mode="login">返回登录</button>`}
        </div>
        <p id="authMessage" class="form-message" role="status"></p>
        <button class="primary" type="submit">${isRegister ? "注册并登录" : isForgot ? "重置密码并登录" : "登录"}</button>
      </form>
    </div>
  </section>`;
}

function currencyOptions(selected) {
  return Object.keys(state.rates).map((currency) => `<option value="${currency}" ${currency === selected ? "selected" : ""}>${currency}</option>`).join("");
}

function statusOptions(selected) {
  return ["已开启", "已关闭"].map((item) => `<option ${item === selected ? "selected" : ""}>${item}</option>`).join("");
}

function escapeAttr(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localDateTimeString(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${localDateString(date)} ${hours}:${minutes}:${seconds}`;
}

function transactionDateTimeInputValue(value = "") {
  const normalized = normalizeOcrDate(value);
  return normalized ? normalized.replace(" ", "T") : "";
}

function dateOnly(value = "") {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!match) return text;
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function profile() {
  return `<div class="grid cols-2">
    <section class="card">
      <div class="section-title"><h2>用户信息</h2><span class="badge">${state.user.account || "本地账号"}</span></div>
      <div class="profile-panel">
        <button class="avatar-uploader" data-action="upload-avatar" title="上传头像">
          ${state.user.avatar ? `<img src="${state.user.avatar}" alt="头像" />` : `<span>${state.user.name.slice(0, 1)}</span>`}
        </button>
        <input id="avatarInput" type="file" accept="image/*" hidden />
        <div>
          <p class="muted">点击头像上传或更换头像</p>
          <form id="profileForm" class="profile-form">
            <div class="form-grid">
              <label>昵称
                <input name="name" value="${escapeAttr(state.user.name)}" required />
              </label>
              <label>登录账号
                <input name="account" value="${escapeAttr(state.user.account)}" disabled />
              </label>
              <label>手机
                <input name="phone" value="${escapeAttr(state.user.phone)}" inputmode="tel" />
              </label>
              <label>邮箱
                <input name="email" type="email" value="${escapeAttr(state.user.email)}" />
              </label>
              <label>生日
                <input name="birthday" type="date" value="${escapeAttr(state.user.birthday)}" />
              </label>
              <label>常住城市
                <input name="city" value="${escapeAttr(state.user.city)}" />
              </label>
              <label>职业
                <input name="occupation" value="${escapeAttr(state.user.occupation)}" />
              </label>
              <label>默认汇总币种
                <select name="currency">${currencyOptions(state.user.currency)}</select>
              </label>
            </div>
            <button class="primary" type="submit">保存用户信息</button>
          </form>
        </div>
      </div>
    </section>
    <section class="card">
      <div class="section-title"><h2>安全与偏好</h2></div>
      <form id="preferenceForm" class="profile-form">
        <label>风险偏好
          <select name="riskLevel">${["保守型", "稳健型", "均衡型", "进取型"].map((item) => `<option ${item === state.user.riskLevel ? "selected" : ""}>${item}</option>`).join("")}</select>
        </label>
        <label>隐私锁
          <select name="privacyLock">${statusOptions(state.user.privacyLock)}</select>
        </label>
        <label>数据脱敏
          <select name="dataMask">${statusOptions(state.user.dataMask)}</select>
        </label>
        <label>设备管理
          <input name="deviceName" value="${escapeAttr(state.user.deviceName)}" />
        </label>
        <label>界面主题
          <select name="theme">
            <option value="light" ${state.user.theme === "light" ? "selected" : ""}>浅色</option>
            <option value="dark" ${state.user.theme === "dark" ? "selected" : ""}>深色</option>
          </select>
        </label>
        <div class="profile-actions">
          <button class="primary" type="submit">保存偏好</button>
          <button type="button" data-action="logout">退出登录</button>
        </div>
      </form>
    </section>
  </div>

  <!-- 问题与反馈 -->
  <section class="card feedback-section">
    <div class="section-title"><h2>问题与反馈</h2><span class="badge">帮助我们改进</span></div>
    <form id="feedbackForm" class="feedback-form">
      <div class="feedback-form-row">
        <label>类型
          <select name="type">
            <option value="问题">问题反馈</option>
            <option value="建议">功能建议</option>
            <option value="其他">其他</option>
          </select>
        </label>
        <label>标题
          <input name="title" placeholder="简要描述（可选）" />
        </label>
      </div>
      <label>详细内容
        <textarea name="content" rows="4" placeholder="请详细描述您遇到的问题或建议…" required></textarea>
      </label>
      <div class="feedback-form-actions">
        <button class="primary" type="submit">提交反馈</button>
      </div>
    </form>
    <div id="feedbackList" class="feedback-list"></div>
  </section>`;
}

function donutCard(title, labels, values) {
  const a = `${values[0]}%`;
  const b = `${values[0] + values[1]}%`;
  return `<section class="card">
    <div class="section-title"><h2>${title}</h2></div>
    <div class="chart-row">
      <div class="donut" style="--a:${a};--b:${b}"></div>
      <div class="bars">${labels.map((label, i) => `<div class="bar"><span>${label}</span><div class="bar-track"><i style="--value:${Math.max(values[i], 4)}%"></i></div><strong>${Number(values[i]).toFixed(1)}%</strong></div>`).join("")}</div>
    </div>
  </section>`;
}

function barCard(title, rows) {
  return `<section class="card"><div class="section-title"><h2>${title}</h2></div>
    <div class="bars">${rows.map(([label, value, total]) => `<div class="bar"><span>${label}</span><div class="bar-track"><i style="--value:${Math.max(Math.abs(value) / (total || 1) * 100, 3)}%"></i></div><strong>${money(value)}</strong></div>`).join("")}</div>
  </section>`;
}

function monthlyGrowthCard(months) {
  const max = Math.max(...months.map((item) => Math.abs(item.growth)), 1);
  return `<section class="card">
    <div class="section-title"><h2>每月资产增长</h2><span class="badge">柱状图</span></div>
    <div class="column-chart">${months.map((item) => {
      const height = Math.max(Math.abs(item.growth) / max * 100, 4);
      const tone = item.growth >= 0 ? "positive" : "negative";
      return `<div class="column-item">
        <div class="column-value">${money(item.growth)}</div>
        <div class="column-track"><i class="${tone}" style="--height:${height}%"></i></div>
        <span title="${item.label}">${item.label}</span>
      </div>`;
    }).join("")}</div>
  </section>`;
}

function yoyLineCard(months) {
  const width = 560;
  const height = 210;
  const padding = 26;
  const values = months.map((item) => item.yoy);
  const min = Math.min(...values, -0.15);
  const max = Math.max(...values, 0.15);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = padding + (index / 11) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return `<section class="card">
    <div class="section-title"><h2>同比增长趋势</h2><span class="badge">折线图</span></div>
    <svg class="line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="同比增长趋势折线图">
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" />
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" />
      <polyline points="${points}" />
      ${values.map((value, index) => {
        const [x, y] = points.split(" ")[index].split(",");
        const labelY = Number(y) > 42 ? Number(y) - 10 : Number(y) + 20;
        return `<g><circle cx="${x}" cy="${y}" r="4"></circle><text x="${x}" y="${labelY}">${(value * 100).toFixed(0)}%</text></g>`;
      }).join("")}
    </svg>
    <div class="mini-legend">${months.map((item) => `<span>${item.label}：${percent(item.yoy)}</span>`).join("")}</div>
  </section>`;
}

function calendarCard(days) {
  return `<section class="card">
    <div class="section-title"><h2>财务日历</h2><span class="badge">每日增长额 / 消费额</span></div>
    <div class="calendar-weekdays">${["日", "一", "二", "三", "四", "五", "六"].map((day) => `<span>${day}</span>`).join("")}</div>
    <div class="finance-calendar">${days.map((item) => {
      if (!item) return `<div class="calendar-cell empty"></div>`;
      const tone = item.growth > 0 ? "gain" : item.expense > 0 ? "spend" : "";
      return `<div class="calendar-cell ${tone}">
        <strong>${item.day}</strong>
        <span>增 ${money(item.growth)}</span>
        <span>消 ${money(item.expense)}</span>
      </div>`;
    }).join("")}</div>
  </section>`;
}

function backtestCard(model) {
  const width = 760;
  const height = 220;
  const padding = 24;
  const values = model.series.map((item) => item.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = model.series.map((item, index) => {
    const x = padding + (index / (model.series.length - 1)) * (width - padding * 2);
    const y = height - padding - ((item.value - min) / range) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return `<section class="card">
    <div class="section-title"><h2>回测模型</h2><span class="badge">36 个月策略模拟</span></div>
    <div class="backtest-layout">
      <div class="backtest-controls">
        ${recordsRows([
          ["初始资金", money(model.principal)],
          ["每月定投", money(model.monthlyInvest)],
          ["年化假设", percent(model.annualReturn)],
          ["压力回撤", percent(model.maxDrawdown)],
        ])}
      </div>
      <div>
        <div class="grid cols-4 compact-metrics">
          ${metric("累计投入", money(model.invested), "本金 + 定投")}
          ${metric("期末资产", money(model.finalValue), "模拟资金曲线")}
          ${metric("模拟收益", money(model.profit), "期末资产 - 投入")}
          ${metric("年化收益", percent(model.annualized), `胜率 ${percent(model.winRate)}`)}
        </div>
        <svg class="backtest-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="回测资金曲线">
          <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" />
          <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" />
          <polyline points="${points}" />
        </svg>
        <p class="muted">模型用于策略比较和风险观察，后续可接入真实历史行情、资产配置比例、止盈止损和再平衡规则。</p>
      </div>
    </div>
  </section>`;
}

function recordsTable(records) {
  return `<table class="table"><thead><tr><th>日期</th><th>类型</th><th>分类</th><th>账户</th><th>金额</th><th>备注</th></tr></thead>
    <tbody>${records.map((r) => {
      const account = state.accounts.find((a) => a.id === r.accountId);
      return `<tr><td>${r.date}</td><td>${typeLabel(r.type)}</td><td>${r.category} / ${r.sub}</td><td>${account?.name || "-"}</td><td>${money(convert(r.amount, r.currency))}</td><td>${r.note}</td></tr>`;
    }).join("")}</tbody></table>`;
}

function ledgerRecordTable(records) {
  const sorted = [...records].sort((a, b) => `${b.date}${b.createdAt || ""}`.localeCompare(`${a.date}${a.createdAt || ""}`));
  return `<div class="record-table-wrap"><table class="ledger-table record-table">
    <thead><tr><th class="col-type">类型</th><th class="col-amount">金额</th><th class="col-category">一级分类</th><th class="col-account">账户</th><th class="col-date">日期</th><th class="col-recorder">记录人</th><th class="col-tag">标签</th><th class="col-note">备注</th><th class="col-actions">操作</th></tr></thead>
    <tbody>${sorted.map((record) => {
      const account = state.accounts.find((item) => item.id === record.accountId);
      return `<tr>
        <td class="col-type">${typeLabel(record.type)}</td>
        <td class="col-amount">${money(convert(record.amount, record.currency))}</td>
        <td class="col-category">${record.category || "-"}</td>
        <td class="col-account">${account?.name || record.accountId || "-"}</td>
        <td class="col-date">${record.date || "-"}</td>
        <td class="col-recorder">${record.recorder || state.user.name || "本人"}</td>
        <td class="col-tag">${record.tag || "-"}</td>
        <td class="col-note">${record.note || "-"}</td>
        <td class="col-actions table-actions">
          <button data-action="edit-record" data-id="${record.id}">编辑</button>
          <button data-action="delete-record" data-id="${record.id}">删除</button>
        </td>
      </tr>`;
    }).join("") || `<tr><td colspan="9" class="muted">当前筛选范围暂无记账记录</td></tr>`}</tbody>
  </table></div>`;
}

function recordsRows(rows) {
  return `<table class="table"><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function typeLabel(type) {
  return ({ income: "收入", expense: "消费", transfer: "转账" })[type] || type;
}

function bindViewActions() {
  document.querySelectorAll(".trend-chart-scroll").forEach(bindHorizontalDrag);
  document.querySelectorAll(".trend-yoy-row").forEach(bindTrendYoyResize);
  document.querySelector("#financeStockFilterForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    financeStockFilters = {
      query: String(data.query || "").trim(),
      kind: data.kind || "all",
      category: data.category || "all",
      subcategory: data.subcategory || "all",
      tertiaryCategory: data.tertiaryCategory || "all",
      positionGroup: data.positionGroup || "all",
      positionCategory: data.positionCategory || "all",
      market: data.market || "all",
      currency: data.currency || "all",
      accountId: data.accountId || "all",
    };
    render();
  });
  document.querySelectorAll("[data-action='reset-finance-filter']").forEach((button) => button.addEventListener("click", () => {
    financeStockFilters = {
      query: "",
      kind: "all",
      category: "all",
      subcategory: "all",
      tertiaryCategory: "all",
      positionGroup: "all",
      positionCategory: "all",
      market: "all",
      currency: "all",
      accountId: "all",
    };
    render();
  }));
  document.querySelectorAll("[data-action='open-premium-tool']").forEach((button) => button.addEventListener("click", () => {
    currentModule = "premiumTool";
    document.querySelector(".shell").scrollTop = 0;
    render();
  }));
  document.querySelectorAll("[data-action='back-tools']").forEach((button) => button.addEventListener("click", () => {
    currentModule = "tools";
    document.querySelector(".shell").scrollTop = 0;
    render();
  }));
  document.querySelectorAll("[data-action='refresh-premium']").forEach((button) => button.addEventListener("click", () => {
    void loadPremiumMarket(true);
  }));
  // Handle filter changes
  window.updatePremiumFilter = function(filterType, value) {
    if (filterType === 'type1') {
      premiumType1Filter = value;
    } else if (filterType === 'dataType2') {
      premiumDataType2Filter = value;
    } else if (filterType === 'arbitrage') {
      premiumArbitrageFilter = value;
    } else if (filterType === 'transfer') {
      premiumTransferFilter = value;
    } else if (filterType === 'status') {
      premiumStatusFilter = value;
    }
    premiumCurrentPage = 1;
    render();
  };
  
  // Handle quick filter from summary cards (toggle on/off)
  window.setPremiumQuickFilter = function(filterType) {
    if (premiumQuickFilter === filterType) {
      // If already selected, deselect it (go back to 'all')
      premiumQuickFilter = 'all';
    } else {
      // Otherwise, select the new filter
      premiumQuickFilter = filterType;
    }
    premiumCurrentPage = 1;
    render();
  };
  
  // Reset quick filter
  window.resetPremiumQuickFilter = function() {
    resetPremiumFilters({ refresh: true });
  };
  // Handle sort toggle
  window.togglePremiumSort = function(field) {
    if (premiumSortField === field) {
      // Toggle order if same field
      premiumSortOrder = premiumSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      // New field, default to desc
      premiumSortField = field;
      premiumSortOrder = 'desc';
    }
    render();
  };
  document.querySelector("#premiumSearchForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    premiumQuery = String(new FormData(event.currentTarget).get("query") || "").trim();
    premiumCurrentPage = 1;
    render();
  });
  
  // Handle quick filter clicks on summary cards
  document.querySelector(".premium-summary")?.addEventListener("click", (event) => {
    const card = event.target.closest("[data-quick-filter]");
    if (card) {
      const filterType = card.dataset.quickFilter;
      if (filterType === "all") {
        premiumQuickFilter = "all";
      } else {
        premiumQuickFilter = premiumQuickFilter === filterType ? "all" : filterType;
      }
      premiumCurrentPage = 1;
      render();
      return;
    }
  });
  document.querySelectorAll("[data-action='reset-premium-filter']").forEach((button) => button.addEventListener("click", () => {
    resetPremiumFilters({ refresh: true });
  }));
  
  // Handle dataType2 change
  window.updateDataType2 = function(code, value) {
    premiumDataType2Map[code] = value;
    // Update the row data in premiumRows
    const row = premiumRows.find(r => r.code === code);
    if (row) {
      row.dataType2 = value;
    }
    console.log(`Updated ${code} dataType2 to ${value}`);
  };
  
  // Handle premium holdings update
  window.updatePremiumHolding = function(code, field, value) {
    if (!premiumHoldingsMap[code]) {
      premiumHoldingsMap[code] = {};
    }
    const numValue = value !== '' ? parseFloat(value) : undefined;
    premiumHoldingsMap[code][field] = numValue;
    premiumHoldingsMap[code].timestamp = Date.now();
    
    // Auto-calculate ratio if amount is updated
    if (field === 'amount' && numValue !== undefined) {
      autoCalculateRatio(code);
    }
    
    savePremiumHoldingsData();
    render();
  };
  
  // Auto-calculate holding ratio based on total filtered assets
  function autoCalculateRatio(code) {
    const holdingsData = premiumHoldingsMap[code];
    if (!holdingsData.amount || holdingsData.amount === undefined) return;
    
    recalculateAllRatios();
  }
  
  document.querySelectorAll("[data-action='open-finance-analysis']").forEach((button) => button.addEventListener("click", () => {
    currentModule = "financeAnalysis";
    financeAnalysisScope = "all";
    financeAnalysisSelection = "all";
    document.querySelector(".shell").scrollTop = 0;
    render();
  }));
  document.querySelectorAll("[data-action='back-finance']").forEach((button) => button.addEventListener("click", () => {
    currentModule = "finance";
    document.querySelector(".shell").scrollTop = 0;
    render();
  }));
  document.querySelectorAll("[data-action='finance-analysis-scope']").forEach((button) => button.addEventListener("click", () => {
    financeAnalysisScope = button.dataset.scope;
    financeAnalysisSelection = "all";
    render();
  }));
  document.querySelectorAll("[data-action='finance-analysis-filter']").forEach((button) => button.addEventListener("click", () => {
    financeAnalysisSelection = button.dataset.value;
    render();
  }));
  document.querySelectorAll("[data-action='finance-analysis-metric']").forEach((button) => button.addEventListener("click", () => {
    financeAnalysisMetric = financeAnalysisMetric === "profit" ? "asset" : "profit";
    render();
  }));
  document.querySelectorAll("[data-action='finance-analysis-period']").forEach((button) => button.addEventListener("click", () => {
    financeAnalysisPeriod = button.dataset.period;
    render();
  }));
  document.querySelectorAll("[data-action='finance-calendar-mode']").forEach((button) => button.addEventListener("click", () => {
    financeCalendarMode = button.dataset.mode;
    const now = new Date();
    financeCalendarValue = financeCalendarMode === "day"
      ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
      : financeCalendarMode === "month"
        ? String(now.getFullYear())
        : "1";
    render();
  }));
  document.querySelectorAll("[data-action='finance-calendar-value']").forEach((select) => select.addEventListener("change", () => {
    financeCalendarValue = select.value;
    render();
  }));
  document.querySelectorAll("[data-action='finance-calendar-metric']").forEach((button) => button.addEventListener("click", () => {
    financeCalendarMetric = financeCalendarMetric === "amount" ? "rate" : "amount";
    render();
  }));
  document.querySelectorAll("[data-action='ledger-mode']").forEach((button) => button.addEventListener("click", () => {
    ledgerPeriodMode = button.dataset.mode;
    const now = new Date();
    if (ledgerPeriodMode === "day") {
      ledgerDayDate = formatDate(now);
      ledgerCalendarMonth = ledgerDayDate.slice(0, 7);
      ledgerPeriod = `day-${ledgerDayDate}`;
    }
    if (ledgerPeriodMode === "month") ledgerPeriod = `month-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (ledgerPeriodMode === "year") ledgerPeriod = "year-all";
    if (ledgerPeriodMode === "custom") {
      ledgerPeriod = "custom";
      filters.periodPreset = "custom";
    }
    render();
  }));
  document.querySelectorAll("[data-action='ledger-period']").forEach((button) => button.addEventListener("click", () => {
    ledgerPeriod = button.dataset.period;
    render();
  }));
  document.querySelectorAll("[data-action='ledger-day']").forEach((button) => button.addEventListener("click", () => {
    ledgerDayDate = button.dataset.date;
    ledgerCalendarMonth = ledgerDayDate.slice(0, 7);
    ledgerPeriod = `day-${ledgerDayDate}`;
    render();
  }));
  document.querySelectorAll("[data-action='ledger-calendar-month']").forEach((button) => button.addEventListener("click", () => {
    const [year, month] = ledgerCalendarMonth.split("-").map(Number);
    const nextMonth = new Date(year, month - 1 + Number(button.dataset.offset), 1);
    ledgerCalendarMonth = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
    render();
  }));
  document.querySelectorAll("[data-action='ledger-trend']").forEach((button) => button.addEventListener("click", () => {
    ledgerTrendMode = button.dataset.mode;
    render();
  }));
  document.querySelectorAll("#ledgerStartDate, #ledgerEndDate").forEach((input) => input.addEventListener("change", () => {
    ledgerPeriodMode = "custom";
    ledgerPeriod = "custom";
    filters.periodPreset = "custom";
    filters.startDate = document.querySelector("#ledgerStartDate")?.value || filters.startDate;
    filters.endDate = document.querySelector("#ledgerEndDate")?.value || filters.endDate;
    render();
  }));
  document.querySelectorAll("[data-action='analysis-mode']").forEach((button) => button.addEventListener("click", () => {
    analysisPeriodMode = button.dataset.mode;
    const now = new Date();
    if (analysisPeriodMode === "day") analysisPeriod = "day";
    if (analysisPeriodMode === "month") analysisPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (analysisPeriodMode === "year") analysisPeriod = String(now.getFullYear());
    if (analysisPeriodMode === "custom") {
      analysisPeriod = "custom";
    }
    render();
  }));
  document.querySelectorAll("[data-action='analysis-period']").forEach((button) => button.addEventListener("click", () => {
    analysisPeriod = button.dataset.period;
    render();
  }));
  document.querySelectorAll("#analysisStartDate, #analysisEndDate").forEach((input) => input.addEventListener("change", () => {
    analysisPeriodMode = "custom";
    analysisPeriod = "custom";
    filters.startDate = document.querySelector("#analysisStartDate")?.value || filters.startDate;
    filters.endDate = document.querySelector("#analysisEndDate")?.value || filters.endDate;
    render();
  }));
  document.querySelectorAll("[data-action='auth-mode']").forEach((button) => button.addEventListener("click", () => {
    authMode = button.dataset.mode;
    if (authMode === "login") authLoginMethod = "account";
    render();
  }));
  document.querySelectorAll("[data-action='auth-login-method']").forEach((button) => button.addEventListener("click", () => {
    authLoginMethod = button.dataset.method;
    render();
  }));
  document.querySelectorAll("[data-action='send-auth-code']").forEach((button) => button.addEventListener("click", handleSendAuthCode));
  document.querySelectorAll("[data-action='toggle-password']").forEach((button) => button.addEventListener("click", () => {
    const input = button.closest(".password-field")?.querySelector("input");
    if (!input) return;
    const showPassword = input.type === "password";
    input.type = showPassword ? "text" : "password";
    button.classList.toggle("is-visible", showPassword);
    button.setAttribute("aria-label", showPassword ? "隐藏密码" : "显示密码");
    button.title = showPassword ? "隐藏密码" : "显示密码";
  }));
  document.querySelector("#authForm")?.addEventListener("submit", handleAuthSubmit);
  document.querySelector("#profileForm")?.addEventListener("submit", handleProfileSubmit);
  document.querySelector("#preferenceForm")?.addEventListener("submit", handlePreferenceSubmit);
  document.querySelector("#feedbackForm")?.addEventListener("submit", handleFeedbackSubmit);
  if (currentModule === "profile" && auth.token) loadFeedbackList();
  document.querySelectorAll("[data-action='logout']").forEach((button) => button.addEventListener("click", () => {
    apiRequest("/auth/logout", { method: "POST" }).catch(() => {});
    auth.token = "";
    auth.currentUser = "";
    auth.users = [];
    saveAuth();
    authMode = "login";
    currentModule = "overview";
    state = normalizeLoadedState(structuredClone(seed));
    localStorage.removeItem("asset-platform-v18");
    render();
  }));
  document.querySelectorAll("[data-action='edit-record']").forEach((button) => button.addEventListener("click", () => {
    const record = state.records.find((item) => item.id === Number(button.dataset.id));
    if (record) openRecordDialog(record);
  }));
  document.querySelectorAll("[data-action='delete-record']").forEach((button) => button.addEventListener("click", () => {
    if (!window.confirm("确认删除这条记账记录吗？")) return;
    state.records = state.records.filter((record) => record.id !== Number(button.dataset.id));
    saveState();
    render();
  }));
  document.querySelectorAll("[data-action='new-debt']").forEach((button) => button.addEventListener("click", openDebtDialog));
  document.querySelectorAll("[data-action='edit-debt']").forEach((button) => button.addEventListener("click", () => {
    const debt = state.debts.find((item) => item.id === Number(button.dataset.id));
    if (debt) openDebtDialog(debt);
  }));
  document.querySelectorAll("[data-action='delete-debt']").forEach((button) => button.addEventListener("click", () => {
    const debt = state.debts.find((item) => item.id === Number(button.dataset.id));
    if (!debt || !window.confirm(`确认删除「${debt.name}」吗？`)) return;
    state.debts = state.debts.filter((item) => item.id !== debt.id);
    saveState();
    render();
  }));
  document.querySelectorAll("[data-action='toggle-debt-payment']").forEach((button) => button.addEventListener("click", () => {
    const debt = state.debts.find((item) => item.id === Number(button.dataset.id));
    if (!debt) return;
    const shell = document.querySelector(".shell");
    const scrollTop = shell?.scrollTop || 0;
    const scheduleScrollTop = button.closest(".debt-schedule")?.scrollTop || 0;
    const period = Number(button.dataset.period);
    const plan = debtPlan(debt);
    const row = plan.schedule.find((item) => item.period === period);
    debt.payments = debt.payments || {};
    debt.payments[period] = nextDebtStatus(debtPaymentStatus(debt, row), debt.category);
    saveState();
    render();
    if (shell) shell.scrollTop = scrollTop;
    const updatedSchedule = document.querySelector(`.debt-card[data-debt-id="${debt.id}"] .debt-schedule`);
    if (updatedSchedule) updatedSchedule.scrollTop = scheduleScrollTop;
  }));
  document.querySelectorAll("[data-action='new-account']").forEach((button) => button.addEventListener("click", () => openAccountDialog()));
  document.querySelectorAll("[data-action='edit-account']").forEach((button) => button.addEventListener("click", () => {
    const account = state.accounts.find((item) => item.id === button.dataset.id);
    if (account) openAccountDialog(account);
  }));
  document.querySelectorAll("[data-action='delete-account']").forEach((button) => button.addEventListener("click", () => {
    if (state.accounts.length <= 1) {
      window.alert("至少需要保留一个账户。");
      return;
    }
    const account = state.accounts.find((item) => item.id === button.dataset.id);
    if (!account || !window.confirm(`确认删除账户「${account.name}」吗？`)) return;
    state.accounts = state.accounts.filter((item) => item.id !== button.dataset.id);
    if (filters.account === button.dataset.id) filters.account = "all";
    saveState();
    render();
  }));
  document.querySelectorAll("[data-action='show-account-fees']").forEach((button) => button.addEventListener("click", () => {
    const accountId = button.dataset.accountId;
    showAccountFeeDetail(accountId);
  }));
  document.querySelectorAll("[data-action='show-asset-fees']").forEach((button) => button.addEventListener("click", () => {
    const assetId = Number(button.dataset.assetId);
    showSingleAssetFeeDetail(assetId);
  }));
  document.querySelectorAll("[data-action='show-holding-detail']").forEach((button) => button.addEventListener("click", () => {
    const assetId = Number(button.dataset.id);
    openHoldingDetail(assetId);
  }));
  document.querySelectorAll("[data-action='show-kline-chart']").forEach((el) => el.addEventListener("click", (e) => {
    e.preventDefault();
    const assetId = Number(el.dataset.id);
    openKlineChart(assetId);
  }));
  document.querySelectorAll("[data-action='new-finance-asset']").forEach((button) => button.addEventListener("click", () => openFinanceAssetDialog(null, button.dataset.kind)));
  // ── 刷新行情数据 ──
  document.querySelectorAll("[data-action='refresh-quotes']").forEach((button) => button.addEventListener("click", async () => {
    button.disabled = true;
    button.classList.add("is-loading");
    button.innerHTML = '<svg class="btn-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/></svg>刷新中';
    await fetchRealtimeQuotes();
    button.classList.remove("is-loading");
    button.innerHTML = "刷新行情";
    button.disabled = false;
    render();
  }));
  // ── 股票表格交互：排序、拖拽列、显示字段 ──
  document.querySelectorAll(".stock-card-table thead th[data-sort-key]").forEach((th) => {
    th.addEventListener("click", (e) => {
      if (e.target.closest("[draggable]") && e.type === "click" && th.dragStartFired) { th.dragStartFired = false; return; }
      const key = th.dataset.sortKey;
      if (stockTableConfig.sortKey === key) {
        stockTableConfig.sortDir = stockTableConfig.sortDir === "asc" ? "desc" : "asc";
      } else {
        stockTableConfig.sortKey = key;
        stockTableConfig.sortDir = "asc";
      }
      render();
    });
    th.style.cursor = "pointer";
  });
  // 列拖拽排序
  let dragColKey = null;
  document.querySelectorAll(".stock-card-table thead th[draggable]").forEach((th) => {
    th.addEventListener("dragstart", (e) => {
      dragColKey = th.dataset.col;
      th.dragStartFired = true;
      e.dataTransfer.effectAllowed = "move";
      th.style.opacity = "0.4";
    });
    th.addEventListener("dragend", () => { th.style.opacity = ""; });
    th.addEventListener("dragover", (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; th.classList.add("drag-over"); });
    th.addEventListener("dragleave", () => th.classList.remove("drag-over"));
    th.addEventListener("drop", (e) => {
      e.preventDefault();
      th.classList.remove("drag-over");
      const targetKey = th.dataset.col;
      if (!dragColKey || dragColKey === targetKey) return;
      const cols = stockTableConfig.columns;
      const fromIdx = cols.indexOf(dragColKey);
      const toIdx = cols.indexOf(targetKey);
      if (fromIdx < 0 || toIdx < 0) return;
      cols.splice(fromIdx, 1);
      cols.splice(toIdx, 0, dragColKey);
      render();
    });
  });
  // 显示字段面板
  document.querySelectorAll(".stock-col-toggle-btn[data-panel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const panel = document.getElementById(btn.dataset.panel);
      if (panel) panel.hidden = !panel.hidden;
    });
  });
  document.querySelectorAll(".stock-col-panel input[type='checkbox']").forEach((cb) => {
    cb.addEventListener("change", () => {
      stockTableConfig.visible[cb.dataset.col] = cb.checked;
      render();
    });
  });
  document.querySelectorAll("[data-action='edit-finance-asset']").forEach((button) => button.addEventListener("click", () => {
    const asset = state.financeAssets.find((item) => item.id === Number(button.dataset.id));
    if (asset) openFinanceAssetDialog(asset);
  }));
  document.querySelectorAll("[data-action='delete-finance-asset']").forEach((button) => button.addEventListener("click", () => {
    const asset = state.financeAssets.find((item) => item.id === Number(button.dataset.id));
    if (!asset || !window.confirm(`确认删除理财资产「${asset.name}」吗？`)) return;
    state.financeAssets = state.financeAssets.filter((item) => item.id !== asset.id);
    syncAssetClassValuesFromFinance();
    saveState();
    render();
  }));
  document.querySelectorAll("[data-action='activate-strategy']").forEach((button) => button.addEventListener("click", () => {
    state.strategies.forEach((s) => (s.active = s.id === Number(button.dataset.id)));
    saveState();
    render();
  }));
  document.querySelectorAll("[data-action='toggle-class']").forEach((button) => button.addEventListener("click", () => {
    const item = state.assetClasses.find((c) => c.id === button.dataset.id);
    item.visible = !item.visible;
    saveState();
    render();
  }));
  document.querySelectorAll("[data-action='new-asset-class']").forEach((button) => button.addEventListener("click", () => openAssetClassDialog()));
  document.querySelectorAll("[data-action='edit-asset-class']").forEach((button) => button.addEventListener("click", () => {
    const item = state.assetClasses.find((c) => c.id === button.dataset.id);
    if (item) openAssetClassDialog(item);
  }));
  document.querySelectorAll("[data-action='delete-asset-class']").forEach((button) => button.addEventListener("click", () => deleteAssetClass(button.dataset.id)));
  document.querySelectorAll("[data-action='edit-class-target']").forEach((button) => button.addEventListener("click", () => {
    const id = button.dataset.id;
    const item = state.assetClasses.find((c) => c.id === id);
    if (!item) return;
    const current = Number(item.targetValue) || 0;
    const input = window.prompt(`设置「${item.name}」的目标价值（当前: ${money(current)}）`, String(current));
    if (input === null) return;
    const val = Number(input.replace(/,/g, ""));
    if (isNaN(val) || val < 0) { window.alert("请输入有效的数值"); return; }
    item.targetValue = val;
    saveState();
    render();
  }));
  document.querySelectorAll("[data-action='move-asset-class']").forEach((button) => button.addEventListener("click", () => {
    moveAssetClass(button.dataset.id, Number(button.dataset.offset));
  }));
  bindAssetClassSorting();
  document.querySelectorAll("[data-action='export']").forEach((button) => button.addEventListener("click", exportCsv));
  document.querySelectorAll("[data-action='upload-avatar']").forEach((button) => button.addEventListener("click", () => {
    document.querySelector("#avatarInput")?.click();
  }));
  document.querySelector("#avatarInput")?.addEventListener("change", handleAvatarUpload);

  // Goals dialog
  document.querySelectorAll("[data-action='edit-goals']").forEach((button) => button.addEventListener("click", () => {
    const dialog = document.querySelector("#goalsDialog");
    const form = document.querySelector("#goalsForm");
    const g = state.overviewGoals || {};
    form.overall.value = g.overall || 0;
    form.thisYear.value = g.thisYear || 0;
    form.annualizedRate.value = g.annualizedRate || 0;
    dialog.showModal();
  }));
  document.querySelector("#goalsForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    state.overviewGoals = {
      overall: Number(data.overall) || 0,
      thisYear: Number(data.thisYear) || 0,
      annualizedRate: Number(data.annualizedRate) || 0,
    };
    saveState();
    document.querySelector("#goalsDialog").close();
    render();
  });

  // 年度目标管理
  document.querySelectorAll("[data-action='add-annual-goal']").forEach((button) => button.addEventListener("click", () => {
    openAnnualGoalDialog(null);
  }));
  document.querySelectorAll("[data-action='edit-annual-goal']").forEach((button) => button.addEventListener("click", () => {
    const year = Number(button.dataset.year);
    openAnnualGoalDialog(year);
  }));
  document.querySelectorAll("[data-action='delete-annual-goal']").forEach((button) => button.addEventListener("click", () => {
    const year = Number(button.dataset.year);
    if (confirm(`确定要删除 ${year} 年的年度目标吗？`)) {
      deleteAnnualGoal(year);
    }
  }));
}

// 年度目标管理函数
function openAnnualGoalDialog(year) {
  const dialog = document.querySelector("#annualGoalDialog");
  const form = document.querySelector("#annualGoalForm");
  const title = document.querySelector("#annualGoalTitle");
  
  if (year) {
    // 编辑模式
    title.textContent = `编辑 ${year} 年目标`;
    const row = state.annualGoals?.find(g => g.year === year);
    form.year.value = year;
    form.yearDisplay.value = year;
    form.opening.value = row?.opening || 0;
    form.targetRate.value = row?.targetRate || 15;
    form.actualProfit.value = row?.actualProfit || 0;
  } else {
    // 新增模式
    title.textContent = "新增年度目标";
    const currentYear = new Date().getFullYear();
    form.year.value = "";
    form.yearDisplay.value = currentYear; // 默认当前年，用户可以修改
    form.opening.value = 0;
    form.targetRate.value = 15;
    form.actualProfit.value = 0;
  }
  
  dialog.showModal();
}

function handleAnnualGoalSubmit(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const year = Number(data.yearDisplay);
  const opening = Number(data.opening);
  const targetRate = Number(data.targetRate);
  const actualProfit = Number(data.actualProfit);
  
  if (!state.annualGoals) state.annualGoals = [];
  
  const existingIndex = state.annualGoals.findIndex(g => g.year === year);
  const goalData = { year, opening, targetRate, actualProfit };
  
  console.log('保存年度目标:', goalData);
  console.log('当前所有年度目标:', state.annualGoals);
  
  if (existingIndex >= 0) {
    state.annualGoals[existingIndex] = goalData;
  } else {
    state.annualGoals.push(goalData);
    state.annualGoals.sort((a, b) => a.year - b.year);
  }
  
  console.log('保存后的年度目标:', state.annualGoals);
  
  saveState();
  document.querySelector("#annualGoalDialog").close();
  render();
}

function deleteAnnualGoal(year) {
  if (!state.annualGoals) return;
  state.annualGoals = state.annualGoals.filter(g => g.year !== year);
  saveState();
  render();
}

function bindHorizontalDrag(element) {
  let dragging = false;
  let startX = 0;
  let startScrollLeft = 0;
  element.addEventListener("pointerdown", (event) => {
    dragging = true;
    startX = event.clientX;
    startScrollLeft = element.scrollLeft;
    element.setPointerCapture(event.pointerId);
  });
  element.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    element.scrollLeft = startScrollLeft - (event.clientX - startX);
  });
  element.addEventListener("pointerup", (event) => {
    dragging = false;
    element.releasePointerCapture(event.pointerId);
  });
  element.addEventListener("pointercancel", () => {
    dragging = false;
  });
}

function bindTrendYoyResize(row) {
  const handle = row.querySelector(".layout-resizer");
  if (!handle) return;
  let dragging = false;
  handle.addEventListener("pointerdown", (event) => {
    if (window.matchMedia("(max-width: 1180px)").matches) return;
    dragging = true;
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const rect = row.getBoundingClientRect();
    const gutter = handle.getBoundingClientRect().width + 20;
    const minLeft = Math.min(360, rect.width * 0.45);
    const minRight = Math.min(280, rect.width * 0.32);
    const maxLeft = Math.max(minLeft, rect.width - gutter - minRight);
    const left = Math.min(Math.max(event.clientX - rect.left, minLeft), maxLeft);
    const right = Math.max(rect.width - gutter - left, minRight);
    row.style.gridTemplateColumns = `${left}px 10px ${right}px`;
  });
  const endDrag = (event) => {
    dragging = false;
    if (handle.hasPointerCapture?.(event.pointerId)) handle.releasePointerCapture(event.pointerId);
  };
  handle.addEventListener("pointerup", endDrag);
  handle.addEventListener("pointercancel", endDrag);
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.querySelector("#authMessage");
  const data = Object.fromEntries(new FormData(form));
  const account = String(data.account || "").trim();
  const password = String(data.password || "").trim();
  const phone = String(data.phone || "").trim();
  const smsCode = String(data.smsCode || "").trim();
  const submit = form.querySelector("button[type='submit']");
  submit.disabled = true;
  message.textContent = authMode === "register" ? "正在创建账号..." : authMode === "forgot" ? "正在重置密码..." : "正在登录...";
  try {
    const endpoint = authMode === "register"
      ? "/auth/register"
      : authMode === "forgot"
        ? "/auth/reset-password"
        : authLoginMethod === "phone"
          ? "/auth/phone-login"
          : "/auth/login";
    const body = authMode === "register"
      ? {
        account,
        password,
        name: String(data.name || "").trim(),
        phone,
        smsCode,
        email: String(data.email || "").trim(),
        currency: data.currency,
        initialState: legacyStatePending ? state : undefined,
      }
      : authMode === "forgot"
        ? { phone, smsCode, password }
        : authLoginMethod === "phone"
          ? { phone, smsCode }
          : { account, password };
    const payload = await apiRequest(endpoint, {
      method: "POST",
      body,
    });
    completeAuthentication(payload);
  } catch (error) {
    message.textContent = error.message;
    submit.disabled = false;
  }
}

async function handleSendAuthCode(event) {
  const button = event.currentTarget;
  const form = document.querySelector("#authForm");
  const phone = String(new FormData(form).get("phone") || "").trim();
  const message = document.querySelector("#authMessage");
  if (!/^1\d{10}$/.test(phone)) {
    message.textContent = "请先输入正确的 11 位手机号。";
    return;
  }
  button.disabled = true;
  button.textContent = "发送中...";
  try {
    const payload = await apiRequest("/auth/sms/send", {
      method: "POST",
      body: { phone, purpose: button.dataset.purpose },
    });
    message.textContent = payload.debugCode
      ? `测试验证码：${payload.debugCode}（配置短信服务后将直接发送到手机）`
      : payload.message;
    let seconds = 60;
    button.textContent = `${seconds} 秒后重发`;
    const timer = window.setInterval(() => {
      seconds -= 1;
      if (seconds <= 0 || !document.body.contains(button)) {
        window.clearInterval(timer);
        if (document.body.contains(button)) {
          button.disabled = false;
          button.textContent = "获取验证码";
        }
        return;
      }
      button.textContent = `${seconds} 秒后重发`;
    }, 1000);
  } catch (error) {
    message.textContent = error.message;
    button.disabled = false;
    button.textContent = "获取验证码";
  }
}

function completeAuthentication(payload) {
  auth = {
    token: payload.token,
    currentUser: payload.user.account,
    users: [{ account: payload.user.account, profile: payload.user }],
  };
  saveAuth();
  if (payload.isAdmin) {
    localStorage.setItem("admin_token", payload.token);
    window.location.href = "/admin.html";
    return;
  }
  state = normalizeLoadedState(payload.state);
  filters.currency = state.user.currency;
  localStorage.setItem("asset-platform-v18", JSON.stringify(state));
  legacyStatePending = false;
  currentModule = "overview";
  render();
}

function handleProfileSubmit(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  state.user = {
    ...state.user,
    name: data.name.trim(),
    phone: data.phone.trim(),
    email: data.email.trim(),
    birthday: data.birthday,
    city: data.city.trim(),
    occupation: data.occupation.trim(),
    currency: data.currency,
  };
  filters.currency = state.user.currency;
  saveState();
  saveProfileToAuth();
  render();
}

function handlePreferenceSubmit(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  state.user = {
    ...state.user,
    riskLevel: data.riskLevel,
    privacyLock: data.privacyLock,
    dataMask: data.dataMask,
    deviceName: data.deviceName.trim(),
    theme: data.theme,
  };
  document.body.classList.toggle("dark", state.user.theme === "dark");
  saveState();
  saveProfileToAuth();
  render();
}

async function handleFeedbackSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  const content = data.content.trim();
  if (!content) { window.alert("请输入反馈内容"); return; }
  const btn = form.querySelector("[type='submit']");
  btn.disabled = true;
  btn.textContent = "提交中…";
  try {
    await apiRequest("/feedback", {
      method: "POST",
      body: { type: data.type, title: data.title.trim(), content },
    });
    form.reset();
    window.alert("感谢您的反馈，我们会尽快处理！");
    loadFeedbackList();
  } catch (err) {
    window.alert(err.message || "提交失败");
  } finally {
    btn.disabled = false;
    btn.textContent = "提交反馈";
  }
}

async function loadFeedbackList() {
  const container = document.querySelector("#feedbackList");
  if (!container) return;
  try {
    const { feedback } = await apiRequest("/feedback");
    if (!feedback.length) {
      container.innerHTML = `<p class="muted" style="text-align:center;padding:20px">暂无反馈记录</p>`;
      return;
    }
    const statusMap = { pending: "待处理", replied: "已回复", resolved: "已解决" };
    const statusClass = { pending: "warn", replied: "info", resolved: "good" };
    container.innerHTML = feedback.map((fb) => `
      <div class="feedback-item">
        <div class="feedback-item-head">
          <span class="badge">${fb.type || "问题"}</span>
          <span class="feedback-item-title">${escapeAttr(fb.title) || "无标题"}</span>
          <span class="feedback-status feedback-status-${statusClass[fb.status] || 'warn'}">${statusMap[fb.status] || fb.status}</span>
          <span class="muted" style="margin-left:auto;font-size:11px">${fb.created_at || ""}</span>
        </div>
        <p class="feedback-item-content">${escapeAttr(fb.content)}</p>
        ${fb.admin_reply ? `<div class="feedback-item-reply"><strong>管理员回复：</strong>${escapeAttr(fb.admin_reply)}</div>` : ""}
      </div>
    `).join("");
  } catch {
    container.innerHTML = `<p class="muted" style="text-align:center;padding:20px">加载失败</p>`;
  }
}

function openDebtDialog(debt = null) {
  const form = document.querySelector("#debtForm");
  form.reset();
  form.debtId.value = debt?.id || "";
  form.category.value = debt?.category || "payable";
  form.type.value = debt?.type || "借入";
  form.creditorName.value = debt?.creditorName || debt?.name || "";
  form.debtorName.value = debt?.debtorName || "";
  form.principal.value = debt?.principal ?? "";
  form.annualRate.value = debt?.annualRate ?? "0";
  form.startDate.value = debt?.startDate || today;
  const due = new Date();
  due.setMonth(due.getMonth() + 12);
  form.dueDate.value = debt?.dueDate || due.toISOString().slice(0, 10);
  form.repaymentMethod.value = debt?.repaymentMethod || "equalPrincipalInterest";
  form.paidAmount.value = debt?.paidAmount ?? 0;
  form.note.value = debt?.note || "";
  form.querySelector("h2").textContent = debt ? "编辑债务" : "新增债务";
  updateDebtPreview();
  document.querySelector("#debtDialog").showModal();
}

function handleDebtSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const attachment = data.get("attachment");
  const id = Number(data.get("debtId"));
  const existing = state.debts.find((item) => item.id === id);
  const debt = {
    id: id || Date.now(),
    category: data.get("category"),
    type: data.get("type"),
    creditorName: String(data.get("creditorName") || "").trim(),
    debtorName: String(data.get("debtorName") || "").trim(),
    name: `${String(data.get("creditorName") || "").trim()} → ${String(data.get("debtorName") || "").trim()}`,
    principal: Number(data.get("principal")) || 0,
    annualRate: Number(data.get("annualRate")) || 0,
    amount: Number(data.get("amount")) || 0,
    note: String(data.get("note") || "").trim(),
    attachment: attachment?.name || existing?.attachment || "",
    startDate: data.get("startDate"),
    dueDate: data.get("dueDate"),
    repaymentMethod: data.get("repaymentMethod"),
    paidAmount: Number(data.get("paidAmount")) || 0,
    payments: existing?.payments || {},
  };
  const plan = debtPlan(debt);
  debt.amount = Number(plan.totalAmount.toFixed(2));
  const index = state.debts.findIndex((item) => item.id === debt.id);
  if (index >= 0) {
    state.debts[index] = debt;
  } else {
    state.debts.unshift(debt);
  }
  saveState();
  document.querySelector("#debtDialog").close();
  render();
}

function openAccountDialog(account = null) {
  const form = document.querySelector("#accountForm");
  form.accountId.value = account?.id || "";
  form.name.value = account?.name || "";
  form.owner.value = account?.owner || state.user.name || "本人";
  form.currency.innerHTML = currencyOptions(account?.currency || state.user.currency);
  form.type.value = account?.type || "现金账户";
  form.balance.value = account?.balance ?? 0;
  form.liability.value = account?.liability ?? 0;
  form.querySelector("h2").textContent = account ? "编辑账户" : "新增账户";
  document.querySelector("#accountDialog").showModal();
}

function handleAccountSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  const id = data.accountId || `account-${Date.now()}`;
  const existing = state.accounts.find((account) => account.id === id);
  const payload = {
    id,
    name: String(data.name || "").trim(),
    owner: String(data.owner || "").trim() || "本人",
    currency: data.currency,
    type: data.type,
    balance: Number(data.balance) || 0,
    liability: Number(data.liability) || 0,
    enabled: existing?.enabled ?? true,
  };
  if (!payload.name) return;
  const index = state.accounts.findIndex((account) => account.id === id);
  if (index >= 0) {
    state.accounts[index] = { ...state.accounts[index], ...payload };
  } else {
    state.accounts.unshift(payload);
  }
  saveState();
  document.querySelector("#accountDialog").close();
  render();
}

function showAccountFeeDetail(accountId) {
  const account = state.accounts.find((a) => a.id === accountId);
  if (!account) return;
  const stockAssets = (state.financeAssets || []).filter((item) => item.accountId === accountId && item.kind === "stock" && item.market === "domestic");
  if (!stockAssets.length) {
    window.alert("该账户暂无 A 股股票资产");
    return;
  }
  const dialog = document.querySelector("#feeDetailDialog");
  const subtitle = document.querySelector("#feeDetailSubtitle");
  const list = document.querySelector("#feeDetailList");
  const cfg = state.feeConfig || seed.feeConfig;
  const totalFees = stockAssets.reduce((sum, item) => sum + calculateAssetFeeSummary(item).total, 0);
  subtitle.textContent = `税费合计: ${financeLocalMoney(totalFees, account.currency)}`;
  list.innerHTML = stockAssets.map((item) => {
    const summary = calculateAssetFeeSummary(item);
    return renderFeeDetailArticle(item, summary, cfg);
  }).join("");
  // Add edit button to menu
  const menu = dialog.querySelector("menu");
  menu.innerHTML = `<button type="button" id="editFeeConfigBtn">编辑税费规则</button><button value="cancel" type="button" id="cancelFeeDetail">关闭</button>`;
  document.querySelector("#editFeeConfigBtn").addEventListener("click", openFeeConfigDialog);
  document.querySelector("#cancelFeeDetail").addEventListener("click", () => dialog.close());
  dialog.showModal();
}

function showSingleAssetFeeDetail(assetId) {
  const asset = (state.financeAssets || []).find((item) => item.id === assetId);
  if (!asset) return;
  const summary = calculateAssetFeeSummary(asset);
  if (!summary.projected.applicable && !summary.recorded.total) {
    window.alert("该资产类型不适用税费计算");
    return;
  }
  const dialog = document.querySelector("#feeDetailDialog");
  const subtitle = document.querySelector("#feeDetailSubtitle");
  const list = document.querySelector("#feeDetailList");
  const cfg = state.feeConfig || seed.feeConfig;
  subtitle.textContent = `${asset.name} (${asset.code}) - 税费合计: ${financeLocalMoney(summary.total, asset.currency)}`;
  list.innerHTML = renderFeeDetailArticle(asset, summary, cfg);
  const menu = dialog.querySelector("menu");
  menu.innerHTML = `<button value="cancel" type="button" id="cancelFeeDetail">关闭</button>`;
  document.querySelector("#cancelFeeDetail").addEventListener("click", () => dialog.close());
  dialog.showModal();
}

function renderFeeDetailArticle(item, summary, cfg) {
  const { recorded, projected } = summary;
  const hasHead = item.name && item.code;
  return `<article class="fee-asset-detail">
    ${hasHead ? `<div class="fee-asset-head"><strong>${item.name} (${item.code})</strong><span>${financeLocalMoney(summary.total, item.currency)}</span></div>` : ""}
    <div class="fee-breakdown">
      <div class="fee-row"><span>已记录交易费用</span><em>${financeLocalMoney(recorded.total, item.currency)}</em></div>
      <p class="fee-note">按已添加的逐笔交易费用校验；券商汇总值仅在交易明细不完整时作为兜底。</p>
      <div class="fee-row"><span>预计卖出印花税</span><em>${financeLocalMoney(projected.stampDuty, item.currency)}</em></div>
      <p class="fee-note">按最新持仓市值和 ${cfg.stampDutyRate}% 估算</p>
      <div class="fee-row"><span>预计卖出佣金</span><em>${financeLocalMoney(projected.commission, item.currency)}</em></div>
      <p class="fee-note">按最新持仓市值和 ${cfg.commissionRate}% 估算，最低 ${cfg.commissionMin} 元</p>
      <div class="fee-row"><span>预计卖出过户费</span><em>${financeLocalMoney(projected.transferFee, item.currency)}</em></div>
      <p class="fee-note">沪市 ${cfg.transferFeeRateSH}%，深市 ${cfg.transferFeeRateSZ}%</p>
    </div>
  </article>`;
}

function openFeeConfigDialog() {
  const form = document.querySelector("#feeConfigForm");
  const cfg = state.feeConfig || seed.feeConfig;
  form.stampDutyRate.value = cfg.stampDutyRate;
  form.commissionRate.value = cfg.commissionRate;
  form.commissionMin.value = cfg.commissionMin;
  form.transferFeeRateSH.value = cfg.transferFeeRateSH;
  form.transferFeeRateSZ.value = cfg.transferFeeRateSZ;
  form.dividendTaxRate.value = cfg.dividendTaxRate;
  document.querySelector("#feeConfigDialog").showModal();
}

function handleFeeConfigSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  state.feeConfig = {
    stampDutyRate: Number(data.stampDutyRate) || 0,
    commissionRate: Number(data.commissionRate) || 0,
    commissionMin: Number(data.commissionMin) || 0,
    transferFeeRateSH: Number(data.transferFeeRateSH) || 0,
    transferFeeRateSZ: Number(data.transferFeeRateSZ) || 0,
    dividendTaxRate: Number(data.dividendTaxRate) || 0,
  };
  saveState();
  document.querySelector("#feeConfigDialog").close();
  render();
}

// ─── 持仓明细（Holding Detail）──────────────────────────────────────
function openHoldingDetail(assetId) {
  const asset = (state.financeAssets || []).find((item) => item.id === assetId);
  if (!asset) return;
  const dialog = document.querySelector("#holdingDetailDialog");
  pendingTradeOcrTransactions = [];
  pendingTradeOcrAssetPatch = null;
  pendingTradeOcrAssetId = null;
  pendingTradeOcrFile = null;
  if (pendingTradeOcrPreviewUrl) URL.revokeObjectURL(pendingTradeOcrPreviewUrl);
  pendingTradeOcrPreviewUrl = "";
  dialog.dataset.assetId = assetId;
  document.querySelector("#holdingDetailTitle").textContent = `${asset.name} (${asset.code})`;
  // reset to holding tab
  document.querySelectorAll(".holding-tab").forEach((t) => t.classList.remove("active"));
  document.querySelector('.holding-tab[data-tab="holding"]').classList.add("active");
  renderHoldingTabContent("holding", assetId);
  dialog.showModal();
}

function renderHoldingTabContent(tab, assetId) {
  const asset = (state.financeAssets || []).find((item) => item.id === assetId);
  if (!asset) return;
  const content = document.querySelector("#holdingTabContent");
  if (tab === "holding") content.innerHTML = renderHoldingTab(asset);
  else if (tab === "trade") content.innerHTML = renderTradeTab(asset);
  else if (tab === "fee") content.innerHTML = renderFeeDetailTab(asset);
  // bind buttons inside content
  content.querySelectorAll("[data-action='add-trade-record']").forEach((btn) => btn.addEventListener("click", () => {
    openTradeRecordDialog(Number(btn.dataset.assetId));
  }));
  content.querySelectorAll("[data-action='delete-trade']").forEach((btn) => btn.addEventListener("click", () => {
    const aId = Number(btn.dataset.assetId);
    const idx = Number(btn.dataset.index);
    deleteTradeRecord(aId, idx);
  }));
  content.querySelector("[data-action='recognize-trade-image']")?.addEventListener("click", handleTradeImageRecognition);
  content.querySelector("[data-action='confirm-trade-ocr']")?.addEventListener("click", confirmTradeOcrImport);
  content.querySelector(".trade-ocr-results")?.addEventListener("input", handleTradeOcrPreviewEdit);
  content.querySelector(".trade-ocr-results")?.addEventListener("change", handleTradeOcrPreviewEdit);
  content.querySelectorAll("[data-action='remove-trade-ocr-row']").forEach((button) => button.addEventListener("click", () => {
    pendingTradeOcrTransactions.splice(Number(button.dataset.index), 1);
    renderHoldingTabContent("trade", assetId);
  }));
  content.querySelector("[data-action='cancel-trade-ocr']")?.addEventListener("click", () => {
    pendingTradeOcrTransactions = [];
    pendingTradeOcrAssetPatch = null;
    pendingTradeOcrAssetId = null;
    pendingTradeOcrFile = null;
    if (pendingTradeOcrPreviewUrl) URL.revokeObjectURL(pendingTradeOcrPreviewUrl);
    pendingTradeOcrPreviewUrl = "";
    renderHoldingTabContent("trade", assetId);
  });
  content.querySelector("[data-trade-ocr-file]")?.addEventListener("change", (event) => {
    const file = event.currentTarget.files?.[0];
    setTradeOcrFile(file, content);
  });
  content.querySelector(".trade-ocr-panel")?.addEventListener("paste", (event) => {
    const file = imageFromClipboard(event);
    if (!file) return;
    event.preventDefault();
    setTradeOcrFile(new File([file], `clipboard-${Date.now()}.png`, { type: file.type || "image/png" }), content);
  });
  content.querySelectorAll(".holding-help-icon").forEach((icon) => icon.addEventListener("click", (e) => {
    e.stopPropagation();
    const tip = icon.nextElementSibling;
    if (tip) tip.hidden = !tip.hidden;
  }));
  
  // 绑定税费编辑按钮点击事件
  content.querySelectorAll("[data-action='edit-fee-total']").forEach((btn) => btn.addEventListener("click", () => {
    const assetId = Number(btn.dataset.assetId);
    openEditFeeTotalDialog(assetId);
  }));
}

// ── 打开编辑税费合计对话框 ──
function openEditFeeTotalDialog(assetId) {
  const asset = (state.financeAssets || []).find((a) => a.id === assetId);
  if (!asset) return;
  
  const dialog = document.querySelector("#editFeeTotalDialog");
  const form = document.querySelector("#editFeeTotalForm");
  const fields = form.elements;
  
  fields.assetId.value = assetId;
  // 如果已有手动设置的值，使用它；否则使用自动计算的值
  fields.customFeeTotal.value = asset.customFeeTotal !== undefined ? asset.customFeeTotal : calculateAssetFeeSummary(asset).total;
  
  dialog.showModal();
}

// ── 处理保存手动修改的税费合计 ──
function handleEditFeeTotalSubmit(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const assetId = Number(data.assetId);
  const customFeeTotal = Number(data.customFeeTotal);
  
  const asset = (state.financeAssets || []).find((a) => a.id === assetId);
  if (!asset) return;
  
  // 保存手动设置的值
  asset.customFeeTotal = customFeeTotal;
  saveState();
  
  document.querySelector("#editFeeTotalDialog").close();
  
  // 刷新显示
  renderHoldingTabContent("fee", assetId);
}

// ── 打开证券候选选择对话框 ──
function openSecurityCandidateDialog(index) {
  const asset = pendingFinanceOcrAssets[index];
  if (!asset || !Array.isArray(asset.lookupCandidates) || asset.lookupCandidates.length === 0) return;
  
  const dialog = document.createElement("dialog");
  dialog.id = "securityCandidateDialog";
  dialog.className = "modal-dialog";
  
  const candidates = asset.lookupCandidates.map((candidate, i) => {
    const patch = financeLookupAssetPatch(candidate);
    return `<div class="candidate-item" data-candidate-index="${i}" style="cursor:pointer;padding:8px;border:1px solid var(--line);border-radius:4px;margin-bottom:8px;">
      <div style="font-weight:600;color:var(--accent);">${escapeHtml(candidate.name)}</div>
      <div style="color:var(--muted);font-size:12px;">代码: ${escapeHtml(String(candidate.code))} | 类型: ${escapeHtml(financeKindLabel(patch.kind))} | 市场: ${patch.market === "domestic" ? "A股" : patch.market === "overseas" ? "海外" : candidate.classify}</div>
      <div style="color:var(--muted);font-size:12px;">价格: ${candidate.price ? financeLocalMoney(candidate.price, patch.currency) : "-"} | 分类: ${escapeHtml(patch.subcategory)}</div>
    </div>`;
  }).join("");
  
  dialog.innerHTML = `
    <div style="padding:24px;max-width:600px;">
      <h3>选择正确的证券 - ${escapeHtml(asset.name)}</h3>
      <p style="color:var(--muted);margin-bottom:16px;">请从以下候选列表中选择与"${escapeHtml(asset.name)}"匹配的证券：</p>
      <div class="candidate-list">${candidates}</div>
      <div style="margin-top:16px;text-align:right;">
        <button type="button" id="cancelSecurityCandidate" style="margin-right:8px;">取消</button>
        <button type="button" id="skipSecurityCandidate">跳过（使用OCR识别结果）</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(dialog);
  
  // 绑定事件
  dialog.querySelectorAll(".candidate-item").forEach((item) => {
    item.addEventListener("click", () => {
      const candidateIndex = Number(item.dataset.candidateIndex);
      applySecurityCandidate(index, candidateIndex);
      dialog.close();
      dialog.remove();
    });
  });
  
  document.querySelector("#cancelSecurityCandidate")?.addEventListener("click", () => {
    dialog.close();
    dialog.remove();
  });
  
  document.querySelector("#skipSecurityCandidate")?.addEventListener("click", () => {
    // 删除候选列表，保留OCR识别的结果
    delete asset.lookupCandidates;
    dialog.close();
    dialog.remove();
    renderFinanceOcrResultPreview();
  });
  
  dialog.showModal();
}

// ─ 应用选择的证券候选 ──
function applySecurityCandidate(assetIndex, candidateIndex) {
  const asset = pendingFinanceOcrAssets[assetIndex];
  if (!asset || !Array.isArray(asset.lookupCandidates)) return;
  
  const candidate = asset.lookupCandidates[candidateIndex];
  if (!candidate) return;
  
  const patch = financeLookupAssetPatch(candidate);
  
  // 更新资产信息
  Object.assign(asset, {
    ...patch,
    costPrice: asset.costPrice ?? candidate.price ?? null,
    currentPrice: asset.currentPrice ?? candidate.price ?? null,
    source: `${asset.source || "图片识别"} / 用户选择`,
    confidence: Math.max(asset.confidence || 0, 0.98),
  });
  
  // 删除候选列表
  delete asset.lookupCandidates;
  
  // 重新渲染
  renderFinanceOcrResultPreview();
}

// ── 持仓 Tab：汇总 + 每笔持仓卡片 ──
function computeHoldingLots(asset) {
  const txns = (asset.transactions || []).slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const lots = []; // each: { date, direction, shares, costPrice, remainingShares, marketValue, pnl }
  let totalShares = 0;
  // 摊薄成本：累计 = +买入金额 +所有交易费用 -卖出金额
  let dilutedCost = 0;
  // 买入均价成本：买入时累加买入金额+买入费用，卖出时按比例减少
  let buyAvgCost = 0;

  for (const txn of txns) {
    const shares = Number(txn.shares) || 0;
    const price = Number(txn.price) || 0;
    const tradeAmount = shares * price;
    const fee = (Number(txn.commission) || 0) + (Number(txn.stampDuty) || 0) + (Number(txn.transferFee) || 0);
    if (txn.direction === "buy") {
      lots.push({ date: txn.date, shares, costPrice: price, remainingShares: shares, direction: "buy" });
      totalShares += shares;
      // 摊薄成本：+买入金额 +交易费用
      dilutedCost += tradeAmount + fee;
      // 买入均价：+买入金额 +买入费用
      buyAvgCost += tradeAmount + fee;
    } else {
      // sell: reduce from earliest lots (FIFO)
      let toSell = shares;
      for (const lot of lots) {
        if (toSell <= 0) break;
        const reduce = Math.min(lot.remainingShares, toSell);
        lot.remainingShares -= reduce;
        toSell -= reduce;
      }
      // 摊薄成本：-卖出金额 +卖出费用
      dilutedCost -= tradeAmount;
      dilutedCost += fee;
      // 买入均价：按比例减少 → 买入成本 × (1 - 卖出数量 / 卖出前持仓数量)
      const prevShares = totalShares;
      totalShares -= shares;
      if (prevShares > 0) {
        buyAvgCost *= (1 - shares / prevShares);
      } else {
        buyAvgCost = 0;
      }
    }
  }
  const activeLots = lots.filter((l) => l.remainingShares > 0);
  // 摊薄成本价 = 摊薄成本 / 持仓数量
  const dilutedCostPrice = totalShares > 0 ? dilutedCost / totalShares : 0;
  // 买入均价 = 买入成本 / 持仓数量
  const buyAvgPrice = totalShares > 0 ? buyAvgCost / totalShares : 0;
  const avgCost = buyAvgPrice; // 默认使用买入均价
  const marketPrice = Number(asset.shares) > 0 ? financeAssetValue(asset) / Number(asset.shares) : avgCost;
  return { lots: activeLots, totalShares, totalCost: buyAvgCost, avgCost, marketPrice, dilutedCost, dilutedCostPrice, buyAvgCost, buyAvgPrice };
}

function renderHoldingTab(asset) {
  const { lots, totalShares, totalCost, avgCost, marketPrice: calcMarketPrice, dilutedCostPrice, buyAvgPrice } = computeHoldingLots(asset);
  const currentShares = Number(asset.shares) || 0;
  // 现价：实时价 → 昨收价 → 保存的currentPrice → 成本+盈亏反算
  const quoteData = realtimeQuoteMap[asset.code] || {};
  const realTimePrice = Number(quoteData.price) > 0;
  const marketPrice = resolveAssetPrice(asset) || calcMarketPrice;
  // 持仓市值：现价 × 份额
  const totalValue = marketPrice * currentShares;
  // 买入均价：优先表单输入值，其次交易记录计算
  const costPrice = Number(asset.avgBuyPrice) || buyAvgPrice || Number(asset.costPrice) || avgCost;
  // 成本价（摊薄成本价）
  const displayCostPrice = Number(asset.costPrice) || costPrice;
  // 持仓盈亏 = (现价 - 成本价) × 份额
  const totalPnl = currentShares > 0 && displayCostPrice > 0 ? (marketPrice - displayCostPrice) * currentShares : (Number(asset.pnl) || 0);
  const pnlPct = displayCostPrice > 0 ? ((marketPrice - displayCostPrice) / displayCostPrice * 100) : (Number(asset.pnlPercent) || 0);
  const isProfit = totalPnl >= 0;
  // 当日盈亏：优先实时行情涨跌幅
  const todayPnlPct = quoteData.changePct != null
    ? quoteData.changePct
    : (Number(asset.todayPnlPercent) || 0);
  const todayPnl = calculateFinanceTodayPnl(asset, quoteData, todayPnlPct);
  const hasTodayPnl = quoteData.changePct != null || todayPnl !== 0 || todayPnlPct !== 0;
  // 个股仓位：占全部股票资产的比例
  const stockAssets = (state.financeAssets || []).filter((a) => a.kind === "stock");
  const totalStockValue = stockAssets.reduce((s, a) => {
    const q = realtimeQuoteMap[a.code];
    const aPrice = q?.price || Number(a.currentPrice) || 0;
    const aShares = Number(a.shares) || 0;
    // 优先用现价×份额，没有现价则用 成本+盈亏 作为市值兜底
    const aMarketVal = aPrice > 0 ? aPrice * aShares : (financeAssetCost(a) + (Number(a.pnl) || 0));
    return s + financeAmountToRmb(aMarketVal, a.currency);
  }, 0);
  const myValue = marketPrice * currentShares || (financeAssetCost(asset) + (Number(asset.pnl) || 0));
  const posWeight = totalStockValue > 0 ? (financeAmountToRmb(myValue, asset.currency) / totalStockValue * 100) : 0;
  // 持仓天数：优先表单输入值，其次交易记录计算
  const formHoldingDays = Number(asset.holdingDays) || 0;
  let avgHoldingDays = formHoldingDays;
  if (!formHoldingDays && lots.length > 0 && totalShares > 0) {
    const now = Date.now();
    for (const lot of lots) {
      const days = Math.max(1, Math.floor((now - new Date(lot.date).getTime()) / 86400000));
      avgHoldingDays += days * lot.remainingShares;
    }
    avgHoldingDays = Math.round(avgHoldingDays / totalShares);
  }
  // 税费合计 = 已发生交易费用 + 按最新行情估算的当前持仓卖出费用。
  const feeSummary = calculateAssetFeeSummary(asset);
  const totalFees = feeSummary.total;

  return `
    <div class="holding-summary">
      <div class="holding-summary-grid">
        <div class="holding-summary-item">
          <span class="holding-summary-label">现价 ${realTimePrice ? '<span class="holding-live-dot"></span>' : ''}</span>
          <strong>${financeLocalMoney(marketPrice, asset.currency)}</strong>
        </div>
        <div class="holding-summary-item">
          <span class="holding-summary-label">买入均价 <span class="holding-help-icon">?</span><span class="holding-help-tip" hidden>买入时：买入成本 = 原累计买入成本 + 买入金额 + 买入费用；卖出时：买入成本按比例减少。买入均价 = 买入成本 / 持仓数量</span></span>
          <strong>${financeLocalMoney(costPrice, asset.currency)}</strong>
        </div>
        <div class="holding-summary-item">
          <span class="holding-summary-label">摊薄成本价 <span class="holding-help-icon">?</span><span class="holding-help-tip" hidden>摊薄成本 = 累计买入金额 - 累计卖出金额 + 所有交易费用。摊薄成本价 = 摊薄成本 / 持仓数量</span></span>
          <strong>${financeLocalMoney(dilutedCostPrice, asset.currency)}</strong>
        </div>
        <div class="holding-summary-item">
          <span class="holding-summary-label">持仓数量</span>
          <strong>${currentShares}</strong>
        </div>
        <div class="holding-summary-item">
          <span class="holding-summary-label">持仓市值</span>
          <strong>${financeLocalMoney(totalValue, asset.currency)}</strong>
        </div>
        <div class="holding-summary-item">
          <span class="holding-summary-label">持仓盈亏</span>
          <div style="display:flex;flex-direction:column;gap:2px;">
            <strong class="${isProfit ? 'profit' : 'loss'}">${isProfit ? '+' : ''}${financeLocalMoney(totalPnl, asset.currency)}</strong>
            <small class="${isProfit ? 'profit' : 'loss'}">${isProfit ? '+' : ''}${pnlPct.toFixed(2)}%</small>
          </div>
        </div>
        <div class="holding-summary-item">
          <span class="holding-summary-label">当日参考盈亏</span>
          <div style="display:flex;flex-direction:column;gap:2px;">
            <strong class="${hasTodayPnl ? (todayPnl >= 0 ? 'profit' : 'loss') : ''}">${hasTodayPnl
              ? `${todayPnl >= 0 ? '+' : ''}${financeLocalMoney(todayPnl, asset.currency)}`
              : "--"}</strong>
            <small class="${hasTodayPnl ? (todayPnlPct >= 0 ? 'profit' : 'loss') : ''}">${hasTodayPnl
              ? `${todayPnlPct >= 0 ? '+' : ''}${todayPnlPct.toFixed(3)}%`
              : "--"}</small>
          </div>
        </div>
        <div class="holding-summary-item">
          <span class="holding-summary-label">个股仓位 <span class="holding-help-icon">?</span><span class="holding-help-tip" hidden>该股票市值占全部股票资产总市值的比例</span></span>
          <strong>${posWeight.toFixed(2)}%</strong>
        </div>
        <div class="holding-summary-item">
          <span class="holding-summary-label">税费合计</span>
          <strong>${financeLocalMoney(totalFees, asset.currency)}</strong>
        </div>
        <div class="holding-summary-item">
          <span class="holding-summary-label">持股天数 <span class="holding-help-icon">?</span><span class="holding-help-tip" hidden>${formHoldingDays ? '用户手动输入' : '按各批次持仓股数加权平均计算，从买入日期至今的天数'}</span></span>
          <strong>${avgHoldingDays}天</strong>
        </div>
      </div>
    </div>
    <div class="holding-lots">
      <h4>持仓明细（按买入批次）</h4>
      ${lots.length > 0 ? lots.map((lot, i) => {
        const lotValue = lot.remainingShares * marketPrice;
        const lotCost = lot.remainingShares * lot.costPrice;
        const lotPnl = lotValue - lotCost;
        const lotPnlPct = lotCost > 0 ? (lotPnl / lotCost * 100) : 0;
        const daysSince = Math.max(1, Math.floor((Date.now() - new Date(lot.date).getTime()) / 86400000));
        const profit = lotPnl >= 0;
        return `<div class="holding-lot-card ${profit ? 'profit' : 'loss'}">
          <div class="holding-lot-header">
            <span>第${i + 1}笔 · ${lot.date}</span>
            <span class="holding-lot-days">持仓${daysSince}天</span>
          </div>
          <div class="holding-lot-body">
            <div class="holding-lot-row"><span>持仓数量</span><em>${lot.remainingShares}</em></div>
            <div class="holding-lot-row"><span>市值</span><em>${financeLocalMoney(lotValue, asset.currency)}</em></div>
            <div class="holding-lot-row"><span>买入价</span><em>${financeLocalMoney(lot.costPrice, asset.currency)}</em></div>
            <div class="holding-lot-row"><span>盈亏</span><em class="${profit ? 'profit' : 'loss'}">${profit ? '+' : ''}${financeLocalMoney(lotPnl, asset.currency)} (${profit ? '+' : ''}${lotPnlPct.toFixed(2)}%)</em></div>
          </div>
        </div>`;
      }).join("") : `<p class="muted">暂无持仓批次数据，请先添加交易记录。</p>`}
    </div>`;
}

// ── 交易记录 Tab ──
function renderTradeTab(asset) {
  const txns = (asset.transactions || []).slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const totalBuy = txns.filter((t) => t.direction === "buy").reduce((s, t) => s + (Number(t.amount) || (Number(t.shares) * Number(t.price))), 0);
  const totalSell = txns.filter((t) => t.direction === "sell").reduce((s, t) => s + (Number(t.amount) || (Number(t.shares) * Number(t.price))), 0);
  const totalFees = calculateRecordedTransactionFees(asset).total;
  const hasPendingOcr = pendingTradeOcrAssetId === asset.id
    && (pendingTradeOcrTransactions.length || pendingTradeOcrAssetPatch);
  const patch = pendingTradeOcrAssetPatch || {};
  const alwaysVisibleOcrFields = new Set(["pnl", "pnlPercent", "todayPnl", "todayPnlPercent"]);
  const patchFields = [
    ["currentPrice", "现价", "0.001"],
    ["costPrice", "成本价", "0.001"],
    ["avgBuyPrice", "买入均价", "0.001"],
    ["pnl", "持仓盈亏额", "0.001"],
    ["pnlPercent", "持仓盈亏率（%）", "0.001"],
    ["todayPnl", "当日参考盈亏额", "0.001"],
    ["todayPnlPercent", "当日参考盈亏率（%）", "0.001"],
    ["holdingDays", "持仓天数", "1"],
    ["positionWeight", "仓位（%）", "0.001"],
    ["totalFees", "税费合计", "0.001"],
  ].filter(([key]) => alwaysVisibleOcrFields.has(key)
    || (patch[key] !== null && patch[key] !== undefined && Number.isFinite(Number(patch[key]))));
  return `
    <section class="trade-ocr-panel" tabindex="0">
      <div>
        <strong>持仓详情识别</strong>
        <span>上传持仓详情截图，同步顶部持仓数据，并将下方交易记录导入当前资产。</span>
      </div>
      <label class="trade-ocr-upload">选择图片
        <input type="file" accept="image/png,image/jpeg,image/webp" data-trade-ocr-file data-asset-id="${asset.id}" />
      </label>
      <button type="button" data-action="recognize-trade-image" data-asset-id="${asset.id}">开始识别</button>
      <img class="trade-ocr-image-preview" data-trade-ocr-preview alt="交易截图预览" ${pendingTradeOcrPreviewUrl ? `src="${escapeAttr(pendingTradeOcrPreviewUrl)}"` : "hidden"} />
      <p data-trade-ocr-status>${pendingTradeOcrFile ? `已选择 ${pendingTradeOcrFile.name}，点击“开始识别”。` : "请选择持仓详情截图，也可以点击本区域后按 Ctrl+V 粘贴图片"}</p>
      ${hasPendingOcr ? `
        <div class="trade-ocr-results">
          <strong>识别完成，请确认同步内容</strong>
          ${patchFields.length ? `
            <div class="trade-ocr-holding-preview">
              ${patchFields.map(([key, label, step]) => `<label>
                <small>${label}</small>
                <input type="number" step="${step}" data-ocr-patch-field="${key}" value="${Number.isFinite(Number(patch[key])) ? financeOcrFixed3(patch[key]) : ""}" placeholder="--" />
              </label>`).join("")}
            </div>` : ""}
          <strong>交易记录 ${pendingTradeOcrTransactions.length} 笔</strong>
          ${pendingTradeOcrTransactions.length ? `<div class="trade-ocr-transaction-editor">
            <div class="trade-ocr-transaction-head" aria-hidden="true">
              <span>成交时间</span><span>方向</span><span>数量</span><span>价格</span><span>金额</span><span>费用</span><span>操作</span>
            </div>
            ${pendingTradeOcrTransactions.map((transaction, index) => `<div class="trade-ocr-transaction-row">
              <input type="datetime-local" step="1" data-ocr-tx-index="${index}" data-ocr-tx-field="date" value="${escapeAttr(transactionDateTimeInputValue(transaction.date))}" aria-label="交易时间" />
              <select data-ocr-tx-index="${index}" data-ocr-tx-field="direction" aria-label="交易方向">
                <option value="buy" ${transaction.direction === "buy" ? "selected" : ""}>买入</option>
                <option value="sell" ${transaction.direction === "sell" ? "selected" : ""}>卖出</option>
              </select>
              <input type="number" step="0.001" min="0" data-ocr-tx-index="${index}" data-ocr-tx-field="shares" value="${financeOcrFixed3(transaction.shares)}" placeholder="数量" aria-label="数量" />
              <input type="number" step="0.001" min="0" data-ocr-tx-index="${index}" data-ocr-tx-field="price" value="${financeOcrFixed3(transaction.price)}" placeholder="价格" aria-label="价格" />
              <input type="number" step="0.001" min="0" data-ocr-tx-index="${index}" data-ocr-tx-field="amount" value="${financeOcrFixed3(transaction.amount)}" placeholder="金额" aria-label="金额" />
              <input type="number" step="0.001" min="0" data-ocr-tx-index="${index}" data-ocr-tx-field="commission" value="${financeOcrFixed3(transaction.commission)}" placeholder="费用" aria-label="费用" />
              <button type="button" class="icon-button danger" data-action="remove-trade-ocr-row" data-index="${index}" title="删除此笔">×</button>
            </div>`).join("")}
          </div>` : `<p class="muted">未识别到新的交易记录，可仅同步持仓数据。</p>`}
          <div class="trade-ocr-actions">
            <button type="button" data-action="cancel-trade-ocr" data-asset-id="${asset.id}">取消</button>
            <button type="button" class="primary" data-action="confirm-trade-ocr" data-asset-id="${asset.id}">确认同步</button>
          </div>
        </div>` : ""}
    </section>
    <div class="trade-summary-bar">
      <span>买入总额: <strong>${financeLocalMoney(totalBuy, asset.currency)}</strong></span>
      <span>卖出总额: <strong>${financeLocalMoney(totalSell, asset.currency)}</strong></span>
      <span>交易费用合计: <strong>${financeLocalMoney(totalFees, asset.currency)}</strong></span>
      <button data-action="add-trade-record" data-asset-id="${asset.id}" class="primary">+ 添加交易</button>
    </div>
    <div class="trade-list">
      ${txns.length > 0 ? txns.map((t, idx) => {
        const amount = Number(t.amount) || (Number(t.shares) * Number(t.price));
        const isBuy = t.direction === "buy";
        const fees = (Number(t.commission) || 0) + (Number(t.stampDuty) || 0) + (Number(t.transferFee) || 0);
        const origIdx = (asset.transactions || []).indexOf(t);
        return `<div class="trade-record-card ${isBuy ? 'buy' : 'sell'}">
          <div class="trade-record-header">
            <span class="trade-direction ${isBuy ? 'buy' : 'sell'}">${isBuy ? '买入' : '卖出'}</span>
            <span class="trade-date">${t.date}</span>
            <button data-action="delete-trade" data-asset-id="${asset.id}" data-index="${origIdx}" class="trade-delete-btn" title="删除">×</button>
          </div>
          <div class="trade-record-body">
            <div class="trade-record-row"><span>数量</span><em>${financeOcrFixed3(t.shares)}</em></div>
            <div class="trade-record-row"><span>价格</span><em>${asset.currency} ${financeOcrFixed3(t.price)}</em></div>
            <div class="trade-record-row"><span>金额</span><em>${asset.currency} ${financeOcrFixed3(amount)}</em></div>
            <div class="trade-record-row"><span>费用</span><em>${asset.currency} ${financeOcrFixed3(fees)}</em></div>
          </div>
        </div>`;
      }).join("") : `<p class="muted">暂无交易记录，点击上方按钮添加。</p>`}
    </div>`;
}

function handleTradeOcrPreviewEdit(event) {
  const patchField = event.target.dataset.ocrPatchField;
  if (patchField) {
    if (!pendingTradeOcrAssetPatch) pendingTradeOcrAssetPatch = {};
    const value = event.target.value.trim();
    pendingTradeOcrAssetPatch[patchField] = value === "" ? null : roundFinanceOcrNumber(value);
    return;
  }
  const index = Number(event.target.dataset.ocrTxIndex);
  const field = event.target.dataset.ocrTxField;
  const transaction = pendingTradeOcrTransactions[index];
  if (!Number.isInteger(index) || !field || !transaction) return;
  if (field === "date" || field === "direction") {
    transaction[field] = field === "date" ? normalizeOcrDate(event.target.value) : event.target.value;
    return;
  }
  transaction[field] = roundFinanceOcrNumber(event.target.value) || 0;
  if (["shares", "price"].includes(field)) {
    transaction.amount = roundFinanceOcrNumber((Number(transaction.shares) || 0) * (Number(transaction.price) || 0)) || 0;
    const amountInput = event.currentTarget.querySelector(`[data-ocr-tx-index="${index}"][data-ocr-tx-field="amount"]`);
    if (amountInput) amountInput.value = financeOcrFixed3(transaction.amount);
  }
}

function setTradeOcrFile(file, content = document.querySelector("#holdingTabContent")) {
  const status = content?.querySelector("[data-trade-ocr-status]");
  const preview = content?.querySelector("[data-trade-ocr-preview]");
  if (!file?.type?.startsWith("image/")) {
    if (status) status.textContent = file ? "剪贴板或文件中不是有效图片。" : "请选择交易截图";
    return;
  }
  pendingTradeOcrFile = file;
  pendingTradeOcrTransactions = [];
  pendingTradeOcrAssetPatch = null;
  pendingTradeOcrAssetId = null;
  if (pendingTradeOcrPreviewUrl) URL.revokeObjectURL(pendingTradeOcrPreviewUrl);
  pendingTradeOcrPreviewUrl = URL.createObjectURL(file);
  if (preview) {
    preview.src = pendingTradeOcrPreviewUrl;
    preview.hidden = false;
  }
  if (status) status.textContent = `已选择 ${file.name}，点击“开始识别”。`;
}

function buildTradeOcrAssetPatch(detectedAsset, rawText) {
  if (!detectedAsset) return null;
  const text = String(rawText || "").replace(/\s+/g, "");
  const definitions = [
    ["currentPrice", /现价|当前价格/],
    ["costPrice", /成本价|持仓成本/],
    ["avgBuyPrice", /买入均价/],
    ["holdingDays", /持股天数|持仓天数/],
    ["positionWeight", /个股仓位|仓位占比/],
    ["totalFees", /税费合计|手续费合计|总费用/],
    ["pnl", /持仓盈亏/],
    ["pnlPercent", /持仓盈亏/],
    ["todayPnl", /当日参考盈亏|当日参考盈利|当日盈亏/],
    ["todayPnlPercent", /当日参考盈亏|当日参考盈利|当日盈亏/],
  ];
  const patch = {};
  definitions.forEach(([field, labelPattern]) => {
    const value = detectedAsset[field];
    if (labelPattern.test(text) && value !== null && value !== undefined && Number.isFinite(Number(value))) {
      patch[field] = roundFinanceOcrNumber(value);
    } else if (["todayPnl", "todayPnlPercent"].includes(field) && labelPattern.test(text)) {
      patch[field] = null;
    }
  });
  return Object.keys(patch).length ? patch : null;
}

async function handleTradeImageRecognition(event) {
  const assetId = Number(event.currentTarget.dataset.assetId);
  const content = document.querySelector("#holdingTabContent");
  const input = content?.querySelector("[data-trade-ocr-file]");
  const status = content?.querySelector("[data-trade-ocr-status]");
  const file = pendingTradeOcrFile || input?.files?.[0];
  if (!file) {
    if (status) status.textContent = "请先选择需要识别的交易截图。";
    return;
  }
  event.currentTarget.disabled = true;
  if (status) status.textContent = "正在识别图片 0%";
  try {
    const text = await recognizeImageText(file, (progress) => {
      if (status) status.textContent = `正在识别图片 ${progress}%`;
    });
    const asset = (state.financeAssets || []).find((item) => item.id === assetId);
    const detailResult = parseBrokerDetailOcrText(text);
    const genericResult = detailResult.transactions.length ? null : parseFinanceOcrText(text);
    const detectedAsset = detailResult.assets[0];
    const detectedCode = normalizeFinanceOcrCode(detectedAsset?.code);
    const currentCode = normalizeFinanceOcrCode(asset?.code);
    if (
      detectedCode && currentCode
      && detectedCode.length === currentCode.length
      && detectedCode !== currentCode
    ) {
      if (status) status.textContent = `图片识别为 ${detectedAsset?.name || "其他资产"}（${detectedCode}），与当前资产 ${asset?.name || ""}（${currentCode}）不一致。`;
      return;
    }
    const parsed = (detailResult.transactions.length
      ? detailResult.transactions
      : genericResult?.transactions || [])
      .map((transaction) => ({
        ...transaction,
        shares: roundFinanceOcrNumber(transaction.shares) || 0,
        price: roundFinanceOcrNumber(transaction.price) || 0,
        amount: roundFinanceOcrNumber(transaction.amount) || 0,
        commission: roundFinanceOcrNumber(transaction.commission) || 0,
        stampDuty: roundFinanceOcrNumber(transaction.stampDuty) || 0,
        transferFee: roundFinanceOcrNumber(transaction.transferFee) || 0,
        assetCode: currentCode,
        assetName: asset?.name || transaction.assetName || "",
      }));
    pendingTradeOcrTransactions = dedupeFinanceTransactions(parsed, asset?.transactions || []);
    pendingTradeOcrAssetPatch = buildTradeOcrAssetPatch(detectedAsset, text);
    pendingTradeOcrAssetId = assetId;
    const hasHoldingPatch = pendingTradeOcrAssetPatch
      && Object.values(pendingTradeOcrAssetPatch).some((value) => value !== null && value !== undefined && Number.isFinite(Number(value)));
    if (!pendingTradeOcrTransactions.length && !hasHoldingPatch) {
      pendingTradeOcrAssetPatch = null;
      if (status) status.textContent = "没有识别到持仓摘要或可导入的新交易，请换一张清晰的持仓详情截图。";
      return;
    }
    renderHoldingTabContent("trade", assetId);
  } catch (error) {
    console.error("交易图片识别失败", error);
    if (status) status.textContent = "识别失败，请换一张清晰、方向正常的图片重试。";
  } finally {
    if (document.body.contains(event.currentTarget)) event.currentTarget.disabled = false;
  }
}

function confirmTradeOcrImport(event) {
  const assetId = Number(event.currentTarget.dataset.assetId);
  const asset = (state.financeAssets || []).find((item) => item.id === assetId);
  if (!asset || pendingTradeOcrAssetId !== assetId) return;
  const additions = dedupeFinanceTransactions(pendingTradeOcrTransactions, asset.transactions || []);
  asset.transactions = [...(asset.transactions || []), ...additions];
  const patch = pendingTradeOcrAssetPatch || {};
  [
    "currentPrice", "costPrice", "avgBuyPrice", "holdingDays", "positionWeight",
    "totalFees", "pnl", "pnlPercent", "todayPnl", "todayPnlPercent",
  ].forEach((field) => {
    if (patch[field] !== null && patch[field] !== undefined && Number.isFinite(Number(patch[field]))) {
      asset[field] = Number(patch[field]);
    } else if (["todayPnl", "todayPnlPercent"].includes(field) && Object.prototype.hasOwnProperty.call(patch, field)) {
      asset[field] = 0;
    }
  });
  if (Number(asset.currentPrice) > 0 && Number(asset.shares) >= 0) {
    asset.currentValue = Number(asset.currentPrice) * Number(asset.shares);
    asset.currentValueSource = "calculated";
  }
  validateFinanceAssetWithLatestData(asset);
  pendingTradeOcrTransactions = [];
  pendingTradeOcrAssetPatch = null;
  pendingTradeOcrAssetId = null;
  pendingTradeOcrFile = null;
  if (pendingTradeOcrPreviewUrl) URL.revokeObjectURL(pendingTradeOcrPreviewUrl);
  pendingTradeOcrPreviewUrl = "";
  const scrollPosition = captureFinanceScrollPosition();
  syncAssetClassValuesFromFinance();
  saveState();
  renderHoldingTabContent("trade", assetId);
  render();
  restoreFinanceScrollPosition(scrollPosition);
  refreshFinanceAssetAfterTransaction(assetId);
}

function openTradeRecordDialog(assetId) {
  const form = document.querySelector("#tradeRecordForm");
  form.reset();
  form.assetId.value = assetId;
  form.date.value = transactionDateTimeInputValue(localDateTimeString());
  form.commission.value = "0";
  form.stampDuty.value = "0";
  form.transferFee.value = "0";
  form.amount.value = "0";
  document.querySelector("#tradeRecordDialog").showModal();
}

function handleTradeRecordSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  const assetId = Number(data.assetId);
  const asset = (state.financeAssets || []).find((item) => item.id === assetId);
  if (!asset) return;
  const shares = Number(data.shares) || 0;
  const price = Number(data.price) || 0;
  const record = {
    id: Date.now(),
    direction: data.direction,
    date: normalizeOcrDate(data.date) || localDateTimeString(),
    shares,
    price,
    amount: shares * price,
    commission: Number(data.commission) || 0,
    stampDuty: Number(data.stampDuty) || 0,
    transferFee: Number(data.transferFee) || 0,
  };
  if (!Array.isArray(asset.transactions)) asset.transactions = [];
  asset.transactions.push(record);
  // Recalculate shares/cost from transactions
  recalcAssetFromTransactions(asset);
  validateFinanceAssetWithLatestData(asset);
  saveState();
  document.querySelector("#tradeRecordDialog").close();
  // Re-render the holding detail trade tab
  const dialog = document.querySelector("#holdingDetailDialog");
  if (dialog.open) {
    const activeTab = document.querySelector(".holding-tab.active");
    renderHoldingTabContent(activeTab?.dataset.tab || "trade", assetId);
  }
  render();
  refreshFinanceAssetAfterTransaction(assetId);
}

function recalcAssetFromTransactions(asset) {
  const txns = (asset.transactions || []).slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  let shares = 0;
  let totalCost = 0;
  for (const t of txns) {
    const s = Number(t.shares) || 0;
    const p = Number(t.price) || 0;
    if (t.direction === "buy") {
      totalCost += s * p;
      shares += s;
    } else {
      if (shares > 0) {
        const avgCost = totalCost / shares;
        totalCost = avgCost * (shares - s);
        shares -= s;
      }
    }
  }
  asset.shares = Math.max(0, shares);
  asset.costPrice = shares > 0 ? totalCost / shares : 0;
}

function deleteTradeRecord(assetId, index) {
  const asset = (state.financeAssets || []).find((item) => item.id === assetId);
  if (!asset || !Array.isArray(asset.transactions)) return;
  if (!window.confirm("确认删除该条交易记录？")) return;
  asset.transactions.splice(index, 1);
  recalcAssetFromTransactions(asset);
  validateFinanceAssetWithLatestData(asset);
  saveState();
  const dialog = document.querySelector("#holdingDetailDialog");
  if (dialog.open) {
    const activeTab = document.querySelector(".holding-tab.active");
    renderHoldingTabContent(activeTab?.dataset.tab || "trade", assetId);
  }
  render();
  refreshFinanceAssetAfterTransaction(assetId);
}

// ── 明细 Tab：完整费用明细 + 规则提示 ──
function renderFeeDetailTab(asset) {
  const summary = calculateAssetFeeSummary(asset);
  const fees = summary.projected;
  const txnFees = summary.recorded;
  const cfg = state.feeConfig || seed.feeConfig;
  const isStock = asset.kind === "stock";
  const isDomestic = asset.market === "domestic";

  return `
    <div class="fee-detail-tab">
      <section class="fee-section">
        <h4>交易费用汇总</h4>
        <div class="fee-detail-table">
          <div class="fee-detail-row">
            <span class="fee-label">已记录交易费用 <span class="holding-help-icon">?</span>
              <span class="holding-help-tip" hidden>优先逐笔汇总交易记录中的佣金、印花税和过户费；交易明细不完整时使用券商识别汇总值兜底。</span>
            </span>
            <span class="fee-value">${financeLocalMoney(txnFees.total, asset.currency)}</span>
          </div>
          <div class="fee-detail-row">
            <span class="fee-label">预计卖出印花税 <span class="holding-help-icon">?</span>
              <span class="holding-help-tip" hidden>按实时刷新的最新持仓市值和 ${cfg.stampDutyRate}% 计算。</span>
            </span>
            <span class="fee-value">${financeLocalMoney(fees.stampDuty, asset.currency)}</span>
          </div>
          <div class="fee-detail-row">
            <span class="fee-label">预计卖出佣金 <span class="holding-help-icon">?</span>
              <span class="holding-help-tip" hidden>按实时刷新的最新持仓市值和 ${cfg.commissionRate}% 计算，最低 ${cfg.commissionMin} 元。</span>
            </span>
            <span class="fee-value">${financeLocalMoney(fees.commission, asset.currency)}</span>
          </div>
          ${isStock && isDomestic ? `<div class="fee-detail-row">
            <span class="fee-label">预计卖出过户费 <span class="holding-help-icon">?</span>
              <span class="holding-help-tip" hidden>沪市按成交金额的 ${cfg.transferFeeRateSH}% 收取，深市按 ${cfg.transferFeeRateSZ}% 收取。</span>
            </span>
            <span class="fee-value">${financeLocalMoney(fees.transferFee, asset.currency)}</span>
          </div>` : ""}
          <div class="fee-detail-row fee-detail-total">
            <span class="fee-label">合计${summary.isCustom ? ' <span style="color:var(--primary);font-size:12px;">(手动修改)</span>' : ''}</span>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="fee-value">${financeLocalMoney(summary.total, asset.currency)}</span>
              <button type="button" class="fee-edit-btn" data-action="edit-fee-total" data-asset-id="${asset.id}" title="手动修改税费合计">✎</button>
            </div>
          </div>
        </div>
      </section>
      ${!isStock || !isDomestic ? `<p class="fee-note-muted">当前资产类型为${isStock ? '海外股票' : asset.kind === 'fund' ? '基金' : '自定义'}，部分A股费用规则不适用。</p>` : ""}
    </div>`;
}

function openAssetClassDialog(item = null) {
  const form = document.querySelector("#assetClassForm");
  const fields = form.elements;
  form.reset();
  fields.classId.value = item?.id || "";
  fields.name.value = item?.name || "";
  fields.name.readOnly = Boolean(item && fixedAssetClassNames[item.id]);
  fields.name.title = fields.name.readOnly ? "固定默认分类名称不可修改" : "";
  fields.children.value = item?.children?.join(",") || "";
  fields.value.value = item ? financeAssetClassValue(item.name).toFixed(2) : "0.00";
  fields.openingValue.value = item?.openingValue ?? 0;
  fields.targetValue.value = item?.targetValue ?? 0;
  fields.expectedReturn.value = item?.expectedReturn ?? 0;
  fields.income.value = item?.income ?? 0;
  fields.expense.value = item?.expense ?? 0;
  fields.color.value = item?.color || "#6366f1";
  form.querySelector("h2").textContent = item ? "编辑资产分类" : "新增资产分类";
  document.querySelector("#assetClassDialog").showModal();
}

function handleAssetClassSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  const id = data.classId || `class-${Date.now()}`;
  const children = String(data.children || "")
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const existing = state.assetClasses.find((item) => item.id === id);
  const fixedName = fixedAssetClassNames[id];
  const payload = {
    id,
    name: fixedName || String(data.name || "").trim(),
    children: children.length ? children : ["其他"],
    visible: existing?.visible ?? true,
    value: existing?.value || 0,
    openingValue: Number(data.openingValue) || 0,
    targetValue: Number(data.targetValue) || 0,
    expectedReturn: Number(data.expectedReturn) || 0,
    income: Number(data.income) || 0,
    expense: Number(data.expense) || 0,
    laborIncome: existing?.laborIncome || 0,
    color: data.color || "#6366f1",
  };
  if (!payload.name) return;
  const duplicate = state.assetClasses.some((item) => item.id !== id && item.name === payload.name);
  if (duplicate) {
    window.alert("资产分类名称已存在。");
    return;
  }
  const index = state.assetClasses.findIndex((item) => item.id === id);
  if (index >= 0) {
    const previousName = state.assetClasses[index].name;
    state.assetClasses[index] = { ...state.assetClasses[index], ...payload };
    state.financeAssets.forEach((asset) => {
      if (asset.category === previousName) asset.category = payload.name;
    });
  } else {
    state.assetClasses.push(payload);
  }
  syncAssetClassValuesFromFinance();
  saveState();
  document.querySelector("#assetClassDialog").close();
  render();
}

function deleteAssetClass(id) {
  if (fixedAssetClassNames[id]) {
    window.alert("权益类、商品类、债权类和现金类为固定默认分类，不能删除。");
    return;
  }
  if (state.assetClasses.length <= 1) {
    window.alert("至少需要保留一个资产分类。");
    return;
  }
  const item = state.assetClasses.find((entry) => entry.id === id);
  if (!item) return;
  const inUse = state.financeAssets.some((asset) => asset.category === item.name);
  const message = inUse
    ? `分类「${item.name}」正在被理财资产使用，删除后这些资产会归到其他分类。确认删除吗？`
    : `确认删除资产分类「${item.name}」吗？`;
  if (!window.confirm(message)) return;
  const fallback = state.assetClasses.find((entry) => entry.id !== id);
  state.assetClasses = state.assetClasses.filter((entry) => entry.id !== id);
  state.financeAssets.forEach((asset) => {
    if (asset.category === item.name) asset.category = fallback?.name || state.assetClasses[0]?.name || "现金类";
  });
  if (filters.assetClass === id) filters.assetClass = "all";
  saveState();
  render();
}

function moveAssetClass(id, offset) {
  const index = state.assetClasses.findIndex((item) => item.id === id);
  const target = index + offset;
  if (index < 0 || target < 0 || target >= state.assetClasses.length) return;
  const [item] = state.assetClasses.splice(index, 1);
  state.assetClasses.splice(target, 0, item);
  saveState();
  render();
}

function bindAssetClassSorting() {
  let draggedId = "";
  document.querySelectorAll(".asset-class-card[draggable='true']").forEach((card) => {
    card.addEventListener("dragstart", (event) => {
      draggedId = card.dataset.classId;
      card.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedId);
    });
    card.addEventListener("dragend", () => {
      draggedId = "";
      card.classList.remove("is-dragging");
      document.querySelectorAll(".asset-class-card").forEach((item) => item.classList.remove("is-drag-over"));
    });
    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (draggedId && draggedId !== card.dataset.classId) card.classList.add("is-drag-over");
    });
    card.addEventListener("dragleave", () => card.classList.remove("is-drag-over"));
    card.addEventListener("drop", (event) => {
      event.preventDefault();
      card.classList.remove("is-drag-over");
      const sourceId = draggedId || event.dataTransfer.getData("text/plain");
      const targetId = card.dataset.classId;
      const sourceIndex = state.assetClasses.findIndex((item) => item.id === sourceId);
      const targetIndex = state.assetClasses.findIndex((item) => item.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
      const [item] = state.assetClasses.splice(sourceIndex, 1);
      state.assetClasses.splice(targetIndex, 0, item);
      saveState();
      render();
    });
  });
}

function financeCategoryOptions(kind = "stock", preferred = "") {
  const configured = ({
    stock: ["权益类", "吃息类"],
    fund: ["权益类", "吃息类", "现金类", "债权类"],
    commodity: ["商品类"],
    futures: ["商品类"],
    options: ["权益类", "商品类"],
    crypto: ["加密类"],
    cashflow: ["现金类"],
    custom: state.assetClasses.map((item) => item.name),
  })[normalizeFinanceKind(kind)] || state.assetClasses.map((item) => item.name);
  const known = new Set(state.assetClasses.map((item) => item.name));
  const categories = configured.filter((item) => known.has(item) || item === preferred);
  if (preferred && !categories.includes(preferred)) categories.unshift(preferred);
  return categories.length ? categories : ["现金类"];
}

function financeSubcategoryOptions(kind) {
  return ({
    stock: ["A股", "港股", "美股", "其他股市"],
    fund: ["场内基金", "场外基金", "货币基金", "债券基金", "其他基金"],
    commodity: ["黄金", "白银", "原油", "其他商品"],
    futures: ["国内期货", "海外期货", "其他期货"],
    options: ["股票期权", "指数期权", "商品期权", "其他期权"],
    crypto: ["比特币", "以太坊", "稳定币", "其他加密货币"],
    cashflow: ["可用现金", "调用现金", "不可用现金"],
    custom: ["自定义理财", "其他"],
  })[kind] || ["其他"];
}

function financePositionGroupLabel(group) {
  return ({
    core: "核心仓位",
    satellite: "卫星仓位",
    cashflow: "现金流仓位",
    income: "吃息仓位",
  })[group] || "核心仓位";
}

function financePositionGroupOptions(kind) {
  return ({
    stock: ["core", "satellite", "income"],
    fund: ["core", "satellite", "income"],
    commodity: ["core", "satellite"],
    futures: ["core", "satellite"],
    options: ["core", "satellite"],
    crypto: ["core", "satellite"],
    cashflow: ["cashflow"],
    custom: ["core", "satellite", "cashflow", "income"],
  })[normalizeFinanceKind(kind)] || ["core", "satellite"];
}

function normalizeFinancePositionGroup(group, kind = "stock") {
  const options = financePositionGroupOptions(kind);
  return options.includes(group) ? group : options[0];
}

function financePositionKindLabel(kind) {
  return ({ stock: "股票", fund: "基金", commodity: "商品", futures: "期货", options: "期权", crypto: "加密", cashflow: "现金流", custom: "自定义理财" })[kind] || "自定义理财";
}

function financePositionCategoryOptions(kind, group = "core") {
  const normalizedGroup = normalizeFinancePositionGroup(group, kind);
  if (normalizedGroup === "cashflow") return ["可用现金", "调用现金", "不可用现金"];
  if (normalizedGroup === "income") return ["吃息股票", "吃息基金"];
  const prefix = normalizedGroup === "satellite" ? "卫星" : "核心";
  return [`${prefix}${financePositionKindLabel(kind)}仓位`];
}

function financeTertiaryScopeKey(kind, subcategory) {
  return `${kind}::${subcategory}`;
}

// ── 根据代码前缀推断板块（三级分类） ──
function inferBoardFromCode(code) {
  if (!code) return "";
  const c = String(code).trim();
  if (c.startsWith("688")) return "科创板";   // 688 优先于 68
  if (c.startsWith("68")) return "沪市";
  if (c.startsWith("60")) return "沪市";
  if (c.startsWith("30")) return "创业板";
  if (c.startsWith("00")) return "深市";
  if (c.startsWith("92")) return "北证";
  return "";
}

// A股默认三级分类列表
const STOCK_A_BOARD_OPTIONS = ["沪市", "深市", "创业板", "科创板", "北证"];

function financeTertiaryOptions(kind, subcategory, preferred = "") {
  const key = financeTertiaryScopeKey(kind, subcategory);
  const saved = state.customCategories.finance.tertiaryByScope[key] || [];
  // A股股票自动包含板块分类
  const boardDefaults = (kind === "stock" && subcategory === "A股") ? STOCK_A_BOARD_OPTIONS : [];
  return [...new Set(["未分类", ...boardDefaults, ...saved, ...(preferred ? [preferred] : [])])];
}

// ── 盈亏自动计算 ──
// 规则：盈亏额 = (现价 - 持仓成本) × 份额，盈亏率 = (现价 - 持仓成本) / 持仓成本 × 100%
// 用户正在编辑的字段不覆盖
function updateFinancePnlPercents(form) {
  const f = form.elements;
  const costPrice = Number(f.costPrice.value) || 0;
  const shares = Number(f.shares.value) || 0;
  const currentPrice = Number(f.currentPrice.value) || 0;
  const active = document.activeElement;
  // 持仓盈亏：根据现价、成本价、份额自动算
  if (currentPrice > 0 && costPrice > 0 && shares > 0) {
    const calcPnl = (currentPrice - costPrice) * shares;
    const calcPnlPct = ((currentPrice - costPrice) / costPrice) * 100;
    if (active !== f.pnl && active !== f.pnlPercent) {
      f.pnl.value = calcPnl.toFixed(3);
      f.pnlPercent.value = calcPnlPct.toFixed(3);
    } else if (active === f.pnl) {
      // 用户改了盈亏额 → 反算盈亏率
      const pnl = Number(f.pnl.value) || 0;
      if (costPrice > 0 && shares > 0) {
        f.pnlPercent.value = ((pnl / (costPrice * shares)) * 100).toFixed(3);
      }
    } else if (active === f.pnlPercent) {
      // 用户改了盈亏率 → 反算盈亏额
      const pct = Number(f.pnlPercent.value) || 0;
      if (costPrice > 0 && shares > 0) {
        f.pnl.value = ((pct / 100) * costPrice * shares).toFixed(3);
      }
    }
  }
  // 当日盈亏：按现价 × 持仓数量 × 当日涨跌率计算。
  const currentMarketValue = currentPrice * shares;
  if (active === f.todayPnl && currentMarketValue > 0) {
    const todayPnl = Number(f.todayPnl.value) || 0;
    f.todayPnlPercent.value = ((todayPnl / currentMarketValue) * 100).toFixed(3);
  } else if (currentMarketValue > 0) {
    const pct = Number(f.todayPnlPercent.value) || 0;
    f.todayPnl.value = ((pct / 100) * currentMarketValue).toFixed(3);
  }
}

function openFinanceAssetDialog(asset = null, preferredKind = "stock") {
  const form = document.querySelector("#financeAssetForm");
  const fields = form.elements;
  const kind = normalizeFinanceKind(preferredKind || "stock");
  const source = asset || state.financeAssetDrafts[kind] || {};
  form.reset();
  fields.assetId.value = asset?.id || "";
  fields.kind.value = kind;
  fields.accountId.innerHTML = state.accounts.map((account) => `<option value="${account.id}">${account.name}</option>`).join("");
  fields.accountId.value = source.accountId || state.accounts[0]?.id || "";
  updateFinanceAssetCategories(source.category);
  updateFinanceSubcategories(source.subcategory);
  updateFinanceTertiaryCategories(source.tertiaryCategory);
  updateFinancePositionGroups(source.positionGroup);
  updateFinancePositionCategories(source.positionCategory);
  fields.market.value = source.market === "overseas" ? "overseas" : "domestic";
  updateFinanceCurrencyOptions(source.currency);
  fields.name.value = source.name || "";
  fields.code.value = source.code || "";
  fields.costPrice.value = source.costPrice === "" || source.costPrice === null || source.costPrice === undefined ? "" : financeOcrFixed3(source.costPrice);
  fields.shares.value = source.shares === "" || source.shares === null || source.shares === undefined ? "" : financeOcrFixed3(source.shares);
  fields.pnl.value = financeOcrFixed3(source.pnl ?? 0);
  const currentPrice = Number(source.currentPrice) || (asset ? resolveAssetPrice(source) : "");
  fields.currentPrice.value = currentPrice === "" ? "" : financeOcrFixed3(currentPrice);
  fields.avgBuyPrice.value = source.avgBuyPrice === "" || source.avgBuyPrice === null || source.avgBuyPrice === undefined ? "" : financeOcrFixed3(source.avgBuyPrice);
  fields.holdingDays.value = source.holdingDays ?? "";
  fields.positionWeight.value = source.positionWeight === "" || source.positionWeight === null || source.positionWeight === undefined ? "" : financeOcrFixed3(source.positionWeight);
  fields.totalFees.value = financeOcrFixed3(source.totalFees ?? 0);
  fields.pnlPercent.value = source.pnlPercent === "" || source.pnlPercent === null || source.pnlPercent === undefined ? "" : financeOcrFixed3(source.pnlPercent);
  fields.todayPnl.value = financeOcrFixed3(source.todayPnl ?? 0);
  fields.todayPnlPercent.value = source.todayPnlPercent === "" || source.todayPnlPercent === null || source.todayPnlPercent === undefined ? "" : financeOcrFixed3(source.todayPnlPercent);
  // Auto-calc readonly percent fields
  updateFinancePnlPercents(form);
  pendingFinanceOcrTransactions = [];
  pendingFinanceOcrResult = null;
  pendingFinanceOcrAssets = [];
  pendingFinanceOcrRawText = "";
  pendingFinanceOcrUnassignedTransactions = [];
  pendingFinanceOcrFile = null;
  pendingFinanceOcrConfirmed = false;
  resetFinanceOcrPanel();
  hideCodeLookupDropdown();
  form.querySelector("h2").textContent = asset ? "编辑理财资产" : "新增理财资产";
  updateFinanceAssetPreview();
  toggleStockFormFields(kind);
  document.querySelector("#financeAssetDialog").showModal();
}

/* 根据资产类型切换股票专属字段的显示/隐藏 */
function toggleStockFormFields(kind) {
  const form = document.querySelector("#financeAssetForm");
  if (!form) return;
  form.querySelectorAll("[data-stock-only]").forEach((el) => {
    const show = kind === "stock";
    el.style.display = show ? "" : "none";
    el.querySelectorAll("input, select, textarea").forEach((input) => {
      if (show) {
        if (input.dataset.wasRequired === "true") {
          input.setAttribute("required", "");
          delete input.dataset.wasRequired;
        }
      } else {
        if (input.hasAttribute("required")) {
          input.dataset.wasRequired = "true";
          input.removeAttribute("required");
        }
      }
    });
  });
}

function resetFinanceOcrPanel() {
  const preview = document.querySelector("#financeOcrPreview");
  const status = document.querySelector("#financeOcrStatus");
  const transactions = document.querySelector("#financeOcrTransactions");
  [preview].forEach((image) => {
    if (image?.dataset.objectUrl) URL.revokeObjectURL(image.dataset.objectUrl);
    if (image) {
      image.removeAttribute("src");
      image.dataset.objectUrl = "";
    }
  });
  if (status) {
    status.textContent = "尚未选择图片";
    status.className = "finance-ocr-status";
  }
  if (transactions) {
    transactions.hidden = true;
    transactions.innerHTML = "";
  }
  pendingFinanceOcrResult = null;
  pendingFinanceOcrAssets = [];
  pendingFinanceOcrRawText = "";
  pendingFinanceOcrUnassignedTransactions = [];
  pendingFinanceOcrFile = null;
  pendingFinanceOcrConfirmed = false;
}

function handleFinanceImageSelection(event) {
  const file = event.currentTarget.files?.[0];
  setFinanceOcrFile(file);
}

function setFinanceOcrFile(file) {
  const preview = document.querySelector("#financeOcrPreview");
  const status = document.querySelector("#financeOcrStatus");
  if (!file) {
    pendingFinanceOcrFile = null;
    return;
  }
  if (!file.type.startsWith("image/")) {
    status.textContent = "请选择 PNG、JPG 或 WebP 图片。";
    status.className = "finance-ocr-status error";
    return;
  }
  pendingFinanceOcrFile = file;
  pendingFinanceOcrResult = null;
  pendingFinanceOcrConfirmed = false;
  pendingFinanceOcrTransactions = [];
  pendingFinanceOcrAssets = [];
  pendingFinanceOcrRawText = "";
  pendingFinanceOcrUnassignedTransactions = [];
  renderFinanceOcrTransactionPreview();
  if (preview.dataset.objectUrl) URL.revokeObjectURL(preview.dataset.objectUrl);
  const objectUrl = URL.createObjectURL(file);
  preview.src = objectUrl;
  preview.dataset.objectUrl = objectUrl;
  status.textContent = "已选择持仓列表图，点击“识别列表并预览”。";
  status.className = "finance-ocr-status";
}

function imageFromClipboard(event) {
  return Array.from(event.clipboardData?.items || [])
    .find((item) => item.type.startsWith("image/"))
    ?.getAsFile() || null;
}

function handleFinanceOcrPaste(event) {
  const file = imageFromClipboard(event);
  if (!file) return;
  event.preventDefault();
  setFinanceOcrFile(new File([file], `clipboard-list-${Date.now()}.png`, { type: file.type || "image/png" }));
}

async function handleFinanceImageRecognition(event) {
  const form = document.querySelector("#financeAssetForm");
  const listFile = pendingFinanceOcrFile || form.elements.assetImage.files?.[0];
  const button = event.currentTarget;
  const status = document.querySelector("#financeOcrStatus");
  
  // 获取选择的平台信息
  const selectedPlatform = {
    region: document.querySelector("#ocrPlatformRegion")?.value || "domestic",
    type: document.querySelector("#ocrPlatformType")?.value || "broker",
    name: document.querySelector("#ocrPlatformName")?.value || "",
  };
  
  if (!listFile) {
    status.textContent = "请先上传持仓列表图。";
    status.className = "finance-ocr-status error";
    return;
  }
  if (!window.Tesseract?.recognize) {
    status.textContent = "图文识别组件加载失败，请检查网络后刷新页面重试。";
    status.className = "finance-ocr-status error";
    return;
  }
  
  button.disabled = true;
  button.textContent = "正在识别...";
  status.className = "finance-ocr-status working";
  
  try {
    const listText = await recognizeImageText(listFile, (progress) => {
      status.textContent = `正在识别列表图片 ${progress}%`;
    });
    
    // 根据选择的平台使用不同的解析方法
    let listResult;
    if (selectedPlatform.name) {
      // 如果选择了具体平台，使用平台特定的解析方法
      status.textContent = `正在使用 [${selectedPlatform.name}] 规则解析...`;
      listResult = parseFinanceOcrTextWithPlatform(listText, selectedPlatform);
    } else {
      // 否则使用通用解析方法
      listResult = parseFinanceOcrText(listText);
    }
    
    status.textContent = "正在校验证券代码并补全标准资料...";
    const extracted = await enrichFinanceOcrResult(listResult, (current, total) => {
      status.textContent = `正在补全证券资料 ${current}/${total}`;
    });
    pendingFinanceOcrResult = extracted;
    pendingFinanceOcrConfirmed = false;
    pendingFinanceOcrAssets = extracted.assets || [];
    pendingFinanceOcrTransactions = extracted.transactions || [];
    pendingFinanceOcrRawText = extracted.rawText || listText;
    pendingFinanceOcrUnassignedTransactions = extracted.unassignedTransactions || [];
    renderFinanceOcrResultPreview();
    const transactionMessage = pendingFinanceOcrTransactions.length
      ? `，${pendingFinanceOcrTransactions.length} 笔交易`
      : "";
    status.textContent = pendingFinanceOcrAssets.length || pendingFinanceOcrTransactions.length
      ? `识别完成：${pendingFinanceOcrAssets.length} 项资产${transactionMessage}。请选择需要导入的持仓行并核对交易。`
      : "图片识别完成，但没有找到可自动填写的资产字段，请换一张更清晰的截图。";
    status.className = `finance-ocr-status ${pendingFinanceOcrAssets.length || pendingFinanceOcrTransactions.length ? "success" : "error"}`;
  } catch (error) {
    console.error("资产图片识别失败", error);
    status.textContent = "图片识别失败，请使用更清晰、文字方向正常的截图重试。";
    status.className = "finance-ocr-status error";
  } finally {
    button.disabled = false;
    button.textContent = "识别列表并预览";
  }
}

// ─── 根据平台选择使用不同的解析方法 ───
function parseFinanceOcrTextWithPlatform(rawText, platform) {
  // 目前先使用通用解析方法，后续可以为每个平台实现特定的解析逻辑
  // TODO: 为每个平台实现专门的解析规则
  
  // 示例：同花顺的特定解析逻辑
  if (platform.name === "同花顺") {
    return parseTonghuashunOcrText(rawText);
  }
  
  // 示例：东方财富的特定解析逻辑
  if (platform.name === "东方财富") {
    return parseEastmoneyOcrText(rawText);
  }
  
  // 默认使用通用解析方法
  return parseFinanceOcrText(rawText);
}

// ── 同花顺特定解析 ──
function parseTonghuashunOcrText(rawText) {
  // TODO: 实现同花顺特定的解析逻辑
  // 同花顺的特点：两行格式（名称+数值，市值+比例）
  return parseFinanceOcrText(rawText);
}

// ─── 东方财富特定解析 ───
function parseEastmoneyOcrText(rawText) {
  // TODO: 实现东方财富特定的解析逻辑
  return parseFinanceOcrText(rawText);
}

function financeOcrResultFields(result) {
  return [
    ["market", "市场"], ["currency", "货币单位"], ["kind", "资产类型"], ["accountId", "所属账户"],
    ["category", "资产分类"], ["subcategory", "二级分类"], ["tertiaryCategory", "三级分类"],
    ["positionGroup", "仓位分组"], ["positionCategory", "仓位分类"], ["name", "资产名称"],
    ["code", "资产代码"], ["costPrice", "持仓成本"], ["shares", "份额/数量"], ["pnl", "浮动盈亏"],
    ["currentPrice", "现价"], ["avgBuyPrice", "买入均价"], ["holdingDays", "持仓天数"],
    ["positionWeight", "个股仓位"], ["totalFees", "税费合计"], ["todayPnl", "当日参考盈亏"],
  ].filter(([field]) => result[field] !== "" && result[field] !== null && result[field] !== undefined);
}

function financeOcrPreviewValue(field, value) {
  if (field === "kind") return financeKindLabel(value);
  if (field === "market") return financeMarketLabel(value);
  if (field === "positionGroup") return financePositionGroupLabel(value);
  if (field === "accountId") return state.accounts.find((account) => account.id === value)?.name || value;
  return value;
}

function ocrSelectOptions(values, current, label = (value) => value) {
  return values.map((value) => `<option value="${escapeAttr(value)}" ${value === current ? "selected" : ""}>${escapeHtml(label(value))}</option>`).join("");
}

function financeOcrAssetCurrentValue(asset) {
  if (Number.isFinite(Number(asset.currentValue)) && asset.currentValueSource === "ocr") return Number(asset.currentValue);
  return (Number(asset.costPrice) || 0) * (Number(asset.shares) || 0) + (Number(asset.pnl) || 0);
}

function validateFinanceOcrAsset(asset) {
  const errors = {};
  [
    "market", "currency", "kind", "accountId", "category", "subcategory",
    "positionGroup", "positionCategory", "name", "code",
  ].forEach((field) => {
    if (!String(asset[field] || "").trim()) errors[field] = "必填";
  });
  if (!(Number(asset.costPrice) > 0)) errors.costPrice = "必须大于 0";
  if (!(Number(asset.shares) > 0)) errors.shares = "必须大于 0";
  if (!Number.isFinite(Number(asset.pnl))) errors.pnl = "必须是有效数字";
  return errors;
}

function financeOcrInput(field, value, index, errors, type = "text", attributes = "") {
  const invalid = errors[field] ? " is-invalid" : "";
  return `<input class="ocr-cell-input${invalid}" data-ocr-index="${index}" data-field="${field}" type="${type}" value="${escapeAttr(value ?? "")}" ${attributes} title="${escapeAttr(errors[field] || "")}" />`;
}

function roundFinanceOcrNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(3)) : null;
}

function financeOcrFixed3(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(3) : "";
}

function renderFinanceOcrAssetRow(asset, index) {
  const normalized = completeFinanceOcrAssetDefaults(asset);
  pendingFinanceOcrAssets[index] = normalized;
  const errors = validateFinanceOcrAsset(normalized);
  const invalidCount = Object.keys(errors).length;
  const categories = financeCategoryOptions(normalized.kind, normalized.category);
  const subcategories = financeSubcategoryOptions(normalized.kind);
  const tertiary = financeTertiaryOptions(normalized.kind, normalized.subcategory, normalized.tertiaryCategory);
  const groups = financePositionGroupOptions(normalized.kind);
  const positions = financePositionCategoryOptions(normalized.kind, normalized.positionGroup);
  const confidence = Number.isFinite(normalized.confidence) ? `${Math.round(normalized.confidence * 100)}%` : "-";
  const hasCandidates = Array.isArray(normalized.lookupCandidates) && normalized.lookupCandidates.length > 0;
  
  return `<tr class="${invalidCount ? "has-errors" : ""}">
    <td class="ocr-select-cell"><input type="checkbox" data-ocr-index="${index}" data-field="selected" ${normalized.selected !== false ? "checked" : ""} aria-label="选择第 ${index + 1} 行" /></td>
    <td>${financeOcrInput("name", normalized.name, index, errors)}</td>
    <td>${financeOcrInput("code", normalized.code, index, errors)}</td>
    <td>${financeOcrInput("currentValue", financeOcrFixed3(financeOcrAssetCurrentValue(normalized)), index, {}, "number", 'step="0.001" min="0"')}</td>
    <td>${financeOcrInput("shares", financeOcrFixed3(normalized.shares), index, errors, "number", 'step="0.001" min="0"')}</td>
    <td>${financeOcrInput("availableShares", financeOcrFixed3(normalized.availableShares), index, {}, "number", 'step="0.001" min="0"')}</td>
    <td>${financeOcrInput("currentPrice", financeOcrFixed3(normalized.currentPrice), index, {}, "number", 'step="0.001" min="0"')}</td>
    <td>${financeOcrInput("costPrice", financeOcrFixed3(normalized.costPrice), index, errors, "number", 'step="0.001" min="0"')}</td>
    <td>${financeOcrInput("pnl", financeOcrFixed3(normalized.pnl), index, errors, "number", 'step="0.001"')}</td>
    <td>${financeOcrInput("pnlPercent", financeOcrFixed3(normalized.pnlPercent), index, {}, "number", 'step="0.001"')}</td>
    <td><select class="${errors.kind ? "is-invalid" : ""}" data-ocr-index="${index}" data-field="kind">${ocrSelectOptions(["stock", "fund", "commodity", "futures", "options", "crypto", "cashflow", "custom"], normalized.kind, financeKindLabel)}</select></td>
    <td><select class="${errors.market ? "is-invalid" : ""}" data-ocr-index="${index}" data-field="market">${ocrSelectOptions(["domestic", "overseas"], normalized.market, financeMarketLabel)}</select></td>
    <td><select class="${errors.currency ? "is-invalid" : ""}" data-ocr-index="${index}" data-field="currency">${ocrSelectOptions(["CNH", "HKD", "USD", "EUR", "JPY", "GBP", "AUD", "SGD"], normalized.currency)}</select></td>
    <td><select class="${errors.accountId ? "is-invalid" : ""}" data-ocr-index="${index}" data-field="accountId">${ocrSelectOptions(state.accounts.map((account) => account.id), normalized.accountId, (id) => state.accounts.find((account) => account.id === id)?.name || id)}</select></td>
    <td><select class="${errors.category ? "is-invalid" : ""}" data-ocr-index="${index}" data-field="category">${ocrSelectOptions(categories, normalized.category)}</select></td>
    <td><select class="${errors.subcategory ? "is-invalid" : ""}" data-ocr-index="${index}" data-field="subcategory">${ocrSelectOptions(subcategories, normalized.subcategory)}</select></td>
    <td><select data-ocr-index="${index}" data-field="tertiaryCategory">${ocrSelectOptions(tertiary, normalized.tertiaryCategory || "未分类")}</select></td>
    <td><select class="${errors.positionGroup ? "is-invalid" : ""}" data-ocr-index="${index}" data-field="positionGroup">${ocrSelectOptions(groups, normalized.positionGroup, financePositionGroupLabel)}</select></td>
    <td><select class="${errors.positionCategory ? "is-invalid" : ""}" data-ocr-index="${index}" data-field="positionCategory">${ocrSelectOptions(positions, normalized.positionCategory)}</select></td>
    <td class="ocr-source-cell"><span title="${escapeAttr(normalized.source || "")}">${escapeHtml(normalized.source || "图片综合识别")}</span><small>置信度 ${confidence} · ${normalized.transactions?.length || 0} 笔交易${hasCandidates ? ` · ${normalized.lookupCandidates.length}个候选` : ""}</small></td>
    <td style="display:flex;gap:4px;">
      ${hasCandidates ? `<button type="button" class="icon-button primary" data-action="select-security-candidate" data-index="${index}" title="从候选列表中选择正确的证券">选择</button>` : ""}
      <button type="button" class="icon-button danger" data-action="remove-finance-ocr-asset" data-index="${index}" title="删除此候选">×</button>
    </td>
  </tr>`;
}

function renderFinanceOcrResultPreview() {
  const container = document.querySelector("#financeOcrTransactions");
  if (!container) return;
  const assets = pendingFinanceOcrAssets || [];
  container.hidden = assets.length === 0 && pendingFinanceOcrTransactions.length === 0 && !pendingFinanceOcrRawText;
  const validSelected = assets.filter((asset) => asset.selected !== false && Object.keys(validateFinanceOcrAsset(asset)).length === 0).length;
  container.innerHTML = `
    ${assets.length ? `<div class="ocr-preview-heading">
      <strong>资产候选（${assets.length} 项）</strong>
      <span>可直接编辑。红框字段补全前不能导入。</span>
    </div>
    <div class="ocr-assets-table-wrap">
      <table class="ocr-assets-table">
        <thead><tr>
          <th>选</th><th>名称</th><th>代码</th><th>市值</th><th>持仓</th><th>可用</th>
          <th>现价</th><th>成本</th><th>持仓盈亏</th><th>盈亏率%</th>
          <th>类型</th><th>市场</th><th>币种</th><th>账户</th>
          <th>资产分类</th><th>二级分类</th><th>三级分类</th><th>仓位分组</th><th>仓位分类</th>
          <th>识别来源</th><th>操作</th>
        </tr></thead>
        <tbody>${assets.map(renderFinanceOcrAssetRow).join("")}</tbody>
      </table>
    </div>` : `<p class="ocr-empty-result">没有识别到可导入的资产行。</p>`}
    ${pendingFinanceOcrTransactions.length ? `<details class="ocr-detail-block">
      <summary>交易明细（${pendingFinanceOcrTransactions.length} 笔）</summary>
      <div class="ocr-transaction-list">${pendingFinanceOcrTransactions.map((transaction) => `
        <span>${escapeHtml(transaction.assetName || transaction.assetCode || "未关联")} · ${transaction.date} · ${transaction.direction === "buy" ? "买入" : "卖出"} · ${financeOcrFixed3(transaction.shares)} × ${financeOcrFixed3(transaction.price)} · ${financeOcrFixed3(transaction.amount)}</span>
      `).join("")}</div>
    </details>` : ""}
    ${pendingFinanceOcrUnassignedTransactions.length ? `<p class="ocr-unassigned-warning">有 ${pendingFinanceOcrUnassignedTransactions.length} 笔交易无法关联到资产，暂不会导入。</p>` : ""}
    ${pendingFinanceOcrRawText ? `<details class="ocr-detail-block"><summary>查看原始识别文本</summary><pre>${escapeHtml(pendingFinanceOcrRawText)}</pre></details>` : ""}
    <div class="ocr-preview-actions">
      <button type="button" data-action="discard-finance-ocr">清除结果</button>
      <span>可导入 ${validSelected} 项</span>
      <button type="button" class="primary" data-action="confirm-finance-ocr" ${validSelected ? "" : "disabled"}>批量导入选中资产</button>
    </div>`;
}

function handleFinanceOcrPreviewInput(event) {
  const index = Number(event.target.dataset.ocrIndex);
  const field = event.target.dataset.field;
  if (!Number.isInteger(index) || !field || !pendingFinanceOcrAssets[index]) return;
  const asset = pendingFinanceOcrAssets[index];
  if (field === "selected") {
    asset.selected = event.target.checked;
  } else if (["costPrice", "shares", "availableShares", "currentPrice", "pnl", "pnlPercent", "currentValue"].includes(field)) {
    const value = Number(event.target.value);
    asset[field] = Number.isFinite(value) ? value : null;
    if (field === "currentValue") {
      asset.currentValueSource = "ocr";
      asset.pnl = value - (Number(asset.costPrice) || 0) * (Number(asset.shares) || 0);
      asset.currentPrice = Number(asset.shares) > 0 ? value / Number(asset.shares) : asset.currentPrice;
    } else if (field === "currentPrice" || field === "shares") {
      asset.currentValue = (Number(asset.currentPrice) || 0) * (Number(asset.shares) || 0);
      asset.pnl = asset.currentValue - (Number(asset.costPrice) || 0) * (Number(asset.shares) || 0);
      asset.pnlPercent = Number(asset.costPrice) > 0
        ? ((Number(asset.currentPrice) || 0) - Number(asset.costPrice)) / Number(asset.costPrice) * 100
        : 0;
      asset.currentValueSource = "calculated";
    } else {
      asset.currentValue = (Number(asset.costPrice) || 0) * (Number(asset.shares) || 0) + (Number(asset.pnl) || 0);
      asset.pnlPercent = Number(asset.costPrice) > 0 && Number(asset.shares) > 0
        ? Number(asset.pnl) / (Number(asset.costPrice) * Number(asset.shares)) * 100
        : 0;
      asset.currentValueSource = "calculated";
    }
  } else {
    asset[field] = event.target.value;
  }
}

function handleFinanceOcrPreviewChange(event) {
  handleFinanceOcrPreviewInput(event);
  const field = event.target.dataset.field;
  const index = Number(event.target.dataset.ocrIndex);
  if (!Number.isInteger(index) || !pendingFinanceOcrAssets[index]) return;
  const requiresRerender = ["kind", "market", "currency", "subcategory", "positionGroup", "selected"].includes(field);
  if (requiresRerender) {
    pendingFinanceOcrAssets[index] = completeFinanceOcrAssetDefaults(pendingFinanceOcrAssets[index], {}, true);
    renderFinanceOcrResultPreviewPreservingPosition(index, field);
  }
}

function renderFinanceOcrResultPreviewPreservingPosition(index = null, field = "") {
  const form = document.querySelector("#financeAssetForm");
  const tableWrap = document.querySelector(".ocr-assets-table-wrap");
  const formScrollTop = form?.scrollTop || 0;
  const tableScrollLeft = tableWrap?.scrollLeft || 0;
  const tableScrollTop = tableWrap?.scrollTop || 0;
  renderFinanceOcrResultPreview();
  if (form) form.scrollTop = formScrollTop;
  const updatedWrap = document.querySelector(".ocr-assets-table-wrap");
  if (updatedWrap) {
    updatedWrap.scrollLeft = tableScrollLeft;
    updatedWrap.scrollTop = tableScrollTop;
  }
  if (Number.isInteger(index) && field) {
    const updatedField = document.querySelector(`[data-ocr-index="${index}"][data-field="${field}"]`);
    updatedField?.focus({ preventScroll: true });
  }
}

function captureFinanceScrollPosition() {
  return {
    shellTop: document.querySelector(".shell")?.scrollTop || 0,
    holdingTop: document.querySelector("#holdingTabContent")?.scrollTop || 0,
  };
}

function restoreFinanceScrollPosition(position) {
  if (!position) return;
  const shell = document.querySelector(".shell");
  const holdingContent = document.querySelector("#holdingTabContent");
  if (shell) shell.scrollTop = position.shellTop;
  if (holdingContent) holdingContent.scrollTop = position.holdingTop;
}

function normalizeFinanceOcrPayload(asset, id = Date.now()) {
  const completed = completeFinanceOcrAssetDefaults(asset);
  return {
    id,
    kind: normalizeFinanceKind(completed.kind),
    accountId: completed.accountId,
    category: completed.category,
    subcategory: completed.subcategory,
    tertiaryCategory: completed.tertiaryCategory || "未分类",
    positionGroup: normalizeFinancePositionGroup(completed.positionGroup, completed.kind),
    positionCategory: completed.positionCategory,
    market: completed.market,
    currency: normalizeFinanceCurrency(completed.currency, completed.market),
    name: String(completed.name || "").trim(),
    code: normalizeFinanceOcrCode(completed.code),
    costPrice: roundFinanceOcrNumber(completed.costPrice) || 0,
    shares: roundFinanceOcrNumber(completed.shares) || 0,
    availableShares: roundFinanceOcrNumber(completed.availableShares) || 0,
    currentPrice: roundFinanceOcrNumber(completed.currentPrice) || 0,
    pnl: roundFinanceOcrNumber(completed.pnl) || 0,
    pnlPercent: roundFinanceOcrNumber(completed.pnlPercent) || 0,
    todayPnl: roundFinanceOcrNumber(completed.todayPnl) || 0,
    todayPnlPercent: roundFinanceOcrNumber(completed.todayPnlPercent) || 0,
    transactions: dedupeFinanceTransactions(completed.transactions || []).map((transaction) => ({
      ...transaction,
      shares: roundFinanceOcrNumber(transaction.shares) || 0,
      price: roundFinanceOcrNumber(transaction.price) || 0,
      amount: roundFinanceOcrNumber(transaction.amount) || 0,
      commission: roundFinanceOcrNumber(transaction.commission) || 0,
      stampDuty: roundFinanceOcrNumber(transaction.stampDuty) || 0,
      transferFee: roundFinanceOcrNumber(transaction.transferFee) || 0,
    })),
  };
}

function mergeFinanceOcrAsset(existing, candidate) {
  const additions = dedupeFinanceTransactions(candidate.transactions || [], existing.transactions || []);
  const merged = {
    ...existing,
    ...candidate,
    id: existing.id,
    transactions: [...(existing.transactions || []), ...additions],
  };
  if (additions.length) {
    recalcAssetFromTransactions(merged);
  } else {
    merged.costPrice = candidate.costPrice;
    merged.shares = candidate.shares;
  }
  merged.pnl = candidate.pnl;
  return merged;
}

function confirmFinanceOcrResult() {
  const selected = pendingFinanceOcrAssets.filter((asset) => asset.selected !== false);
  const invalid = selected.filter((asset) => Object.keys(validateFinanceOcrAsset(asset)).length);
  const status = document.querySelector("#financeOcrStatus");
  if (!selected.length) {
    status.textContent = "请至少勾选一项资产。";
    status.className = "finance-ocr-status error";
    return;
  }
  if (invalid.length) {
    status.textContent = `还有 ${invalid.length} 项资产存在必填字段缺失或数值无效，请先修正红框字段。`;
    status.className = "finance-ocr-status error";
    renderFinanceOcrResultPreviewPreservingPosition();
    return;
  }
  let created = 0;
  let merged = 0;
  selected.forEach((asset, index) => {
    const payload = normalizeFinanceOcrPayload(asset, Date.now() + index);
    const existingIndex = state.financeAssets.findIndex((item) =>
      String(item.accountId) === String(payload.accountId)
      && normalizeFinanceOcrCode(item.code) === payload.code);
    if (existingIndex >= 0) {
      state.financeAssets[existingIndex] = mergeFinanceOcrAsset(state.financeAssets[existingIndex], payload);
      merged += 1;
    } else {
      if (payload.transactions.length) {
        const snapshot = { shares: payload.shares, costPrice: payload.costPrice };
        recalcAssetFromTransactions(payload);
        if (!(payload.shares > 0)) Object.assign(payload, snapshot);
      }
      state.financeAssets.unshift(payload);
      created += 1;
    }
  });
  const lastAsset = selected.at(-1);
  if (lastAsset) {
    const draftKind = lastAsset.kind || "stock";
    if (!state.financeAssetDrafts) state.financeAssetDrafts = {};
    state.financeAssetDrafts[draftKind] = { ...lastAsset };
    delete state.financeAssetDrafts[draftKind].transactions;
    delete state.financeAssetDrafts[draftKind].selected;
  }
  syncAssetClassValuesFromFinance();
  saveState();
  status.textContent = `导入完成：新增 ${created} 项，合并更新 ${merged} 项。`;
  status.className = "finance-ocr-status success";
  pendingFinanceOcrResult = null;
  pendingFinanceOcrAssets = [];
  pendingFinanceOcrTransactions = [];
  pendingFinanceOcrUnassignedTransactions = [];
  pendingFinanceOcrRawText = "";
  pendingFinanceOcrConfirmed = true;
  document.querySelector("#financeAssetDialog").close();
  render();
}

function discardFinanceOcrResult() {
  pendingFinanceOcrResult = null;
  pendingFinanceOcrAssets = [];
  pendingFinanceOcrTransactions = [];
  pendingFinanceOcrUnassignedTransactions = [];
  pendingFinanceOcrRawText = "";
  pendingFinanceOcrConfirmed = false;
  renderFinanceOcrTransactionPreview();
  const status = document.querySelector("#financeOcrStatus");
  status.textContent = "识别结果已清除，可重新识别当前图片。";
  status.className = "finance-ocr-status";
}

async function recognizeImageText(file, onProgress = () => {}) {
  if (!window.Tesseract?.recognize) throw new Error("OCR component unavailable");
  const processed = await preprocessFinanceOcrImage(file);
  const recognize = async (source, start, span, pageMode) => window.Tesseract.recognize(source, "chi_sim+eng", {
    workerPath: "/vendor/tesseract-worker.min.js",
    logger: (message) => {
      if (message.status === "recognizing text") onProgress(Math.round(start + (message.progress || 0) * span));
    },
  }, {
    tessedit_pageseg_mode: String(pageMode),
    preserve_interword_spaces: "1",
  });
  const enhancedResult = await recognize(processed, 0, 65, 6);
  const originalResult = await recognize(file, 65, 35, 11);
  return mergeOcrTexts(enhancedResult.data.text || "", originalResult.data.text || "");
}

async function preprocessFinanceOcrImage(file) {
  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = Math.max(0.25, Math.min(3, 2600 / Math.max(longest, 1)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.filter = "grayscale(1) contrast(1.55)";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  context.filter = "none";
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const source = new Uint8ClampedArray(image.data);
  const width = canvas.width;
  for (let y = 1; y < canvas.height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const offset = (y * width + x) * 4;
      const center = source[offset] * 5;
      const neighbors = source[offset - 4] + source[offset + 4] + source[offset - width * 4] + source[offset + width * 4];
      const value = Math.max(0, Math.min(255, center - neighbors));
      image.data[offset] = value;
      image.data[offset + 1] = value;
      image.data[offset + 2] = value;
    }
  }
  context.putImageData(image, 0, 0);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error("图片预处理失败"));
  }, "image/png"));
}

function mergeOcrTexts(...texts) {
  const seen = new Set();
  return texts
    .flatMap((text) => String(text || "").split(/\r?\n/))
    .map((line) => line.trim())
    .filter((line) => {
      const key = line.replace(/\s+/g, "").toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join("\n");
}

function normalizeOcrDate(value) {
  const match = String(value || "").match(
    /(20\d{2})[年./-](\d{1,2})[月./-](\d{1,2})(?:日)?(?:[T\s]+(\d{1,2})[:：](\d{1,2})(?:[:：](\d{1,2}))?)?/,
  );
  if (!match) return "";
  const date = `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}`;
  if (match[4] === undefined) return date;
  return `${date} ${String(match[4]).padStart(2, "0")}:${String(match[5]).padStart(2, "0")}:${String(match[6] || 0).padStart(2, "0")}`;
}

function financeTransactionKey(transaction) {
  return [
    transaction.date,
    transaction.direction,
    Number(transaction.shares || 0).toFixed(4),
    Number(transaction.price || 0).toFixed(4),
    Number(transaction.amount || 0).toFixed(2),
    (
      (Number(transaction.commission) || 0)
      + (Number(transaction.stampDuty) || 0)
      + (Number(transaction.transferFee) || 0)
    ).toFixed(2),
  ].join("|");
}

function dedupeFinanceTransactions(transactions = [], existing = []) {
  const seen = new Set(existing.map(financeTransactionKey));
  return transactions.filter((transaction) => {
    const key = financeTransactionKey(transaction);
    if (!transaction.date || !transaction.direction || !transaction.shares || !transaction.price || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseFinanceTransactions(lines, valueAfterLabel, numberAfterLabel) {
  const transactions = [];
  const datePattern = /20\d{2}[年./-]\d{1,2}[月./-]\d{1,2}(?:日)?(?:[T\s]+\d{1,2}[:：]\d{1,2}(?:[:：]\d{1,2})?)?/;
  lines.forEach((line, index) => {
    const direction = /卖出|赎回|减仓|sell/i.test(line)
      ? "sell"
      : /买入|申购|加仓|buy/i.test(line)
        ? "buy"
        : "";
    if (!direction) return;
    const context = [lines[index - 1], line, lines[index + 1]].filter(Boolean).join(" ");
    const date = normalizeOcrDate(context.match(datePattern)?.[0]);
    const inferred = inferTransactionNumbers(line.replace(datePattern, " "));
    const shares = numberFromOcrContext(context, ["数量", "成交数量", "份额", "股数"]) || inferred.shares;
    const price = numberFromOcrContext(context, ["价格", "成交价", "净值", "单价"]) || inferred.price;
    let amount = numberFromOcrContext(context, ["金额", "成交金额", "发生金额"]);
    if (!amount) amount = inferred.amount;
    if (!shares || !price) return;
    if (!amount) amount = shares * price;
    const assetCode = extractFinanceCodes(line)[0] || extractFinanceCodes(context)[0] || "";
    transactions.push({
      id: Date.now() + transactions.length,
      direction,
      date: date || localDateTimeString(),
      shares,
      price,
      amount,
      commission: numberFromOcrContext(context, ["佣金", "手续费"]) || 0,
      stampDuty: numberFromOcrContext(context, ["印花税"]) || 0,
      transferFee: numberFromOcrContext(context, ["过户费"]) || 0,
      assetCode,
      assetName: extractOcrAssetName(line, assetCode) || extractOcrAssetName(context, assetCode),
      sourceLine: line,
    });
  });
  if (!transactions.length) {
    const directionText = valueAfterLabel(["交易方向", "买卖方向", "业务名称"]);
    const direction = /卖出|赎回|sell/i.test(directionText) ? "sell" : /买入|申购|buy/i.test(directionText) ? "buy" : "";
    const shares = numberAfterLabel(["成交数量", "交易数量", "买入数量", "卖出数量"]);
    const price = numberAfterLabel(["成交价格", "交易价格", "成交均价"]);
    if (direction && shares && price) {
      transactions.push({
        id: Date.now(),
        direction,
        date: normalizeOcrDate(valueAfterLabel(["交易时间", "成交时间", "发生时间", "交易日期", "成交日期", "发生日期"])) || localDateTimeString(),
        shares,
        price,
        amount: numberAfterLabel(["成交金额", "交易金额", "发生金额"]) || shares * price,
        commission: numberAfterLabel(["佣金", "手续费"]) || 0,
        stampDuty: numberAfterLabel(["印花税"]) || 0,
        transferFee: numberAfterLabel(["过户费"]) || 0,
        assetCode: normalizeFinanceOcrCode(valueAfterLabel(["资产代码", "证券代码", "股票代码", "基金代码", "代码"])),
        assetName: valueAfterLabel(["资产名称", "证券名称", "股票名称", "基金名称", "名称"]),
        sourceLine: lines.join(" "),
      });
    }
  }
  return dedupeFinanceTransactions(transactions);
}

function inferTransactionNumbers(line) {
  const values = [...String(line || "").matchAll(/[-+]?\d[\d,]*(?:\.\d+)?/g)]
    .map((match) => ({ raw: match[0], value: Number(match[0].replaceAll(",", "")) }))
    .filter((item) => Number.isFinite(item.value))
    .map((item) => Math.abs(item.value));
  let best = null;
  for (let first = 0; first < values.length; first += 1) {
    for (let second = first + 1; second < values.length; second += 1) {
      for (let third = second + 1; third < values.length; third += 1) {
        const triplet = [values[first], values[second], values[third]];
        [[0, 1, 2], [0, 2, 1], [1, 2, 0]].forEach(([left, right, total]) => {
          const product = triplet[left] * triplet[right];
          const difference = Math.abs(product - triplet[total]) / Math.max(triplet[total], 1);
          if (difference > 0.03 || (best && difference >= best.difference)) return;
          const pair = [triplet[left], triplet[right]];
          const integerIndex = pair.findIndex((value) => Number.isInteger(value) && value >= 1);
          const shares = integerIndex >= 0
            ? pair[integerIndex]
            : Math.max(...pair);
          const price = pair[pair.indexOf(shares) === 0 ? 1 : 0];
          best = { shares, price, amount: triplet[total], difference };
        });
      }
    }
  }
  if (best) return best;
  if (values.length >= 2) {
    const shares = values.at(-2);
    const price = values.at(-1);
    return { shares, price, amount: shares * price };
  }
  return { shares: null, price: null, amount: null };
}

function numberFromOcrContext(context, labels) {
  const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const match = String(context || "").match(new RegExp(`(?:${escaped})\\s*[:：]?\\s*([-+]?\\d[\\d,]*(?:\\.\\d+)?)`, "i"));
  return match ? Number(match[1].replaceAll(",", "")) : null;
}

function parseBrokerPnlColumns(lines) {
  const headingIndex = lines.findIndex((line) => /持\s*仓\s*盈\s*亏/.test(line));
  if (headingIndex < 0) return {};
  const heading = lines[headingIndex];
  const hasTodayColumn = /当\s*日\s*(?:参\s*考\s*)?盈\s*(?:亏|利)/.test(heading);
  const valueLines = [];
  for (let index = headingIndex + 1; index < Math.min(lines.length, headingIndex + 6); index += 1) {
    if (/持\s*股\s*天\s*数|持\s*仓\s*天\s*数|个\s*股\s*仓\s*位|成\s*本\s*价|现\s*价|税\s*费\s*合\s*计|交\s*易\s*记\s*录/.test(lines[index])) break;
    valueLines.push(lines[index]);
  }
  const tokens = financeOcrNumericTokens(valueLines.join(" "));
  const amounts = tokens.filter((token) => !token.percent).map((token) => token.value);
  const percentages = tokens.filter((token) => token.percent).map((token) => token.value);
  return {
    pnl: amounts[0] ?? null,
    pnlPercent: percentages[0] ?? null,
    todayPnl: hasTodayColumn ? amounts[1] ?? null : null,
    todayPnlPercent: hasTodayColumn ? percentages[1] ?? null : null,
  };
}

const FINANCE_OCR_CODE_STOPWORDS = new Set([
  "CNY", "CNH", "HKD", "USD", "EUR", "JPY", "GBP", "AUD", "SGD", "ETF", "LOF",
  "BUY", "SELL", "RMB", "OCR", "ID", "VIP", "APP", "TOTAL", "PRICE", "MARKET",
  "SYMBOL", "TICKER", "NAME", "COST", "SHARES", "QTY", "PROFIT", "PNL", "VALUE",
]);

function normalizeFinanceOcrCode(value = "") {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/^(SH|SZ)(?=\d{6}$)/i, "")
    .replace(/^HK(?=\d{5}(?:\.HK)?$)/i, "")
    .replace(/^US[.:\s-]+/i, "")
    .replace(/\.HK$/i, "")
    .replace(/[^A-Z0-9.-]/g, "");
}

function extractFinanceCodes(value = "") {
  const text = String(value || "").toUpperCase();
  const matches = [
    ...text.matchAll(/(?<!\d)(?:SH|SZ)?\d{6}(?!\d)/g),
    ...text.matchAll(/(?<!\d)(?:HK)?\d{5}(?:\.HK)?(?!\d)/g),
    ...text.matchAll(/\b(?:BTC|ETH|USDT|USDC|BNB|SOL|XRP|DOGE|ADA|XAU|XAG|WTI|BRENT|AU|AG)\b/g),
    ...text.matchAll(/\b[A-Z]{1,6}(?:\.[A-Z])?\b/g),
  ].map((match) => normalizeFinanceOcrCode(match[0]))
    .filter((code) => code && !FINANCE_OCR_CODE_STOPWORDS.has(code));
  return [...new Set(matches)].filter((code) => {
    if (/^\d+$/.test(code)) return code.length === 5 || code.length === 6;
    return code.length >= 1 && code.length <= 7;
  });
}

function inferFinanceOcrKind(text = "", code = "") {
  const source = `${text} ${code}`.toLowerCase();
  if (/基金|etf|lof|fund/.test(source) || /^(1|5)\d{5}$/.test(code)) return "fund";
  if (/期货|futures?|\bif\d|\bic\d|\bih\d/.test(source)) return "futures";
  if (/期权|options?|call|put/.test(source)) return "options";
  if (/黄金|白银|原油|商品|\bxau\b|\bxag\b|\bwti\b|\bbrent\b/.test(source)) return "commodity";
  if (/比特币|以太坊|加密|\bbtc\b|\beth\b|\busdt\b|\bcrypto/.test(source)) return "crypto";
  if (/现金流|备用金|可用现金|cash/.test(source)) return "cashflow";
  if (/自定义|理财产品/.test(source)) return "custom";
  return "stock";
}

function inferFinanceOcrCurrency(text = "", code = "", kind = "stock") {
  if (/\bHKD\b|港币|港股/i.test(text) || /^\d{5}$/.test(code)) return "HKD";
  if (/\bUSD\b|美元|美股/i.test(text) || (/^[A-Z]{1,6}(?:\.[A-Z])?$/.test(code) && kind === "stock")) return "USD";
  if (/\bEUR\b|欧元/i.test(text)) return "EUR";
  if (/\bJPY\b|日元/i.test(text)) return "JPY";
  if (/\bGBP\b|英镑/i.test(text)) return "GBP";
  return "CNH";
}

function extractOcrAssetName(value = "", code = "") {
  let text = String(value || "")
    .replace(new RegExp(code ? code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "(?!)", "ig"), " ")
    .replace(/(?:SH|SZ|HK|US)[.:\s-]*/ig, " ")
    .replace(/[-+]?\d[\d,]*(?:\.\d+)?%?/g, " ")
    .replace(/资产名称|证券名称|股票名称|基金名称|产品名称|名称|代码|持仓|市值|成本|数量|份额|盈亏|买入|卖出|申购|赎回|交易|人民币|港币|美元/gi, " ")
    .replace(/[|:：;,，()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const chinese = [...text.matchAll(/[\u3400-\u9fff]{2,18}(?:ETF|LOF)?/gi)]
    .map((match) => match[0])
    .filter((name) => !/^(今日|昨日|当前|合计|总计|账户|资产|证券|股票|基金|商品|期货|期权|市场|代码|名称)$/.test(name));
  if (chinese.length) return chinese.sort((a, b) => b.length - a.length)[0];
  text = text.split(/\s+/)
    .filter((token) => /[A-Z]/i.test(token) && !FINANCE_OCR_CODE_STOPWORDS.has(token.toUpperCase()))
    .slice(0, 5)
    .join(" ");
  return text.length >= 2 ? text : "";
}

function createFinanceOcrLabelReaders(lines) {
  const valueAfterLabel = (labels, scope = lines) => {
    const labelPattern = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    for (const line of scope) {
      const match = line.match(new RegExp(`(?:${labelPattern})\\s*[:：]?\\s*([^|]+)$`, "i"));
      if (match?.[1]) return match[1].trim();
    }
    return "";
  };
  const numberAfterLabel = (labels, scope = lines) => {
    const value = valueAfterLabel(labels, scope);
    const match = value.match(/[-+]?\d[\d,]*(?:\.\d+)?/);
    return match ? Number(match[0].replaceAll(",", "")) : null;
  };
  return { valueAfterLabel, numberAfterLabel };
}

function inferFinanceOcrNumbers(line = "", code = "") {
  const readers = createFinanceOcrLabelReaders([line]);
  const labeled = {
    costPrice: readers.numberAfterLabel(["持仓成本", "平均成本", "成本价", "成本单价", "成本"]),
    shares: readers.numberAfterLabel(["持仓数量", "持有数量", "持有份额", "基金份额", "股票数量", "数量", "份额"]),
    pnl: readers.numberAfterLabel(["浮动盈亏", "持仓盈亏", "累计盈亏", "盈亏", "盈亏额"]),
    currentValue: readers.numberAfterLabel(["当前市值", "持仓市值", "资产市值", "当前价值", "市值"]),
    currentPrice: readers.numberAfterLabel(["现价", "最新价", "当前价格", "市价", "最新价格"]),
    avgBuyPrice: readers.numberAfterLabel(["买入均价", "持仓均价", "平均买入价", "成本均价"]),
    holdingDays: readers.numberAfterLabel(["持仓天数", "持股天数", "天数"]),
    positionWeight: readers.numberAfterLabel(["个股仓位", "仓位占比", "仓位", "占比"]),
    totalFees: readers.numberAfterLabel(["税费合计", "税费", "费用合计", "总费用", "手续费合计"]),
    todayPnl: readers.numberAfterLabel(["当日盈亏", "当日参考盈亏", "今日盈亏", "当天盈亏"]),
  };
  const withoutCode = String(line).replace(new RegExp(code ? code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "(?!)", "ig"), " ");
  const values = [...withoutCode.matchAll(/[-+]?\d[\d,]*(?:\.\d+)?/g)]
    .map((match) => Number(match[0].replaceAll(",", "")))
    .filter(Number.isFinite)
    .filter((number) => !(number >= 1900 && number <= 2100));
  if (labeled.costPrice === null && values.length >= 2) {
    const positive = values.filter((number) => number > 0);
    const signed = values.find((number) => number < 0);
    let best = null;
    positive.forEach((cost) => positive.forEach((shares) => {
      if (cost === shares) return;
      const expected = cost * shares;
      const marketValue = positive.find((value) => value !== cost && value !== shares && Math.abs(value - expected) / Math.max(value, 1) < 0.35);
      if (!marketValue) return;
      const difference = Math.abs(marketValue - expected) / Math.max(marketValue, 1);
      if (!best || difference < best.difference) best = { cost, shares, marketValue, difference };
    }));
    if (best) {
      labeled.costPrice = best.cost;
      labeled.shares = best.shares;
      labeled.currentValue = best.marketValue;
    } else if (positive.length >= 2) {
      labeled.costPrice = positive[0];
      labeled.shares = positive[1];
    }
    if (labeled.pnl === null && signed !== undefined) labeled.pnl = signed;
  }
  if (labeled.pnl === null && labeled.currentValue !== null && labeled.costPrice !== null && labeled.shares !== null) {
    labeled.pnl = labeled.currentValue - labeled.costPrice * labeled.shares;
  }
  return labeled;
}

function completeFinanceOcrAssetDefaults(asset = {}, formDefaults = {}, preserveSelections = false) {
  const form = document.querySelector("#financeAssetForm");
  const fields = form?.elements;
  const source = { ...formDefaults, ...asset };
  const kind = normalizeFinanceKind(source.kind || fields?.kind?.value || "stock");
  let currency = source.currency || fields?.currency?.value || inferFinanceOcrCurrency(source.source, source.code, kind);
  let market = source.market || fields?.market?.value || (currency === "CNH" ? "domestic" : "overseas");
  if (currency === "CNH") market = "domestic";
  else market = "overseas";
  if (market === "domestic") currency = "CNH";
  const subcategories = financeSubcategoryOptions(kind);
  let subcategory = source.subcategory;
  if (!preserveSelections || !subcategories.includes(subcategory)) {
    if (kind === "stock" && currency === "HKD") subcategory = "港股";
    else if (kind === "stock" && currency === "USD") subcategory = "美股";
    else if (kind === "stock" && currency === "CNH") subcategory = "A股";
    else subcategory = subcategories.includes(subcategory) ? subcategory : subcategories[0];
  }
  const groups = financePositionGroupOptions(kind);
  const positionGroup = groups.includes(source.positionGroup) ? source.positionGroup : groups[0];
  const positionCategories = financePositionCategoryOptions(kind, positionGroup);
  const categoryOptions = financeCategoryOptions(kind, source.category);
  const inferredCategory = inferFinanceAssetClass(kind);
  const costPrice = source.costPrice === null || source.costPrice === undefined ? null : Number(source.costPrice);
  const shares = source.shares === null || source.shares === undefined ? null : Number(source.shares);
  const pnl = source.pnl === null || source.pnl === undefined ? 0 : Number(source.pnl);
  const currentValue = source.currentValue === null || source.currentValue === undefined
    ? (Number(costPrice) || 0) * (Number(shares) || 0) + (Number(pnl) || 0)
    : Number(source.currentValue);
  return {
    ...source,
    selected: source.selected !== false,
    kind,
    market,
    currency,
    accountId: source.accountId || fields?.accountId?.value || state.accounts[0]?.id || "",
    category: categoryOptions.includes(source.category)
      ? source.category
      : categoryOptions.includes(inferredCategory)
        ? inferredCategory
        : categoryOptions[0],
    subcategory,
    tertiaryCategory: source.tertiaryCategory || inferBoardFromCode(source.code) || "未分类",
    positionGroup,
    positionCategory: positionCategories.includes(source.positionCategory) ? source.positionCategory : positionCategories[0],
    name: String(source.name || "").trim(),
    code: normalizeFinanceOcrCode(source.code),
    costPrice,
    shares,
    pnl: Number.isFinite(pnl) ? pnl : 0,
    currentValue: Number.isFinite(currentValue) ? currentValue : 0,
    currentValueSource: source.currentValueSource || (source.currentValue !== null && source.currentValue !== undefined ? "ocr" : "calculated"),
    availableShares: source.availableShares === null || source.availableShares === undefined ? shares : Number(source.availableShares),
    currentPrice: source.currentPrice === null || source.currentPrice === undefined ? null : Number(source.currentPrice),
    pnlPercent: source.pnlPercent === null || source.pnlPercent === undefined
      ? (Number(costPrice) > 0 ? (Number(pnl) / (Number(costPrice) * Number(shares) || 1)) * 100 : 0)
      : Number(source.pnlPercent),
    avgBuyPrice: source.avgBuyPrice === null || source.avgBuyPrice === undefined ? null : Number(source.avgBuyPrice),
    holdingDays: source.holdingDays === null || source.holdingDays === undefined ? null : Number(source.holdingDays),
    positionWeight: source.positionWeight === null || source.positionWeight === undefined ? null : Number(source.positionWeight),
    totalFees: source.totalFees === null || source.totalFees === undefined ? 0 : Number(source.totalFees),
    todayPnl: source.todayPnl === null || source.todayPnl === undefined ? 0 : Number(source.todayPnl),
    todayPnlPercent: source.todayPnlPercent === null || source.todayPnlPercent === undefined ? 0 : Number(source.todayPnlPercent),
    transactions: Array.isArray(source.transactions) ? source.transactions : [],
  };
}

function mergeFinanceOcrCandidates(candidates) {
  const merged = [];
  candidates.forEach((candidate) => {
    const keyCode = normalizeFinanceOcrCode(candidate.code);
    const keyName = String(candidate.name || "").replace(/\s+/g, "").toLowerCase();
    const found = merged.find((item) =>
      (keyCode && normalizeFinanceOcrCode(item.code) === keyCode)
      || (!keyCode && keyName && String(item.name || "").replace(/\s+/g, "").toLowerCase() === keyName));
    if (!found) {
      merged.push(candidate);
      return;
    }
    Object.entries(candidate).forEach(([field, value]) => {
      if ((found[field] === "" || found[field] === null || found[field] === undefined || found[field] === 0) && value !== "" && value !== null && value !== undefined) {
        found[field] = value;
      }
    });
    found.source = [...new Set([found.source, candidate.source].filter(Boolean))].join(" / ");
    found.confidence = Math.max(found.confidence || 0, candidate.confidence || 0);
  });
  return merged;
}

function financeOcrNumericTokens(value = "") {
  return [...String(value).matchAll(/([-+]?\d[\d,]*(?:\.\d+)?)\s*(%?)/g)]
    .map((match) => ({
      value: Number(match[1].replaceAll(",", "")),
      percent: match[2] === "%",
    }))
    .filter((item) => Number.isFinite(item.value));
}

function financeOcrNumberNear(rawValue, expectedValue) {
  if (!Number.isFinite(rawValue) || !Number.isFinite(expectedValue)) return rawValue;
  const sign = rawValue < 0 ? -1 : expectedValue < 0 ? -1 : 1;
  const raw = Math.abs(rawValue);
  const expected = Math.abs(expectedValue);
  const candidates = Array.from({ length: 7 }, (_, power) => raw / (10 ** power));
  const closest = candidates.reduce((best, value) =>
    Math.abs(value - expected) < Math.abs(best - expected) ? value : best, candidates[0]);
  return sign * closest;
}

function normalizeOcrPercent(rawValue, expectedValue = null) {
  if (!Number.isFinite(rawValue)) return 0;
  if (Number.isFinite(expectedValue)) return financeOcrNumberNear(rawValue, expectedValue);
  const sign = rawValue < 0 ? -1 : 1;
  let value = Math.abs(rawValue);
  while (value > 100) value /= 10;
  return sign * value;
}

function parseBrokerHoldingRows(lines) {
  const rows = [];
  // 不再排除标签行，而是用来辅助识别数据结构
  for (let index = 0; index < lines.length - 1; index += 1) {
    const line = lines[index];
    // 跳过纯标签行（只有中文和斜杠，没有数字）
    if (/^[^\d]*$/.test(line) && /(名称|市值|持仓|可用|现价|成本|盈亏|仓位|合计|总计)/.test(line)) continue;
    
    // 查找资产名称（行首的中文字符+可选的代码）
    const nameMatch = line.match(/^([A-Za-z\u3400-\u9fff]+(?:\s*\d{6})?)\s+(?=[-+]?\d)/);
    if (!nameMatch) continue;
    
    let name = nameMatch[1].trim();
    // 如果名称末尾是6位数字，提取为代码
    let code = "";
    const codeMatch = name.match(/(\d{6})$/);
    if (codeMatch) {
      code = codeMatch[1];
      name = name.replace(/\s*\d{6}$/, "").trim();
    }
    
    if (!name || !/[\u3400-\u9fffA-Za-z]/.test(name)) continue;
    
    // 提取第一行的数值
    const primary = financeOcrNumericTokens(line.slice(nameMatch[0].length - 1));
    // 提取第二行的数值
    const secondary = financeOcrNumericTokens(lines[index + 1]);
    
    // 至少需要有足够的数值才能解析
    if (primary.length < 2 || secondary.length < 3) continue;
    
    // 根据图片格式解析：
    // 第一行：名称、盈亏金额、持仓数量、成本价
    // 第二行：市值、盈亏比例、可用数量、现价
    const currentValue = secondary[0].value;           // 市值
    const pnl = primary[0].value;                       // 盈亏金额
    const shares = primary[1].value;                    // 持仓数量
    const costPrice = primary.length >= 3 ? primary[2].value : secondary[2].value;  // 成本价
    const availableShares = secondary.length >= 3 ? secondary[2].value : shares;    // 可用数量
    const currentPrice = secondary.length >= 4 ? secondary[3].value : secondary[1].value;  // 现价
    
    // 计算盈亏比例
    const pnlPercent = shares > 0 && costPrice > 0 
      ? (pnl / (costPrice * shares)) * 100 
      : (secondary.find((item, i) => i >= 1 && item.percent)?.value || 0);
    
    // 验证数据合理性
    if (!(shares > 0) || !(currentValue > 0)) continue;
    
    rows.push({
      name,
      code,
      kind: "stock",
      market: "domestic",
      currency: "CNH",
      currentValue,
      currentValueSource: "ocr",
      shares,
      availableShares,
      currentPrice,
      costPrice,
      pnl,
      pnlPercent,
      todayPnl: 0,
      todayPnlPercent: 0,
      source: `券商持仓列表：${line} / ${lines[index + 1]}`,
      sourceType: "broker-holding-row",
      confidence: 0.96,
    });
    index += 1; // 跳过下一行（已处理）
  }
  
  // 合并重复项
  const merged = [];
  rows.forEach((row) => {
    const duplicate = merged.find((item) =>
      Math.abs(Number(item.currentValue) - Number(row.currentValue)) < 0.1
      && Math.abs(Number(item.shares) - Number(row.shares)) < 0.0001
      && Math.abs(Number(item.costPrice) - Number(row.costPrice)) < 0.0001);
    if (!duplicate) {
      merged.push(row);
      return;
    }
    const chineseCount = (value) => (String(value || "").match(/[\u3400-\u9fff]/g) || []).length;
    if (chineseCount(row.name) > chineseCount(duplicate.name)) duplicate.name = row.name;
    duplicate.source = [...new Set([duplicate.source, row.source])].join(" / ");
    duplicate.confidence = Math.max(duplicate.confidence || 0, row.confidence || 0);
  });
  if (merged.length > 1) merged.forEach((row) => { row.selected = false; });
  return merged;
}

function parseBrokerDetailTransactions(lines, asset = {}) {
  const hasTransactionArea = lines.some((line) => /交\s*易\s*记\s*录/.test(line));
  if (!hasTransactionArea) return [];
  const transactions = [];
  lines.forEach((line, index) => {
    if (/买\s*[入人信].*卖\s*出.*行情/.test(line)) return;
    const direction = /卖\s*出/.test(line)
      ? "sell"
      : /买\s*[入人信]/.test(line)
        ? "buy"
        : "";
    const dateMatch = line.match(/20\d{2}[年./-]\d{1,2}[月./-]\d{1,2}(?:日)?(?:[T\s]+\d{1,2}[:：]\d{1,2}(?:[:：]\d{1,2})?)?/);
    if (!direction || !dateMatch) return;
    const context = lines.slice(index + 1, Math.min(index + 3, lines.length)).join(" ");
    const compactContext = context.replace(/\s+/g, "");
    const cleanedContext = compactContext;
    const inferred = inferTransactionNumbers(cleanedContext);
    const inferredIsConsistent = inferred.shares > 0 && inferred.price > 0 && inferred.amount > 0
      && Math.abs(inferred.shares * inferred.price - inferred.amount) / inferred.amount <= 0.03;
    const shares = numberFromOcrContext(compactContext, ["数量", "成交数量", "股数"])
      || (inferredIsConsistent ? inferred.shares : null);
    const rawPrice = numberFromOcrContext(compactContext, ["价格", "成交价"])
      || (inferredIsConsistent ? inferred.price : null);
    const labeledAmount = numberFromOcrContext(compactContext, ["金额", "成交金额"]);
    const amount = labeledAmount
      || (inferredIsConsistent ? inferred.amount : null)
      || (shares && rawPrice ? shares * rawPrice : null);
    const price = shares && amount ? financeOcrNumberNear(rawPrice, amount / shares) : rawPrice;
    if (!(shares > 0) || !(price > 0)) return;
    const numericValues = financeOcrNumericTokens(cleanedContext).map((item) => Math.abs(item.value));
    const inferredFee = numericValues.at(-1) <= 100
      && Math.abs(numericValues.at(-1) - price) > 0.001
      ? numericValues.at(-1)
      : 0;
    transactions.push({
      id: Date.now() + transactions.length,
      direction,
      date: normalizeOcrDate(dateMatch[0]) || localDateTimeString(),
      shares,
      price,
      amount: amount || shares * price,
      commission: numberFromOcrContext(compactContext, ["费用", "佣金", "手续费"]) || inferredFee,
      stampDuty: numberFromOcrContext(compactContext, ["印花税"]) || 0,
      transferFee: numberFromOcrContext(compactContext, ["过户费"]) || 0,
      assetCode: asset.code || "",
      assetName: asset.name || "",
      sourceLine: `${line} ${context}`,
    });
  });
  return dedupeFinanceTransactions(transactions);
}

function parseBrokerDetailOcrText(rawText) {
  const text = String(rawText || "")
    .replace(/[，]/g, ",")
    .replace(/[：]/g, ":")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/[^\S\r\n]+/g, " ");
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const transactionHeadingIndex = lines.findIndex((line) => /交\s*易\s*记\s*录/.test(line));
  const summaryLines = transactionHeadingIndex >= 0 ? lines.slice(0, transactionHeadingIndex) : lines.slice(0, 24);
  const summaryText = summaryLines.join(" ");
  const compactSummaryText = summaryText.replace(/\s+/g, "");
  const allCodes = lines.flatMap((line) => extractFinanceCodes(line));
  const code = allCodes.find((candidate) => /^\d{6}$/.test(candidate))
    || allCodes.find((candidate) => /^\d{5}$|^[A-Z]{1,6}(?:\.[A-Z])?$/.test(candidate))
    || "";
  const headerLine = lines.find((line) => code && line.replace(/[^\dA-Za-z]/g, "").includes(code))
    || summaryLines.find((line) => /[\u3400-\u9fff]{2,}/.test(line) && !/持仓明细|持仓盈亏|当日参考盈亏|当日参考盈利/.test(line))
    || "";
  const name = extractOcrAssetName(headerLine, code);
  const kind = inferFinanceOcrKind(summaryText, code);
  const currency = inferFinanceOcrCurrency(summaryText, code, kind);
  const pnlColumns = parseBrokerPnlColumns(summaryLines);
  const pnl = pnlColumns.pnl ?? numberFromOcrContext(compactSummaryText, ["持仓盈亏额", "持仓盈亏"]);
  const pnlPercent = pnlColumns.pnlPercent ?? numberFromOcrContext(compactSummaryText, ["持仓盈亏率"]);
  const todayPnl = pnlColumns.todayPnl ?? numberFromOcrContext(compactSummaryText, ["当日参考盈亏额", "当日参考盈利额", "当日参考盈亏", "当日参考盈利", "当日盈亏"]);
  const todayPnlPercent = pnlColumns.todayPnlPercent ?? numberFromOcrContext(compactSummaryText, ["当日参考盈亏率", "当日参考盈利率", "当日盈亏率"]);
  const asset = {
    name,
    code,
    kind,
    market: currency === "CNH" ? "domestic" : "overseas",
    currency,
    costPrice: numberFromOcrContext(compactSummaryText, ["成本价", "持仓成本"]),
    currentPrice: numberFromOcrContext(compactSummaryText, ["现价", "当前价格"]),
    avgBuyPrice: numberFromOcrContext(compactSummaryText, ["买入均价"]),
    holdingDays: numberFromOcrContext(compactSummaryText, ["持股天数", "持仓天数"]),
    positionWeight: numberFromOcrContext(compactSummaryText, ["个股仓位", "仓位"]),
    totalFees: numberFromOcrContext(compactSummaryText, ["税费合计", "税费"]),
    pnl,
    pnlPercent: Number.isFinite(pnlPercent) ? pnlPercent : null,
    todayPnl,
    todayPnlPercent: Number.isFinite(todayPnlPercent) ? todayPnlPercent : null,
    source: `券商持仓详情：${headerLine || "图片顶部摘要"}`,
    sourceType: "broker-holding-detail",
    confidence: code && name ? 0.98 : 0.84,
  };
  const transactions = parseBrokerDetailTransactions(lines, asset);
  asset.transactions = transactions;
  return {
    assets: asset.name || asset.code ? [asset] : [],
    transactions,
    unassignedTransactions: [],
    rawText: text,
  };
}

function combineFinanceOcrResults(listResult = {}, detailResult = {}) {
  const assets = (listResult.assets || []).map((asset) => ({
    ...asset,
    transactions: [...(asset.transactions || [])],
  }));
  (detailResult.assets || []).forEach((detailAsset) => {
    const detailCode = normalizeFinanceOcrCode(detailAsset.code);
    const detailName = String(detailAsset.name || "").replace(/\s+/g, "").toLowerCase();
    let target = assets.find((asset) =>
      detailCode && normalizeFinanceOcrCode(asset.code) === detailCode);
    if (!target && detailName) {
      target = assets.find((asset) => {
        const assetName = String(asset.name || "").replace(/\s+/g, "").toLowerCase();
        return assetName && (assetName.includes(detailName) || detailName.includes(assetName));
      });
    }
    if (!target) {
      assets.push(detailAsset);
      return;
    }
    [
      "code", "kind", "market", "currency", "costPrice", "currentPrice", "avgBuyPrice",
      "holdingDays", "positionWeight", "totalFees", "pnl", "pnlPercent", "todayPnl", "todayPnlPercent",
    ].forEach((field) => {
      const value = detailAsset[field];
      if (
        value !== "" && value !== null && value !== undefined
        && (typeof value !== "number" || Number.isFinite(value))
      ) {
        target[field] = value;
      }
    });
    target.transactions = dedupeFinanceTransactions(
      [...(target.transactions || []), ...(detailAsset.transactions || [])],
    );
    target.source = [...new Set([target.source, detailAsset.source].filter(Boolean))].join(" / ");
    target.confidence = Math.max(target.confidence || 0, detailAsset.confidence || 0);
  });
  const transactions = dedupeFinanceTransactions([
    ...(listResult.transactions || []),
    ...(detailResult.transactions || []),
  ]);
  const unassignedTransactions = associateFinanceOcrTransactions(assets, transactions);
  return {
    assets,
    transactions,
    unassignedTransactions,
    rawText: [
      listResult.rawText ? `【列表识别】\n${listResult.rawText}` : "",
      detailResult.rawText ? `【详情识别】\n${detailResult.rawText}` : "",
    ].filter(Boolean).join("\n\n"),
  };
}

function parseFinanceOcrTableRows(lines) {
  const aliases = {
    name: /名称|证券|股票|基金|产品/i,
    code: /代码|证券号|股票号|基金号|symbol|ticker/i,
    costPrice: /成本|均价|cost/i,
    shares: /数量|份额|股数|持仓|shares|qty/i,
    pnl: /盈亏|收益|profit|pnl/i,
    currentValue: /市值|当前价值|资产价值|marketvalue/i,
  };
  const rows = [];
  lines.forEach((line, headerIndex) => {
    const headerTokens = line.split(/\s{1,}|\|/).filter(Boolean);
    const fields = headerTokens.map((token) => Object.entries(aliases).find(([, pattern]) => pattern.test(token))?.[0] || "");
    if (new Set(fields.filter(Boolean)).size < 3 || !fields.includes("code")) return;
    for (let rowIndex = headerIndex + 1; rowIndex < Math.min(lines.length, headerIndex + 30); rowIndex += 1) {
      const row = lines[rowIndex];
      if (/合计|总计|资产汇总/.test(row)) break;
      const tokens = row.split(/\s{1,}|\|/).filter(Boolean);
      const code = extractFinanceCodes(row)[0] || "";
      if (!code) continue;
      const codeTokenIndex = tokens.findIndex((token) => normalizeFinanceOcrCode(token) === code);
      const aligned = tokens.length === fields.length
        ? tokens
        : codeTokenIndex >= 0
          ? fields.map((field, index) => {
              const headerCodeIndex = fields.indexOf("code");
              return tokens[codeTokenIndex + index - headerCodeIndex] || "";
            })
          : tokens;
      const candidate = { code, source: `表格第 ${rowIndex - headerIndex} 行：${row}`, confidence: 0.9 };
      fields.forEach((field, index) => {
        if (!field || field === "code") return;
        const value = aligned[index] || "";
        if (field === "name") candidate.name = extractOcrAssetName(value, code) || value.replace(/[^\u3400-\u9fffA-Za-z .&-]/g, "").trim();
        else {
          const number = Number(String(value).replace(/[,%]/g, ""));
          if (Number.isFinite(number)) candidate[field] = number;
        }
      });
      rows.push(candidate);
    }
  });
  return rows;
}

function isFinanceOcrHeaderLine(line = "") {
  const matches = [
    /名称|name/i, /代码|symbol|ticker/i, /成本|cost/i, /数量|份额|shares|qty/i,
    /盈亏|profit|pnl/i, /市值|market\s*value|value/i,
  ].filter((pattern) => pattern.test(line)).length;
  return matches >= 3;
}

function associateFinanceOcrTransactions(assets, transactions) {
  const unassigned = [];
  transactions.forEach((transaction) => {
    const code = normalizeFinanceOcrCode(transaction.assetCode);
    const name = String(transaction.assetName || "").replace(/\s+/g, "").toLowerCase();
    let asset = assets.find((item) => code && normalizeFinanceOcrCode(item.code) === code);
    if (!asset && name) {
      asset = assets.find((item) => {
        const candidateName = String(item.name || "").replace(/\s+/g, "").toLowerCase();
        return candidateName && (candidateName.includes(name) || name.includes(candidateName));
      });
    }
    if (!asset && assets.length === 1) asset = assets[0];
    if (!asset) {
      unassigned.push(transaction);
      return;
    }
    transaction.assetCode = asset.code;
    transaction.assetName = asset.name;
    asset.transactions = dedupeFinanceTransactions([...(asset.transactions || []), transaction]);
  });
  return unassigned;
}

function parseFinanceOcrText(rawText) {
  const text = String(rawText || "")
    .replace(/[，]/g, ",")
    .replace(/[：]/g, ":")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/[^\S\r\n]+/g, " ");
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const { valueAfterLabel, numberAfterLabel } = createFinanceOcrLabelReaders(lines);
  const textMatch = (options) => options.find((option) => option && text.toLowerCase().includes(String(option).toLowerCase())) || "";
  const codeLabelValue = valueAfterLabel(["资产代码", "证券代码", "股票代码", "基金代码", "产品代码", "代码"]);
  const labeledCode = normalizeFinanceOcrCode(extractFinanceCodes(codeLabelValue)[0] || "");
  const nameLabelValue = valueAfterLabel(["资产名称", "证券名称", "股票名称", "基金名称", "产品名称", "名称"]);
  const labeledName = isFinanceOcrHeaderLine(nameLabelValue)
    ? ""
    : nameLabelValue.replace(/\s{2,}.*/, "").trim();
  const globalKind = inferFinanceOcrKind(text, labeledCode);
  const globalCurrency = inferFinanceOcrCurrency(text, labeledCode, globalKind);
  const accountName = textMatch(state.accounts.map((account) => account.name));
  const accountId = state.accounts.find((account) => account.name === accountName)?.id || "";
  const brokerRows = parseBrokerHoldingRows(lines);
  const isBrokerHoldingList = brokerRows.length > 0;
  const candidates = [...brokerRows, ...(isBrokerHoldingList ? [] : parseFinanceOcrTableRows(lines))].map((candidate) => {
    const kind = inferFinanceOcrKind(candidate.source, candidate.code);
    const currency = inferFinanceOcrCurrency(candidate.source, candidate.code, kind);
    return { ...candidate, kind, currency, market: currency === "CNH" ? "domestic" : "overseas", accountId };
  });

  if (!isBrokerHoldingList && (labeledCode || labeledName)) {
    candidates.push({
      kind: globalKind,
      currency: globalCurrency,
      market: globalCurrency === "CNH" ? "domestic" : "overseas",
      accountId,
      category: valueAfterLabel(["资产分类", "一级分类"]),
      subcategory: valueAfterLabel(["资产分类二级", "二级分类"]),
      tertiaryCategory: valueAfterLabel(["资产三级分类", "三级分类"]),
      positionCategory: valueAfterLabel(["仓位分类"]),
      name: labeledName || extractOcrAssetName(text, labeledCode),
      code: labeledCode,
      costPrice: numberAfterLabel(["持仓成本", "平均成本", "成本价", "成本单价"]),
      shares: numberAfterLabel(["持仓数量", "持有数量", "持有份额", "基金份额", "股票数量", "数量", "份额"]),
      pnl: numberAfterLabel(["浮动盈亏", "持仓盈亏", "累计盈亏", "盈亏", "盈亏额"]),
      currentValue: numberAfterLabel(["当前市值", "持仓市值", "当前价值", "市值"]),
      currentPrice: numberAfterLabel(["现价", "最新价", "当前价格", "市价", "最新价格"]),
      avgBuyPrice: numberAfterLabel(["买入均价", "持仓均价", "平均买入价", "成本均价"]),
      holdingDays: numberAfterLabel(["持仓天数", "持股天数", "天数"]),
      positionWeight: numberAfterLabel(["个股仓位", "仓位占比", "仓位", "占比"]),
      totalFees: numberAfterLabel(["税费合计", "税费", "费用合计", "总费用", "手续费合计"]),
      todayPnl: numberAfterLabel(["当日盈亏", "当日参考盈亏", "今日盈亏", "当天盈亏"]),
      source: "带标签字段",
      confidence: 0.92,
    });
  }

  if (!isBrokerHoldingList) lines.forEach((line) => {
    if (/买入|卖出|申购|赎回|交易日期|成交日期/i.test(line) || isFinanceOcrHeaderLine(line)) return;
    const codes = extractFinanceCodes(line);
    codes.forEach((code) => {
      const name = extractOcrAssetName(line, code);
      if (!name && /^[A-Z]{1,6}$/.test(code) && !/(股票|基金|证券|持仓|市值|成本|数量|盈亏)/.test(line)) return;
      const numbers = inferFinanceOcrNumbers(line, code);
      const kind = inferFinanceOcrKind(line, code);
      const currency = inferFinanceOcrCurrency(line, code, kind);
      candidates.push({
        kind,
        currency,
        market: currency === "CNH" ? "domestic" : "overseas",
        accountId,
        name,
        code,
        ...numbers,
        source: line,
        confidence: name ? 0.82 : 0.62,
      });
    });
  });

  let assets = mergeFinanceOcrCandidates(candidates).map((asset) => completeFinanceOcrAssetDefaults(asset));
  const transactions = parseFinanceTransactions(lines, valueAfterLabel, numberAfterLabel);
  assets = assets.filter((asset) => asset.code || asset.name);
  const unassignedTransactions = associateFinanceOcrTransactions(assets, transactions);
  return {
    assets,
    transactions,
    unassignedTransactions,
    rawText: text,
    ...(assets[0] || {}),
  };
}

function financeLookupAssetPatch(item) {
  const kindMap = {
    AStock: "stock", HK: "stock", UsStock: "stock", UsADR: "stock",
    OTCFUND: "fund", ETF: "fund", Index: "custom", Commodity: "commodity",
    Futures: "futures", Options: "options", Crypto: "crypto",
  };
  const kind = kindMap[item.classify] || inferFinanceOcrKind(`${item.name || ""} ${item.typeName || ""}`, item.code);
  const isDomestic = ["1", "2", "domestic"].includes(String(item.marketType)) || item.classify === "AStock";
  const isHK = item.classify === "HK" || String(item.mktNum) === "116";
  const isUS = item.classify === "UsStock" || item.classify === "UsADR" || ["105", "106", "107"].includes(String(item.mktNum));
  const currency = isHK ? "HKD" : isUS || !isDomestic ? "USD" : "CNH";
  let subcategory = financeSubcategoryOptions(kind)[0];
  if (kind === "stock") subcategory = isHK ? "港股" : isUS ? "美股" : "A股";
  if (kind === "fund") subcategory = item.classify === "ETF" ? "场内基金" : "场外基金";
  if (kind === "commodity") {
    if (["XAG"].includes(String(item.code).toUpperCase())) subcategory = "白银";
    else if (["WTI", "BRENT"].includes(String(item.code).toUpperCase())) subcategory = "原油";
    else subcategory = "黄金";
  }
  if (kind === "crypto") {
    if (String(item.code).toUpperCase() === "BTC") subcategory = "比特币";
    else if (String(item.code).toUpperCase() === "ETH") subcategory = "以太坊";
    else if (["USDT", "USDC"].includes(String(item.code).toUpperCase())) subcategory = "稳定币";
  }
  return {
    kind,
    market: isDomestic ? "domestic" : "overseas",
    currency,
    name: item.name || "",
    code: normalizeFinanceOcrCode(item.code),
    subcategory,
    tertiaryCategory: kind === "stock" && isDomestic ? inferBoardFromCode(item.code) || "未分类" : "未分类",
  };
}

async function enrichFinanceOcrResult(result, onProgress = () => {}) {
  const assets = result.assets || [];
  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index];
    const query = asset.name || asset.code;
    if (!query) continue;
    
    try {
      // 根据名称搜索证券资料，获取候选列表供用户选择
      const response = await apiRequest(`/finance/lookup?q=${encodeURIComponent(query)}`);
      const items = response.items || [];
      
      // 保存搜索结果到资产对象中，供用户选择
      assets[index] = completeFinanceOcrAssetDefaults({
        ...asset,
        lookupCandidates: items.slice(0, 5), // 只保留前5个候选
        source: `${asset.source || "图片识别"} / 已搜索证券资料`,
        confidence: Math.max(asset.confidence || 0, 0.96),
      });
    } catch (error) {
      console.warn(`证券资料 ${query} 搜索失败`, error);
      // 即使搜索失败，也保留OCR识别的结果
      assets[index] = completeFinanceOcrAssetDefaults(asset);
    }
    
    onProgress(Math.min(index + 1, assets.length), assets.length);
  }
  
  result.assets = assets;
  result.unassignedTransactions = associateFinanceOcrTransactions(assets, result.transactions || []);
  return result;
}

function applyFinanceOcrResult(result) {
  const form = document.querySelector("#financeAssetForm");
  const fields = form.elements;
  const filled = [];
  if (result.kind) {
    fields.kind.value = result.kind;
    handleFinanceKindChange();
    filled.push("资产类型");
  }
  if (result.market) {
    fields.market.value = result.market;
    updateFinanceCurrencyOptions(result.currency);
    filled.push("市场");
  }
  if (result.currency) {
    fields.currency.value = result.currency;
    fields.market.value = result.currency === "CNH" ? "domestic" : "overseas";
    updateFinanceCurrencyOptions(result.currency);
    syncFinanceSubcategoryByCurrency(result.currency);
    updateFinanceCurrencyRate();
    filled.push("货币单位");
  }
  if (result.accountId && Array.from(fields.accountId.options).some((option) => option.value === result.accountId)) {
    fields.accountId.value = result.accountId;
    filled.push("所属账户");
  }
  if (result.category && Array.from(fields.category.options).some((option) => option.value === result.category)) {
    fields.category.value = result.category;
    filled.push("资产分类");
  }
  if (result.subcategory && Array.from(fields.subcategory.options).some((option) => option.value === result.subcategory)) {
    fields.subcategory.value = result.subcategory;
    updateFinanceTertiaryCategories(result.tertiaryCategory);
    filled.push("二级分类");
  }
  if (result.tertiaryCategory) {
    updateFinanceTertiaryCategories(result.tertiaryCategory);
    filled.push("三级分类");
  }
  if (result.positionGroup && Array.from(fields.positionGroup.options).some((option) => option.value === result.positionGroup)) {
    fields.positionGroup.value = result.positionGroup;
    updateFinancePositionCategories(result.positionCategory);
    filled.push("仓位分组");
  }
  if (result.positionCategory && Array.from(fields.positionCategory.options).some((option) => option.value === result.positionCategory)) {
    fields.positionCategory.value = result.positionCategory;
    filled.push("仓位分类");
  }
  [["name", "资产名称"], ["code", "资产代码"]].forEach(([field, label]) => {
    if (!result[field]) return;
    fields[field].value = result[field];
    filled.push(label);
  });
  [["costPrice", "持仓成本"], ["shares", "份额/数量"], ["pnl", "浮动盈亏"],
   ["currentPrice", "现价"], ["avgBuyPrice", "买入均价"], ["holdingDays", "持仓天数"],
   ["positionWeight", "个股仓位"], ["totalFees", "税费合计"], ["todayPnl", "当日参考盈亏"]].forEach(([field, label]) => {
    if (result[field] === null || !Number.isFinite(result[field])) return;
    fields[field].value = result[field];
    filled.push(label);
  });
  updateFinancePnlPercents(form);
  updateFinanceAssetPreview();
  saveFinanceAssetDraftFromForm();
  return filled;
}

function renderFinanceOcrTransactionPreview() {
  const container = document.querySelector("#financeOcrTransactions");
  if (!container) return;
  container.hidden = pendingFinanceOcrTransactions.length === 0;
  container.innerHTML = pendingFinanceOcrTransactions.length
    ? `<strong>待同步交易明细（${pendingFinanceOcrTransactions.length} 笔）</strong>
      <div class="ocr-transaction-list">${pendingFinanceOcrTransactions.map((transaction) => `
        <span>${transaction.date} · ${transaction.direction === "buy" ? "买入" : "卖出"} · ${transaction.shares} × ${transaction.price} · ${transaction.amount.toFixed(2)}</span>
      `).join("")}</div>`
    : "";
}

function handleFinanceKindChange() {
  const kind = document.querySelector("#financeAssetForm [name='kind']").value;
  updateFinanceAssetCategories();
  updateFinanceSubcategories();
  updateFinanceTertiaryCategories();
  updateFinancePositionGroups();
  updateFinancePositionCategories();
  toggleStockFormFields(kind);
}

// ─── Finance code lookup (东方财富 API) ───
async function fetchCodeLookup(query) {
  const dropdown = document.querySelector("#codeLookupDropdown");
  const status = document.querySelector("#codeLookupStatus");
  if (!dropdown) return;
  if (status) { status.textContent = "查询中…"; status.className = "code-lookup-status loading"; }
  try {
    const res = await apiRequest(`/finance/lookup?q=${encodeURIComponent(query)}`);
    const items = res.items || [];
    if (!items.length) {
      dropdown.hidden = true;
      if (status) { status.textContent = ""; status.className = "code-lookup-status"; }
      return;
    }
    dropdown.innerHTML = items.map((it, idx) => {
      const priceCls = it.changePct > 0 ? "up" : it.changePct < 0 ? "down" : "";
      const isHK = it.classify === "HK" || it.mktNum === "116";
      const isUS = it.classify === "UsStock" || it.classify === "UsADR" || ["105", "106", "107"].includes(it.mktNum);
      const currencySymbol = isHK ? "HK$" : isUS ? "$" : "¥";
      const priceTxt = it.price != null ? `${currencySymbol}${it.price}` : "";
      const chgTxt = it.changePct != null ? `${it.changePct > 0 ? "+" : ""}${it.changePct}%` : "";
      return `<div class="code-lookup-item" data-idx="${idx}" data-code="${escapeAttr(it.code)}" data-name="${escapeAttr(it.name)}" data-classify="${escapeAttr(it.classify)}" data-typename="${escapeAttr(it.typeName)}" data-markettype="${escapeAttr(it.marketType)}" data-mktnum="${escapeAttr(it.mktNum)}" data-price="${it.price ?? ""}">
        <div class="code-lookup-item-head">
          <span class="code-lookup-item-code">${it.code}</span>
          <span class="code-lookup-item-type">${it.typeName || it.classify}</span>
        </div>
        <div class="code-lookup-item-name">${it.name}</div>
        <div class="code-lookup-item-price">
          <span>${priceTxt}</span>
          <span class="${priceCls}">${chgTxt}</span>
        </div>
      </div>`;
    }).join("");
    dropdown.hidden = false;
    dropdown.querySelectorAll(".code-lookup-item").forEach((el) => {
      el.addEventListener("mousedown", (e) => {
        e.preventDefault();
        applyCodeLookupResult({
          code: el.dataset.code,
          name: el.dataset.name,
          classify: el.dataset.classify,
          typeName: el.dataset.typename,
          marketType: el.dataset.markettype,
          mktNum: el.dataset.mktnum,
          price: el.dataset.price ? Number(el.dataset.price) : null,
        });
      });
    });
    if (status) { status.textContent = `找到 ${items.length} 个匹配项`; status.className = "code-lookup-status"; }
  } catch (err) {
    dropdown.hidden = true;
    if (status) { status.textContent = "查询失败"; status.className = "code-lookup-status error"; }
  }
}

function hideCodeLookupDropdown() {
  const dropdown = document.querySelector("#codeLookupDropdown");
  if (dropdown) dropdown.hidden = true;
}

function applyCodeLookupResult(item) {
  const form = document.querySelector("#financeAssetForm");
  const fields = form.elements;
  const patch = financeLookupAssetPatch(item);
  fields.code.value = patch.code;
  fields.name.value = patch.name;
  fields.kind.value = patch.kind;
  handleFinanceKindChange();
  fields.market.value = patch.market;
  updateFinanceCurrencyOptions(patch.currency);
  const subOptions = Array.from(fields.subcategory.options).map((option) => option.value);
  if (subOptions.includes(patch.subcategory)) fields.subcategory.value = patch.subcategory;
  updateFinanceTertiaryCategories(patch.tertiaryCategory);
  // Fill price if available
  if (item.price != null && Number.isFinite(item.price)) {
    fields.costPrice.value = item.price;
  }
  updateFinanceAssetPreview();
  saveFinanceAssetDraftFromForm();
  hideCodeLookupDropdown();
  const status = document.querySelector("#codeLookupStatus");
  if (status) { status.textContent = `已选择 ${item.name} (${item.code})`; status.className = "code-lookup-status"; }
}

function updateFinanceAssetCategories(preferred = "") {
  const form = document.querySelector("#financeAssetForm");
  const fields = form.elements;
  const categories = financeCategoryOptions(fields.kind.value, preferred);
  fields.category.innerHTML = categories.map((category) => `<option value="${escapeAttr(category)}">${category}</option>`).join("");
  fields.category.value = preferred && categories.includes(preferred) ? preferred : inferFinanceAssetClass(fields.kind.value);
  if (!categories.includes(fields.category.value)) fields.category.value = categories[0];
}

function updateFinanceSubcategories(preferred = "") {
  const form = document.querySelector("#financeAssetForm");
  const fields = form.elements;
  const options = financeSubcategoryOptions(fields.kind.value);
  fields.subcategory.innerHTML = options.map((item) => `<option value="${escapeAttr(item)}">${item}</option>`).join("");
  fields.subcategory.value = preferred && options.includes(preferred) ? preferred : options[0];
}

function syncFinanceSubcategoryByCurrency(currency) {
  const form = document.querySelector("#financeAssetForm");
  const fields = form.elements;
  const target = ({ CNH: "A股", HKD: "港股", USD: "美股" })[currency];
  if (!target) return;
  const options = Array.from(fields.subcategory.options).map((option) => option.value);
  if (!options.includes(target)) return;
  fields.subcategory.value = target;
  updateFinanceTertiaryCategories();
}

function updateFinanceTertiaryCategories(preferred = "") {
  const form = document.querySelector("#financeAssetForm");
  const fields = form.elements;
  const options = financeTertiaryOptions(fields.kind.value, fields.subcategory.value, preferred);
  fields.tertiaryCategory.innerHTML = options.map((item) => `<option value="${escapeAttr(item)}">${item}</option>`).join("");
  fields.tertiaryCategory.value = preferred && options.includes(preferred) ? preferred : options[0];
}

function updateFinancePositionGroups(preferred = "") {
  const form = document.querySelector("#financeAssetForm");
  const fields = form.elements;
  const groups = financePositionGroupOptions(fields.kind.value);
  fields.positionGroup.innerHTML = groups.map((group) => `<option value="${group}">${financePositionGroupLabel(group)}</option>`).join("");
  fields.positionGroup.value = normalizeFinancePositionGroup(preferred || fields.positionGroup.value, fields.kind.value);
}

function updateFinancePositionCategories(preferred = "") {
  const form = document.querySelector("#financeAssetForm");
  const fields = form.elements;
  fields.positionGroup.value = normalizeFinancePositionGroup(fields.positionGroup.value, fields.kind.value);
  const options = financePositionCategoryOptions(fields.kind.value, fields.positionGroup.value);
  fields.positionCategory.innerHTML = options.map((item) => `<option value="${escapeAttr(item)}">${item}</option>`).join("");
  fields.positionCategory.value = preferred && options.includes(preferred) ? preferred : options[0];
}

function updateFinanceCurrencyOptions(preferred = "") {
  const form = document.querySelector("#financeAssetForm");
  const fields = form.elements;
  const options = financeCurrencyOptions();
  fields.currency.innerHTML = options.map((item) => `<option value="${item}">${item}</option>`).join("");
  const normalized = normalizeFinanceCurrency(preferred || fields.currency.value, fields.market.value);
  fields.currency.value = fields.market.value === "domestic" ? "CNH" : normalized === "CNH" ? "HKD" : normalized;
  updateFinanceCurrencyRate();
}

function updateFinanceCurrencyRate() {
  const rateEl = document.querySelector("#financeCurrencyRate");
  if (!rateEl) return;
  const form = document.querySelector("#financeAssetForm");
  const currency = form?.elements?.currency?.value;
  if (!currency || currency === "CNH") {
    rateEl.textContent = "";
    rateEl.hidden = true;
    return;
  }
  const rate = state.rates[currency];
  if (rate == null) {
    rateEl.textContent = "";
    rateEl.hidden = true;
    return;
  }
  rateEl.hidden = false;
  rateEl.textContent = `当前汇率: 1 ${currency} ≈ ${rate} CNY`;
}

function handleFinanceCurrencyChange() {
  const form = document.querySelector("#financeAssetForm");
  const fields = form.elements;
  const currency = normalizeFinanceCurrency(fields.currency.value, fields.market.value);
  if (currency !== "CNH") {
    fields.market.value = "overseas";
    updateFinanceCurrencyOptions(currency);
  } else {
    fields.market.value = "domestic";
    updateFinanceCurrencyOptions("CNH");
  }
  syncFinanceSubcategoryByCurrency(fields.currency.value);
  updateFinanceCurrencyRate();
  handleFinanceAssetFormChange();
}

function openFinanceTertiaryDialog() {
  const form = document.querySelector("#financeAssetForm");
  const fields = form.elements;
  const kind = fields.kind.value;
  const subcategory = fields.subcategory.value;
  document.querySelector("#financeTertiaryForm").reset();
  document.querySelector("#financeTertiaryScope").textContent = `当前范围：${financeKindLabel(kind)} / ${subcategory}`;
  renderFinanceTertiaryManager();
  document.querySelector("#financeTertiaryDialog").showModal();
}

function renderFinanceTertiaryManager() {
  const form = document.querySelector("#financeAssetForm");
  const fields = form.elements;
  const key = financeTertiaryScopeKey(fields.kind.value, fields.subcategory.value);
  const items = state.customCategories.finance.tertiaryByScope[key] || [];
  document.querySelector("#financeTertiaryList").innerHTML = items.length
    ? items.map((item) => `<span class="option-chip">
        ${item}
        <button type="button" data-action="delete-finance-tertiary" data-name="${escapeAttr(item)}" title="删除">×</button>
      </span>`).join("")
    : `<p class="muted">当前类型和二级分类下暂无自定义三级分类。</p>`;
  document.querySelectorAll("[data-action='delete-finance-tertiary']").forEach((button) => button.addEventListener("click", () => {
    deleteFinanceTertiary(button.dataset.name);
  }));
}

function handleFinanceTertiarySubmit(event) {
  event.preventDefault();
  const assetForm = document.querySelector("#financeAssetForm");
  const assetFields = assetForm.elements;
  const input = event.currentTarget.elements.name;
  const name = input.value.trim();
  if (!name || name === "未分类") return;
  const key = financeTertiaryScopeKey(assetFields.kind.value, assetFields.subcategory.value);
  const items = state.customCategories.finance.tertiaryByScope[key] || [];
  state.customCategories.finance.tertiaryByScope[key] = [...new Set([...items, name])];
  saveState();
  updateFinanceTertiaryCategories(name);
  input.value = "";
  renderFinanceTertiaryManager();
}

function deleteFinanceTertiary(name) {
  const assetForm = document.querySelector("#financeAssetForm");
  const assetFields = assetForm.elements;
  const key = financeTertiaryScopeKey(assetFields.kind.value, assetFields.subcategory.value);
  state.customCategories.finance.tertiaryByScope[key] = (state.customCategories.finance.tertiaryByScope[key] || []).filter((item) => item !== name);
  if (assetFields.tertiaryCategory.value === name) updateFinanceTertiaryCategories();
  saveState();
  renderFinanceTertiaryManager();
}

function updateFinanceAssetPreview() {
  const form = document.querySelector("#financeAssetForm");
  if (!form) return;
  const fields = form.elements;
  const value = (Number(fields.costPrice.value) || 0) * (Number(fields.shares.value) || 0) + (Number(fields.pnl.value) || 0);
  fields.currentValue.value = value ? value.toFixed(3) : "";
}

function handleFinanceAssetFormChange() {
  const form = document.querySelector("#financeAssetForm");
  if (form) updateFinancePnlPercents(form);
  updateFinanceAssetPreview();
  if (!form?.elements || form.elements.assetId.value) return;
  saveFinanceAssetDraftFromForm();
}

function saveFinanceAssetDraftFromForm() {
  const form = document.querySelector("#financeAssetForm");
  if (!form?.elements) return;
  const data = Object.fromEntries(new FormData(form));
  const kind = normalizeFinanceKind(data.kind);
  if (!state.financeAssetDrafts) state.financeAssetDrafts = {};
  state.financeAssetDrafts[kind] = {
    kind: normalizeFinanceKind(data.kind),
    accountId: data.accountId,
    category: data.category,
    subcategory: data.subcategory,
    tertiaryCategory: data.tertiaryCategory,
    positionGroup: normalizeFinancePositionGroup(data.positionGroup, data.kind),
    positionCategory: data.positionCategory,
    market: data.market,
    currency: normalizeFinanceCurrency(data.currency, data.market),
    name: String(data.name || "").trim(),
    code: String(data.code || "").trim(),
    costPrice: data.costPrice,
    shares: data.shares,
    pnl: data.pnl,
    currentPrice: data.currentPrice,
    avgBuyPrice: data.avgBuyPrice,
    holdingDays: data.holdingDays,
    positionWeight: data.positionWeight,
    totalFees: data.totalFees,
    pnlPercent: data.pnlPercent,
    todayPnl: data.todayPnl,
    todayPnlPercent: data.todayPnlPercent,
  };
  saveState();
}

function handleFinanceAssetSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  const id = Number(data.assetId) || Date.now();
  const existingAsset = state.financeAssets.find((item) => item.id === id);
  const transactions = [
    ...(existingAsset?.transactions || []),
    ...dedupeFinanceTransactions(pendingFinanceOcrConfirmed ? pendingFinanceOcrTransactions : [], existingAsset?.transactions || []),
  ];
  const payload = {
    id,
    kind: normalizeFinanceKind(data.kind),
    accountId: data.accountId,
    category: data.category,
    subcategory: data.subcategory,
    tertiaryCategory: data.tertiaryCategory,
    positionGroup: normalizeFinancePositionGroup(data.positionGroup, data.kind),
    positionCategory: data.positionCategory,
    market: data.market,
    currency: normalizeFinanceCurrency(data.currency, data.market),
    name: String(data.name || "").trim(),
    code: String(data.code || "").trim(),
    costPrice: roundFinanceOcrNumber(data.costPrice) || 0,
    shares: roundFinanceOcrNumber(data.shares) || 0,
    pnl: roundFinanceOcrNumber(data.pnl) || 0,
    currentPrice: roundFinanceOcrNumber(data.currentPrice) || 0,
    avgBuyPrice: roundFinanceOcrNumber(data.avgBuyPrice) || 0,
    holdingDays: Number(data.holdingDays) || 0,
    positionWeight: roundFinanceOcrNumber(data.positionWeight) || 0,
    totalFees: roundFinanceOcrNumber(data.totalFees) || 0,
    pnlPercent: roundFinanceOcrNumber(data.pnlPercent) || 0,
    todayPnl: roundFinanceOcrNumber(data.todayPnl) || 0,
    todayPnlPercent: roundFinanceOcrNumber(data.todayPnlPercent) || 0,
    transactions,
  };
  if (
    !payload.market ||
    !payload.kind ||
    !payload.accountId ||
    !payload.category ||
    !payload.subcategory ||
    !payload.positionGroup ||
    !payload.positionCategory ||
    !payload.currency ||
    !payload.name ||
    (payload.kind === "stock" && (!payload.code || payload.costPrice <= 0 || payload.shares <= 0)) ||
    !Number.isFinite(payload.pnl)
  ) return;
  const index = state.financeAssets.findIndex((item) => item.id === id);
  if (index >= 0) {
    state.financeAssets[index] = payload;
  } else {
    state.financeAssets.unshift(payload);
  }
  const kind = payload.kind || "stock";
  if (!state.financeAssetDrafts) state.financeAssetDrafts = {};
  state.financeAssetDrafts[kind] = { ...payload };
  delete state.financeAssetDrafts[kind].id;
  delete state.financeAssetDrafts[kind].transactions;
  pendingFinanceOcrTransactions = [];
  pendingFinanceOcrConfirmed = false;
  const scrollPosition = captureFinanceScrollPosition();
  syncAssetClassValuesFromFinance();
  saveState();
  document.querySelector("#financeAssetDialog").close();
  render();
  restoreFinanceScrollPosition(scrollPosition);
  // 编辑保存后，如果明细弹窗正在查看同一资产，立刻刷新内容
  const holdingDialog = document.querySelector("#holdingDetailDialog");
  if (holdingDialog?.open) {
    const dialogAssetId = Number(holdingDialog.dataset.assetId);
    if (dialogAssetId === id) {
      const freshAsset = (state.financeAssets || []).find((a) => a.id === id);
      if (freshAsset) {
        document.querySelector("#holdingDetailTitle").textContent = `${freshAsset.name} (${freshAsset.code})`;
        const activeTab = document.querySelector(".holding-tab.active");
        renderHoldingTabContent(activeTab?.dataset.tab || "holding", id);
      }
    }
  }
}

function updateDebtPreview() {
  const form = document.querySelector("#debtForm");
  if (!form) return;
  const debt = {
    principal: Number(form.principal.value) || 0,
    annualRate: Number(form.annualRate.value) || 0,
    startDate: form.startDate.value,
    dueDate: form.dueDate.value,
    repaymentMethod: form.repaymentMethod.value,
    paidAmount: Number(form.paidAmount.value) || 0,
  };
  const plan = debtPlan(debt);
  const remaining = debtRemainingAmount(debt, plan);
  form.amount.value = plan.totalAmount ? plan.totalAmount.toFixed(2) : "";
  form.remainingAmount.value = remaining.toFixed(2);
  document.querySelector("#debtCalcPreview").innerHTML = recordsRows([
    ["期数", `${plan.months} 期`, "还款方式", repaymentMethodLabel(debt.repaymentMethod)],
    ["总金额", money(plan.totalAmount), "总利息", money(plan.totalInterest)],
    ["每期金额", money(plan.monthlyPayment), "剩余金额", money(remaining)],
  ]);
}

function openRecordDialog(record = null) {
  const form = document.querySelector("#recordForm");
  form.recordId.value = record?.id || "";
  form.type.value = record?.type || "income";
  form.amount.value = record?.amount || "";
  updateRecordCategoryOptions(record?.category);
  form.accountId.innerHTML = state.accounts.map((a) => `<option value="${a.id}">${a.name}</option>`).join("");
  form.accountId.value = record?.accountId || state.accounts[0]?.id || "";
  form.date.value = record?.date || today;
  form.recorder.value = record?.recorder || state.user.name || "本人";
  updateRecorderOptions();
  updateRecordTagOptions(record?.tag || "");
  form.note.value = record?.note || "";
  form.querySelector("h2").textContent = record ? "编辑流水" : "新增流水";
  document.querySelector("#recordDialog").showModal();
}

function updateRecordCategoryOptions(preferred = "") {
  const form = document.querySelector("#recordForm");
  if (!form) return;
  let categories = currentModule === "finance"
    ? ["理财收入", "理财亏损"]
    : getRecordCategories(form.type.value);
  if (preferred && !categories.includes(preferred)) categories = [preferred, ...categories];
  const selected = preferred && categories.includes(preferred) ? preferred : categories[0] || "";
  form.category.innerHTML = categories.map((category) => `<option value="${escapeAttr(category)}">${category}</option>`).join("");
  form.category.value = selected;
  updateRecordTagOptions();
}

function getRecordCategories(type) {
  return [...new Set([...defaultRecordCategories(type), ...(state.customCategories.records?.[type] || [])])];
}

function addRecordCategory() {
  openRecordOptionDialog("category");
}

function defaultRecordCategories(type) {
  return {
    income: ["劳动收入", "其他收入"],
    expense: ["日常消费", "餐饮消费", "交通出行", "住房支出", "偿债支出", "其他支出"],
    transfer: ["跨币种转账", "账户互转"],
  }[type] || [];
}

function updateRecordTagOptions(preferred = "") {
  const form = document.querySelector("#recordForm");
  if (!form) return;
  const category = form.category.value.trim();
  const tags = state.recordTags.tagsByCategory[category] || [];
  const lastTag = state.recordTags.lastByCategory[category] || "";
  const selected = preferred || lastTag || tags[0] || "";
  const options = selected && !tags.includes(selected) ? [selected, ...tags] : tags;
  form.tag.innerHTML = [
    `<option value="">无标签</option>`,
    ...options.map((tag) => `<option value="${escapeAttr(tag)}">${tag}</option>`),
  ].join("");
  form.tag.value = selected;
}

function addRecordTag() {
  openRecordOptionDialog("tag");
}

function saveRecordTag(category, tag) {
  if (!category || !tag) return;
  const tags = state.recordTags.tagsByCategory[category] || [];
  state.recordTags.tagsByCategory[category] = [...new Set([tag, ...tags])];
  state.recordTags.lastByCategory[category] = tag;
}

function openRecordOptionDialog(kind) {
  const optionForm = document.querySelector("#recordOptionForm");
  optionForm.kind.value = kind;
  optionForm.name.value = "";
  optionForm.querySelector("h2").textContent = kind === "category" ? "增加分类" : "添加标签";
  renderRecordOptionManager(kind);
  document.querySelector("#recordOptionDialog").showModal();
  optionForm.name.focus();
}

function renderRecordOptionManager(kind) {
  const form = document.querySelector("#recordForm");
  const type = form.type.value;
  const category = form.category.value.trim();
  const customCategories = state.customCategories.records?.[type] || [];
  const items = kind === "category"
    ? getRecordCategories(type).map((name) => ({ name, removable: customCategories.includes(name) }))
    : (state.recordTags.tagsByCategory[category] || []).map((name) => ({ name, removable: true }));
  document.querySelector("#recordOptionScope").textContent = kind === "category"
    ? `当前类型：${typeLabel(type)}。系统分类不可删除，自定义分类可删除。`
    : `当前一级分类：${category || "未选择"}。标签可新增、可删除。`;
  document.querySelector("#recordOptionList").innerHTML = items.length
    ? items.map((item) => `<span class="option-chip ${item.removable ? "" : "locked"}">
        ${item.name}
        ${item.removable ? `<button type="button" data-action="delete-record-option" data-kind="${kind}" data-name="${escapeAttr(item.name)}" title="删除">×</button>` : ""}
      </span>`).join("")
    : `<p class="muted">${kind === "category" ? "暂无分类" : "暂无标签"}</p>`;
  document.querySelectorAll("[data-action='delete-record-option']").forEach((button) => button.addEventListener("click", () => deleteRecordOption(button.dataset.kind, button.dataset.name)));
}

function handleRecordOptionSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const kind = form.kind.value;
  const name = form.name.value.trim();
  if (!name) return;
  const recordForm = document.querySelector("#recordForm");
  if (kind === "category") {
    saveCustomRecordCategory(name, recordForm.type.value);
    updateRecordCategoryOptions(name);
  } else {
    saveRecordTag(recordForm.category.value.trim(), name);
    updateRecordTagOptions(name);
  }
  form.name.value = "";
  renderRecordOptionManager(kind);
  saveState();
}

function deleteRecordOption(kind, name) {
  const form = document.querySelector("#recordForm");
  if (kind === "category") {
    const type = form.type.value;
    state.customCategories.records[type] = (state.customCategories.records[type] || []).filter((item) => item !== name);
    updateRecordCategoryOptions();
  } else {
    const category = form.category.value.trim();
    state.recordTags.tagsByCategory[category] = (state.recordTags.tagsByCategory[category] || []).filter((item) => item !== name);
    if (state.recordTags.lastByCategory[category] === name) state.recordTags.lastByCategory[category] = "";
    updateRecordTagOptions();
  }
  renderRecordOptionManager(kind);
  saveState();
}

function updateRecorderOptions() {
  const form = document.querySelector("#recordForm");
  if (!form) return;
  const current = form.recorder.value.trim();
  const names = [...new Set([current, state.user.name, "本人", ...(state.recorders || [])].filter(Boolean))];
  document.querySelector("#recordRecorderOptions").innerHTML = names.map((name) => `<button type="button" data-action="pick-recorder" data-recorder="${escapeAttr(name)}">${name}</button>`).join("");
  document.querySelectorAll("[data-action='pick-recorder']").forEach((button) => button.addEventListener("click", () => {
    form.recorder.value = button.dataset.recorder;
    updateRecorderOptions();
  }));
}

function saveRecorder(name) {
  const recorder = String(name || "").trim();
  if (!recorder) return;
  state.recorders = [...new Set([recorder, ...(state.recorders || [])])].slice(0, 12);
}

function saveCustomRecordCategory(category, type) {
  if (currentModule === "finance") return;
  if (!state.customCategories.records[type]) state.customCategories.records[type] = [];
  if (defaultRecordCategories(type).includes(category)) return;
  state.customCategories.records[type] = [...new Set([...(state.customCategories.records[type] || []), category])];
}

function exportCsv() {
  const header = "日期,类型,分类,账户,金额,币种,备注\n";
  const rows = filteredRecords().map((r) => [r.date, typeLabel(r.type), `${r.category}/${r.sub}`, r.accountId, r.amount, r.currency, r.note].join(",")).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "资产报表.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function handleAvatarUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    state.user.avatar = reader.result;
    saveState();
    saveProfileToAuth();
    render();
  });
  reader.readAsDataURL(file);
}

// Wait for DOM to be ready before initializing
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init().catch((error) => {
      console.error("应用启动失败", error);
      render();
    });
  });
} else {
  // DOM is already ready
  init().catch((error) => {
    console.error("应用启动失败", error);
    render();
  });
}
