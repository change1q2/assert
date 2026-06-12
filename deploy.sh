#!/usr/bin/env bash
# ============================================================
#  自动部署脚本 — 本地 git push 后一键部署到服务器
#  用法: bash deploy.sh [分支名]   (默认 main)
# ============================================================
set -euo pipefail

# ---------- 配置 ----------
SERVER_IP="119.28.189.98"
SSH_KEY="$HOME/.ssh/assert-deploy.pem"
SSH_USER="root"
DEPLOY_DIR="/opt/asset-platform"
SERVICE_NAME="asset-platform"
NODE_BIN="/usr/local/lighthouse/softwares/nodejs/node/bin"
BRANCH="${1:-main}"

# ---------- 颜色 ----------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
info() { echo -e "  ${CYAN}›${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; exit 1; }

SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no -o ConnectTimeout=10"
remote() { ssh $SSH_OPTS "$SSH_USER@$SERVER_IP" "$*"; }

echo ""
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     资产平台 · 自动部署             ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

# ---------- 1. 检查本地 git 状态 ----------
info "检查本地 git 状态..."
cd "$(dirname "$0")"

if [ -n "$(git status --porcelain)" ]; then
    warn "本地有未提交的更改"
    read -rp "  是否自动提交并推送? [Y/n] " answer
    answer="${answer:-Y}"
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        git add -A
        git commit -m "deploy: $(date '+%Y-%m-%d %H:%M')"
        ok "已自动提交"
    else
        fail "请先手动提交更改后再部署"
    fi
fi

# ---------- 2. 推送到 GitHub ----------
info "推送到 GitHub ($BRANCH)..."
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    warn "当前分支 $CURRENT_BRANCH ≠ 目标分支 $BRANCH"
fi

if ! git push origin "$BRANCH" 2>&1; then
    # 尝试 rebase 后重试
    warn "推送被拒绝，尝试 pull --rebase 后重试..."
    git pull --rebase origin "$BRANCH"
    git push origin "$BRANCH" || fail "推送失败，请手动解决冲突"
fi
ok "代码已推送到 GitHub"

# ---------- 3. SSH 连接服务器 ----------
info "连接服务器 $SERVER_IP..."
remote "echo connected" || fail "无法连接服务器"
ok "SSH 连接成功"

# ---------- 4. 拉取最新代码 ----------
info "拉取最新代码 ($BRANCH)..."
remote "cd $DEPLOY_DIR && $NODE_BIN/../lib/node_modules/npm/bin/npm-cli.js --version >/dev/null 2>&1 || true; \
    git fetch origin $BRANCH && \
    BEFORE=\$(git rev-parse HEAD) && \
    git reset --hard origin/$BRANCH && \
    AFTER=\$(git rev-parse HEAD) && \
    echo \"BEFORE:\$BEFORE AFTER:\$AFTER\""

# ---------- 5. 安装依赖 ----------
info "安装/更新依赖..."
remote "export PATH=$NODE_BIN:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin; \
    cd $DEPLOY_DIR && npm install --omit=dev 2>&1 | tail -3"
ok "依赖安装完成"

# ---------- 6. 重启服务 ----------
info "重启 $SERVICE_NAME 服务..."
remote "systemctl restart $SERVICE_NAME && sleep 2"

# ---------- 7. 健康检查 ----------
info "执行健康检查..."
HEALTH=$(remote "curl -sf http://127.0.0.1/api/health" 2>/dev/null || echo "FAIL")

if echo "$HEALTH" | grep -q '"ok":true'; then
    ok "服务运行正常 — $HEALTH"
else
    fail "健康检查失败: $HEALTH"
fi

# ---------- 8. 输出服务状态 ----------
echo ""
remote "systemctl status $SERVICE_NAME --no-pager -l | head -15"

echo ""
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo -e "${GREEN}  部署完成!${NC}"
echo -e "${GREEN}  http://$SERVER_IP${NC}"
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo ""
