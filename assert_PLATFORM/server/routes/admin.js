import crypto from "node:crypto";
import { pool } from "../db/index.js";
import { json, readBody } from "../utils/http.js";
import { sqlRun, sqlAll, sqlGet } from "../utils/db.js";
import { text } from "../utils/validators.js";
import { verifyPassword } from "../utils/crypto.js";
import { issueAdminToken } from "../auth/token.js";
import { fmtDt } from "../utils/date.js";
import { TOKEN_TTL_DAYS } from "../config/index.js";
import { getAllFeedback, updateFeedbackStatus } from "../services/feedback-service.js";

async function handler(req, res, body, origin, pathname, url) {
  if (req.method === "POST" && pathname === "/api/admin/login") {
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
    const token = await issueAdminToken(admin.id);
    json(res, 200, { token, admin: { id: admin.id, username: admin.username } }, origin);
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/logout") {
    const admin = res.locals?.admin;
    if (admin) {
      await sqlRun(pool, "DELETE FROM admin_sessions WHERE token_hash = ?", [admin.tokenHash]);
    }
    json(res, 200, { ok: true }, origin);
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/dashboard") {
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

  if (req.method === "GET" && pathname === "/api/admin/users") {
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

  if (req.method === "GET" && pathname === "/api/admin/feedback") {
    const result = await getAllFeedback();
    json(res, 200, result, origin);
    return;
  }

  if (req.method === "PUT" && pathname.startsWith("/api/admin/feedback/")) {
    const id = parseInt(pathname.split("/").pop(), 10);
    const result = await updateFeedbackStatus(id, body);
    json(res, 200, result, origin);
    return;
  }

  json(res, 404, { message: "管理接口不存在。" }, origin);
}

export { handler };
