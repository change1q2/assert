/**
 * 工具函数模块
 */

// 金额格式化
function money(value, currency = "CNY") {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const symbols = { CNY: "¥", USD: "$", HKD: "HK$", EUR: "€", JPY: "¥", GBP: "£" };
  const sym = symbols[currency] || currency;
  const isDecimal = abs < 10000;
  const formatted = isDecimal
    ? abs.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : abs.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
  return `${sign}${sym}${formatted}`;
}

// 紧凑金额格式化
function compactMoney(value, currency = "CNY") {
  const abs = Math.abs(value);
  const symbols = { CNY: "¥", USD: "$", HKD: "HK$", EUR: "€", JPY: "¥", GBP: "£" };
  const sym = symbols[currency] || currency;
  const sign = value < 0 ? "-" : "";
  if (abs >= 100000000) return `${sign}${sym}${(abs / 100000000).toFixed(2)}亿`;
  if (abs >= 10000) return `${sign}${sym}${(abs / 10000).toFixed(2)}万`;
  return `${sign}${sym}${abs.toFixed(2)}`;
}

// 百分比格式化
function percent(value) {
  return `${(value >= 0 ? "+" : "")}${value.toFixed(2)}%`;
}

// 日期格式化
function formatDate(date) {
  if (!date) return "";
  if (typeof date === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    date = new Date(date);
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// 日期时间格式化
function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  const date = formatDate(d);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${date} ${h}:${m}`;
}

// 文件大小格式化
function fileSizeLabel(value) {
  if (!value) return "0 B";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// HTML转义
function escapeHtml(value = "") {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value).replace(/[&<>"']/g, (c) => map[c] || c);
}

// 属性转义
function escapeAttr(value = "") {
  return String(value).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// 本地日期字符串
function localDateString(date = new Date()) {
  return formatDate(date);
}

// 本地日期时间字符串
function localDateTimeString(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// 导出工具函数
export {
  money,
  compactMoney,
  percent,
  formatDate,
  formatDateTime,
  fileSizeLabel,
  escapeHtml,
  escapeAttr,
  localDateString,
  localDateTimeString,
};
