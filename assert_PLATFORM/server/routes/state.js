import { pool } from "../db/index.js";
import { json, readBody } from "../utils/http.js";
import { sqlRun } from "../utils/db.js";
import { profileForUser, defaultState } from "../services/user-service.js";
import { loadUserState, saveUserState } from "../services/state-service.js";

async function handler(req, res, body, origin, pathname, url) {
  const user = res.locals?.user;
  if (!user) return;

  if (req.method === "GET" && pathname === "/api/auth/me") {
    json(res, 200, { user: await profileForUser(user.id) }, origin);
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/logout") {
    await sqlRun(pool, "DELETE FROM sessions WHERE token_hash = ?", [user.tokenHash]);
    json(res, 200, { ok: true }, origin);
    return;
  }

  if (req.method === "GET" && pathname === "/api/state") {
    try {
      json(res, 200, { state: await loadUserState(user.id) }, origin);
    } catch (error) {
      console.error("[state] GET /api/state error:", error.message);
      json(res, 200, { state: defaultState({ account: user.account, name: '', phone: '', email: '', currency: 'CNY' }), warning: "部分数据加载失败，已返回默认状态。" }, origin);
    }
    return;
  }

  if (req.method === "PUT" && pathname === "/api/state") {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await saveUserState(conn, user.id, body.state || {});
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      console.error("[state] PUT /api/state error:", error.message);
      json(res, 500, { message: "保存状态失败。", detail: error.message }, origin);
      return;
    } finally {
      conn.release();
    }
    json(res, 200, { ok: true, updatedAt: new Date().toISOString() }, origin);
    return;
  }
}

export { handler };
