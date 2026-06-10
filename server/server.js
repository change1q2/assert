import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.resolve(__dirname, "..");
const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "asset-platform.sqlite"));
db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));

const PORT = Number(process.env.API_PORT || 3000);
const TOKEN_TTL_DAYS = 30;
const SMS_CODE_TTL_MINUTES = 5;
const SMS_RESEND_SECONDS = 60;
const allowedOrigins = new Set([
  "http://127.0.0.1:4173",
  "http://localhost:4173",
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

function issueToken(userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 86400000).toISOString();
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(tokenHash, userId, expiresAt);
  return token;
}

function userByPhone(phone) {
  return db.prepare(`
    SELECT users.id, users.account, users.password_hash
    FROM users JOIN user_profiles ON user_profiles.user_id = users.id
    WHERE user_profiles.phone = ?
    ORDER BY users.id
    LIMIT 1
  `).get(phone);
}

function verificationCodeHash(phone, purpose, code) {
  return crypto.createHash("sha256").update(`${phone}:${purpose}:${code}`).digest("hex");
}

function createSmsCode(phone, purpose) {
  const previous = db.prepare(`
    SELECT created_at FROM sms_verification_codes
    WHERE phone = ? AND purpose = ?
    ORDER BY id DESC LIMIT 1
  `).get(phone, purpose);
  if (previous && Date.now() - new Date(`${previous.created_at}Z`).getTime() < SMS_RESEND_SECONDS * 1000) {
    throw new Error("验证码发送过于频繁，请稍后再试。");
  }
  const code = String(crypto.randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + SMS_CODE_TTL_MINUTES * 60000).toISOString();
  db.prepare(`
    INSERT INTO sms_verification_codes (phone, purpose, code_hash, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(phone, purpose, verificationCodeHash(phone, purpose, code), expiresAt);
  return code;
}

function verifySmsCode(phone, purpose, code) {
  const row = db.prepare(`
    SELECT id, code_hash, expires_at FROM sms_verification_codes
    WHERE phone = ? AND purpose = ? AND used_at = ''
    ORDER BY id DESC LIMIT 1
  `).get(phone, purpose);
  if (!row || row.expires_at <= new Date().toISOString()) return false;
  const actual = Buffer.from(verificationCodeHash(phone, purpose, code), "hex");
  const expected = Buffer.from(row.code_hash, "hex");
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return false;
  db.prepare("UPDATE sms_verification_codes SET used_at = ? WHERE id = ?").run(new Date().toISOString(), row.id);
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

function authenticatedUser(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const row = db.prepare(`
    SELECT users.id, users.account
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `).get(tokenHash, new Date().toISOString());
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
      targetValue: 0, income: 0, expense: 0, laborIncome: 0,
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

function profileForUser(userId) {
  const row = db.prepare(`
    SELECT u.account, p.* FROM users u
    JOIN user_profiles p ON p.user_id = u.id
    WHERE u.id = ?
  `).get(userId);
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

function loadUserState(userId) {
  const profile = profileForUser(userId);
  const rates = Object.fromEntries(db.prepare("SELECT currency, rate FROM exchange_rates WHERE user_id = ?").all(userId).map((row) => [row.currency, row.rate]));
  const accounts = db.prepare("SELECT * FROM accounts WHERE user_id = ? ORDER BY rowid").all(userId).map((row) => ({
    id: row.id, name: row.name, owner: row.owner, currency: row.currency, type: row.type,
    balance: row.balance, liability: row.liability, enabled: Boolean(row.enabled), default: Boolean(row.is_default),
  }));
  const assetClasses = db.prepare("SELECT * FROM asset_classes WHERE user_id = ? ORDER BY rowid").all(userId).map((row) => ({
    id: row.id, name: row.name, children: JSON.parse(row.children_json), visible: Boolean(row.visible),
    value: row.value, openingValue: row.opening_value, targetValue: row.target_value,
    income: row.income, expense: row.expense, laborIncome: row.labor_income, color: row.color,
  }));
  const records = db.prepare("SELECT * FROM records WHERE user_id = ? ORDER BY record_date DESC, rowid DESC").all(userId).map((row) => ({
    id: numericIfPossible(row.id), type: row.type, category: row.category, sub: row.subcategory,
    tag: row.tag, amount: row.amount, currency: row.currency, accountId: row.account_id,
    date: row.record_date, recorder: row.recorder, note: row.note, createdAt: row.created_at,
  }));
  const budgets = db.prepare("SELECT * FROM budgets WHERE user_id = ? ORDER BY rowid").all(userId).map((row) => ({
    id: numericIfPossible(row.id), name: row.name, category: row.category, amount: row.amount, used: row.used,
  }));
  const financeAssets = db.prepare("SELECT * FROM finance_assets WHERE user_id = ? ORDER BY rowid").all(userId).map((row) => ({
    id: numericIfPossible(row.id), kind: row.kind, accountId: row.account_id, category: row.category,
    subcategory: row.subcategory, tertiaryCategory: row.tertiary_category, market: row.market,
    currency: row.currency, name: row.name, code: row.code, positionGroup: row.position_group,
    positionCategory: row.position_category, costPrice: row.cost_price, shares: row.shares, pnl: row.pnl,
  }));
  const customRecords = { income: [], expense: [], transfer: [] };
  db.prepare("SELECT record_type, name FROM custom_record_categories WHERE user_id = ? ORDER BY rowid").all(userId)
    .forEach((row) => (customRecords[row.record_type] ||= []).push(row.name));
  const tertiaryByScope = {};
  db.prepare("SELECT scope, name FROM finance_tertiary_categories WHERE user_id = ? ORDER BY rowid").all(userId)
    .forEach((row) => (tertiaryByScope[row.scope] ||= []).push(row.name));
  const recordTags = { tagsByCategory: {}, lastByCategory: {} };
  db.prepare("SELECT category, tag, is_last FROM record_tags WHERE user_id = ? ORDER BY rowid").all(userId).forEach((row) => {
    (recordTags.tagsByCategory[row.category] ||= []).push(row.tag);
    if (row.is_last) recordTags.lastByCategory[row.category] = row.tag;
  });
  const recorders = db.prepare("SELECT name FROM recorders WHERE user_id = ? ORDER BY sort_order").all(userId).map((row) => row.name);
  const reminders = db.prepare("SELECT * FROM reminders WHERE user_id = ? ORDER BY reminder_date").all(userId).map((row) => ({
    id: row.id, date: row.reminder_date, title: row.title, type: row.type,
  }));
  const debts = db.prepare("SELECT * FROM debts WHERE user_id = ? ORDER BY rowid").all(userId).map((row) => {
    const payments = Object.fromEntries(db.prepare("SELECT period, status FROM debt_payments WHERE user_id = ? AND debt_id = ?").all(userId, row.id).map((payment) => [payment.period, payment.status]));
    return {
      id: numericIfPossible(row.id), category: row.category, type: row.type, name: row.name,
      creditorName: row.creditor_name, debtorName: row.debtor_name, principal: row.principal,
      annualRate: row.annual_rate, amount: row.amount, paidAmount: row.paid_amount,
      note: row.note, attachment: row.attachment, startDate: row.start_date, dueDate: row.due_date,
      repaymentMethod: row.repayment_method, payments,
    };
  });
  const strategies = db.prepare("SELECT * FROM strategies WHERE user_id = ? ORDER BY id").all(userId).map((row) => ({
    id: row.id, name: row.name, active: Boolean(row.active), target: row.target,
    allocation: JSON.parse(row.allocation_json), debtLimit: row.debt_limit,
    annualReturn: row.annual_return, risk: row.risk,
  }));
  const settings = db.prepare("SELECT finance_asset_draft_json FROM user_settings WHERE user_id = ?").get(userId);
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
    debts,
    strategies,
    financeAssetDraft: settings ? JSON.parse(settings.finance_asset_draft_json) : {},
  };
}

const numericIfPossible = (value) => String(Number(value)) === String(value) ? Number(value) : value;
const text = (value) => String(value ?? "");
const number = (value) => Number(value) || 0;

function saveUserState(userId, state) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const user = state.user || {};
    db.prepare(`
      UPDATE user_profiles SET name=?, phone=?, email=?, currency=?, theme=?, avatar=?, birthday=?, city=?,
      occupation=?, risk_level=?, privacy_lock=?, data_mask=?, device_name=? WHERE user_id=?
    `).run(text(user.name), text(user.phone), text(user.email), text(user.currency || "CNY"), text(user.theme || "light"),
      text(user.avatar), text(user.birthday), text(user.city), text(user.occupation), text(user.riskLevel || "稳健型"),
      text(user.privacyLock || "已开启"), text(user.dataMask || "已开启"), text(user.deviceName), userId);

    const tables = [
      "exchange_rates", "accounts", "asset_classes", "records", "budgets", "finance_assets",
      "custom_record_categories", "finance_tertiary_categories", "record_tags", "recorders",
      "reminders", "debt_payments", "debts", "strategies", "user_settings",
    ];
    tables.forEach((table) => db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).run(userId));

    const insertRate = db.prepare("INSERT INTO exchange_rates VALUES (?, ?, ?)");
    Object.entries(state.rates || {}).forEach(([currency, rate]) => insertRate.run(userId, currency, number(rate)));

    const insertAccount = db.prepare("INSERT INTO accounts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    (state.accounts || []).forEach((row) => insertAccount.run(userId, text(row.id), text(row.name), text(row.owner), text(row.currency), text(row.type), number(row.balance), number(row.liability), row.enabled === false ? 0 : 1, row.default ? 1 : 0));

    const insertClass = db.prepare("INSERT INTO asset_classes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    (state.assetClasses || []).forEach((row) => insertClass.run(userId, text(row.id), text(row.name), JSON.stringify(row.children || []), row.visible === false ? 0 : 1, number(row.value), number(row.openingValue), number(row.targetValue), number(row.income), number(row.expense), number(row.laborIncome), text(row.color || "#539f8d")));

    const insertRecord = db.prepare("INSERT INTO records VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    (state.records || []).forEach((row) => insertRecord.run(userId, text(row.id), text(row.type), text(row.category), text(row.sub), text(row.tag), number(row.amount), text(row.currency), text(row.accountId), text(row.date), text(row.recorder), text(row.note), text(row.createdAt)));

    const insertBudget = db.prepare("INSERT INTO budgets VALUES (?, ?, ?, ?, ?, ?)");
    (state.budgets || []).forEach((row) => insertBudget.run(userId, text(row.id), text(row.name), text(row.category), number(row.amount), number(row.used)));

    const insertFinance = db.prepare("INSERT INTO finance_assets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    (state.financeAssets || []).forEach((row) => insertFinance.run(userId, text(row.id), text(row.kind), text(row.accountId), text(row.category), text(row.subcategory), text(row.tertiaryCategory), text(row.market), text(row.currency), text(row.name), text(row.code), text(row.positionGroup), text(row.positionCategory), number(row.costPrice), number(row.shares), number(row.pnl)));

    const insertCategory = db.prepare("INSERT INTO custom_record_categories VALUES (?, ?, ?)");
    Object.entries(state.customCategories?.records || {}).forEach(([type, names]) => (names || []).forEach((name) => insertCategory.run(userId, type, text(name))));
    const insertTertiary = db.prepare("INSERT INTO finance_tertiary_categories VALUES (?, ?, ?)");
    Object.entries(state.customCategories?.finance?.tertiaryByScope || {}).forEach(([scope, names]) => (names || []).forEach((name) => insertTertiary.run(userId, scope, text(name))));

    const insertTag = db.prepare("INSERT INTO record_tags VALUES (?, ?, ?, ?)");
    Object.entries(state.recordTags?.tagsByCategory || {}).forEach(([category, tags]) => (tags || []).forEach((tag) => insertTag.run(userId, category, text(tag), state.recordTags?.lastByCategory?.[category] === tag ? 1 : 0)));
    const insertRecorder = db.prepare("INSERT INTO recorders VALUES (?, ?, ?)");
    (state.recorders || []).forEach((name, index) => insertRecorder.run(userId, text(name), index));

    const insertReminder = db.prepare("INSERT INTO reminders VALUES (?, ?, ?, ?, ?)");
    (state.reminders || []).forEach((row, index) => insertReminder.run(userId, Number(row.id) || index + 1, text(row.date), text(row.title), text(row.type)));

    const insertDebt = db.prepare("INSERT INTO debts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    const insertPayment = db.prepare("INSERT INTO debt_payments VALUES (?, ?, ?, ?)");
    (state.debts || []).forEach((row) => {
      const debtId = text(row.id);
      insertDebt.run(userId, debtId, text(row.category), text(row.type), text(row.name), text(row.creditorName), text(row.debtorName), number(row.principal), number(row.annualRate), number(row.amount), number(row.paidAmount), text(row.note), text(row.attachment), text(row.startDate), text(row.dueDate), text(row.repaymentMethod));
      Object.entries(row.payments || {}).forEach(([period, status]) => insertPayment.run(userId, debtId, Number(period), text(status)));
    });

    const insertStrategy = db.prepare("INSERT INTO strategies VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    (state.strategies || []).forEach((row) => insertStrategy.run(userId, Number(row.id), text(row.name), row.active ? 1 : 0, text(row.target), JSON.stringify(row.allocation || []), number(row.debtLimit), number(row.annualReturn), text(row.risk)));
    db.prepare("INSERT INTO user_settings VALUES (?, ?)").run(userId, JSON.stringify(state.financeAssetDraft || {}));
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function createUser({ account, password, name, phone, email, currency }) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = db.prepare("INSERT INTO users (account, password_hash) VALUES (?, ?)").run(account, hashPassword(password));
    const userId = Number(result.lastInsertRowid);
    db.prepare(`
      INSERT INTO user_profiles (user_id, name, phone, email, currency)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, name, phone, email, currency);
    db.exec("COMMIT");
    return userId;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function authPayload(userId) {
  return {
    token: issueToken(userId),
    user: profileForUser(userId),
    state: loadUserState(userId),
  };
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || "";
  if (req.method === "OPTIONS") {
    if (allowedOrigins.has(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
    res.writeHead(204);
    res.end();
    return;
  }
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      json(res, 200, { ok: true, database: "sqlite" }, origin);
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
      const existingUser = userByPhone(phone);
      if (purpose === "register" && existingUser) {
        json(res, 409, { message: "这个手机号已经注册，请直接登录。" }, origin);
        return;
      }
      if (purpose !== "register" && !existingUser) {
        json(res, 404, { message: "这个手机号尚未注册。" }, origin);
        return;
      }
      const code = createSmsCode(phone, purpose);
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
      if (db.prepare("SELECT id FROM users WHERE account = ?").get(account)) {
        json(res, 409, { message: "这个账号已经注册，请直接登录。" }, origin);
        return;
      }
      if (userByPhone(phone)) {
        json(res, 409, { message: "这个手机号已经注册，请直接登录。" }, origin);
        return;
      }
      if (!verifySmsCode(phone, "register", smsCode)) {
        json(res, 400, { message: "短信验证码不正确或已过期。" }, origin);
        return;
      }
      const userId = createUser({ account, password, name, phone, email, currency });
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
      saveUserState(userId, initialState);
      json(res, 201, authPayload(userId), origin);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/auth/login") {
      const body = await readBody(req);
      const user = db.prepare("SELECT id, account, password_hash FROM users WHERE account = ?").get(text(body.account).trim());
      if (!user || !verifyPassword(text(body.password), user.password_hash)) {
        json(res, 401, { message: "账号或密码不正确。" }, origin);
        return;
      }
      json(res, 200, authPayload(user.id), origin);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/auth/phone-login") {
      const body = await readBody(req);
      const phone = text(body.phone).trim();
      const user = userByPhone(phone);
      if (!user || !verifySmsCode(phone, "login", text(body.smsCode).trim())) {
        json(res, 401, { message: "手机号或验证码不正确。" }, origin);
        return;
      }
      json(res, 200, authPayload(user.id), origin);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/auth/reset-password") {
      const body = await readBody(req);
      const phone = text(body.phone).trim();
      const password = text(body.password);
      const user = userByPhone(phone);
      if (!user) {
        json(res, 404, { message: "这个手机号尚未注册。" }, origin);
        return;
      }
      if (password.length < 6) {
        json(res, 400, { message: "新密码至少需要 6 位。" }, origin);
        return;
      }
      if (!verifySmsCode(phone, "reset", text(body.smsCode).trim())) {
        json(res, 400, { message: "短信验证码不正确或已过期。" }, origin);
        return;
      }
      db.prepare("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(hashPassword(password), user.id);
      db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
      json(res, 200, authPayload(user.id), origin);
      return;
    }
    if (req.method === "GET" && !url.pathname.startsWith("/api/")) {
      serveStatic(url, res);
      return;
    }

    const currentUser = authenticatedUser(req);
    if (!currentUser) {
      json(res, 401, { message: "登录已失效，请重新登录。" }, origin);
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/auth/me") {
      json(res, 200, { user: profileForUser(currentUser.id) }, origin);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/auth/logout") {
      db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(currentUser.tokenHash);
      json(res, 200, { ok: true }, origin);
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/state") {
      json(res, 200, { state: loadUserState(currentUser.id) }, origin);
      return;
    }
    if (req.method === "PUT" && url.pathname === "/api/state") {
      const body = await readBody(req);
      saveUserState(currentUser.id, body.state || {});
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
    const status = String(error.message).includes("UNIQUE") ? 409 : 500;
    json(res, status, { message: status === 409 ? "数据已存在。" : "服务器处理失败。", detail: error.message }, origin);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Asset Platform API listening on 0.0.0.0:${PORT}`);
});
