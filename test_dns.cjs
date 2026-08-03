// 用指定 DNS 服务器测试解析（callback 方式）
const dns = require("dns");

const targets = [
  "db.gxzritxubrukltpjlqah.supabase.co",
  "aws-0-ap-northeast-1.pooler.supabase.com",
  "aws-0-us-east-1.pooler.supabase.com",
];

console.log("== 系统 DNS ==");
console.log("DNS servers:", dns.getServers());

// 阿里 DNS
const alidns = new dns.Resolver();
alidns.setServers(["223.5.5.5"]);

console.log("\n== 用阿里 DNS (223.5.5.5) 解析 ==");
let pending = targets.length * 2;
targets.forEach((host) => {
  alidns.resolve4(host, (err, addresses) => {
    if (err) console.log(`✗ ${host} -> IPv4: ${err.code}`);
    else console.log(`✓ ${host} -> IPv4: ${addresses.join(", ")}`);
    if (--pending === 0) testGoogle();
  });
  alidns.resolve6(host, (err, addresses) => {
    if (err) console.log(`  ${host} -> IPv6: ${err.code}`);
    else console.log(`  ${host} -> IPv6: ${addresses.join(", ")}`);
    if (--pending === 0) testGoogle();
  });
});

function testGoogle() {
  const googledns = new dns.Resolver();
  googledns.setServers(["8.8.8.8"]);
  console.log("\n== 用 Google DNS (8.8.8.8) 解析 ==");
  let p2 = targets.length;
  targets.forEach((host) => {
    googledns.resolve4(host, (err, addresses) => {
      if (err) console.log(`✗ ${host} -> IPv4: ${err.code}`);
      else console.log(`✓ ${host} -> IPv4: ${addresses.join(", ")}`);
      if (--p2 === 0) process.exit(0);
    });
  });
}
