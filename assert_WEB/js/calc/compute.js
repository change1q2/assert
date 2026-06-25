/**
 * 计算模块 - 核心计算函数
 * 依赖于全局变量: state, filters, analysisPeriodMode, analysisPeriod
 */

/**
 * 货币转换
 * @param {number} amount - 金额
 * @param {string} from - 源货币
 * @param {string} to - 目标货币，默认使用 filters.currency
 */
function convert(amount, from, to = filters.currency) {
  const cny = amount * (state.rates[from] || 1);
  return cny / (state.rates[to] || 1);
}

/**
 * 过滤后的记录
 * 根据日期范围和账户筛选记录
 */
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

/**
 * 按类别和类型汇总金额
 * @param {Array} records - 记录数组
 * @param {string} category - 类别
 * @param {string} type - 类型 (income/expense)
 */
function sumCategory(records, category, type) {
  return records.filter((r) => r.category === category && (!type || r.type === type)).reduce((sum, r) => sum + convert(r.amount, r.currency), 0);
}

/**
 * 计算资产、收支、负债等核心数据
 */
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

/**
 * 年度分析统计
 */
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

/**
 * 计算指定年度的理财收益
 * @param {Array} assets - 理财资产数组
 * @param {number} year - 年份
 * @param {Date} throughDate - 截止日期
 */
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

export {
  convert,
  filteredRecords,
  sumCategory,
  compute,
  annualAnalysisStats,
  financeProfitAmountForYear,
};
