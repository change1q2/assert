/**
 * OCR 工具函数模块
 * 提供图片文字识别、文本预处理、金融数据规范化等功能
 */

/**
 * 识别图片中的文字
 * @param {File} file - 图片文件
 * @param {Function} onProgress - 进度回调函数，接收 0-100 的数字
 * @returns {Promise<string>} 识别的文本内容
 */
async function recognizeImageText(file, onProgress = () => {}) {
  if (!window.Tesseract?.recognize) throw new Error("OCR component unavailable");
  const processed = await preprocessFinanceOcrImage(file);
  const recognize = async (source, start, span, pageMode) => window.Tesseract.recognize(source, "chi_sim+eng", {
    workerPath: "/vendor/tesseract-worker.min.js",
    logger: (message) => {
      if (message.status === "recognizing text") onProgress(Math.round(start + (message.progress || 0) * span));
    },
  }, {
    tessedit_pageseg_mode: String(pageMode),
    preserve_interword_spaces: "1",
  });
  const enhancedResult = await recognize(processed, 0, 65, 6);
  const originalResult = await recognize(file, 65, 35, 11);
  return mergeOcrTexts(enhancedResult.data.text || "", originalResult.data.text || "");
}

/**
 * 预处理 OCR 图片 - 灰度化、增强对比度、锐化
 * @param {File} file - 原始图片文件
 * @returns {Promise<Blob>} 处理后的图片 blob
 */
async function preprocessFinanceOcrImage(file) {
  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = Math.max(0.25, Math.min(3, 2600 / Math.max(longest, 1)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.filter = "grayscale(1) contrast(1.55)";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  context.filter = "none";
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const source = new Uint8ClampedArray(image.data);
  const width = canvas.width;
  for (let y = 1; y < canvas.height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const offset = (y * width + x) * 4;
      const center = source[offset] * 5;
      const neighbors = source[offset - 4] + source[offset + 4] + source[offset - width * 4] + source[offset + width * 4];
      const value = Math.max(0, Math.min(255, center - neighbors));
      image.data[offset] = value;
      image.data[offset + 1] = value;
      image.data[offset + 2] = value;
    }
  }
  context.putImageData(image, 0, 0);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error("图片预处理失败"));
  }, "image/png"));
}

/**
 * 合并多个 OCR 文本，去除重复行
 * @param {...string} texts - 要合并的文本
 * @returns {string} 合并后的文本
 */
function mergeOcrTexts(...texts) {
  const seen = new Set();
  return texts
    .flatMap((text) => String(text || "").split(/\r?\n/))
    .map((line) => line.trim())
    .filter((line) => {
      const key = line.replace(/\s+/g, "").toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join("\n");
}

/**
 * 规范化 OCR 识别的日期格式
 * @param {string} value - 原始日期字符串
 * @returns {string} 规范化后的日期格式 YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss
 */
function normalizeOcrDate(value) {
  const match = String(value || "").match(
    /(20\d{2})[年./-](\d{1,2})[月./-](\d{1,2})(?:日)?(?:[T\s]+(\d{1,2})[:：](\d{1,2})(?:[:：](\d{1,2}))?)?/,
  );
  if (!match) return "";
  const date = `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}`;
  if (match[4] === undefined) return date;
  return `${date} ${String(match[4]).padStart(2, "0")}:${String(match[5]).padStart(2, "0")}:${String(match[6] || 0).padStart(2, "0")}`;
}

/**
 * 规范化金融代码格式
 * @param {string} value - 原始代码字符串
 * @returns {string} 规范化后的代码
 */
function normalizeFinanceOcrCode(value = "") {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/^(SH|SZ)(?=\d{6}$)/i, "")
    .replace(/^HK(?=\d{5}(?:\.HK)?$)/i, "")
    .replace(/^US[.:\s-]+/i, "")
    .replace(/\.HK$/i, "")
    .replace(/[^A-Z0-9.-]/g, "");
}

/**
 * 从文本中提取金融代码
 * @param {string} value - 原始文本
 * @returns {string[]} 提取到的代码数组
 */
function extractFinanceCodes(value = "") {
  const text = String(value || "").toUpperCase();
  const matches = [
    ...text.matchAll(/(?<!\d)(?:SH|SZ)?\d{6}(?!\d)/g),
    ...text.matchAll(/(?<!\d)(?:HK)?\d{5}(?:\.HK)?(?!\d)/g),
    ...text.matchAll(/\b(?:BTC|ETH|USDT|USDC|BNB|SOL|XRP|DOGE|ADA|XAU|XAG|WTI|BRENT|AU|AG)\b/g),
    ...text.matchAll(/\b[A-Z]{1,6}(?:\.[A-Z])?\b/g),
  ].map((match) => normalizeFinanceOcrCode(match[0]))
    .filter((code) => code && !FINANCE_OCR_CODE_STOPWORDS.has(code));
  return [...new Set(matches)].filter((code) => {
    if (/^\d+$/.test(code)) return code.length === 5 || code.length === 6;
    return code.length >= 1 && code.length <= 7;
  });
}

/**
 * 推断金融资产的类型
 * @param {string} text - 原始文本
 * @param {string} code - 资产代码
 * @returns {string} 资产类型 (stock/fund/futures/options/commodity/crypto/cashflow/custom)
 */
function inferFinanceOcrKind(text = "", code = "") {
  const source = `${text} ${code}`.toLowerCase();
  if (/基金|etf|lof|fund/.test(source) || /^(1|5)\d{5}$/.test(code)) return "fund";
  if (/期货|futures?|\bif\d|\bic\d|\bih\d/.test(source)) return "futures";
  if (/期权|options?|call|put/.test(source)) return "options";
  if (/黄金|白银|原油|商品|\bxau\b|\bxag\b|\bwti\b|\bbrent\b/.test(source)) return "commodity";
  if (/比特币|以太坊|加密|\bbtc\b|\beth\b|\busdt\b|\bcrypto/.test(source)) return "crypto";
  if (/现金流|备用金|可用现金|cash/.test(source)) return "cashflow";
  if (/自定义|理财产品/.test(source)) return "custom";
  return "stock";
}

/**
 * 推断金融资产的货币类型
 * @param {string} text - 原始文本
 * @param {string} code - 资产代码
 * @param {string} kind - 资产类型
 * @returns {string} 货币代码 (CNH/HKD/USD/EUR/JPY/GBP)
 */
function inferFinanceOcrCurrency(text = "", code = "", kind = "stock") {
  if (/\bHKD\b|港币|港股/i.test(text) || /^\d{5}$/.test(code)) return "HKD";
  if (/\bUSD\b|美元|美股/i.test(text) || (/^[A-Z]{1,6}(?:\.[A-Z])?$/.test(code) && kind === "stock")) return "USD";
  if (/\bEUR\b|欧元/i.test(text)) return "EUR";
  if (/\bJPY\b|日元/i.test(text)) return "JPY";
  if (/\bGBP\b|英镑/i.test(text)) return "GBP";
  return "CNH";
}

/**
 * 从 OCR 文本中提取资产名称
 * @param {string} value - 原始文本
 * @param {string} code - 资产代码
 * @returns {string} 提取到的资产名称
 */
function extractOcrAssetName(value = "", code = "") {
  let text = String(value || "")
    .replace(new RegExp(code ? code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "(?!)", "ig"), " ")
    .replace(/(?:SH|SZ|HK|US)[.:\s-]*/ig, " ")
    .replace(/[-+]?\d[\d,]*(?:\.\d+)?%?/g, " ")
    .replace(/资产名称|证券名称|股票名称|基金名称|产品名称|名称|代码|持仓|市值|成本|数量|份额|盈亏|买入|卖出|申购|赎回|交易|人民币|港币|美元/gi, " ")
    .replace(/[|:：;,，()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const chinese = [...text.matchAll(/[\u3400-\u9fff]{2,18}(?:ETF|LOF)?/gi)]
    .map((match) => match[0])
    .filter((name) => !/^(今日|昨日|当前|合计|总计|账户|资产|证券|股票|基金|商品|期货|期权|市场|代码|名称)$/.test(name));
  if (chinese.length) return chinese.sort((a, b) => b.length - a.length)[0];
  text = text.split(/\s+/)
    .filter((token) => /[A-Z]/i.test(token) && !FINANCE_OCR_CODE_STOPWORDS.has(token.toUpperCase()))
    .slice(0, 5)
    .join(" ");
  return text.length >= 2 ? text : "";
}

/**
 * 从 OCR 行中推断数字字段
 * @param {string} line - OCR 文本行
 * @param {string} code - 资产代码
 * @returns {Object} 包含 costPrice, shares, pnl, currentValue, currentPrice 等字段的对象
 */
function inferFinanceOcrNumbers(line = "", code = "") {
  const readers = createFinanceOcrLabelReaders([line]);
  const labeled = {
    costPrice: readers.numberAfterLabel(["持仓成本", "平均成本", "成本价", "成本单价", "成本"]),
    shares: readers.numberAfterLabel(["持仓数量", "持有数量", "持有份额", "基金份额", "股票数量", "数量", "份额"]),
    pnl: readers.numberAfterLabel(["浮动盈亏", "持仓盈亏", "累计盈亏", "盈亏", "盈亏额"]),
    currentValue: readers.numberAfterLabel(["当前市值", "持仓市值", "资产市值", "当前价值", "市值"]),
    currentPrice: readers.numberAfterLabel(["现价", "最新价", "当前价格", "市价", "最新价格"]),
    avgBuyPrice: readers.numberAfterLabel(["买入均价", "持仓均价", "平均买入价", "成本均价"]),
    holdingDays: readers.numberAfterLabel(["持仓天数", "持股天数", "天数"]),
    positionWeight: readers.numberAfterLabel(["个股仓位", "仓位占比", "仓位", "占比"]),
    totalFees: readers.numberAfterLabel(["税费合计", "税费", "费用合计", "总费用", "手续费合计"]),
    todayPnl: readers.numberAfterLabel(["当日盈亏", "当日参考盈亏", "今日盈亏", "当天盈亏"]),
  };
  const withoutCode = String(line).replace(new RegExp(code ? code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "(?!)", "ig"), " ");
  const values = [...withoutCode.matchAll(/[-+]?\d[\d,]*(?:\.\d+)?/g)]
    .map((match) => Number(match[0].replaceAll(",", "")))
    .filter((number) => Number.isFinite(number));
  if (!labeled.costPrice && !labeled.shares && !labeled.pnl && !labeled.currentValue && values.length >= 2) {
    const positive = values.filter((number) => number > 0);
    const signed = values.find((number) => number < 0);
    let best = null;
    positive.forEach((cost) => positive.forEach((shares) => {
      if (cost === shares) return;
      const expected = cost * shares;
      const marketValue = positive.find((value) => value !== cost && value !== shares && Math.abs(value - expected) / Math.max(value, 1) < 0.35);
      if (!marketValue) return;
      const difference = Math.abs(marketValue - expected) / Math.max(marketValue, 1);
      if (!best || difference < best.difference) best = { cost, shares, marketValue, difference };
    }));
    if (best) {
      labeled.costPrice = best.cost;
      labeled.shares = best.shares;
      labeled.currentValue = best.marketValue;
    } else if (positive.length >= 2) {
      labeled.costPrice = positive[0];
      labeled.shares = positive[1];
    }
    if (labeled.pnl === null && signed !== undefined) labeled.pnl = signed;
  }
  if (labeled.pnl === null && labeled.currentValue !== null && labeled.costPrice !== null && labeled.shares !== null) {
    labeled.pnl = labeled.currentValue - labeled.costPrice * labeled.shares;
  }
  return labeled;
}

/**
 * 从文本中提取数字标记
 * @param {string} value - 原始文本
 * @returns {Array<{value: number, percent: boolean}>} 数字数组，包含值和是否为百分比的标记
 */
function financeOcrNumericTokens(value = "") {
  return [...String(value).matchAll(/([-+]?\d[\d,]*(?:\.\d+)?)\s*(%?)/g)]
    .map((match) => ({
      value: Number(match[1].replaceAll(",", "")),
      percent: match[2] === "%",
    }))
    .filter((item) => Number.isFinite(item.value));
}

/**
 * 规范化 OCR 百分比值
 * @param {number} rawValue - 原始值
 * @param {number|null} expectedValue - 期望值（可选）
 * @returns {number} 规范化后的百分比值
 */
function normalizeOcrPercent(rawValue, expectedValue = null) {
  if (!Number.isFinite(rawValue)) return 0;
  if (Number.isFinite(expectedValue)) return financeOcrNumberNear(rawValue, expectedValue);
  const sign = rawValue < 0 ? -1 : 1;
  let value = Math.abs(rawValue);
  while (value > 100) value /= 10;
  return sign * value;
}

/**
 * 找最接近期望值的 OCR 数值候选
 * @param {number} rawValue - 原始值
 * @param {number} expectedValue - 期望值
 * @returns {number} 调整后的值
 */
function financeOcrNumberNear(rawValue, expectedValue) {
  if (!Number.isFinite(rawValue) || !Number.isFinite(expectedValue)) return rawValue;
  const sign = rawValue < 0 ? -1 : expectedValue < 0 ? -1 : 1;
  const raw = Math.abs(rawValue);
  const expected = Math.abs(expectedValue);
  const candidates = Array.from({ length: 7 }, (_, power) => raw / (10 ** power));
  const closest = candidates.reduce((best, value) =>
    Math.abs(value - expected) < Math.abs(best - expected) ? value : best, candidates[0]);
  return sign * closest;
}
