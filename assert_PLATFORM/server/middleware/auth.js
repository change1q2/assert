import { authenticatedUser, authenticatedAdmin } from "../auth/index.js";
import { json } from "../utils/http.js";

async function requireUser(req, res, origin) {
  const user = await authenticatedUser(req);
  if (!user) {
    json(res, 401, { message: "登录已失效，请重新登录。" }, origin);
    return null;
  }
  return user;
}

async function requireAdmin(req, res, origin) {
  const admin = await authenticatedAdmin(req);
  if (!admin) {
    json(res, 401, { message: "管理员登录已失效。" }, origin);
    return null;
  }
  return admin;
}

export { requireUser, requireAdmin };
