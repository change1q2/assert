/**
 * 文本清洗：过滤 GBK↔UTF-8 转换错误导致的乱码字符
 * 用法：sanitizeText(raw, '-')，第二个参数为清洗后为空时的兜底值
 */
export function sanitizeText(str, fallback = '') {
  try {
    if (str === null || str === undefined) return fallback;
    if (typeof str !== 'string') str = String(str);
    const trimmed = str.trim();
    if (!trimmed) return fallback;
    let cleaned = trimmed;
    // 移除 UTF-8 替换符
    cleaned = cleaned.replace(/\uFFFD/g, '');
    // 移除常见 GBK 误读乱码块
    cleaned = cleaned.replace(/锟斤拷/g, '').replace(/烫+/g, '').replace(/[虉锘鍦]/g, '');
    // 移除私用区乱码
    cleaned = cleaned.replace(/[\uE000-\uF8FF]/g, '');
    cleaned = cleaned.replace(/[\uFFF0-\uFFFF]/g, '');
    if (!cleaned.trim()) return fallback;
    // 检测：若含大量非常见字符，判定为乱码
    let commonCount = 0;
    for (const ch of cleaned) {
      const code = ch.charCodeAt(0);
      const isCommon =
        (code >= 0x4e00 && code <= 0x9fff) || // CJK 统一汉字
        (code >= 0x3000 && code <= 0x303f) || // CJK 符号和标点
        (code >= 0xff00 && code <= 0xffef) || // 全角字母和全角符号
        (code >= 0x20 && code <= 0x7e) ||     // 可打印 ASCII
        (code >= 0xa0 && code <= 0xff);       // 拉丁-1 补充
      if (isCommon) commonCount++;
    }
    if (cleaned.length > 0 && commonCount / cleaned.length < 0.5) {
      return fallback;
    }
    return cleaned.trim() || fallback;
  } catch (e) {
    return fallback;
  }
}

export default sanitizeText;
