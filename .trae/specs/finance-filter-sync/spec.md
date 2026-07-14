# 理财模块筛选调整与数据同步修复 Spec

## Why
理财模块筛选栏字段排列不符合用户习惯，且新添加的持仓数据不会显示在列表页，因为前端从错误的 state 字段（accounts）读取数据，而后端正确保存到了 financeAssets 表中。

## What Changes
- 筛选栏重新排列：默认显示资产分类、资产类型、所属账户；市场、货币、二级分类、持仓分组、持位分类、标签移入高级筛选
- 前端 loadData 从 state.financeAssets 读取理财数据，而非从 state.accounts 过滤
- financeAssets 字段映射到前端 holding 数据结构

## Impact
- Affected page: Finance.jsx（CategoryTable 筛选栏 + loadData 数据读取）
- Affected data: state.financeAssets 字段映射

## ADDED Requirements

### Requirement: 筛选栏字段重新排列
The system SHALL 将持仓明细筛选栏调整为：默认区域显示搜索框、资产分类、资产类型、所属账户；其余筛选条件全部放入高级筛选区域。

#### Scenario: 默认筛选栏显示
- **WHEN** 用户进入持仓明细页面
- **THEN** 默认筛选栏显示：搜索框、资产分类下拉、资产类型下拉、所属账户下拉、高级筛选按钮、列设置按钮

#### Scenario: 高级筛选栏内容
- **WHEN** 用户点击"高级筛选"
- **THEN** 展开区域显示：市场、货币、资产分类二级、持仓分组、持位分类、标签、重置按钮

### Requirement: 新加数据正确显示在列表
The system SHALL 从 state.financeAssets 读取理财持仓数据，确保新添加的记录能正确显示。

#### Scenario: 新加持仓后列表刷新
- **GIVEN** 用户通过新增弹窗添加一条持仓记录
- **WHEN** 保存成功后列表刷新
- **THEN** 新记录出现在对应的资产分类下

## MODIFIED Requirements

### Requirement: loadData 数据读取
修改 loadData 中的数据读取逻辑：
- 从 `data.financeAssets` 读取数据（而非 `data.accounts`）
- 字段映射：
  - financeAssets.id → holding.id
  - financeAssets.name → holding.name
  - financeAssets.code → holding.code
  - financeAssets.market → holding.market
  - financeAssets.currency → holding.currency
  - financeAssets.kind → holding.assetType（资产类型）
  - financeAssets.accountId → holding.account（所属账户）
  - financeAssets.category → holding.categoryL1（资产分类一级）
  - financeAssets.subcategory → holding.categoryL2（二级分类）
  - financeAssets.tertiaryCategory → holding.categoryL3（三级分类）
  - financeAssets.positionGroup → holding.positionGroup
  - financeAssets.positionCategory → holding.positionType（持位分类）
  - financeAssets.costPrice → holding.cost（持仓成本）
  - financeAssets.shares → holding.quantity（份额/数量）
  - financeAssets.currentPrice → holding.currentPrice（现价）
  - financeAssets.avgBuyPrice → holding.avgBuyPrice（均价）
  - financeAssets.holdingDays → holding.holdingDays
  - financeAssets.pnl → holding.holdingPnl（持仓盈亏）
  - financeAssets.pnlPercent → holding.holdingPnlRate（盈亏率%）
  - financeAssets.todayPnl → holding.dailyPnl（当日盈亏）
  - financeAssets.todayPnlPercent → holding.dailyPnlRate（日收益率%）
  - (currentPrice × shares) → holding.currentValue（当前价值）
  - financeAssets.transactions → holding.transactions

### Requirement: 保存数据到 financeAssets
修改 handleSaveAccount 函数，保存的数据结构改为 financeAssets 格式：
- 字段名从前端 camelCase 映射到后端 snake_case（通过 saveUserState 自动处理）
- 确保数据保存到 state.financeAssets 数组中
- 使用 PUT /api/state 整体保存（现有 API）或新增单独的 finance asset CRUD API

## REMOVED Requirements
### Requirement: 从 accounts 过滤获取理财数据
**Reason**: accounts 表存储的是普通账户，理财持仓应使用 financeAssets
**Migration**: 删除 `data.accounts.filter(a => !a.liability)` 的过滤逻辑，改为 `data.financeAssets || []`
