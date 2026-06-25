import crypto from "node:crypto";
import { pool } from "../db/index.js";
import { sqlRun } from "../utils/db.js";
import { text } from "../utils/validators.js";

async function registerDevice(userId, body) {
  const deviceId = text(body.deviceId).trim() || crypto.randomUUID();
  const name = text(body.name).trim() || "未命名设备";
  const platform = text(body.platform).trim() || "unknown";
  const appVersion = text(body.appVersion).trim();
  await sqlRun(pool, `INSERT INTO devices (user_id, device_id, name, platform, app_version, last_seen_at)
    VALUES (?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      platform = VALUES(platform),
      app_version = VALUES(app_version),
      last_seen_at = NOW()`, [userId, deviceId, name, platform, appVersion]);
  return { ok: true, deviceId };
}

export { registerDevice };
