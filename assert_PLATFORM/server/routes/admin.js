import crypto from "node:crypto";
import { pool } from "../db/index.js";
import { json, readBody } from "../utils/http.js";
import { sqlRun, sqlAll, sqlGet } from "../utils/db.js";
import { text } from "../utils/validators.js";
import { verifyPassword, hashPassword } from "../utils/crypto.js";
import { issueAdminToken } from "../auth/token.js";
import { fmtDt } from "../utils/date.js";
import { TOKEN_TTL_DAYS } from "../config/index.js";
import { getAllFeedback, getFeedbackById, updateFeedbackStatus, updateFeedbackReview } from "../services/feedback-service.js";

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
    const keyword = text(url.searchParams.get('keyword') || '').trim();
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.max(1, Math.min(50, parseInt(url.searchParams.get('pageSize') || '10', 10)));
    const offset = (page - 1) * pageSize;
    
    let whereClause = '';
    let params = [];
    
    if (keyword) {
      whereClause = `WHERE u.account LIKE ? OR COALESCE(up.name, '') LIKE ? OR COALESCE(up.phone, '') LIKE ? OR COALESCE(up.email, '') LIKE ?`;
      const likeKeyword = `%${keyword}%`;
      params = [likeKeyword, likeKeyword, likeKeyword, likeKeyword];
    }
    
    const countResult = await sqlGet(pool, `
      SELECT COUNT(*) AS total FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id ${whereClause}
    `, params);
    
    const rows = await sqlAll(pool, `
      SELECT u.id, u.account, u.created_at,
        COALESCE(up.name, '') AS name,
        COALESCE(up.phone, '') AS phone,
        COALESCE(up.email, '') AS email
      FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `, params);
    
    json(res, 200, { 
      users: rows,
      total: countResult.total,
      page,
      pageSize,
      totalPages: Math.ceil(countResult.total / pageSize)
    }, origin);
    return;
  }

  if (req.method === "PUT" && pathname.startsWith("/api/admin/users/")) {
    const userId = parseInt(pathname.split("/").pop(), 10);
    if (isNaN(userId)) {
      json(res, 400, { message: "无效的用户ID。" }, origin);
      return;
    }
    const name = text(body.name).trim();
    const phone = text(body.phone).trim();
    const email = text(body.email).trim();
    
    await sqlRun(pool, `
      UPDATE user_profiles SET name = ?, phone = ?, email = ?, updated_at = NOW() WHERE user_id = ?
    `, [name, phone, email, userId]);
    
    json(res, 200, { ok: true }, origin);
    return;
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/admin/users/")) {
    const userId = parseInt(pathname.split("/").pop(), 10);
    if (isNaN(userId)) {
      json(res, 400, { message: "无效的用户ID。" }, origin);
      return;
    }
    
    const admin = res.locals?.admin;
    if (!admin) {
      json(res, 401, { message: "管理员登录已失效。" }, origin);
      return;
    }
    
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await sqlRun(conn, "DELETE FROM admin_users WHERE username = (SELECT account FROM users WHERE id = ?)", [userId]);
      await sqlRun(conn, "DELETE FROM sessions WHERE user_id = ?", [userId]);
      await sqlRun(conn, "DELETE FROM user_profiles WHERE user_id = ?", [userId]);
      await sqlRun(conn, "DELETE FROM users WHERE id = ?", [userId]);
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
    
    json(res, 200, { ok: true }, origin);
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/feedback") {
    const keyword = text(url.searchParams.get('keyword') || '').trim();
    const status = text(url.searchParams.get('status') || '').trim();
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
    const sortBy = text(url.searchParams.get('sortBy') || 'title').trim();
    const result = await getAllFeedback({ keyword, status, page, pageSize, sortBy });
    json(res, 200, result, origin);
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/api/admin/feedback/")) {
    const id = parseInt(pathname.split("/").pop(), 10);
    if (isNaN(id)) {
      json(res, 400, { message: "无效的反馈ID。" }, origin);
      return;
    }
    const feedback = await getFeedbackById(id);
    if (!feedback) {
      json(res, 404, { message: "反馈不存在。" }, origin);
      return;
    }
    json(res, 200, { feedback }, origin);
    return;
  }

  if (req.method === "PUT" && pathname.startsWith("/api/admin/feedback/")) {
    const id = parseInt(pathname.split("/").pop(), 10);
    const result = await updateFeedbackStatus(id, body);
    json(res, 200, result, origin);
    return;
  }

  if (req.method === "PATCH" && pathname.startsWith("/api/admin/feedback/")) {
    const id = parseInt(pathname.split("/").pop(), 10);
    if (isNaN(id)) {
      json(res, 400, { message: "无效的反馈ID。" }, origin);
      return;
    }
    const reviewed = !!body.reviewed;
    const result = await updateFeedbackReview(id, reviewed);
    json(res, 200, result, origin);
    return;
  }

  if (req.method === "POST" && pathname.startsWith("/api/admin/users/") && pathname.endsWith("/reset-password")) {
    const segments = pathname.split("/").filter(Boolean);
    const userId = parseInt(segments[3], 10);
    if (isNaN(userId)) {
      json(res, 400, { message: "无效的用户ID。" }, origin);
      return;
    }
    const newPassword = text(body.newPassword);
    if (!newPassword || newPassword.length < 6) {
      json(res, 400, { message: "新密码至少需要 6 位。" }, origin);
      return;
    }
    
    const user = await sqlGet(pool, "SELECT id FROM users WHERE id = ?", [userId]);
    if (!user) {
      json(res, 404, { message: "用户不存在。" }, origin);
      return;
    }
    
    await sqlRun(pool, "UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?", [hashPassword(newPassword), userId]);
    await sqlRun(pool, "DELETE FROM sessions WHERE user_id = ?", [userId]);
    
    json(res, 200, { ok: true, message: "密码重置成功。" }, origin);
    return;
  }

  json(res, 404, { message: "管理接口不存在。" }, origin);
}

export { handler };
