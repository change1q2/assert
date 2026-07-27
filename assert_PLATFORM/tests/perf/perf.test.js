import request from "supertest";
import { startTestServer, stopTestServer } from "../setup.js";

let baseUrl;

describe("Performance Tests", () => {
  beforeAll(async () => {
    baseUrl = await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  test("Health check response time should be under 100ms", async () => {
    const startTime = Date.now();
    await request(baseUrl).get("/api/health");
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    expect(responseTime).toBeLessThan(100);
  });

  test("Login response time should be under 500ms", async () => {
    const startTime = Date.now();
    await request(baseUrl).post("/api/auth/login").send({
      account: "SuperAdmin",
      password: "Super12345",
    });
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    expect(responseTime).toBeLessThan(500);
  });

  test("State fetch response time should be under 1000ms", async () => {
    const loginResponse = await request(baseUrl).post("/api/auth/login").send({
      account: "SuperAdmin",
      password: "Super12345",
    });
    const token = loginResponse.body.token;

    const startTime = Date.now();
    await request(baseUrl)
      .get("/api/state")
      .set("Authorization", `Bearer ${token}`);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    expect(responseTime).toBeLessThan(1000);
  });

  test("Admin dashboard response time should be under 500ms", async () => {
    const loginResponse = await request(baseUrl).post("/api/admin/login").send({
      username: "SuperAdmin",
      password: "Super12345",
    });
    const token = loginResponse.body.token;

    const startTime = Date.now();
    await request(baseUrl)
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${token}`);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    expect(responseTime).toBeLessThan(500);
  });

  test("Admin users list response time should be under 1000ms", async () => {
    const loginResponse = await request(baseUrl).post("/api/admin/login").send({
      username: "SuperAdmin",
      password: "Super12345",
    });
    const token = loginResponse.body.token;

    const startTime = Date.now();
    await request(baseUrl)
      .get("/api/admin/users?page=1&pageSize=10")
      .set("Authorization", `Bearer ${token}`);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    expect(responseTime).toBeLessThan(1000);
  });

  test("Concurrent health checks should all complete successfully", async () => {
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(request(baseUrl).get("/api/health"));
    }
    const responses = await Promise.all(promises);
    responses.forEach((response) => {
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });
  });

  test("Memory usage should be reasonable after multiple requests", async () => {
    for (let i = 0; i < 50; i++) {
      await request(baseUrl).get("/api/health");
    }
    const memoryUsage = process.memoryUsage();
    expect(memoryUsage.rss).toBeLessThan(500 * 1024 * 1024);
  });
});
