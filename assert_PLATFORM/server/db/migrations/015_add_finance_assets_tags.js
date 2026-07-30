export async function up(pool) {
  const [columns] = await pool.query("SHOW COLUMNS FROM finance_assets LIKE 'tags'");
  if (columns.length === 0) {
    await pool.query(`ALTER TABLE finance_assets ADD COLUMN tags VARCHAR(255) NOT NULL DEFAULT '' AFTER price_date`);
    console.log("  [015] Added tags column to finance_assets");
  }
}
