# 债务模块 V2 优化 - Product Requirement Document

## Overview
- **Summary**: 对债务模块进行第二轮优化，包含弹窗金额字段调整、筛选与翻页、3个新增统计卡片、类别管理、列表卡片化等功能升级。
- **Purpose**: 提升债务管理的完整性和可用性，使用户能更直观地查看和管理各类别债务，确保新增数据即时可见。
- **Target Users**: 使用债务模块管理个人/家庭借贷的用户。

## Goals
- 弹窗"金额"改"总金额"并自动计算（本金+利息）
- 新增筛选+翻页功能，确保新增数据即时显示
- 新增3个统计卡片：总欠款、本年代还、本月代还
- 新增"类别"字段及类别管理（增删改）
- 列表改为卡片形式，按类别分组展示
- 移除"日常"时间筛选
- 版本号升级到 V1.0.2

## Non-Goals (Out of Scope)
- 不涉及其他模块（收支分析、理财模块等）的翻页改造（仅债务模块，作为后续模板）
- 不实现复杂的报表导出功能
- 不新增独立的 debt RESTful API，仍复用 /api/state 统一状态接口（由后端 state-service 负责持久化）

## Background & Context
- 当前债务模块（Debts.jsx）刚完成第一轮优化，已有完整弹窗、图片附件、统计卡片和分区列表
- 项目使用 React + Vite + Tailwind 前端架构，后端使用 Node.js + MySQL
- 数据持久化通过 /api/state 统一接口，由后端 state-service.js 负责读写数据库
- 后端已有 debts 表和 debt_payments 表，存储在 schema.sql 中
- 理财模块（Finance.jsx）已有筛选+翻页的实现模式可参考
- 收支分析模块（Records.jsx）已有分类管理弹窗模式可参考
- 前后端数据模型通过 state 对象对齐，后端负责 loadUserState/saveUserState 的完整持久化

## Functional Requirements
- **FR-1**: 弹窗"金额"字段改为"总金额"，默认自动计算 = 本金 + 利息，支持用户手动覆盖
- **FR-2**: 移除整行时间筛选Tab（日常/月统计/年统计/自定义全部移除）
- **FR-3**: 列表支持关键词筛选（搜索名称/债权人/备注）
- **FR-4**: 列表支持翻页功能，默认每页显示20条
- **FR-5**: 新增3个统计卡片：总欠款（欠款本金+欠款利息）、本年待还（待还本金+待还利息）、本月待还（待还本金+待还利息）
- **FR-6**: 弹窗新增"类别"字段，支持类别管理（新增/编辑/删除）
- **FR-7**: 默认类别包含：信用卡、房贷、车贷、消费贷、亲友借款、其他
- **FR-8**: 列表改为卡片形式，按类别分组，每张卡片显示该类别下所有债务及汇总数据
- **FR-9**: 新增债务保存后自动刷新列表并跳转到对应位置
- **FR-10**: 版本号更新为 V1.0.2
- **FR-11**: 后端新增 debt_categories 表，存储债务类别（对应 state.debtCategories）
- **FR-12**: 后端 debts 表新增 debt_category 字段，关联类别
- **FR-13**: 后端 state-service 的 loadUserState/saveUserState 支持债务类别和 debts 表新字段的持久化

## Non-Functional Requirements
- **NFR-1**: 翻页切换响应时间 < 100ms（前端分页）
- **NFR-2**: 类别管理弹窗操作后即时生效
- **NFR-3**: 保持与现有项目风格一致（Tailwind + lucide-react）

## Constraints
- **Technical**: 前端 React + Vite + Tailwind CSS + lucide-react；后端 Node.js + MySQL
- **Business**: 数据存储和处理在后端完成，前端只负责提取和显示
- **Dependencies**: 后端 state-service.js 统一管理状态持久化，新增表/字段需同步修改 schema.sql 和 state-service

## Assumptions
- "总金额" = 本金 + 利息金额（利息金额由利率和期限计算得出，或用户手动输入）
- "本年代还"指当前自然年内到期的待还本金和利息
- "本月代还"指当前自然月内到期的待还本金和利息
- 类别数据存储在后端 debt_categories 表，通过 state.debtCategories 暴露给前端
- 债务记录的类别存储在 debts 表 debt_category 字段
- 仍通过 /api/state 统一接口存取，后端 state-service 负责数据库读写

## Acceptance Criteria

### AC-1: 弹窗总金额自动计算 + 可手动覆盖
- **Given**: 用户在弹窗中填写了本金和利息相关数据
- **When**: 本金或利率/期限发生变化
- **Then**: "总金额"字段自动更新为 本金 + 利息，且允许用户手动修改覆盖自动计算值
- **Verification**: `human-judgment`

### AC-2: 移除整行时间筛选
- **Given**: 用户进入债务模块页面
- **When**: 查看顶部区域
- **Then**: 没有日常/月统计/年统计/自定义任何时间筛选Tab行
- **Verification**: `programmatic`

### AC-3: 筛选功能
- **Given**: 债务列表中有多条记录
- **When**: 用户在筛选框中输入关键词
- **Then**: 列表实时过滤出名称/债权人/备注包含关键词的记录
- **Verification**: `programmatic`

### AC-4: 翻页功能
- **Given**: 列表数据超过20条
- **When**: 页面加载完成
- **Then**: 底部显示翻页控件，显示当前页/总页数，支持前后翻页，每页固定20条
- **Verification**: `programmatic`

### AC-5: 新增数据即时可见
- **Given**: 用户在弹窗中填写了新债务并保存
- **When**: 弹窗关闭后
- **Then**: 列表自动刷新，新债务出现在列表中，翻页自动定位到包含新数据的页
- **Verification**: `programmatic`

### AC-6: 3个新增统计卡片
- **Given**: 页面加载完成
- **When**: 查看统计区
- **Then**: 显示总欠款、本年待还、本月待还3张卡片，每张卡片分别显示本金和利息
- **Verification**: `human-judgment`

### AC-7: 类别管理
- **Given**: 用户打开新增债务弹窗
- **When**: 点击类别选择框旁的设置按钮
- **Then**: 弹出类别管理弹窗，支持新增/编辑/删除类别
- **Verification**: `programmatic`

### AC-8: 类别卡片列表（支持展开/收起）
- **Given**: 有多个不同类别的债务
- **When**: 查看列表区域
- **Then**: 每个类别一张卡片，支持展开/收起，展开时显示该类别下所有债务明细和汇总
- **Verification**: `human-judgment`

### AC-9: 版本号更新
- **Given**: 页面加载完成
- **When**: 查看左上角产品图标下方
- **Then**: 显示版本号 V1.0.2
- **Verification**: `programmatic`

## Open Questions
- 无
