import { pool } from "../db/index.js";
import { sqlRun, sqlGet } from "../utils/db.js";
import { hashPassword } from "../utils/crypto.js";
import { issueToken } from "../auth/token.js";
import { loadUserState } from "./state-service.js";

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

async function userByPhone(phone) {
  return sqlGet(pool, `
    SELECT users.id, users.account, users.password_hash
    FROM users JOIN user_profiles ON user_profiles.user_id = users.id
    WHERE user_profiles.phone = ?
    ORDER BY users.id
    LIMIT 1
  `, [phone]);
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

async function ensureDefaultAdmin() {
  const existing = await sqlGet(pool, "SELECT id FROM admin_users WHERE username = ?", ["admin"]);
  if (!existing) {
    const password = process.env.ADMIN_PASSWORD || "admin123";
    const hash = hashPassword(password);
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

export {
  defaultState,
  profileForUser,
  userByPhone,
  createUser,
  authPayload,
  ensureDefaultAdmin,
};
