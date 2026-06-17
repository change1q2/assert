import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoPath = path.dirname(scriptDir);
const commitMessage = process.argv.slice(2).join(" ").trim();

const run = (command, args, options = {}) =>
  execFileSync(command, args, {
    cwd: repoPath,
    stdio: "pipe",
    encoding: "utf8",
    ...options,
  }).trim();

run("node", [path.join(scriptDir, "setup-github-push.mjs")]);

const status = run("git", ["status", "--short"]);
if (status) {
  if (!commitMessage) {
    console.log("当前有未提交内容，请附带提交信息运行：");
    console.log('npm run push:github -- "这里写提交说明"');
    console.log(status);
    process.exit(1);
  }

  execFileSync("git", ["add", "-A"], { cwd: repoPath, stdio: "inherit" });
  execFileSync("git", ["commit", "-m", commitMessage], { cwd: repoPath, stdio: "inherit" });
}

const branch = run("git", ["branch", "--show-current"]);
if (!branch) {
  throw new Error("无法识别当前分支");
}

execFileSync("git", ["push", "origin", branch], { cwd: repoPath, stdio: "inherit" });
const lastCommit = run("git", ["log", "-1", "--pretty=format:%h %s"]);
console.log(`推送完成: ${lastCommit}`);
