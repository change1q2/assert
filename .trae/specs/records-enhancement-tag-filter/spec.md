# 收支分析功能增强 - 产品需求文档

## Overview
- **Summary**: 增强收支分析页面功能，包括在新增记录弹窗中添加标签字段、调整列表筛选项布局、确保前后端数据同步
- **Purpose**: 提升用户体验，完善收支记录的标签管理功能，优化筛选操作流程
- **Target Users**: 使用收支分析功能的所有用户

## Goals
- 在新增收支记录弹窗中添加标签输入字段
- 将列表筛选项移至日期/账本表头行上方，优化筛选体验
- 确保新增记录能正确保存到后端并从后端加载显示

## Non-Goals (Out of Scope)
- 修改现有的数据库表结构
- 新增批量操作功能
- 修改标签管理的核心逻辑

## Background & Context
- 当前新增记录弹窗缺少标签输入字段
- 列表筛选项位于表头下方第二行，用户需要滚动才能看到筛选条件
- 前端通过 `/api/state` 接口与后端同步数据，后端使用 MySQL 存储

## Functional Requirements
- **FR-1**: 在新增收支记录弹窗中添加标签输入字段，用户可输入标签值
- **FR-2**: 将列表筛选项移至日期/账本表头行上方，默认值为"全部"
- **FR-3**: 新增记录时将标签字段数据发送到后端保存
- **FR-4**: 从后端加载记录时正确解析标签字段并显示

## Non-Functional Requirements
- **NFR-1**: 页面加载时间不超过 2 秒
- **NFR-2**: 新增记录操作响应时间不超过 1 秒
- **NFR-3**: 界面美观，符合现有设计风格

## Constraints
- **Technical**: 使用 React + Vite + TailwindCSS 前端技术栈，Node.js + MySQL 后端技术栈
- **Dependencies**: 依赖现有的 `/api/state` 接口进行数据同步

## Assumptions
- 用户已登录，能正常访问 `/api/state` 接口
- MySQL 数据库已正确配置并运行

## Acceptance Criteria

### AC-1: 新增弹窗标签字段
- **Given**: 用户打开新增收支记录弹窗
- **When**: 用户在表单中输入标签值
- **Then**: 标签值被正确保存到新记录中
- **Verification**: `human-judgment`

### AC-2: 列表筛选项布局调整
- **Given**: 用户查看收支记录列表
- **When**: 用户滚动页面
- **Then**: 筛选项始终位于表头上方，便于快速访问
- **Verification**: `human-judgment`

### AC-3: 标签字段前后端同步
- **Given**: 用户新增带标签的收支记录并保存
- **When**: 页面刷新后重新加载数据
- **Then**: 记录的标签字段正确显示
- **Verification**: `programmatic`

### AC-4: 筛选功能正常工作
- **Given**: 列表中有带标签的记录
- **When**: 用户在标签筛选框中输入关键词
- **Then**: 列表只显示匹配的记录
- **Verification**: `human-judgment`

## Open Questions
- [ ] 标签字段是否需要支持多选？（当前设计为单标签）