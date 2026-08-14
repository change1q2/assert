export async function up(pool) {
  const [rows] = await pool.query(`SHOW COLUMNS FROM feedback LIKE 'reviewed'`);
  if (rows.length === 0) {
    await pool.query(`ALTER TABLE feedback ADD COLUMN reviewed TINYINT NOT NULL DEFAULT 0 AFTER status`);
  }
}
