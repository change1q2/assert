/**
 * 文本清洗：过滤 GBK↔UTF-8 转换错误导致的乱码字符（锟斤拷\uFFFD等）
 * 用法：sanitizeText(raw, '-')，第二个参数为清洗后为空时的兜底值
 */
export function sanitizeText(str, fallback = '') {
  if (typeof str !== 'string') {
    if (str === null || str === undefined) return fallback;
    return String(str);
  }
  const trimmed = str.trim();
  if (!trimmed) return fallback;
  // 移除 UTF-8 替换符 \uFFFD
  let cleaned = trimmed.replace(/\uFFFD/g, '');
  // 移除常见 GBK 误读乱码块：锟斤拷、烫烫烫、虉、锘、鍦 等
  cleaned = cleaned.replace(/锟斤拷/g, '').replace(/烫+/g, '').replace(/[虉锘鍦]/g, '');
  // 移除孤立的乱码字形（私用区 / 空块）
  cleaned = cleaned.replace(/[\uE000-\uF8FF\uFFF0-\uFFFF]/g, '');
  if (!cleaned.trim()) return fallback;
  // 检测：若含大量非可打印/非常见字符，判定为乱码
  const commonCharRegex = /[\u4e00-\u9fff\u3000-\u303fa-zA-Z0-9\s.,;:!?'""''()（）【】《》\-/&%.·\-_·\\+=@#|:<>~\[\]{}，。、；：""''！？、￥…（）《》\d]/;
  let commonCount = 0;
  for (const ch of cleaned) {
    if (commonCharRegex.test(ch)) commonCount++;
  }
  if (cleaned.length > 0 && commonCount / cleaned.length < 0.5) {
    return fallback;
  }
  const result = cleaned.trim();
  return result || fallback;
}

export default sanitizeText;
