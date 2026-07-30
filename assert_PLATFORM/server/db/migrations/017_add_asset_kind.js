export async function up(pool) {
  {
    const [columns] = await pool.query("SHOW COLUMNS FROM finance_assets LIKE 'asset_kind'");
    if (columns.length === 0) {
      await pool.query("ALTER TABLE finance_assets ADD COLUMN asset_kind VARCHAR(100) NOT NULL DEFAULT '' AFTER kind");
      console.log("  [017] Added asset_kind to finance_assets");
    }
  }
}
