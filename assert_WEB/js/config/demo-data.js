/**
 * 演示数据（Seed Data）
 * 未登录用户可查看的示例数据
 */

export const seed = {
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
    commissionMin: 5,           // 佣金最低收费 (元)
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
