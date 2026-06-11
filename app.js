const modules = [
  ["overview", "资产总览", "⌂"],
  ["records", "收支分析", "＋"],
  ["finance", "理财模块", "财"],
  ["debts", "债务模块", "债"],
  ["classes", "资产分类", "☷"],
  ["analysis", "统计分析", "◇"],
  ["tools", "辅助工具", "⚙"],
  ["strategies", "业务设计", "◎"],
  ["accounts", "账户管理", "◫"],
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
    { id: "cashClass", name: "现金类", children: ["活期", "货币基金"], visible: true, value: 1641827, openingValue: 1200000, targetValue: 12000000, income: 36300, expense: 28200, laborIncome: 106300, color: "#539f8d" },
    { id: "equity", name: "权益类", children: ["股票", "基金"], visible: true, value: 1276482, openingValue: 900000, targetValue: 18000000, income: 172419, expense: 4600, laborIncome: 0, color: "#b9d765" },
    { id: "debt", name: "债权类", children: ["债券", "定期"], visible: true, value: 202912, openingValue: 180000, targetValue: 8000000, income: 12600, expense: 18000, laborIncome: 0, color: "#f5a623" },
    { id: "commodity", name: "商品类", children: ["黄金"], visible: true, value: 74375, openingValue: 62000, targetValue: 5000000, income: 6800, expense: 0, laborIncome: 0, color: "#ffc72c" },
    { id: "crypto", name: "加密类", children: ["BTC", "ETH"], visible: true, value: 364227.7, openingValue: 110000, targetValue: 7000000, income: 27400, expense: 0, laborIncome: 0, color: "#ff7f50" },
    { id: "incomeClass", name: "吃息类", children: ["红利股票", "债券基金", "股息"], visible: true, value: 0, openingValue: 0, targetValue: 3000000, income: 0, expense: 0, laborIncome: 0, color: "#4fb477" },
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
let premiumRows = [];
let premiumLoading = false;
let premiumError = "";
let premiumLoadedAt = 0;
let premiumFetchedAt = "";
let premiumSource = "";
let premiumFilter = "all";
let premiumQuery = "";
let premiumRefreshTimer = null;
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
  loaded.financeAssetDraft = loaded.financeAssetDraft || {};
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
    return { ...item, kind, market, currency, category, subcategory, tertiaryCategory: item.tertiaryCategory || "未分类", positionGroup, positionCategory };
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
  let total = 0;
  while (cursor <= lastDate) {
    total += assets.reduce((sum, asset) => sum + financeAssetDailyProfit(asset, cursor), 0);
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
  document.body.classList.toggle("dark", state.user.theme === "dark");
  renderNav();
  renderFilters();
  bindGlobalActions();
  render();
}

function renderNav() {
  const nav = document.querySelector("#moduleNav");
  nav.innerHTML = modules.map(([id, name, icon]) => `<button data-module="${id}" class="${id === currentModule ? "active" : ""}"><span>${icon}</span>${name}</button>`).join("");
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

function bindGlobalActions() {
  document.querySelector("#moduleNav").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-module]");
    if (!button) return;
    currentModule = button.dataset.module;
    document.querySelector(".shell").scrollTop = 0;
    render();
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
  document.querySelector("#cancelAssetClass").addEventListener("click", () => document.querySelector("#assetClassDialog").close());
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
  document.querySelector(".filters").classList.toggle("is-hidden", ["overview", "profile", "records", "finance", "financeAnalysis", "debts", "tools", "premiumTool"].includes(currentModule));
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
  const safeRows = rows.length ? rows : [{ name: "暂无数据", value: 1, color: "#d9e0dc" }];
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

function overviewDonutCard(title, rows, centerValue, centerLabel) {
  const safeRows = rows.length ? rows : [{ name: "暂无数据", value: 1, color: "#d9e0dc" }];
  const total = overviewTotal(safeRows);
  return `<section class="overview-card overview-chart-card">
    <h2>${title}</h2>
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
    ${overviewLegend([{ name: "原有总资产", color: "#ff7f50" }, { name: "现有总资产", color: "#b9d765" }])}
    <svg class="asset-growth-line" viewBox="0 0 ${width} ${height}" role="img" aria-label="资产增长表">
      ${[0, 1, 2, 3, 4].map((line) => `<line x1="${padding}" y1="${padding + line * 52}" x2="${width - padding}" y2="${padding + line * 52}" />`).join("")}
      <polyline class="original" points="${originalPoints}" />
      <polyline class="current" points="${currentPoints}" />
      ${rows.map((row, index) => {
        const [ox, oy] = point(row.original, index);
        const [cx, cy] = point(row.current, index);
        return `<text class="original-text" x="${ox}" y="${oy - 8}">${row.original.toFixed(2)}</text><text class="current-text" x="${cx}" y="${cy - 8}">${formatCurrencyNumber(row.current)}</text><text class="axis-text" x="${ox}" y="${height - 12}">${row.date}</text>`;
      }).join("")}
    </svg>
  </section>`;
}

function annualAssetChangeCard(rows) {
  const maxAbs = Math.max(...rows.flatMap((row) => [Math.abs(row.original), Math.abs(row.current), Math.abs(row.growth)]), 1);
  return `<section class="overview-card annual-change-card">
    <h2>年均资产变化</h2>
    ${overviewLegend([{ name: "原有总资产", color: "#ff7f50" }, { name: "现有总资产", color: "#b9d765" }, { name: "增长额", color: "#ffd24a" }])}
    <div class="annual-bars">
      ${rows.map((row) => `<div class="annual-group">
        ${annualBar(row.original, maxAbs, "#ff7f50")}
        ${annualBar(row.current, maxAbs, "#b9d765")}
        ${annualBar(row.growth, maxAbs, "#ffd24a")}
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
      <section class="overview-card asset-value">
        <span>总资产价值</span>
        <strong>${formatPlainNumber(dashboard.totalAssetValue)}</strong>
      </section>
      <section class="overview-card progress-goal">
        <h2>进度目标</h2>
        <div class="progress-ring" style="--progress:${Math.min(dashboard.progressPercent, 100)}%"><strong>${dashboard.progressPercent.toFixed(2)}%</strong></div>
        <p><b>${formatCurrencyNumber(dashboard.totalAssetValue)}</b><span>|</span>${formatCurrencyNumber(dashboard.goalValue)}</p>
      </section>
      <div class="stat-stack">
        <section class="overview-card mini-stat"><span>今年总收入</span><strong>${formatPlainNumber(dashboard.yearIncome)}</strong></section>
        <section class="overview-card mini-stat"><span>今年净收入</span><strong>${formatPlainNumber(dashboard.yearNetIncome)}</strong></section>
      </div>
      <section class="overview-card year-spend"><span>今年总消费</span><strong>${formatPlainNumber(dashboard.yearSpend)}</strong></section>

      ${overviewPieCard("三维增长贡献", dashboard.assetShare)}
      ${overviewPieCard("正向收入贡献", dashboard.incomeShare)}
      ${overviewDonutCard("劳动资产数据比", dashboard.laborShare, formatPlainNumber(dashboard.laborTotal), "总数")}

      ${overviewBarCard("月均收益", "实际收益金额", [{ label: "2025/12/31", value: dashboard.monthIncome }], "money")}
      ${overviewBarCard("月消费", "金额", [{ label: "2025/12/31", value: dashboard.monthSpend }], "signed")}
      ${overviewBarCard("月结余", "剩余金额", [{ label: "2025/12/03", value: dashboard.monthBalance }], "signed")}
      ${overviewBarCard("年收益", "实际收益金额", [{ label: "2025", value: dashboard.yearIncome }], "money")}
      ${overviewBarCard("年消费", "金额", [{ label: "2025", value: dashboard.yearSpend }], "signed")}
      ${overviewBarCard("年结余", "剩余金额", [{ label: "2025/12/03", value: dashboard.yearBalance }], "signed")}

      ${assetGrowthLineCard(dashboard.assetGrowth)}
      ${annualAssetChangeCard(dashboard.annualChange)}
    </div>`;
}

function overviewDashboardData(data) {
  const totalAssetValue = data.totalAssets;
  const goalValue = Math.max(data.initialAssets * 2, totalAssetValue, 1);
  const yearIncome = data.income;
  const yearSpend = -data.expense;
  const yearNetIncome = data.balance;
  const monthIncome = yearIncome / 12;
  const monthSpend = yearSpend / 12;
  const monthBalance = yearNetIncome / 12;
  const contributionRows = [
    { name: "劳动净增值", value: Math.abs(data.laborNet), signed: data.laborNet, color: "#b9d765" },
    { name: "理财净收益", value: Math.abs(data.investNet), signed: data.investNet, color: "#ff7f50" },
    { name: "负债贡献", value: Math.abs(data.debtContribution), signed: data.debtContribution, color: "#ffc72c" },
  ].filter((item) => item.value > 0);
  const incomeShare = [
    { name: "劳动收入", value: Math.max(data.laborNet, 0), color: "#b9d765" },
    { name: "理财收入", value: Math.max(data.investNet, 0), color: "#ff7f50" },
    { name: "负债改善", value: Math.max(data.debtContribution, 0), color: "#ffc72c" },
  ].filter((item) => item.value > 0);
  const laborShare = [
    { name: "劳动净增值", value: Math.abs(data.laborNet), color: "#b9d765" },
    { name: "生活/偿债消耗", value: Math.max(data.expense - Math.abs(data.investNet), 0), color: "#ff7f50" },
  ].filter((item) => item.value > 0);
  return {
    totalAssetValue,
    goalValue,
    progressPercent: totalAssetValue / goalValue * 100,
    yearIncome,
    yearSpend,
    yearNetIncome,
    monthIncome,
    monthSpend,
    monthBalance,
    yearBalance: yearNetIncome,
    assetShare: contributionRows,
    incomeShare,
    laborShare,
    laborTotal: laborShare.reduce((sum, item) => sum + item.value, 0),
    assetGrowth: [
      { date: "期初", original: data.initialAssets, current: data.initialAssets },
      { date: "当前", original: data.initialAssets, current: data.initialAssets + data.annualGrowth },
    ],
    annualChange: [
      { year: "期初", original: data.initialAssets, current: data.initialAssets, growth: 0 },
      { year: "当前", original: data.initialAssets, current: data.initialAssets + data.annualGrowth, growth: data.annualGrowth },
    ],
    liveNetAssets: data.netAssets,
  };
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
  const assets = state.financeAssets || [];
  const assetKinds = ["stock", "fund", "commodity", "futures", "options", "crypto", "cashflow", "custom"];
  const totalValue = assets.reduce((sum, item) => sum + financeAssetValueRmb(item), 0);
  const totalCost = assets.reduce((sum, item) => sum + financeAssetCostRmb(item), 0);
  const totalPnl = assets.reduce((sum, item) => sum + financeAmountToRmb(item.pnl, item.currency), 0);
  return `<div class="finance-mvp">
    <section class="finance-hero">
      <div>
        <p class="eyebrow">统一资产管理 · MVP</p>
        <h2>个人理财资产管理</h2>
        <p class="muted">统一管理股票、基金、商品、期货、期权、加密货币、现金流资产与自定义理财，资产归属账户后自动汇总总资产。</p>
      </div>
      <div class="finance-actions">
        <button class="primary" data-action="new-finance-asset">新增资产</button>
      </div>
    </section>

    <section class="ledger-kpi-grid simple-kpis">
      <article class="ledger-kpi income finance-total-kpi">
        <div class="finance-kpi-title">
          <span>理财总资产（RMB）</span>
          <button type="button" data-action="open-finance-analysis">场内穿透</button>
        </div>
        <strong>${money(totalValue, "CNY")}</strong>
        <p>${assets.length} 个资产 · 已统一折算</p>
      </article>
      ${ledgerKpi("持仓成本（RMB）", totalCost, "按货币汇率统一折算", "neutral", "CNY")}
      ${ledgerKpi("浮动盈亏（RMB）", totalPnl, "外币盈亏同步折算", totalPnl >= 0 ? "income" : "expense", "CNY")}
    </section>

    <section class="finance-card">
      <div class="ledger-web-title"><h3>账户汇总</h3><span>按所属账户自动汇总</span></div>
      ${financeAccountSummary(assets)}
    </section>

    ${assetKinds.map((kind) => `<section class="finance-card">
      <div class="ledger-web-title"><h3>${financeKindSectionTitle(kind)}</h3><span>${financeKindDescription(kind)}</span></div>
      ${financeAssetTable(assets.filter((item) => item.kind === kind), kind)}
    </section>`).join("")}
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

function financeAssetTable(assets, kind) {
  return `<div class="finance-table-wrap"><table class="table finance-asset-table">
    <thead><tr><th>名称</th><th>代码</th><th>资产分类</th><th>二级分类</th><th>三级分类</th><th>仓位分组</th><th>仓位分类</th><th>市场</th><th>货币单位</th><th>所属账户</th><th>持仓成本</th><th>份额/数量</th><th>浮动盈亏</th><th>当前价值</th><th>折合RMB资产</th><th>操作</th></tr></thead>
    <tbody>${assets.map((item) => {
      const account = state.accounts.find((entry) => entry.id === item.accountId);
      return `<tr>
        <td>${item.name}</td>
        <td>${item.code || "-"}</td>
        <td>${item.category || financeKindLabel(kind)}</td>
        <td>${item.subcategory || "-"}</td>
        <td>${item.tertiaryCategory || "未分类"}</td>
        <td>${financePositionGroupLabel(item.positionGroup)}</td>
        <td>${item.positionCategory || financePositionCategoryOptions(kind, item.positionGroup || "core")[0]}</td>
        <td>${financeMarketLabel(item.market)}</td>
        <td>${item.currency || "CNH"}</td>
        <td>${account?.name || "-"}</td>
        <td>${financeLocalMoney(financeAssetCost(item), item.currency)}</td>
        <td>${new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 4 }).format(Number(item.shares) || 0)}</td>
        <td class="${Number(item.pnl) >= 0 ? "income" : "expense"}">${financeLocalMoney(item.pnl, item.currency)}</td>
        <td>${financeLocalMoney(financeAssetValue(item), item.currency)}</td>
        <td>${money(financeAssetValueRmb(item), "CNY")}</td>
        <td class="table-actions">
          <button data-action="edit-finance-asset" data-id="${item.id}">编辑</button>
          <button data-action="delete-finance-asset" data-id="${item.id}">删除</button>
        </td>
      </tr>`;
    }).join("") || `<tr><td colspan="16" class="muted">暂无${financeKindLabel(kind)}资产</td></tr>`}</tbody>
  </table></div>`;
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
  return groupRecordRows(records, (record) => record.category, ["#2fb9b1", "#f07a55", "#f0c94e", "#78c6e7", "#8bd17c", "#c890e8", "#ef6f96", "#9aa7b2"]);
}

function incomeSourceBreakdown(records) {
  const rows = [
    { name: "劳动收入", value: sumRecordCategory(records, "劳动收入"), count: records.filter((record) => record.category === "劳动收入").length, color: "#24a381" },
    { name: "资产收入", value: records.filter((record) => record.category !== "劳动收入").reduce((sum, record) => sum + convert(record.amount, record.currency), 0), count: records.filter((record) => record.category !== "劳动收入").length, color: "#57b7e6" },
  ].filter((item) => item.value > 0);
  const total = rows.reduce((sum, item) => sum + item.value, 0) || 1;
  return rows.map((item) => ({ ...item, share: item.value / total }));
}

function expenseRankBreakdown(records) {
  const rows = [
    { name: "生活消费", value: sumRecordCategory(records, "生活消费"), count: records.filter((record) => record.category === "生活消费").length, color: "#ef6f96" },
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
  return groupRecordRows(records, (record) => record.sub || record.note || "未标记", ["#24b8b1", "#f18a4d", "#88c5f1", "#f2cf58", "#9bd67d", "#e98da8"]);
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
  }).join(", ") : "#d9e0dc 0% 100%";
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
  const stats = data.analysisStats;
  const incomeTotal = Math.max(stats.laborIncome, 0) + Math.max(stats.financeIncome, 0) || 1;
  const outflowTotal = stats.payableDebt + stats.consumption || 1;
  const annualRate = data.initialAssets ? stats.annualNetGrowth / data.initialAssets : 0;
  return `
    <div class="grid cols-4">
      ${metric(`${stats.year}年度净资产增值`, money(stats.annualNetGrowth), "当年累计结余 + 当年理财收益 - 应付/借入总额")}
      ${metric("当年累计结余", money(stats.ledgerBalance), "收支分析收入 - 消费，已排除理财收支")}
      ${metric("当年理财收益", money(stats.financeIncome), "来源：场内穿透盈亏日历当年累计")}
      ${metric("应付/借入总额", money(-stats.payableDebt), "负债模块应付/借入，作为净资产减项")}
    </div>
    <div class="grid cols-2">
      ${donutCard("收入归因", ["收支分析 · 劳动收入", "理财模块 · 理财收入"], [
        Math.max(stats.laborIncome, 0) / incomeTotal * 100,
        Math.max(stats.financeIncome, 0) / incomeTotal * 100,
      ])}
      ${donutCard("负债与消费构成", ["债务模块 · 应付/借入", "收支分析 · 消费"], [
        stats.payableDebt / outflowTotal * 100,
        stats.consumption / outflowTotal * 100,
      ])}
    </div>
    <div class="grid cols-2">
      <section class="card">
        <div class="section-title"><h2>三大模块归因明细</h2><span class="badge">${stats.year}年</span></div>
        ${recordsRows([
          ["劳动收入", money(stats.laborIncome), percent(stats.laborIncome / incomeTotal)],
          ["理财收入", money(stats.financeIncome), percent(stats.financeIncome / incomeTotal)],
          ["消费", money(-stats.consumption), percent(stats.consumption / outflowTotal)],
          ["应付/借入", money(-stats.payableDebt), percent(stats.payableDebt / outflowTotal)],
        ])}
      </section>
      <section class="card">
        <div class="section-title"><h2>年度净增值计算</h2><span class="badge">三模块联动</span></div>
        ${recordsRows([
          ["收支分析累计结余", money(stats.ledgerBalance)],
          ["加：场内穿透年度收益", money(stats.financeIncome)],
          ["减：应付/借入总额", money(-stats.payableDebt)],
          ["年度净资产增值", money(stats.annualNetGrowth), percent(annualRate)],
        ])}
      </section>
    </div>
    ${barCard("当前年度模块数据", [
      ["累计结余", stats.ledgerBalance, Math.max(Math.abs(stats.annualNetGrowth), 1)],
      ["理财收益", stats.financeIncome, Math.max(Math.abs(stats.annualNetGrowth), 1)],
      ["应付/借入", -stats.payableDebt, Math.max(Math.abs(stats.annualNetGrowth), 1)],
      ["净资产增值", stats.annualNetGrowth, Math.max(Math.abs(stats.annualNetGrowth), 1)],
    ])}`;
}

function accounts() {
  return `<section class="card">
    <div class="section-title">
      <h2>多账户 + 多币种</h2>
      <div class="section-actions">
        <span class="badge">原始流水永远保留原币种</span>
        <button class="primary" data-action="new-account">新增</button>
      </div>
    </div>
    <table class="table"><thead><tr><th>账户</th><th>所有人</th><th>币种</th><th>类型</th><th>余额</th><th>负债</th><th>操作</th></tr></thead>
    <tbody>${state.accounts.map((a) => `<tr>
      <td>${a.name}</td>
      <td>${a.owner}</td>
      <td>${a.currency}</td>
      <td>${a.type}</td>
      <td>${money(convert(a.balance, a.currency))}</td>
      <td>${money(convert(a.liability, a.currency))}</td>
      <td class="table-actions">
        <button data-action="edit-account" data-id="${a.id}">编辑</button>
        <button data-action="delete-account" data-id="${a.id}">删除</button>
      </td>
    </tr>`).join("")}</tbody></table>
  </section>`;
}

function assetClasses() {
  const totalValue = state.assetClasses.reduce((sum, item) => sum + Math.max(Number(item.value) || 0, 0), 0);
  return `<section>
    <div class="section-title">
      <h2>资产大类分类管理</h2>
      <div class="section-actions">
        <span class="badge">拖拽卡片或使用前移 / 后移调整顺序</span>
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
  </section>`;
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
  const query = premiumQuery.trim().toLowerCase();
  const rows = premiumRows.filter((row) => {
    const matchesFilter = premiumFilter === "all" || row.status === premiumFilter;
    const matchesQuery = !query || `${row.code} ${row.name} ${row.category}`.toLowerCase().includes(query);
    return matchesFilter && matchesQuery;
  });
  const premiumTargets = premiumRows.filter((row) => row.status === "premium");
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
        <span class="premium-live"><i></i>每 30 秒自动刷新</span>
        <button class="primary premium-refresh" data-action="refresh-premium" ${premiumLoading ? "disabled" : ""}>
          ${premiumLoading ? "正在刷新..." : "刷新行情"}
        </button>
      </div>
    </div>

    <div class="premium-summary">
      <article><span>覆盖标的</span><strong>${premiumRows.length}</strong><small>ETF / LOF / QDII</small></article>
      <article><span>溢价标的</span><strong>${premiumTargets.length}</strong><small>溢价率高于 0.50%</small></article>
      <article><span>最高参考溢价</span><strong class="${highest?.premiumRate >= 0 ? "positive" : "negative"}">${highest ? formatPremiumRate(highest.premiumRate) : "--"}</strong><small>${highest ? `${escapeHtml(highest.code)} ${escapeHtml(highest.name)}` : "等待行情"}</small></article>
      <article><span>行情时间</span><strong class="premium-time">${fetchedTime}</strong><small>${escapeHtml(premiumSource || "公开基金行情聚合")}</small></article>
    </div>

    <div class="premium-controls">
      <div class="premium-segments" aria-label="溢价状态筛选">
        ${[
          ["all", "全部"],
          ["premium", "溢价"],
          ["flat", "平价"],
          ["discount", "折价"],
        ].map(([value, label]) => `<button data-action="premium-filter" data-value="${value}" class="${premiumFilter === value ? "active" : ""}">${label}</button>`).join("")}
      </div>
      <form id="premiumSearchForm" class="premium-search">
        <input name="query" value="${escapeAttr(premiumQuery)}" placeholder="搜索代码、名称或类型" aria-label="搜索溢价标的" />
        <button type="submit">查询</button>
      </form>
    </div>

    ${premiumError ? `<div class="premium-alert" role="alert">${escapeHtml(premiumError)}</div>` : ""}
    <div class="premium-table-wrap">
      <table class="premium-table">
        <thead>
          <tr>
            <th>标的</th>
            <th>类型</th>
            <th>市场价格</th>
            <th>涨跌幅</th>
            <th>参考净值</th>
            <th>参考溢价率</th>
            <th>估值依据</th>
            <th>申赎状态</th>
            <th>更新时间</th>
          </tr>
        </thead>
        <tbody>
          ${premiumLoading && !premiumRows.length
            ? `<tr><td colspan="9" class="premium-empty">正在获取实时行情...</td></tr>`
            : rows.map(premiumRow).join("") || `<tr><td colspan="9" class="premium-empty">当前条件下暂无标的</td></tr>`}
        </tbody>
      </table>
    </div>
    <p class="premium-disclaimer">参考溢价率根据公开行情中的实时价格、IOPV、估算净值或最新净值计算，仅用于数据观察，不构成投资建议。跨境品种可能受时差、汇率及净值披露延迟影响。</p>
  </section>`;
}

function premiumRow(row) {
  const tone = row.status === "premium" ? "positive" : row.status === "discount" ? "negative" : "";
  return `<tr>
    <td><div class="premium-symbol"><strong>${escapeHtml(row.name)}</strong><span>${escapeHtml(row.code)} · ${escapeHtml(row.market)}</span></div></td>
    <td><span class="premium-type">${escapeHtml(row.category)}</span></td>
    <td>${Number(row.price).toFixed(3)}</td>
    <td class="${Number(row.changeRate) >= 0 ? "positive" : "negative"}">${formatPremiumRate(row.changeRate)}</td>
    <td>${row.referenceNav === null ? "--" : Number(row.referenceNav).toFixed(4)}</td>
    <td><strong class="premium-rate ${tone}">${formatPremiumRate(row.premiumRate)}</strong></td>
    <td>${escapeHtml(row.premiumBasis)}</td>
    <td><div class="premium-status"><span>${escapeHtml(row.applyStatus)}</span><small>${escapeHtml(row.redeemStatus)}</small></div></td>
    <td><div class="premium-status"><span>${escapeHtml(row.quoteTime)}</span><small>净值 ${escapeHtml(row.navDate)}</small></div></td>
  </tr>`;
}

function formatPremiumRate(value) {
  const number = Number(value) || 0;
  return `${number > 0 ? "+" : ""}${number.toFixed(2)}%`;
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
  } catch (error) {
    premiumError = error.message || "行情获取失败，请稍后重试。";
  } finally {
    premiumLoading = false;
    if (currentModule === "premiumTool") render();
  }
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
  }, 30_000);
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
          <stop offset="0" stop-color="#fb6b45" stop-opacity="0.34" />
          <stop offset="1" stop-color="#fb6b45" stop-opacity="0" />
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
  </div>`;
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
  document.querySelectorAll("[data-action='premium-filter']").forEach((button) => button.addEventListener("click", () => {
    premiumFilter = button.dataset.value;
    render();
  }));
  document.querySelector("#premiumSearchForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    premiumQuery = String(new FormData(event.currentTarget).get("query") || "").trim();
    render();
  });
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
  document.querySelectorAll("[data-action='new-finance-asset']").forEach((button) => button.addEventListener("click", () => openFinanceAssetDialog(null, button.dataset.kind)));
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
  document.querySelectorAll("[data-action='move-asset-class']").forEach((button) => button.addEventListener("click", () => {
    moveAssetClass(button.dataset.id, Number(button.dataset.offset));
  }));
  bindAssetClassSorting();
  document.querySelectorAll("[data-action='export']").forEach((button) => button.addEventListener("click", exportCsv));
  document.querySelectorAll("[data-action='upload-avatar']").forEach((button) => button.addEventListener("click", () => {
    document.querySelector("#avatarInput")?.click();
  }));
  document.querySelector("#avatarInput")?.addEventListener("change", handleAvatarUpload);
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
  state = normalizeLoadedState(payload.state);
  filters.currency = state.user.currency;
  saveAuth();
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
  fields.color.value = item?.color || "#539f8d";
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
    color: data.color || "#539f8d",
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

function financeTertiaryOptions(kind, subcategory, preferred = "") {
  const key = financeTertiaryScopeKey(kind, subcategory);
  const saved = state.customCategories.finance.tertiaryByScope[key] || [];
  return [...new Set(["未分类", ...saved, ...(preferred ? [preferred] : [])])];
}

function openFinanceAssetDialog(asset = null, preferredKind = "stock") {
  const form = document.querySelector("#financeAssetForm");
  const fields = form.elements;
  const source = asset || state.financeAssetDraft || {};
  const kind = normalizeFinanceKind(source.kind || preferredKind || "stock");
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
  fields.costPrice.value = source.costPrice ?? "";
  fields.shares.value = source.shares ?? "";
  fields.pnl.value = source.pnl ?? 0;
  resetFinanceOcrPanel();
  form.querySelector("h2").textContent = asset ? "编辑理财资产" : "新增理财资产";
  updateFinanceAssetPreview();
  document.querySelector("#financeAssetDialog").showModal();
}

function resetFinanceOcrPanel() {
  const preview = document.querySelector("#financeOcrPreview");
  const status = document.querySelector("#financeOcrStatus");
  if (preview?.dataset.objectUrl) URL.revokeObjectURL(preview.dataset.objectUrl);
  if (preview) {
    preview.removeAttribute("src");
    preview.dataset.objectUrl = "";
  }
  if (status) {
    status.textContent = "尚未选择图片";
    status.className = "finance-ocr-status";
  }
}

function handleFinanceImageSelection(event) {
  const file = event.currentTarget.files?.[0];
  const preview = document.querySelector("#financeOcrPreview");
  const status = document.querySelector("#financeOcrStatus");
  if (!file) {
    resetFinanceOcrPanel();
    return;
  }
  if (!file.type.startsWith("image/")) {
    event.currentTarget.value = "";
    status.textContent = "请选择 PNG、JPG 或 WebP 图片。";
    status.className = "finance-ocr-status error";
    return;
  }
  if (preview.dataset.objectUrl) URL.revokeObjectURL(preview.dataset.objectUrl);
  const objectUrl = URL.createObjectURL(file);
  preview.src = objectUrl;
  preview.dataset.objectUrl = objectUrl;
  status.textContent = `已选择 ${file.name}，点击“识别并自动填写”。`;
  status.className = "finance-ocr-status";
}

async function handleFinanceImageRecognition(event) {
  const form = document.querySelector("#financeAssetForm");
  const file = form.elements.assetImage.files?.[0];
  const button = event.currentTarget;
  const status = document.querySelector("#financeOcrStatus");
  if (!file) {
    status.textContent = "请先上传需要识别的资产图片。";
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
    const result = await window.Tesseract.recognize(file, "chi_sim+eng", {
      workerPath: "/vendor/tesseract-worker.min.js",
      logger: (message) => {
        if (message.status !== "recognizing text") return;
        status.textContent = `正在识别图片 ${Math.round((message.progress || 0) * 100)}%`;
      },
    });
    const extracted = parseFinanceOcrText(result.data.text || "");
    const filled = applyFinanceOcrResult(extracted);
    status.textContent = filled.length
      ? `识别完成，已填写：${filled.join("、")}。请核对后保存。`
      : "图片识别完成，但没有找到可自动填写的资产字段，请换一张更清晰的截图。";
    status.className = `finance-ocr-status ${filled.length ? "success" : "error"}`;
  } catch (error) {
    console.error("资产图片识别失败", error);
    status.textContent = "图片识别失败，请使用更清晰、文字方向正常的截图重试。";
    status.className = "finance-ocr-status error";
  } finally {
    button.disabled = false;
    button.textContent = "识别并自动填写";
  }
}

function parseFinanceOcrText(rawText) {
  const text = String(rawText || "")
    .replace(/[，]/g, ",")
    .replace(/[：]/g, ":")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/[^\S\r\n]+/g, " ");
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const valueAfterLabel = (labels) => {
    const labelPattern = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    for (const line of lines) {
      const match = line.match(new RegExp(`(?:${labelPattern})\\s*[:：]?\\s*([^|]+)$`, "i"));
      if (match?.[1]) return match[1].trim();
    }
    return "";
  };
  const numberAfterLabel = (labels) => {
    const value = valueAfterLabel(labels);
    const match = value.match(/[-+]?\d[\d,]*(?:\.\d+)?/);
    return match ? Number(match[0].replaceAll(",", "")) : null;
  };
  const lower = text.toLowerCase();
  const kind = /基金|etf|lof/.test(lower)
    ? "fund"
    : /期货|futures?/.test(lower)
      ? "futures"
      : /期权|options?/.test(lower)
        ? "options"
        : /黄金|白银|原油|商品/.test(lower)
          ? "commodity"
          : /比特币|btc|eth|加密/.test(lower)
            ? "crypto"
            : /股票|证券|持股|stock/.test(lower)
              ? "stock"
              : "";
  const currency = /\bHKD\b|港币/.test(text)
    ? "HKD"
    : /\bUSD\b|美元/.test(text)
      ? "USD"
      : /\bEUR\b|欧元/.test(text)
        ? "EUR"
        : /\bJPY\b|日元/.test(text)
          ? "JPY"
          : /\bCNY\b|\bCNH\b|人民币|￥|¥/.test(text)
            ? "CNH"
            : "";
  const labeledName = valueAfterLabel(["资产名称", "证券名称", "股票名称", "基金名称", "产品名称", "名称"]);
  const codeValue = valueAfterLabel(["资产代码", "证券代码", "股票代码", "基金代码", "产品代码", "代码"]);
  const fallbackCode = text.match(/\b(?:\d{5,6}|[A-Z]{1,5})\b/)?.[0] || "";
  return {
    kind,
    currency,
    market: currency && currency !== "CNH" ? "overseas" : currency ? "domestic" : "",
    name: labeledName.replace(/\s{2,}.*/, "").trim(),
    code: (codeValue.match(/[A-Z0-9.-]{2,12}/i)?.[0] || fallbackCode).toUpperCase(),
    costPrice: numberAfterLabel(["持仓成本", "平均成本", "成本价", "成本单价", "买入均价"]),
    shares: numberAfterLabel(["持仓数量", "持有数量", "持有份额", "基金份额", "股票数量", "数量", "份额"]),
    pnl: numberAfterLabel(["浮动盈亏", "持仓盈亏", "累计盈亏", "盈亏"]),
  };
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
    syncFinanceSubcategoryByCurrency(result.currency);
    filled.push("货币单位");
  }
  [["name", "资产名称"], ["code", "资产代码"]].forEach(([field, label]) => {
    if (!result[field]) return;
    fields[field].value = result[field];
    filled.push(label);
  });
  [["costPrice", "持仓成本"], ["shares", "份额/数量"], ["pnl", "浮动盈亏"]].forEach(([field, label]) => {
    if (result[field] === null || !Number.isFinite(result[field])) return;
    fields[field].value = result[field];
    filled.push(label);
  });
  updateFinanceAssetPreview();
  saveFinanceAssetDraftFromForm();
  return filled;
}

function handleFinanceKindChange() {
  updateFinanceAssetCategories();
  updateFinanceSubcategories();
  updateFinanceTertiaryCategories();
  updateFinancePositionGroups();
  updateFinancePositionCategories();
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
  fields.currentValue.value = value ? value.toFixed(2) : "";
}

function handleFinanceAssetFormChange() {
  updateFinanceAssetPreview();
  const form = document.querySelector("#financeAssetForm");
  if (!form?.elements || form.elements.assetId.value) return;
  saveFinanceAssetDraftFromForm();
}

function saveFinanceAssetDraftFromForm() {
  const form = document.querySelector("#financeAssetForm");
  if (!form?.elements) return;
  const data = Object.fromEntries(new FormData(form));
  state.financeAssetDraft = {
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
  };
  saveState();
}

function handleFinanceAssetSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  const id = Number(data.assetId) || Date.now();
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
    costPrice: Number(data.costPrice) || 0,
    shares: Number(data.shares) || 0,
    pnl: Number(data.pnl) || 0,
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
    !payload.code ||
    payload.costPrice <= 0 ||
    payload.shares <= 0 ||
    !Number.isFinite(payload.pnl)
  ) return;
  const index = state.financeAssets.findIndex((item) => item.id === id);
  if (index >= 0) {
    state.financeAssets[index] = payload;
  } else {
    state.financeAssets.unshift(payload);
  }
  state.financeAssetDraft = { ...payload };
  delete state.financeAssetDraft.id;
  syncAssetClassValuesFromFinance();
  saveState();
  document.querySelector("#financeAssetDialog").close();
  render();
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

init().catch((error) => {
  console.error("应用启动失败", error);
  render();
});
