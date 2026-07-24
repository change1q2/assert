# 邮箱注册与管理后台功能 - 实现计划

## [x] Task 1: 后端新增邮箱验证码与邮箱注册接口
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 `assert_PLATFORM/server/auth/sms.js` 旁新增 `email.js`，实现基于邮箱的验证码生成、校验和"发送"（开发模式返回调试码）
  - 在 `assert_PLATFORM/server/routes/auth.js` 中新增 `/api/auth/email-code/send` 和 `/api/auth/register-by-email` 接口
  - 复用 `sms_verification_codes` 表存储邮箱验证码（phone 字段存储邮箱地址）
  - 在 `assert_PLATFORM/server/services/user-service.js` 中新增 `userByEmail` 和基于邮箱的注册辅助函数
- **Acceptance Criteria Addressed**: AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-1.1: POST `/api/auth/email-code/send` 传入有效邮箱返回 `{ ok: true, debugCode: string }`
  - `programmatic` TR-1.2: POST `/api/auth/register-by-email` 传入邮箱、密码、正确验证码返回 201 和 token
  - `programmatic` TR-1.3: 同一邮箱重复注册返回 409
  - `programmatic` TR-1.4: 错误验证码返回 400
- **Notes**: 不接入真实 SMTP，返回调试码并在控制台打印模拟发送

## [x] Task 2: 前端创建邮箱注册页面
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 `assert_WEB/src/pages/Register.jsx` 创建邮箱注册页面
  - 包含邮箱输入、密码输入、确认密码输入、验证码输入、获取验证码按钮、注册按钮
  - 实现 60 秒验证码冷却倒计时
  - 注册成功后保存 token/state 并调用 `onLogin`
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-4
- **Test Requirements**:
  - `human-judgement` TR-2.1: 注册页面样式与登录页一致
  - `programmatic` TR-2.2: 点击"获取验证码"后按钮倒计时 60 秒
  - `programmatic` TR-2.3: 两次密码不一致时阻止提交并提示
  - `programmatic` TR-2.4: 注册成功后自动进入主应用

## [x] Task 3: 登录页新增注册和忘记密码入口
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - 修改 `assert_WEB/src/pages/Login.jsx`
  - 在登录按钮下方或表单底部添加"注册账号"和"忘记密码"链接/按钮
  - 点击"注册账号"调用 `onRegister` 切换到注册页
  - 点击"忘记密码"显示提示弹窗或进入占位页
- **Acceptance Criteria Addressed**: AC-1, AC-5
- **Test Requirements**:
  - `human-judgement` TR-3.1: 登录页显示"注册账号"和"忘记密码"
  - `human-judgement` TR-3.2: 点击"注册账号"进入注册页面
  - `human-judgement` TR-3.3: 点击"忘记密码"显示提示

## [x] Task 4: App.jsx 集成注册、忘记密码和管理后台路由
- **Priority**: high
- **Depends On**: Task 2, Task 3
- **Description**:
  - 在 `assert_WEB/src/App.jsx` 中导入 `Register.jsx`
  - 添加 `currentPage` 状态值 `register`、`forgot-password`、`admin-login`、`admin`
  - 根据登录状态和页面状态渲染对应组件
  - 为超管用户在个人中心或应用头部添加"管理后台"入口
- **Acceptance Criteria Addressed**: AC-2, AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-4.1: `currentPage === 'register'` 时渲染 Register 组件
  - `programmatic` TR-4.2: 超管用户登录后 `state.user` 中或登录响应 `isAdmin` 为 true
  - `human-judgement` TR-4.3: 超管用户看到"管理后台"入口

## [x] Task 5: 前端创建管理员登录与后台页面
- **Priority**: high
- **Depends On**: Task 4
- **Description**:
  - 创建 `assert_WEB/src/pages/AdminLogin.jsx`：超管账号密码登录表单
  - 创建 `assert_WEB/src/pages/AdminDashboard.jsx`：展示统计卡片和用户列表
  - 使用 `localStorage` 存储 admin token
  - 页面跳转时校验 admin token，未登录则显示登录页
- **Acceptance Criteria Addressed**: AC-7, AC-8, AC-9
- **Test Requirements**:
  - `programmatic` TR-5.1: POST `/api/admin/login` 成功后保存 admin token
  - `programmatic` TR-5.2: GET `/api/admin/dashboard` 返回总用户数和今日新增
  - `programmatic` TR-5.3: GET `/api/admin/users` 返回用户列表
  - `human-judgement` TR-5.4: 管理后台页面布局清晰，统计卡片和用户列表正常显示

## [x] Task 6: 构建验证与端到端功能测试
- **Priority**: high
- **Depends On**: Task 1-5
- **Description**:
  - 运行 `npm run build` 确保前后端构建通过
  - 启动后端和前端服务，验证邮箱注册、管理员登录、用户列表展示流程
- **Acceptance Criteria Addressed**: AC-1 至 AC-9
- **Test Requirements**:
  - `programmatic` TR-6.1: `npm run build` 退出码为 0
  - `human-judgement` TR-6.2: 浏览器中完成注册流程并自动登录
  - `human-judgement` TR-6.3: 浏览器中使用 admin/admin123 登录管理后台并查看用户列表

# Task Dependencies
- Task 3 depends on Task 2
- Task 4 depends on Task 2, Task 3
- Task 5 depends on Task 4
- Task 6 depends on Task 1, Task 2, Task 3, Task 4, Task 5
