/**
 * Migration 003: 为多端同步相关表添加 sync_version / deleted_at / origin_device_id / client_op_id 字段
 */

const syncTables = [
  "accounts",
  "asset_classes",
  "records",
  "finance_assets",
  "finance_asset_transactions",
  "debts",
  "debt_payments",
  "feedback",
];

const syncColumns = [
  ["sync_version", "BIGINT NOT NULL DEFAULT 0"],
  ["deleted_at", "DATETIME NULL DEFAULT NULL"],
  ["origin_device_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
  ["client_op_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
];

async function tryAddColumn(pool, table, column, definition) {
  try {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`  [003] Added ${table}.${column}`);
  } catch (err) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }
}

export async function up(pool) {
  for (const table of syncTables) {
    for (const [column, definition] of syncColumns) {
      await tryAddColumn(pool, table, column, definition);
    }
  }
}
