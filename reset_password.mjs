// Script to reset admin password
import crypto from 'node:crypto';

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

const newPassword = 'test123';
const newHash = hashPassword(newPassword);
console.log(`New password hash for "${newPassword}":`);
console.log(newHash);
console.log();
console.log(`SQL to update:`);
console.log(`UPDATE users SET password_hash = '${newHash}' WHERE account = 'admin';`);
