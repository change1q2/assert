# Wealth OS (Assert) - Code Wiki

> **个人精细化资产管理平台** - 统一多账户、多币种、三维归因分析的跨平台财富管理系统

---

## 目录

1. [项目概述](#项目概述)
2. [整体架构](#整体架构)
3. [目录结构](#目录结构)
4. [技术栈与依赖](#技术栈与依赖)
5. [后端平台 (assert_PLATFORM)](#后端平台-assert_platform)
6. [Web前端 (assert_WEB)](#web前端-assert_web)
7. [PC客户端 (assert_PC)](#pc客户端-assert_pc)
8. [移动端客户端](#移动端客户端)
9. [数据模型设计](#数据模型设计)
10. [API接口文档](#api接口文档)
11. [发布与部署](#发布与部署)
12. [本地开发指南](#本地开发指南)
13. [数据库迁移](#数据库迁移)

---

## 项目概述

### 项目简介

Wealth OS（项目代号 Assert）是一个跨平台的个人资产管理系统，支持：

- **多账户管理**：现金、投资、外币、负债等多种账户类型
- **多币种支持**：CNY/CNH/USD/HKD/EUR/JPY/GBP 等多币种汇率换算
- **资产分类**：现金类、权益类、债权类、商品类、加密类、吃息类六大资产类别
- **收支记录**：收入、支出、转账的精细化记录与分类
- **理财资产管理**：股票、基金、期货、加密货币等持仓管理与实时行情
- **债务追踪**：借入/借出债务记录与还款计划
- **投资策略**：多方案对比、资产配置、风险评估
- **辅助工具**：ETF/LOF溢价查询、港股打新分析、名人投资追踪
- **跨平台同步**：Web、PC、Android、iOS、HarmonyOS 多端数据同步
- **产品分发**：内置安装包发布与更新检查机制

### 版本信息

- 当前版本：**v2.0.0**
- Node.js 要求：**>= 22.5.0**
- 数据库：**MySQL 8.x+**（原 SQLite 已迁移）

---

## 整体架构

### 系统架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                         客户端层 (Clients)                           │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────┤
│  Web 浏览器  │ Windows PC  │   Android   │     iOS     │  HarmonyOS  │
│ (assert_WEB)│ (assert_PC) │(assert_ANDR)│ (assert_IOS)│(assert_HARM)│
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┘
       │             │             │             │             │
       └─────────────┴─────────────┼─────────────┴─────────────┘
                                   │
                                   │ HTTP/HTTPS + JSON
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      后端服务层 (assert_PLATFORM)                    │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  静态文件服务  │  │  RESTful API │  │    发布包分发服务         │  │
│  │  (assert_WEB)│  │   Server     │  │  (/api/v2/releases/*)    │  │
│  └──────────────┘  └──────┬───────┘  └──────────────────────────┘  │
│                           │                                         │
│  ┌────────────────────────┼─────────────────────────────────────┐  │
│  │                    业务逻辑层                                 │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │  │
│  │  │ 用户认证  │ │ 数据同步  │ │ 行情聚合  │ │ 港股打新分析    │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────────────┘  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │  │
│  │  │ 资产管理  │ │ 收支记账  │ │ 债务管理  │ │ Excel 导出     │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                           │                                         │
│  ┌────────────────────────┼─────────────────────────────────────┐  │
│  │                    数据持久层                                 │  │
│  │              MySQL 连接池 + 事务管理                           │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         外部服务集成                                 │
├─────────────────────┬─────────────────────┬─────────────────────────┤
│  腾讯财经/东方财富   │  东方财富搜索API     │  Premium 行情源         │
│  (实时行情/K线)      │  (证券代码搜索)      │  (ETF/LOF 溢价数据)     │
├─────────────────────┼─────────────────────┼─────────────────────────┤
│  短信 Webhook       │  捷利交易宝/Bing     │  Jina Reader            │
│  (验证码发送)        │  (港股打新数据抓取)  │  (网页内容抓取)         │
└─────────────────────┴─────────────────────┴─────────────────────────┘
```

### 架构特点

1. **原生 Node.js HTTP Server**：后端不依赖 Express/Koa 等框架，使用原生 `http` 模块实现
2. **单文件后端**：所有后端逻辑集中在 [server.js](file:///f:/code_x/assert/assert_PLATFORM/server/server.js) 单文件中
3. **前端纯原生JS**：Web 前端使用 Vanilla JS，无框架依赖（React/Vue/Angular）
4. **Electron 桌面端**：PC 客户端使用 Electron 包装 Web 应用
5. **Capacitor 移动端**：Android 使用 Capacitor 框架构建原生壳
6. **MySQL 数据库**：使用连接池，支持事务和多语句查询
7. **多端同步机制**：基于 `sync_change_log` 表的增量同步

---

## 目录结构

```
f:\code_x\assert\
├── assert_PLATFORM/          # 后端平台服务
│   ├── server/
│   │   ├── server.js         # 后端主入口（HTTP服务+所有API）
│   │   └── schema.sql        # MySQL 数据库表结构定义
│   ├── releases/             # 安装包发布目录
│   │   ├── web/
│   │   ├── pc/
│   │   ├── android/
│   │   ├── ios/
│   │   └── harmony/
│   ├── package.json
│   └── README.md
├── assert_WEB/               # Web 前端主应用
│   ├── index.html            # 主页面入口
│   ├── admin.html            # 管理后台页面
│   ├── app.js                # 前端核心逻辑（所有功能模块）
│   ├── styles.css            # 样式表
│   ├── assets/               # 静态资源（图标等）
│   ├── vendor/               # 第三方库（Tesseract.js OCR）
│   └── package.json
├── assert_PC/                # Windows PC 客户端 (Electron)
│   ├── main.js               # Electron 主进程
│   ├── preload.js            # 预加载脚本
│   └── package.json
├── assert_ANDROID/           # Android 客户端 (Capacitor)
│   ├── android/              # Android 原生工程
│   ├── www/                  # Web 资源
│   ├── capacitor.config.json
│   └── package.json
├── assert_IOS/               # iOS 客户端骨架
│   └── package.json
├── assert_HARMONY/           # HarmonyOS 客户端骨架
│   └── package.json
├── packages/                 # 共享协议与Schema
│   ├── release-manifest.schema.json  # 发布清单 JSON Schema
│   └── README.md
├── scripts/                  # 运维脚本
│   ├── publish-release.mjs   # 发布安装包脚本
│   ├── push-github.mjs       # GitHub 推送脚本
│   └── setup-github-push.mjs # GitHub SSH 推送配置脚本
├── kb-jensen-huang/          # 黄仁勋知识库页面
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── .gitignore
├── README.md                 # 项目根README
├── package.json              # 根工作区配置
├── migrate_to_mysql.cjs      # SQLite → MySQL 迁移脚本
├── deploy.sh                 # 部署脚本
└── preview-server.ps1        # 预览服务器PowerShell脚本
```

---

## 技术栈与依赖

### 根工作区依赖

| 依赖包 | 版本 | 用途 |
|--------|------|------|
| mysql2 | ^3.22.5 | MySQL 数据库驱动（Promise API） |
| better-sqlite3 | ^12.4.1 | SQLite 驱动（用于数据迁移） |

### 后端平台 (assert_PLATFORM)

| 依赖包 | 版本 | 用途 |
|--------|------|------|
| mysql2 | ^3.22.5 | MySQL 数据库驱动 |
| xlsx | ^0.18.5 | Excel 文件读写（港股打新导出） |

**Node.js 原生模块使用**：`http`, `crypto`, `fs`, `path`, `vm`, `url`

### Web 前端 (assert_WEB)

| 技术 | 说明 |
|------|------|
| Vanilla JavaScript | 无框架，纯原生JS |
| CSS3 | 原生CSS，使用CSS变量 |
| http-server | 静态文件服务器（开发用） |
| Tesseract.js | OCR 识别（vendor目录） |

### PC 客户端 (assert_PC)

| 依赖包 | 版本 | 用途 |
|--------|------|------|
| electron | ^31.7.7 | 桌面应用框架 |
| electron-builder | ^24.13.3 | 打包构建工具 |
| electron-packager | ^17.1.2 | 打包工具 |

### 移动端

| 平台 | 技术框架 |
|------|---------|
| Android | Capacitor + Android SDK |
| iOS | Capacitor + iOS SDK（骨架） |
| HarmonyOS | 骨架阶段 |

---

## 后端平台 (assert_PLATFORM)

### 模块概述

后端是整个系统的核心，负责：
- 用户认证与会话管理
- 数据持久化与CRUD操作
- 多设备增量同步
- 实时行情数据聚合
- 港股打新分析工具
- 安装包发布与分发
- 静态文件托管
- 管理员后台接口

### 文件位置

- 主入口：[server.js](file:///f:/code_x/assert/assert_PLATFORM/server/server.js)
- 数据库Schema：[schema.sql](file:///f:/code_x/assert/assert_PLATFORM/server/schema.sql)

### 服务器配置

**环境变量（.env 文件）**：

```env
# MySQL 数据库配置
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=123456
MYSQL_DATABASE=asset_platform

# API 服务端口
API_PORT=3000

# 跨域白名单（逗号分隔）
EXTRA_ORIGINS=http://example.com

# 发布包目录（可选，默认 assert_PLATFORM/releases）
RELEASES_ROOT=/opt/assert-releases

# 短信服务 Webhook
SMS_WEBHOOK_URL=https://your-sms-service.com/send
SMS_WEBHOOK_TOKEN=your-token

# 管理员默认密码（首次启动创建）
ADMIN_PASSWORD=admin123

# 港股打新数据源文件（可选）
HK_IPO_SOURCE_FILE=C:/path/to/hk_ipo_data.mjs
```

### 核心常量

| 常量 | 值 | 说明 |
|------|-----|------|
| PORT | 3000 | API 服务端口 |
| TOKEN_TTL_DAYS | 30 | 用户Token有效期 |
| SMS_CODE_TTL_MINUTES | 5 | 短信验证码有效期 |
| SMS_RESEND_SECONDS | 60 | 验证码重发间隔 |
| PREMIUM_API_URL | http://8.220.240.126:8787/api/latest-lite | ETF/LOF溢价行情源 |

### 关键函数说明

#### 数据库初始化与连接

| 函数 | 位置 | 职责 |
|------|------|------|
| `pool` (常量) | [server.js:23-33](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L23-L33) | MySQL 连接池实例，最大10连接 |
| `initDb` (Promise) | [server.js:36-116](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L36-L116) | 启动时初始化Schema，自动迁移添加新字段 |

#### 认证与安全

| 函数 | 位置 | 职责 |
|------|------|------|
| `hashPassword(password, salt?)` | [server.js:647-650](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L647-L650) | 使用 scrypt 算法哈希密码 |
| `verifyPassword(password, stored)` | [server.js:652-657](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L652-L657) | 密码验证，使用 timingSafeEqual 防时序攻击 |
| `issueToken(userId)` | [server.js:695-701](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L695-L701) | 生成用户认证Token（32字节base64url） |
| `authenticatedUser(req)` | [server.js:767-778](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L767-L778) | 中间件：验证用户Token有效性 |
| `authenticatedAdmin(req)` | [server.js:780-803](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L780-L803) | 中间件：验证管理员权限 |
| `createSmsCode(phone, purpose)` | [server.js:717-733](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L717-L733) | 生成短信验证码（6位数字） |
| `verifySmsCode(phone, purpose, code)` | [server.js:735-747](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L735-L747) | 验证短信验证码 |
| `deliverSmsCode(phone, code, purpose)` | [server.js:749-765](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L749-L765) | 通过Webhook发送短信（开发模式打印到控制台） |

#### 数据访问辅助

| 函数 | 位置 | 职责 |
|------|------|------|
| `sqlRun(conn, sql, params)` | [server.js:660-663](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L660-L663) | 执行SQL（INSERT/UPDATE/DELETE） |
| `sqlAll(conn, sql, params)` | [server.js:664-667](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L664-L667) | 查询所有结果行 |
| `sqlGet(conn, sql, params)` | [server.js:668-671](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L668-L671) | 查询单行结果 |
| `maybeParseJson(val)` | [server.js:672-676](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L672-L676) | 解析JSON字段（兼容mysql2自动解析） |
| `loadUserState(userId)` | [server.js:906-1011](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L906-L1011) | 加载用户完整状态数据 |
| `saveUserState(conn, userId, state)` | （隐含在API中） | 保存用户状态（事务性） |
| `profileForUser(userId)` | [server.js:881-904](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L881-L904) | 获取用户个人资料 |
| `defaultState(profile)` | [server.js:826-879](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L826-L879) | 生成新用户默认初始状态 |

#### HTTP 工具函数

| 函数 | 位置 | 职责 |
|------|------|------|
| `json(res, status, payload, origin)` | [server.js:281-288](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L281-L288) | 发送JSON响应（含CORS处理） |
| `readBody(req)` | [server.js:290-304](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L290-L304) | 读取并解析请求体（10MB限制） |
| `serveStatic(url, res)` | [server.js:535-547](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L535-L547) | 托管assert_WEB静态文件（SPA回退到index.html） |

#### 溢价行情工具 (Premium Market)

| 函数 | 位置 | 职责 |
|------|------|------|
| `fetchPremiumMarket(force?)` | [server.js:474-520](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L474-L520) | 从行情源获取ETF/LOF溢价数据（30秒缓存） |
| `refreshPremiumMarketInBackground()` | [server.js:522-533](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L522-L533) | 后台刷新溢价行情缓存 |
| `normalizePremiumRowNew(row)` | [server.js:347-449](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L347-L449) | 标准化新版溢价行情数据格式 |
| `normalizePremiumRow(cell, source)` | [server.js:451-472](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L451-L472) | 标准化旧版溢价行情数据格式 |
| `premiumReference(cell)` | [server.js:313-345](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L313-L345) | 计算基金溢价率参考值（IOPV/估值/净值） |

#### 港股打新工具 (HK IPO)

| 函数 | 位置 | 职责 |
|------|------|------|
| `loadHkIpoRawDataset()` | [server.js:1482-1500](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L1482-L1500) | 从数据源JS文件加载港股IPO原始数据 |
| `normalizeHkIpoRow(headers, row, index)` | [server.js:1428-1480](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L1428-L1480) | 标准化港股IPO行数据 |
| `normalizeHkIpoRules(ruleRows, savedRules)` | [server.js:1177-1215](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L1177-L1215) | 标准化评分规则（系统规则+自定义规则） |
| `hkIpoRebuildDerivedPayload(payload)` | [server.js:1259-1314](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L1259-L1314) | 根据规则重新计算所有IPO评分与推荐 |
| `hkIpoScoreActualMultiple(rules, actualMultiple, fallbackScore)` | [server.js:1247-1257](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L1247-L1257) | 根据认购倍数计算评分 |
| `enrichHkIpoSponsorsFromTradeGo(payload)` | [server.js:1657-1683](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L1657-L1683) | 从捷利交易宝搜索补充保荐人/基石/绿鞋信息 |
| `enrichHkIpoBigVRowsFromNetwork(payload)` | [server.js:1685-...] | 从全网搜索补充大V意向数据 |
| `hkIpoStatus(row, now)` | [server.js:1104-1119](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L1104-L1119) | 判断IPO状态（待上市/招股中/暗盘/已上市） |

#### 发布包管理

| 函数 | 位置 | 职责 |
|------|------|------|
| `loadReleaseCatalog()` | [server.js:611-627](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L611-L627) | 加载所有平台的发布清单 |
| `readReleaseManifest(platform)` | [server.js:575-589](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L575-L589) | 读取单平台manifest.json |
| `serveReleaseFile(platform, fileName, res)` | [server.js:629-645](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L629-L645) | 提供安装包文件下载 |

#### 金融行情接口

| 函数 | 位置 | 职责 |
|------|------|------|
| `tencentCodeFor(code, market)` | [server.js:2817-2835](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L2817-L2835) | 转换证券代码为腾讯财经格式（sh/sz/hk/us前缀） |
| `/api/finance/lookup` | [server.js:2654-2814](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L2654-L2814) | 证券代码搜索（东方财富API + 内置商品/加密货币） |
| `/api/finance/quotes` | [server.js:2838-2933](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L2838-L2933) | 批量实时行情（腾讯财经为主，东方财富为备） |
| `/api/finance/kline` | [server.js:2936-2961](file:///f:/code_x/assert/assert_PLATFORM/server/server.js#L2936-L2961) | K线历史数据（前复权，腾讯财经） |

---

## Web前端 (assert_WEB)

### 模块概述

Web 前端是一个单页面应用（SPA），使用纯原生 JavaScript 实现，不依赖任何前端框架。主要功能模块包括：

1. **资产总览 (overview)** - 净资产、资产配置图表、目标进度
2. **收支分析 (records)** - 记账、流水、分类统计
3. **理财模块 (finance)** - 证券持仓、实时行情、交易记录、OCR导入
4. **债务模块 (debts)** - 借入借出、还款计划
5. **资产分类 (classes)** - 六大类资产配置管理
6. **统计分析 (analysis)** - 多维度数据分析图表
7. **辅助工具 (tools)** - 溢价查询、港股打新、外部工具集
8. **业务设计 (strategies)** - 投资策略方案对比
9. **账户管理 (accounts)** - 多账户、多币种设置
10. **产品下载页 (downloads)** - 各平台安装包下载

### 文件位置

- 主入口：[index.html](file:///f:/code_x/assert/assert_WEB/index.html)
- 核心逻辑：[app.js](file:///f:/code_x/assert/assert_WEB/app.js)
- 样式：[styles.css](file:///f:/code_x/assert/assert_WEB/styles.css)
- 管理页：[admin.html](file:///f:/code_x/assert/assert_WEB/admin.html)

### 核心状态管理

前端使用全局变量管理应用状态，主要状态变量包括：

| 变量 | 初始值 | 说明 |
|------|--------|------|
| `state` | seed数据/ localStorage | 用户完整状态对象 |
| `auth` | localStorage | 认证信息（token、账号） |
| `currentModule` | `"overview"` | 当前激活模块 |
| `currentToolPanel` | `"root"` | 工具面板层级 |
| `ledgerPeriod*` | 当月 | 账本筛选周期 |
| `financeStockFilters` | {...} | 证券持仓筛选条件 |
| `premium*` | {...} | 溢价查询状态（筛选、分页、排序） |
| `hkIpo*` | {...} | 港股打新状态（数据、筛选、规则编辑） |
| `realtimeQuoteMap` | {} | 代码→实时行情缓存 |

### 前端模块导航配置

在 [app.js:1-12](file:///f:/code_x/assert/assert_WEB/app.js#L1-L12) 中定义了所有模块：

```javascript
const modules = [
  ["overview", "资产总览", "..."],
  ["records", "收支分析", "..."],
  ["finance", "理财模块", "..."],
  ["debts", "债务模块", "..."],
  ["classes", "资产分类", "..."],
  ["analysis", "统计分析", "..."],
  ["tools", "辅助工具", "..."],
  ["strategies", "业务设计", "..."],
  ["accounts", "账户管理", "..."],
  ["downloads", "产品下载页", "..."],
];
```

### 辅助工具集 (auxiliaryTools)

在 [app.js:14-104](file:///f:/code_x/assert/assert_WEB/app.js#L14-L104) 中定义了辅助工具：

| 工具ID | 类型 | 说明 |
|--------|------|------|
| premium | internal | ETF/LOF溢价查询（内置） |
| hk-ipo | internal | 港股打新分析（内置） |
| serenity | external | 白毛股神追踪（AIChainMap） |
| atlas | external | 产业链图谱（AIChainMap） |
| reports | external | AI深度报告解析（AIChainMap） |
| buffett | external | 巴菲特知识库（learnbuffett.com） |
| munger | external | 芒格思维模型（mungermodels.com） |
| ark-tracker | external | 木头姐ARK追踪（arktracker.com） |
| btc-indicator | external | BTC逃顶指标（CoinGlass） |
| housing-trend | external | 房产趋势追踪 |

### API 基础路径

```javascript
const API_BASE = ["127.0.0.1", "localhost"].includes(window.location.hostname)
  ? "http://127.0.0.1:3000/api"
  : "/api";
```

本地开发时连接 `http://127.0.0.1:3000/api`，生产环境使用相对路径 `/api`。

### 本地存储

前端使用 localStorage 持久化数据：

| Key | 说明 |
|-----|------|
| `asset-platform-v18` | 用户完整状态数据（离线可用） |
| `asset-platform-token` | 认证Token |
| `asset-platform-account` | 用户账号 |
| `asset-platform-auth-v1` | 认证信息v1 |

### 默认演示数据

新用户未登录时，前端提供完整的演示数据（seed），包含示例账户、资产分类、收支记录、理财持仓、债务、预算、提醒、策略方案等，便于用户直观了解产品功能。

---

## PC客户端 (assert_PC)

### 模块概述

PC 客户端是基于 Electron 的 Windows 桌面应用，采用极简架构：直接加载线上/指定URL的 Wealth OS 应用，提供原生窗口体验。

### 文件位置

- 主进程：[main.js](file:///f:/code_x/assert/assert_PC/main.js)
- 预加载：[preload.js](file:///f:/code_x/assert/assert_PC/preload.js)
- 配置：[package.json](file:///f:/code_x/assert/assert_PC/package.json)

### 主进程逻辑 (main.js)

| 配置项 | 值 | 说明 |
|--------|-----|------|
| APP_URL | `process.env.ASSERT_APP_URL \|\| "http://119.28.189.98/"` | 默认加载线上地址 |
| APP_TITLE | `"Wealth OS - 个人资产管理"` | 窗口标题 |
| 默认窗口大小 | 1440×920（最小1160×760） | 窗口尺寸 |
| backgroundColor | `#f4f7ff` | 窗口背景色 |

**关键功能**：
1. **窗口创建**：[createWindow()](file:///f:/code_x/assert/assert_PC/main.js#L84-L117) - 创建BrowserWindow，配置preload脚本
2. **外部链接处理**：所有非APP_URL的链接使用系统默认浏览器打开（shell.openExternal）
3. **导航拦截**：防止导航离开主应用域名
4. **错误页面**：加载失败时显示友好的错误页面（重新加载/在浏览器中打开）
5. **菜单隐藏**：设置 autoHideMenuBar + Menu.setApplicationMenu(null)
6. **macOS兼容**：窗口全部关闭时不退出（activate事件重建窗口）

### 预加载脚本 (preload.js)

使用 contextBridge 向渲染进程暴露安全API：

```javascript
contextBridge.exposeInMainWorld("assertDesktop", {
  version: "2.0.0"
});
```

开启了安全配置：
- `contextIsolation: true` - 上下文隔离
- `nodeIntegration: false` - 禁用Node.js集成

### 打包配置

在 [package.json](file:///f:/code_x/assert/assert_PC/package.json#L15-L40) 中配置 electron-builder：

| 目标格式 | 说明 |
|---------|------|
| portable | 便携版（单exe） |
| nsis | 安装版（可选择安装目录） |

输出文件名格式：
- 便携版：`Assert PC_2.0.0_portable.exe`
- 安装版：`Assert_PC_2.0.0_installer.exe`

**构建命令**：
```bash
npm run build:portable   # 仅构建便携版
npm run build            # 构建便携版+安装版
npm run build:folder     # 构建文件夹（未打包）
npm run build:zip        # 打包为zip
```

---

## 移动端客户端

### Android 客户端 (assert_ANDROID)

基于 **Capacitor** 框架构建的 Android 原生壳应用。

- 配置文件：[capacitor.config.json](file:///f:/code_x/assert/assert_ANDROID/capacitor.config.json)
- 原生工程：[android/](file:///f:/code_x/assert/assert_ANDROID/android/) 目录
- App ID：`com.getcapacitor.myapp`（待自定义）
- 资源：包含启动页（splash.png）各分辨率图标
- Web资源入口：[www/index.html](file:///f:/code_x/assert/assert_ANDROID/www/index.html)

### iOS 客户端 (assert_IOS)

目前为骨架阶段，包含 [package.json](file:///f:/code_x/assert/assert_IOS/package.json) 配置。

### HarmonyOS 客户端 (assert_HARMONY)

目前为骨架阶段，包含 [package.json](file:///f:/code_x/assert/assert_HARMONY/package.json) 配置。

---

## 数据模型设计

数据库使用 **MySQL 8.x+**，所有表均以 `user_id` 作为外键关联到 `users` 表实现数据隔离。完整Schema见 [schema.sql](file:///f:/code_x/assert/assert_PLATFORM/server/schema.sql)。

### ER图概览

```
users ──┬── user_profiles (1:1)
        ├── sessions (1:N)
        ├── exchange_rates (1:N)
        ├── accounts (1:N)
        ├── asset_classes (1:N)
        ├── records (1:N)
        ├── budgets (1:N)
        ├── finance_assets (1:N) ── finance_asset_transactions (1:N)
        ├── debts (1:N) ── debt_payments (1:N)
        ├── strategies (1:N)
        ├── user_settings (1:1)
        ├── custom_record_categories (1:N)
        ├── finance_tertiary_categories (1:N)
        ├── record_tags (1:N)
        ├── recorders (1:N)
        ├── reminders (1:N)
        ├── feedback (1:N)
        ├── devices (1:N)
        ├── attachments (1:N)
        └── sync_change_log (1:N)

admin_users ── admin_sessions (1:N)
release_packages (全局)
sms_verification_codes (全局，按phone索引)
```

### 核心表说明

#### 用户与认证

| 表名 | 主键 | 核心字段 | 说明 |
|------|------|---------|------|
| `users` | id (AUTO_INCREMENT) | account(UNIQUE), password_hash | 用户账号表 |
| `sessions` | token_hash (SHA256) | user_id, expires_at | 用户登录会话 |
| `admin_users` | id | username(UNIQUE), password_hash | 管理员账号 |
| `admin_sessions` | token_hash | admin_id, expires_at | 管理员会话 |
| `sms_verification_codes` | id | phone, purpose, code_hash(SHA256), expires_at, used_at | 短信验证码 |

#### 用户资料与设置

| 表名 | 主键 | 核心字段 | 说明 |
|------|------|---------|------|
| `user_profiles` | user_id | name, phone, email, currency, theme, avatar, risk_level, privacy_lock, data_mask | 用户个人资料 |
| `user_settings` | user_id | finance_asset_draft_json(JSON), fee_config_json(JSON), overview_goals_json(JSON), hk_ipo_rules_json(JSON) | 用户设置与草稿 |
| `exchange_rates` | (user_id, currency) | rate | 用户自定义汇率 |

#### 账户与资产

| 表名 | 主键 | 核心字段 | 说明 |
|------|------|---------|------|
| `accounts` | (user_id, id) | name, owner, currency, type, balance, liability, enabled, is_default | 资金账户 |
| `asset_classes` | (user_id, id) | name, children_json(JSON), visible, value, opening_value, target_value, color, expected_return | 资产大类配置 |

#### 收支记录

| 表名 | 主键 | 核心字段 | 说明 |
|------|------|---------|------|
| `records` | (user_id, id) | type(income/expense/transfer), category, subcategory, tag, amount, currency, account_id, record_date, note | 收支流水记录 |
| `budgets` | (user_id, id) | name, category, amount, used | 预算 |
| `custom_record_categories` | (user_id, record_type, name) | sort_order | 自定义收支分类 |
| `record_tags` | (user_id, category, tag) | is_last | 记录标签 |
| `recorders` | (user_id, name) | sort_order | 记账人 |
| `reminders` | (user_id, id) | reminder_date, title, type | 提醒事项 |

#### 理财资产

| 表名 | 主键 | 核心字段 | 说明 |
|------|------|---------|------|
| `finance_assets` | (user_id, id) | kind(stock/fund/futures/crypto/custom), account_id, category, market, currency, name, code, cost_price, shares, available_shares, current_price, pnl, today_pnl, avg_buy_price, holding_days, position_weight | 理财持仓 |
| `finance_asset_transactions` | (user_id, asset_id, id) | direction(buy/sell), transaction_date, shares, price, amount, commission, stamp_duty, transfer_fee | 交易记录 |
| `finance_tertiary_categories` | (user_id, scope, name) | sort_order | 自定义三级分类 |

#### 债务管理

| 表名 | 主键 | 核心字段 | 说明 |
|------|------|---------|------|
| `debts` | (user_id, id) | category(payable/receivable), type(借入/借出), name, creditor_name, debtor_name, principal, annual_rate, amount, paid_amount, start_date, due_date, repayment_method | 债务记录 |
| `debt_payments` | (user_id, debt_id, period) | status | 还款分期记录 |

#### 投资策略

| 表名 | 主键 | 核心字段 | 说明 |
|------|------|---------|------|
| `strategies` | (user_id, id) | name, active, target, allocation_json(JSON), debt_limit, annual_return, risk | 投资策略方案 |

#### 反馈与附件

| 表名 | 主键 | 核心字段 | 说明 |
|------|------|---------|------|
| `feedback` | id (AUTO_INCREMENT) | user_id, type, title, content, attachments_json(JSON), status(pending/replied/resolved), admin_reply, replied_at | 用户反馈 |
| `attachments` | id (BIGINT AUTO) | user_id, owner_type, owner_id, file_name, mime_type, file_size, storage_path, sha256 | 文件附件 |

#### 多端同步

| 表名 | 主键 | 核心字段 | 说明 |
|------|------|---------|------|
| `devices` | (user_id, device_id) | name, platform, app_version, last_seen_at | 注册设备 |
| `sync_change_log` | id (BIGINT AUTO) | user_id, device_id, entity_type, entity_id, operation_type(upsert/delete), payload_json(JSON), client_version | 数据变更日志（增量同步） |

#### 发布管理

| 表名 | 主键 | 核心字段 | 说明 |
|------|------|---------|------|
| `release_packages` | id (BIGINT AUTO) | platform(web/pc/android/ios/harmony), version, build_number, file_name, file_url, file_size, published_at, release_notes, is_latest, sha256, distribution | 安装包发布记录 |

> **注意**：实际发布清单当前使用文件系统（`releases/<platform>/manifest.json`）存储，数据库表 `release_packages` 为预留。

---

## API接口文档

后端API统一前缀 `/api`，所有需要认证的接口需在Header中携带：

```
Authorization: Bearer <token>
```

### 响应格式

**成功响应**：
```json
{
  // 具体业务字段
}
```

**错误响应**：
```json
{
  "message": "错误描述信息"
}
```

### 接口列表

#### 公共接口（无需认证）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/tools/premium?refresh=0/1` | ETF/LOF溢价行情数据 |
| GET | `/api/v2/releases` | 获取所有平台发布清单 |
| GET | `/api/v2/releases/:platform` | 获取指定平台发布清单 |
| GET | `/api/v2/releases/file/:platform/:fileName` | 下载安装包文件 |
| POST | `/api/auth/sms/send` | 发送短信验证码 |
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 账号密码登录 |
| POST | `/api/auth/phone-login` | 手机号验证码登录 |
| POST | `/api/auth/reset-password` | 重置密码 |
| POST | `/api/admin/login` | 管理员登录 |

#### 用户认证接口（需要用户Token）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/auth/me` | 获取当前用户信息 |
| POST | `/api/auth/logout` | 退出登录 |
| GET | `/api/v2/bootstrap` | 应用启动数据（用户信息+完整状态+能力） |
| POST | `/api/v2/devices/register` | 注册/更新设备信息 |
| GET | `/api/state` | 获取用户完整状态 |
| PUT | `/api/state` | 保存用户完整状态 |

#### 多端同步接口（需要用户Token）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v2/sync/push` | 推送本地变更到服务器 |
| GET | `/api/v2/sync/pull?sinceVersion=0` | 拉取服务器增量变更 |

#### 理财工具接口（需要用户Token）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/finance/lookup?q=关键词` | 证券代码搜索 |
| POST | `/api/finance/quotes` | 批量获取实时行情（body: { codes: [{code, market}] }） |
| GET | `/api/finance/kline?code=&market=&start=&end=&count=320` | 获取K线数据 |

#### 港股打新接口（需要用户Token）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tools/hk-ipo?status=&query=&startDate=&endDate=&refresh=0/1` | 获取港股打新分析数据 |
| GET | `/api/tools/hk-ipo/rules` | 获取用户自定义评分规则 |
| PUT | `/api/tools/hk-ipo/rules` | 保存用户评分规则 |
| GET | `/api/tools/hk-ipo/export` | 导出港股打新分析为Excel |

#### 反馈接口（需要用户Token）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/feedback` | 提交反馈（支持图片附件） |
| GET | `/api/feedback` | 获取用户反馈历史 |

#### 管理员接口（需要管理员Token）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/logout` | 管理员退出 |
| GET | `/api/admin/dashboard` | 仪表盘统计（用户数、今日新增、待处理反馈） |
| GET | `/api/admin/users` | 用户列表 |
| GET | `/api/admin/feedback` | 所有用户反馈列表 |
| PUT | `/api/admin/feedback/:id` | 回复/处理反馈 |

---

## 发布与部署

### 发布清单格式（manifest.json）

每个平台的发布目录下包含 `manifest.json`，其Schema定义在 [release-manifest.schema.json](file:///f:/code_x/assert/packages/release-manifest.schema.json)：

```json
{
  "platform": "pc",
  "updatedAt": "2026-06-17T10:30:00.000Z",
  "latest": {
    "platform": "pc",
    "version": "2.1.0",
    "buildNumber": "20260617.1",
    "fileName": "Assert_PC_2.1.0_portable.exe",
    "fileUrl": "/api/v2/releases/file/pc/Assert_PC_2.1.0_portable.exe",
    "fileSize": 123456789,
    "publishedAt": "2026-06-17T10:30:00.000Z",
    "releaseNotes": "修复同步与下载页",
    "isLatest": true,
    "minSystemVersion": "",
    "sha256": "abcdef123456...",
    "distribution": "direct"
  },
  "history": [ ... 历史版本列表 ... ]
}
```

### 发布脚本使用

使用 [publish-release.mjs](file:///f:/code_x/assert/scripts/publish-release.mjs) 发布新安装包：

```powershell
npm run release:publish -- --platform=pc --file=F:\builds\Assert_PC_Setup.exe --version=2.1.0 --build=20260617.1 --notes="修复同步与下载页"
```

**参数说明**：

| 参数 | 必填 | 说明 |
|------|------|------|
| `--platform` | 是 | 平台类型：web/pc/android/ios/harmony |
| `--file` | 是 | 安装包文件本地路径 |
| `--version` | 是 | 版本号（如 2.1.0） |
| `--build` | 否 | 构建号（如 20260617.1） |
| `--notes` | 否 | 发布说明 |
| `--minSystemVersion` | 否 | 最低系统版本要求 |
| `--distribution` | 否 | 分发渠道，默认 "direct" |

**发布流程**：
1. 将文件复制到 `assert_PLATFORM/releases/<platform>/packages/`
2. 计算 SHA256 哈希和文件大小
3. 更新 `manifest.json`，将新版本设为最新（isLatest=true）
4. 旧版本的 isLatest 自动设为 false

### GitHub 推送脚本

| 脚本 | 用途 |
|------|------|
| [setup-github-push.mjs](file:///f:/code_x/assert/scripts/setup-github-push.mjs) | 配置SSH密钥（~/.ssh/codex_github_assert）和SSH config，使用443端口绕过防火墙 |
| [push-github.mjs](file:///f:/code_x/assert/scripts/push-github.mjs) | 自动add、commit（需提供提交信息）、push到origin当前分支 |

**使用方式**：

```powershell
npm run push:setup                    # 首次配置
npm run push:github -- "提交说明"     # 日常推送
```

---

## 本地开发指南

### 环境要求

- **Node.js**: >= 22.5.0
- **MySQL**: >= 8.0
- **Git**

### 快速启动

1. **安装依赖**（首次）：

```powershell
npm run platform:install    # 安装后端依赖
npm run web:install         # 如需要（当前web无依赖）
```

2. **配置环境变量**：

在仓库根目录创建 `.env` 文件：

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=你的密码
MYSQL_DATABASE=asset_platform
API_PORT=3000
ADMIN_PASSWORD=你的管理员密码
```

3. **启动服务**（两个终端）：

```powershell
# 终端1：启动后端API（端口3000）
npm run api

# 终端2：启动Web静态服务器（端口4173）
npm run web
```

4. **访问应用**：

- Web应用：http://127.0.0.1:4173
- API健康检查：http://127.0.0.1:3000/api/health

### 默认账号

首次启动后端时，会自动创建默认管理员账号：
- 账号：`admin`
- 密码：`admin123`（或通过 `ADMIN_PASSWORD` 环境变量设置）

### PC客户端开发

```powershell
cd assert_PC
npm install
npm start    # 启动Electron开发模式
```

如需连接本地开发服务器，设置环境变量：

```powershell
$env:ASSERT_APP_URL="http://127.0.0.1:4173/"
npm start
```

### 开发模式说明

- 短信验证码在开发模式下不会真实发送，会在后端控制台打印，也会在API响应的 `debugCode` 字段返回
- Web前端默认会清除旧的认证信息，需要重新登录
- 未登录状态下可以使用内置的演示数据（seed）浏览功能

---

## 数据库迁移

### SQLite → MySQL 迁移

项目提供了从SQLite到MySQL的迁移工具：[migrate_to_mysql.cjs](file:///f:/code_x/assert/migrate_to_mysql.cjs)

**使用方式**：

```bash
# 确保SQLite数据库文件存在于 assert_PLATFORM/server/data/asset-platform.sqlite
node migrate_to_mysql.cjs
```

**迁移流程**：
1. 创建MySQL数据库 `asset_platform`（如存在则删除重建）
2. 执行 `schema.sql` 创建所有表
3. 从SQLite读取所有表数据
4. 按依赖顺序插入数据到MySQL
5. 自动处理：bigint→Number转换、ISO时间戳→MySQL DATETIME格式、空字符串→NULL

**迁移表顺序**（按外键依赖）：
```
users → user_profiles → sessions → sms_verification_codes →
exchange_rates → accounts → asset_classes → records → budgets →
finance_assets → custom_record_categories → finance_tertiary_categories →
record_tags → recorders → reminders → debts → debt_payments →
strategies → user_settings
```

### 自动Schema迁移

后端启动时会自动检查并添加新增字段（幂等操作）：
- `user_settings` 表：自动添加 `fee_config_json`, `overview_goals_json`, `hk_ipo_rules_json`, `attachments_json`
- `finance_assets` 表：自动添加持仓相关字段（available_shares, current_price, pnl_percent等9个字段）
- 同步相关表：自动添加 `sync_version`, `deleted_at`, `origin_device_id`, `client_op_id` 字段

---

## 其他页面

### 黄仁勋知识库 (kb-jensen-huang)

独立的静态HTML页面，包含黄仁勋（Jensen Huang）相关知识库内容，位于 [kb-jensen-huang/](file:///f:/code_x/assert/kb-jensen-huang/) 目录。

---

## 关键设计决策

1. **无框架后端**：使用Node.js原生http模块而非Express，减少依赖、提升性能、简化部署
2. **无框架前端**：使用Vanilla JS而非React/Vue，降低复杂度、减小打包体积、提升加载速度
3. **单文件后端**：所有后端逻辑在单个server.js中，降低模块间通信成本，便于整体理解
4. **MySQL连接池**：使用mysql2的Promise API和连接池，支持高并发
5. **密码安全**：使用scrypt算法+随机salt，timingSafeEqual防时序攻击
6. **Token认证**：随机32字节Token → SHA256哈希存储，数据库不存明文Token
7. **离线优先**：前端数据存储在localStorage，后端作为同步和备份
8. **增量同步**：基于sync_change_log的变更日志，支持多端数据同步
9. **CORS白名单**：严格控制允许的跨域来源
10. **SPA回退**：静态文件服务支持前端路由，未找到的路径回退到index.html
11. **行情容错**：多数据源轮询（腾讯财经→东方财富→新浪财经），best-effort策略不阻塞主流程
12. **港股分析数据驱动**：港股IPO数据从外部JS文件提取常量数组，支持热更新

---

## 文档维护说明

本文档基于代码静态分析生成，对应版本 **v2.0.0**。如代码有重大变更，请同步更新本文档。

**文档生成时间**：2026-06-25
