export async function up(pool) {
  await pool.query(`
    ALTER TABLE feedback ADD COLUMN reviewed TINYINT NOT NULL DEFAULT 0 AFTER status
  `);
}
