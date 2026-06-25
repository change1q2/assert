import fs from "node:fs";
import path from "node:path";
import { allowedOrigins, mimeTypes, publicRoot } from "../config/index.js";

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

export { json, readBody, serveStatic };
