import { allowedOrigins } from "../config/index.js";

function handleCors(req, res) {
  const origin = req.headers.origin || "";
  if (req.method === "OPTIONS") {
    if (allowedOrigins.has(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
    res.writeHead(204);
    res.end();
    return true;
  }
  return false;
}

function setCorsHeaders(res, origin) {
  if (allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
}

export { handleCors, setCorsHeaders };
