import { json } from "../utils/http.js";
import { safeReleasePlatform, loadReleaseCatalog, serveReleaseFile } from "../utils/release.js";

async function handler(req, res, body, origin, pathname, url) {
  if (req.method === "GET" && pathname === "/api/v2/releases") {
    json(res, 200, { releases: loadReleaseCatalog() }, origin);
    return;
  }

  const releaseFileMatch = req.method === "GET"
    ? pathname.match(/^\/api\/v2\/releases\/file\/([a-z0-9_-]+)\/([^/]+)$/i)
    : null;
  if (releaseFileMatch) {
    serveReleaseFile(releaseFileMatch[1], decodeURIComponent(releaseFileMatch[2]), res);
    return;
  }

  const releasePlatformMatch = req.method === "GET"
    ? pathname.match(/^\/api\/v2\/releases\/([a-z0-9_-]+)$/i)
    : null;
  if (releasePlatformMatch) {
    const platform = safeReleasePlatform(releasePlatformMatch[1]);
    if (platform === "latest") {
      json(res, 200, {
        releases: loadReleaseCatalog().map((item) => item.latest).filter(Boolean),
      }, origin);
      return;
    }
    const manifest = loadReleaseCatalog().find((item) => item.platform === platform);
    if (!manifest) {
      json(res, 404, { message: "平台不存在。" }, origin);
      return;
    }
    json(res, 200, { release: manifest }, origin);
    return;
  }
}

export { handler };
