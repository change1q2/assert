export async function up(pool) {
  // 债务货币单位字段
  const [cols] = await pool.query("SHOW COLUMNS FROM debts LIKE 'currency'");
  if (cols.length === 0) {
    await pool.query("ALTER TABLE debts ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'CNY' AFTER amount");
    console.log("  [023] Added currency column to debts");
  }
}
