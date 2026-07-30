export async function up(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS finance_asset_archives (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      original_asset_id VARCHAR(100) NOT NULL,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50) DEFAULT '',
      market VARCHAR(50) DEFAULT '',
      currency VARCHAR(10) DEFAULT 'CNY',
      kind VARCHAR(50) DEFAULT '',
      category VARCHAR(50) DEFAULT '',
      subcategory VARCHAR(50) DEFAULT '',
      tertiary_category VARCHAR(50) DEFAULT '',
      account_id VARCHAR(100) DEFAULT '',
      cost_price DOUBLE DEFAULT 0,
      shares DOUBLE DEFAULT 0,
      final_pnl DOUBLE DEFAULT 0,
      final_pnl_percent DOUBLE DEFAULT 0,
      archive_date VARCHAR(30) DEFAULT '',
      status VARCHAR(20) DEFAULT 'archived',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id)
    )
  `);

  {
    const [columns] = await pool.query("SHOW COLUMNS FROM finance_asset_indoor_transactions LIKE 'cash_account_id'");
    if (columns.length === 0) {
      await pool.query("ALTER TABLE finance_asset_indoor_transactions ADD COLUMN cash_account_id VARCHAR(100) DEFAULT '' AFTER commission");
      console.log("  [016] Added cash_account_id to finance_asset_indoor_transactions");
    }
  }

  {
    const [columns] = await pool.query("SHOW COLUMNS FROM finance_asset_outdoor_transactions LIKE 'cash_account_id'");
    if (columns.length === 0) {
      await pool.query("ALTER TABLE finance_asset_outdoor_transactions ADD COLUMN cash_account_id VARCHAR(100) DEFAULT '' AFTER commission");
      console.log("  [016] Added cash_account_id to finance_asset_outdoor_transactions");
    }
  }

  {
    const [columns] = await pool.query("SHOW COLUMNS FROM finance_assets LIKE 'status'");
    if (columns.length === 0) {
      await pool.query("ALTER TABLE finance_assets ADD COLUMN status VARCHAR(20) DEFAULT 'active' AFTER tags");
      console.log("  [016] Added status to finance_assets");
    }
  }

  {
    const [columns] = await pool.query("SHOW COLUMNS FROM finance_assets LIKE 'archive_date'");
    if (columns.length === 0) {
      await pool.query("ALTER TABLE finance_assets ADD COLUMN archive_date VARCHAR(30) DEFAULT '' AFTER status");
      console.log("  [016] Added archive_date to finance_assets");
    }
  }
}