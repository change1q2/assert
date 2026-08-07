import { pool } from './db/index.js';

try {
  const [rows] = await pool.query(
    "SELECT id, name, code, position_category, asset_kind, kind FROM finance_assets WHERE position_category LIKE '%货币%' OR name LIKE '%货币%' OR code = '000509'"
  );
  console.log('Found', rows.length, 'rows:');
  for (const r of rows) {
    console.log(JSON.stringify(r));
  }
  process.exit(0);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
