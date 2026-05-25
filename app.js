const modules = [
  ["overview", "资产总览", "⌂"],
  ["budget", "预算管理", "▣"],
  ["records", "收支记账", "＋"],
  ["analysis", "统计分析", "◇"],
  ["classes", "资产分类", "☷"],
  ["tools", "辅助工具", "⚙"],
  ["strategies", "业务设计", "◎"],
  ["accounts", "账户管理", "◫"],
];

const today = new Date().toISOString().slice(0, 10);
const seed = {
  user: { name: "演示用户", phone: "138****8888", currency: "CNY", theme: "light", avatar: "" },
  rates: { CNY: 1, USD: 7.22, HKD: 0.92, EUR: 7.82, JPY: 0.046 },
  accounts: [
    { id: "cash", name: "招商储蓄卡", owner: "本人", currency: "CNY", type: "现金账户", balance: 128000, liability: 0, enabled: true, default: true },
    { id: "broker", name: "证券账户", owner: "本人", currency: "CNY", type: "投资账户", balance: 268000, liability: 0, enabled: true },
    { id: "usd", name: "美元现金账户", owner: "本人", currency: "USD", type: "外币账户", balance: 8200, liability: 0, enabled: true },
    { id: "mortgage", name: "房贷账户", owner: "家庭", currency: "CNY", type: "负债账户", balance: 0, liability: 520000, enabled: true },
  ],
  assetClasses: [
    { id: "cashClass", name: "现金类", children: ["活期", "货币基金"], visible: true },
    { id: "equity", name: "权益类", children: ["股票", "基金"], visible: true },
    { id: "debt", name: "债权类", children: ["债券", "定期"], visible: true },
    { id: "commodity", name: "商品类", children: ["黄金"], visible: true },
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
  reminders: [
    { date: "2026-06-01", title: "房贷还款提醒", type: "还款" },
    { date: "2026-06-15", title: "指数基金定投", type: "定投" },
    { date: "2026-07-01", title: "定期理财到期", type: "到期" },
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
let currentModule = "overview";
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
  return saved ? JSON.parse(saved) : structuredClone(seed);
}

function saveState() {
  localStorage.setItem("asset-platform-v18", JSON.stringify(state));
}

function money(value, currency = filters.currency) {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency, maximumFractionDigits: 0 }).format(value || 0);
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
  };
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

function init() {
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
  entry.title = "个人中心";
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
  });
  document.querySelector("#screenToggle").addEventListener("click", () => document.documentElement.requestFullscreen?.());
  document.querySelector("#userEntry").addEventListener("click", () => {
    currentModule = "profile";
    render();
  });
  document.querySelector("#cancelRecord").addEventListener("click", () => document.querySelector("#recordDialog").close());
  document.querySelector("#recordForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const account = state.accounts.find((a) => a.id === data.accountId);
    state.records.unshift({
      id: Date.now(),
      type: data.type,
      category: data.category,
      sub: "自定义",
      amount: Number(data.amount),
      currency: account.currency,
      accountId: data.accountId,
      date: data.date,
      note: data.note || "手动记账",
    });
    saveState();
    document.querySelector("#recordDialog").close();
    render();
  });
}

function render() {
  renderNav();
  renderUserEntry();
  renderFilters();
  document.querySelector(".filters").classList.toggle("is-hidden", currentModule === "profile");
  const moduleName = currentModule === "profile" ? "个人中心" : modules.find(([id]) => id === currentModule)?.[1] || "资产总览";
  document.querySelector("#pageTitle").textContent = moduleName;
  const view = document.querySelector("#view");
  const data = compute();
  const renderers = { overview, records, analysis, budget, accounts, classes: assetClasses, tools, strategies, profile };
  view.innerHTML = renderers[currentModule](data);
  bindViewActions();
}

function metric(label, value, hint = "") {
  return `<article class="card metric"><span>${label}</span><strong>${value}</strong><p class="muted">${hint}</p></article>`;
}

function overview(data) {
  const months = monthlySeries();
  const days = dailyCalendarSeries();
  return `
    <div class="grid cols-4">
      ${metric("总资产", money(data.totalAssets), "按实时汇率换算")}
      ${metric("总负债", money(data.totalLiabilities), "负债账户汇总")}
      ${metric("净资产", money(data.netAssets), "总资产 - 总负债")}
      ${metric("本期结余", money(data.balance), "收入 - 支出，转账不计收支")}
    </div>
    <div class="grid cols-2">
      ${donutCard("资产结构", ["现金类", "权益类", "债权类"], [32, 56, 12])}
      ${barCard("账户资产分布", data.accounts.map((a) => [a.name, convert(a.balance, a.currency), data.totalAssets]))}
    </div>
    <div class="grid cols-2">
      ${monthlyGrowthCard(months)}
      ${yoyLineCard(months)}
    </div>
    ${calendarCard(days)}
    <section class="card">
      <div class="section-title"><h2>资产变动日志</h2><button data-action="export">导出 Excel</button></div>
      ${recordsTable(data.records.slice(0, 6))}
    </section>`;
}

function records(data) {
  return `
    <section class="card">
      <div class="section-title"><h2>收支记账</h2><button class="primary" data-action="new-record">新增流水</button></div>
      <div class="grid cols-3">
        ${metric("收入", money(data.income), "劳动收入、理财收入、其他收入")}
        ${metric("支出", money(data.expense), "生活消费、理财亏损、偿债支出")}
        ${metric("转账规则", "不计收支", "保留原币种与汇率记录")}
      </div>
    </section>
    <section class="card">${recordsTable(data.records)}</section>`;
}

function analysis(data) {
  const total = Math.abs(data.laborNet) + Math.abs(data.investNet) + Math.abs(data.debtContribution) || 1;
  return `
    <div class="grid cols-4">
      ${metric("年度净资产增值", money(data.annualGrowth), "劳动 + 理财 + 负债贡献")}
      ${metric("整体年度收益率", percent(data.totalRate), "净增值 / 期初总资产")}
      ${metric("负债年化成本额", money(data.debtCost), "年度真实利息估算")}
      ${metric("负债平均年化利率", percent(data.avgDebtRate), "成本额 / 日均负债余额")}
    </div>
    <div class="grid cols-2">
      ${donutCard("三维资产增长贡献", ["劳动模块", "理财模块", "负债模块"], [Math.abs(data.laborNet) / total * 100, Math.abs(data.investNet) / total * 100, Math.abs(data.debtContribution) / total * 100])}
      <section class="card">
        <div class="section-title"><h2>三维归因明细</h2><span class="badge">核心算法</span></div>
        ${recordsRows([
          ["劳动净增值", money(data.laborNet), percent(data.laborRate)],
          ["理财净收益", money(data.investNet), percent(data.investRate)],
          ["负债净资产贡献", money(data.debtContribution), percent(data.debtRate)],
          ["简单年化收益率", percent(data.totalRate / 145 * 365), "按持有天数折算"],
        ])}
      </section>
    </div>
    ${barCard("历年对比折线替代表", [["2023", 42000, 90000], ["2024", 68000, 90000], ["2025", 76000, 90000], ["2026", data.annualGrowth, 90000]])}`;
}

function budget() {
  return `<section class="card">
    <div class="section-title"><h2>预算执行</h2><span class="badge">80% 预警 · 超支高亮</span></div>
    <div class="grid">${state.budgets.map((b) => budgetItem(b)).join("")}</div>
  </section>`;
}

function budgetItem(b) {
  const ratio = b.used / b.amount;
  const cls = ratio >= 1 ? "danger" : ratio >= 0.8 ? "warn" : "";
  return `<div>
    <div class="section-title"><strong>${b.name}</strong><span>${money(b.used)} / ${money(b.amount)}</span></div>
    <div class="progress ${cls}" style="--value:${Math.min(ratio * 100, 100)}%"><i></i></div>
  </div>`;
}

function accounts() {
  return `<section class="card">
    <div class="section-title"><h2>多账户 + 多币种</h2><span class="badge">原始流水永远保留原币种</span></div>
    <table class="table"><thead><tr><th>账户</th><th>所有人</th><th>币种</th><th>类型</th><th>余额</th><th>负债</th><th>状态</th></tr></thead>
    <tbody>${state.accounts.map((a) => `<tr><td>${a.name}</td><td>${a.owner}</td><td>${a.currency}</td><td>${a.type}</td><td>${money(convert(a.balance, a.currency))}</td><td>${money(convert(a.liability, a.currency))}</td><td>${a.enabled ? "启用" : "停用"}</td></tr>`).join("")}</tbody></table>
  </section>`;
}

function assetClasses() {
  return `<section>
    <div class="section-title"><h2>资产大类分类管理</h2><span class="badge">一级与二级均可自定义</span></div>
    <div class="grid cols-4">${state.assetClasses.map((c) => `<article class="card"><h3>${c.name}</h3><p class="muted">${c.children.join(" / ")}</p><button data-action="toggle-class" data-id="${c.id}">${c.visible ? "隐藏" : "显示"}</button></article>`).join("")}</div>
  </section>`;
}

function tools() {
  const backtest = backtestModel();
  return `
    <div class="grid cols-2">
      <section class="card"><div class="section-title"><h2>数据工作台</h2><span class="badge">拖拽排版预留</span></div>${recordsRows([["快捷记账", "收入 / 支出 / 转账"], ["全局筛选", "账户 / 时间 / 资产大类 / 币种"], ["备份状态", "云端自动备份模拟开启"]])}</section>
      <section class="card"><div class="section-title"><h2>实时估值表</h2><span class="badge">自动刷新</span></div>${recordsRows([["沪深300 ETF", "+2.18%", "权益类"], ["黄金 ETF", "+0.64%", "商品类"], ["中短债基金", "+0.22%", "债权类"]])}</section>
    </div>
    ${backtestCard(backtest)}
    <section class="card"><div class="section-title"><h2>财务日历</h2><span class="badge">提醒中心</span></div>${recordsRows(state.reminders.map((r) => [r.date, r.title, r.type]))}</section>`;
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

function profile() {
  return `<div class="grid cols-2">
    <section class="card">
      <div class="section-title"><h2>用户信息</h2></div>
      <div class="profile-panel">
        <button class="avatar-uploader" data-action="upload-avatar" title="上传头像">
          ${state.user.avatar ? `<img src="${state.user.avatar}" alt="头像" />` : `<span>${state.user.name.slice(0, 1)}</span>`}
        </button>
        <input id="avatarInput" type="file" accept="image/*" hidden />
        <div>
          <p class="muted">点击头像上传或更换头像</p>
          ${recordsRows([["昵称", state.user.name], ["手机", state.user.phone], ["默认汇总币种", state.user.currency]])}
        </div>
      </div>
    </section>
    <section class="card"><div class="section-title"><h2>安全与偏好</h2></div>${recordsRows([["隐私锁", "已开启"], ["数据脱敏", "已开启"], ["设备管理", "PC / APP / 小程序"], ["版本日志", "V1.8 最终终稿"]])}</section>
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

function recordsRows(rows) {
  return `<table class="table"><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function typeLabel(type) {
  return ({ income: "收入", expense: "支出", transfer: "转账" })[type] || type;
}

function bindViewActions() {
  document.querySelectorAll("[data-action='new-record']").forEach((button) => button.addEventListener("click", openRecordDialog));
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
  document.querySelectorAll("[data-action='export']").forEach((button) => button.addEventListener("click", exportCsv));
  document.querySelectorAll("[data-action='upload-avatar']").forEach((button) => button.addEventListener("click", () => {
    document.querySelector("#avatarInput")?.click();
  }));
  document.querySelector("#avatarInput")?.addEventListener("change", handleAvatarUpload);
}

function openRecordDialog() {
  const form = document.querySelector("#recordForm");
  form.category.innerHTML = ["劳动收入", "理财收入", "其他收入", "生活消费", "理财亏损", "偿债支出", "其他支出", "跨币种转账"].map((c) => `<option>${c}</option>`).join("");
  form.accountId.innerHTML = state.accounts.map((a) => `<option value="${a.id}">${a.name}</option>`).join("");
  form.date.value = today;
  document.querySelector("#recordDialog").showModal();
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
    render();
  });
  reader.readAsDataURL(file);
}

init();
