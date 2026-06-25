# Wealth OS 架构优化重构 - Implementation Plan

## [x] Task 1: 工程化基础配置
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在根目录创建 `.env.example` 文件，列出所有环境变量及默认值
  - 添加 ESLint 配置文件（.eslintrc.json），适配Node.js后端和浏览器前端
  - 添加 Prettier 配置文件（.prettierrc）
  - 更新根package.json添加lint脚本
  - 创建 `.gitignore` 更新，忽略node_modules、.env、dist等
  - 创建 `docker-compose.yml` 包含MySQL、API、Web三个服务
- **Acceptance Criteria Addressed**: AC-6, AC-9, AC-10
- **Test Requirements**:
  - `programmatic` TR-1.1: 存在.env.example文件且包含所有必需的环境变量（MYSQL_*, API_PORT, SMS_*, ADMIN_PASSWORD等）
  - `programmatic` TR-1.2: 存在eslint配置，运行npx eslint无致命错误
  - `programmatic` TR-1.3: docker-compose.yml配置正确，包含mysql、api、web三个服务
  - `human-judgement` TR-1.4: 代码规范配置符合JavaScript标准风格（2空格缩进、单引号、分号等）
- **Notes**: 先不急于对整个代码库lint，配置文件先就位

---

## [x] Task 2: 后端基础模块拆分（配置、数据库、工具函数）
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 创建 `assert_PLATFORM/server/config/index.js` - 统一管理所有配置（端口、数据库连接参数、常量、白名单等），从process.env读取
  - 创建 `assert_PLATFORM/server/db/index.js` - MySQL连接池创建、Schema初始化、自动迁移逻辑封装
  - 创建 `assert_PLATFORM/server/utils/` 目录：
    - `http.js` - json()响应函数、readBody()、serveStatic()、mimeTypes
    - `crypto.js` - hashPassword()、verifyPassword()、issueToken()、验证码哈希
    - `date.js` - fmtDt()、日期解析格式化工具
    - `validators.js` - text()、number()、numericIfPossible()等类型转换
    - `release.js` - 发布清单相关函数（loadReleaseCatalog、readReleaseManifest等）
  - 修改server.js入口引入这些模块，验证基础功能正常
- **Acceptance Criteria Addressed**: AC-1, AC-4, AC-7
- **Test Requirements**:
  - `programmatic` TR-2.1: config模块正确读取环境变量，默认值合理
  - `programmatic` TR-2.2: db模块初始化连接池并执行schema.sql
  - `programmatic` TR-2.3: 启动后访问/api/health返回200 OK
  - `programmatic` TR-2.4: 所有新建utils模块文件存在且可被import
  - `programmatic` TR-2.5: 没有单个utils文件超过300行
- **Notes**: 先把工具函数和配置抽出来，不改变原有逻辑

---

## [x] Task 3: 后端认证模块拆分
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 创建 `assert_PLATFORM/server/auth/` 目录：
    - `index.js` - 导出认证相关函数
    - `password.js` - 密码哈希和验证（使用utils/crypto）
    - `token.js` - Token签发和验证（issueToken、authenticatedUser、authenticatedAdmin）
    - `sms.js` - 短信验证码创建、验证、发送（createSmsCode、verifySmsCode、deliverSmsCode）
  - 创建 `assert_PLATFORM/server/middleware/` 目录：
    - `cors.js` - CORS处理中间件
    - `auth.js` - 用户认证和管理员认证中间件封装
    - `error.js` - 统一错误处理
- **Acceptance Criteria Addressed**: AC-1, AC-3, AC-7
- **Test Requirements**:
  - `programmatic` TR-3.1: POST /api/auth/register 正常注册用户
  - `programmatic` TR-3.2: POST /api/auth/login 正常登录返回token
  - `programmatic` TR-3.3: POST /api/auth/sms/send 正常发送验证码（开发模式返回debugCode）
  - `programmatic` TR-3.4: 需要认证的接口未携带token返回401
  - `programmatic` TR-3.5: 管理员登录正常，管理员接口正常鉴权

---

## [x] Task 4: 后端数据访问层（State CRUD）
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 创建 `assert_PLATFORM/server/services/` 目录：
    - `user-service.js` - 用户资料管理、默认状态生成（defaultState、profileForUser、createUser、authPayload）
    - `state-service.js` - 用户状态加载和保存（loadUserState、saveUserState），处理所有表的CRUD和JSON序列化/反序列化
    - `device-service.js` - 设备注册
    - `sync-service.js` - 多端同步push/pull逻辑
    - `feedback-service.js` - 反馈提交和查询
  - 提取SQL辅助函数到 `utils/db.js`（sqlRun、sqlAll、sqlGet、maybeParseJson等）
- **Acceptance Criteria Addressed**: AC-1, AC-3, AC-4, AC-7
- **Test Requirements**:
  - `programmatic` TR-4.1: GET /api/v2/bootstrap 返回完整用户数据
  - `programmatic` TR-4.2: GET /api/state 返回用户状态
  - `programmatic` TR-4.3: PUT /api/state 保存状态成功，数据持久化到数据库
  - `programmatic` TR-4.4: POST /api/v2/devices/register 注册设备成功
  - `programmatic` TR-4.5: POST /api/v2/sync/push 和 GET /api/v2/sync/pull 正常工作

---

## [x] Task 5: 后端金融工具服务拆分
- **Priority**: medium
- **Depends On**: Task 4
- **Description**: 
  - 创建 `assert_PLATFORM/server/services/finance-service.js` - 证券代码搜索、实时行情、K线数据（聚合腾讯/东方财富/新浪）
  - 创建 `assert_PLATFORM/server/services/premium-service.js` - ETF/LOF溢价行情获取、缓存、后台刷新、数据标准化
  - 创建 `assert_PLATFORM/server/services/hkipo-service.js` - 港股打新数据加载、规则管理、评分计算、网络数据补充、Excel导出
  - 将相关的大量数据解析函数归类到对应service
- **Acceptance Criteria Addressed**: AC-1, AC-3, AC-7, AC-8
- **Test Requirements**:
  - `programmatic` TR-5.1: GET /api/tools/premium 返回溢价数据
  - `programmatic` TR-5.2: GET /api/finance/lookup?q=600036 返回证券搜索结果
  - `programmatic` TR-5.3: POST /api/finance/quotes 返回实时行情
  - `programmatic` TR-5.4: GET /api/finance/kline 返回K线数据
  - `programmatic` TR-5.5: GET /api/tools/hk-ipo 返回港股打新数据
  - `programmatic` TR-5.6: GET /api/tools/hk-ipo/export 返回Excel文件
  - `human-judgement` TR-5.7: hkipo-service.js文件过大时需要进一步拆分工具函数

---

## [x] Task 6: 后端路由层拆分和服务器入口精简
- **Priority**: high
- **Depends On**: Task 5
- **Description**: 
  - 创建 `assert_PLATFORM/server/routes/` 目录，按领域拆分为独立路由模块：
    - `health.js` - /api/health
    - `auth.js` - /api/auth/* 所有认证接口
    - `admin.js` - /api/admin/* 管理员接口
    - `bootstrap.js` - /api/v2/bootstrap, /api/v2/devices/*, /api/v2/sync/*
    - `state.js` - /api/state, /api/auth/me, /api/auth/logout
    - `finance.js` - /api/finance/*
    - `tools.js` - /api/tools/* (premium、hk-ipo)
    - `releases.js` - /api/v2/releases/*
    - `feedback.js` - /api/feedback
  - 重构 `server/index.js`（原server.js）：
    - 引入所有路由模块
    - 创建HTTP服务器
    - 请求分发到对应路由
    - 统一错误处理
    - 启动监听
  - 保持原server.js位置不变但内容精简为入口
- **Acceptance Criteria Addressed**: AC-1, AC-3, AC-4, AC-7, AC-8
- **Test Requirements**:
  - `programmatic` TR-6.1: 所有37个API接口路径和方法正常响应
  - `programmatic` TR-6.2: 静态文件服务正常工作（访问/返回index.html）
  - `programmatic` TR-6.3: server/index.js（入口）不超过300行
  - `programmatic` TR-6.4: 每个路由文件不超过300行
  - `programmatic` TR-6.5: 没有循环依赖
  - `human-judgement` TR-6.6: 路由结构清晰，每个路由文件职责单一

---

## [/] Task 7: 前端基础架构搭建（ES模块、状态、API层）
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 在 `assert_WEB/` 下创建 `js/` 目录结构：
    - `js/config.js` - 常量配置（API_BASE、模块列表、辅助工具列表、默认数据seed）
    - `js/state.js` - 全局状态管理（state变量、loadState、saveState、状态更新通知机制）
    - `js/api.js` - API请求封装（统一处理Authorization header、错误提示、JSON解析）
    - `js/utils/` 目录：
      - `dom.js` - DOM操作工具（创建元素、查询、事件委托等）
      - `format.js` - 格式化工具（金额、日期、百分比、货币换算）
      - `storage.js` - localStorage封装
      - `icons.js` - SVG图标字符串
  - 修改index.html中script标签为type="module"，引入js/app.js入口
  - 将seed演示数据从app.js移到config.js或单独的seed-data.js
- **Acceptance Criteria Addressed**: AC-2, AC-4, AC-5, AC-7
- **Test Requirements**:
  - `programmatic` TR-7.1: index.html使用<script type="module">
  - `programmatic` TR-7.2: js/目录结构创建完成
  - `programmatic` TR-7.3: 页面加载无JavaScript错误（演示模式）
  - `human-judgement` TR-7.4: 状态管理和API层封装合理

---

## [ ] Task 8: 前端通用UI组件和工具函数
- **Priority**: medium
- **Depends On**: Task 7
- **Description**: 
  - 创建 `assert_WEB/js/components/` 目录：
    - `dialog.js` - 通用弹窗（recordDialog、feedbackDialog等通用对话框逻辑）
    - `toast.js` - 消息提示
    - `tabs.js` - 标签页组件
    - `table.js` - 通用表格组件（支持排序、筛选、分页）
    - `charts.js` - 图表渲染封装
    - `forms.js` - 表单处理工具
    - `filters.js` - 全局四维筛选栏
    - `sidebar.js` - 侧边栏导航和底部导航
  - 从原app.js中提取可复用的UI逻辑
- **Acceptance Criteria Addressed**: AC-2, AC-7
- **Test Requirements**:
  - `programmatic` TR-8.1: components目录下的模块文件存在
  - `human-judgement` TR-8.2: 组件可复用，职责清晰
  - `programmatic` TR-8.3: 导航切换正常工作

---

## [ ] Task 9: 前端核心功能模块拆分
- **Priority**: high
- **Depends On**: Task 8
- **Description**: 
  - 创建 `assert_WEB/js/modules/` 目录，按模块拆分：
    - `overview.js` - 资产总览
    - `records.js` - 收支分析（记账、流水）
    - `finance.js` - 理财模块（持仓、行情、交易、OCR）
    - `debts.js` - 债务模块
    - `classes.js` - 资产分类配置
    - `analysis.js` - 统计分析
    - `tools/` 子目录：
      - `index.js` - 辅助工具首页
      - `premium.js` - 溢价查询工具
      - `hkipo.js` - 港股打新工具
    - `strategies.js` - 业务设计/投资策略
    - `accounts.js` - 账户管理
    - `downloads.js` - 产品下载页
    - `auth.js` - 登录/注册相关UI
    - `user.js` - 个人中心/设置
  - 每个模块导出init()和render()函数
  - 主入口app.js负责模块路由和初始化
- **Acceptance Criteria Addressed**: AC-2, AC-5, AC-7, AC-8
- **Test Requirements**:
  - `programmatic` TR-9.1: 所有模块文件存在
  - `human-judgement` TR-9.2: 点击侧边栏可切换各个模块
  - `human-judgement` TR-9.3: 各模块主要功能可操作（添加记录、查看持仓、切换工具等）
  - `programmatic` TR-9.4: 每个模块文件不超过500行（finance模块过大时可继续拆分）
  - `programmatic` TR-9.5: 无循环依赖

---

## [ ] Task 10: 整合测试与文档更新
- **Priority**: high
- **Depends On**: Task 6, Task 9
- **Description**: 
  - 完整端到端测试所有功能：
    - 用户注册/登录/登出
    - 账户CRUD
    - 资产分类配置
    - 添加收支记录
    - 理财持仓管理
    - 债务管理
    - 投资策略配置
    - 溢价查询工具
    - 港股打新工具
    - 反馈提交
    - 产品下载页
    - 管理员后台
  - 添加简单的冒烟测试脚本（可选，使用Node.js原生test模块）
  - 更新根目录README.md说明新的项目结构和开发方式
  - 更新CODE_WIKI.md反映新的架构
  - 运行ESLint修复可自动修复的问题
- **Acceptance Criteria Addressed**: AC-3, AC-4, AC-5, AC-6, AC-10
- **Test Requirements**:
  - `programmatic` TR-10.1: npm run api和npm run web均可无错启动
  - `programmatic` TR-10.2: 所有核心API返回200（除预期的4xx）
  - `human-judgement` TR-10.3: Web界面操作流畅无明显控制台错误
  - `human-judgement` TR-10.4: README文档清晰说明新目录结构
  - `programmatic` TR-10.5: 没有单个.js源文件超过500行
