/**
 * 数据库迁移运行器
 * 读取 db/migrations/ 目录，按顺序执行未运行的迁移
 * 迁移记录存储在 schema_migrations 表中
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, "migrations");

/**
 * 确保 schema_migrations 表存在
 */
async function ensureMigrationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      description TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

/**
 * 获取已执行的迁移版本列表
 */
async function getAppliedVersions(pool) {
  const [rows] = await pool.query(
    "SELECT version FROM schema_migrations ORDER BY version ASC"
  );
  return new Set(rows.map((r) => r.version));
}

/**
 * 执行单个迁移文件
 */
async function runMigration(pool, filePath) {
  const fileName = path.basename(filePath);
  // 提取版本号（文件名前缀，如 001_add_xxx.js → 001）
  const version = fileName.replace(/\.js$/, "");
  const description = fileName
    .replace(/^\d+_/, "")
    .replace(/_/g, " ")
    .replace(/\.js$/, "");

  console.log(`[migrate] Applying: ${fileName}`);
  const migration = await import(pathToFileURL(filePath).href);
  if (typeof migration.up !== "function") {
    throw new Error(`Migration ${fileName} must export an 'up' function`);
  }
  await migration.up(pool);

  await pool.query(
    "INSERT INTO schema_migrations (version, description) VALUES (?, ?)",
    [version, description]
  );
  console.log(`[migrate] Applied: ${fileName}`);
}

/**
 * 运行所有待执行的迁移
 */
export async function runMigrations(pool) {
  await ensureMigrationsTable(pool);
  const applied = await getAppliedVersions(pool);

  let files;
  try {
    files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".js"))
      .sort(); // 按文件名排序，确保顺序执行
  } catch {
    console.log("[migrate] No migrations directory found, skipping.");
    return;
  }

  let count = 0;
  for (const file of files) {
    const version = file.replace(/\.js$/, "");
    if (applied.has(version)) continue;
    const filePath = path.join(migrationsDir, file);
    await runMigration(pool, filePath);
    count++;
  }

  if (count > 0) {
    console.log(`[migrate] ${count} migration(s) applied.`);
  } else {
    console.log("[migrate] Database schema is up to date.");
  }
}
