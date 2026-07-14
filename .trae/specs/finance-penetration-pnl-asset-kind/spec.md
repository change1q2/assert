# 理财模块场内穿透、收益率计算与资产种类优化

## Why
用户反馈 3 个问题：
1. 理财模块顶部缺少场内穿透功能入口按钮
2. 持仓总收益率计算结果异常（截图显示 +291356.73%，但总盈亏为负），总成本计算逻辑有误
3. 新增资产弹窗需要在"资产类型"前新增"资产种类"字段，支持自定义编辑，默认有流动资产、非流动资产

## What Changes
- **Finance.jsx**：
  - 在理财模块顶栏标题与刷新按钮之间添加"场内穿透"入口按钮
  - 点击后弹窗/跳转显示所有三级分类为"场内"的资产明细穿透表
  - 修复持仓总成本计算逻辑：统一使用 `(costPrice || cost) × (shares || quantity)` 计算总成本
  - 在新增/编辑资产表单中，"资产类型"字段前新增"资产种类"字段
- **AssetClasses.jsx / 数据模型**：
  - 新增资产种类（assetKind）概念，支持自定义编辑

## Impact
- Affected specs: 理财模块顶部导航、持仓统计计算、新增资产表单
- Affected code: Finance.jsx

## ADDED Requirements

### Requirement: 场内穿透功能入口
系统 SHALL 在理财模块顶栏（标题与刷新按钮之间）添加"场内穿透"按钮。点击后弹出穿透明细弹窗，显示所有 `categoryL3 === '场内'` 的资产列表，包含名称、代码、当前市值、持仓成本、盈亏等信息。

#### Scenario: 场内穿透入口可见
- **WHEN** 用户打开理财模块页面
- **THEN** 顶栏标题右侧显示"场内穿透"按钮

#### Scenario: 场内穿透弹窗显示
- **WHEN** 用户点击"场内穿透"按钮
- **THEN** 弹窗显示所有三级分类为"场内"的资产明细列表

### Requirement: 资产种类字段
系统 SHALL 在新增/编辑资产表单中，在"资产类型"字段前新增"资产种类"字段。可选值默认包含"流动资产"、"非流动资产"，支持自定义编辑添加其他种类。

#### Scenario: 资产种类下拉选择
- **WHEN** 用户打开新增资产弹窗
- **THEN** 表单中"资产类型"字段前显示"资产种类"下拉框，可选流动资产/非流动资产

### Requirement: 持仓总成本计算修正
系统 SHALL 修正所有持仓总成本的计算逻辑。总成本 = 单价 × 数量，统一使用 `(parseFloat(a.costPrice) || parseFloat(a.cost) || 0) × (parseFloat(a.shares) || parseFloat(a.quantity) || 0)`。

#### Scenario: 正确的持仓总成本
- **WHEN** 系统计算账户或筛选汇总时
- **THEN** 持仓总成本显示为单价 × 数量的正确值

## MODIFIED Requirements
None

## REMOVED Requirements
None
