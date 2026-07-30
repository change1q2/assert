export async function up(pool) {
  const [columns] = await pool.query("SHOW COLUMNS FROM finance_asset_archives LIKE 'sort_order'");
  if (columns.length === 0) {
    await pool.query("ALTER TABLE finance_asset_archives ADD COLUMN sort_order INT DEFAULT 0 AFTER status");
    console.log("  [019] Added sort_order to finance_asset_archives");
  }
}

export async function down(pool) {
  const [columns] = await pool.query("SHOW COLUMNS FROM finance_asset_archives LIKE 'sort_order'");
  if (columns.length > 0) {
    await pool.query("ALTER TABLE finance_asset_archives DROP COLUMN sort_order");
    console.log("  [019] Dropped sort_order from finance_asset_archives");
  }
}