import mysql from 'mysql2/promise';

async function main() {
  const pool = mysql.createPool({
    host: '192.168.10.216',
    port: 3306,
    user: 'root',
    password: '123456',
    database: 'asset_platform',
    connectTimeout: 10000
  });

  const userId = 8; // admin

  console.log('=== user_settings表结构 ===');
  const [cols] = await pool.query("SHOW COLUMNS FROM user_settings");
  cols.forEach(c => console.log(`  ${c.Field}: ${c.Type}`));

  console.log('\n=== admin的user_settings记录 ===');
  const [rows] = await pool.query("SELECT * FROM user_settings WHERE user_id = ?", [userId]);
  if (rows.length === 0) {
    console.log('  无记录');
  } else {
    const r = rows[0];
    Object.entries(r).forEach(([k, v]) => {
      if (v === null) console.log(`  ${k}: null`);
      else if (typeof v === 'string' && v.length < 500) console.log(`  ${k}: (${typeof v}) ${v.substring(0, 500)}`);
      else if (typeof v === 'string') console.log(`  ${k}: (${typeof v}) len=${v.length}, first 200: ${v.substring(0, 200)}`);
      else if (typeof v === 'object') {
        try {
          const s = JSON.stringify(v);
          console.log(`  ${k}: (object) ${s.substring(0, 500)}`);
        } catch(e) {
          console.log(`  ${k}: (object, circular)`);
        }
      } else console.log(`  ${k}: (${typeof v}) ${String(v).substring(0, 200)}`);
    });

    // 重点：strategies_json实际值
    console.log('\n=== strategies_json详细检查 ===');
    const sj = r.strategies_json;
    if (sj === null || sj === undefined) {
      console.log('  strategies_json: null');
    } else if (typeof sj === 'string') {
      console.log(`  类型: string, 长度=${sj.length}`);
      try {
        const parsed = JSON.parse(sj);
        console.log(`  JSON.parse OK, 类型=${typeof parsed}, keys=${Object.keys(parsed).join(',')}`);
      } catch(e) {
        console.log(`  JSON.parse FAILED: ${e.message}`);
        console.log(`  内容前200字符: ${sj.substring(0, 200)}`);
      }
    } else {
      console.log(`  类型: ${typeof sj} (已不是string！是mysql2自动解析对象？)`);
      console.log(`  Object.keys: ${Object.keys(sj).join(',')}`);
      // 再次JSON.stringify看内容
      try { console.log(`  re-stringify: ${JSON.stringify(sj).substring(0, 300)}`); } catch(e) { console.log(`  re-stringify fail: ${e.message}`); }
    }
  }

  // 检查已执行的迁移
  console.log('\n=== 已执行迁移 ===');
  try {
    const [mig] = await pool.query("SELECT migration, created_at FROM migrations ORDER BY migration");
    console.log(`  共 ${mig.length} 条：`);
    mig.forEach(m => console.log(`  ${m.migration}  (${m.created_at})`));
  } catch(e) {
    console.log('  migrations表不存在或查询失败:', e.message);
  }

  await pool.end();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
