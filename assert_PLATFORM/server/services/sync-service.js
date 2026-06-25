import crypto from "node:crypto";
import { pool } from "../db/index.js";
import { sqlRun, sqlAll, maybeParseJson } from "../utils/db.js";
import { text } from "../utils/validators.js";

async function syncPush(userId, body) {
  const deviceId = text(body.deviceId).trim() || "unknown-device";
  const changes = Array.isArray(body.changes) ? body.changes : [];
  const clientVersion = Number(body.clientVersion || 0);
  for (const change of changes) {
    await sqlRun(pool, `INSERT INTO sync_change_log
      (user_id, device_id, entity_type, entity_id, operation_type, payload_json, client_version)
      VALUES (?, ?, ?, ?, ?, ?, ?)`, [
      userId,
      deviceId,
      text(change.entityType).trim() || "unknown",
      text(change.entityId).trim() || crypto.randomUUID(),
      text(change.operationType).trim() || "upsert",
      JSON.stringify(change.payload ?? {}),
      clientVersion,
    ]);
  }
  return {
    ok: true,
    accepted: changes.length,
    serverVersion: Date.now(),
  };
}

async function syncPull(userId, sinceVersion) {
  const rows = await sqlAll(pool, `SELECT id, device_id, entity_type, entity_id, operation_type, payload_json, created_at
    FROM sync_change_log
    WHERE user_id = ? AND id > ?
    ORDER BY id ASC
    LIMIT 500`, [userId, sinceVersion]);
  return {
    changes: rows.map((row) => ({
      version: Number(row.id),
      deviceId: row.device_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      operationType: row.operation_type,
      payload: maybeParseJson(row.payload_json) || {},
      createdAt: row.created_at,
    })),
    serverVersion: rows.length ? Number(rows.at(-1).id) : sinceVersion,
  };
}

export { syncPush, syncPull };
