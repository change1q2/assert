export async function up(pool) {
  const [rows] = await pool.query(`SHOW COLUMNS FROM finance_assets LIKE 'price_date'`);
  if (rows.length === 0) {
    await pool.query(`ALTER TABLE finance_assets ADD COLUMN price_date VARCHAR(20) NOT NULL DEFAULT '' AFTER prev_price`);
  }
}
