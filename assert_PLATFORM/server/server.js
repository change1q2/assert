import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.resolve(__dirname, "..", "..", "assert_WEB");
const releasesRoot = process.env.RELEASES_ROOT
  ? path.resolve(process.env.RELEASES_ROOT)
  : path.resolve(__dirname, "..", "releases");
const releasePlatforms = [
  ["web", "Web"],
  ["pc", "PC（Windows）"],
  ["android", "Android"],
  ["ios", "iOS"],
  ["harmony", "HarmonyOS"],
];

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "123456",
  database: process.env.MYSQL_DATABASE || "asset_platform",
  waitForConnections: true,
  connectionLimit: 10,
  multipleStatements: true,
  dateStrings: true,
});

// Initialize database schema
const schemaSql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
const initDb = pool.query(schemaSql).then(async () => {
  // Ensure fee_config_json column exists on user_settings (safe migration)
  try {
    await pool.query("ALTER TABLE user_settings ADD COLUMN fee_config_json JSON AFTER finance_asset_draft_json");
    console.log("Added fee_config_json column to user_settings");
  } catch (_) { /* column already exists */ }
  try {
    await pool.query("ALTER TABLE user_settings ADD COLUMN overview_goals_json JSON AFTER fee_config_json");
    console.log("Added overview_goals_json column to user_settings");
  } catch (_) { /* column already exists */ }
  try {
    await pool.query("ALTER TABLE user_settings ADD COLUMN hk_ipo_rules_json JSON AFTER overview_goals_json");
    console.log("Added hk_ipo_rules_json column to user_settings");
  } catch (_) { /* column already exists */ }
  try {
    await pool.query("ALTER TABLE feedback ADD COLUMN attachments_json JSON AFTER content");
    console.log("Added attachments_json column to feedback");
  } catch (_) { /* column already exists */ }
  const financeAssetColumns = [
    ["available_shares", "DOUBLE NOT NULL DEFAULT 0 AFTER shares"],
    ["current_price", "DOUBLE NOT NULL DEFAULT 0 AFTER available_shares"],
    ["pnl_percent", "DOUBLE NOT NULL DEFAULT 0 AFTER pnl"],
    ["avg_buy_price", "DOUBLE NOT NULL DEFAULT 0 AFTER pnl_percent"],
    ["holding_days", "DOUBLE NOT NULL DEFAULT 0 AFTER avg_buy_price"],
    ["position_weight", "DOUBLE NOT NULL DEFAULT 0 AFTER holding_days"],
    ["total_fees", "DOUBLE NOT NULL DEFAULT 0 AFTER position_weight"],
    ["today_pnl", "DOUBLE NOT NULL DEFAULT 0 AFTER total_fees"],
    ["today_pnl_percent", "DOUBLE NOT NULL DEFAULT 0 AFTER today_pnl"],
  ];
  for (const [column, definition] of financeAssetColumns) {
    try {
      await pool.query(`ALTER TABLE finance_assets ADD COLUMN ${column} ${definition}`);
      console.log(`Added ${column} column to finance_assets`);
    } catch (_) { /* column already exists */ }
  }
  const syncColumns = [
    ["accounts", "sync_version", "BIGINT NOT NULL DEFAULT 0"],
    ["accounts", "deleted_at", "DATETIME NULL DEFAULT NULL"],
    ["accounts", "origin_device_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["accounts", "client_op_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["asset_classes", "sync_version", "BIGINT NOT NULL DEFAULT 0"],
    ["asset_classes", "deleted_at", "DATETIME NULL DEFAULT NULL"],
    ["asset_classes", "origin_device_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["asset_classes", "client_op_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["records", "sync_version", "BIGINT NOT NULL DEFAULT 0"],
    ["records", "deleted_at", "DATETIME NULL DEFAULT NULL"],
    ["records", "origin_device_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["records", "client_op_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["finance_assets", "sync_version", "BIGINT NOT NULL DEFAULT 0"],
    ["finance_assets", "deleted_at", "DATETIME NULL DEFAULT NULL"],
    ["finance_assets", "origin_device_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["finance_assets", "client_op_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["finance_asset_transactions", "sync_version", "BIGINT NOT NULL DEFAULT 0"],
    ["finance_asset_transactions", "deleted_at", "DATETIME NULL DEFAULT NULL"],
    ["finance_asset_transactions", "origin_device_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["finance_asset_transactions", "client_op_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["debts", "sync_version", "BIGINT NOT NULL DEFAULT 0"],
    ["debts", "deleted_at", "DATETIME NULL DEFAULT NULL"],
    ["debts", "origin_device_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["debts", "client_op_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["debt_payments", "sync_version", "BIGINT NOT NULL DEFAULT 0"],
    ["debt_payments", "deleted_at", "DATETIME NULL DEFAULT NULL"],
    ["debt_payments", "origin_device_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["debt_payments", "client_op_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["feedback", "sync_version", "BIGINT NOT NULL DEFAULT 0"],
    ["feedback", "deleted_at", "DATETIME NULL DEFAULT NULL"],
    ["feedback", "origin_device_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["feedback", "client_op_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
  ];
  for (const [table, column, definition] of syncColumns) {
    try {
      await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      console.log(`Added ${column} column to ${table}`);
    } catch (_) { /* column already exists */ }
  }
  console.log("MySQL schema initialized");
}).catch((err) => {
  console.error("Failed to initialize MySQL schema:", err.message);
  process.exit(1);
});

const PORT = Number(process.env.API_PORT || 3000);
const TOKEN_TTL_DAYS = 30;
const SMS_CODE_TTL_MINUTES = 5;
const SMS_RESEND_SECONDS = 60;
const allowedOrigins = new Set([
  "http://127.0.0.1:4173",
  "http://localhost:4173",
  "http://119.28.189.98",
  ...(process.env.EXTRA_ORIGINS ? process.env.EXTRA_ORIGINS.split(",") : []),
]);
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".exe": "application/vnd.microsoft.portable-executable",
  ".zip": "application/zip",
  ".apk": "application/vnd.android.package-archive",
  ".aab": "application/octet-stream",
  ".ipa": "application/octet-stream",
  ".hap": "application/octet-stream",
};
const PREMIUM_API_URL = "http://8.220.240.126:8787/api/latest-lite";
let premiumMarketCache = {
  expiresAt: 0,
  payload: null,
};
let premiumMarketRefreshPromise = null;
let hkIpoCache = {
  sourceMtimeMs: 0,
  payload: null,
};
let hkIpoBigVNetworkCache = {
  key: "",
  fetchedAt: 0,
  rows: [],
};

const HK_IPO_DATA_SOURCES = [
  {
    name: "港交所披露易 HKEXnews",
    tier: "官方权威",
    access: "公开网页",
    url: "https://www.hkexnews.hk",
    fields: "招股书、申请版本、聆讯后资料集、招股章程、公告",
    usage: "原文核验，以公告和招股书为最终依据",
    autoCheck: "部分字段可公开搜索校验",
  },
  {
    name: "港交所新上市资料页",
    tier: "官方权威",
    access: "公开网页",
    url: "https://www2.hkexnews.hk/New-Listings/New-Listing-Information/Main-Board",
    fields: "递表、聆讯、招股、上市资料",
    usage: "状态、上市流程和原始文件校验",
    autoCheck: "部分字段可公开搜索校验",
  },
  {
    name: "港交所新上市证券一览",
    tier: "官方权威",
    access: "公开网页",
    url: "https://www.hkex.com.hk/Services/Trading/Securities/Trading-News/Newly-Listed-Securities",
    fields: "代码、买卖单位、上市日期",
    usage: "代码、上市日期、买卖单位校验",
    autoCheck: "部分字段可公开搜索校验",
  },
  {
    name: "SFC 公众纪录册",
    tier: "官方权威",
    access: "公开网页",
    url: "https://www.sfc.hk/TC/Regulatory-functions/Intermediaries/Licensing/Register-of-licensed-persons-and-registered-institutions",
    fields: "保荐人、中介机构持牌状态",
    usage: "保荐人和中介机构资质校验",
    autoCheck: "需按机构名称人工/半自动核验",
  },
  {
    name: "富途牛牛新股中心",
    tier: "券商/App",
    access: "App/登录",
    url: "App 内：市场 -> 港股 -> 新股中心",
    fields: "招股列表、孖展、暗盘、中签查询、预测一手中签率",
    usage: "打新操作和券商侧预测数据参考",
    autoCheck: "需登录或 App 环境，暂不自动抓取",
  },
  {
    name: "老虎证券新股申购",
    tier: "券商/App",
    access: "App/登录",
    url: "App 内：发现 -> 新股申购",
    fields: "申购、杠杆、暗盘、截止时间",
    usage: "券商申购条件和截止时间参考",
    autoCheck: "需登录或 App 环境，暂不自动抓取",
  },
  {
    name: "盈透证券 IPO 日历",
    tier: "券商/App",
    access: "网页/登录",
    url: "https://www.interactivebrokers.com",
    fields: "IPO 日历、保证金购买力",
    usage: "国际券商侧日历和账户能力参考",
    autoCheck: "需登录，暂不自动抓取",
  },
  {
    name: "经济通 ETNet IPO",
    tier: "第三方聚合",
    access: "公开网页",
    url: "http://stocks.etnet.hk/www/sc/stocks/ci_ipo.php",
    fields: "发行价、入场费、超购倍数、基石投资者、行业对比",
    usage: "快速对比和字段交叉校验",
    autoCheck: "刷新时纳入公开搜索校验",
  },
  {
    name: "阿斯达克 AASTOCKS",
    tier: "第三方聚合",
    access: "公开网页",
    url: "https://aastocks.com/",
    fields: "保荐人历史战绩、首日涨幅、破发率、护盘能力",
    usage: "保荐人和上市表现辅助评分",
    autoCheck: "刷新时纳入公开搜索校验",
  },
  {
    name: "智通财经新股专题",
    tier: "第三方聚合",
    access: "公开网页",
    url: "https://www.zhitongcaijing.com/shares.html",
    fields: "递表、聆讯、招股、暗盘、上市新闻",
    usage: "状态和新闻时效校验",
    autoCheck: "刷新时纳入公开搜索校验",
  },
  {
    name: "捷利交易宝",
    tier: "第三方聚合",
    access: "公开网页/App",
    url: "https://www.tradegomart.com/tradeGodownload",
    fields: "孖展倍数、暗盘行情、配售结果、基石、绿鞋、保荐人",
    usage: "基石占比、绿鞋、配售和暗盘数据重点校验",
    autoCheck: "刷新时纳入公开搜索校验",
  },
  {
    name: "AiPO 数据网",
    tier: "第三方聚合",
    access: "公开网页",
    url: "https://aipo.myiqdii.com/",
    fields: "孖展资金分布、券商息率、杠杆策略",
    usage: "孖展和资金效率策略校验",
    autoCheck: "刷新时纳入公开搜索校验",
  },
  {
    name: "广发香港新股日历",
    tier: "人工资料",
    access: "公众号",
    url: "公众号：广发香港财富管理",
    fields: "招股中、通过聆讯、近期上市表现",
    usage: "月度人工复核",
    autoCheck: "公众号内容不自动抓取",
  },
];

const json = (res, status, payload, origin = "") => {
  if (allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
};

const readBody = (req) => new Promise((resolve, reject) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 10 * 1024 * 1024) reject(new Error("请求内容过大"));
  });
  req.on("end", () => {
    try {
      resolve(body ? JSON.parse(body) : {});
    } catch {
      reject(new Error("JSON 格式不正确"));
    }
  });
  req.on("error", reject);
});

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
  // New data format: [代码, 投资方向, 名称, LOF基金申购上限, T0净值模拟, 现价, 实时溢价率]
  if (!row || row.length < 7) return null;
  
  const code = String(row[0] || "").trim();
  const direction = String(row[1] || "");
  const name = String(row[2] || "").trim();
  const applyLimit = parseFloat(String(row[3] || "0")) || 0;
  const t0Nav = parseFloat(String(row[4] || "0")) || 0;
  const price = parseFloat(String(row[5] || "0")) || 0;
  const premiumRate = parseFloat(String(row[6] || "0")) || 0;
  
  if (!code || !name || price === 0) return null;
  
  // Determine type (LOF or ETF) from code
  const isETF = code.toLowerCase().includes('etf') || 
                name.includes('ETF') || 
                (!code.startsWith('16') && !code.startsWith('15'));
  const type = isETF ? 'ETF' : 'LOF';
  
  // Determine dataType2 based on direction
  const directionLower = direction.toLowerCase();
  
  let dataType2 = '其他国家标的'; // default
  
  // Check for US markets
  if (directionLower.includes('美国') || 
      directionLower.includes('美股') || 
      directionLower.includes('纳斯达克') || 
      directionLower.includes('标普') ||
      directionLower.includes('美元')) {
    dataType2 = '美国标的';
  }
  // Check for commodity - crude oil
  else if (directionLower.includes('原油') || 
           directionLower.includes('oil') ||
           directionLower.includes('能源')) {
    dataType2 = '原油';
  }
  // Check for commodity - gold
  else if (directionLower.includes('黄金') || 
           directionLower.includes('gold')) {
    dataType2 = '黄金';
  }
  // Check for commodity - silver
  else if (directionLower.includes('白银') || 
           directionLower.includes('silver')) {
    dataType2 = '白银';
  }
  // Check for other commodities
  else if (directionLower.includes('商品') || 
           directionLower.includes('大宗') ||
           directionLower.includes('豆粕') ||
           directionLower.includes('黄')) {
    dataType2 = '其他商品';
  }
  
  // Convert premiumRate to percentage first
  const premiumRatePercent = premiumRate * 100;
  
  // Check if arbitrage is possible: premium > 4% and applyLimit != 0
  const canArbitrage = premiumRatePercent > 4 && applyLimit !== 0;
  
  // Determine status based on premium rate
  const status = premiumRatePercent > 0.5 ? "premium" : premiumRatePercent < -0.5 ? "discount" : "flat";
  
  // Determine transfer recommendation
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
    // -3% to 4%: normal range
    transferRecommend = { level: 'normal', text: '正常持有', color: 'gray' };
  } else if (premiumRatePercent > -10) {
    // -10% to -3%: suggest buy
    transferRecommend = { level: 'suggest-buy', text: '建议转入', color: 'green-light' };
  } else {
    // < -10%: strongly buy
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
    
    // Parse the new data format
    const values = data.values || [];
    if (values.length < 2) {
      if (premiumMarketCache.payload) return { ...premiumMarketCache.payload, cached: true, stale: true };
      throw new Error("数据格式不正确");
    }
    
    const rows = values.slice(1) // Skip header row
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
      expiresAt: now + 30_000, // Cache for 30 seconds
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

function serveStatic(url, res) {
  const requestPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const resolved = path.resolve(publicRoot, `.${requestPath}`);
  const filePath = resolved.startsWith(`${publicRoot}${path.sep}`) && fs.existsSync(resolved) && fs.statSync(resolved).isFile()
    ? resolved
    : path.join(publicRoot, "index.html");
  const extension = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": mimeTypes[extension] || "application/octet-stream",
    "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=3600",
  });
  fs.createReadStream(filePath).pipe(res);
}

function safeReleasePlatform(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

function safeReleaseFileName(value) {
  return String(value || "").replace(/[^a-zA-Z0-9._-]/g, "");
}

function releaseDir(platform) {
  return path.join(releasesRoot, platform);
}

function releaseManifestPath(platform) {
  return path.join(releaseDir(platform), "manifest.json");
}

function defaultReleaseManifest(platform) {
  return {
    platform,
    platformLabel: Object.fromEntries(releasePlatforms)[platform] || platform,
    updatedAt: "",
    latest: null,
    history: [],
  };
}

function readReleaseManifest(platform) {
  const filePath = releaseManifestPath(platform);
  if (!fs.existsSync(filePath)) return defaultReleaseManifest(platform);
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return {
      ...defaultReleaseManifest(platform),
      ...raw,
      platform,
      history: Array.isArray(raw.history) ? raw.history : [],
    };
  } catch {
    return defaultReleaseManifest(platform);
  }
}

function normalizeReleaseEntry(platform, entry) {
  if (!entry) return null;
  const fileName = safeReleaseFileName(entry.fileName);
  return {
    platform,
    platformLabel: Object.fromEntries(releasePlatforms)[platform] || platform,
    version: String(entry.version || ""),
    buildNumber: String(entry.buildNumber || ""),
    fileName,
    fileUrl: fileName ? `/api/v2/releases/file/${platform}/${encodeURIComponent(fileName)}` : String(entry.fileUrl || ""),
    fileSize: Number(entry.fileSize || 0),
    publishedAt: String(entry.publishedAt || ""),
    releaseNotes: String(entry.releaseNotes || ""),
    isLatest: Boolean(entry.isLatest),
    minSystemVersion: String(entry.minSystemVersion || ""),
    sha256: String(entry.sha256 || ""),
    distribution: String(entry.distribution || "direct"),
  };
}

function loadReleaseCatalog() {
  return releasePlatforms.map(([platform]) => {
    const manifest = readReleaseManifest(platform);
    const history = (manifest.history || [])
      .map((entry) => normalizeReleaseEntry(platform, entry))
      .filter(Boolean);
    const latest = history.find((entry) => entry.isLatest) || history[0] || null;
    return {
      ...manifest,
      platform,
      platformLabel: Object.fromEntries(releasePlatforms)[platform] || platform,
      latest,
      history,
      updatedAt: manifest.updatedAt || latest?.publishedAt || "",
    };
  });
}

function serveReleaseFile(platform, fileName, res) {
  const safePlatform = safeReleasePlatform(platform);
  const safeFileName = safeReleaseFileName(fileName);
  const filePath = path.join(releaseDir(safePlatform), "packages", safeFileName);
  if (!safePlatform || !safeFileName || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ message: "安装包不存在。" }));
    return;
  }
  const extension = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": mimeTypes[extension] || "application/octet-stream",
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(safeFileName)}`,
    "Cache-Control": "public, max-age=300",
  });
  fs.createReadStream(filePath).pipe(res);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, expected] = String(stored).split(":");
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(actual, Buffer.from(expected, "hex"));
}

// ─── MySQL helpers ───
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
const maybeParseJson = (val) => {
  if (val === null || val === undefined) return val;
  if (typeof val === "string") return JSON.parse(val);
  return val; // mysql2 auto-parses JSON columns
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
const fmtDt = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

async function issueToken(userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = fmtDt(new Date(Date.now() + TOKEN_TTL_DAYS * 86400000));
  await sqlRun(pool, "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)", [tokenHash, userId, expiresAt]);
  return token;
}

async function userByPhone(phone) {
  return sqlGet(pool, `
    SELECT users.id, users.account, users.password_hash
    FROM users JOIN user_profiles ON user_profiles.user_id = users.id
    WHERE user_profiles.phone = ?
    ORDER BY users.id
    LIMIT 1
  `, [phone]);
}

function verificationCodeHash(phone, purpose, code) {
  return crypto.createHash("sha256").update(`${phone}:${purpose}:${code}`).digest("hex");
}

async function createSmsCode(phone, purpose) {
  const previous = await sqlGet(pool, `
    SELECT created_at FROM sms_verification_codes
    WHERE phone = ? AND purpose = ?
    ORDER BY id DESC LIMIT 1
  `, [phone, purpose]);
  if (previous && Date.now() - new Date(`${previous.created_at}Z`).getTime() < SMS_RESEND_SECONDS * 1000) {
    throw new Error("验证码发送过于频繁，请稍后再试。");
  }
  const code = String(crypto.randomInt(100000, 1000000));
  const expiresAt = fmtDt(new Date(Date.now() + SMS_CODE_TTL_MINUTES * 60000));
  await sqlRun(pool, `
    INSERT INTO sms_verification_codes (phone, purpose, code_hash, expires_at)
    VALUES (?, ?, ?, ?)
  `, [phone, purpose, verificationCodeHash(phone, purpose, code), expiresAt]);
  return code;
}

async function verifySmsCode(phone, purpose, code) {
  const row = await sqlGet(pool, `
    SELECT id, code_hash, expires_at FROM sms_verification_codes
    WHERE phone = ? AND purpose = ? AND used_at = ''
    ORDER BY id DESC LIMIT 1
  `, [phone, purpose]);
  if (!row || new Date(row.expires_at) <= new Date()) return false;
  const actual = Buffer.from(verificationCodeHash(phone, purpose, code), "hex");
  const expected = Buffer.from(row.code_hash, "hex");
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return false;
  await sqlRun(pool, "UPDATE sms_verification_codes SET used_at = ? WHERE id = ?", [fmtDt(new Date()), row.id]);
  return true;
}

async function deliverSmsCode(phone, code, purpose) {
  const webhook = process.env.SMS_WEBHOOK_URL;
  if (!webhook) {
    console.log(`[SMS development] ${phone} ${purpose}: ${code}`);
    return false;
  }
  const response = await fetch(webhook, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.SMS_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.SMS_WEBHOOK_TOKEN}` } : {}),
    },
    body: JSON.stringify({ phone, code, purpose, expiresInMinutes: SMS_CODE_TTL_MINUTES }),
  });
  if (!response.ok) throw new Error("短信服务发送失败，请稍后重试。");
  return true;
}

async function authenticatedUser(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const row = await sqlGet(pool, `
    SELECT users.id, users.account
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `, [tokenHash, fmtDt(new Date())]);
  return row ? { ...row, tokenHash } : null;
}

async function authenticatedAdmin(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  // Check admin session first
  const adminRow = await sqlGet(pool, `
    SELECT admin_users.id, admin_users.username
    FROM admin_sessions JOIN admin_users ON admin_users.id = admin_sessions.admin_id
    WHERE admin_sessions.token_hash = ? AND admin_sessions.expires_at > ?
  `, [tokenHash, fmtDt(new Date())]);
  if (adminRow) return { ...adminRow, tokenHash };
  // Fallback: check if this is a user token belonging to an admin user
  const userRow = await sqlGet(pool, `
    SELECT users.id, users.account
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `, [tokenHash, fmtDt(new Date())]);
  if (userRow) {
    const isAdmin = await sqlGet(pool, "SELECT id FROM admin_users WHERE username = ?", [userRow.account]);
    if (isAdmin) return { id: isAdmin.id, username: userRow.account, tokenHash };
  }
  return null;
}

async function ensureDefaultAdmin() {
  const existing = await sqlGet(pool, "SELECT id FROM admin_users WHERE username = ?", ["admin"]);
  if (!existing) {
    const password = process.env.ADMIN_PASSWORD || "admin123";
    const hash = hashPassword(password);
    // Create user account for unified login
    const userExists = await sqlGet(pool, "SELECT id FROM users WHERE account = ?", ["admin"]);
    let userId;
    if (!userExists) {
      const result = await sqlRun(pool, "INSERT INTO users (account, password_hash) VALUES (?, ?)", ["admin", hash]);
      userId = result.insertId;
      await sqlRun(pool, "INSERT INTO user_profiles (user_id, name, phone) VALUES (?, ?, ?)", [userId, "管理员", ""]);
      console.log("Default admin user account created (account: admin)");
    } else {
      userId = userExists.id;
    }
    await sqlRun(pool, "INSERT INTO admin_users (username, password_hash) VALUES (?, ?)", ["admin", hash]);
    console.log("Default admin entry created (username: admin)");
  }
}

function defaultState(profile) {
  const baseClasses = [
    ["cashClass", "现金类", ["活期", "货币基金"], "#539f8d"],
    ["equity", "权益类", ["股票", "基金"], "#b9d765"],
    ["debt", "债权类", ["债券", "定期"], "#f5a623"],
    ["commodity", "商品类", ["黄金"], "#ffc72c"],
    ["crypto", "加密类", ["BTC", "ETH"], "#ff7f50"],
    ["incomeClass", "吃息类", ["红利股票", "债券基金", "股息"], "#4fb477"],
  ];
  return {
    user: {
      name: profile.name,
      account: profile.account,
      phone: profile.phone || "",
      email: profile.email || "",
      currency: profile.currency || "CNY",
      theme: "light",
      avatar: "",
      birthday: "",
      city: "",
      occupation: "",
      riskLevel: "稳健型",
      privacyLock: "已开启",
      dataMask: "已开启",
      deviceName: "PC / APP / 小程序",
    },
    rates: { CNY: 1, CNH: 1, USD: 7.22, HKD: 0.92, EUR: 7.82, JPY: 0.046, GBP: 9.18 },
    accounts: [{
      id: "default-cash",
      name: "默认现金账户",
      owner: "本人",
      currency: profile.currency || "CNY",
      type: "现金账户",
      balance: 0,
      liability: 0,
      enabled: true,
      default: true,
    }],
    assetClasses: baseClasses.map(([id, name, children, color]) => ({
      id, name, children, color, visible: true, value: 0, openingValue: 0,
      targetValue: 0, income: 0, expense: 0, laborIncome: 0, expectedReturn: 0,
    })),
    records: [],
    budgets: [],
    financeAssets: [],
    customCategories: { records: { income: [], expense: [], transfer: [] }, finance: { tertiaryByScope: {} } },
    recordTags: { tagsByCategory: {}, lastByCategory: {} },
    recorders: [],
    reminders: [],
    debts: [],
    strategies: [],
    financeAssetDraft: {},
  };
}

async function profileForUser(userId) {
  const row = await sqlGet(pool, `
    SELECT u.account, p.* FROM users u
    JOIN user_profiles p ON p.user_id = u.id
    WHERE u.id = ?
  `, [userId]);
  if (!row) return null;
  return {
    account: row.account,
    name: row.name,
    phone: row.phone,
    email: row.email,
    currency: row.currency,
    theme: row.theme,
    avatar: row.avatar,
    birthday: row.birthday,
    city: row.city,
    occupation: row.occupation,
    riskLevel: row.risk_level,
    privacyLock: row.privacy_lock,
    dataMask: row.data_mask,
    deviceName: row.device_name,
  };
}

async function loadUserState(userId) {
  const profile = await profileForUser(userId);
  const rates = Object.fromEntries(
    (await sqlAll(pool, "SELECT currency, rate FROM exchange_rates WHERE user_id = ?", [userId]))
      .map((row) => [row.currency, row.rate])
  );
  const accounts = (await sqlAll(pool, "SELECT * FROM accounts WHERE user_id = ? ORDER BY sort_order", [userId])).map((row) => ({
    id: row.id, name: row.name, owner: row.owner, currency: row.currency, type: row.type,
    balance: row.balance, liability: row.liability, enabled: Boolean(row.enabled), default: Boolean(row.is_default),
  }));
  const assetClasses = (await sqlAll(pool, "SELECT * FROM asset_classes WHERE user_id = ? ORDER BY sort_order", [userId])).map((row) => ({
    id: row.id, name: row.name, children: maybeParseJson(row.children_json), visible: Boolean(row.visible),
    value: row.value, openingValue: row.opening_value, targetValue: row.target_value,
    income: row.income, expense: row.expense, laborIncome: row.labor_income, color: row.color,
    expectedReturn: row.expected_return,
  }));
  const records = (await sqlAll(pool, "SELECT * FROM records WHERE user_id = ? ORDER BY record_date DESC, sort_order DESC", [userId])).map((row) => ({
    id: numericIfPossible(row.id), type: row.type, category: row.category, sub: row.subcategory,
    tag: row.tag, amount: row.amount, currency: row.currency, accountId: row.account_id,
    date: row.record_date, recorder: row.recorder, note: row.note, createdAt: row.created_at,
  }));
  const budgets = (await sqlAll(pool, "SELECT * FROM budgets WHERE user_id = ? ORDER BY sort_order", [userId])).map((row) => ({
    id: numericIfPossible(row.id), name: row.name, category: row.category, amount: row.amount, used: row.used,
  }));
  const transactionRows = await sqlAll(pool, "SELECT * FROM finance_asset_transactions WHERE user_id = ? ORDER BY sort_order", [userId]);
  const transactionsByAsset = new Map();
  transactionRows.forEach((row) => {
    const rows = transactionsByAsset.get(String(row.asset_id)) || [];
    rows.push({
      id: numericIfPossible(row.id),
      direction: row.direction,
      date: row.transaction_date,
      shares: row.shares,
      price: row.price,
      amount: row.amount,
      commission: row.commission,
      stampDuty: row.stamp_duty,
      transferFee: row.transfer_fee,
    });
    transactionsByAsset.set(String(row.asset_id), rows);
  });
  const financeAssets = (await sqlAll(pool, "SELECT * FROM finance_assets WHERE user_id = ? ORDER BY sort_order", [userId])).map((row) => ({
    id: numericIfPossible(row.id), kind: row.kind, accountId: row.account_id, category: row.category,
    subcategory: row.subcategory, tertiaryCategory: row.tertiary_category, market: row.market,
    currency: row.currency, name: row.name, code: row.code, positionGroup: row.position_group,
    positionCategory: row.position_category, costPrice: row.cost_price, shares: row.shares,
    availableShares: row.available_shares, currentPrice: row.current_price, pnl: row.pnl,
    pnlPercent: row.pnl_percent, avgBuyPrice: row.avg_buy_price, holdingDays: row.holding_days,
    positionWeight: row.position_weight, totalFees: row.total_fees, todayPnl: row.today_pnl,
    todayPnlPercent: row.today_pnl_percent,
    transactions: transactionsByAsset.get(String(row.id)) || [],
  }));
  const customRecords = { income: [], expense: [], transfer: [] };
  (await sqlAll(pool, "SELECT record_type, name FROM custom_record_categories WHERE user_id = ? ORDER BY sort_order", [userId]))
    .forEach((row) => (customRecords[row.record_type] ||= []).push(row.name));
  const tertiaryByScope = {};
  (await sqlAll(pool, "SELECT scope, name FROM finance_tertiary_categories WHERE user_id = ? ORDER BY sort_order", [userId]))
    .forEach((row) => (tertiaryByScope[row.scope] ||= []).push(row.name));
  const recordTags = { tagsByCategory: {}, lastByCategory: {} };
  (await sqlAll(pool, "SELECT category, tag, is_last FROM record_tags WHERE user_id = ? ORDER BY sort_order", [userId])).forEach((row) => {
    (recordTags.tagsByCategory[row.category] ||= []).push(row.tag);
    if (row.is_last) recordTags.lastByCategory[row.category] = row.tag;
  });
  const recorders = (await sqlAll(pool, "SELECT name FROM recorders WHERE user_id = ? ORDER BY sort_order", [userId])).map((row) => row.name);
  const reminders = (await sqlAll(pool, "SELECT * FROM reminders WHERE user_id = ? ORDER BY reminder_date", [userId])).map((row) => ({
    id: row.id, date: row.reminder_date, title: row.title, type: row.type,
  }));
  const debts = (await sqlAll(pool, "SELECT * FROM debts WHERE user_id = ? ORDER BY sort_order", [userId])).map(async (row) => {
    const payments = Object.fromEntries(
      (await sqlAll(pool, "SELECT period, status FROM debt_payments WHERE user_id = ? AND debt_id = ?", [userId, row.id]))
        .map((payment) => [payment.period, payment.status])
    );
    return {
      id: numericIfPossible(row.id), category: row.category, type: row.type, name: row.name,
      creditorName: row.creditor_name, debtorName: row.debtor_name, principal: row.principal,
      annualRate: row.annual_rate, amount: row.amount, paidAmount: row.paid_amount,
      note: row.note, attachment: row.attachment, startDate: row.start_date, dueDate: row.due_date,
      repaymentMethod: row.repayment_method, payments,
    };
  });
  const resolvedDebts = await Promise.all(debts);
  const strategies = (await sqlAll(pool, "SELECT * FROM strategies WHERE user_id = ? ORDER BY id", [userId])).map((row) => ({
    id: row.id, name: row.name, active: Boolean(row.active), target: row.target,
    allocation: maybeParseJson(row.allocation_json), debtLimit: row.debt_limit,
    annualReturn: row.annual_return, risk: row.risk,
  }));
  const settings = await sqlGet(pool, "SELECT finance_asset_draft_json, fee_config_json, overview_goals_json FROM user_settings WHERE user_id = ?", [userId]);
  return {
    user: profile,
    rates,
    accounts,
    assetClasses,
    records,
    budgets,
    financeAssets,
    customCategories: { records: customRecords, finance: { tertiaryByScope } },
    recordTags,
    recorders,
    reminders,
    debts: resolvedDebts,
    strategies,
    financeAssetDraft: settings ? maybeParseJson(settings.finance_asset_draft_json) : {},
    feeConfig: settings ? maybeParseJson(settings.fee_config_json) : undefined,
    overviewGoals: settings ? maybeParseJson(settings.overview_goals_json) : undefined,
  };
}

const numericIfPossible = (value) => String(Number(value)) === String(value) ? Number(value) : value;
const text = (value) => String(value ?? "");
const number = (value) => Number(value) || 0;

const HK_IPO_SOURCE_FILE = process.env.HK_IPO_SOURCE_FILE
  ? path.resolve(process.env.HK_IPO_SOURCE_FILE)
  : "C:/Users/YZ-X-096/Documents/港股分析/tools/build_hk_ipo_current_20260623.mjs";
const HK_IPO_CONNECT_MARKET_CAP = 103.19;
const HK_IPO_DEFAULT_YEAR = 2026;
const HK_IPO_DEFAULT_THRESHOLD = 6;

function extractConstArrayFromSource(source, name) {
  const marker = `const ${name}`;
  const start = source.indexOf(marker);
  if (start < 0) return [];
  const equals = source.indexOf("=", start);
  const open = source.indexOf("[", equals);
  if (equals < 0 || open < 0) return [];
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let i = open; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "[") depth += 1;
    if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        const literal = source.slice(open, i + 1);
        return vm.runInNewContext(literal, Object.freeze({}));
      }
    }
  }
  return [];
}

function parseHkIpoDate(value, fallbackYear = HK_IPO_DEFAULT_YEAR) {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "TBD" || raw === "-") return "";
  const dateLike = raw.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (dateLike) {
    return `${dateLike[1]}-${String(dateLike[2]).padStart(2, "0")}-${String(dateLike[3]).padStart(2, "0")}`;
  }
  const md = raw.match(/(\d{1,2})[-/](\d{1,2})/);
  if (!md) return "";
  return `${fallbackYear}-${String(md[1]).padStart(2, "0")}-${String(md[2]).padStart(2, "0")}`;
}

function parseHkIpoRange(value) {
  const raw = String(value ?? "").trim();
  const matches = [...raw.matchAll(/(\d{1,2})[-/](\d{1,2})/g)];
  if (!matches.length) return { start: "", end: "" };
  if (matches.length === 1) {
    const date = parseHkIpoDate(matches[0][0]);
    return { start: date, end: date };
  }
  return {
    start: parseHkIpoDate(matches[0][0]),
    end: parseHkIpoDate(matches.at(-1)[0]),
  };
}

function hkIpoLocalDateIso(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function hkIpoSubscriptionDeadline(endDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(endDate || ""))) return null;
  return new Date(`${endDate}T10:30:00+08:00`);
}

function hkIpoStatus(row, now = new Date()) {
  const todayIso = hkIpoLocalDateIso(now);
  const subscriptionStart = row.subscriptionStart || "";
  const subscriptionEnd = row.subscriptionEnd || "";
  const subscriptionDeadline = hkIpoSubscriptionDeadline(subscriptionEnd);
  const greyDate = row.greyDate || "";
  const listingDate = row.listingDate || "";
  const hasListedData = ["firstDayChange", "cumulativeChange", "latestVsOffer"].some((key) => {
    const value = String(row[key] ?? "").trim();
    return value && value !== "TBD" && value !== "-";
  });
  if ((listingDate && todayIso >= listingDate) || hasListedData) return "已上市";
  if (greyDate && todayIso === greyDate) return "暗盘";
  if (subscriptionStart && subscriptionEnd && todayIso >= subscriptionStart && subscriptionDeadline && now < subscriptionDeadline) return "招股中";
  return "待上市";
}

function hkIpoNum(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? "").replace(/[,%亿万港元元]/g, "").trim();
  if (!raw || raw === "TBD" || raw === "-") return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeHkIpoCornerstoneShare(value) {
  const raw = text(value).trim();
  if (!raw || raw === "-" || raw === "--" || raw === "TBD" || raw === "未获取") return "未获取";
  if (/无基石|没有基石|无$|^0(?:\.0+)?%?$/.test(raw)) return "无";
  const percent = raw.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percent) return `${percent[1]}%`;
  const numberValue = Number(raw);
  if (Number.isFinite(numberValue) && numberValue > 0) return `${numberValue}%`;
  if (Number.isFinite(numberValue) && numberValue === 0) return "无";
  return raw;
}

function normalizeHkIpoYesNo(value) {
  const raw = text(value).trim();
  if (!raw || raw === "-" || raw === "--" || raw === "TBD" || raw === "未获取") return "未获取";
  if (/无|没有|否|不适用|未设|没有设置/.test(raw)) return "无";
  if (/^\d+(?:\.\d+)?%?$/.test(raw)) return Number(raw.replace("%", "")) > 0 ? "有" : "无";
  if (/有|是|设有|设置|超额配售|绿鞋|发行调配权/.test(raw)) return "有";
  return "未获取";
}

function applyKnownHkIpoMarketFacts(row) {
  const key = `${row.code}|${row.companyName}`;
  const facts = {
    "06915|江西生物": {
      cornerstoneShare: "12.32%",
      greenshoe: "有",
    },
  }[key];
  if (!facts) return row;
  return {
    ...row,
    cornerstoneShare: facts.cornerstoneShare ?? row.cornerstoneShare,
    greenshoe: facts.greenshoe ?? row.greenshoe,
    allocationOption: facts.allocationOption ?? row.allocationOption,
  };
}

function hkIpoCell(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number(value.toFixed(3));
  return String(value);
}

function hkIpoRuleId(row, index) {
  return crypto.createHash("sha1").update(`${row[0] || ""}|${row[1] || ""}|${row[2] || ""}|${index}`).digest("hex").slice(0, 16);
}

function normalizeHkIpoRules(ruleRows = [], savedRules = []) {
  const savedMap = new Map((savedRules || []).map((rule) => [String(rule.id), rule]));
  const deletedIds = new Set((savedRules || []).filter((rule) => rule?.deleted).map((rule) => String(rule.id)));
  const systemRules = ruleRows.slice(1).map((row, index) => {
    const id = hkIpoRuleId(row, index);
    if (deletedIds.has(id)) return null;
    const saved = savedMap.get(id);
    const defaultScore = Number(row[3]);
    const savedDefaultScore = Number(saved?.defaultScore);
    const savedScore = Number(saved?.score);
    const hasSavedField = (field) => saved && Object.prototype.hasOwnProperty.call(saved, field);
    return {
      id,
      category: hasSavedField("category") ? text(saved.category) : text(row[0]),
      item: hasSavedField("item") ? text(saved.item) : text(row[1]),
      condition: hasSavedField("condition") ? text(saved.condition) : text(row[2]),
      score: Number.isFinite(savedScore) ? savedScore : (Number.isFinite(defaultScore) ? defaultScore : 0),
      defaultScore: Number.isFinite(savedDefaultScore)
        ? savedDefaultScore
        : (Number.isFinite(defaultScore) ? defaultScore : text(row[3])),
      system: true,
      custom: false,
    };
  }).filter(Boolean);
  const customRules = (savedRules || [])
    .filter((rule) => !rule?.deleted)
    .filter((rule) => rule?.custom || !systemRules.some((item) => item.id === rule.id))
    .map((rule) => ({
      id: text(rule.id) || crypto.randomUUID(),
      category: text(rule.category || "自定义"),
      item: text(rule.item || "自定义评分项"),
      condition: text(rule.condition || ""),
      score: Number(rule.score) || 0,
      defaultScore: Number.isFinite(Number(rule.defaultScore)) ? Number(rule.defaultScore) : (Number(rule.score) || 0),
      system: Boolean(rule.system),
      custom: !rule.system,
    }));
  return [...systemRules, ...customRules];
}

function hkIpoRuleScore(rules, item, originalScore, context = "") {
  const candidates = rules.filter((rule) => rule.item === item);
  const lowerContext = String(context).toLowerCase();
  const textual = candidates.find((rule) => {
    const condition = String(rule.condition || "").trim().toLowerCase();
    return condition && lowerContext.includes(condition);
  });
  if (textual) return Number(textual.score) || 0;
  if (!Number(originalScore)) return 0;
  const exact = candidates.find((rule) => Number(rule.defaultScore) === Number(originalScore));
  if (exact) return Number(exact.score) || 0;
  return Number(originalScore) || 0;
}

function hkIpoRuleConditionMatchesNumber(condition, value) {
  const raw = text(condition);
  if (!raw || !Number.isFinite(value)) return false;
  const normalized = raw.replace(/\s/g, "");
  const range = normalized.match(/(\d+(?:\.\d+)?)[-~至到](\d+(?:\.\d+)?)/);
  if (range) return value >= Number(range[1]) && value <= Number(range[2]);
  const numberMatch = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!numberMatch) return false;
  const target = Number(numberMatch[1]);
  if (/大于等于|不低于|不少于|>=|≥/.test(normalized)) return value >= target;
  if (/大于|超过|高于|>/.test(normalized)) return value > target;
  if (/小于等于|不高于|不超过|<=|≤/.test(normalized)) return value <= target;
  if (/小于|低于|少于|</.test(normalized)) return value < target;
  return normalized.includes(String(target)) && value === target;
}

function hkIpoScoreActualMultiple(rules, actualMultiple, fallbackScore = 0) {
  const value = hkIpoNum(actualMultiple);
  const candidates = (rules || []).filter((rule) => rule.item === "认购倍数");
  const matched = candidates.find((rule) => hkIpoRuleConditionMatchesNumber(rule.condition, value));
  if (matched) return Number(matched.score) || 0;
  if (!value) return Number(fallbackScore) || 0;
  if (value >= 100) return 2;
  if (value >= 50) return 1;
  if (value >= 15) return 0;
  return -1;
}

function hkIpoRebuildDerivedPayload(payload) {
  const rules = payload.rules || [];
  const bigVScoreByCode = new Map((payload.bigVRows || []).map((row) => [row.code, row.score]));
  const rows = (payload.rows || []).map((row) => {
    const components = (row.scoreComponents || []).map((component) => {
      if (component.item === "大V意向" && bigVScoreByCode.has(row.code)) {
        return {
          ...component,
          originalScore: Number(bigVScoreByCode.get(row.code)) || 0,
          score: Number(bigVScoreByCode.get(row.code)) || 0,
        };
      }
      if (component.item !== "认购倍数") return component;
      return {
        ...component,
        originalScore: hkIpoNum(row.actualMultiple),
        score: hkIpoScoreActualMultiple(rules, row.actualMultiple, component.score),
      };
    });
    const totalScore = Number(components.reduce((sum, item) => sum + (Number(item.score) || 0), 0).toFixed(3));
    const threshold = Number(payload.threshold) || HK_IPO_DEFAULT_THRESHOLD;
    const shouldApply = totalScore >= threshold ? "是" : "否";
    const attitude = totalScore >= 8 ? "可以梭哈" : totalScore >= threshold ? "谨慎" : totalScore >= 4 ? "观察" : "不打";
    return { ...row, score: totalScore, shouldApply, attitude, scoreComponents: components };
  });
  const recommendations = [...rows]
    .sort((a, b) => {
      const applyWeight = (value) => value === "是" ? 2 : value === "可小打" ? 1 : 0;
      return applyWeight(b.shouldApply) - applyWeight(a.shouldApply)
        || hkIpoNum(b.score) - hkIpoNum(a.score)
        || hkIpoNum(b.oneLotExpectedProfit) - hkIpoNum(a.oneLotExpectedProfit)
        || hkIpoNum(b.publicTotalHands) - hkIpoNum(a.publicTotalHands);
    })
    .map((row, index) => ({
      rank: index + 1,
      code: row.code,
      companyName: row.companyName,
      status: row.status,
      score: row.score,
      shouldApply: row.shouldApply,
      oneLotExpectedProfit: row.oneLotExpectedProfit,
      publicTotalHands: row.publicTotalHands,
      strategy: row.strategy,
      reason: row.summary,
    }));
  const scoreRows = rows.map((row) => ({
    id: row.id,
    code: row.code,
    companyName: row.companyName,
    score: row.score,
    shouldApply: row.shouldApply,
    attitude: row.attitude,
    components: row.scoreComponents,
  }));
  return { ...payload, rows, recommendations, scoreRows, stats: hkIpoStats(rows) };
}

function hkIpoScoreKey(code, offerPrice = "") {
  const normalizedCode = text(code).trim();
  const priceNumber = Number(offerPrice);
  const normalizedPrice = Number.isFinite(priceNumber) ? Number(priceNumber.toFixed(3)) : text(offerPrice).trim();
  return `${normalizedCode}|${normalizedPrice}`;
}

function applyHkIpoScenarioTags(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const key = row.code || row.companyName;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  for (const groupRows of groups.values()) {
    if (groupRows.length <= 1) {
      groupRows[0].scenarioTags = [];
      continue;
    }
    const offerPrices = [...new Set(groupRows.map((row) => Number(row.offerPrice)).filter(Number.isFinite))].sort((a, b) => a - b);
    const publicHands = [...new Set(groupRows.map((row) => Number(row.publicTotalHands)).filter(Number.isFinite))].sort((a, b) => a - b);
    const hasPriceRange = offerPrices.length > 1;
    const hasHandsRange = publicHands.length > 1;
    groupRows.forEach((row) => {
      const tags = [];
      const offerPrice = Number(row.offerPrice);
      const hands = Number(row.publicTotalHands);
      const mechanism = text(row.mechanism).toUpperCase();
      if (hasPriceRange && Number.isFinite(offerPrice)) {
        if (offerPrice === offerPrices[0]) tags.push("低");
        if (offerPrice === offerPrices.at(-1)) tags.push("高");
      }
      if (text(row.ahType).toUpperCase() === "AH") tags.push("AH");
      if (hasHandsRange && Number.isFinite(hands)) {
        if (mechanism === "A") {
          tags.push(hands === publicHands[0] ? "A小" : "A大");
        } else if (mechanism === "18C") {
          tags.push(hands === publicHands[0] ? "18C小" : "18C大");
        }
      }
      row.scenarioTags = tags;
      row.scenarioLabel = tags.join(" / ");
    });
  }
  return rows;
}

function hkIpoSubscriptionSortValue(row) {
  const candidates = [
    row.subscriptionStart,
    row.subscriptionEnd,
    parseHkIpoDate(row.subscriptionTime),
    row.resultDate,
    row.greyDate,
    row.listingDate,
  ].filter(Boolean);
  return candidates[0] || "9999-12-31";
}

function buildHkIpoTableRows(rawRows = []) {
  return rawRows.map((row) => {
    const isAH = row[18] === "AH";
    const hMarketCap = Number(row[6]);
    const offerPrice = Number(row[2]);
    const boardLot = Number(row[3]);
    if (isAH || !Number.isFinite(hMarketCap) || !Number.isFinite(offerPrice) || !Number.isFinite(boardLot)) {
      return [
        ...row.slice(0, 7),
        "",
        "",
        "",
        "",
        "",
        row[10],
        row[11],
        row[12],
        row[12],
        ...row.slice(13, 25),
        "TBD",
        "TBD",
        "TBD",
        "TBD",
        "TBD",
        ...row.slice(25),
      ];
    }
    const amountNeeded = HK_IPO_CONNECT_MARKET_CAP - hMarketCap;
    const requiredRise = amountNeeded / hMarketCap;
    const postConnectPrice = offerPrice * (HK_IPO_CONNECT_MARKET_CAP / hMarketCap);
    const expectedOneLotProfit = (postConnectPrice - offerPrice) * boardLot;
    return [
      ...row.slice(0, 7),
      HK_IPO_CONNECT_MARKET_CAP,
      `${(requiredRise * 100).toFixed(1)}%`,
      `${amountNeeded.toFixed(2)}亿`,
      Number(postConnectPrice.toFixed(2)),
      Number(expectedOneLotProfit.toFixed(0)),
      row[10],
      row[11],
      row[12],
      row[12],
      ...row.slice(13, 25),
      "TBD",
      "TBD",
      "TBD",
      "TBD",
      "TBD",
      ...row.slice(25),
    ];
  });
}

function normalizeHkIpoRow(headers, row, index) {
  const record = Object.fromEntries(headers.map((header, i) => [header, hkIpoCell(row[i])]));
  const subscription = parseHkIpoRange(record["申购时间"]);
  const resultDate = parseHkIpoDate(record["资金锁定期（中签结果）"]);
  const greyDate = parseHkIpoDate(record["暗盘时间"]);
  const listingDate = parseHkIpoDate(record["上市日期"]) || greyDate || resultDate;
  const normalized = {
    id: `${record["代码编号"] || "ipo"}-${index}`,
    code: text(record["代码编号"]),
    companyName: text(record["公司名称"]),
    offerPrice: record["发行价格"],
    boardLot: record["1手股数"],
    entryAmount: record["1手入场金额"],
    totalMarketCap: record["总市值（亿）"],
    hMarketCap: record["H股市值（亿）"],
    connectMarketCap: record["入通市值（亿）"],
    connectRise: record["入通涨幅"],
    oneLotExpectedProfit: record["一手预计收益"],
    publicShares: record["公开股数(万股)"],
    publicTotalHands: record["公开总手数"],
    actualMultiple: record["实际认购倍数"],
    allotmentRate: record["中签率"],
    cornerstoneShare: normalizeHkIpoCornerstoneShare(record["基石占比"]),
    sponsor: record["保荐人"] || record["保推人"],
    greenshoe: normalizeHkIpoYesNo(record["绿鞋"]),
    allocationOption: normalizeHkIpoYesNo(record["发行调配权"]),
    mechanism: record["机制"],
    ahType: record["是否AH/UH"],
    discountRate: record["折价率"],
    subscriptionTime: record["申购时间"],
    subscriptionStart: subscription.start,
    subscriptionEnd: subscription.end,
    resultDate,
    greyDate,
    listingDate,
    greyChange: record["暗盘涨幅"],
    firstDayChange: record["首日涨幅"],
    cumulativeChange: record["累计涨跌幅"],
    latestVsOffer: record["最新价/发行价"],
    fundamentals: record["基本面"],
    industry: record["行业"],
    score: hkIpoNum(record["得分（6分以上可以打）"]),
    attitude: text(record["申购态度"]),
    shouldApply: text(record["是否打"]),
    strategy: text(record["策略"]),
    tailFunds: text(record["甲尾乙头资金"]),
    summary: text(record["总结"]),
    raw: record,
  };
  const withKnownFacts = applyKnownHkIpoMarketFacts(normalized);
  withKnownFacts.status = hkIpoStatus(withKnownFacts);
  return withKnownFacts;
}

function loadHkIpoRawDataset() {
  const stat = fs.statSync(HK_IPO_SOURCE_FILE);
  if (hkIpoCache.payload && hkIpoCache.sourceMtimeMs === stat.mtimeMs) return hkIpoCache.payload;
  const source = fs.readFileSync(HK_IPO_SOURCE_FILE, "utf8");
  const payload = {
    headers: extractConstArrayFromSource(source, "headers"),
    rows: extractConstArrayFromSource(source, "rows"),
    recommendations: extractConstArrayFromSource(source, "recommendation"),
    scoreHeaders: extractConstArrayFromSource(source, "scoreHeaders"),
    scoreRows: extractConstArrayFromSource(source, "scoreRows"),
    ruleRows: extractConstArrayFromSource(source, "ruleRows"),
    bigVRows: extractConstArrayFromSource(source, "bigVRows"),
    validationRows: extractConstArrayFromSource(source, "validationRows"),
    fetchedAt: new Date(stat.mtimeMs).toISOString(),
    source: HK_IPO_SOURCE_FILE,
  };
  hkIpoCache = { sourceMtimeMs: stat.mtimeMs, payload };
  return payload;
}

function hkIpoBigVOpinion(sampleCount, positiveCount) {
  if (!sampleCount) return "未获取";
  const ratio = positiveCount / sampleCount;
  if (ratio >= 0.8) return "梭哈";
  if (ratio >= 0.5) return "小仓位参与";
  return "放弃";
}

function hkIpoBigVScore(sampleCount, positiveCount) {
  if (!sampleCount || !positiveCount) return 0;
  const ratio = Math.max(0, Math.min(1, positiveCount / sampleCount));
  if (ratio >= 1) return 4;
  const quantityWeight = 0.75 + Math.min(sampleCount, 4) * 0.0625;
  return Number(Math.min(3.999, ratio * 4 * quantityWeight).toFixed(3));
}

function hkIpoExtractBigVNames(note) {
  const content = text(note);
  const names = [];
  const knownNames = ["小散老俞", "101可转债", "老虎社区", "Moomoo", "富途牛牛", "雪球"];
  for (const name of knownNames) {
    if (content.includes(name) && !names.includes(name)) names.push(name);
  }
  return names.length ? names.join("、") : "未获取";
}

function normalizeHkIpoBigVRows(rawRows = []) {
  return rawRows.slice(1).map((row, index) => {
    const sampleCount = hkIpoNum(row[2]);
    const positiveCount = hkIpoNum(row[3]);
    const ratio = sampleCount ? positiveCount / sampleCount : 0;
    const opinion = hkIpoBigVOpinion(sampleCount, positiveCount);
    const score = hkIpoBigVScore(sampleCount, positiveCount);
    return {
      id: `bigv-${index}`,
      code: text(row[0]),
      companyName: text(row[1]),
      bigV: sampleCount ? `${positiveCount}/${sampleCount}` : "0/0",
      bigVName: hkIpoExtractBigVNames(row[7]),
      intention: sampleCount ? `${Number((ratio * 100).toFixed(1))}%` : "未获取",
      reason: opinion,
      score,
      confidence: text(row[6]),
      sampleCount,
      positiveCount,
      note: text(row[7]),
    };
  }).sort((a, b) => hkIpoNum(b.score) - hkIpoNum(a.score) || hkIpoNum(b.positiveCount) - hkIpoNum(a.positiveCount));
}

function hkIpoCountSignals(content = "") {
  const lower = String(content).toLowerCase();
  const positiveWords = ["梭哈", "必打", "申购", "认购", "参与", "会抽", "抽一手", "打新", "正面", "关注"];
  const cautiousWords = ["小仓", "小仓位", "谨慎", "轻仓", "观察"];
  const negativeWords = ["放弃", "不打", "避开", "破发", "不建议", "风险高"];
  const count = (words) => words.reduce((sum, word) => sum + (lower.includes(word.toLowerCase()) ? 1 : 0), 0);
  return {
    positive: count(positiveWords),
    cautious: count(cautiousWords),
    negative: count(negativeWords),
  };
}

async function hkIpoFetchText(url, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 WealthOS/2.0",
        "Accept": "text/plain,application/json,text/html;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return "";
    return await response.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

async function hkIpoSearchPublicSource(companyName, code, source) {
  const keyword = `${companyName} ${code} 港股打新 申购 梭哈 小仓位 放弃 大V`;
  if (source.kind === "bilibili") {
    const url = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(keyword)}`;
    const textBody = await hkIpoFetchText(url);
    const signals = hkIpoCountSignals(textBody);
    return { ...source, ok: Boolean(textBody), signals, excerpt: textBody.slice(0, 260) };
  }
  const query = source.site
    ? `site:${source.site} ${keyword}`
    : keyword;
  const url = `https://r.jina.ai/http://www.bing.com/search?q=${encodeURIComponent(query)}`;
  const textBody = await hkIpoFetchText(url);
  const signals = hkIpoCountSignals(textBody);
  return { ...source, ok: Boolean(textBody), signals, excerpt: textBody.slice(0, 260) };
}

function hkIpoExtractSponsorFromText(content = "") {
  const normalized = String(content || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/保推人/g, "保荐人");
  const patterns = [
    /保荐人[:：\s]*([^\n；;，,。|]{2,80})/i,
    /保荐机构[:：\s]*([^\n；;，,。|]{2,80})/i,
    /Sponsor[:：\s]*([^\n；;，,。|]{2,80})/i,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      return match[1].replace(/[\[\]【】()（）]/g, "").trim();
    }
  }
  return "";
}

function hkIpoExtractTradeGoBasicsFromText(content = "") {
  const normalized = String(content || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/保推人/g, "保荐人");
  const cornerstoneMatch = normalized.match(/(?:认购总占比|基石占比|基石投资者[^%\n]{0,40})(\d+(?:\.\d+)?)\s*%/i);
  const greenshoeArea = normalized.match(/绿鞋[^。\n；;]{0,40}/i)?.[0] || "";
  const allocationArea = normalized.match(/(?:发行调配权|发售量调整权|调配权)[^。\n；;]{0,50}/i)?.[0] || "";
  const multipleMatch = normalized.match(/(?:认购倍数|超购倍数|实际认购倍数|孖展倍数)[^\d\n]{0,12}(\d+(?:\.\d+)?)/i);
  return {
    sponsor: hkIpoExtractSponsorFromText(normalized),
    cornerstoneShare: cornerstoneMatch ? normalizeHkIpoCornerstoneShare(`${cornerstoneMatch[1]}%`) : "",
    greenshoe: greenshoeArea ? normalizeHkIpoYesNo(greenshoeArea) : "",
    allocationOption: allocationArea ? normalizeHkIpoYesNo(allocationArea) : "",
    actualMultiple: multipleMatch ? Number(multipleMatch[1]) : null,
  };
}

function hkIpoSourceSearchTerms() {
  return [
    "HKEXnews 披露易 招股书 聆讯后资料集",
    "经济通 ETNet IPO 基石投资者 超购倍数",
    "AASTOCKS 新股 保荐人 首日涨幅",
    "智通财经 新股 招股 暗盘 上市",
    "捷利交易宝 新股IPO简况 保荐人 基石 绿鞋 发行调配权",
    "AiPO 孖展 资金分布 券商息率",
  ].join(" ");
}

async function hkIpoFetchTradeGoBasics(companyName, code) {
  const query = `${companyName} ${code} 捷利交易宝 新股IPO简况 认购倍数 超购倍数 保荐人 基石占比 认购总占比 绿鞋 发行调配权 ${hkIpoSourceSearchTerms()}`;
  const url = `https://r.jina.ai/http://www.bing.com/search?q=${encodeURIComponent(query)}`;
  const content = await hkIpoFetchText(url, 4500);
  return hkIpoExtractTradeGoBasicsFromText(content);
}

async function enrichHkIpoSponsorsFromTradeGo(payload) {
  const rows = await Promise.all(payload.rows.map(async (row) => {
    const basics = await hkIpoFetchTradeGoBasics(row.companyName, row.code);
    const oldMultiple = hkIpoNum(row.actualMultiple);
    const newMultiple = Number.isFinite(Number(basics.actualMultiple)) ? Number(basics.actualMultiple) : null;
    return {
      ...row,
      sponsor: basics.sponsor || row.sponsor,
      cornerstoneShare: basics.cornerstoneShare || normalizeHkIpoCornerstoneShare(row.cornerstoneShare),
      greenshoe: basics.greenshoe || normalizeHkIpoYesNo(row.greenshoe),
      allocationOption: basics.allocationOption || normalizeHkIpoYesNo(row.allocationOption),
      actualMultiple: newMultiple !== null ? newMultiple : row.actualMultiple,
      actualMultipleIncreased: newMultiple !== null && newMultiple > oldMultiple,
      actualMultipleSource: newMultiple !== null ? "捷利交易宝新股IPO简况" : row.actualMultipleSource,
      tradeGoSource: Object.values(basics).some(Boolean) ? "捷利交易宝新股IPO简况" : row.tradeGoSource,
    };
  }));
  const recommendations = payload.recommendations.map((row) => {
    const matched = rows.find((item) => item.code === row.code && item.companyName === row.companyName);
    return matched ? { ...row, sponsor: matched.sponsor, cornerstoneShare: matched.cornerstoneShare, greenshoe: matched.greenshoe, allocationOption: matched.allocationOption, actualMultiple: matched.actualMultiple } : row;
  });
  const scoreRows = payload.scoreRows.map((row) => {
    const matched = rows.find((item) => item.code === row.code && item.companyName === row.companyName);
    return matched ? { ...row, sponsor: matched.sponsor, cornerstoneShare: matched.cornerstoneShare, greenshoe: matched.greenshoe, allocationOption: matched.allocationOption } : row;
  });
  return { ...payload, rows, recommendations, scoreRows };
}

async function enrichHkIpoBigVRowsFromNetwork(payload) {
  const codes = payload.rows.map((row) => row.code).join("|");
  const cacheKey = `${codes}:${payload.fetchedAt || ""}`;
  const now = Date.now();
  if (hkIpoBigVNetworkCache.key === cacheKey && now - hkIpoBigVNetworkCache.fetchedAt < 60 * 60 * 1000) {
    return { ...payload, bigVRows: hkIpoBigVNetworkCache.rows };
  }
  const platformSources = [
    { platform: "全网搜索", kind: "web" },
    { platform: "雪球公开", kind: "web", site: "xueqiu.com" },
    { platform: "富途公开", kind: "web", site: "futunn.com" },
    { platform: "老虎公开", kind: "web", site: "laohu8.com" },
    { platform: "B站", kind: "bilibili" },
  ];
  const unavailablePlatforms = ["Twitter/X", "小红书", "Reddit", "雪球登录态"];
  const rows = await Promise.all(payload.rows.map(async (row) => {
    const results = await Promise.all(platformSources.map((source) => hkIpoSearchPublicSource(row.companyName, row.code, source)));
    const positiveCount = results.reduce((sum, item) => sum + item.signals.positive + item.signals.cautious, 0);
    const negativeCount = results.reduce((sum, item) => sum + item.signals.negative, 0);
    const sampleCount = positiveCount + negativeCount;
    const score = hkIpoBigVScore(sampleCount, positiveCount);
    const sources = results.filter((item) => item.ok).map((item) => item.platform);
    return {
      id: `bigv-net-${row.code}`,
      code: row.code,
      companyName: row.companyName,
      bigV: sampleCount ? `${positiveCount}/${sampleCount}` : "0/0",
      bigVName: sources.length ? sources.join("、") : "未获取",
      intention: sampleCount ? `${Number(((positiveCount / sampleCount) * 100).toFixed(1))}%` : "未获取",
      reason: hkIpoBigVOpinion(sampleCount, positiveCount),
      score,
      confidence: sampleCount >= 4 ? "中" : sampleCount > 0 ? "低" : "未获取",
      sampleCount,
      positiveCount,
      note: [
        `公开渠道：${sources.length ? sources.join("、") : "未检索到有效信号"}`,
        `未接入：${unavailablePlatforms.join("、")}`,
        `正向/谨慎信号${positiveCount}，负向信号${negativeCount}`,
      ].join("；"),
    };
  }));
  const sortedRows = rows.sort((a, b) => hkIpoNum(b.score) - hkIpoNum(a.score) || hkIpoNum(b.positiveCount) - hkIpoNum(a.positiveCount));
  hkIpoBigVNetworkCache = { key: cacheKey, fetchedAt: now, rows: sortedRows };
  return { ...payload, bigVRows: sortedRows };
}

function buildHkIpoPayload(rulesConfig = {}) {
  const raw = loadHkIpoRawDataset();
  const rules = normalizeHkIpoRules(raw.ruleRows, Array.isArray(rulesConfig.rules) ? rulesConfig.rules : []);
  const threshold = Number(rulesConfig.threshold) || HK_IPO_DEFAULT_THRESHOLD;
  const tableRows = buildHkIpoTableRows(raw.rows);
  const rows = applyHkIpoScenarioTags(tableRows.map((row, index) => {
    const normalized = normalizeHkIpoRow(raw.headers, row, index);
    return {
      ...normalized,
      cornerstoneShare: normalizeHkIpoCornerstoneShare(normalized.cornerstoneShare),
      greenshoe: normalizeHkIpoYesNo(normalized.greenshoe),
      allocationOption: normalizeHkIpoYesNo(normalized.allocationOption),
    };
  }));
  const bigVRows = normalizeHkIpoBigVRows(raw.bigVRows);
  const bigVScoreByCode = new Map(bigVRows.map((row) => [row.code, row.score]));
  const bigVContextByCode = new Map(bigVRows.map((row) => [row.code, `${row.bigVName} ${row.reason} ${row.intention} ${row.note}`]));
  const scoreHeader = raw.scoreHeaders || [];
  const scoreObjects = raw.scoreRows.map((row, index) => ({
    id: `${row[0] || "score"}-${index}`,
    raw: Object.fromEntries(scoreHeader.map((header, i) => [header, hkIpoCell(row[i])])),
  }));
  const scoreByExactKey = new Map(scoreObjects.map((item) => [hkIpoScoreKey(item.raw["代码"], item.raw["发行价"]), item.raw]));
  const scoreByCode = new Map();
  for (const item of scoreObjects) {
    const code = text(item.raw["代码"]).trim();
    if (code && !scoreByCode.has(code)) scoreByCode.set(code, item.raw);
  }
  const recalculatedRows = rows.map((row) => {
    const scoreRaw = scoreByExactKey.get(hkIpoScoreKey(row.code, row.offerPrice)) || scoreByCode.get(row.code) || {};
    const components = [
      "旧股", "保荐人", "明星基石", "IPO前投资者", "行业",
      "估值", "机制", "认购倍数", "基石份额", "大V意向",
    ].map((item) => ({
      item,
      originalScore: item === "大V意向" && bigVScoreByCode.has(row.code) ? bigVScoreByCode.get(row.code) : hkIpoNum(scoreRaw[item]),
      score: hkIpoRuleScore(
        rules,
        item,
        item === "大V意向" && bigVScoreByCode.has(row.code) ? bigVScoreByCode.get(row.code) : hkIpoNum(scoreRaw[item]),
        `${row.summary} ${row.strategy} ${row.fundamentals} ${row.industry} ${bigVContextByCode.get(row.code) || ""}`,
      ),
    }));
    for (const rule of rules.filter((rule) => rule.custom)) {
      const haystack = `${row.companyName} ${row.industry} ${row.strategy} ${row.summary} ${row.fundamentals}`;
      if (rule.condition && haystack.includes(rule.condition)) {
        components.push({ item: rule.item, originalScore: Number(rule.defaultScore) || 0, score: Number(rule.score) || 0 });
      }
    }
    const totalScore = Number(components.reduce((sum, item) => sum + (Number(item.score) || 0), 0).toFixed(3));
    const shouldApply = totalScore >= threshold ? "是" : "否";
    const attitude = totalScore >= 8 ? "可以梭哈" : totalScore >= threshold ? "谨慎" : totalScore >= 4 ? "观察" : "不打";
    return { ...row, score: totalScore, shouldApply, attitude, scoreComponents: components };
  }).sort((a, b) => {
    const dateCompare = hkIpoSubscriptionSortValue(a).localeCompare(hkIpoSubscriptionSortValue(b));
    if (dateCompare) return dateCompare;
    return String(a.code || "").localeCompare(String(b.code || ""));
  });
  const validationRows = raw.validationRows.slice(1).map((row, index) => ({
    id: `validation-${index}`,
    field: text(row[0]),
    issue: text(row[1]),
    level: text(row[2]),
    suggestion: text(row[3]),
  }));
  const sourceValidationRows = HK_IPO_DATA_SOURCES.map((source, index) => ({
    id: `source-${index}`,
    field: source.fields,
    issue: source.name,
    level: source.tier,
    suggestion: `${source.usage}；访问：${source.access}；自动化：${source.autoCheck}`,
    sourceName: source.name,
    sourceTier: source.tier,
    sourceAccess: source.access,
    sourceUrl: source.url,
    sourceFields: source.fields,
    sourceUsage: source.usage,
    sourceAutoCheck: source.autoCheck,
  }));
  const scoreRows = recalculatedRows.map((row) => ({
    id: row.id,
    code: row.code,
    companyName: row.companyName,
    score: row.score,
    shouldApply: row.shouldApply,
    attitude: row.attitude,
    components: row.scoreComponents,
  }));
  const recommendations = [...recalculatedRows]
    .sort((a, b) => {
      const applyWeight = (value) => value === "是" ? 2 : value === "可小打" ? 1 : 0;
      return applyWeight(b.shouldApply) - applyWeight(a.shouldApply)
        || hkIpoNum(b.score) - hkIpoNum(a.score)
        || hkIpoNum(b.oneLotExpectedProfit) - hkIpoNum(a.oneLotExpectedProfit)
        || hkIpoNum(b.publicTotalHands) - hkIpoNum(a.publicTotalHands);
    })
    .map((row, index) => ({
      rank: index + 1,
      code: row.code,
      companyName: row.companyName,
      status: row.status,
      score: row.score,
      shouldApply: row.shouldApply,
      oneLotExpectedProfit: row.oneLotExpectedProfit,
      publicTotalHands: row.publicTotalHands,
      strategy: row.strategy,
      reason: row.summary,
    }));
  return {
    rows: recalculatedRows,
    recommendations,
    bigVRows,
    scoreRows,
    validationRows: [...sourceValidationRows, ...validationRows],
    dataSources: HK_IPO_DATA_SOURCES,
    rules,
    threshold,
    fetchedAt: raw.fetchedAt,
    source: "C:\\Users\\YZ-X-096\\Documents\\港股分析",
  };
}

function hkIpoMatchesFilters(row, params) {
  const status = text(params.status || "all");
  if (status !== "all" && row.status !== status) return false;
  const query = text(params.query).trim().toLowerCase();
  if (query) {
    const haystack = `${row.code} ${row.companyName}`.toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  const startDate = text(params.startDate);
  const endDate = text(params.endDate);
  if (startDate || endDate) {
    const dates = [row.subscriptionStart, row.subscriptionEnd, row.resultDate, row.greyDate, row.listingDate].filter(Boolean);
    if (!dates.length) return false;
    const inRange = dates.some((date) => (!startDate || date >= startDate) && (!endDate || date <= endDate));
    if (!inRange) return false;
  }
  return true;
}

function hkIpoStats(rows) {
  const recommended = rows.filter((row) => row.shouldApply === "是");
  const recommendedCompanyCount = new Set(recommended.map((row) => row.companyName || row.code).filter(Boolean)).size;
  const bestScore = rows.reduce((best, row) => (hkIpoNum(row.score) > hkIpoNum(best?.score) ? row : best), null);
  const bestProfit = rows.reduce((best, row) => (hkIpoNum(row.oneLotExpectedProfit) > hkIpoNum(best?.oneLotExpectedProfit) ? row : best), null);
  const statusCounts = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  const avgScore = rows.length ? rows.reduce((sum, row) => sum + hkIpoNum(row.score), 0) / rows.length : 0;
  return {
    total: rows.length,
    recommended: recommendedCompanyCount,
    averageScore: Number(avgScore.toFixed(3)),
    bestScoreProject: bestScore ? `${bestScore.companyName} ${bestScore.score}` : "",
    bestProfitProject: bestProfit ? `${bestProfit.companyName} ${bestProfit.oneLotExpectedProfit}` : "",
    statusCounts,
    scoreDistribution: [0, 3, 6, 9, 12].map((min, index, list) => {
      const max = list[index + 1] ?? Infinity;
      return {
        label: max === Infinity ? `${min}+` : `${min}-${max}`,
        count: rows.filter((row) => hkIpoNum(row.score) >= min && hkIpoNum(row.score) < max).length,
      };
    }),
    profitRanking: [...rows]
      .filter((row) => row.status === "招股中")
      .sort((a, b) => hkIpoNum(b.oneLotExpectedProfit) - hkIpoNum(a.oneLotExpectedProfit))
      .map((row) => ({
        code: row.code,
        companyName: row.companyName,
        value: hkIpoNum(row.oneLotExpectedProfit),
        scenarioTags: Array.isArray(row.scenarioTags) ? row.scenarioTags : [],
        priceTag: (Array.isArray(row.scenarioTags) ? row.scenarioTags : []).find((tag) => ["高", "低"].includes(tag)) || "",
      })),
  };
}

function filterHkIpoPayload(payload, params = {}) {
  const rows = payload.rows.filter((row) => hkIpoMatchesFilters(row, params));
  const codeSet = new Set(rows.map((row) => row.code));
  return {
    ...payload,
    rows,
    recommendations: payload.recommendations.filter((row) => codeSet.has(row.code)),
    bigVRows: payload.bigVRows.filter((row) => !row.code || codeSet.has(row.code)),
    scoreRows: payload.scoreRows.filter((row) => codeSet.has(row.code)),
    validationRows: payload.validationRows,
    stats: hkIpoStats(rows),
  };
}

async function loadHkIpoRulesConfig(userId) {
  const row = await sqlGet(pool, "SELECT hk_ipo_rules_json FROM user_settings WHERE user_id = ?", [userId]);
  try {
    return row ? maybeParseJson(row.hk_ipo_rules_json) : null;
  } catch {
    return null;
  }
}

async function saveHkIpoRulesConfig(userId, config) {
  await sqlRun(pool, `INSERT INTO user_settings
    (user_id, finance_asset_draft_json, fee_config_json, overview_goals_json, hk_ipo_rules_json)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE hk_ipo_rules_json = VALUES(hk_ipo_rules_json)`,
    [userId, "{}", null, null, config ? JSON.stringify(config) : null]);
}

function hkIpoSheetRows(rows) {
  return rows.map((row) => ({
    代码: row.code,
    公司名称: row.companyName,
    场景标签: Array.isArray(row.scenarioTags) ? row.scenarioTags.join(" / ") : "",
    状态: row.status,
    "1手股数": row.boardLot,
    "1手入场金额": row.entryAmount,
    总市值: row.totalMarketCap,
    H股市值: row.hMarketCap,
    入通涨幅: row.connectRise,
    一手预计收益: row.oneLotExpectedProfit,
    公开总手数: row.publicTotalHands,
    实际认购倍数: row.actualMultiple,
    保荐人: row.sponsor,
    基石占比: row.cornerstoneShare,
    绿鞋: row.greenshoe,
    发行调配权: row.allocationOption,
    申购时间: row.subscriptionTime,
    资金锁定期: row.resultDate,
    暗盘时间: row.greyDate,
    上市日期: row.listingDate,
    基本面: row.fundamentals,
    行业: row.industry,
    得分: row.score,
    申购态度: row.attitude,
    是否打: row.shouldApply,
    策略: row.strategy,
    建议甲组乙组: row.tailFunds,
    总结: row.summary,
    首日涨幅: row.firstDayChange,
    累计涨跌幅: row.cumulativeChange,
    最新价: row.latestVsOffer,
    发行价: row.offerPrice,
  }));
}

function hkIpoBigVSheetRows(rows) {
  return rows.map((row) => ({
    代码: row.code,
    公司名称: row.companyName,
    大V: row.bigV,
    大V名称: row.bigVName,
    意向占比: row.intention,
    理由: row.reason,
    评分: row.score,
    置信度: row.confidence,
    样本说明: row.note,
  }));
}

async function saveUserState(conn, userId, state) {
  const user = state.user || {};
  const previousSettings = await sqlGet(conn, "SELECT hk_ipo_rules_json FROM user_settings WHERE user_id = ?", [userId]);
  await sqlRun(conn, `
    UPDATE user_profiles SET name=?, phone=?, email=?, currency=?, theme=?, avatar=?, birthday=?, city=?,
    occupation=?, risk_level=?, privacy_lock=?, data_mask=?, device_name=? WHERE user_id=?
  `, [text(user.name), text(user.phone), text(user.email), text(user.currency || "CNY"), text(user.theme || "light"),
    text(user.avatar), text(user.birthday), text(user.city), text(user.occupation), text(user.riskLevel || "稳健型"),
    text(user.privacyLock || "已开启"), text(user.dataMask || "已开启"), text(user.deviceName), userId]);

  const tables = [
    "exchange_rates", "accounts", "asset_classes", "records", "budgets", "finance_asset_transactions", "finance_assets",
    "custom_record_categories", "finance_tertiary_categories", "record_tags", "recorders",
    "reminders", "debt_payments", "debts", "strategies", "user_settings",
  ];
  for (const table of tables) {
    await sqlRun(conn, `DELETE FROM ${table} WHERE user_id = ?`, [userId]);
  }

  for (const [currency, rate] of Object.entries(state.rates || {})) {
    await sqlRun(conn, "INSERT INTO exchange_rates (user_id, currency, rate) VALUES (?, ?, ?)", [userId, currency, number(rate)]);
  }

  for (const row of (state.accounts || [])) {
    await sqlRun(conn, `INSERT INTO accounts (user_id, id, name, owner, currency, type, balance, liability, enabled, is_default, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, text(row.id), text(row.name), text(row.owner), text(row.currency), text(row.type),
       number(row.balance), number(row.liability), row.enabled === false ? 0 : 1, row.default ? 1 : 0,
       (state.accounts || []).indexOf(row)]);
  }

  for (const [index, row] of (state.assetClasses || []).entries()) {
    await sqlRun(conn, `INSERT INTO asset_classes
      (user_id, id, name, children_json, visible, value, opening_value, target_value, income, expense, labor_income, color, expected_return, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, text(row.id), text(row.name), JSON.stringify(row.children || []),
       row.visible === false ? 0 : 1, number(row.value), number(row.openingValue),
       number(row.targetValue), number(row.income), number(row.expense),
       number(row.laborIncome), text(row.color || "#539f8d"), number(row.expectedReturn), index]);
  }

  for (const [index, row] of (state.records || []).entries()) {
    await sqlRun(conn, `INSERT INTO records
      (user_id, id, type, category, subcategory, tag, amount, currency, account_id, record_date, recorder, note, created_at, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, text(row.id), text(row.type), text(row.category), text(row.sub), text(row.tag),
       number(row.amount), text(row.currency), text(row.accountId), text(row.date),
       text(row.recorder), text(row.note), text(row.createdAt), index]);
  }

  for (const [index, row] of (state.budgets || []).entries()) {
    await sqlRun(conn, `INSERT INTO budgets (user_id, id, name, category, amount, used, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, text(row.id), text(row.name), text(row.category), number(row.amount), number(row.used), index]);
  }

  for (const [index, row] of (state.financeAssets || []).entries()) {
    await sqlRun(conn, `INSERT INTO finance_assets
      (user_id, id, kind, account_id, category, subcategory, tertiary_category, market, currency, name, code, position_group, position_category, cost_price, shares, available_shares, current_price, pnl, pnl_percent, avg_buy_price, holding_days, position_weight, total_fees, today_pnl, today_pnl_percent, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, text(row.id), text(row.kind), text(row.accountId), text(row.category),
       text(row.subcategory), text(row.tertiaryCategory), text(row.market), text(row.currency),
       text(row.name), text(row.code), text(row.positionGroup), text(row.positionCategory),
       number(row.costPrice), number(row.shares), number(row.availableShares), number(row.currentPrice),
       number(row.pnl), number(row.pnlPercent), number(row.avgBuyPrice), number(row.holdingDays),
       number(row.positionWeight), number(row.totalFees), number(row.todayPnl), number(row.todayPnlPercent), index]);
    for (const [transactionIndex, transaction] of (row.transactions || []).entries()) {
      await sqlRun(conn, `INSERT INTO finance_asset_transactions
        (user_id, asset_id, id, direction, transaction_date, shares, price, amount, commission, stamp_duty, transfer_fee, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, text(row.id), text(transaction.id || `${row.id}-${transactionIndex}`), text(transaction.direction),
         text(transaction.date), number(transaction.shares), number(transaction.price), number(transaction.amount),
         number(transaction.commission), number(transaction.stampDuty), number(transaction.transferFee), transactionIndex]);
    }
  }

  let catOrder = 0;
  for (const [type, names] of Object.entries(state.customCategories?.records || {})) {
    for (const name of (names || [])) {
      await sqlRun(conn, "INSERT INTO custom_record_categories (user_id, record_type, name, sort_order) VALUES (?, ?, ?, ?)",
        [userId, type, text(name), catOrder++]);
    }
  }
  let tertOrder = 0;
  for (const [scope, names] of Object.entries(state.customCategories?.finance?.tertiaryByScope || {})) {
    for (const name of (names || [])) {
      await sqlRun(conn, "INSERT INTO finance_tertiary_categories (user_id, scope, name, sort_order) VALUES (?, ?, ?, ?)",
        [userId, scope, text(name), tertOrder++]);
    }
  }

  let tagOrder = 0;
  for (const [category, tags] of Object.entries(state.recordTags?.tagsByCategory || {})) {
    for (const tag of (tags || [])) {
      await sqlRun(conn, "INSERT INTO record_tags (user_id, category, tag, is_last, sort_order) VALUES (?, ?, ?, ?, ?)",
        [userId, category, text(tag), state.recordTags?.lastByCategory?.[category] === tag ? 1 : 0, tagOrder++]);
    }
  }
  for (const [index, name] of (state.recorders || []).entries()) {
    await sqlRun(conn, "INSERT INTO recorders (user_id, name, sort_order) VALUES (?, ?, ?)", [userId, text(name), index]);
  }

  for (const [index, row] of (state.reminders || []).entries()) {
    await sqlRun(conn, "INSERT INTO reminders (user_id, id, reminder_date, title, type) VALUES (?, ?, ?, ?, ?)",
      [userId, Number(row.id) || index + 1, text(row.date), text(row.title), text(row.type)]);
  }

  let debtOrder = 0;
  for (const row of (state.debts || [])) {
    const debtId = text(row.id);
    await sqlRun(conn, `INSERT INTO debts
      (user_id, id, category, type, name, creditor_name, debtor_name, principal, annual_rate, amount, paid_amount, note, attachment, start_date, due_date, repayment_method, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, debtId, text(row.category), text(row.type), text(row.name), text(row.creditorName),
       text(row.debtorName), number(row.principal), number(row.annualRate), number(row.amount),
       number(row.paidAmount), text(row.note), text(row.attachment), text(row.startDate),
       text(row.dueDate), text(row.repaymentMethod), debtOrder++]);
    for (const [period, status] of Object.entries(row.payments || {})) {
      await sqlRun(conn, "INSERT INTO debt_payments (user_id, debt_id, period, status) VALUES (?, ?, ?, ?)",
        [userId, debtId, Number(period), text(status)]);
    }
  }

  for (const row of (state.strategies || [])) {
    await sqlRun(conn, "INSERT INTO strategies (user_id, id, name, active, target, allocation_json, debt_limit, annual_return, risk) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, Number(row.id), text(row.name), row.active ? 1 : 0, text(row.target),
       JSON.stringify(row.allocation || []), number(row.debtLimit), number(row.annualReturn), text(row.risk)]);
  }
  await sqlRun(conn, "INSERT INTO user_settings (user_id, finance_asset_draft_json, fee_config_json, overview_goals_json, hk_ipo_rules_json) VALUES (?, ?, ?, ?, ?)",
    [userId, JSON.stringify(state.financeAssetDraft || {}), JSON.stringify(state.feeConfig || {}),
     JSON.stringify(state.overviewGoals || {}), previousSettings?.hk_ipo_rules_json || null]);
}

async function createUser({ account, password, name, phone, email, currency }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await sqlRun(conn, "INSERT INTO users (account, password_hash) VALUES (?, ?)", [account, hashPassword(password)]);
    const userId = Number(result.insertId);
    await sqlRun(conn, `
      INSERT INTO user_profiles (user_id, name, phone, email, currency)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, name, phone, email, currency]);
    await conn.commit();
    conn.release();
    return userId;
  } catch (error) {
    await conn.rollback();
    conn.release();
    throw error;
  }
}

async function authPayload(userId) {
  const user = await profileForUser(userId);
  const adminRow = await sqlGet(pool, "SELECT id FROM admin_users WHERE username = ?", [user.account]);
  return {
    token: await issueToken(userId),
    user,
    state: await loadUserState(userId),
    isAdmin: !!adminRow,
  };
}

const server = http.createServer(async (req, res) => {
  await initDb;
  const origin = req.headers.origin || "";
  if (req.method === "OPTIONS") {
    if (allowedOrigins.has(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
    res.writeHead(204);
    res.end();
    return;
  }
  const url = new URL(req.url || "/", "http://localhost");
  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      json(res, 200, { ok: true, database: "mysql" }, origin);
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/tools/premium") {
      const force = url.searchParams.get("refresh") === "1";
      if (premiumMarketCache.payload) {
        const shouldRefresh = force || premiumMarketCache.expiresAt <= Date.now();
        if (shouldRefresh) void refreshPremiumMarketInBackground();
        json(res, 200, {
          ...premiumMarketCache.payload,
          cached: true,
          refreshing: shouldRefresh,
        }, origin);
        return;
      }
      json(res, 200, await fetchPremiumMarket(), origin);
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/v2/releases") {
      json(res, 200, { releases: loadReleaseCatalog() }, origin);
      return;
    }
    const releaseFileMatch = req.method === "GET"
      ? url.pathname.match(/^\/api\/v2\/releases\/file\/([a-z0-9_-]+)\/([^/]+)$/i)
      : null;
    if (releaseFileMatch) {
      serveReleaseFile(releaseFileMatch[1], decodeURIComponent(releaseFileMatch[2]), res);
      return;
    }
    const releasePlatformMatch = req.method === "GET"
      ? url.pathname.match(/^\/api\/v2\/releases\/([a-z0-9_-]+)$/i)
      : null;
    if (releasePlatformMatch) {
      const platform = safeReleasePlatform(releasePlatformMatch[1]);
      if (platform === "latest") {
        json(res, 200, {
          releases: loadReleaseCatalog().map((item) => item.latest).filter(Boolean),
        }, origin);
        return;
      }
      const manifest = loadReleaseCatalog().find((item) => item.platform === platform);
      if (!manifest) {
        json(res, 404, { message: "平台不存在。" }, origin);
        return;
      }
      json(res, 200, { release: manifest }, origin);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/auth/sms/send") {
      const body = await readBody(req);
      const phone = text(body.phone).trim();
      const purpose = text(body.purpose).trim();
      if (!/^1\d{10}$/.test(phone) || !["login", "register", "reset"].includes(purpose)) {
        json(res, 400, { message: "请输入正确的手机号。" }, origin);
        return;
      }
      const existingUser = await userByPhone(phone);
      if (purpose === "register" && existingUser) {
        json(res, 409, { message: "这个手机号已经注册，请直接登录。" }, origin);
        return;
      }
      if (purpose !== "register" && !existingUser) {
        json(res, 404, { message: "这个手机号尚未注册。" }, origin);
        return;
      }
      const code = await createSmsCode(phone, purpose);
      const delivered = await deliverSmsCode(phone, code, purpose);
      json(res, 200, {
        ok: true,
        expiresIn: SMS_CODE_TTL_MINUTES * 60,
        message: delivered ? "验证码已发送。" : "测试验证码已生成。",
        ...(delivered ? {} : { debugCode: code }),
      }, origin);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/auth/register") {
      const body = await readBody(req);
      const account = text(body.account).trim();
      const password = text(body.password);
      const name = text(body.name).trim();
      const phone = text(body.phone).trim();
      const email = text(body.email).trim();
      const currency = text(body.currency || "CNY");
      const smsCode = text(body.smsCode).trim();
      if (account.length < 3 || password.length < 6 || !name || !phone) {
        json(res, 400, { message: "账号至少 3 位，密码至少 6 位，昵称和手机不能为空。" }, origin);
        return;
      }
      if (!/^1\d{10}$/.test(phone)) {
        json(res, 400, { message: "请输入正确的手机号。" }, origin);
        return;
      }
      if (await sqlGet(pool, "SELECT id FROM users WHERE account = ?", [account])) {
        json(res, 409, { message: "这个账号已经注册，请直接登录。" }, origin);
        return;
      }
      if (await userByPhone(phone)) {
        json(res, 409, { message: "这个手机号已经注册，请直接登录。" }, origin);
        return;
      }
      if (!(await verifySmsCode(phone, "register", smsCode))) {
        json(res, 400, { message: "短信验证码不正确或已过期。" }, origin);
        return;
      }
      const userId = await createUser({ account, password, name, phone, email, currency });
      const initialState = body.initialState && typeof body.initialState === "object"
        ? {
          ...body.initialState,
          user: {
            ...(body.initialState.user || {}),
            account,
            name,
            phone,
            email,
            currency,
          },
        }
        : defaultState({ account, name, phone, email, currency });
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await saveUserState(conn, userId, initialState);
        await conn.commit();
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
      json(res, 201, await authPayload(userId), origin);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/auth/login") {
      const body = await readBody(req);
      const user = await sqlGet(pool, "SELECT id, account, password_hash FROM users WHERE account = ?", [text(body.account).trim()]);
      if (!user || !verifyPassword(text(body.password), user.password_hash)) {
        json(res, 401, { message: "账号或密码不正确。" }, origin);
        return;
      }
      json(res, 200, await authPayload(user.id), origin);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/auth/phone-login") {
      const body = await readBody(req);
      const phone = text(body.phone).trim();
      const user = await userByPhone(phone);
      if (!user || !(await verifySmsCode(phone, "login", text(body.smsCode).trim()))) {
        json(res, 401, { message: "手机号或验证码不正确。" }, origin);
        return;
      }
      json(res, 200, await authPayload(user.id), origin);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/auth/reset-password") {
      const body = await readBody(req);
      const phone = text(body.phone).trim();
      const password = text(body.password);
      const user = await userByPhone(phone);
      if (!user) {
        json(res, 404, { message: "这个手机号尚未注册。" }, origin);
        return;
      }
      if (password.length < 6) {
        json(res, 400, { message: "新密码至少需要 6 位。" }, origin);
        return;
      }
      if (!(await verifySmsCode(phone, "reset", text(body.smsCode).trim()))) {
        json(res, 400, { message: "短信验证码不正确或已过期。" }, origin);
        return;
      }
      await sqlRun(pool, "UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?", [hashPassword(password), user.id]);
      await sqlRun(pool, "DELETE FROM sessions WHERE user_id = ?", [user.id]);
      json(res, 200, await authPayload(user.id), origin);
      return;
    }

    // ─── Admin Login (public) ───
    if (req.method === "POST" && url.pathname === "/api/admin/login") {
      const body = await readBody(req);
      const username = text(body.username).trim();
      const password = text(body.password);
      if (!username || !password) {
        json(res, 400, { message: "请输入用户名和密码。" }, origin);
        return;
      }
      const admin = await sqlGet(pool, "SELECT * FROM admin_users WHERE username = ?", [username]);
      if (!admin || !verifyPassword(password, admin.password_hash)) {
        json(res, 401, { message: "管理员账号或密码错误。" }, origin);
        return;
      }
      const token = crypto.randomBytes(32).toString("base64url");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const expiresAt = fmtDt(new Date(Date.now() + TOKEN_TTL_DAYS * 86400000));
      await sqlRun(pool, "INSERT INTO admin_sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)", [tokenHash, admin.id, expiresAt]);
      json(res, 200, { token, admin: { id: admin.id, username: admin.username } }, origin);
      return;
    }

    if (req.method === "GET" && !url.pathname.startsWith("/api/")) {
      serveStatic(url, res);
      return;
    }

    // ─── Admin Dashboard (admin auth) ───
    if (url.pathname.startsWith("/api/admin/")) {
      const admin = await authenticatedAdmin(req);
      if (!admin) {
        json(res, 401, { message: "管理员登录已失效。" }, origin);
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/admin/logout") {
        await sqlRun(pool, "DELETE FROM admin_sessions WHERE token_hash = ?", [admin.tokenHash]);
        json(res, 200, { ok: true }, origin);
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/admin/dashboard") {
        const [totalUsers] = await pool.execute("SELECT COUNT(*) AS cnt FROM users");
        const [todayUsers] = await pool.execute("SELECT COUNT(*) AS cnt FROM users WHERE DATE(created_at) = CURDATE()");
        const [pendingFeedback] = await pool.execute("SELECT COUNT(*) AS cnt FROM feedback WHERE status = 'pending'");
        json(res, 200, {
          stats: {
            totalUsers: totalUsers[0].cnt,
            todayUsers: todayUsers[0].cnt,
            pendingFeedback: pendingFeedback[0].cnt,
          },
        }, origin);
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/admin/users") {
        const rows = await sqlAll(pool, `
          SELECT u.id, u.account, u.created_at,
            COALESCE(up.name, '') AS name,
            COALESCE(up.phone, '') AS phone,
            COALESCE(up.email, '') AS email
          FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id
          ORDER BY u.created_at DESC
        `);
        json(res, 200, { users: rows }, origin);
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/admin/feedback") {
        const rows = await sqlAll(pool, `
          SELECT f.*, COALESCE(up.name, '') AS user_name, COALESCE(u.account, '') AS user_account
          FROM feedback f
          LEFT JOIN user_profiles up ON up.user_id = f.user_id
          LEFT JOIN users u ON u.id = f.user_id
          ORDER BY f.created_at DESC
        `);
        json(res, 200, { feedback: rows }, origin);
        return;
      }
      if (req.method === "PUT" && url.pathname.startsWith("/api/admin/feedback/")) {
        const id = parseInt(url.pathname.split("/").pop(), 10);
        const body = await readBody(req);
        const status = text(body.status).trim();
        const adminReply = text(body.adminReply).trim();
        if (!["pending", "replied", "resolved"].includes(status)) {
          json(res, 400, { message: "无效状态。" }, origin);
          return;
        }
        await sqlRun(pool,
          "UPDATE feedback SET status = ?, admin_reply = ?, replied_at = ? WHERE id = ?",
          [status, adminReply, status !== "pending" ? fmtDt(new Date()) : null, id]
        );
        json(res, 200, { ok: true }, origin);
        return;
      }
      json(res, 404, { message: "管理接口不存在。" }, origin);
      return;
    }

    const currentUser = await authenticatedUser(req);
    if (!currentUser) {
      json(res, 401, { message: "登录已失效，请重新登录。" }, origin);
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/v2/bootstrap") {
      json(res, 200, {
        user: await profileForUser(currentUser.id),
        state: await loadUserState(currentUser.id),
        capabilities: {
          offline: "full",
          sync: true,
          uploads: true,
          releases: true,
        },
      }, origin);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/v2/devices/register") {
      const body = await readBody(req);
      const deviceId = text(body.deviceId).trim() || crypto.randomUUID();
      const name = text(body.name).trim() || "未命名设备";
      const platform = text(body.platform).trim() || "unknown";
      const appVersion = text(body.appVersion).trim();
      await sqlRun(pool, `INSERT INTO devices (user_id, device_id, name, platform, app_version, last_seen_at)
        VALUES (?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          platform = VALUES(platform),
          app_version = VALUES(app_version),
          last_seen_at = NOW()`, [currentUser.id, deviceId, name, platform, appVersion]);
      json(res, 200, { ok: true, deviceId }, origin);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/v2/sync/push") {
      const body = await readBody(req);
      const deviceId = text(body.deviceId).trim() || "unknown-device";
      const changes = Array.isArray(body.changes) ? body.changes : [];
      const clientVersion = Number(body.clientVersion || 0);
      for (const change of changes) {
        await sqlRun(pool, `INSERT INTO sync_change_log
          (user_id, device_id, entity_type, entity_id, operation_type, payload_json, client_version)
          VALUES (?, ?, ?, ?, ?, ?, ?)`, [
          currentUser.id,
          deviceId,
          text(change.entityType).trim() || "unknown",
          text(change.entityId).trim() || crypto.randomUUID(),
          text(change.operationType).trim() || "upsert",
          JSON.stringify(change.payload ?? {}),
          clientVersion,
        ]);
      }
      json(res, 200, {
        ok: true,
        accepted: changes.length,
        serverVersion: Date.now(),
      }, origin);
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/v2/sync/pull") {
      const sinceVersion = Number(url.searchParams.get("sinceVersion") || 0);
      const rows = await sqlAll(pool, `SELECT id, device_id, entity_type, entity_id, operation_type, payload_json, created_at
        FROM sync_change_log
        WHERE user_id = ? AND id > ?
        ORDER BY id ASC
        LIMIT 500`, [currentUser.id, sinceVersion]);
      json(res, 200, {
        changes: rows.map((row) => ({
          version: Number(row.id),
          deviceId: row.device_id,
          entityType: row.entity_type,
          entityId: row.entity_id,
          operationType: row.operation_type,
          payload: maybeParseJson(row.payload_json) || {},
          createdAt: row.created_at,
        })),
        serverVersion: rows.length ? Number(rows.at(-1).id) : sinceVersion,
      }, origin);
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/auth/me") {
      json(res, 200, { user: await profileForUser(currentUser.id) }, origin);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/auth/logout") {
      await sqlRun(pool, "DELETE FROM sessions WHERE token_hash = ?", [currentUser.tokenHash]);
      json(res, 200, { ok: true }, origin);
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/tools/hk-ipo/rules") {
      const saved = await loadHkIpoRulesConfig(currentUser.id);
      const payload = buildHkIpoPayload(saved || {});
      json(res, 200, {
        rules: payload.rules,
        threshold: payload.threshold,
        updatedAt: saved?.updatedAt || "",
      }, origin);
      return;
    }
    if (req.method === "PUT" && url.pathname === "/api/tools/hk-ipo/rules") {
      const body = await readBody(req);
      if (body.reset) {
        await saveHkIpoRulesConfig(currentUser.id, null);
        const payload = buildHkIpoPayload({});
        json(res, 200, {
          ok: true,
          rules: payload.rules,
          threshold: payload.threshold,
          stats: hkIpoStats(payload.rows),
        }, origin);
        return;
      }
      const rules = Array.isArray(body.rules) ? body.rules.map((rule) => {
        const score = Number.isFinite(Number(rule.score)) ? Number(rule.score) : 0;
        const defaultScore = Number.isFinite(Number(rule.defaultScore)) ? Number(rule.defaultScore) : score;
        return {
          id: text(rule.id) || crypto.randomUUID(),
          category: text(rule.category),
          item: text(rule.item),
          condition: text(rule.condition),
          score,
          defaultScore,
          system: true,
          custom: false,
          deleted: Boolean(rule.deleted),
        };
      }) : [];
      const threshold = Number(body.threshold) || HK_IPO_DEFAULT_THRESHOLD;
      const config = { rules, threshold, updatedAt: new Date().toISOString() };
      await saveHkIpoRulesConfig(currentUser.id, config);
      const payload = buildHkIpoPayload(config);
      json(res, 200, {
        ok: true,
        rules: payload.rules,
        threshold: payload.threshold,
        stats: hkIpoStats(payload.rows),
        updatedAt: config.updatedAt,
      }, origin);
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/tools/hk-ipo/export") {
      const saved = await loadHkIpoRulesConfig(currentUser.id);
      const payload = filterHkIpoPayload(buildHkIpoPayload(saved || {}), {
        status: url.searchParams.get("status") || "all",
        query: url.searchParams.get("query") || "",
        startDate: url.searchParams.get("startDate") || "",
        endDate: url.searchParams.get("endDate") || "",
      });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(hkIpoSheetRows(payload.rows)), "主表");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payload.recommendations), "推荐排序");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(hkIpoBigVSheetRows(payload.bigVRows)), "大V意向");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payload.rules), "评分规则");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payload.scoreRows.map((row) => ({
        代码: row.code,
        公司名称: row.companyName,
        得分: row.score,
        申购态度: row.attitude,
        是否打: row.shouldApply,
        评分明细: row.components.map((item) => `${item.item}:${item.score}`).join("；"),
      }))), "评分明细");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payload.validationRows), "数据校验");
      const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
      const fileName = `港股打新分析_${new Date().toISOString().slice(0, 10)}.xlsx`;
      if (allowedOrigins.has(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
      }
      res.writeHead(200, {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "no-cache",
      });
      res.end(buffer);
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/tools/hk-ipo") {
      const saved = await loadHkIpoRulesConfig(currentUser.id);
      let payload = filterHkIpoPayload(buildHkIpoPayload(saved || {}), {
        status: url.searchParams.get("status") || "all",
        query: url.searchParams.get("query") || "",
        startDate: url.searchParams.get("startDate") || "",
        endDate: url.searchParams.get("endDate") || "",
      });
      if (url.searchParams.get("refresh") === "1") {
        payload = await enrichHkIpoSponsorsFromTradeGo(payload);
        payload = await enrichHkIpoBigVRowsFromNetwork(payload);
        payload = hkIpoRebuildDerivedPayload(payload);
      }
      json(res, 200, payload, origin);
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/state") {
      json(res, 200, { state: await loadUserState(currentUser.id) }, origin);
      return;
    }
    if (req.method === "PUT" && url.pathname === "/api/state") {
      const body = await readBody(req);
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await saveUserState(conn, currentUser.id, body.state || {});
        await conn.commit();
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
      json(res, 200, { ok: true, updatedAt: new Date().toISOString() }, origin);
      return;
    }

    // ─── Finance asset code lookup (authenticated user) ───
    if (req.method === "GET" && url.pathname === "/api/finance/lookup") {
      const q = (url.searchParams.get("q") || "").trim();
      if (!q) {
        json(res, 200, { items: [] }, origin);
        return;
      }
      const normalizedQuery = q.trim().toUpperCase();
      const localInstruments = [
        { code: "XAU", name: "现货黄金", classify: "Commodity", typeName: "贵金属", marketType: "overseas", mktNum: "" },
        { code: "XAG", name: "现货白银", classify: "Commodity", typeName: "贵金属", marketType: "overseas", mktNum: "" },
        { code: "WTI", name: "WTI原油", classify: "Commodity", typeName: "原油", marketType: "overseas", mktNum: "" },
        { code: "BRENT", name: "布伦特原油", classify: "Commodity", typeName: "原油", marketType: "overseas", mktNum: "" },
        { code: "AU", name: "沪金", classify: "Futures", typeName: "国内期货", marketType: "domestic", mktNum: "" },
        { code: "AG", name: "沪银", classify: "Futures", typeName: "国内期货", marketType: "domestic", mktNum: "" },
        { code: "BTC", name: "比特币", classify: "Crypto", typeName: "加密货币", marketType: "overseas", mktNum: "" },
        { code: "ETH", name: "以太坊", classify: "Crypto", typeName: "加密货币", marketType: "overseas", mktNum: "" },
        { code: "USDT", name: "泰达币", classify: "Crypto", typeName: "稳定币", marketType: "overseas", mktNum: "" },
        { code: "USDC", name: "USD Coin", classify: "Crypto", typeName: "稳定币", marketType: "overseas", mktNum: "" },
      ];
      const localItems = localInstruments.filter((item) =>
        item.code.includes(normalizedQuery)
        || item.name.toUpperCase().includes(normalizedQuery));
      try {
        const searchUrl = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(q)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=10`;
        const searchRes = await fetch(searchUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          signal: AbortSignal.timeout(8000),
        });
        const searchData = await searchRes.json();
        const rows = searchData?.QuotationCodeTable?.Data || [];
        const items = rows
          .filter((r) => ["AStock", "OTCFUND", "ETF", "Index", "HK", "UsStock", "UsADR"].includes(r.Classify))
          .slice(0, 8)
          .map((r) => ({
            code: r.Code,
            name: r.Name,
            classify: r.Classify,
            typeName: r.SecurityTypeName,
            marketType: r.MarketType,
            mktNum: r.MktNum,
            jys: r.JYS || "",
          }));
        for (const item of localItems) {
          if (!items.some((entry) => entry.code === item.code && entry.classify === item.classify)) items.push(item);
        }

        // ── Build Tencent Finance price queries ──
        const tencentQueries = []; // { tencentCode, itemIndex }
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          let tencentCode = null;
          if (it.marketType === "1") {
            // Shanghai A-share
            tencentCode = "sh" + it.code;
          } else if (it.marketType === "2") {
            // Shenzhen A-share
            tencentCode = "sz" + it.code;
          } else if (it.classify === "HK" || it.mktNum === "116") {
            // Hong Kong - 5-digit zero-padded
            const hkCode = it.code.padStart(5, "0");
            tencentCode = "hk" + hkCode;
          } else if (it.classify === "UsStock" || it.classify === "UsADR" || ["105", "106", "107"].includes(it.mktNum)) {
            // US stocks - uppercase ticker
            tencentCode = "us" + it.code.toUpperCase();
          }
          if (tencentCode) {
            tencentQueries.push({ tencentCode, index: i });
          }
        }

        // ── Fetch prices via Tencent Finance (GBK encoded, ~ separated) ──
        if (tencentQueries.length) {
          try {
            const queryStr = tencentQueries.map((q) => q.tencentCode).join(",");
            const priceUrl = `http://qt.gtimg.cn/q=${queryStr}`;
            const priceRes = await fetch(priceUrl, {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
              signal: AbortSignal.timeout(6000),
            });
            const priceBuf = Buffer.from(await priceRes.arrayBuffer());
            const priceText = new TextDecoder("gbk").decode(priceBuf);
            const priceMap = new Map();
            // Tencent responses may be separated by ; or newlines
            const segments = priceText.split(/[;\n]/).map((s) => s.trim()).filter(Boolean);
            for (const segment of segments) {
              const match = segment.match(/v_(\w+)="(.*)"/);
              if (!match || !match[2]) continue;
              const fullCode = match[1];
              const parts = match[2].split("~");
              if (parts.length > 32) {
                const price = parseFloat(parts[3]) || null;
                const changePct = parseFloat(parts[32]) || null;
                const changeAmt = parseFloat(parts[31]) || null;
                priceMap.set(fullCode, { price, changePct, changeAmt });
              }
            }
            for (const { tencentCode, index } of tencentQueries) {
              const pm = priceMap.get(tencentCode);
              if (pm) {
                items[index].price = pm.price;
                items[index].changePct = pm.changePct;
                items[index].changeAmt = pm.changeAmt;
              }
            }
          } catch (_) { /* price fetch is best-effort */ }
        }

        // ── For items still without price, try Sina Finance as fallback ──
        const sinaQueries = [];
        for (let i = 0; i < items.length; i++) {
          if (items[i].price != null) continue;
          const it = items[i];
          let sinaCode = null;
          if (it.classify === "HK" || it.mktNum === "116") {
            sinaCode = "hk" + it.code.padStart(5, "0");
          } else if (it.classify === "UsStock" || it.classify === "UsADR" || ["105", "106", "107"].includes(it.mktNum)) {
            sinaCode = "gb_" + it.code.toLowerCase();
          }
          if (sinaCode) sinaQueries.push({ sinaCode, index: i });
        }
        if (sinaQueries.length) {
          try {
            const queryStr = sinaQueries.map((q) => q.sinaCode).join(",");
            const sinaUrl = `https://hq.sinajs.cn/list=${queryStr}`;
            const sinaRes = await fetch(sinaUrl, {
              headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://finance.sina.com.cn" },
              signal: AbortSignal.timeout(5000),
            });
            const sinaBuf = Buffer.from(await sinaRes.arrayBuffer());
            const sinaText = new TextDecoder("gbk").decode(sinaBuf);
            for (const line of sinaText.split("\n")) {
              const match = line.match(/var hq_str_(\w+)="(.*)"/);
              if (!match || !match[2]) continue;
              const code = match[1];
              const fields = match[2].split(",");
              let price = null, changePct = null, changeAmt = null;
              if (code.startsWith("hk") && fields.length > 8) {
                price = parseFloat(fields[6]) || null;
                changePct = parseFloat(fields[8]) || null;
                changeAmt = parseFloat(fields[7]) || null;
              } else if (code.startsWith("gb_") && fields.length > 4) {
                price = parseFloat(fields[1]) || null;
                changePct = parseFloat(fields[2]) || null;
                changeAmt = parseFloat(fields[4]) || null;
              }
              const sq = sinaQueries.find((q) => q.sinaCode === code);
              if (sq && price != null) {
                items[sq.index].price = price;
                items[sq.index].changePct = changePct;
                items[sq.index].changeAmt = changeAmt;
              }
            }
          } catch (_) { /* Sina fallback is best-effort */ }
        }

        json(res, 200, { items: items.slice(0, 10) }, origin);
      } catch (err) {
        json(res, 200, { items: localItems, error: err.message }, origin);
      }
      return;
    }

    // ─── Tencent code helper ───
    function tencentCodeFor(code, market) {
      code = String(code || "").trim();
      if (!code) return null;
      market = String(market || "").toLowerCase();
      if (market === "domestic" || /^sh/i.test(code)) {
        const raw = code.replace(/^(sh|sz)/i, "");
        return (raw.startsWith("6") || raw.startsWith("9")) ? "sh" + raw : "sz" + raw;
      }
      if (market === "hk" || /^hk/i.test(code) || /^0[0-9]{4}$/.test(code)) {
        return "hk" + code.replace(/^hk/i, "").padStart(5, "0");
      }
      if (market === "us" || /^us/i.test(code)) {
        return "us" + code.replace(/^us/i, "").toUpperCase();
      }
      // Auto-detect A-share
      if (/^[569]/.test(code)) return "sh" + code;
      if (/^[013]/.test(code)) return "sz" + code;
      return null;
    }

    // ─── Real-time stock quotes (authenticated user) ───
    if (req.method === "POST" && url.pathname === "/api/finance/quotes") {
      const body = await readBody(req);
      const codes = Array.isArray(body.codes) ? body.codes : [];
      if (!codes.length) {
        json(res, 200, { quotes: [] }, origin);
        return;
      }
      // Build Tencent Finance query codes
      const queryItems = []; // { tencentCode, index, code }
      for (let i = 0; i < codes.length; i++) {
        const tc = tencentCodeFor(codes[i].code, codes[i].market);
        if (tc) queryItems.push({ tencentCode: tc, index: i, code: codes[i].code });
      }
      const results = codes.map((item) => ({
        code: item.code,
        price: null,
        changePct: null,
        changeAmt: null,
        prevClose: null,
        high: null,
        low: null,
        volume: null,
        name: null,
      }));
      if (queryItems.length) {
        try {
          const queryStr = queryItems.map((q) => q.tencentCode).join(",");
          const priceUrl = `http://qt.gtimg.cn/q=${queryStr}`;
          const priceRes = await fetch(priceUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
            signal: AbortSignal.timeout(8000),
          });
          const priceBuf = Buffer.from(await priceRes.arrayBuffer());
          const priceText = new TextDecoder("gbk").decode(priceBuf);
          const priceMap = new Map();
          const segments = priceText.split(/[;\n]/).map((s) => s.trim()).filter(Boolean);
          for (const segment of segments) {
            const match = segment.match(/v_(\w+)="(.*)"/);
            if (!match || !match[2]) continue;
            const fullCode = match[1];
            const parts = match[2].split("~");
            if (parts.length > 32) {
              const numeric = (value) => {
                const number = Number.parseFloat(value);
                return Number.isFinite(number) ? number : null;
              };
              priceMap.set(fullCode, {
                name: parts[1] || null,
                price: numeric(parts[3]),
                prevClose: numeric(parts[4]),
                changePct: numeric(parts[32]),
                changeAmt: numeric(parts[31]),
                high: numeric(parts[33]),
                low: numeric(parts[34]),
                volume: numeric(parts[36]),
              });
            }
          }
          for (const { tencentCode, index } of queryItems) {
            const pm = priceMap.get(tencentCode);
            if (pm) {
              results[index] = { ...results[index], ...pm };
            }
          }
        } catch (_) { /* best-effort */ }
      }
      // A股及场内基金缺失时，使用东方财富行情作为回退。
      const fallbackItems = queryItems.filter(({ index }) => results[index].price == null);
      await Promise.all(fallbackItems.map(async ({ tencentCode, index }) => {
        const prefix = tencentCode.slice(0, 2);
        if (!["sh", "sz"].includes(prefix)) return;
        const secid = `${prefix === "sh" ? "1" : "0"}.${tencentCode.slice(2)}`;
        try {
          const quoteRes = await fetch(`https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f44,f45,f47,f57,f58,f60,f169,f170`, {
            headers: { "User-Agent": "Mozilla/5.0" },
            signal: AbortSignal.timeout(6000),
          });
          const data = (await quoteRes.json())?.data;
          if (!data || !Number.isFinite(Number(data.f43))) return;
          const scaled = (value) => Number.isFinite(Number(value)) ? Number(value) / 100 : null;
          results[index] = {
            ...results[index],
            name: data.f58 || null,
            price: scaled(data.f43),
            prevClose: scaled(data.f60),
            changeAmt: scaled(data.f169),
            changePct: scaled(data.f170),
            high: scaled(data.f44),
            low: scaled(data.f45),
            volume: Number.isFinite(Number(data.f47)) ? Number(data.f47) : null,
          };
        } catch (_) { /* fallback is best-effort */ }
      }));
      json(res, 200, { quotes: results }, origin);
      return;
    }

    // ─── K-line historical data (authenticated user) ───
    if (req.method === "GET" && url.pathname === "/api/finance/kline") {
      const code = url.searchParams.get("code") || "";
      const market = url.searchParams.get("market") || "domestic";
      const start = url.searchParams.get("start") || "";
      const end = url.searchParams.get("end") || "";
      const count = url.searchParams.get("count") || "320";
      const tc = tencentCodeFor(code, market);
      if (!tc) {
        json(res, 400, { error: "unsupported code" }, origin);
        return;
      }
      try {
        const upstream = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${tc},day,${start},${end},${count},qfq`;
        const resp = await fetch(upstream, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          signal: AbortSignal.timeout(10000),
        });
        const data = await resp.json();
        const stockData = data?.data?.[tc];
        const kline = stockData?.qfqday || stockData?.day || [];
        json(res, 200, { kline, code: tc }, origin);
      } catch (err) {
        json(res, 502, { error: "K-line data unavailable", detail: err.message }, origin);
      }
      return;
    }

    // ─── Feedback (authenticated user) ───
    if (req.method === "POST" && url.pathname === "/api/feedback") {
      const body = await readBody(req);
      const type = text(body.type).trim() || "问题";
      const title = text(body.title).trim();
      const content = text(body.content).trim();
      const attachments = feedbackAttachments(body.attachments);
      if (!content) {
        json(res, 400, { message: "请输入反馈内容。" }, origin);
        return;
      }
      const result = await sqlRun(pool,
        "INSERT INTO feedback (user_id, type, title, content, attachments_json) VALUES (?, ?, ?, ?, ?)",
        [currentUser.id, type, title, content, JSON.stringify(attachments)]
      );
      json(res, 201, { id: result.insertId, ok: true, attachments }, origin);
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/feedback") {
      const rows = await sqlAll(pool,
        "SELECT f.*, up.name AS user_name FROM feedback f LEFT JOIN user_profiles up ON up.user_id = f.user_id WHERE f.user_id = ? ORDER BY f.created_at DESC",
        [currentUser.id]
      );
      json(res, 200, {
        feedback: rows.map((row) => ({
          ...row,
          attachments: feedbackAttachments(row.attachments_json),
        })),
      }, origin);
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      json(res, 404, { message: "接口不存在。" }, origin);
      return;
    }
    json(res, 404, { message: "资源不存在。" }, origin);
  } catch (error) {
    console.error(error);
    const status = error.code === "ER_DUP_ENTRY" || String(error.message).includes("UNIQUE") ? 409 : 500;
    json(res, status, { message: status === 409 ? "数据已存在。" : "服务器处理失败。", detail: error.message }, origin);
  }
});

server.listen(PORT, "0.0.0.0", async () => {
  console.log(`Asset Platform API listening on 0.0.0.0:${PORT} (MySQL)`);
  void refreshPremiumMarketInBackground();
  try { await initDb; await ensureDefaultAdmin(); } catch (e) { console.error("Admin init error:", e.message); }
});
