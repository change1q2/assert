# 交易记录新增显示修复 - Product Requirement Document

## Overview
- **Summary**: 修复持仓明细弹窗中新增交易记录后不显示在列表中的问题
- **Purpose**: 确保用户在持仓明细弹窗中新增的交易记录能够正确显示在交易记录列表中
- **Target Users**: 理财模块用户

## Goals
- 新增交易记录后能够立即在交易记录列表中显示
- 修复记录字段映射不一致的问题

## Non-Goals (Out of Scope)
- 修改交易记录的数据结构
- 添加新的交易记录字段

## Background & Context
- 当用户在持仓明细弹窗中点击「新增记录」并填写表单后，记录被保存到后端但前端列表不显示
- 问题原因：初始化交易记录时会进行字段映射（如 `direction` → `type`），但新增记录时没有进行同样的映射

## Functional Requirements
- **FR-1**: 新增交易记录后应立即显示在交易记录列表中
- **FR-2**: 新增记录的字段应与初始化记录保持一致的格式

## Constraints
- **Technical**: React + Vite + Tailwind CSS

## Assumptions
- 用户已打开持仓明细弹窗
- 用户已填写完整的交易记录表单

## Acceptance Criteria

### AC-1: 新增记录显示在交易记录列表
- **Given**: 用户打开持仓明细弹窗并点击新增记录
- **When**: 用户填写完整表单并点击保存
- **Then**: 交易记录应立即显示在列表中，包含类型、日期、确认金额、确认份额/数量、确认净值/价格、手续费
- **Verification**: `human-judgment`

### AC-2: 新增记录字段格式正确
- **Given**: 用户新增了一条买入记录（国内市场股票）
- **When**: 记录保存成功
- **Then**: 列表中显示的字段值应与用户填写的一致
- **Verification**: `human-judgment`

## Open Questions
- [ ] 无
