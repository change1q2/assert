#!/usr/bin/env bash
# 一键安装 mattpocock/skills 到当前目录的 .claude-plugin 文件夹
# 用法：bash install.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="$SCRIPT_DIR/.claude-plugin"

if [ -d "$TARGET_DIR/.git" ]; then
  echo "[install] $TARGET_DIR 已是 git 仓库，执行 pull"
  git -C "$TARGET_DIR" pull --ff-only || true
elif [ -d "$TARGET_DIR" ]; then
  echo "[install] 警告：$TARGET_DIR 已存在但不是 git 仓库。"
  read -rp "[install] 备份为 ${TARGET_DIR}.bak.\$\$ 后继续？[y/N] " ans
  if [[ "$ans" =~ ^[Yy]$ ]]; then
    mv "$TARGET_DIR" "${TARGET_DIR}.bak.$$"
  else
    echo "[install] 取消。"
    exit 1
  fi
  git clone --depth 1 https://github.com/mattpocock/skills.git "$TARGET_DIR"
else
  echo "[install] 正在克隆 mattpocock/skills 到 $TARGET_DIR ..."
  git clone --depth 1 https://github.com/mattpocock/skills.git "$TARGET_DIR"
fi

cat <<EOF

[install] 完成。目录：$TARGET_DIR

[install] 在 Claude Code 中启用：
  /plugin marketplace add $TARGET_DIR
  /plugin install mattpocock-skills@mattpocock

[install] 在 Cursor / Codex 中启用：
  直接引用 SKILL.md 即可（参考 $TARGET_DIR/README.md）
EOF
