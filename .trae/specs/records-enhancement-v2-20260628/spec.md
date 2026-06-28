# 收支分析模块增强 v2 Spec

## Overview
- **Summary**: 增强收支分析模块的分类和账户管理功能，修复新增数据不显示问题，添加图文识别功能
- **Purpose**: 用户需要能够自定义账户和分类，新增数据后即时显示，以及通过图片自动识别记账信息
- **Target Users**: 所有使用收支分析功能的用户

## Goals
1. 账户支持新增、编辑、删除
2. 一级分类和二级分类支持新增、编辑、删除
3. 修复新增数据后不显示的问题
4. 新增弹窗添加图文识别功能

## Non-Goals (Out of Scope)
- 账本的增删改（已有账本选择器）
- 图表功能修改
- 其他页面的修改

## Background & Context
- 当前分类和账户是只读下拉框，无法自定义
- createRecord API 调用 /records POST，但后端可能没有此接口，导致数据无法持久化
- 用户希望通过上传图片自动识别金额、日期等信息

## Functional Requirements
- **FR-1**: 账户管理 - 用户可在新增弹窗中新增、编辑、删除账户
- **FR-2**: 一级分类管理 - 用户可在新增弹窗中新增、编辑、删除一级分类
- **FR-3**: 二级分类管理 - 用户可在新增弹窗中新增、编辑、删除二级分类
- **FR-4**: 数据持久化 - 新增记录后数据能正确保存并显示
- **FR-5**: 图文识别 - 用户可上传图片，系统自动识别金额、日期等信息

## Non-Functional Requirements
- **NFR-1**: 响应速度 - 操作反馈时间 < 1秒
- **NFR-2**: 兼容性 - 支持主流浏览器

## Constraints
- **Technical**: 使用现有技术栈（React + Vite + Tailwind），OCR 使用第三方 API
- **Dependencies**: 后端 /api/state 接口用于数据持久化

## Assumptions
- OCR API 可识别中文发票、收据等图片
- 用户会提供有效的图片文件

## Acceptance Criteria

### AC-1: 账户管理
- **Given**: 用户打开新增弹窗
- **When**: 用户点击账户下拉框旁的"管理"按钮
- **Then**: 显示账户管理弹窗，支持新增、编辑、删除账户
- **Verification**: `human-judgment`

### AC-2: 一级分类管理
- **Given**: 用户打开新增弹窗
- **When**: 用户点击一级分类下拉框旁的"管理"按钮
- **Then**: 显示一级分类管理弹窗，支持新增、编辑、删除一级分类
- **Verification**: `human-judgment`

### AC-3: 二级分类管理
- **Given**: 用户打开新增弹窗
- **When**: 用户选择一级分类后点击二级分类下拉框旁的"管理"按钮
- **Then**: 显示二级分类管理弹窗，支持新增、编辑、删除二级分类
- **Verification**: `human-judgment`

### AC-4: 新增数据显示
- **Given**: 用户填写完整表单并点击保存
- **When**: 保存成功后
- **Then**: 页面自动刷新，新增记录显示在列表中
- **Verification**: `human-judgment`

### AC-5: 图文识别
- **Given**: 用户打开新增弹窗
- **When**: 用户上传包含金额和日期的图片
- **Then**: 系统自动识别图片内容，填充金额和日期字段
- **Verification**: `human-judgment`

## Open Questions
- [ ] 需要确认使用哪个 OCR API（百度 OCR、腾讯 OCR 等）
- [ ] 需要确认后端 /api/state PUT 接口是否支持增量更新
