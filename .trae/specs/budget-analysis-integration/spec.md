# 预算管理与分析页面深度集成 Spec

## Why
现有预算管理功能孤立在独立页面，数据为硬编码，缺乏与真实记账数据的联动。用户需要预算数据实时反映实际消费，超支时自动结转下月，并在收支分析页面直观展示预算执行进度。

## What Changes
- 收支分析页面（日视图）新增预算卡片列表，每个类别一行，显示图标、进度条、已用/预算比例、支出金额
- 预算卡片支持点击展开/收起，展开后显示该类别下各二级分类的预算与使用进度
- 预算管理页面趋势图 Tooltip 明确标注"支出"和"剩余"数据项
- 预算默认为月度预算，每月自动轮询，超支金额从下个月预算扣除，扣除至0后以负数形式展示超支额
- 预算卡片与真实 budgets 数据绑定，取代 Analysis.jsx 中的硬编码 dailyBudgetData

## Impact
- Affected pages: Analysis.jsx（日视图区域）、BudgetManagement.jsx
- Affected data: budgets 数组结构扩展（支持月度结转字段）

## ADDED Requirements

### Requirement: 分析页面预算卡片列表
The system SHALL 在收支分析页面的日视图下方（预算占比饼图下方）展示预算卡片列表。

#### Scenario: 展示总预算卡片
- **WHEN** 用户进入分析页面且 timeMode 为日视图
- **THEN** 在预算占比饼图下方显示预算卡片列表，每张卡片包含：类别图标（取类别首字）、类别名称、进度条、已用金额/预算金额文本、右侧支出金额
- **AND** 进度条颜色规则：已用 < 80% 蓝色，80%-100% 橙色，>100% 红色

#### Scenario: 展开显示二级分类
- **WHEN** 用户点击某预算卡片
- **THEN** 卡片展开，显示该类别下所有二级分类的预算与使用进度（同样以进度条+文本形式）
- **AND** 再次点击收起

### Requirement: 月度预算结转逻辑
The system SHALL 实现月度预算的自动结转机制。

#### Scenario: 超支从下月扣除
- **GIVEN** 本月某类别预算 1000，已用 1200（超支 200）
- **WHEN** 进入下个月
- **THEN** 该类别下月预算 = 上月剩余预算（-200），即显示为 -200，表示上月超支 200 需从下月补回
- **AND** 当预算为负数时，进度条显示为红色且文本显示如 "-200 / 1000"

#### Scenario: 正常结余不结转
- **GIVEN** 本月某类别预算 1000，已用 800（结余 200）
- **WHEN** 进入下个月
- **THEN** 下月预算恢复为该类别设置的原始预算金额 1000，不累积结余

### Requirement: 预算趋势图 Tooltip 优化
The system SHALL 在预算趋势图中清晰展示支出和剩余数据。

#### Scenario: 悬停提示数据项
- **WHEN** 用户在预算趋势图上悬停某日期点
- **THEN** Tooltip 中明确显示："支出: xxx" 和 "剩余: xxx" 两项
- **AND** 数值使用千分位格式

## MODIFIED Requirements

### Requirement: 预算数据来源
将 Analysis.jsx 中硬编码的 `dailyBudgetData` 替换为从 `stateData.budgets` 读取的真实数据。
- budgets 数组中每个 budget 对象需包含：`id`, `name`, `category`, `subCategory`, `amount`（原始月度预算）, `used`（本月已用）, `remaining`（本月剩余，可为负）
- 按 `category` 字段聚合，计算每个一级分类的总预算和总已用

### Requirement: 预算管理页面趋势图
- Tooltip formatter 从 `[(value) => [${value.toLocaleString()}, '']]` 改为分别标注数据项名称
- 确保支出线和剩余线都有正确的 Legend 标签

## REMOVED Requirements
### Requirement: Analysis.jsx 硬编码预算数据
**Reason**: 替换为真实 budgets 数据
**Migration**: 删除 `dailyBudgetData` useMemo，改用从 stateData 获取的真实预算数据
