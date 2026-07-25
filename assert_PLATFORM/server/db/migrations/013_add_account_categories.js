export async function up(pool) {
  const [rows] = await pool.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_settings' AND COLUMN_NAME = 'account_categories_json'
  `);
  if (rows.length === 0) {
    await pool.query(`
      ALTER TABLE user_settings ADD COLUMN account_categories_json JSON NULL AFTER independent_assets_json
    `);
  }
}
