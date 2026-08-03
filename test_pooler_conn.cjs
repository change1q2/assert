// 通过 Supabase Pooler (IPv4) 测试连接
const fs = require("fs");
const path = require("path");
const dns = require("dns");
const { Client } = require("pg");

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

const PROJECT_REF = "gzxritxubrukltpjlqah";
const PASSWORD = process.env.SUPABASE_DB_PASSWORD;
// Pooler 用户名格式: postgres.<project-ref>
const POOLER_USER = `postgres.${PROJECT_REF}`;

// 候选区域（Supabase 所有支持的区域）
const REGIONS = [
  "aws-0-us-east-1",
  "aws-0-us-east-2",
  "aws-0-us-west-1",
  "aws-0-us-west-2",
  "aws-0-ap-northeast-1",
  "aws-0-ap-northeast-2",
  "aws-0-ap-southeast-1",
  "aws-0-ap-southeast-2",
  "aws-0-ap-south-1",
  "aws-0-ap-east-1",
  "aws-0-eu-west-1",
  "aws-0-eu-west-2",
  "aws-0-eu-north-1",
  "aws-0-eu-central-1",
  "aws-0-eu-central-2",
  "aws-0-ca-central-1",
  "aws-0-sa-east-1",
  "aws-0-me-central-1",
];

// 用阿里 DNS 解析（系统 DNS 是 127.0.0.1 代理，可能有问题）
const resolver = new dns.Resolver();
resolver.setServers(["223.5.5.5"]);

async function tryConnect(host, ip, port, label) {
  const client = new Client({
    host: ip, // 用 IP 直连，绕过系统 DNS
    port,
    user: POOLER_USER,
    password: PASSWORD,
    database: "postgres",
    ssl: { rejectUnauthorized: false }, // 用 IP 连接需关闭主机名验证
    connectionTimeoutMillis: 10000,
  });
  try {
    await client.connect();
    const v = await client.query("SELECT version();");
    const db = await client.query("SELECT current_database(), current_user;");
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name;
    `);
    console.log(`\n✅ ${label} 连接成功！`);
    console.log("  Host:", host, "->", ip);
    console.log("  版本:", v.rows[0].version.split("(")[0].trim());
    console.log("  数据库/用户:", db.rows[0].current_database, "/", db.rows[0].current_user);
    console.log("  public 表数量:", tables.rows.length);
    if (tables.rows.length > 0) {
      console.log("  表:", tables.rows.map((r) => r.table_name).join(", "));
    }
    await client.end();
    return true;
  } catch (err) {
    console.log(`✗ ${label} 失败: ${err.message}`);
    try { await client.end(); } catch {}
    return false;
  }
}

(async () => {
  console.log("Supabase Pooler 连接测试");
  console.log("项目 ref:", PROJECT_REF);
  console.log("Pooler 用户:", POOLER_USER);
  console.log("=".repeat(50));

  // 先解析所有区域 IP
  for (const r of REGIONS) {
    const host = `${r}.pooler.supabase.com`;
    try {
      const ips = await new Promise((resolve, reject) => {
        resolver.resolve4(host, (e, a) => (e ? reject(e) : resolve(a)));
      });
      console.log(`\n[${r}] 解析成功: ${ips.join(", ")}`);

      // 尝试 Session mode (5432)
      const ok = await tryConnect(host, ips[0], 5432, `${r} (Session 5432)`);
      if (ok) {
        console.log("\n🎉 找到可用连接！建议配置：");
        console.log(`  SUPABASE_DB_HOST=${host}`);
        console.log(`  SUPABASE_DB_PORT=5432`);
        console.log(`  SUPABASE_DB_USER=${POOLER_USER}`);
        process.exit(0);
      }
      // 尝试 Transaction mode (6543)
      const ok2 = await tryConnect(host, ips[0], 6543, `${r} (Transaction 6543)`);
      if (ok2) {
        console.log("\n🎉 找到可用连接！建议配置：");
        console.log(`  SUPABASE_DB_HOST=${host}`);
        console.log(`  SUPABASE_DB_PORT=6543`);
        console.log(`  SUPABASE_DB_USER=${POOLER_USER}`);
        process.exit(0);
      }
    } catch (e) {
      console.log(`✗ [${r}] DNS 解析失败: ${e.code}`);
    }
  }
  console.log("\n❌ 所有候选区域均连接失败。");
  console.log("请到 Supabase 控制台 → Project Settings → Database → Connection string 获取 Pooler 地址。");
  process.exit(1);
})();
