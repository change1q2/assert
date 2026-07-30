export async function up(pool) {
  const [rows] = await pool.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'books' AND COLUMN_NAME = 'tags_json'
  `);
  if (rows.length === 0) {
    await pool.query(`
      ALTER TABLE books ADD COLUMN tags_json JSON NULL AFTER color
    `);
  }
}