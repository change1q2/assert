export async function up(pool) {
  await pool.query(`ALTER TABLE finance_assets ADD COLUMN price_date VARCHAR(20) NOT NULL DEFAULT '' AFTER prev_price`);
}
