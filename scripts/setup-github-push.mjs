import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repoPath = process.cwd();
const homeDir = os.homedir();
const sshDir = path.join(homeDir, ".ssh");
const keyPath = path.join(sshDir, "codex_github_assert");
const configPath = path.join(sshDir, "config");
const hostAlias = "github-assert";
const pushUrl = `git@${hostAlias}:change1q2/assert.git`;
const fetchUrl = "https://github.com/change1q2/assert.git";

if (!fs.existsSync(keyPath)) {
  throw new Error(`未找到 GitHub 推送私钥: ${keyPath}`);
}

fs.mkdirSync(sshDir, { recursive: true });

const normalizedKeyPath = keyPath.replace(/\\/g, "/");
const beginMarker = `# >>> ${hostAlias} >>>`;
const endMarker = `# <<< ${hostAlias} <<<`;
const hostBlock = [
  beginMarker,
  `Host ${hostAlias}`,
  "  HostName ssh.github.com",
  "  User git",
  "  Port 443",
  `  IdentityFile ${normalizedKeyPath}`,
  "  IdentitiesOnly yes",
  "  StrictHostKeyChecking accept-new",
  endMarker,
].join("\n");

const existing = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
const markerRegex = new RegExp(
  `^# >>> ${hostAlias} >>>.*?^# <<< ${hostAlias} <<<\\r?\\n?`,
  "ms",
);

let updated = "";
if (!existing.trim()) {
  updated = `${hostBlock}\n`;
} else if (markerRegex.test(existing)) {
  updated = existing.replace(markerRegex, `${hostBlock}\n`);
} else {
  const separator = existing.endsWith("\n") ? "" : "\n";
  updated = `${existing}${separator}${hostBlock}\n`;
}

fs.writeFileSync(configPath, updated, "utf8");

const runGit = (...args) => execFileSync("git", ["-C", repoPath, ...args], { stdio: "pipe", encoding: "utf8" }).trim();

runGit("remote", "set-url", "origin", fetchUrl);
runGit("remote", "set-url", "--push", "origin", pushUrl);
try {
  runGit("config", "--local", "--unset-all", "core.sshCommand");
} catch {
  // ignore when absent
}
runGit("config", "--local", "push.default", "current");

console.log("GitHub 推送配置完成");
console.log(`仓库: ${repoPath}`);
console.log(`SSH Host: ${hostAlias}`);
console.log(`Push URL: ${pushUrl}`);
console.log(runGit("remote", "-v"));
