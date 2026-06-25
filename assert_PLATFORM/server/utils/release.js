import fs from "node:fs";
import path from "node:path";
import { releasesRoot, releasePlatforms, mimeTypes } from "../config/index.js";

function safeReleasePlatform(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

function safeReleaseFileName(value) {
  return String(value || "").replace(/[^a-zA-Z0-9._-]/g, "");
}

function releaseDir(platform) {
  return path.join(releasesRoot, platform);
}

function releaseManifestPath(platform) {
  return path.join(releaseDir(platform), "manifest.json");
}

function defaultReleaseManifest(platform) {
  return {
    platform,
    platformLabel: Object.fromEntries(releasePlatforms)[platform] || platform,
    updatedAt: "",
    latest: null,
    history: [],
  };
}

function readReleaseManifest(platform) {
  const filePath = releaseManifestPath(platform);
  if (!fs.existsSync(filePath)) return defaultReleaseManifest(platform);
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return {
      ...defaultReleaseManifest(platform),
      ...raw,
      platform,
      history: Array.isArray(raw.history) ? raw.history : [],
    };
  } catch {
    return defaultReleaseManifest(platform);
  }
}

function normalizeReleaseEntry(platform, entry) {
  if (!entry) return null;
  const fileName = safeReleaseFileName(entry.fileName);
  return {
    platform,
    platformLabel: Object.fromEntries(releasePlatforms)[platform] || platform,
    version: String(entry.version || ""),
    buildNumber: String(entry.buildNumber || ""),
    fileName,
    fileUrl: fileName ? `/api/v2/releases/file/${platform}/${encodeURIComponent(fileName)}` : String(entry.fileUrl || ""),
    fileSize: Number(entry.fileSize || 0),
    publishedAt: String(entry.publishedAt || ""),
    releaseNotes: String(entry.releaseNotes || ""),
    isLatest: Boolean(entry.isLatest),
    minSystemVersion: String(entry.minSystemVersion || ""),
    sha256: String(entry.sha256 || ""),
    distribution: String(entry.distribution || "direct"),
  };
}

function loadReleaseCatalog() {
  return releasePlatforms.map(([platform]) => {
    const manifest = readReleaseManifest(platform);
    const history = (manifest.history || [])
      .map((entry) => normalizeReleaseEntry(platform, entry))
      .filter(Boolean);
    const latest = history.find((entry) => entry.isLatest) || history[0] || null;
    return {
      ...manifest,
      platform,
      platformLabel: Object.fromEntries(releasePlatforms)[platform] || platform,
      latest,
      history,
      updatedAt: manifest.updatedAt || latest?.publishedAt || "",
    };
  });
}

function serveReleaseFile(platform, fileName, res) {
  const safePlatform = safeReleasePlatform(platform);
  const safeFileName = safeReleaseFileName(fileName);
  const filePath = path.join(releaseDir(safePlatform), "packages", safeFileName);
  if (!safePlatform || !safeFileName || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ message: "安装包不存在。" }));
    return;
  }
  const extension = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": mimeTypes[extension] || "application/octet-stream",
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(safeFileName)}`,
    "Cache-Control": "public, max-age=300",
  });
  fs.createReadStream(filePath).pipe(res);
}

export {
  safeReleasePlatform,
  safeReleaseFileName,
  releaseDir,
  releaseManifestPath,
  defaultReleaseManifest,
  readReleaseManifest,
  normalizeReleaseEntry,
  loadReleaseCatalog,
  serveReleaseFile,
};
