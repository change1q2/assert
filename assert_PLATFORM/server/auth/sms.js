import crypto from "node:crypto";
import { pool } from "../db/index.js";
import { sqlRun, sqlGet } from "../utils/db.js";
import { fmtDt } from "../utils/date.js";
import { TOKEN_TTL_DAYS, SMS_CODE_TTL_MINUTES, SMS_RESEND_SECONDS } from "../config/index.js";
import { verificationCodeHash } from "../utils/crypto.js";

async function createSmsCode(phone, purpose) {
  const previous = await sqlGet(pool, `
    SELECT created_at FROM sms_verification_codes
    WHERE phone = ? AND purpose = ?
    ORDER BY id DESC LIMIT 1
  `, [phone, purpose]);
  if (previous && Date.now() - new Date(`${previous.created_at}Z`).getTime() < SMS_RESEND_SECONDS * 1000) {
    throw new Error("验证码发送过于频繁，请稍后再试。");
  }
  const code = String(crypto.randomInt(100000, 1000000));
  const expiresAt = fmtDt(new Date(Date.now() + SMS_CODE_TTL_MINUTES * 60000));
  await sqlRun(pool, `
    INSERT INTO sms_verification_codes (phone, purpose, code_hash, expires_at)
    VALUES (?, ?, ?, ?)
  `, [phone, purpose, verificationCodeHash(phone, purpose, code), expiresAt]);
  return code;
}

async function verifySmsCode(phone, purpose, code) {
  const row = await sqlGet(pool, `
    SELECT id, code_hash, expires_at FROM sms_verification_codes
    WHERE phone = ? AND purpose = ? AND used_at = ''
    ORDER BY id DESC LIMIT 1
  `, [phone, purpose]);
  if (!row || new Date(row.expires_at) <= new Date()) return false;
  const actual = Buffer.from(verificationCodeHash(phone, purpose, code), "hex");
  const expected = Buffer.from(row.code_hash, "hex");
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return false;
  await sqlRun(pool, "UPDATE sms_verification_codes SET used_at = ? WHERE id = ?", [fmtDt(new Date()), row.id]);
  return true;
}

async function deliverSmsCode(phone, code, purpose) {
  const webhook = process.env.SMS_WEBHOOK_URL;
  if (!webhook) {
    console.log(`[SMS development] ${phone} ${purpose}: ${code}`);
    return false;
  }
  const response = await fetch(webhook, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.SMS_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.SMS_WEBHOOK_TOKEN}` } : {}),
    },
    body: JSON.stringify({ phone, code, purpose, expiresInMinutes: SMS_CODE_TTL_MINUTES }),
  });
  if (!response.ok) throw new Error("短信服务发送失败，请稍后重试。");
  return true;
}

export { createSmsCode, verifySmsCode, deliverSmsCode };
