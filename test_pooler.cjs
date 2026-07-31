// 测试 Supabase Pooler 地址解析（IPv4）
const dns = require("dns");

const regions = [
  "aws-0-us-east-1",
  "aws-0-us-west-1",
  "aws-0-ap-southeast-1",
  "aws-0-ap-northeast-1",
  "aws-0-eu-west-1",
  "aws-0-eu-central-1",
  "aws-0-ap-south-1",
  "aws-0-sa-east-1",
];

console.log("测试 Supabase Pooler 地址（IPv4）:\n");
let pending = regions.length;
regions.forEach((r) => {
  const host = `${r}.pooler.supabase.com`;
  dns.resolve4(host, (err, addresses) => {
    if (err) {
      console.log(`✗ ${host} -> ${err.code}`);
    } else {
      console.log(`✓ ${host} -> ${addresses.join(", ")}`);
    }
    if (--pending === 0) process.exit(0);
  });
});
