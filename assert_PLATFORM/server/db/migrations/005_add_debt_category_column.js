export async function up(pool) {
  const [columns] = await pool.query(`
    SHOW COLUMNS FROM debts LIKE 'debt_category'
  `);
  if (columns.length === 0) {
    await pool.query(`
      ALTER TABLE debts ADD COLUMN debt_category VARCHAR(255) NOT NULL DEFAULT ''
    `);
  }
}

export async function down(pool) {
  const [columns] = await pool.query(`
    SHOW COLUMNS FROM debts LIKE 'debt_category'
  `);
  if (columns.length > 0) {
    await pool.query(`
      ALTER TABLE debts DROP COLUMN debt_category
    `);
  }
}