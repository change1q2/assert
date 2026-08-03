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
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@lifeassert.online";
  const appDomain = process.env.APP_DOMAIN || "https://www.lifeassert.online";

  if (!resendApiKey) {
    console.log(`[EMAIL development] ${email}: ${code}`);
    return false;
  }

  const fromDomain = fromEmail.split("@")[1];
  const verifiedDomain = "lifeassert.online";
  if (fromDomain !== verifiedDomain) {
    console.error(`[EMAIL] from domain "${fromDomain}" does not match verified domain "${verifiedDomain}"`);
    throw new Error("邮件发件域名未配置，请联系管理员。");
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `Wealth OS <${fromEmail}>`,
        to: email,
        subject: "Wealth OS 邮箱验证码",
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #4F46E5; margin: 0;">Wealth OS</h1>
              <p style="color: #6B7280; margin-top: 10px;">个人精细化资产管理平台</p>
            </div>
            <div style="background: #F9FAFB; border-radius: 12px; padding: 30px; text-align: center;">
              <p style="color: #374151; margin-bottom: 20px;">您的邮箱验证码是：</p>
              <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #4F46E5; letter-spacing: 8px;">${code}</span>
              </div>
              <p style="color: #9CA3AF; font-size: 14px;">验证码有效期为 ${SMS_CODE_TTL_MINUTES} 分钟，请尽快使用。</p>
            </div>
            <div style="text-align: center; margin-top: 30px; color: #9CA3AF; font-size: 12px;">
              <p>如果这不是您的操作，请忽略此邮件。</p>
              <p style="margin-top: 8px;">${appDomain}</p>
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[EMAIL] Resend API error (HTTP ${response.status}):`, errorText);

      if (response.status === 401) {
        throw new Error("邮件服务鉴权失败，请联系管理员。");
      } else if (response.status === 403) {
        throw new Error("邮件发件域名未验证，请联系管理员。");
      } else if (response.status === 429) {
        throw new Error("邮件发送过于频繁，请稍后再试。");
      } else {
        throw new Error("邮件发送失败，请稍后重试。");
      }
    }

    console.log(`[EMAIL] Verification code sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Email delivery error:", error.message);
    throw new Error("邮件发送失败，请稍后重试。");
  }
}

export { createEmailCode, verifyEmailCode, deliverEmailCode, EMAIL_CODE_PURPOSE };
