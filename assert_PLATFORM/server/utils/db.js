import { text } from "./validators.js";

const sqlRun = async (conn, sql, params = []) => {
  const [result] = await conn.execute(sql, params);
  return result;
};
const sqlAll = async (conn, sql, params = []) => {
  const [rows] = await conn.execute(sql, params);
  return rows;
};
const sqlGet = async (conn, sql, params = []) => {
  const [rows] = await conn.execute(sql, params);
  return rows[0] || null;
};
const maybeParseJson = (val, fallback) => {
  if (val === null || val === undefined) return fallback !== undefined ? fallback : val;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '[object Object]') return fallback !== undefined ? fallback : {};
    try {
      return JSON.parse(trimmed);
    } catch {
      console.warn('[maybeParseJson] Failed to parse JSON, using fallback');
      return fallback !== undefined ? fallback : {};
    }
  }
  return val;
};
const feedbackAttachments = (val) => {
  try {
    const list = maybeParseJson(val);
    if (!Array.isArray(list)) return [];
    return list
      .map((item) => text(item).trim())
      .filter((item) => /^data:image\/(png|jpe?g|webp);base64,/i.test(item))
      .slice(0, 6);
  } catch {
    return [];
  }
};

export { sqlRun, sqlAll, sqlGet, maybeParseJson, feedbackAttachments };
