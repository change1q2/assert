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
