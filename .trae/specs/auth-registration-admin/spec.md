# 邮箱注册与管理后台功能 - Product Requirement Document

## Overview
- **Summary**: 在登录页新增注册和忘记密码入口，实现基于邮箱验证码的注册流程；同时创建管理员页面入口，提供超管账号登录和管理用户数据的能力。
- **Purpose**: 支持用户通过邮箱自助注册账号，并为超级管理员提供查看用户注册数据和统计信息的后台。
- **Target Users**: 新注册用户、超级管理员

## Goals
- 在登录页添加"注册"和"忘记密码"按钮/链接
- 实现邮箱注册页面：输入邮箱、密码、获取邮箱验证码、输入验证码后完成注册
- 后端新增邮箱验证码发送、校验和邮箱注册接口
- 创建管理员页面入口，使用超管账号登录
- 管理员页面展示用户总数、今日新增用户等统计数据
- 管理员页面展示注册用户列表（账号、昵称、手机号、邮箱、注册时间）

## Non-Goals (Out of Scope)
- 不实现真实邮件服务器发送（使用调试码或控制台输出模拟，便于开发测试）
- 不实现手机短信验证码注册
- 不实现普通用户的忘记密码重置功能页面（仅保留入口或简单跳转提示）
- 不实现管理员修改用户资料或删除用户

## Background & Context
- 系统当前已有账号密码登录、管理员登录接口、admin_users 表和 /api/admin/* 管理接口
- users 表和 user_profiles 表已存在，user-service.js 已有基于手机号的注册逻辑
- 前端 Login.jsx 使用账号密码登录，App.jsx 路由系统基于 currentPage state
- 当前已有管理员接口 `/api/admin/login`、`/api/admin/dashboard`、`/api/admin/users`

## Functional Requirements
- **FR-1**: 登录页在登录表单下方显示"注册账号"和"忘记密码"入口
- **FR-2**: 点击"注册账号"进入邮箱注册页面
- **FR-3**: 注册页面包含邮箱输入、密码输入、确认密码输入、验证码输入和"获取验证码"按钮
- **FR-4**: 用户输入邮箱后点击"获取验证码"，后端生成验证码并关联该邮箱（模拟发送，返回调试码）
- **FR-5**: 用户输入验证码、密码后点击注册，后端校验验证码并创建用户
- **FR-6**: 注册成功后自动登录并进入主应用
- **FR-7**: 点击"忘记密码"暂时显示提示"请联系管理员"或进入占位页面
- **FR-8**: 在主应用或个人中心提供"管理后台"入口（仅当登录用户为超管时显示）
- **FR-9**: 管理后台页面包含登录表单（超管账号/密码）
- **FR-10**: 超管登录成功后展示统计卡片：总用户数、今日新增用户数
- **FR-11**: 超管登录成功后展示用户列表：账号、昵称、手机号、邮箱、注册时间

## Non-Functional Requirements
- **NFR-1**: 注册页面风格与登录页保持一致
- **NFR-2**: 验证码 60 秒冷却时间，防止频繁请求
- **NFR-3**: 密码至少 6 位，邮箱需符合基本格式
- **NFR-4**: 管理员页面需要校验 admin token，未登录时重定向到管理员登录

## Constraints
- **Technical**: React + TailwindCSS + lucide-react；后端 Node.js + MySQL
- **Business**: 邮件发送不接入真实 SMTP，使用调试码返回
- **Dependencies**: 复用现有 admin_users 表、users 表、user_profiles 表

## Assumptions
- 超管账号已在系统启动时通过 `ensureDefaultAdmin()` 创建（账号 admin，密码 admin123）
- 邮箱验证码存储复用现有 sms_verification_codes 表，将 phone 字段用于存储邮箱地址
- 注册成功后使用 account 作为用户账号，账号可默认使用邮箱前缀或自定义

## Acceptance Criteria

### AC-1: 登录页注册入口
- **Given**: 用户未登录并访问登录页
- **When**: 查看登录表单下方
- **Then**: 看到"注册账号"和"忘记密码"入口
- **Verification**: `human-judgment`

### AC-2: 进入注册页面
- **Given**: 用户在登录页
- **When**: 点击"注册账号"
- **Then**: 页面切换到邮箱注册页面
- **Verification**: `human-judgment`

### AC-3: 邮箱验证码发送
- **Given**: 用户在注册页面输入有效邮箱
- **When**: 点击"获取验证码"
- **Then**: 按钮进入 60 秒倒计时，后端返回调试验证码（开发模式）
- **Verification**: `programmatic`

### AC-4: 邮箱注册成功
- **Given**: 用户输入有效邮箱、密码和正确验证码
- **When**: 点击"注册"
- **Then**: 账号创建成功并自动登录进入主应用
- **Verification**: `programmatic`

### AC-5: 忘记密码入口
- **Given**: 用户在登录页
- **When**: 点击"忘记密码"
- **Then**: 显示提示信息或进入忘记密码页面
- **Verification**: `human-judgment`

### AC-6: 管理后台入口
- **Given**: 超管账号已登录主应用
- **When**: 查看页面或个人中心
- **Then**: 看到"管理后台"入口
- **Verification**: `human-judgment`

### AC-7: 超管登录
- **Given**: 用户在管理后台登录页
- **When**: 输入正确的超管账号和密码
- **Then**: 登录成功并进入管理后台首页
- **Verification**: `programmatic`

### AC-8: 用户统计数据展示
- **Given**: 超管已登录管理后台
- **When**: 查看首页统计区域
- **Then**: 显示总用户数和今日新增用户数
- **Verification**: `programmatic`

### AC-9: 用户列表展示
- **Given**: 超管已登录管理后台
- **When**: 查看用户列表区域
- **Then**: 列表展示账号、昵称、手机号、邮箱、注册时间
- **Verification**: `programmatic`

## Open Questions
- [ ] 注册时账号是否允许用户自定义，还是默认使用邮箱前缀？
- [ ] 是否需要邮箱唯一性校验？
