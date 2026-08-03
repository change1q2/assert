// 测试远程 MySQL 连接到 119.28.189.98
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

// 手动解析 .env
const envContent = fs.readFileSync(path.resolve(__dirname, ".env"), "utf8");
for (const line of envContent.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  let k = t.slice(0, i).trim();
  let v = t.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!process.env[k]) process.env[k] = v;
}

async function main() {
  // 测试远程连接（119.28.189.98）
  const configs = [
    { host: "119.28.189.98", port: 3306, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE, label: "远程 119.28.189.98" },
    { host: "127.0.0.1", port: 3306, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE, label: "本机 127.0.0.1" },
  ];

  for (const cfg of configs) {
    console.log(`\n测试 ${cfg.label} ...`);
    console.log(`  ${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database}`);
    try {
      const pool = mysql.createPool({ ...cfg, connectionLimit: 1 });
      const [rows] = await pool.query("SELECT 1 AS test");
      console.log(`  ✅ 连接成功!`);

      const [tables] = await pool.query("SHOW TABLES");
      const tableList = Object.values(tables[0]);
      console.log(`  数据库表 (${tableList.length} 个):`);
      tableList.forEach((t) => console.log(`    - ${t}`));

      // 查用户表行数
      if (tableList.includes("users")) {
        const [users] = await pool.query("SELECT COUNT(*) AS cnt FROM users");
        console.log(`  users 表: ${users[0].cnt} 条记录`);
      }
      if (tableList.includes("finance_assets")) {
        const [assets] = await pool.query("SELECT COUNT(*) AS cnt FROM finance_assets");
        console.log(`  finance_assets 表: ${assets[0].cnt} 条记录`);
      }

      await pool.end();
    } catch (err) {
      console.log(`  ❌ 连接失败: ${err.message}`);
      if (err.code === "ER_ACCESS_DENIED_ERROR") {
        console.log(`     → MySQL 拒绝了远程访问，需要在服务器上授权 root 用户的远程访问权限`);
      }
    }
  }
}

main();
