export async function up(pool) {
  const [cols] = await pool.query("SHOW COLUMNS FROM user_settings LIKE 'strategies_json'");
  if (cols.length === 0) {
    await pool.query("ALTER TABLE user_settings ADD COLUMN strategies_json JSON NULL AFTER account_categories_json");
    console.log("  [021] Added strategies_json column to user_settings");
  } else {
    console.log("  [021] strategies_json column already exists in user_settings");
  }
}

export async function down(pool) {
  // 保留字段，不删除
}
