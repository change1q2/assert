import { json, readBody } from "../utils/http.js";
import { text } from "../utils/validators.js";
import { profileForUser } from "../services/user-service.js";
import { loadUserState } from "../services/state-service.js";
import { registerDevice } from "../services/device-service.js";
import { syncPush, syncPull } from "../services/sync-service.js";

async function handler(req, res, body, origin, pathname, url) {
  const user = res.locals?.user;
  if (!user) return;

  if (req.method === "GET" && pathname === "/api/v2/bootstrap") {
    json(res, 200, {
      user: await profileForUser(user.id),
      state: await loadUserState(user.id),
      capabilities: {
        offline: "full",
        sync: true,
        uploads: true,
        releases: true,
      },
    }, origin);
    return;
  }

  if (req.method === "POST" && pathname === "/api/v2/devices/register") {
    const result = await registerDevice(user.id, body);
    json(res, 200, result, origin);
    return;
  }

  if (req.method === "POST" && pathname === "/api/v2/sync/push") {
    const result = await syncPush(user.id, body);
    json(res, 200, result, origin);
    return;
  }

  if (req.method === "GET" && pathname === "/api/v2/sync/pull") {
    const sinceVersion = Number(url.searchParams.get("sinceVersion") || 0);
    const result = await syncPull(user.id, sinceVersion);
    json(res, 200, result, origin);
    return;
  }
}

export { handler };
