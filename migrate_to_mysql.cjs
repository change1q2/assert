// migrate_to_mysql.cjs - 从 SQLite 迁移到 MySQL
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const mysql = require('mysql2/promise');

const SQLITE_PATH = path.join(__dirname, 'server', 'data', 'asset-platform.sqlite');
const SCHEMA_PATH = path.join(__dirname, 'server', 'schema.sql');
const MYSQL_CONFIG = { host: '127.0.0.1', user: 'root', password: '123456', multipleStatements: true };
const DB_NAME = 'asset_platform';

async function main() {
  console.log('=== SQLite → MySQL 迁移工具 ===\n');

  // 1. Connect to MySQL and create schema from schema.sql
  console.log('[1/3] 创建 MySQL 数据库和表...');
  const conn = await mysql.createConnection(MYSQL_CONFIG);
  await conn.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${DB_NAME}\``);
  await conn.query(schemaSql);
  console.log('  ✓ 数据库和表创建完成\n');

  // 2. Open SQLite and read all data
  console.log('[2/3] 从 SQLite 读取数据...');
  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  const tableNames = sqlite.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all().map(r => r.name);

  const data = {};
  for (const table of tableNames) {
    const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all();
    data[table] = rows;
    console.log(`  ${table}: ${rows.length} 行`);
  }
  sqlite.close();
  console.log('');

  // 3. Insert data into MySQL
  console.log('[3/3] 导入数据到 MySQL...');
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');

  // Insert in dependency order
  const insertOrder = [
    'users', 'user_profiles', 'sessions', 'sms_verification_codes',
    'exchange_rates', 'accounts', 'asset_classes', 'records', 'budgets',
    'finance_assets', 'custom_record_categories', 'finance_tertiary_categories',
    'record_tags', 'recorders', 'reminders', 'debts', 'debt_payments',
    'strategies', 'user_settings',
  ];

  for (const table of insertOrder) {
    const rows = data[table];
    if (!rows || !rows.length) { console.log(`  ${table}: 跳过 (无数据)`); continue; }
    const cols = Object.keys(rows[0]);
    const placeholders = cols.map(() => '?').join(', ');
    const colNames = cols.map(c => `\`${c}\``).join(', ');
    const sql = `INSERT INTO \`${table}\` (${colNames}) VALUES (${placeholders})`;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Convert SQLite empty string used_at to NULL for MySQL
      if (table === 'sms_verification_codes' && row.used_at === '') {
        row.used_at = null;
      }
      const values = cols.map(c => {
        const v = row[c];
        if (v === null || v === undefined) return null;
        if (typeof v === 'bigint') return Number(v);
        // Convert ISO timestamps to MySQL DATETIME format (remove T and Z)
        if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
          return v.replace('T', ' ').replace('Z', '');
        }
        return v;
      });
      await conn.query(sql, values);
    }
    console.log(`  ${table}: 导入 ${rows.length} 行 ✓`);
  }

  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  await conn.end();
  console.log('\n=== 迁移完成！ ===');
}

main().catch((err) => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
