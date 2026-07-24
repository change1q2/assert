# 个人中心与管理后台增强 - 产品需求文档

## Overview
- **Summary**: 修复手机号编辑同步问题，将主题颜色模块替换为问题反馈模块，隐藏登录测试账号，更新管理员默认账号密码，增强管理后台用户列表功能。
- **Purpose**: 提升用户体验和管理效率，确保数据同步一致性，完善反馈收集机制。
- **Target Users**: 普通用户、管理员

## Goals
- 修复手机号编辑保存后同步到后台管理系统
- 删除主题颜色模块，增加问题反馈模块（问题标题、问题详情支持图文、附件上传支持视频）
- 反馈数据保存到管理后台待处理反馈中
- 隐藏登录页面的测试账号信息
- 更新管理后台默认管理员账号为 SuperAdmin，密码为 Super12345
- 管理后台用户列表增加筛选条件、分页逻辑和操作列（编辑、删除）

## Non-Goals (Out of Scope)
- 反馈图片/视频的预览功能
- 反馈状态变更通知
- 用户列表导出功能
- 批量操作功能

## Background & Context
- 当前用户个人中心编辑手机号只保存到 localStorage，未同步到后端数据库
- 个人中心有主题切换模块需要替换为反馈功能
- 后端已有 feedback 服务和 admin 反馈查询接口
- 登录页面显示了测试账号信息，需要隐藏
- 默认管理员账号需要更新为指定的 SuperAdmin/Super12345
- 管理后台用户列表缺少筛选、分页和操作功能

## Functional Requirements
- **FR-1**: 用户编辑手机号保存时，调用 API 同步到后端数据库
- **FR-2**: 删除个人中心主题颜色模块，替换为问题反馈模块
- **FR-3**: 问题反馈模块包含问题标题输入框、问题详情富文本输入框、附件上传（支持图片和视频）
- **FR-4**: 反馈数据通过 API 保存到数据库，状态默认为 pending
- **FR-5**: 登录页面隐藏测试账号和密码信息
- **FR-6**: 默认管理员账号更新为 SuperAdmin，密码为 Super12345
- **FR-7**: 管理后台用户列表增加账号、昵称、手机号、邮箱筛选条件
- **FR-8**: 管理后台用户列表增加分页逻辑（每页10条）
- **FR-9**: 管理后台用户列表增加操作列，包含编辑和删除按钮

## Non-Functional Requirements
- **NFR-1**: 手机号保存 API 响应时间 < 500ms
- **NFR-2**: 反馈提交支持图片和视频，单文件大小限制 < 10MB
- **NFR-3**: 用户列表分页加载时间 < 300ms

## Constraints
- **Technical**: 前端使用 React + Vite，后端使用 Node.js + MySQL
- **Dependencies**: 现有反馈服务已存在，需要复用

## Assumptions
- 用户已登录状态下才能编辑个人信息和提交反馈
- 管理后台管理员已登录状态下才能操作用户列表

## Acceptance Criteria

### AC-1: 手机号编辑同步到后台
- **Given**: 用户在个人中心编辑手机号并保存
- **When**: 点击保存按钮后，前端调用 PUT /api/state 更新用户信息
- **Then**: 后端数据库 user_profiles 表中手机号字段被更新，管理后台用户列表显示最新手机号
- **Verification**: `programmatic`

### AC-2: 主题模块替换为问题反馈
- **Given**: 用户进入个人中心页面
- **When**: 查看页面内容
- **Then**: 主题颜色模块已删除，显示问题反馈模块
- **Verification**: `human-judgment`

### AC-3: 问题反馈表单
- **Given**: 用户在问题反馈模块
- **When**: 填写问题标题、问题详情（支持图文），上传附件（支持视频）并提交
- **Then**: 反馈数据保存到数据库，状态为 pending
- **Verification**: `programmatic`

### AC-4: 登录页面隐藏测试账号
- **Given**: 用户打开登录页面
- **When**: 查看页面内容
- **Then**: 页面底部没有显示测试账号和密码信息
- **Verification**: `human-judgment`

### AC-5: 管理员账号更新
- **Given**: 系统初始化时
- **When**: 调用 ensureDefaultAdmin 函数
- **Then**: 创建或更新管理员账号为 SuperAdmin，密码为 Super12345
- **Verification**: `programmatic`

### AC-6: 用户列表筛选功能
- **Given**: 管理员在管理后台用户列表页
- **When**: 在筛选输入框中输入账号/昵称/手机号/邮箱关键字
- **Then**: 用户列表实时过滤显示匹配的用户
- **Verification**: `human-judgment`

### AC-7: 用户列表分页功能
- **Given**: 用户数量超过10条
- **When**: 管理员浏览用户列表
- **Then**: 列表分页显示，每页10条，支持翻页
- **Verification**: `human-judgment`

### AC-8: 用户列表操作列
- **Given**: 管理员在用户列表页
- **When**: 点击编辑按钮
- **Then**: 弹出编辑用户信息的模态框
- **When**: 点击删除按钮并确认
- **Then**: 用户被删除，列表更新
- **Verification**: `programmatic`

## Open Questions
- [ ] 问题详情的图文支持是否需要富文本编辑器，还是简单的文本输入？
- [ ] 反馈附件上传是否需要后端支持文件存储？