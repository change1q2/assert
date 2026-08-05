import { getCurrencySymbol, truncateNum } from '../utils/currency';
export { getCurrencySymbol };

export function formatCurrency(value) {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(truncateNum(value, 3));
}

export function convertCurrency(value, fromCurrency, toCurrency, rates) {
  if (fromCurrency === toCurrency) return value;
  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;
  return value * (fromRate / toRate);
}

export function formatCurrencyWithRate(value, currency, targetCurrency, rates) {
  const converted = convertCurrency(value, currency, targetCurrency, rates);
  const symbol = getCurrencySymbol(targetCurrency);
  return `${symbol}${new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(truncateNum(converted, 3))}`;
}

export function formatPriceValue(value) {
  if (value == null || value === '') return '—';
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  const str = typeof value === 'string' ? value : String(num);
  const dotIndex = str.indexOf('.');
  if (dotIndex !== -1) {
    const decLen = str.length - dotIndex - 1;
    if (decLen >= 3) {
      return num.toFixed(4);
    }
  }
  return num.toFixed(2);
}

export function formatPercentage(value) {
  if (value === null || value === undefined) return '—';
  const n = parseFloat(value);
  if (isNaN(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
}

export function computeHoldingDays(account) {
  if (!account) return 0;
  const base = parseInt(account.holdingDaysBase ?? account.holdingDays, 10) || 0;
  const baseDate = account.holdingDaysDate;
  if (!baseDate) return base;
  const d1 = new Date(baseDate);
  d1.setHours(0, 0, 0, 0);
  const d2 = new Date();
  d2.setHours(0, 0, 0, 0);
  const days = Math.max(0, Math.floor((d2 - d1) / 86400000));
  return base + days;
}

export function formatNum(value) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(truncateNum(value, 3));
}

export const POS_CLASS = 'text-green-600 dark:text-green-400';
export const NEG_CLASS = 'text-red-500 dark:text-red-400';

export function pnlClass(val) {
  const n = parseFloat(val);
  return isNaN(n) ? '' : (n >= 0 ? POS_CLASS : NEG_CLASS);
}

export function pnlSign(n) {
  return n > 0 ? '+' : '';
}

export const DEFAULT_COLUMNS = [
  { key: 'market', label: '市场', visible: true, align: 'left' },
  { key: 'currency', label: '货币', visible: true, align: 'left' },
  { key: 'assetKind', label: '资产种类', visible: true, align: 'left' },
  { key: 'assetType', label: '资产类型', visible: false, align: 'left' },
  { key: 'name', label: '资产名称', visible: true, align: 'left' },
  { key: 'code', label: '代码', visible: true, align: 'left' },
  { key: 'categoryL1', label: '一级分类', visible: false, align: 'left' },
  { key: 'categoryL2', label: '二级分类', visible: false, align: 'left' },
  { key: 'categoryL3', label: '三级分类', visible: false, align: 'left' },
  { key: 'categoryL4', label: '四级分类', visible: false, align: 'left' },
  { key: 'positionGroup', label: '持仓分组', visible: false, align: 'left' },
  { key: 'positionType', label: '持仓分类', visible: false, align: 'left' },
  { key: 'cost', label: '持仓成本', visible: true, align: 'right' },
  { key: 'avgCost', label: '平均买入成本', visible: true, align: 'right' },
  { key: 'quantity', label: '数量', visible: true, align: 'right' },
  { key: 'currentPrice', label: '现价', visible: true, align: 'right' },

  { key: 'holdingDays', label: '天数', visible: true, align: 'right' },
  { key: 'currentValue', label: '当前市值', visible: true, align: 'right', bold: true },
  { key: 'holdingPnl', label: '持仓盈亏', visible: true, align: 'right', bold: true, pnl: true },
  { key: 'holdingPnlRate', label: '持仓盈亏率', visible: true, align: 'right', pnl: true },
  { key: 'dailyPnl', label: '当日盈亏', visible: true, align: 'right', bold: true, pnl: true, indigo: true },
  { key: 'dailyPnlRate', label: '当日收益率', visible: true, align: 'right', pnl: true },
  { key: 'positionRatio', label: '仓位占比', visible: true, align: 'right' },
  { key: 'account', label: '所属账户', visible: true, align: 'left' },
  { key: 'tags', label: '标签', visible: true, align: 'left' },
];

export const ARCHIVED_COLUMNS = [
  { key: 'market', label: '市场', visible: true, align: 'left' },
  { key: 'currency', label: '货币', visible: true, align: 'left' },
  { key: 'assetKind', label: '资产种类', visible: true, align: 'left' },
  { key: 'name', label: '资产名称', visible: true, align: 'left' },
  { key: 'code', label: '代码', visible: true, align: 'left' },
  { key: 'cost', label: '持仓成本', visible: true, align: 'right' },
  { key: 'avgCost', label: '平均买入成本', visible: true, align: 'right' },
  { key: 'quantity', label: '数量', visible: true, align: 'right' },
  { key: 'holdingDays', label: '天数', visible: true, align: 'right' },
  { key: 'archiveDate', label: '清仓日期', visible: true, align: 'right' },
  { key: 'finalPnl', label: '最终盈亏', visible: true, align: 'right', bold: true, pnl: true },
  { key: 'finalPnlPercent', label: '最终收益率', visible: true, align: 'right', pnl: true },
  { key: 'account', label: '所属账户', visible: true, align: 'left' },
];

export const DEFAULT_FILTERS = [
  { key: 'market', label: '市场', visible: true },
  { key: 'currency', label: '货币', visible: false },
  { key: 'assetKind', label: '资产种类', visible: false },
  { key: 'assetType', label: '资产类型', visible: false },
  { key: 'categoryL1', label: '一级分类', visible: true },
  { key: 'categoryL2', label: '二级分类', visible: true },
  { key: 'categoryL3', label: '三级分类', visible: true },
  { key: 'categoryL4', label: '四级分类', visible: false },
  { key: 'positionGroup', label: '持仓分组', visible: true },
  { key: 'positionType', label: '持仓分类', visible: true },
  { key: 'account', label: '所属账户', visible: true },
  { key: 'tag', label: '标签', visible: true },
];

export const ARCHIVED_FILTERS = [
  { key: 'market', label: '市场', visible: true },
  { key: 'currency', label: '货币', visible: false },
  { key: 'assetKind', label: '资产种类', visible: true },
  { key: 'account', label: '所属账户', visible: true },
];