# 收益分析与操作分析增强 Spec

## Why
场内穿透页面的收益分析和操作分析模块存在多项体验问题：
1. 仓位分析饼图当前按市值占比展示，用户希望按一级分类（商品类/权益类/债权类）展示，并支持点击下钻到下一层级分类
2. 收益分析顶部有"收益率/盈亏金额/总资产"三个切换按钮，用户只需前两个，且切换后下方所有分析（仓位/极值/回撤）应统一用率或金额表示
3. 操作分析模块当前显示静态假数据（平均持仓天数=15、建清仓次数=8等），且"操作统计/账户表现"按钮无实际意义，需改为基于理财模块真实数据计算，并补充公式说明

## What Changes
- **收益分析切换区**：移除"总资产"按钮，仅保留"收益率"和"盈亏金额"
- **仓位分析饼图**：按 `categoryL1` 分组（商品类、权益类、债权类、现金类），饼图扇区点击可下钻到该分类下的 `assetType` 资产类型占比
- **极值分析**：`analysisView === 'rate'` 时显示最大收益率；`analysisView === 'amount'` 时显示最大盈亏金额
- **最大回撤**：`analysisView === 'rate'` 时显示最大回撤率（保持现有）；`analysisView === 'amount'` 时显示最大回撤金额
- **操作分析模块**：移除"操作统计"和"账户表现"按钮标题栏，所有指标基于 `financeAccounts` 和 `stateData.financeAssets` 中的真实数据实时计算
- **操作分析公式说明**：右上角添加 `?` 悬浮按钮，hover/点击后弹出 tooltip 显示每个指标的计算公式

## Impact
- Affected code: `assert_WEB/src/pages/AssetPenetration.jsx`
- Affected data: `stateData.financeAssets`（已有字段：`categoryL1`, `assetType`, `currentValue`, `holdingPnl`, `holdingPnlRate`, `dailyPnl`, `cost`, `quantity`, `transactions`）

## ADDED Requirements

### Requirement: 收益分析切换区仅保留收益率和盈亏金额
系统 SHALL 将 `analysisView` 的可选值从 `['rate', 'amount', 'asset']` 改为 `['rate', 'amount']`，移除"总资产"按钮及其所有关联渲染逻辑。

#### Scenario: 用户看到收益分析顶部
- **WHEN** 用户进入收益分析区域
- **THEN** 顶部仅显示"收益率"和"盈亏金额"两个切换按钮
- **AND** 默认选中"收益率"

### Requirement: 仓位分析饼图按一级分类展示并支持下钻
系统 SHALL 在 `selectedAnalysis === 'position'` 时，按 `categoryL1` 字段分组渲染饼图，每个扇区代表一个一级分类，点击扇区下钻到该分类下的 `assetType` 分组饼图。

#### Scenario: 显示一级分类饼图
- **WHEN** `drillDownPath.length === 0`
- **THEN** 饼图按 `categoryL1` 分组统计 `currentValue`
- **AND** 显示分类名称和占比百分比

#### Scenario: 点击下钻到资产类型
- **WHEN** 用户点击某个一级分类扇区
- **THEN** `drillDownPath` 更新为该分类名称
- **AND** 饼图重新按该分类下各 `assetType` 的 `currentValue` 分组渲染
- **AND** 显示面包屑导航和返回按钮

#### Scenario: 饼图数据随 analysisView 切换
- **WHEN** `analysisView === 'rate'`
- **THEN** 饼图数值使用各分组的平均 `holdingPnlRate`（或加权收益率）
- **WHEN** `analysisView === 'amount'`
- **THEN** 饼图数值使用各分组的 `holdingPnl` 盈亏金额

### Requirement: 极值分析支持率/金额双模式
系统 SHALL 在 `selectedAnalysis === 'extreme'` 时，根据 `analysisView` 显示不同的极值指标。

#### Scenario: 收益率模式下的极值分析
- **WHEN** `analysisView === 'rate'`
- **THEN** 显示"最大收益率: +X.XX%"
- **AND** 走势图标注区间最大收益率点位

#### Scenario: 盈亏金额模式下的极值分析
- **WHEN** `analysisView === 'amount'`
- **THEN** 显示"最大盈亏: +¥X,XXX.XX"
- **AND** 走势图标注区间最大盈亏金额点位

### Requirement: 最大回撤支持率/金额双模式
系统 SHALL 在 `selectedAnalysis === 'drawdown'` 时，根据 `analysisView` 显示不同的回撤指标。

#### Scenario: 收益率模式下的最大回撤
- **WHEN** `analysisView === 'rate'`
- **THEN** 显示"最大回撤: -X.XX%"（保持现有逻辑）

#### Scenario: 盈亏金额模式下的最大回撤
- **WHEN** `analysisView === 'amount'`
- **THEN** 显示"最大回撤金额: -¥X,XXX.XX"
- **AND** 回撤区间用金额计算

### Requirement: 操作分析基于真实数据计算
系统 SHALL 移除"操作统计"和"账户表现"按钮，所有指标基于 `financeAccounts` 实时计算，不再使用硬编码值。

#### Scenario: 交易股票数
- **WHEN** 计算交易股票数
- **THEN** 显示 `financeAccounts.length`（已有逻辑，保持）

#### Scenario: 平均持仓天数
- **WHEN** 计算平均持仓天数
- **THEN** 遍历所有 `financeAccounts`，统计每个资产首次交易日期到当前日期的天数差
- **AND** 公式：各资产持仓天数之和 / 资产总数
- **AND** 持仓天数 = 当前日期 - 该资产 `transactions` 中最早的 `transaction_date`

#### Scenario: 建清仓次数
- **WHEN** 计算建清仓次数
- **THEN** 遍历所有 `financeAccounts` 的 `transactions`
- **AND** 统计所有 `direction === 'buy'` 或 `type === '买入'` 的记录数为建仓次数
- **AND** 统计所有 `direction === 'sell'` 或 `type === '卖出'` 的记录数为清仓次数
- **AND** 显示"建仓 X 次 / 清仓 Y 次"

#### Scenario: 交易成功率
- **WHEN** 计算交易成功率
- **THEN** 遍历所有 `financeAccounts` 的 `transactions`
- **AND** 对有卖出记录的资产，计算每次卖出时的盈亏
- **AND** 盈利交易次数 / 总交易次数 × 100%
- **AND** 若无可计算记录则显示"--"

#### Scenario: 平均仓位
- **WHEN** 计算平均仓位
- **THEN** 公式：当前持仓总市值 / 历史最大投入本金 × 100%
- **AND** 历史最大投入本金 = 所有买入交易的累计金额（price × quantity）

#### Scenario: 资金周转率
- **WHEN** 计算资金周转率
- **THEN** 公式：累计卖出金额 / 当前持仓总市值
- **AND** 累计卖出金额 = 所有卖出交易的累计金额（sellPrice × quantity）

### Requirement: 操作分析右上角公式说明
系统 SHALL 在操作分析模块右上角添加 `?` 图标按钮，hover 或点击后弹出 tooltip/弹窗，显示每个指标的计算公式和逻辑说明。

#### Scenario: 用户查看公式说明
- **WHEN** 用户点击或 hover `?` 按钮
- **THEN** 弹出说明面板，列出每个指标的名称和计算公式
- **AND** 公式用代码块或等宽字体展示

## MODIFIED Requirements

### Requirement: 分析视图切换
原 `analysisView` 支持 `'rate' | 'amount' | 'asset'` 三种状态，现修改为仅支持 `'rate' | 'amount'`。

- **移除**：`'asset'` 选项及其所有渲染分支
- **默认**：`'rate'`（保持）
- **影响区域**：顶部切换按钮、右边面板 `selectedPositionItem` 详情、仓位分析饼图数值

## REMOVED Requirements

### Requirement: 总资产切换按钮
**Reason**: 用户明确只需要收益率和盈亏金额
**Migration**: 移除 `analysisView === 'asset'` 的按钮和渲染逻辑

### Requirement: 操作统计与账户表现按钮
**Reason**: 用户要求取消这两个无实际意义的分类按钮
**Migration**: 移除操作分析模块顶部的两个切换按钮，改为直接展示所有计算指标
