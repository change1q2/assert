// ─── 理财渲染模块 ───

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
