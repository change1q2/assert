export const CURRENCIES = [
  { code: 'CNY', symbol: '¥', name: '人民币' },
  { code: 'USD', symbol: '$', name: '美元' },
  { code: 'EUR', symbol: '€', name: '欧元' },
  { code: 'GBP', symbol: '£', name: '英镑' },
  { code: 'JPY', symbol: '¥', name: '日元' },
  { code: 'HKD', symbol: 'HK$', name: '港币' },
];

export const DEFAULT_BASE_CURRENCY = 'CNY';

export const DEFAULT_EXCHANGE_RATES = {
  USD: 7.2,
  EUR: 7.8,
  GBP: 9.1,
  JPY: 0.048,
  HKD: 0.92,
  CNY: 1,
};

export function getCurrencySymbol(code) {
  const currency = CURRENCIES.find(c => c.code === code);
  return currency ? currency.symbol : '¥';
}

// 截断到指定小数位，不四舍五入
export function truncateNum(value, decimals = 3) {
  const num = parseFloat(value);
  if (isNaN(num) || num === 0) return 0;
  const factor = Math.pow(10, decimals);
  return Math.trunc(num * factor) / factor;
}

export function formatAmount(amount, currencyCode = DEFAULT_BASE_CURRENCY) {
  const symbol = getCurrencySymbol(currencyCode);
  const absAmount = Math.abs(truncateNum(amount || 0, 3));
  const formatted = absAmount.toLocaleString('zh-CN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
  return `${symbol}${formatted}`;
}

export function convertAmount(amount, fromCurrency, toCurrency, exchangeRates = DEFAULT_EXCHANGE_RATES) {
  if (fromCurrency === toCurrency) return amount;
  const fromRate = exchangeRates[fromCurrency] ?? 1;
  const toRate = exchangeRates[toCurrency] ?? 1;
  if (!toRate) return amount;
  return (amount * fromRate) / toRate;
}

export function getCurrencyName(code) {
  const currency = CURRENCIES.find(c => c.code === code);
  return currency ? currency.name : code;
}
