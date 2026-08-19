export async function up(pool) {
  // 强制绑定字段：用于记录资产名称-代码对是否锁定
  const [cols] = await pool.query("SHOW COLUMNS FROM finance_assets LIKE 'force_binding'");
  if (cols.length === 0) {
    await pool.query("ALTER TABLE finance_assets ADD COLUMN force_binding TINYINT(1) NOT NULL DEFAULT 0 AFTER price_manual_edit");
    console.log("  [024] Added force_binding column to finance_assets");
  }
}
