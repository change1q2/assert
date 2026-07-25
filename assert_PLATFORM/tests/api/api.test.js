import request from "supertest";
import { startTestServer, stopTestServer } from "../setup.js";

let baseUrl;

describe("API Health Check", () => {
  beforeAll(async () => {
    baseUrl = await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  test("GET /api/health should return ok status", async () => {
    const response = await request(baseUrl).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, database: "mysql" });
  });
});

describe("Auth API", () => {
  beforeAll(async () => {
    baseUrl = await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  let userToken;

  test("POST /api/auth/register should create a new user", async () => {
    const timestamp = Date.now();
    const response = await request(baseUrl).post("/api/auth/register").send({
      account: `testuser${timestamp}`,
      password: "test12345",
      name: "测试用户",
      phone: `13${(timestamp % 10000000000).toString().padStart(9, '0')}`,
      email: `test_${timestamp}@example.com`,
      smsCode: "123456",
    });
    expect([201, 400]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("user");
    }
  });

  test("POST /api/auth/login should return token for valid credentials", async () => {
    const response = await request(baseUrl).post("/api/auth/login").send({
      account: "SuperAdmin",
      password: "Super12345",
    });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
    userToken = response.body.token;
  });

  test("GET /api/auth/me should return user profile when authenticated", async () => {
    const response = await request(baseUrl)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${userToken}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("user");
  });

  test("GET /api/auth/me should return 401 when not authenticated", async () => {
    const response = await request(baseUrl).get("/api/auth/me");
    expect(response.status).toBe(401);
  });
});

describe("Admin API", () => {
  beforeAll(async () => {
    baseUrl = await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  let adminToken;

  test("POST /api/admin/login should return token for admin credentials", async () => {
    const response = await request(baseUrl).post("/api/admin/login").send({
      username: "SuperAdmin",
      password: "Super12345",
    });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
    adminToken = response.body.token;
  });

  test("GET /api/admin/dashboard should return stats", async () => {
    const response = await request(baseUrl)
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("stats");
    expect(response.body.stats).toHaveProperty("totalUsers");
    expect(response.body.stats).toHaveProperty("todayUsers");
    expect(response.body.stats).toHaveProperty("pendingFeedback");
  });

  test("GET /api/admin/users should return users list", async () => {
    const response = await request(baseUrl)
      .get("/api/admin/users?page=1&pageSize=10")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("users");
    expect(response.body).toHaveProperty("total");
    expect(response.body).toHaveProperty("page");
    expect(response.body).toHaveProperty("pageSize");
  });

  test("GET /api/admin/feedback should return feedback list", async () => {
    const response = await request(baseUrl)
      .get("/api/admin/feedback?page=1&pageSize=10")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("feedback");
  });

  test("GET /api/admin/dashboard should return 401 without admin token", async () => {
    const response = await request(baseUrl).get("/api/admin/dashboard");
    expect(response.status).toBe(401);
  });
});

describe("State API", () => {
  beforeAll(async () => {
    baseUrl = await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  let userToken;

  beforeAll(async () => {
    const loginResponse = await request(baseUrl).post("/api/auth/login").send({
      account: "SuperAdmin",
      password: "Super12345",
    });
    userToken = loginResponse.body.token;
  });

  test("GET /api/state should return user state when authenticated", async () => {
    const response = await request(baseUrl)
      .get("/api/state")
      .set("Authorization", `Bearer ${userToken}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("state");
  });

  test("GET /api/state should return 401 when not authenticated", async () => {
    const response = await request(baseUrl).get("/api/state");
    expect(response.status).toBe(401);
  });
});

describe("Finance API", () => {
  beforeAll(async () => {
    baseUrl = await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  test("GET /api/finance/lookup should return empty array for empty query", async () => {
    const response = await request(baseUrl).get("/api/finance/lookup");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [] });
  });

  test("GET /api/finance/kline should return valid response for invalid code", async () => {
    const response = await request(baseUrl).get("/api/finance/kline?code=invalid");
    expect([200, 502]).toContain(response.status);
  });
});

describe("Feedback API", () => {
  beforeAll(async () => {
    baseUrl = await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  let userToken;

  beforeAll(async () => {
    const loginResponse = await request(baseUrl).post("/api/auth/login").send({
      account: "SuperAdmin",
      password: "Super12345",
    });
    userToken = loginResponse.body.token;
  });

  test("POST /api/feedback should create feedback when authenticated", async () => {
    const response = await request(baseUrl)
      .post("/api/feedback")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        title: "测试反馈",
        content: "这是一条测试反馈",
      });
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("ok", true);
  });

  test("GET /api/feedback should return feedback list when authenticated", async () => {
    const response = await request(baseUrl)
      .get("/api/feedback")
      .set("Authorization", `Bearer ${userToken}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("feedback");
  });

  test("POST /api/feedback should return 401 when not authenticated", async () => {
    const response = await request(baseUrl).post("/api/feedback").send({
      title: "测试反馈",
      content: "这是一条测试反馈",
    });
    expect(response.status).toBe(401);
  });
});

describe("Error Handling", () => {
  beforeAll(async () => {
    baseUrl = await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  test("GET /api/nonexistent should return 401 (unauthenticated)", async () => {
    const response = await request(baseUrl).get("/api/nonexistent");
    expect(response.status).toBe(401);
  });

  test("GET /api/nonexistent should return 404 when authenticated", async () => {
    const loginResponse = await request(baseUrl).post("/api/auth/login").send({
      account: "SuperAdmin",
      password: "Super12345",
    });
    const token = loginResponse.body.token;
    const response = await request(baseUrl)
      .get("/api/nonexistent")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(404);
  });

  test("POST /api/auth/login with wrong credentials should return 401", async () => {
    const response = await request(baseUrl).post("/api/auth/login").send({
      account: "nonexistent",
      password: "wrong",
    });
    expect(response.status).toBe(401);
  });

  test("POST /api/auth/register with short password should return 400", async () => {
    const response = await request(baseUrl).post("/api/auth/register").send({
      account: "test_short_pwd",
      password: "123",
      name: "测试",
      phone: "13800138001",
    });
    expect(response.status).toBe(400);
  });
});
