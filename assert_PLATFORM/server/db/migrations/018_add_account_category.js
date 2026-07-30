export async function up(pool) {
  {
    const [columns] = await pool.query("SHOW COLUMNS FROM accounts LIKE 'category'");
    if (columns.length === 0) {
      await pool.query("ALTER TABLE accounts ADD COLUMN category VARCHAR(255) NOT NULL DEFAULT '' AFTER sort_order");
      console.log("  [018] Added category to accounts");
    }
  }
  {
    const [columns] = await pool.query("SHOW COLUMNS FROM accounts LIKE 'sub_category'");
    if (columns.length === 0) {
      await pool.query("ALTER TABLE accounts ADD COLUMN sub_category VARCHAR(255) NOT NULL DEFAULT '' AFTER category");
      console.log("  [018] Added sub_category to accounts");
    }
  }
}
