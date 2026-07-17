# 收益分析页面重设计 Spec

## Why
场内穿透页面的收益分析模块存在多项问题需要修复和增强：
1. 勾选功能为多选模式，但仓位分析/极值分析/最大回撤三个功能应互斥单选
2. 仓位分析使用模拟数据和热力图，需改为真实持仓数据的饼图占比
3. 极值分析和最大回撤仅在收益率曲线上标注点，需改为独立走势图
4. 资产类型分析需展示收益率和占比
5. 资产分析功能需移除
6. 指数对比卡片显示的涨跌幅为当日数据，需按时间区间（本月/今年等）计算真实区间涨跌幅

## What Changes
- 勾选区重构：analysisFeatures（仓位/极值/回撤）改为单选互斥，auxFeatures（资产类型）保持独立
- 仓位分析：从热力图改为 SVG 饼图，使用真实 `financeAssets` 按 `categoryL1` 分组统计市值占比
- 极值分析：勾选后显示独立走势图（SVG），标注区间最大收益率点位
- 最大回撤：勾选后显示独立走势图（SVG），标注最大回撤区间（从峰值到谷值）
- 资产类型：勾选后显示各资产类型的市值占比和收益率列表
- 删除资产分析勾选及其渲染区域
- 指数区间涨跌幅：根据 `timeRange` 和 `indexHistoryData` 计算区间真实涨跌幅，替代当日 changeRate

## Impact
- Affected code: `assert_WEB/src/pages/AssetPenetration.jsx`（主要修改）
- Affected specs: fix-yield-curve-real-trend, index-etf-binding-and-search-dropdown

## ADDED Requirements

### Requirement: 分析功能单选互斥
系统 SHALL 将仓位分析、极值分析、最大回撤三个功能改为单选互斥模式。

#### Scenario: 用户选择仓位分析
- **WHEN** 用户勾选仓位分析
- **THEN** 极值分析和最大回撤自动取消勾选
- **AND** 仅显示仓位分析内容

#### Scenario: 用户切换至极值分析
- **WHEN** 用户勾选极值分析（此时仓位分析已勾选）
- **THEN** 仓位分析自动取消，极值分析选中
- **AND** 最大回撤保持未选中

### Requirement: 仓位分析饼图
系统 SHALL 使用真实持仓数据渲染饼图显示各一级分类市值占比。

#### Scenario: 显示仓位分析饼图
- **WHEN** 用户选中仓位分析
- **THEN** 系统读取 `financeAssets` 数据
- **AND** 按 `categoryL1` 分组统计 `currentValue`
- **AND** 渲染 SVG 饼图，每块显示分类名称和占比百分比
- **AND** 支持鼠标悬停显示详细数值

### Requirement: 极值分析走势图
系统 SHALL 在选中极值分析时显示独立走势图，标注最大收益率。

#### Scenario: 显示极值分析
- **WHEN** 用户选中极值分析
- **THEN** 显示用户收益率曲线（同主走势图数据）
- **AND** 标注区间最大收益率点位（绿色高亮）
- **AND** 在图表上方显示"最大收益率: +X.XX%"文本

### Requirement: 最大回撤走势图
系统 SHALL 在选中最大回撤时显示独立走势图，标注最大回撤区间。

#### Scenario: 显示最大回撤
- **WHEN** 用户选中最大回撤
- **THEN** 显示用户收益率曲线
- **AND** 标注从峰值到谷值的最大回撤区间（红色阴影）
- **AND** 在图表上方显示"最大回撤: -X.XX%"文本

### Requirement: 资产类型分析
系统 SHALL 在勾选资产类型时显示各资产类型的收益率和占比。

#### Scenario: 显示资产类型列表
- **WHEN** 用户勾选资产类型
- **THEN** 按 `assetType` 分组统计
- **AND** 显示每个类型的：市值、占比百分比、收益率、收益率百分比

### Requirement: 指数区间涨跌幅计算
系统 SHALL 根据当前时间区间计算指数的真实区间涨跌幅。

#### Scenario: 本月涨跌幅
- **WHEN** 用户选择"本月"时间区间
- **THEN** 指数对比卡片显示"本月跑赢/跑输"
- **AND** 计算指数本月涨跌幅 = (本月最新收盘价 - 本月首个交易日收盘价) / 本月首个交易日收盘价 × 100%
- **AND** 对比条显示该真实涨跌幅

#### Scenario: 今年涨跌幅
- **WHEN** 用户选择"今年"
- **THEN** 计算今年涨跌幅 = (最新收盘价 - 年初首个交易日收盘价) / 年初首个交易日收盘价 × 100%

#### Scenario: 近三月涨跌幅
- **WHEN** 用户选择"近三月"
- **THEN** 计算近三月涨跌幅 = (最新收盘价 - 三月前首个交易日收盘价) / 三月前首个交易日收盘价 × 100%

## REMOVED Requirements

### Requirement: 资产分析勾选及内容
**Reason**: 用户要求删除
**Migration**: 移除 `auxFeatures.assetAnalysis` state、勾选框、及对应渲染区域（原"资产分析（一级分类）"区块）

### Requirement: 仓位分析热力图
**Reason**: 改为饼图展示
**Migration**: 移除 SVG 热力图渲染逻辑，替换为饼图
