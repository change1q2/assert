# 外部工具组管理 - 产品需求文档

## Overview
- **Summary**: 为外部工具添加组管理功能，支持创建、编辑、删除分组，添加工具时必须选择分组
- **Purpose**: 解决当前外部工具分组硬编码无法动态管理的问题，让用户可以自定义工具组织方式
- **Target Users**: 使用辅助工具功能的所有用户

## Goals
- 支持动态管理外部工具分组（添加、编辑、删除）
- 添加新工具时必须选择分组
- 内置工具保持不可修改
- 现有分组（名人追踪、AI追踪、其他工具）作为默认分组

## Non-Goals (Out of Scope)
- 内置工具分组不支持修改
- 组的排序功能
- 工具在组内的排序功能

## Background & Context
- 当前外部工具分组是硬编码在代码中，通过filter筛选特定ID来显示
- 用户希望能够自定义分组结构
- 数据存储在后端数据库的state表中

## Functional Requirements
- **FR-1**: 显示外部工具分组列表，每个组包含其下的工具
- **FR-2**: 支持创建新分组（输入组名称和描述）
- **FR-3**: 支持编辑分组名称和描述
- **FR-4**: 支持删除分组（需确认，删除后工具移到默认组）
- **FR-5**: 添加新工具时必须选择所属分组
- **FR-6**: 内置工具组保持不可修改

## Non-Functional Requirements
- **NFR-1**: 数据保存到数据库，刷新页面后保持状态
- **NFR-2**: 删除分组时有确认提示
- **NFR-3**: UI响应式设计，支持移动端

## Constraints
- **Technical**: React + Tailwind CSS，数据通过fetchState/saveState API存储
- **Dependencies**: 后端API已支持存储任意JSON数据

## Assumptions
- 每个工具必须属于一个分组
- 默认分组（其他工具）不能删除
- 删除分组时，该组下的工具自动移到默认组

## Acceptance Criteria

### AC-1: 分组管理界面
- **Given**: 用户进入辅助工具页面并点击配置按钮
- **When**: 打开配置模态框
- **Then**: 显示分组管理区域，包含添加、编辑、删除分组功能
- **Verification**: `human-judgment`

### AC-2: 创建新分组
- **Given**: 用户在配置模态框中
- **When**: 点击添加分组，输入名称和描述，点击确认
- **Then**: 新分组创建成功并显示在列表中
- **Verification**: `human-judgment`

### AC-3: 编辑分组
- **Given**: 用户在配置模态框中，已有分组存在
- **When**: 点击编辑分组，修改名称或描述，点击确认
- **Then**: 分组信息更新成功
- **Verification**: `human-judgment`

### AC-4: 删除分组
- **Given**: 用户在配置模态框中，已有非默认分组存在
- **When**: 点击删除分组，确认删除
- **Then**: 分组被删除，组内工具移到默认组
- **Verification**: `human-judgment`

### AC-5: 添加工具选择分组
- **Given**: 用户在配置模态框中添加新工具
- **When**: 填写工具信息并选择分组
- **Then**: 新工具添加到所选分组中
- **Verification**: `human-judgment`

### AC-6: 数据持久化
- **Given**: 用户完成分组和工具配置并保存
- **When**: 刷新页面
- **Then**: 分组和工具配置保持不变
- **Verification**: `human-judgment`

## Open Questions
- [ ] 删除分组时的确认方式（弹窗还是内联确认）
- [ ] 默认组的名称是否可编辑

# Quality Checklist
- [x] Every goal has at least one acceptance criterion
- [x] Every acceptance criterion has a verification type
- [x] Non-goals are explicitly stated
- [x] Constraints are realistic and complete
- [x] No requirement contradicts another
- [x] Ambiguous user language has been clarified or flagged