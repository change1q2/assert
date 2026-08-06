export async function up(pool) {
  // Add quantity column
  const [qCols] = await pool.query("SHOW COLUMNS FROM finance_assets LIKE 'quantity'");
  if (qCols.length === 0) {
    await pool.query("ALTER TABLE finance_assets ADD COLUMN quantity DOUBLE NOT NULL DEFAULT 0 AFTER shares");
    console.log("  [020] Added quantity column to finance_assets");
  } else {
    console.log("  [020] quantity column already exists in finance_assets");
  }

  // Add asset_kind column if missing
  const [aCols] = await pool.query("SHOW COLUMNS FROM finance_assets LIKE 'asset_kind'");
  if (aCols.length === 0) {
    await pool.query("ALTER TABLE finance_assets ADD COLUMN asset_kind VARCHAR(100) NOT NULL DEFAULT '' AFTER kind");
    console.log("  [020] Added asset_kind column to finance_assets");
  }

  // Add tags column if missing
  const [tCols] = await pool.query("SHOW COLUMNS FROM finance_assets LIKE 'tags'");
  if (tCols.length === 0) {
    await pool.query("ALTER TABLE finance_assets ADD COLUMN tags VARCHAR(500) NOT NULL DEFAULT '' AFTER price_date");
    console.log("  [020] Added tags column to finance_assets");
  }

  // Add status column if missing
  const [sCols] = await pool.query("SHOW COLUMNS FROM finance_assets LIKE 'status'");
  if (sCols.length === 0) {
    await pool.query("ALTER TABLE finance_assets ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active' AFTER tags");
    console.log("  [020] Added status column to finance_assets");
  }

  // Add archive_date column if missing
  const [adCols] = await pool.query("SHOW COLUMNS FROM finance_assets LIKE 'archive_date'");
  if (adCols.length === 0) {
    await pool.query("ALTER TABLE finance_assets ADD COLUMN archive_date VARCHAR(20) NOT NULL DEFAULT '' AFTER status");
    console.log("  [020] Added archive_date column to finance_assets");
  }
}

export async function down(pool) {
  const [qCols] = await pool.query("SHOW COLUMNS FROM finance_assets LIKE 'quantity'");
  if (qCols.length > 0) {
    await pool.query("ALTER TABLE finance_assets DROP COLUMN quantity");
    console.log("  [020] Dropped quantity column from finance_assets");
  }
}