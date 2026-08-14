export async function up(pool) {
  const [rows] = await pool.query(`SHOW COLUMNS FROM finance_assets LIKE 'prev_price'`);
  if (rows.length === 0) {
    await pool.query(`ALTER TABLE finance_assets ADD COLUMN prev_price DOUBLE NOT NULL DEFAULT 0 AFTER today_pnl_percent`);
  }
}
