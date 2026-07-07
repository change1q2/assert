export async function up(pool) {
  await pool.query(`ALTER TABLE records MODIFY COLUMN account_id VARCHAR(255) NOT NULL DEFAULT ''`);
}
