# 理财模块新增弹窗优化 - Product Requirement Document

## Overview
- **Summary**: 对理财模块新增/编辑持仓弹窗进行优化，包括资产三级分类和持仓分组支持自由增删改、持位分类改名为持仓分类、资产名称和代码设为必填项。
- **Purpose**: 提升用户体验，允许用户自定义三级分类和持仓分组选项，统一术语命名，确保数据完整性。
- **Target Users**: 理财模块使用者，需要新增/编辑持仓记录的用户。

## Goals
- 资产三级分类下拉选项支持自由增删改
- 持仓分组下拉选项支持自由增删改
- 将"持位分类"改名为"持仓分类"（标签和字段名）
- 资产名称设为必填项（已有，需确认）
- 资产代码设为必填项

## Non-Goals (Out of Scope)
- 不改变资产一级/二级分类的现有逻辑
- 不改变其他字段的必填状态
- 不新增后端 API 接口

## Background & Context
- 当前资产三级分类已有"自由增添"选项，但无编辑/删除功能
- 当前持仓分组使用固定常量 POSITION_GROUP_OPTIONS，不支持自定义
- 当前"持位分类"术语不够准确，应改为"持仓分类"
- 当前资产名称已设为必填，资产代码为可选

## Functional Requirements

- **FR-1**: 资产三级分类支持自由增删改
  - 在三级分类下拉中添加编辑和删除按钮
  - 支持新增自定义三级分类选项
  - 支持编辑已有三级分类选项名称
  - 支持删除已有三级分类选项
  - 自定义选项持久化到本地存储或后端

- **FR-2**: 持仓分组支持自由增删改
  - 在持仓分组下拉中添加编辑和删除按钮
  - 支持新增自定义持仓分组选项
  - 支持编辑已有持仓分组选项名称
  - 支持删除已有持仓分组选项
  - 自定义选项持久化到本地存储或后端

- **FR-3**: 将"持位分类"改名为"持仓分类"
  - 修改表单标签从"持位分类"改为"持仓分类"
  - 修改字段映射从 positionType 显示为"持仓分类"
  - 修改 DEFAULT_COLUMNS 中的 label 从"持位分类"改为"持仓分类"

- **FR-4**: 资产名称和代码设为必填项
  - 资产名称保持必填（已有）
  - 资产代码添加必填标记和验证

## Non-Functional Requirements

- **NFR-1**: 兼容性 - 保持与现有数据结构的向后兼容
- **NFR-2**: 构建验证 - 修改后 `npm run build` 必须通过

## Constraints
- **Technical**: React 前端 + Node.js 后端
- **Business**: 需保持现有数据结构兼容性

## Assumptions
- 自定义选项可通过 localStorage 持久化或后端 API 存储
- 编辑/删除操作仅影响新增弹窗的下拉选项，不影响已保存的数据

## Acceptance Criteria

### AC-1: 资产三级分类支持自由增删改
- **Given**: 用户打开新增持仓弹窗
- **When**: 用户点击资产三级分类下拉
- **Then**: 下拉选项支持新增、编辑、删除操作
- **Verification**: `human-judgment`

### AC-2: 持仓分组支持自由增删改
- **Given**: 用户打开新增持仓弹窗
- **When**: 用户点击持仓分组下拉
- **Then**: 下拉选项支持新增、编辑、删除操作
- **Verification**: `human-judgment`

### AC-3: 持位分类改名为持仓分类
- **Given**: 用户打开新增持仓弹窗
- **When**: 用户查看表单字段
- **Then**: "持位分类"标签显示为"持仓分类"
- **Verification**: `human-judgment`

### AC-4: 资产名称和代码设为必填项
- **Given**: 用户打开新增持仓弹窗
- **When**: 用户未填写资产名称或代码就提交
- **Then**: 表单验证阻止提交并提示必填
- **Verification**: `human-judgment`

### AC-5: 构建成功
- **Given**: 代码修改完成
- **When**: 运行 `npm run build`
- **Then**: 构建成功，无报错
- **Verification**: `programmatic`

## Open Questions
- [ ] 自定义选项是持久化到 localStorage 还是后端？
