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

function ledgerKpi(label, value, hint, tone, currency = filters.currency) {
  return `<article class="ledger-kpi ${tone}">
    <span>${label}</span>
    <strong>${money(value, currency)}</strong>
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
