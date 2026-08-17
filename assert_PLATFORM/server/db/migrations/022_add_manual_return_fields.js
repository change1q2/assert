export async function up(pool) {
  // 累计收益（用户手动编辑值）
  const [crCols] = await pool.query("SHOW COLUMNS FROM finance_assets LIKE 'cumulative_return'");
  if (crCols.length === 0) {
    await pool.query("ALTER TABLE finance_assets ADD COLUMN cumulative_return DOUBLE DEFAULT NULL AFTER pnl_percent");
    console.log("  [022] Added cumulative_return column to finance_assets");
  }

  // 持有收益（用户手动编辑值，与 pnl 区分：pnl 为自动计算值，holding_pnl 为用户覆盖值）
  const [hpCols] = await pool.query("SHOW COLUMNS FROM finance_assets LIKE 'holding_pnl'");
  if (hpCols.length === 0) {
    await pool.query("ALTER TABLE finance_assets ADD COLUMN holding_pnl DOUBLE DEFAULT NULL AFTER cumulative_return");
    console.log("  [022] Added holding_pnl column to finance_assets");
  }

  // 持有收益率
  const [hprCols] = await pool.query("SHOW COLUMNS FROM finance_assets LIKE 'holding_pnl_rate'");
  if (hprCols.length === 0) {
    await pool.query("ALTER TABLE finance_assets ADD COLUMN holding_pnl_rate DOUBLE DEFAULT NULL AFTER holding_pnl");
    console.log("  [022] Added holding_pnl_rate column to finance_assets");
  }

  // 累计收益率
  const [crrCols] = await pool.query("SHOW COLUMNS FROM finance_assets LIKE 'cumulative_return_rate'");
  if (crrCols.length === 0) {
    await pool.query("ALTER TABLE finance_assets ADD COLUMN cumulative_return_rate DOUBLE DEFAULT NULL AFTER holding_pnl_rate");
    console.log("  [022] Added cumulative_return_rate column to finance_assets");
  }

  // 手动编辑标记
  const [pmCols] = await pool.query("SHOW COLUMNS FROM finance_assets LIKE 'price_manual_edit'");
  if (pmCols.length === 0) {
    await pool.query("ALTER TABLE finance_assets ADD COLUMN price_manual_edit TINYINT NOT NULL DEFAULT 0 AFTER cumulative_return_rate");
    console.log("  [022] Added price_manual_edit column to finance_assets");
  }

  // 货基历史累计基数
  const [mhCols] = await pool.query("SHOW COLUMNS FROM finance_assets LIKE 'mf_historical_base'");
  if (mhCols.length === 0) {
    await pool.query("ALTER TABLE finance_assets ADD COLUMN mf_historical_base DOUBLE DEFAULT NULL AFTER price_manual_edit");
    console.log("  [022] Added mf_historical_base column to finance_assets");
  }
}

export async function down(pool) {
  const cols = ['cumulative_return', 'holding_pnl', 'holding_pnl_rate', 'cumulative_return_rate', 'price_manual_edit', 'mf_historical_base'];
  for (const col of cols) {
    const [rows] = await pool.query(`SHOW COLUMNS FROM finance_assets LIKE '${col}'`);
    if (rows.length > 0) {
      await pool.query(`ALTER TABLE finance_assets DROP COLUMN ${col}`);
      console.log(`  [022] Dropped ${col} column from finance_assets`);
    }
  }
}
