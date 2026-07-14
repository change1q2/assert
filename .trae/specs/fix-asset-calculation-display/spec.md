# 修复资产分类计算与显示问题

## Why
用户反馈4个问题：
1. 理财模块的场内穿透功能缺失
2. 明细弹窗显示方式（股票/基金形式）逻辑问题
3. 资产一级分类自动填写问题
4. 持仓成本计算错误（83,246.30 错误计算为 308,011,310）

## What Changes
- 修复 CategoryDetail.jsx 中持仓成本计算错误（`cost * quantity` 应为直接累加 `cost`）
- 修复资产一级分类自动填写问题（新增时不应自动填写，改为手动选择）
- 验证明细弹窗的股票/基金形式显示逻辑
- 修复场内穿透功能

## Impact
- Affected specs: 资产分类模块、理财模块
- Affected code: CategoryDetail.jsx, Finance.jsx, AssetClasses.jsx

## ADDED Requirements

### Requirement: 持仓成本计算修正
系统 SHALL 在 CategoryDetail.jsx 中正确计算持仓成本，直接累加每条资产的成本值，不应将成本与数量相乘。

#### Scenario: 正确计算持仓成本
- **WHEN** 筛选权益类资产时
- **THEN** 持仓成本应与理财页面显示一致（如 83,246.30）

### Requirement: 资产一级分类手动选择
系统 SHALL 在新增资产时，资产分类一级不应自动填写，用户需手动选择。

## MODIFIED Requirements

### Requirement: 明细弹窗显示方式
系统 SHALL 在明细弹窗中根据资产分类显示不同格式：
- 一级分类为权益类且三级分类为场内：按股票方式显示
- 一级分类为债权类且三级分类为场外：按基金方式显示

### Requirement: 场内穿透功能
系统 SHALL 恢复场内穿透功能，确保三级分类为场内的资产能正确穿透显示。

## REMOVED Requirements
None