# 明细弹窗交易记录字段顺序调整 - 产品需求文档

## Overview
- **Summary**: 调整明细弹窗中A股场内股票/基金新增交易记录表单的字段顺序，使其符合用户要求的排列顺序。
- **Purpose**: 优化表单填写体验，使用户按照习惯的顺序填写字段。
- **Target Users**: 个人投资者，添加A股场内股票/基金交易记录的用户。

## Goals
- 调整A股场内股票/基金新增记录表单的字段顺序为：类型、日期、价格、金额、数量、费用

## Non-Goals (Out of Scope)
- 修改其他资产类型的表单
- 修改字段数量或功能
- 后端数据结构变更

## Background & Context
- 当前明细弹窗位于 `assert_WEB/src/pages/Finance.jsx` 的 DetailModal 组件中
- 当前A股场内股票/基金新增记录表单字段顺序为：类型、日期、价格、数量、金额、费用
- 用户要求的顺序为：类型、日期、价格、金额、数量、费用
- 该功能已在之前的 finance-a-stock-features spec 中实现，仅需调整字段顺序

## Functional Requirements
- **FR-1**: 字段顺序调整 - A股场内股票/基金新增记录表单字段顺序调整为：类型、日期、价格、金额、数量、费用

## Non-Functional Requirements
- **NFR-1**: 表单功能保持不变
- **NFR-2**: UI与现有风格保持一致

## Constraints
- **Technical**: React + JavaScript, Tailwind CSS
- **Dependencies**: 现有Finance.jsx组件结构

## Assumptions
- 仅调整字段顺序，不改变字段功能
- 金额自动计算逻辑保持不变（价格*数量）

## Acceptance Criteria

### AC-1: 字段顺序调整
- **Given**: 用户打开明细弹窗，资产类型为股票、二级分类为A股、三级分类为场内
- **When**: 用户点击"新增记录"
- **Then**: 表单字段顺序为：类型、日期、价格、金额、数量、费用
- **Verification**: `human-judgment`

## Open Questions
- 无
