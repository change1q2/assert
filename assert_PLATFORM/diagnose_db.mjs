import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "asset_platform",
  charset: "utf8mb4",
  waitForConnections: true,
});

async function diagnose() {
  console.log("=== Wealth OS 数据库诊断 ===\n");

  try {
    // Check users
    const [users] = await pool.query("SELECT id, account FROM users");
    console.log(`📊 用户数量: ${users.length}`);
    if (users.length > 0) {
      console.log("   用户列表:");
      users.forEach(u => console.log(`     - ID ${u.id}: ${u.account}`));
    }

    // Check data counts per user
    for (const user of users) {
      const uid = user.id;
      console.log(`\n📋 用户 ${user.account} (ID: ${uid}) 数据统计:`);

      const tables = [
        ["accounts", "账户"],
        ["records", "收支记录"],
        ["finance_assets", "理财资产"],
        ["debts", "债务"],
        ["asset_classes", "资产分类"],
        ["books", "账本"],
        ["tags", "标签"],
        ["strategies", "投资策略"],
        ["budgets", "预算"],
      ];

      for (const [table, label] of tables) {
        try {
          const [rows] = await pool.query(`SELECT COUNT(*) as cnt FROM ${table} WHERE user_id = ?`, [uid]);
          const count = rows[0].cnt;
          const icon = count > 0 ? "✅" : "⚠️";
          console.log(`   ${icon} ${label}: ${count} 条`);
        } catch (e) {
          console.log(`   ❌ ${label}: 查询失败 - ${e.message}`);
        }
      }
    }

    // Check orphaned data (no user)
    console.log("\n🔍 数据完整性检查:");
    for (const [table, label] of [["accounts","账户"],["records","收支记录"],["finance_assets","理财资产"],["debts","债务"]]) {
      try {
        const [rows] = await pool.query(`SELECT COUNT(*) as cnt FROM ${table} WHERE user_id NOT IN (SELECT id FROM users)`);
        if (rows[0].cnt > 0) {
          console.log(`   ⚠️ ${label}: ${rows[0].cnt} 条孤立数据（无对应用户）`);
        }
      } catch (e) {
        // ignore
      }
    }

    // Check sessions
    const [sessions] = await pool.query("SELECT COUNT(*) as cnt FROM sessions WHERE expires_at > NOW()");
    console.log(`\n🔑 活跃会话: ${sessions[0].cnt} 个`);

  } catch (err) {
    console.error("❌ 数据库错误:", err.message);
  } finally {
    await pool.end();
  }
}

diagnose();