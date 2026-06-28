/**
 * Migration 002: 为 finance_assets 表添加持仓明细字段
 */

const financeAssetColumns = [
  ["available_shares", "DOUBLE NOT NULL DEFAULT 0 AFTER shares"],
  ["current_price", "DOUBLE NOT NULL DEFAULT 0 AFTER available_shares"],
  ["pnl_percent", "DOUBLE NOT NULL DEFAULT 0 AFTER pnl"],
  ["avg_buy_price", "DOUBLE NOT NULL DEFAULT 0 AFTER pnl_percent"],
  ["holding_days", "DOUBLE NOT NULL DEFAULT 0 AFTER avg_buy_price"],
  ["position_weight", "DOUBLE NOT NULL DEFAULT 0 AFTER holding_days"],
  ["total_fees", "DOUBLE NOT NULL DEFAULT 0 AFTER position_weight"],
  ["today_pnl", "DOUBLE NOT NULL DEFAULT 0 AFTER total_fees"],
  ["today_pnl_percent", "DOUBLE NOT NULL DEFAULT 0 AFTER today_pnl"],
];

async function tryAddColumn(pool, table, column, definition) {
  try {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`  [002] Added ${table}.${column}`);
  } catch (err) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }
}

export async function up(pool) {
  for (const [column, definition] of financeAssetColumns) {
    await tryAddColumn(pool, "finance_assets", column, definition);
  }
}
