import crypto from "node:crypto";
import { pool } from "../db/index.js";
import { json, readBody } from "../utils/http.js";
import { sqlGet, sqlRun } from "../utils/db.js";
import { text } from "../utils/validators.js";
import { verifyPassword, hashPassword } from "../utils/crypto.js";
import { createSmsCode, verifySmsCode, deliverSmsCode, issueToken } from "../auth/index.js";
import { createEmailCode, verifyEmailCode, deliverEmailCode } from "../auth/email.js";
import {
  defaultState,
  userByPhone,
  userByEmail,
  createUser,
  authPayload,
  profileForUser,
} from "../services/user-service.js";
import { loadUserState, saveUserState } from "../services/state-service.js";
import { SMS_CODE_TTL_MINUTES } from "../config/index.js";

async function handler(req, res, body, origin, pathname, url) {
  if (req.method === "POST" && pathname === "/api/auth/sms/send") {
    const phone = text(body.phone).trim();
    const purpose = text(body.purpose).trim();
    if (!/^1\d{10}$/.test(phone) || !["login", "register", "reset"].includes(purpose)) {
      json(res, 400, { message: "请输入正确的手机号。" }, origin);
      return;
    }
    const existingUser = await userByPhone(phone);
    if (purpose === "register" && existingUser) {
      json(res, 409, { message: "这个手机号已经注册，请直接登录。" }, origin);
      return;
    }
    if (purpose !== "register" && !existingUser) {
      json(res, 404, { message: "这个手机号尚未注册。" }, origin);
      return;
    }
    const code = await createSmsCode(phone, purpose);
    const delivered = await deliverSmsCode(phone, code, purpose);
    json(res, 200, {
      ok: true,
      expiresIn: SMS_CODE_TTL_MINUTES * 60,
      message: delivered ? "验证码已发送。" : "测试验证码已生成。",
      ...(delivered ? {} : { debugCode: code }),
    }, origin);
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/email-code/send") {
    const email = text(body.email).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      json(res, 400, { message: "请输入正确的邮箱地址。" }, origin);
      return;
    }
    try {
      const code = await createEmailCode(email);
      const delivered = await deliverEmailCode(email, code);
      json(res, 200, {
        ok: true,
        expiresIn: SMS_CODE_TTL_MINUTES * 60,
        message: delivered ? "验证码已发送。" : "测试验证码已生成。",
        ...(delivered ? {} : { debugCode: code }),
      }, origin);
    } catch (error) {
      json(res, 429, { message: error.message || "验证码发送过于频繁。" }, origin);
    }
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/register-by-email") {
    const email = text(body.email).trim();
    const password = text(body.password);
    const confirmPassword = text(body.confirmPassword);
    const name = text(body.name || "新用户").trim();
    const currency = text(body.currency || "CNY");
    const code = text(body.code).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      json(res, 400, { message: "请输入正确的邮箱地址。" }, origin);
      return;
    }
    if (password.length < 6) {
      json(res, 400, { message: "密码至少 6 位。" }, origin);
      return;
    }
    if (password !== confirmPassword) {
      json(res, 400, { message: "两次输入的密码不一致。" }, origin);
      return;
    }
    if (await userByEmail(email)) {
      json(res, 409, { message: "这个邮箱已经注册，请直接登录。" }, origin);
      return;
    }
    if (!(await verifyEmailCode(email, code))) {
      json(res, 400, { message: "邮箱验证码不正确或已过期。" }, origin);
      return;
    }
    const account = text(body.account).trim() || email.split("@")[0];
    if (await sqlGet(pool, "SELECT id FROM users WHERE account = ?", [account])) {
      json(res, 409, { message: "这个账号已经存在，请自定义其他账号。" }, origin);
      return;
    }
    const userId = await createUser({ account, password, name, phone: "", email, currency });
    const initialState = defaultState({ account, name, phone: "", email, currency });
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await saveUserState(conn, userId, initialState);
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
    json(res, 201, await authPayload(userId), origin);
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/register") {
    const account = text(body.account).trim();
    const password = text(body.password);
    const name = text(body.name).trim();
    const phone = text(body.phone).trim();
    const email = text(body.email).trim();
    const currency = text(body.currency || "CNY");
    const smsCode = text(body.smsCode).trim();
    if (account.length < 3 || password.length < 6 || !name || !phone) {
      json(res, 400, { message: "账号至少 3 位，密码至少 6 位，昵称和手机不能为空。" }, origin);
      return;
    }
    if (!/^1\d{10}$/.test(phone)) {
      json(res, 400, { message: "请输入正确的手机号。" }, origin);
      return;
    }
    if (await sqlGet(pool, "SELECT id FROM users WHERE account = ?", [account])) {
      json(res, 409, { message: "这个账号已经注册，请直接登录。" }, origin);
      return;
    }
    if (await userByPhone(phone)) {
      json(res, 409, { message: "这个手机号已经注册，请直接登录。" }, origin);
      return;
    }
    if (!(await verifySmsCode(phone, "register", smsCode))) {
      json(res, 400, { message: "短信验证码不正确或已过期。" }, origin);
      return;
    }
    const userId = await createUser({ account, password, name, phone, email, currency });
    const initialState = body.initialState && typeof body.initialState === "object"
      ? {
        ...body.initialState,
        user: {
          ...(body.initialState.user || {}),
          account,
          name,
          phone,
          email,
          currency,
        },
      }
      : defaultState({ account, name, phone, email, currency });
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await saveUserState(conn, userId, initialState);
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
    json(res, 201, await authPayload(userId), origin);
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/login") {
    const user = await sqlGet(pool, "SELECT id, account, password_hash FROM users WHERE account = ?", [text(body.account).trim()]);
    if (!user || !verifyPassword(text(body.password), user.password_hash)) {
      json(res, 401, { message: "账号或密码不正确。" }, origin);
      return;
    }
    json(res, 200, await authPayload(user.id), origin);
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/phone-login") {
    const phone = text(body.phone).trim();
    const user = await userByPhone(phone);
    if (!user || !(await verifySmsCode(phone, "login", text(body.smsCode).trim()))) {
      json(res, 401, { message: "手机号或验证码不正确。" }, origin);
      return;
    }
    json(res, 200, await authPayload(user.id), origin);
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/reset-password") {
    const phone = text(body.phone).trim();
    const password = text(body.password);
    const user = await userByPhone(phone);
    if (!user) {
      json(res, 404, { message: "这个手机号尚未注册。" }, origin);
      return;
    }
    if (password.length < 6) {
      json(res, 400, { message: "新密码至少需要 6 位。" }, origin);
      return;
    }
    if (!(await verifySmsCode(phone, "reset", text(body.smsCode).trim()))) {
      json(res, 400, { message: "短信验证码不正确或已过期。" }, origin);
      return;
    }
    await sqlRun(pool, "UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?", [hashPassword(password), user.id]);
    await sqlRun(pool, "DELETE FROM sessions WHERE user_id = ?", [user.id]);
    json(res, 200, await authPayload(user.id), origin);
    return;
  }
}

export { handler };
