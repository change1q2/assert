import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.resolve(__dirname, "..");

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
const initDb = pool.query(schemaSql).then(() => {
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
};
const premiumMarketSources = [
  {
    key: "qdii",
    label: "QDII",
    url: "https://www.jisilu.cn/data/qdii/qdii_list/?___jsl=LST___t=1",
    referer: "https://www.jisilu.cn/data/qdii/",
  },
  {
    key: "etf",
    label: "ETF",
    url: "https://www.jisilu.cn/data/etf/etf_list/?___jsl=LST___t=1",
    referer: "https://www.jisilu.cn/data/etf/",
  },
  {
    key: "lof",
    label: "LOF",
    url: "https://www.jisilu.cn/data/lof/stock_lof_list/?___jsl=LST___t=1",
    referer: "https://www.jisilu.cn/data/lof/",
  },
];
let premiumMarketCache = {
  expiresAt: 0,
  payload: null,
};
let premiumMarketRefreshPromise = null;

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
  const results = await Promise.allSettled(premiumMarketSources.map(async (source) => {
    const response = await fetch(source.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PersonalAssetPlatform/1.8)",
        "X-Requested-With": "XMLHttpRequest",
        Referer: source.referer,
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error(`${source.label} 行情源返回 ${response.status}`);
    const payload = await response.json();
    return (payload.rows || [])
      .map((row) => normalizePremiumRow(row.cell || {}, source))
      .filter(Boolean);
  }));
  const successfulRows = results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value);
  if (!successfulRows.length) {
    if (premiumMarketCache.payload) return { ...premiumMarketCache.payload, cached: true, stale: true };
    throw new Error("暂时无法连接行情源");
  }
  const uniqueRows = [...new Map(successfulRows.map((row) => [row.code, row])).values()]
    .sort((a, b) => b.premiumRate - a.premiumRate);
  const payload = {
    rows: uniqueRows,
    fetchedAt: new Date().toISOString(),
    source: "公开基金行情聚合",
    sourceCount: results.filter((result) => result.status === "fulfilled").length,
    failedSources: results.filter((result) => result.status === "rejected").length,
  };
  premiumMarketCache = {
    expiresAt: now + 15_000,
    payload,
  };
  return payload;
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
  const financeAssets = (await sqlAll(pool, "SELECT * FROM finance_assets WHERE user_id = ? ORDER BY sort_order", [userId])).map((row) => ({
    id: numericIfPossible(row.id), kind: row.kind, accountId: row.account_id, category: row.category,
    subcategory: row.subcategory, tertiaryCategory: row.tertiary_category, market: row.market,
    currency: row.currency, name: row.name, code: row.code, positionGroup: row.position_group,
    positionCategory: row.position_category, costPrice: row.cost_price, shares: row.shares, pnl: row.pnl,
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
  const settings = await sqlGet(pool, "SELECT finance_asset_draft_json FROM user_settings WHERE user_id = ?", [userId]);
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
  };
}

const numericIfPossible = (value) => String(Number(value)) === String(value) ? Number(value) : value;
const text = (value) => String(value ?? "");
const number = (value) => Number(value) || 0;

async function saveUserState(conn, userId, state) {
  const user = state.user || {};
  await sqlRun(conn, `
    UPDATE user_profiles SET name=?, phone=?, email=?, currency=?, theme=?, avatar=?, birthday=?, city=?,
    occupation=?, risk_level=?, privacy_lock=?, data_mask=?, device_name=? WHERE user_id=?
  `, [text(user.name), text(user.phone), text(user.email), text(user.currency || "CNY"), text(user.theme || "light"),
    text(user.avatar), text(user.birthday), text(user.city), text(user.occupation), text(user.riskLevel || "稳健型"),
    text(user.privacyLock || "已开启"), text(user.dataMask || "已开启"), text(user.deviceName), userId]);

  const tables = [
    "exchange_rates", "accounts", "asset_classes", "records", "budgets", "finance_assets",
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
      (user_id, id, kind, account_id, category, subcategory, tertiary_category, market, currency, name, code, position_group, position_category, cost_price, shares, pnl, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, text(row.id), text(row.kind), text(row.accountId), text(row.category),
       text(row.subcategory), text(row.tertiaryCategory), text(row.market), text(row.currency),
       text(row.name), text(row.code), text(row.positionGroup), text(row.positionCategory),
       number(row.costPrice), number(row.shares), number(row.pnl), index]);
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
  await sqlRun(conn, "INSERT INTO user_settings (user_id, finance_asset_draft_json) VALUES (?, ?)",
    [userId, JSON.stringify(state.financeAssetDraft || {})]);
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
  return {
    token: await issueToken(userId),
    user: await profileForUser(userId),
    state: await loadUserState(userId),
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
    if (req.method === "GET" && !url.pathname.startsWith("/api/")) {
      serveStatic(url, res);
      return;
    }

    const currentUser = await authenticatedUser(req);
    if (!currentUser) {
      json(res, 401, { message: "登录已失效，请重新登录。" }, origin);
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

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Asset Platform API listening on 0.0.0.0:${PORT} (MySQL)`);
  void refreshPremiumMarketInBackground();
});
