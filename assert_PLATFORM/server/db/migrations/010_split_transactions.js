export async function up(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS finance_asset_indoor_transactions (
      user_id INTEGER NOT NULL,
      asset_id VARCHAR(255) NOT NULL,
      id VARCHAR(255) NOT NULL,
      direction VARCHAR(20) NOT NULL,
      transaction_date VARCHAR(20) NOT NULL,
      price DOUBLE NOT NULL DEFAULT 0,
      quantity DOUBLE NOT NULL DEFAULT 0,
      amount DOUBLE NOT NULL DEFAULT 0,
      commission DOUBLE NOT NULL DEFAULT 0,
      stamp_duty DOUBLE NOT NULL DEFAULT 0,
      transfer_fee DOUBLE NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, asset_id, id),
      INDEX idx_indoor_transactions_user_asset (user_id, asset_id),
      FOREIGN KEY (user_id, asset_id) REFERENCES finance_assets(user_id, id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS finance_asset_outdoor_transactions (
      user_id INTEGER NOT NULL,
      asset_id VARCHAR(255) NOT NULL,
      id VARCHAR(255) NOT NULL,
      direction VARCHAR(20) NOT NULL,
      transaction_date VARCHAR(20) NOT NULL,
      net_value DOUBLE NOT NULL DEFAULT 0,
      shares DOUBLE NOT NULL DEFAULT 0,
      amount DOUBLE NOT NULL DEFAULT 0,
      commission DOUBLE NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, asset_id, id),
      INDEX idx_outdoor_transactions_user_asset (user_id, asset_id),
      FOREIGN KEY (user_id, asset_id) REFERENCES finance_assets(user_id, id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);
}
