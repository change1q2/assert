#!/usr/bin/env node
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'node:path';

// 线上数据库连接（通过 SSH 端口转发）
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const PROD = {
  host: process.env.PROD_MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.PROD_MYSQL_PORT || 3306),
  user: process.env.PROD_MYSQL_USER || 'root',
  password: process.env.PROD_MYSQL_PASSWORD || '',
  database: process.env.PROD_MYSQL_DATABASE || 'asset_platform',
  charset: 'utf8mb4',
  connectTimeout: 15000,
  multipleStatements: true,
};

async function main() {
  console.log('Connecting to:', PROD.host, 'port', PROD.port, 'user', PROD.user, 'db', PROD.database);
  const conn = await mysql.createConnection(PROD);
  try {
    const [tables] = await conn.execute(`
      SELECT 'users' AS tbl, COUNT(*) AS cnt FROM users
      UNION ALL SELECT 'accounts', COUNT(*) FROM accounts
      UNION ALL SELECT 'finance_assets', COUNT(*) FROM finance_assets
      UNION ALL SELECT 'independent_assets', COUNT(*) FROM independent_assets
      UNION ALL SELECT 'records', COUNT(*) FROM records
      UNION ALL SELECT 'debts', COUNT(*) FROM debts
      UNION ALL SELECT 'user_state', COUNT(*) FROM user_state
    `);
    console.log('\n=== Database Record Counts ===');
    tables.forEach(r => console.log(`${String(r.tbl).padEnd(22)}: ${r.cnt}`));

    const [users] = await conn.execute(`
      SELECT id, email, username, created_at, state IS NOT NULL AS has_state,
             CHAR_LENGTH(state) AS state_len
      FROM users ORDER BY id DESC LIMIT 10
    `);
    console.log('\n=== Recent Users ===');
    users.forEach(u => console.log(
      `id=${u.id} email=${u.email || '-'} user=${u.username || '-'} created=${u.created_at} has_state=${u.has_state} state_len=${u.state_len || 0}`
    ));

    const [faByUser] = await conn.execute(`
      SELECT user_id, COUNT(*) AS cnt FROM finance_assets GROUP BY user_id ORDER BY cnt DESC
    `);
    console.log('\n=== Finance Assets by User ===');
    faByUser.length === 0 ? console.log('(empty)') : faByUser.forEach(r => console.log(`user_id=${r.user_id}  cnt=${r.cnt}`));

    const [accByUser] = await conn.execute(`
      SELECT user_id, COUNT(*) AS cnt FROM accounts GROUP BY user_id ORDER BY cnt DESC
    `);
    console.log('\n=== Accounts by User ===');
    accByUser.length === 0 ? console.log('(empty)') : accByUser.forEach(r => console.log(`user_id=${r.user_id}  cnt=${r.cnt}`));

    // Dump first user state summary if present
    for (const u of users) {
      if (!u.has_state) continue;
      const [[{ state }]] = await conn.execute(`SELECT state FROM users WHERE id=?`, [u.id]);
      try {
        const parsed = typeof state === 'string' ? JSON.parse(state) : (state || {});
        const keys = Object.keys(parsed);
        console.log(`\n=== State keys for user ${u.id} (${u.email || u.username}) ===`);
        keys.forEach(k => {
          const v = parsed[k];
          const len = Array.isArray(v) ? v.length : (typeof v === 'object' && v ? '{}' : v);
          console.log(`  ${k} => ${Array.isArray(v) ? `Array(${len})` : (typeof len === 'number' ? len : typeof v)}`);
        });
      } catch (e) {
        console.log(`  Failed to parse state for user ${u.id}:`, e.message);
      }
      break;
    }
  } finally {
    await conn.end();
  }
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
