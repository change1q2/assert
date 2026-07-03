export async function up(pool) {
  try {
    await pool.query(`ALTER TABLE debts ADD COLUMN penalty_interest DOUBLE NOT NULL DEFAULT 0`);
  } catch (e) {
    console.log('penalty_interest column already exists');
  }
  try {
    await pool.query(`ALTER TABLE debts ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'normal'`);
  } catch (e) {
    console.log('status column already exists');
  }
  try {
    await pool.query(`ALTER TABLE debts ADD COLUMN investment_days INTEGER NOT NULL DEFAULT 365`);
  } catch (e) {
    console.log('investment_days column already exists');
  }
  try {
    await pool.query(`ALTER TABLE debts ADD COLUMN period_penalties_json JSON`);
  } catch (e) {
    console.log('period_penalties_json column already exists');
  }
}

export async function down(pool) {
  try {
    await pool.query(`ALTER TABLE debts DROP COLUMN penalty_interest`);
  } catch (e) {
    console.log('penalty_interest column not found');
  }
  try {
    await pool.query(`ALTER TABLE debts DROP COLUMN status`);
  } catch (e) {
    console.log('status column not found');
  }
  try {
    await pool.query(`ALTER TABLE debts DROP COLUMN investment_days`);
  } catch (e) {
    console.log('investment_days column not found');
  }
  try {
    await pool.query(`ALTER TABLE debts DROP COLUMN period_penalties_json`);
  } catch (e) {
    console.log('period_penalties_json column not found');
  }
}