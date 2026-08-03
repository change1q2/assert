// 测试 Supabase PostgreSQL 连接
const fs = require("fs");
const path = require("path");

// 手动解析 .env，避免依赖 dotenv
const envPath = path.resolve(__dirname, ".env");
const envContent = fs.readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  let key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  // 去除两端引号
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  if (!process.env[key]) process.env[key] = val;
}

const { Client } = require("pg");

async function main() {
  const client = new Client({
    host: process.env.SUPABASE_DB_HOST,
    port: Number(process.env.SUPABASE_DB_PORT),
    user: process.env.SUPABASE_DB_USER,
    password: process.env.SUPABASE_DB_PASSWORD,
    database: process.env.SUPABASE_DB_NAME,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    // 强制使用 IPv6（Supabase 直连地址仅有 IPv6）
    family: 6,
  });

  console.log("正在连接 Supabase PostgreSQL...");
  console.log("主机:", process.env.SUPABASE_DB_HOST);
  console.log("端口:", process.env.SUPABASE_DB_PORT);
  console.log("用户:", process.env.SUPABASE_DB_USER);
  console.log("数据库:", process.env.SUPABASE_DB_NAME);
  console.log("---");

  try {
    await client.connect();
    console.log("✅ 连接成功！");

    // 服务器版本
    const versionRes = await client.query("SELECT version();");
    console.log("\n服务器版本:");
    console.log(" ", versionRes.rows[0].version);

    // 当前数据库
    const dbRes = await client.query("SELECT current_database(), current_user;");
    console.log("\n当前数据库 / 用户:");
    console.log(" ", dbRes.rows[0].current_database, "/", dbRes.rows[0].current_user);

    // 列出所有表（public schema）
    const tablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log("\npublic schema 中的表 (" + tablesRes.rows.length + " 个):");
    if (tablesRes.rows.length === 0) {
      console.log("  (空，无自定义表)");
    } else {
      tablesRes.rows.forEach((r) => console.log("  -", r.table_name));
    }

    // 数据库大小
    const sizeRes = await client.query("SELECT pg_size_pretty(pg_database_size(current_database())) AS size;");
    console.log("\n数据库大小:", sizeRes.rows[0].size);

    console.log("\n✅ 全部测试通过");
  } catch (err) {
    console.error("\n❌ 连接失败:", err.message);
    if (err.code) console.error("错误代码:", err.code);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
