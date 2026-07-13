# 明细弹窗数据绑定修复 - Product Requirement Document

## Overview
- **Summary**: 修复明细弹窗(DetailModal)在切换查看不同资产时，交易记录数据没有正确更新的问题
- **Purpose**: 当用户先查看资产A(300277)的明细，关闭后再查看资产B(110017)的明细时，交易记录应该显示资产B的数据，而不是资产A的数据
- **Target Users**: 所有使用持仓明细功能的用户

## Goals
- 修复明细弹窗交易记录数据绑定问题，确保切换查看不同资产时显示正确的数据
- 保持原有功能不变，不引入新的副作用

## Non-Goals (Out of Scope)
- 不修改交易记录的展示样式
- 不修改交易记录的增删改逻辑
- 不修改其他弹窗或组件

## Background & Context
- 当前问题：`DetailModal` 组件中 `tradeRecords` 使用 `useState(initializer)` 初始化，初始化函数只在组件首次挂载时执行一次
- 当用户关闭弹窗再打开时，组件可能没有完全卸载，导致 `tradeRecords` 仍然是上一次的数据
- 用户报告：查看代码110017的明细时，校验逻辑显示的是代码300277的数据

## Functional Requirements
- **FR-1**: 明细弹窗打开时，交易记录应根据传入的 `data.transactions` 正确初始化
- **FR-2**: 切换查看不同资产时，交易记录应自动更新为当前资产的数据

## Non-Functional Requirements
- **NFR-1**: 修复不应影响现有功能和性能
- **NFR-2**: 修复应符合React最佳实践

## Constraints
- **Technical**: React函数组件，使用Hooks
- **Dependencies**: 现有代码结构和数据模型

## Assumptions
- 弹窗关闭后重新打开时，组件可能会复用（React的条件渲染优化）
- `data.transactions` 是数组类型，包含当前资产的交易记录

## Acceptance Criteria

### AC-1: 切换资产时交易记录正确更新
- **Given**: 用户先打开资产A(300277)的明细弹窗，查看交易记录后关闭
- **When**: 用户打开资产B(110017)的明细弹窗
- **Then**: 弹窗中显示的交易记录应为资产B(110017)的交易记录，而非资产A(300277)的
- **Verification**: `human-judgment`
- **Notes**: 通过手动测试验证

### AC-2: 校验对比功能使用正确的数据
- **Given**: 用户打开资产B(110017)的明细弹窗
- **When**: 查看交易记录校验区域
- **Then**: 校验计算应基于资产B(110017)的交易记录和资产数据
- **Verification**: `human-judgment`

## Open Questions
- [ ] 确认弹窗组件的卸载机制
- [ ] 确认是否有其他状态也需要同步更新