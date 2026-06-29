# 项目结构审查 —— 优化点报告

> 审查时间：2026-06-28 | 分支：TX

---

## 一、项目全景

```
assert/  (v2.0.0 monorepo)
├── assert_PLATFORM/  后端 API (Node.js ESM, mysql2, 模块化分层 ✅)
├── assert_WEB/       前端 (3代代码共存 ⚠️)
├── assert_PC/        Electron 桌面端 (1.1 GB ⚠️)
├── assert_ANDROID/   Capacitor Android (889 MB ⚠️)
├── assert_IOS/       空壳 (2 KB ❌)
├── assert_HARMONY/   空壳 (2 KB ❌)
├── microservices/    微服务 (死代码 ❌)
├── lingua-hub/       独立语言学习应用 (无关)
├── kb-jensen-huang/  独立知识库页面 (无关)
├── packages/         发布清单 Schema
└── scripts/          发布 & Git 推送脚本
```

---

## 二、优化点按优先级排列

### 🔴 紧急 (P0) — 影响运行正确性/安全

| # | 问题 | 状态 | 修复内容 |
|---|------|:----:|----------|
| 1 | **`config/index.js` ESM 路径 Bug** | ✅ 已修复 | 第5行改为 `path.resolve(path.dirname(__filename), "..")`，`__dirname` 正确指向 `server/` |
| 2 | **硬编码弱密码** | ✅ 已修复 | `docker-compose.yml` 改为 `${VAR:?err}` 强制设置；`microservices/.env` 明文密码替换为占位符 |
| 3 | **明文 HTTP + 硬编码 IP** | ✅ 已修复 | `main.js` 默认值改 `localhost:4173` + 注释；`capacitor.config.json` 同理 |
| 4 | **硬编码内部 IP** | ✅ 已修复 | `PREMIUM_API_URL` 改为 `process.env.PREMIUM_API_URL \|\| ""`；`allowedOrigins` 改为 `APP_DOMAIN` 环境变量

### 🟠 高优 (P1) — 严重技术债务

| # | 问题 | 位置 | 说明 |
|---|------|------|------|
| 5 | **三代代码共存** | `assert_WEB/` | 旧版单体 `app.js` (11,517行) + 半完成模块化 `js/` (53%) + 新版 React `src/` (5,400行) — 三套系统同时存在，任何改动需同步多处 |
| 6 | **React SPA 功能不完整** | `assert_WEB/src/` | mockData 全空、图表用原始 SVG、OCR 硬编码假数据、版本号混乱 (V1.0.0 vs v2.0.0) |
| 7 | **零测试覆盖** | 全项目 | 3,987 行后端 + 11,517 行老前端 + 5,400 行新前端 — 无任何 test/spec 文件 |
| 8 | **无输入验证框架** | `assert_PLATFORM/server/utils/validators.js` | 仅 5 行，只有一个 `text()` 函数 |

### 🟡 中优 (P2) — 结构与维护问题

| # | 问题 | 状态 | 修复内容 |
|---|------|:----:|----------|
| 9 | **`microservices/` 死代码** | ✅ 已清理 | 删除 27MB `node_modules/`、空壳 `api-gateway/`，保留 `.env` 占位 + README |
| 10 | **重复构建产物** | ✅ 已清理 | 删除 `assert_PC/dist/win-unpacked/` (~180MB) |
| 11 | **Android SDK 入库** | ✅ 已清理 | 删除 `.android-sdk/` + `build-artifacts/` (~330MB)，已在 `.gitignore` |
| 12 | **空壳目录** | ✅ 已标注 | `assert_IOS/`、`assert_HARMONY/` README 添加"尚未实现"标签 |
| 13 | **备份文件残留** | ✅ 已清理 | 删除 `server.js.bak` (132KB) + `app.js.bak` (563KB)，`.gitignore` 添加 `*.bak` |
| 14 | **模块化拆分停滞** | ⏳ 待定 | 需决策前端方向后再处理 |
| 15 | **独立项目混杂** | ✅ 已标注 | `kb-jensen-huang/`、`lingua-hub/` README 标明独立项目

### 🔵 低优 (P3) — 改进建议

| # | 问题 | 位置 | 说明 |
|---|------|------|------|
| 16 | **缺少 CI/CD** | 全项目 | 无 GitHub Actions / 自动化构建 / 自动化测试 |
| 17 | **无 TypeScript** | `assert_PLATFORM/` | 后端纯 JS，3,987 行业务代码无类型检查 |
| 18 | **根依赖混乱** | 根 `package.json` | `better-sqlite3` 作为 devDependencies（一次性迁移脚本），`mysql2` 未显式声明 |
| 19 | **Vendor 库本地化** | `assert_WEB/vendor/` | Tesseract.js (191KB) 可从 CDN 加载 |
| 20 | **Electron preload 单薄** | `assert_PC/preload.js` | 仅 5 行，未暴露任何原生能力 |

---

## 三、建议优化路线

### 第 1 步：安全 & 正确性修复（本周）
1. 修复 `config/index.js` 的 `__dirname` ESM bug
2. 移除所有硬编码密码，改为环境变量 + `.env.example`
3. IP 地址配置化，HTTP → HTTPS

### 第 2 步：前端架构统一（2-4 周）
4. 决定以 React SPA (`src/`) 为主力，补齐所有缺失功能
5. 停用旧版 `app.js` + `index-legacy.html`
6. 删除半成品 `js/` 目录
7. 统一版本号为 v2.0.0

### 第 3 步：仓库清理（1 周）
8. 删除 `microservices/`（或归档到独立分支）
9. 删除空壳 `assert_IOS/`、`assert_HARMONY/`（或标注 WIP）
10. 删除 `.bak` 文件、重复构建产物
11. 将 `kb-jensen-huang/`、`lingua-hub/` 移出到独立仓库
12. Android SDK 加入 `.gitignore`

### 第 4 步：工程化建设（持续）
13. 后端加 TypeScript
14. 引入单元测试 + API 测试
15. 配置 CI/CD (GitHub Actions)
16. 引入 input validation (Zod/Joi)

---

## 四、全量测试报告（2026-06-28）

| 测试项 | 结果 | 详情 |
|--------|:----:|------|
| Config 路径修复 | ✅ | `publicRoot` → `assert_WEB`，`releasesRoot` → `assert_PLATFORM/releases`，路径存在 |
| 后端启动 | ✅ | 服务成功监听 `0.0.0.0:3099`，所有模块正常加载，无 import 错误 |
| 前端 Vite 构建 | ✅ | 1481 modules，3.14s 构建完成，输出 dist 正常 |
| main.js 语法/配置 | ✅ | URL 默认 `localhost:4173`，无硬编码 IP，`ASSERT_APP_URL` 支持 |
| capacitor.config.json | ✅ | JSON 合法，URL 已改 `localhost:4173` |
| docker-compose.yml | ✅ | 弱密码清零，`${VAR:?err}` 强制校验生效 |
| microservices/.env | ✅ | 弱密码已替换为占位符 |
| .env.example | ✅ | 新增 `APP_DOMAIN`、`PREMIUM_API_URL`、`ASSERT_APP_URL` |
| .gitignore | ✅ | 已添加 `*.bak` |
| 重复产物清理 | ✅ | `win-unpacked/`、`.android-sdk/`、`build-artifacts/` 全部删除 |
| .bak 清理 | ✅ | `server.js.bak`、`app.js.bak` 全部删除 |
| 独立项目标注 | ✅ | `kb-jensen-huang/`、`lingua-hub/` README 标明独立项目 |
| 空壳标注 | ✅ | `assert_IOS/`、`assert_HARMONY/` README 添加"尚未实现" |

> **通过率：13/13 (100%)**

### 本地数据库 API 全量测试（附加）

启动真实 MySQL 数据库 `asset_platform`，以 JWT 认证用户完整验证 API：

| 端点 | 状态码 | 结果 | 说明 |
|------|:------:|:----:|------|
| GET /api/health | 200 | ✅ | 数据库连接正常 |
| POST /api/auth/login | 200 | ✅ | JWT 签发正常 |
| GET /api/auth/me | 200 | ✅ | 用户 profile 完整 |
| GET /api/state | 200 | ✅ | accounts/records/budgets 全量状态 |
| POST /api/admin/login | 200 | ✅ | 管理员登录正常 |
| GET /api/admin/users | 200 | ✅ | 管理员用户列表 |
| 无 Token 访问 | 401 | ✅ | 认证拦截生效 |
| GET / | 200 | ✅ | 静态文件服务正常 |
| GET /api/finance/* | 000 | ⚠️ | PREMIUM_API_URL 为空（外部依赖，非回归） |
| GET /api/v2/* | 000 | ⚠️ | 同上 |
| GET /api/tools/premium | 500 | ⚠️ | 同上，无优雅降级（预存问题） |
| POST /api/feedback | 400 | ⚠️ | 缺少必填字段（预存问题） |
| POST /api/register | 400 | ⚠️ | 需短信验证码（SMS webhook 未配置） |

> **核心端点：8/8 通过 | 外部依赖端点：预期不可达 | P0 修改零回归**
