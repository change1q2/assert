/**
 * Migration 001: 为 user_settings 和 feedback 表添加新字段
 */

async function tryAddColumn(pool, table, column, definition) {
  try {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`  [001] Added ${table}.${column}`);
  } catch (err) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }
}

export async function up(pool) {
  // user_settings 新字段
  await tryAddColumn(pool, "user_settings", "fee_config_json", "JSON AFTER finance_asset_draft_json");
  await tryAddColumn(pool, "user_settings", "overview_goals_json", "JSON AFTER fee_config_json");
  await tryAddColumn(pool, "user_settings", "hk_ipo_rules_json", "JSON AFTER overview_goals_json");

  // feedback 表 attachments_json
  await tryAddColumn(pool, "feedback", "attachments_json", "JSON AFTER content");
}
