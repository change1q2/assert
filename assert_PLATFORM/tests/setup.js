import http from "node:http";
import dotenv from "dotenv";
import path from "node:path";
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
import { initDb, pool } from "../server/db/index.js";
import { PORT } from "../server/config/index.js";
import { json, readBody, serveStatic } from "../server/utils/http.js";
import { logger } from "../server/utils/logger.js";
import { handleCors } from "../server/middleware/cors.js";
import { authenticatedUser, authenticatedAdmin } from "../server/auth/index.js";
import { ensureDefaultAdmin } from "../server/services/user-service.js";

import * as healthRoute from "../server/routes/health.js";
import * as authRoute from "../server/routes/auth.js";
import * as adminRoute from "../server/routes/admin.js";
import * as bootstrapRoute from "../server/routes/bootstrap.js";
import * as stateRoute from "../server/routes/state.js";
import * as financeRoute from "../server/routes/finance.js";
import * as toolsRoute from "../server/routes/tools.js";
import * as releasesRoute from "../server/routes/releases.js";
import * as feedbackRoute from "../server/routes/feedback.js";

const PUBLIC_AUTH_PATHS = new Set([
  "/api/auth/sms/send",
  "/api/auth/email-code/send",
  "/api/auth/register",
  "/api/auth/register-by-email",
  "/api/auth/login",
  "/api/auth/phone-login",
  "/api/auth/reset-password",
]);

let testServer;
let testPort = 3001;

export async function startTestServer() {
  await initDb;
  await ensureDefaultAdmin();
  
  testServer = http.createServer(async (req, res) => {
    const origin = req.headers.origin || "";

    if (handleCors(req, res)) {
      return;
    }

    const url = new URL(req.url || "/", "http://localhost");
    const pathname = url.pathname;

    let body = {};

    try {
      if (req.method === "GET" && pathname === "/api/health") {
        await healthRoute.handler(req, res, body, origin, pathname, url);
        return;
      }

      if (req.method === "GET" && pathname === "/api/tools/premium") {
        await toolsRoute.handler(req, res, body, origin, pathname, url);
        return;
      }

      if (pathname.startsWith("/api/v2/releases")) {
        await releasesRoute.handler(req, res, body, origin, pathname, url);
        return;
      }

      if (PUBLIC_AUTH_PATHS.has(pathname)) {
        if (req.method !== "GET") {
          body = await readBody(req);
        }
        await authRoute.handler(req, res, body, origin, pathname, url);
        return;
      }

      if (req.method === "POST" && pathname === "/api/admin/login") {
        body = await readBody(req);
        await adminRoute.handler(req, res, body, origin, pathname, url);
        return;
      }

      if (req.method === "GET" && !pathname.startsWith("/api/")) {
        serveStatic(url, res);
        return;
      }

      if ((req.method === "GET" || req.method === "POST") && (pathname === "/api/finance/fund-nav" || pathname === "/api/finance/fund-nav-history" || pathname === "/api/finance/quotes" || pathname === "/api/finance/kline" || pathname === "/api/finance/lookup" || pathname === "/api/finance/index" || pathname === "/api/finance/index-history" || pathname === "/api/finance/cpi")) {
        if (req.method !== "GET") {
          body = await readBody(req);
        }
        await financeRoute.handler(req, res, body, origin, pathname, url);
        return;
      }

      if (pathname.startsWith("/api/admin/")) {
        const admin = await authenticatedAdmin(req);
        if (!admin) {
          json(res, 401, { message: "管理员登录已失效。" }, origin);
          return;
        }
        res.locals = { admin };
        if (req.method !== "GET") {
          body = await readBody(req);
        }
        await adminRoute.handler(req, res, body, origin, pathname, url);
        return;
      }

      const currentUser = await authenticatedUser(req);
      if (!currentUser) {
        json(res, 401, { message: "登录已失效，请重新登录。" }, origin);
        return;
      }
      res.locals = { user: currentUser };

      if (req.method !== "GET") {
        body = await readBody(req);
      }

      if (pathname.startsWith("/api/v2/")) {
        await bootstrapRoute.handler(req, res, body, origin, pathname, url);
        return;
      }

      if (pathname === "/api/auth/me" || pathname === "/api/auth/logout" || pathname === "/api/state") {
        await stateRoute.handler(req, res, body, origin, pathname, url);
        return;
      }

      if (pathname.startsWith("/api/finance/")) {
        await financeRoute.handler(req, res, body, origin, pathname, url);
        return;
      }

      if (pathname.startsWith("/api/tools/")) {
        await toolsRoute.handler(req, res, body, origin, pathname, url);
        return;
      }

      if (pathname.startsWith("/api/feedback")) {
        await feedbackRoute.handler(req, res, body, origin, pathname, url);
        return;
      }

      if (pathname.startsWith("/api/")) {
        json(res, 404, { message: "接口不存在。" }, origin);
        return;
      }
      json(res, 404, { message: "资源不存在。" }, origin);
    } catch (error) {
      logger.error("Request handler error", { error });
      const status = error.code === "ER_DUP_ENTRY" || String(error.message).includes("UNIQUE") ? 409 : 500;
      json(res, status, { message: status === 409 ? "数据已存在。" : "服务器处理失败。", detail: error.message }, origin);
    }
  });

  return new Promise((resolve) => {
    testServer.listen(testPort, "127.0.0.1", () => {
      resolve(`http://127.0.0.1:${testPort}`);
    });
  });
}

export async function stopTestServer() {
  if (testServer) {
    return new Promise((resolve) => {
      testServer.close(() => {
        resolve();
      });
    });
  }
}

export { pool, testPort };
