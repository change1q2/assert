# 个人中心功能 - Product Requirement Document

## Overview
- **Summary**: 在系统右上角添加一个用户图标，点击后进入个人中心页面，显示用户基本信息和登录账号信息，支持头像上传、信息编辑、密码修改、多语言切换和主题切换
- **Purpose**: 提供用户查看和管理个人信息的入口，增强系统的用户体验和完整性
- **Target Users**: 系统所有登录用户

## Goals
- 在主应用右上角添加用户头像/图标按钮
- 创建个人中心页面，展示用户基本信息
- 展示登录账号信息（账号名、登录时间等）
- 支持用户头像自定义上传
- 支持个人信息编辑功能
- 支持密码修改功能
- 支持多语言切换功能（中文/英文）
- 支持主题切换功能（浅色/深色）
- 个人中心页面设计美观，与现有系统风格一致

## Non-Goals (Out of Scope)
- 不实现第三方登录（微信、支付宝等）
- 不实现用户注册功能
- 不实现短信验证码功能

## Background & Context
- 系统当前有登录页面，支持账号密码登录
- 登录成功后进入主应用，包含多个功能模块
- 用户信息存储在后端数据库的 user_profiles 表中
- 前端通过 localStorage 存储 token 和用户状态
- 系统已有深色/浅色主题切换功能（通过 CSS 类实现）

## Functional Requirements
- **FR-1**: 在主应用右上角添加一个圆形用户图标按钮
- **FR-2**: 点击用户图标后，进入个人中心页面
- **FR-3**: 个人中心页面显示用户头像（或首字母）
- **FR-4**: 个人中心页面显示用户基本信息（姓名、手机号、邮箱等）
- **FR-5**: 个人中心页面显示登录账号信息（账号名）
- **FR-6**: 个人中心页面显示系统版本号
- **FR-7**: 支持用户头像上传功能
- **FR-8**: 支持个人信息编辑功能（姓名、手机号、邮箱）
- **FR-9**: 支持密码修改功能（旧密码、新密码、确认密码）
- **FR-10**: 支持多语言切换功能（中文/英文）
- **FR-11**: 支持主题切换功能（浅色/深色）

## Non-Functional Requirements
- **NFR-1**: 图标按钮位置固定在页面右上角，不随滚动而消失
- **NFR-2**: 个人中心页面设计与现有系统风格一致
- **NFR-3**: 页面加载响应迅速，无明显卡顿
- **NFR-4**: 头像上传支持常见图片格式（JPG、PNG），大小限制在2MB以内

## Constraints
- **Technical**: React + TailwindCSS，使用 lucide-react 图标库
- **Business**: 与现有系统集成，不引入新的依赖
- **Dependencies**: 后端 user_profiles 表已有用户数据

## Assumptions
- 用户登录后，系统已获取用户基本信息
- 用户头像默认显示用户姓名首字母
- 系统版本号显示为 V1.0.1（与现有版本一致）
- 多语言只支持中文和英文两种

## Acceptance Criteria

### AC-1: 用户图标显示
- **Given**: 用户已登录系统
- **When**: 查看主应用页面
- **Then**: 在页面右上角看到一个圆形用户图标按钮
- **Verification**: `human-judgment`

### AC-2: 点击图标进入个人中心
- **Given**: 用户已登录系统
- **When**: 点击右上角用户图标
- **Then**: 页面切换到个人中心页面
- **Verification**: `human-judgment`

### AC-3: 用户头像显示
- **Given**: 用户进入个人中心页面
- **When**: 查看页面内容
- **Then**: 看到用户头像区域，显示用户姓名首字母或头像图片
- **Verification**: `human-judgment`

### AC-4: 基本信息展示
- **Given**: 用户进入个人中心页面
- **When**: 查看页面内容
- **Then**: 看到用户基本信息卡片，包含姓名、手机号、邮箱等字段
- **Verification**: `human-judgment`

### AC-5: 登录账号信息展示
- **Given**: 用户进入个人中心页面
- **When**: 查看页面内容
- **Then**: 看到登录账号信息，包含账号名
- **Verification**: `human-judgment`

### AC-6: 版本号显示
- **Given**: 用户进入个人中心页面
- **When**: 查看页面内容
- **Then**: 看到系统版本号（V1.0.1）
- **Verification**: `human-judgment`

### AC-7: 头像上传功能
- **Given**: 用户进入个人中心页面
- **When**: 点击头像上传区域，选择图片文件
- **Then**: 头像更新为上传的图片
- **Verification**: `human-judgment`

### AC-8: 个人信息编辑功能
- **Given**: 用户进入个人中心页面
- **When**: 点击编辑按钮，修改个人信息并保存
- **Then**: 个人信息更新成功
- **Verification**: `human-judgment`

### AC-9: 密码修改功能
- **Given**: 用户进入个人中心页面
- **When**: 输入旧密码、新密码和确认密码，点击保存
- **Then**: 密码修改成功（或显示错误提示）
- **Verification**: `human-judgment`

### AC-10: 多语言切换功能
- **Given**: 用户进入个人中心页面
- **When**: 选择英文语言选项
- **Then**: 系统界面切换为英文显示
- **Verification**: `human-judgment`

### AC-11: 主题切换功能
- **Given**: 用户进入个人中心页面
- **When**: 点击主题切换开关
- **Then**: 系统界面切换为深色/浅色主题
- **Verification**: `human-judgment`

## Open Questions
- [ ] 是否需要显示登录时间信息？
