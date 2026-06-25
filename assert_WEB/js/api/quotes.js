/**
 * 行情数据模块
 * 提供实时行情、K线数据和交易标记功能
 */

import { apiRequest } from "./request.js";

// 实时行情缓存
const realtimeQuoteMap = {};

// K线数据缓存
const klineDataCache = {};

/**
 * 获取实时行情缓存
 * @returns {object} 实时行情映射表
 */
export function getRealtimeQuoteMap() {
  return realtimeQuoteMap;
}

/**
 * 获取K线数据缓存
 * @returns {object} K线数据缓存
 */
export function getKlineDataCache() {
  return klineDataCache;
}

/**
 * 获取实时行情
 * @param {Array} financeAssets - 金融资产列表
 * @param {function} applyRealtimeQuotesFn - 应用实时行情的函数
 * @param {function} saveStateFn - 保存状态的函数
 * @param {function} renderFn - 渲染函数
 * @returns {Promise<void>}
 */
export async function fetchRealtimeQuotes(financeAssets, applyRealtimeQuotesFn, saveStateFn, renderFn) {
  const quotedAssets = (financeAssets || []).filter((asset) =>
    ["stock", "fund"].includes(asset.kind) && asset.code);
  if (!quotedAssets.length) return;

  const codes = quotedAssets.map((a) => ({
    code: a.code,
    market: a.market || "domestic",
  }));

  try {
    const data = await apiRequest("/finance/quotes", {
      method: "POST",
      body: { codes },
    });
    const quotes = data.quotes || [];

    // Build map: code -> quote data
    for (let i = 0; i < codes.length; i++) {
      const q = quotes[i];
      if (q && q.price != null && q.price > 0) {
        realtimeQuoteMap[codes[i].code] = {
          price: q.price,
          changePct: q.changePct,
          changeAmt: q.changeAmt,
          prevClose: q.prevClose,
          name: q.name,
        };
      }
    }

    if (applyRealtimeQuotesFn) applyRealtimeQuotesFn();
    if (saveStateFn) await saveStateFn();
    if (renderFn) renderFn();
  } catch (error) {
    console.warn("实时行情刷新失败", error);
  }
}

/**
 * 获取K线数据
 * @param {string} code - 证券代码
 * @param {string} market - 市场类型
 * @param {string} range - 时间范围 (3m, 6m, 1y, all)
 * @param {string} apiBase - API基础地址
 * @param {string} token - 认证令牌
 * @returns {Promise<Array>} K线数据
 */
export async function fetchKlineData(code, market, range, apiBase, token) {
  const cacheKey = `${code}_${range}`;
  const cached = klineDataCache[cacheKey];
  if (cached && Date.now() - cached.ts < 300000) return cached.data;

  const end = new Date().toISOString().slice(0, 10);
  let start = "", count = 320;
  if (range === "3m") { start = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10); count = 90; }
  else if (range === "6m") { start = new Date(Date.now() - 180 * 864e5).toISOString().slice(0, 10); count = 180; }
  else if (range === "1y") { start = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10); count = 320; }
  else { count = 800; }

  const url = `${apiBase}/finance/kline?code=${encodeURIComponent(code)}&market=${encodeURIComponent(market)}&start=${start}&end=${end}&count=${count}`;
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error("K-line fetch failed");
  const data = await resp.json();
  klineDataCache[cacheKey] = { data, ts: Date.now() };
  return data;
}

/**
 * 计算移动平均线
 * @param {Array} klineData - K线数据
 * @param {number} period - 周期
 * @returns {Array} MA值数组
 */
export function calculateMA(klineData, period) {
  const result = [];
  for (let i = 0; i < klineData.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += parseFloat(klineData[j][2]);
    result.push(+(sum / period).toFixed(2));
  }
  return result;
}

/**
 * 准备交易标记
 * @param {object} asset - 资产对象
 * @param {Array} klineDates - K线日期数组
 * @param {Array} klineData - K线数据
 * @returns {Array} 交易标记数组
 */
export function prepareTransactionMarkers(asset, klineDates, klineData) {
  const txns = (asset.transactions || []).slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const effectiveTxns = txns.length > 0 ? txns : [{
    direction: "buy",
    date: klineDates[0] || new Date().toISOString().slice(0, 10),
    price: Number(asset.costPrice) || 0,
    shares: Number(asset.shares) || 0,
  }];
  const byDate = new Map();
  for (const txn of effectiveTxns) {
    if (!byDate.has(txn.date)) byDate.set(txn.date, []);
    byDate.get(txn.date).push(txn);
  }
  const dateIdx = new Map(klineDates.map((d, i) => [d, i]));
  const markers = [];
  byDate.forEach((txns, dt) => {
    const idx = dateIdx.get(dt);
    if (idx == null) return;
    const hasBuy = txns.some(t => t.direction === "buy");
    const hasSell = txns.some(t => t.direction === "sell");
    const closePrice = parseFloat(klineData[idx]?.[2]) || 0;
    if (hasBuy && hasSell) {
      markers.push({ type: "T", index: idx, date: dt, price: closePrice });
    } else {
      const dir = hasBuy ? "buy" : "sell";
      const rel = txns.filter(t => t.direction === dir);
      const totalAmt = rel.reduce((s, t) => s + (Number(t.price) * Number(t.shares)), 0);
      const totalSh = rel.reduce((s, t) => s + Number(t.shares), 0);
      const avgPrice = totalSh > 0 ? totalAmt / totalSh : Number(rel[0].price) || closePrice;
      markers.push({ type: dir, index: idx, date: dt, price: avgPrice });
    }
  });
  return markers;
}
