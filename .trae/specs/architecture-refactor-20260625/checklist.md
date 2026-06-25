# Wealth OS 架构优化重构 - Verification Checklist

## 工程化配置
- [ ] .env.example 文件存在，包含所有可配置项及注释说明
- [ ] ESLint 配置文件存在，代码风格规则明确
- [ ] Prettier 配置文件存在，格式化规则统一
- [ ] package.json 更新了 lint 和 format 脚本
- [ ] docker-compose.yml 配置正确，包含 mysql、api、web 三个服务
- [ ] .gitignore 正确忽略 node_modules、.env、日志、临时文件等

## 后端模块结构
- [ ] assert_PLATFORM/server/ 目录下存在以下子目录：config、db、auth、middleware、routes、services、utils
- [ ] config/index.js 统一管理所有配置，从环境变量读取，提供默认值
- [ ] db/index.js 封装连接池创建和Schema初始化
- [ ] utils/ 目录下有 http.js、crypto.js、date.js、validators.js、release.js 等工具模块
- [ ] auth/ 目录下有 password.js、token.js、sms.js 等认证模块
- [ ] middleware/ 目录下有 cors.js、auth.js、error.js 中间件
- [ ] routes/ 目录下按领域拆分了所有路由模块（health、auth、admin、bootstrap、state、finance、tools、releases、feedback）
- [ ] services/ 目录下有 user-service、state-service、device-service、sync-service、feedback-service、finance-service、premium-service、hkipo-service
- [ ] 没有单个后端源文件超过500行
- [ ] 模块之间没有循环依赖

## 后端功能兼容
- [ ] npm run api 可正常启动服务，监听3000端口
- [ ] GET /api/health 返回 200 OK
- [ ] 静态文件服务正常工作：GET / 返回 index.html
- [ ] POST /api/auth/register 可以注册新用户
- [ ] POST /api/auth/login 可以登录获取token
- [ ] POST /api/auth/sms/send 可以发送验证码（开发模式在响应中返回debugCode）
- [ ] POST /api/auth/phone-login 可以手机验证码登录
- [ ] POST /api/auth/reset-password 可以重置密码
- [ ] GET /api/auth/me 带token返回当前用户信息
- [ ] POST /api/auth/logout 可以退出登录
- [ ] GET /api/v2/bootstrap 返回完整启动数据
- [ ] POST /api/v2/devices/register 可以注册设备
- [ ] GET /api/state 可以获取用户完整状态
- [ ] PUT /api/state 可以保存用户状态
- [ ] POST /api/v2/sync/push 可以推送变更
- [ ] GET /api/v2/sync/pull 可以拉取变更
- [ ] GET /api/finance/lookup 可以搜索证券代码
- [ ] POST /api/finance/quotes 可以获取实时行情
- [ ] GET /api/finance/kline 可以获取K线数据
- [ ] GET /api/tools/premium 返回溢价行情数据
- [ ] GET /api/tools/hk-ipo 返回港股打新数据
- [ ] PUT /api/tools/hk-ipo/rules 可以保存评分规则
- [ ] GET /api/tools/hk-ipo/export 返回Excel文件
- [ ] POST /api/feedback 可以提交反馈
- [ ] GET /api/feedback 可以查看反馈历史
- [ ] POST /api/admin/login 管理员可以登录
- [ ] GET /api/admin/dashboard 返回仪表盘统计
- [ ] GET /api/admin/users 返回用户列表
- [ ] GET /api/admin/feedback 返回所有反馈
- [ ] PUT /api/admin/feedback/:id 可以回复反馈
- [ ] GET /api/v2/releases 返回发布清单
- [ ] GET /api/v2/releases/:platform 返回单平台清单
- [ ] GET /api/v2/releases/file/:platform/:fileName 可以下载安装包

## 前端模块结构
- [ ] assert_WEB/js/ 目录下有 config.js、state.js、api.js
- [ ] assert_WEB/js/utils/ 目录下有 dom.js、format.js、storage.js、icons.js 等工具
- [ ] assert_WEB/js/components/ 目录下有 dialog、toast、tabs、table、charts、forms、filters、sidebar 等可复用组件
- [ ] assert_WEB/js/modules/ 目录下按功能拆分了所有模块：overview、records、finance、debts、classes、analysis、strategies、accounts、downloads、auth、user
- [ ] assert_WEB/js/modules/tools/ 目录下有 premium.js 和 hkipo.js
- [ ] index.html 使用 <script type="module"> 引入入口
- [ ] 没有单个前端源文件超过500行
- [ ] 模块之间没有循环依赖

## 前端功能验证
- [ ] npm run web 可正常启动静态服务，监听4173端口
- [ ] 访问 http://127.0.0.1:4173 页面正常加载，无控制台错误
- [ ] 演示数据（seed）正常显示
- [ ] 侧边栏导航可以切换所有10个模块
- [ ] 资产总览页面正常显示净资产、配置图表
- [ ] 收支分析页面正常显示记录列表
- [ ] 可以打开添加记录弹窗
- [ ] 理财模块正常显示持仓列表
- [ ] 债务模块正常显示债务列表
- [ ] 资产分类页面正常显示分类配置
- [ ] 统计分析页面正常显示图表
- [ ] 辅助工具页面可以切换溢价查询、港股打新等工具
- [ ] 溢价查询工具正常加载数据
- [ ] 港股打新工具正常加载数据
- [ ] 业务设计页面正常显示策略列表
- [ ] 账户管理页面正常显示账户列表
- [ ] 产品下载页正常显示各平台下载
- [ ] 用户可以注册/登录
- [ ] 登录后数据正常同步

## 文档
- [ ] README.md 更新了新的目录结构说明
- [ ] README.md 更新了本地开发启动说明
- [ ] CODE_WIKI.md 更新了新的架构说明
- [ ] 代码中关键函数有必要的注释说明职责

## 代码质量
- [ ] 运行 ESLint 没有错误（可接受警告）
- [ ] 模块职责单一，命名清晰
- [ ] 没有硬编码的配置（都通过config模块）
- [ ] 错误处理统一，API错误有适当的响应
- [ ] 代码风格一致（缩进、引号、分号等）
