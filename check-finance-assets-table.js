import mysql from 'mysql2/promise';

async function check() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'SeakHai123$%^',
    database: 'asset_platform',
    charset: 'utf8mb4',
  });

  try {
    console.log('=== 检查 finance_assets 表结构 ===\n');
    
    const [structure] = await pool.query("DESCRIBE finance_assets");
    structure.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });

    const hasTags = structure.some(c => c.Field === 'tags');
    console.log('\n是否有 tags 字段:', hasTags);

  } catch (e) {
    console.error('失败:', e.message);
  } finally {
    pool.end();
  }
}

check();