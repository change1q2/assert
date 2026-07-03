import http from "node:http";
import { initDb } from "./db/index.js";
import { PORT } from "./config/index.js";
import { json, readBody, serveStatic } from "./utils/http.js";
import { logger } from "./utils/logger.js";
import { handleCors } from "./middleware/cors.js";
import { authenticatedUser, authenticatedAdmin } from "./auth/index.js";
import { ensureDefaultAdmin } from "./services/user-service.js";
import { refreshPremiumMarketInBackground } from "./services/premium-service.js";
import { refreshHkIpoMarketInBackground } from "./services/hkipo-fetcher.js";

import * as healthRoute from "./routes/health.js";
import * as authRoute from "./routes/auth.js";
import * as adminRoute from "./routes/admin.js";
import * as bootstrapRoute from "./routes/bootstrap.js";
import * as stateRoute from "./routes/state.js";
import * as financeRoute from "./routes/finance.js";
import * as toolsRoute from "./routes/tools.js";
import * as releasesRoute from "./routes/releases.js";
import * as feedbackRoute from "./routes/feedback.js";

const PUBLIC_AUTH_PATHS = new Set([
  "/api/auth/sms/send",
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/phone-login",
  "/api/auth/reset-password",
]);

const server = http.createServer(async (req, res) => {
  await initDb;
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

server.listen(PORT, "0.0.0.0", async () => {
  logger.info(`Asset Platform API listening on 0.0.0.0:${PORT}`);
  void refreshPremiumMarketInBackground();
  void refreshHkIpoMarketInBackground();
  try { await initDb; await ensureDefaultAdmin(); } catch (e) { logger.error("Admin init error", { error: e.message }); }
  
  setInterval(() => {
    logger.info("HK IPO market scheduled refresh");
    void refreshHkIpoMarketInBackground();
  }, 3600_000);
});
