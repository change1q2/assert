# 理财分析基准对比增强与资产类型数据同步 Spec

## Why
当前理财分析页面的基准对比功能存在以下问题：
1. 基准对比只显示柱状图，缺少趋势图展示
2. 持仓收益率与组合年化IRR重复，需要去掉持仓收益率
3. 缺少"实际收益率 = IRR - CPI"的计算展示
4. 资产分类明细的数据没有与理财模块同步，导致显示的数据不正确

## What Changes
- **FinanceAnalysis.jsx**：
  - 修改基准对比数据：去掉"持仓收益率"，新增"实际收益率 = IRR - CPI"
  - 修改沪深300数据获取：使用1B0300的实时数据
  - 新增趋势图：显示组合年化IRR、CPI涨幅、沪深300、实际收益率的月度趋势
  - 保留原有柱状图作为对比展示
  - 修复资产分类明细数据同步问题：确保按一级分类（categoryL1）正确聚合数据

## Impact
- Affected specs: analysis-finance-analysis-page
- Affected code: `assert_WEB/src/components/FinanceAnalysis.jsx`

## ADDED Requirements

### Requirement: 基准对比趋势图
系统 SHALL 在理财分析页面的基准对比区域新增趋势图，展示月度数据变化。

#### Scenario: 趋势图展示
- **WHEN** 用户查看基准对比区域
- **THEN** 上方显示趋势图，左侧Y轴为幅度百分比，下方X轴为时间（按月显示）
- **AND** 趋势图包含四条线：组合年化IRR、CPI涨幅、沪深300、实际收益率

#### Scenario: 趋势图数据来源
- **WHEN** 趋势图加载数据时
- **THEN** CPI数据使用CPI_DATA常量（国家统计局月度数据）
- **AND** 沪深300数据使用/api/finance/index-history?code=1B0300获取
- **AND** 组合年化IRR根据月度现金流计算
- **AND** 实际收益率 = 组合年化IRR - CPI涨幅

### Requirement: 实际收益率计算
系统 SHALL 计算并展示实际收益率，定义为 IRR 减去 CPI 涨幅。

#### Scenario: 实际收益率计算
- **WHEN** 计算基准对比数据时
- **THEN** 实际收益率 = 组合年化IRR - CPI累计涨幅
- **AND** 实际收益率显示在柱状图和趋势图中

### Requirement: 资产类型数据同步
系统 SHALL 确保资产分类明细的数据与理财模块一致，按一级分类正确聚合。

#### Scenario: 一级分类数据聚合
- **WHEN** 资产分类明细加载时
- **THEN** 按categoryL1字段正确分组资产（如权益类、债权类等）
- **AND** 每个分类显示：分类名称、当前总市值、总成本、总收益额、总收益率、IRR
- **AND** 数据计算逻辑与理财模块的summary一致（使用convertAmount转换货币，使用holdingPnl计算盈亏）

## MODIFIED Requirements

### Requirement: 基准对比指标
原需求：显示持仓收益率、组合年化IRR、CPI累计涨幅、沪深300。
现修改为：显示组合年化IRR、CPI涨幅、沪深300、实际收益率（去掉持仓收益率）。

### Requirement: 沪深300数据获取
原需求：使用000300.SH获取沪深300数据。
现修改为：使用1B0300获取沪深300实时数据。

## REMOVED Requirements
无