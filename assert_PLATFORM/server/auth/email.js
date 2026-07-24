import crypto from "node:crypto";
import { pool } from "../db/index.js";
import { sqlRun, sqlGet } from "../utils/db.js";
import { fmtDt } from "../utils/date.js";
import { SMS_CODE_TTL_MINUTES, SMS_RESEND_SECONDS } from "../config/index.js";
import { verificationCodeHash } from "../utils/crypto.js";

const EMAIL_CODE_PURPOSE = "email-register";

async function createEmailCode(email) {
  const previous = await sqlGet(pool, `
    SELECT created_at FROM sms_verification_codes
    WHERE phone = ? AND purpose = ?
    ORDER BY id DESC LIMIT 1
  `, [email, EMAIL_CODE_PURPOSE]);
  if (previous && Date.now() - new Date(`${previous.created_at}Z`).getTime() < SMS_RESEND_SECONDS * 1000) {
    throw new Error("验证码发送过于频繁，请稍后再试。");
  }
  const code = String(crypto.randomInt(100000, 1000000));
  const expiresAt = fmtDt(new Date(Date.now() + SMS_CODE_TTL_MINUTES * 60000));
  await sqlRun(pool, `
    INSERT INTO sms_verification_codes (phone, purpose, code_hash, expires_at)
    VALUES (?, ?, ?, ?)
  `, [email, EMAIL_CODE_PURPOSE, verificationCodeHash(email, EMAIL_CODE_PURPOSE, code), expiresAt]);
  return code;
}

async function verifyEmailCode(email, code) {
  const row = await sqlGet(pool, `
    SELECT id, code_hash, expires_at FROM sms_verification_codes
    WHERE phone = ? AND purpose = ? AND used_at = ''
    ORDER BY id DESC LIMIT 1
  `, [email, EMAIL_CODE_PURPOSE]);
  if (!row || new Date(row.expires_at) <= new Date()) return false;
  const actual = Buffer.from(verificationCodeHash(email, EMAIL_CODE_PURPOSE, code), "hex");
  const expected = Buffer.from(row.code_hash, "hex");
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return false;
  await sqlRun(pool, "UPDATE sms_verification_codes SET used_at = ? WHERE id = ?", [fmtDt(new Date()), row.id]);
  return true;
}

async function deliverEmailCode(email, code) {
  const webhook = process.env.EMAIL_WEBHOOK_URL;
  if (!webhook) {
    console.log(`[EMAIL development] ${email}: ${code}`);
    return false;
  }
  const response = await fetch(webhook, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.EMAIL_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.EMAIL_WEBHOOK_TOKEN}` } : {}),
    },
    body: JSON.stringify({ email, code, purpose: EMAIL_CODE_PURPOSE, expiresInMinutes: SMS_CODE_TTL_MINUTES }),
  });
  if (!response.ok) throw new Error("邮件服务发送失败，请稍后重试。");
  return true;
}

export { createEmailCode, verifyEmailCode, deliverEmailCode, EMAIL_CODE_PURPOSE };
