// ─── 理财图表与数据处理模块 ───

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
