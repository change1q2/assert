import { pool } from "../db/index.js";
import { json, readBody } from "../utils/http.js";
import { sqlRun } from "../utils/db.js";
import { profileForUser } from "../services/user-service.js";
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
    json(res, 200, { state: await loadUserState(user.id) }, origin);
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
      throw error;
    } finally {
      conn.release();
    }
    json(res, 200, { ok: true, updatedAt: new Date().toISOString() }, origin);
    return;
  }
}

export { handler };
