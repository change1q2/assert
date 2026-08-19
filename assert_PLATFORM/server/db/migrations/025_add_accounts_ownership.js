export async function up(pool) {
  // 账户所有者字段：存储 owners JSON 数组和 ownership_type
  const [colsOwners] = await pool.query("SHOW COLUMNS FROM accounts LIKE 'owners_json'");
  if (colsOwners.length === 0) {
    await pool.query("ALTER TABLE accounts ADD COLUMN owners_json JSON NULL AFTER owner");
    console.log("  [025] Added owners_json column to accounts");
  }
  const [colsType] = await pool.query("SHOW COLUMNS FROM accounts LIKE 'ownership_type'");
  if (colsType.length === 0) {
    await pool.query("ALTER TABLE accounts ADD COLUMN ownership_type VARCHAR(20) NOT NULL DEFAULT 'personal' AFTER owners_json");
    console.log("  [025] Added ownership_type column to accounts");
  }
}
