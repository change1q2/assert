/**
 * 序列模块 - 月度/日历序列和分析周期范围
 * 依赖于全局变量: state, filters, analysisPeriodMode, analysisPeriod
 */

/**
 * 分析周期范围
 * 根据分析周期模式返回开始和结束日期
 */
function analysisPeriodRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (analysisPeriodMode === "day") {
    const day = new Date(year, month, now.getDate());
    return [day, day];
  }
  if (analysisPeriodMode === "month") {
    const match = String(analysisPeriod).match(/^(\d{4})-(\d{2})$/);
    const selectedYear = match ? Number(match[1]) : year;
    const selectedMonth = match ? Number(match[2]) - 1 : month;
    const isCurrent = selectedYear === year && selectedMonth === month;
    return [new Date(selectedYear, selectedMonth, 1), isCurrent ? now : new Date(selectedYear, selectedMonth + 1, 0)];
  }
  if (analysisPeriodMode === "year") {
    const selectedYear = Number(analysisPeriod) || year;
    const isCurrent = selectedYear === year;
    return [new Date(selectedYear, 0, 1), isCurrent ? now : new Date(selectedYear, 11, 31)];
  }
  return [
    filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : "",
    filters.endDate ? new Date(`${filters.endDate}T23:59:59`) : "",
  ];
}

/**
 * 月度序列
 * 返回当前年份12个月的收支和增长数据
 */
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

/**
 * 日历序列
 * 返回当前月份每日的数据
 */
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

export {
  analysisPeriodRange,
  monthlySeries,
  dailyCalendarSeries,
};
