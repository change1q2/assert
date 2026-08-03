// 测试服务器后端 API + 数据库连接
const http = require("http");

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(path, "http://119.28.189.98");
    const opts = {
      hostname: u.hostname,
      port: 80,
      path: u.pathname + u.search,
      method,
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    };
    const req = http.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  console.log("=== 1. 健康检查 ===");
  const h = await apiRequest("GET", "/api/health");
  console.log("状态:", h.status, h.data);

  console.log("\n=== 2. 用户登录 ===");
  const l = await apiRequest("POST", "/api/auth/login", {
    account: "13896375671",
    password: "whjQQ123",
  });
  console.log("状态:", l.status);
  if (l.data.token) {
    console.log("登录成功，获取到 token");
    const token = l.data.token;

    console.log("\n=== 3. 获取用户数据 (state) ===");
    const s = await new Promise((resolve, reject) => {
      const u = new URL("/api/state", "http://119.28.189.98");
      const opts = {
        hostname: u.hostname, port: 80, path: u.pathname,
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` },
        timeout: 15000,
      };
      const req = http.request(opts, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, data }); }
        });
      });
      req.on("error", reject);
      req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
      req.end();
    });
    console.log("状态:", s.status);
    if (s.status === 200 && s.data) {
      const d = s.data;
      console.log("用户:", d.user?.phone || d.user?.nickname || "unknown");
      console.log("资产数量:", d.finance_assets?.length || 0);
      console.log("交易数量:", d.transactions?.length || 0);
      console.log("债务数量:", d.debts?.length || 0);
      console.log("账本数量:", d.books?.length || 0);
      console.log("✅ 数据库读写正常！");
    } else {
      console.log("❌ state 接口异常:", s.data);
    }
  } else {
    console.log("登录失败:", l.data);
  }
})().catch((e) => console.error("错误:", e.message));
