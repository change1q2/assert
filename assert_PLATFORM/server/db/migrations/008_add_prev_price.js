export async function up(pool) {
  await pool.query(`ALTER TABLE finance_assets ADD COLUMN prev_price DOUBLE NOT NULL DEFAULT 0 AFTER today_pnl_percent`);
}
