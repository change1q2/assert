/**
 * 026: 新增 debts.account 列 + survival_funds 表 + freedom_budgets 表
 * - debts.account: 债务关联的负债账户ID/名称（用于账户管理聚合负债数据）
 * - survival_funds: 生存资金（从独立资产独立出来的新模块）
 * - freedom_budgets: 自由现金流预算（生存资金模块自由度计算用）
 */
export const version = '026';
export const description = 'Add debts.account column, survival_funds and freedom_budgets tables';

export async function up(pool) {
  // 1. Add account column to debts if not exists
  try {
    const cols = await pool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'debts' AND COLUMN_NAME = 'account'
    `);
    if (!cols[0] || cols[0].length === 0) {
      await pool.query(`ALTER TABLE debts ADD COLUMN account VARCHAR(255) DEFAULT '' AFTER debtor_name`);
    }
  } catch (e) {
    console.warn(`[migration 026] debts.account column error (may already exist): ${e.message}`);
  }

  // 2. survival_funds table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS survival_funds (
      id BIGINT NOT NULL,
      user_id BIGINT NOT NULL,
      name VARCHAR(255) NOT NULL DEFAULT '',
      type VARCHAR(64) NOT NULL DEFAULT '',
      currency VARCHAR(16) NOT NULL DEFAULT 'CNY',
      amount DECIMAL(20,4) NOT NULL DEFAULT 0,
      account_id VARCHAR(255) DEFAULT NULL,
      cost_basis DECIMAL(20,4) NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      metadata_json JSON DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, id),
      KEY idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 3. freedom_budgets table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS freedom_budgets (
      id BIGINT NOT NULL,
      user_id BIGINT NOT NULL,
      name VARCHAR(255) NOT NULL DEFAULT '',
      category VARCHAR(64) NOT NULL DEFAULT '',
      period_type VARCHAR(16) NOT NULL DEFAULT 'monthly',
      budget_amount DECIMAL(20,4) NOT NULL DEFAULT 0,
      actual_amount DECIMAL(20,4) NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      metadata_json JSON DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, id),
      KEY idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

export async function down(pool) {
  try { await pool.query(`DROP TABLE IF EXISTS freedom_budgets`); } catch(e) {}
  try { await pool.query(`DROP TABLE IF EXISTS survival_funds`); } catch(e) {}
}
