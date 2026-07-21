# 房产出租明细增强 Spec

## Why
用户反馈房产出租列表存在数据展示问题（出租方式、起租/到期时间不显示），且需要一个更完善的出租明细系统，能够按收款方式自动生成付款记录并计算收益。

## What Changes
- **修复**: 出租方式在列表中未显示的问题
- **新增**: 列表显示起租时间和到期时间列
- **新增**: 明细弹窗顶部显示租赁时长统计（天/月/年）和收益统计（日/月/年收益）
- **新增**: 明细表格按收款方式自动生成付款记录
  - 押一付一：每月产生一条记录
  - 押一付三：每三个月产生一条记录
- **新增**: 付款记录字段：月份、应付款、实付款、是否付款（未付款灰色/已付款绿色/已逾期红色）
- **弃用**: 原有的按30天一期生成的12期明细逻辑（改为按月生成）

## Impact
- Affected specs: realestate-enhancement, realestate-type-and-cost-enhancement
- Affected code: IndependentAssets.jsx 中的 renderRealEstateTable、renderPropertyDetailModal、generateRentDetails

## ADDED Requirements

### Requirement: 列表字段修复与新增
The system SHALL 在房产列表中正确显示出租方式数据，并新增起租时间和到期时间列。

#### Scenario: 列表显示
- **WHEN** 用户查看房产列表
- **THEN** 出租方式列显示具体值（押一付一/押一付三），不为空
- **THEN** 新增起租时间、到期时间列，格式为 YYYY-MM-DD

### Requirement: 明细弹窗收益统计
The system SHALL 在明细弹窗顶部显示租赁时长和收益计算。

#### Scenario: 打开明细弹窗
- **WHEN** 用户点击出租房产的"明细"按钮
- **THEN** 弹窗顶部显示：
  - 租赁总天数 = 到期时间 - 起租时间
  - 租赁月数 = 总天数 / 30（取整）
  - 租赁年数 = 总天数 / 365（保留1位小数）
  - 日收益 = 月租金 / 30
  - 月收益 = 月租金
  - 年收益 = 月租金 × 12

### Requirement: 按收款方式自动生成付款记录
The system SHALL 根据收款方式（押一付一/押一付三）和起止时间自动生成付款记录。

#### Scenario: 押一付一
- **WHEN** 收款方式为"押一付一"
- **THEN** 从起租时间开始，每月产生一条付款记录
- **THEN** 每条记录包含：月份（YYYY-MM）、应付款（=月租金）、实付款（默认同应付款）、是否付款

#### Scenario: 押一付三
- **WHEN** 收款方式为"押一付三"
- **THEN** 从起租时间开始，每三个月产生一条付款记录
- **THEN** 每条记录包含：月份范围（如 2024-01 ~ 2024-03）、应付款（=月租金×3）、实付款、是否付款

#### Scenario: 是否付款状态
- **WHEN** 查看付款记录
- **THEN** 未付款显示灰色标签
- **THEN** 已付款显示绿色标签
- **THEN** 已逾期显示红色标签（当前日期超过该期结束时间且未付款）

## MODIFIED Requirements
### Requirement: 原有明细数据结构
原 `rentDetails` 数组结构从 `{period, startDate, endDate, rentStatus, isReturned}` 改为 `{month, amountDue, amountPaid, paymentStatus}`。
