import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const releasesRoot = process.env.RELEASES_ROOT
  ? path.resolve(process.env.RELEASES_ROOT)
  : path.join(repoRoot, "assert_PLATFORM", "releases");
const platforms = new Set(["web", "pc", "android", "ios", "harmony"]);

const args = process.argv.slice(2);
const options = Object.fromEntries(args.map((entry) => {
  const [key, ...rest] = entry.replace(/^--/, "").split("=");
  return [key, rest.join("=")];
}));

const platform = String(options.platform || "").toLowerCase();
const sourceFile = options.file ? path.resolve(options.file) : "";
const version = String(options.version || "").trim();
const buildNumber = String(options.build || options.buildNumber || "").trim();
const releaseNotes = String(options.notes || options.releaseNotes || "").trim();
const minSystemVersion = String(options.minSystemVersion || "").trim();
const distribution = String(options.distribution || "direct").trim();

if (!platforms.has(platform)) {
  console.error("缺少或无效的 --platform，支持: web, pc, android, ios, harmony");
  process.exit(1);
}
if (!sourceFile || !fs.existsSync(sourceFile)) {
  console.error("缺少或无效的 --file");
  process.exit(1);
}
if (!version) {
  console.error("缺少 --version");
  process.exit(1);
}

const targetDir = path.join(releasesRoot, platform, "packages");
const manifestPath = path.join(releasesRoot, platform, "manifest.json");
fs.mkdirSync(targetDir, { recursive: true });

const fileName = path.basename(sourceFile);
const targetFile = path.join(targetDir, fileName);
fs.copyFileSync(sourceFile, targetFile);

const buffer = fs.readFileSync(targetFile);
const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
const fileSize = buffer.byteLength;
const publishedAt = new Date().toISOString();

const current = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  : { platform, updatedAt: "", latest: null, history: [] };
const history = Array.isArray(current.history) ? current.history : [];
const nextEntry = {
  platform,
  version,
  buildNumber,
  fileName,
  fileUrl: `/api/v2/releases/file/${platform}/${encodeURIComponent(fileName)}`,
  fileSize,
  publishedAt,
  releaseNotes,
  isLatest: true,
  minSystemVersion,
  sha256,
  distribution,
};
const nextHistory = [
  nextEntry,
  ...history.map((entry) => ({ ...entry, isLatest: false })).filter((entry) => !(entry.version === version && entry.fileName === fileName)),
];
const manifest = {
  ...current,
  platform,
  updatedAt: publishedAt,
  latest: nextEntry,
  history: nextHistory,
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`已发布 ${platform} 安装包: ${fileName}`);
