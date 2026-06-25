import { PREMIUM_API_URL } from "../config/index.js";

let premiumMarketCache = {
  expiresAt: 0,
  payload: null,
};
let premiumMarketRefreshPromise = null;

function marketNumber(value) {
  const normalized = String(value ?? "").replace("%", "").replace(",", "").trim();
  if (!normalized || normalized === "-") return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function premiumReference(cell) {
  const directPremium = marketNumber(cell.iopv_discount_rt ?? cell.discount_rt);
  const price = marketNumber(cell.price);
  const iopv = marketNumber(cell.iopv);
  const estimate = marketNumber(cell.estimate_value);
  const nav = marketNumber(cell.fund_nav);
  if (directPremium !== null) {
    const reference = price && directPremium > -99 ? price / (1 + directPremium / 100) : iopv || estimate || nav;
    return { reference, premiumRate: directPremium, basis: iopv ? "IOPV" : "实时估值" };
  }
  if (price === null) return { reference: null, premiumRate: null, basis: "暂无参考" };
  if (iopv !== null) {
    return { reference: iopv, premiumRate: (price / iopv - 1) * 100, basis: "IOPV" };
  }
  if (estimate !== null) {
    return { reference: estimate, premiumRate: (price / estimate - 1) * 100, basis: "实时估值" };
  }
  if (nav !== null) {
    const referenceChange = marketNumber(
      cell.est_val_increase_rt
      ?? cell.ref_increase_rt
      ?? cell.index_increase_rt
      ?? cell.stock_increase_rt,
    );
    const adjustedNav = referenceChange === null ? nav : nav * (1 + referenceChange / 100);
    return {
      reference: adjustedNav,
      premiumRate: (price / adjustedNav - 1) * 100,
      basis: referenceChange === null ? "最新净值" : "指数估算",
    };
  }
  return { reference: null, premiumRate: null, basis: "暂无参考" };
}

function normalizePremiumRowNew(row) {
  if (!row || row.length < 7) return null;
  
  const code = String(row[0] || "").trim();
  const direction = String(row[1] || "");
  const name = String(row[2] || "").trim();
  const applyLimit = parseFloat(String(row[3] || "0")) || 0;
  const t0Nav = parseFloat(String(row[4] || "0")) || 0;
  const price = parseFloat(String(row[5] || "0")) || 0;
  const premiumRate = parseFloat(String(row[6] || "0")) || 0;
  
  if (!code || !name || price === 0) return null;
  
  const isETF = code.toLowerCase().includes('etf') || 
                name.includes('ETF') || 
                (!code.startsWith('16') && !code.startsWith('15'));
  const type = isETF ? 'ETF' : 'LOF';
  
  const directionLower = direction.toLowerCase();
  
  let dataType2 = '其他国家标的';
  
  if (directionLower.includes('美国') || 
      directionLower.includes('美股') || 
      directionLower.includes('纳斯达克') || 
      directionLower.includes('标普') ||
      directionLower.includes('美元')) {
    dataType2 = '美国标的';
  }
  else if (directionLower.includes('原油') || 
           directionLower.includes('oil') ||
           directionLower.includes('能源')) {
    dataType2 = '原油';
  }
  else if (directionLower.includes('黄金') || 
           directionLower.includes('gold')) {
    dataType2 = '黄金';
  }
  else if (directionLower.includes('白银') || 
           directionLower.includes('silver')) {
    dataType2 = '白银';
  }
  else if (directionLower.includes('商品') || 
           directionLower.includes('大宗') ||
           directionLower.includes('豆粕') ||
           directionLower.includes('黄')) {
    dataType2 = '其他商品';
  }
  
  const premiumRatePercent = premiumRate * 100;
  
  const canArbitrage = premiumRatePercent > 4 && applyLimit !== 0;
  
  const status = premiumRatePercent > 0.5 ? "premium" : premiumRatePercent < -0.5 ? "discount" : "flat";
  
  let transferRecommend = { level: 'none', text: '不需要转出', color: 'gray' };
  
  if (premiumRatePercent > 20) {
    transferRecommend = { level: 'must-sell', text: '必须转出', color: 'red' };
  } else if (premiumRatePercent > 10) {
    transferRecommend = { level: 'suggest-sell', text: '建议转出', color: 'orange' };
  } else if (premiumRatePercent > 6) {
    transferRecommend = { level: 'can-sell', text: '可以转出', color: 'yellow' };
  } else if (premiumRatePercent > 4) {
    transferRecommend = { level: 'no-action', text: '不需要转出', color: 'gray' };
  } else if (premiumRatePercent > -3) {
    transferRecommend = { level: 'normal', text: '正常持有', color: 'gray' };
  } else if (premiumRatePercent > -10) {
    transferRecommend = { level: 'suggest-buy', text: '建议转入', color: 'green-light' };
  } else {
    transferRecommend = { level: 'strong-buy', text: '强烈转入', color: 'green' };
  }
  
  return {
    code: code,
    direction: direction,
    name: name,
    type: type,
    dataType2: dataType2,
    applyLimit: applyLimit,
    t0Nav: t0Nav,
    price: price,
    premiumRate: premiumRatePercent,
    canArbitrage: canArbitrage,
    status: status,
    transferRecommend: transferRecommend,
  };
}

function normalizePremiumRow(cell, source) {
  const price = marketNumber(cell.price);
  const reference = premiumReference(cell);
  if (!cell.fund_id || !cell.fund_nm || price === null || reference.premiumRate === null) return null;
  const premiumRate = Number(reference.premiumRate.toFixed(4));
  return {
    code: String(cell.fund_id),
    name: String(cell.fund_nm),
    category: source.label,
    market: String(cell.fund_id).startsWith("5") ? "上交所" : "深交所",
    price,
    changeRate: marketNumber(cell.increase_rt) ?? 0,
    referenceNav: reference.reference === null ? null : Number(reference.reference.toFixed(4)),
    premiumRate,
    premiumBasis: reference.basis,
    navDate: String(cell.nav_dt || cell.iopv_dt || cell.est_val_dt || "-"),
    quoteTime: String(cell.last_time || cell.last_est_time || "-"),
    applyStatus: String(cell.apply_status || "-"),
    redeemStatus: String(cell.redeem_status || "-"),
    status: premiumRate > 0.5 ? "premium" : premiumRate < -0.5 ? "discount" : "flat",
  };
}

async function fetchPremiumMarket(force = false) {
  const now = Date.now();
  if (!force && premiumMarketCache.payload && premiumMarketCache.expiresAt > now) {
    return { ...premiumMarketCache.payload, cached: true };
  }
  try {
    const response = await fetch(PREMIUM_API_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PersonalAssetPlatform/1.8)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error(`行情源返回 ${response.status}`);
    const data = await response.json();
    
    const values = data.values || [];
    if (values.length < 2) {
      if (premiumMarketCache.payload) return { ...premiumMarketCache.payload, cached: true, stale: true };
      throw new Error("数据格式不正确");
    }
    
    const rows = values.slice(1)
      .map((row) => normalizePremiumRowNew(row))
      .filter(Boolean);
    
    const sortedRows = rows.sort((a, b) => b.premiumRate - a.premiumRate);
    const payload = {
      rows: sortedRows,
      fetchedAt: data.timestamp || new Date().toISOString(),
      source: "Sea叔",
      sourceCount: 1,
      failedSources: 0,
    };
    premiumMarketCache = {
      expiresAt: now + 30_000,
      payload,
    };
    return payload;
  } catch (error) {
    if (premiumMarketCache.payload) {
      return { ...premiumMarketCache.payload, cached: true, stale: true };
    }
    throw new Error(`行情获取失败: ${error.message}`);
  }
}

function refreshPremiumMarketInBackground() {
  if (premiumMarketRefreshPromise) return premiumMarketRefreshPromise;
  premiumMarketRefreshPromise = fetchPremiumMarket(true)
    .catch((error) => {
      console.warn("Premium market refresh failed:", error.message);
      return premiumMarketCache.payload;
    })
    .finally(() => {
      premiumMarketRefreshPromise = null;
    });
  return premiumMarketRefreshPromise;
}

function getPremiumCache() {
  return premiumMarketCache;
}

export {
  marketNumber,
  premiumReference,
  normalizePremiumRowNew,
  normalizePremiumRow,
  fetchPremiumMarket,
  refreshPremiumMarketInBackground,
  getPremiumCache,
};
