import crypto from "node:crypto";

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, expected] = String(stored).split(":");
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(actual, Buffer.from(expected, "hex"));
}

function verificationCodeHash(phone, purpose, code) {
  return crypto.createHash("sha256").update(`${phone}:${purpose}:${code}`).digest("hex");
}

export { hashPassword, verifyPassword, verificationCodeHash };
