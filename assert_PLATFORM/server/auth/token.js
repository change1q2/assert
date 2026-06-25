import crypto from "node:crypto";
import { pool } from "../db/index.js";
import { sqlRun, sqlGet } from "../utils/db.js";
import { fmtDt } from "../utils/date.js";
import { TOKEN_TTL_DAYS } from "../config/index.js";

async function issueToken(userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = fmtDt(new Date(Date.now() + TOKEN_TTL_DAYS * 86400000));
  await sqlRun(pool, "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)", [tokenHash, userId, expiresAt]);
  return token;
}

async function issueAdminToken(adminId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = fmtDt(new Date(Date.now() + TOKEN_TTL_DAYS * 86400000));
  await sqlRun(pool, "INSERT INTO admin_sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)", [tokenHash, adminId, expiresAt]);
  return token;
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
  const adminRow = await sqlGet(pool, `
    SELECT admin_users.id, admin_users.username
    FROM admin_sessions JOIN admin_users ON admin_users.id = admin_sessions.admin_id
    WHERE admin_sessions.token_hash = ? AND admin_sessions.expires_at > ?
  `, [tokenHash, fmtDt(new Date())]);
  if (adminRow) return { ...adminRow, tokenHash };
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

export { issueToken, issueAdminToken, authenticatedUser, authenticatedAdmin };
