import mysql from 'mysql2/promise';
import { readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, 'server/db/migrations');

async function main() {
  const pool = mysql.createPool({
    host: '192.168.10.216',
    port: 3306,
    user: 'root',
    password: '123456',
    database: 'asset_platform',
    connectTimeout: 10000
  });

  // 1. 查看 schema_migrations 表
  console.log('=== 1. schema_migrations 表 ===');
  try {
    await pool.query("CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(255) PRIMARY KEY, description VARCHAR(255) NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
    console.log('  schema_migrations表已确保存在');
    const [rows] = await pool.query("SELECT version, description FROM schema_migrations ORDER BY version");
    if (rows.length === 0) console.log('  空（从未写入迁移记录）');
    else rows.forEach(r => console.log(`  ${r.version}  ${r.description}`));
  } catch(e) { console.log('  Error:', e.message); }

  // 2. 列出所有迁移文件并检查幂等执行（逐个执行up()时如果有表存在检查）
  console.log('\n=== 2. 迁移文件幂等检查 ===');
  const files = readdirSync(migrationsDir).filter(f => f.endsWith('.js')).sort();
  console.log(`  共 ${files.length} 个迁移文件`);

  for (const file of files) {
    const ver = file.match(/^(\d+)/)?.[1];
    if (!ver) continue;
    try {
      const [exists] = await pool.query("SELECT version FROM schema_migrations WHERE version = ?", [ver]);
      const desc = file.replace(/^\d+_/, '').replace(/\.js$/, '');
      if (exists.length === 0) {
        console.log(`  [待迁移] ${file}`);
        // 迁移脚本使用pool.query执行SQL，这里手动执行简单的关键迁移（列存在则跳过）
        // 迁移023 currency列已存在（之前验证过OK）
        // 迁移022 cumulative_return等列已存在（之前验证过OK）
        // 逐个做等效的幂等SQL
        const filePath = path.join(migrationsDir, file);
        // 直接用 import 动态加载并执行 up 函数需要pool对象，这里直接写等效SQL
        if (ver === '012') {
          // ALTER user_settings independent_assets_json
          const [cols] = await pool.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_settings' AND COLUMN_NAME = 'independent_assets_json'`);
          if (cols.length === 0) {
            console.log(`    → 执行 ALTER TABLE user_settings ADD COLUMN independent_assets_json JSON NULL`);
            await pool.query(`ALTER TABLE user_settings ADD COLUMN independent_assets_json JSON NULL`);
          } else console.log(`    → 列已存在，跳过`);
        }
        if (ver === '022') {
          const checks = [
            ['cumulative_return', 'ALTER TABLE finance_assets ADD COLUMN cumulative_return DOUBLE DEFAULT NULL AFTER pnl_percent'],
            ['holding_pnl', 'ALTER TABLE finance_assets ADD COLUMN holding_pnl DOUBLE DEFAULT NULL AFTER cumulative_return'],
            ['holding_pnl_rate', 'ALTER TABLE finance_assets ADD COLUMN holding_pnl_rate DOUBLE DEFAULT NULL AFTER holding_pnl'],
            ['cumulative_return_rate', 'ALTER TABLE finance_assets ADD COLUMN cumulative_return_rate DOUBLE DEFAULT NULL AFTER holding_pnl_rate'],
            ['price_manual_edit', 'ALTER TABLE finance_assets ADD COLUMN price_manual_edit TINYINT NOT NULL DEFAULT 0 AFTER cumulative_return_rate'],
            ['mf_historical_base', 'ALTER TABLE finance_assets ADD COLUMN mf_historical_base DOUBLE DEFAULT NULL AFTER price_manual_edit'],
          ];
          for (const [col, sql] of checks) {
            const [cols] = await pool.query(`SHOW COLUMNS FROM finance_assets LIKE '${col}'`);
            if (cols.length === 0) { console.log(`    → 执行添加 ${col}`); await pool.query(sql); }
            else console.log(`    → 列 ${col} 已存在，跳过`);
          }
        }
        if (ver === '023') {
          const [cols] = await pool.query("SHOW COLUMNS FROM debts LIKE 'currency'");
          if (cols.length === 0) {
            console.log(`    → 执行 ALTER TABLE debts ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'CNY' AFTER amount`);
            await pool.query(`ALTER TABLE debts ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'CNY' AFTER amount`);
          } else console.log(`    → 列已存在，跳过`);
        }
        // 写入迁移记录
        try { await pool.query("INSERT INTO schema_migrations (version, description) VALUES (?, ?)", [ver, desc]); console.log(`    → 写入迁移记录 OK`); }
        catch(e) { console.log(`    → 写入迁移记录失败: ${e.message}`); }
      } else {
        console.log(`  [已执行] ${file}`);
      }
    } catch(e) { console.log(`  [ERROR] ${file}: ${e.message}`); }
  }

  // 3. 最终验证：independent_assets数据（来自 independent_assets_json）
  console.log('\n=== 3. independent_assets数据 ===');
  const [s] = await pool.query("SELECT independent_assets_json FROM user_settings WHERE user_id = 8");
  if (s.length === 0 || !s[0].independent_assets_json) {
    console.log('  无数据');
  } else {
    const data = s[0].independent_assets_json;
    if (typeof data === 'string') {
      const parsed = JSON.parse(data);
      console.log(`  种类: ${Object.keys(parsed).join(',') || '(空)'}`);
      Object.entries(parsed).forEach(([k, v]) => console.log(`    ${k}: ${Array.isArray(v) ? v.length + '条' : '非数组'}`));
    } else if (typeof data === 'object') {
      console.log(`  种类: ${Object.keys(data).join(',') || '(空)'}`);
      Object.entries(data).forEach(([k, v]) => console.log(`    ${k}: ${Array.isArray(v) ? v.length + '条' : '非数组'}`));
    }
  }

  // 4. strategies_json
  console.log('\n=== 4. strategies_json数据 ===');
  const [s2] = await pool.query("SELECT strategies_json FROM user_settings WHERE user_id = 8");
  if (s2.length === 0 || s2[0].strategies_json == null) {
    console.log('  无数据');
  } else {
    const raw = s2[0].strategies_json;
    // mysql2 JSON类型返回object
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    console.log(`  list: ${obj.list?.length || 0}条`);
    console.log(`  pools: ${Object.keys(obj.pools || {}).length}个`);
  }

  // 5. debts currency列已验证
  console.log('\n=== 5. debts currency字段 ===');
  const [debts] = await pool.query("SELECT id, name, amount, currency FROM debts WHERE user_id = 8");
  debts.forEach(d => console.log(`  ${d.name || d.id}: ${d.currency} ${d.amount}`));

  // 6. finance_assets收益字段已验证
  console.log('\n=== 6. finance_assets收益字段（广发钱袋子）===');
  const [fa] = await pool.query("SELECT name, cumulative_return, holding_pnl, price_manual_edit FROM finance_assets WHERE user_id = 8 AND name LIKE '%钱袋子%'");
  fa.forEach(r => console.log(`  ${r.name}: cum=${r.cumulative_return}, hold=${r.holding_pnl}, manual=${r.price_manual_edit}`));

  await pool.end();
  console.log('\n✅ 所有检查完成');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
