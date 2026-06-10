# 个人资产管理平台

项目已改为前后端分离架构：

- 前端：原生 HTML / CSS / JavaScript，本地开发运行在 `http://127.0.0.1:4173`
- 后端：Node.js HTTP API，本地运行在 `http://127.0.0.1:3000`
- 生产环境：Node.js 可在同一端口提供前端文件和 `/api`
- 数据库：SQLite，文件位于 `server/data/asset-platform.sqlite`
- SQLite 驱动：`better-sqlite3`
- 鉴权：随机会话令牌
- 密码：Node.js `scrypt` 加盐哈希，不保存明文密码

## 启动

分别打开两个终端：

```powershell
npm run api
```

```powershell
npm run web
```

生产服务器可只运行：

```powershell
$env:PORT=80
npm start
```

## API

- `POST /api/auth/register` 注册并登录
- `POST /api/auth/login` 登录
- `POST /api/auth/logout` 退出登录
- `GET /api/auth/me` 获取当前用户
- `GET /api/state` 加载当前用户全部平台数据
- `PUT /api/state` 事务保存当前用户全部平台数据
- `GET /api/health` 后端健康检查

除注册、登录和健康检查外，接口均要求：

```http
Authorization: Bearer <token>
```

## 数据表

数据库结构见 [`server/schema.sql`](server/schema.sql)，核心表包括：

- `users`：登录账号及密码哈希
- `sessions`：登录会话
- `user_profiles`：个人中心资料与偏好
- `exchange_rates`：用户汇率
- `accounts`：账户管理
- `asset_classes`：资产分类
- `records`：收支流水
- `budgets`：预算数据
- `finance_assets`：股票、基金、商品等理财资产
- `custom_record_categories`：自定义收支分类
- `finance_tertiary_categories`：理财三级分类
- `record_tags`：标签与分类默认标签
- `recorders`：记录人
- `reminders`：提醒
- `debts`：债务
- `debt_payments`：债务分期还款状态
- `strategies`：业务策略
- `user_settings`：其他用户设置

每张业务表都包含 `user_id`，所有查询和保存均按当前登录用户隔离。

## 数据迁移

升级前如果浏览器中存在 `asset-platform-v18` 本地数据，首次注册数据库账号时会自动将其迁移到该账号。迁移后，数据保存到数据库；不同账号之间不会共享业务数据。
