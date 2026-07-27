import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.resolve(path.dirname(__filename), "..");

const publicRoot = path.resolve(__dirname, "..", "..", "assert_WEB", "dist");
const releasesRoot = process.env.RELEASES_ROOT
  ? path.resolve(process.env.RELEASES_ROOT)
  : path.resolve(__dirname, "..", "releases");

const releasePlatforms = [
  ["web", "Web"],
  ["pc", "PC（Windows）"],
  ["android", "Android"],
  ["ios", "iOS"],
  ["harmony", "HarmonyOS"],
];

const PORT = Number(process.env.API_PORT || 3000);
const TOKEN_TTL_DAYS = 30;
const SMS_CODE_TTL_MINUTES = 5;
const SMS_RESEND_SECONDS = 60;

const allowedOrigins = new Set([
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  ...(process.env.APP_DOMAIN ? [`https://${process.env.APP_DOMAIN}`] : []),
  ...(process.env.EXTRA_ORIGINS ? process.env.EXTRA_ORIGINS.split(",") : []),
]);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".exe": "application/vnd.microsoft.portable-executable",
  ".zip": "application/zip",
  ".apk": "application/vnd.android.package-archive",
  ".aab": "application/octet-stream",
  ".ipa": "application/octet-stream",
  ".hap": "application/octet-stream",
};

const PREMIUM_API_URL = process.env.PREMIUM_API_URL || "";

// HK_IPO_SOURCE_FILE：优先使用环境变量，其次项目本地工具脚本，最后使用默认相对路径
const HK_IPO_SOURCE_FILE = process.env.HK_IPO_SOURCE_FILE
  ? path.resolve(process.env.HK_IPO_SOURCE_FILE)
  : path.resolve(__dirname, "..", "tools", "build_hk_ipo_current.mjs");
const HK_IPO_CONNECT_MARKET_CAP = 103.19;
const HK_IPO_DEFAULT_YEAR = 2026;
const HK_IPO_DEFAULT_THRESHOLD = 6;

export {
  __dirname,
  publicRoot,
  releasesRoot,
  releasePlatforms,
  PORT,
  TOKEN_TTL_DAYS,
  SMS_CODE_TTL_MINUTES,
  SMS_RESEND_SECONDS,
  allowedOrigins,
  mimeTypes,
  PREMIUM_API_URL,
  HK_IPO_SOURCE_FILE,
  HK_IPO_CONNECT_MARKET_CAP,
  HK_IPO_DEFAULT_YEAR,
  HK_IPO_DEFAULT_THRESHOLD,
};
