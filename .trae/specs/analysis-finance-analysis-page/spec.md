# 统计分析-理财分析独立页面 Spec

## Why
当前统计分析模块的「理财模块」Tab 点击后直接跳转到 Finance.jsx 页面，打断了统计分析的数据分析流程。用户需要在统计分析页面内获得一个独立的理财分析视图，集中展示组合的总市值、总成本、年化收益率（IRR），以及与通胀/基准指数的对比，帮助用户直观评估投资组合的真实回报表现。

## What Changes
- 统计分析页面的「理财模块」Tab 不再跳转到外部页面，改为在 Analysis.jsx 内部渲染独立的理财分析内容区域
- 新增顶部统计卡片：总市值、总成本、持仓收益、持仓收益率、组合年化 IRR
- 新增资产 IRR 明细列表：每个理财产品的买入现金流、分红、当前市值，以及各自 IRR
- 新增基准对比区域：组合收益率与 CPI（通胀）、沪深300 等外部基准的对比图表
- **BREAKING**: `analysisTab === 'finance'` 时不再调用 `onNavigate('finance')`

## Impact
- Affected code: `assert_WEB/src/pages/Analysis.jsx`（主要修改）
- Affected specs: analysis-page-redesign, profit-analysis-redesign

## ADDED Requirements

### Requirement: 理财分析独立页面内嵌展示
系统 SHALL 在 analysisTab 为 'finance' 时，在统计分析页面内直接渲染理财分析内容，不再跳转。

#### Scenario: 用户点击理财模块 Tab
- **WHEN** 用户在统计分析页面点击「理财模块」Tab
- **THEN** 页面保持在 Analysis.jsx，右侧内容区切换为理财分析视图
- **AND** 不再调用 `onNavigate('finance')`

### Requirement: 顶部统计卡片
系统 SHALL 在理财分析页面顶部显示组合级核心指标卡片。

#### Scenario: 展示组合总览
- **WHEN** 理财分析页面加载
- **THEN** 显示以下卡片：
  - 总市值 = 所有 financeAssets 的 `currentValue` 之和
  - 总成本 = 所有 financeAssets 的 `cost` 之和
  - 持仓收益 = 总市值 - 总成本
  - 持仓收益率 = (总市值 - 总成本) / 总成本 × 100%
  - 组合年化 IRR = 基于所有资产的买入/卖出/分红现金流 + 当前市值作为终值，使用 XIRR 计算

### Requirement: 资产 IRR 明细列表
系统 SHALL 在页面中部显示每个理财产品的 IRR 明细。

#### Scenario: 展示单资产 IRR
- **WHEN** 页面加载且 financeAssets 有数据
- **THEN** 对每项资产计算其 IRR：
  - 收集该资产 transactions 中类型为「买入/建仓」的 amount（负现金流）
  - 收集类型为「卖出/清仓」的 amount（正现金流）
  - 收集类型为「分红」的 amount（正现金流）
  - 追加一笔终值现金流：日期为今天，金额为当前市值（正现金流）
  - 使用 XIRR（Newton-Raphson 迭代）计算年化收益率
- **AND** 列表显示：资产名称、代码、当前市值、总成本、持仓收益、IRR、分红总额

#### Scenario: IRR 计算失败处理
- **WHEN** 某项资产无买入交易记录或现金流无法收敛
- **THEN** 该资产 IRR 显示为「—」

### Requirement: 基准对比图表
系统 SHALL 在页面下部展示组合收益率与外部基准的对比。

#### Scenario: 组合 vs CPI 对比
- **WHEN** 页面渲染基准对比区域
- **THEN** 显示一条代表 CPI 累计涨幅的参考线
- **AND** CPI 数据使用前端内置的近年月度数据（2020-01 至当前月，国家统计局月度同比数据）
- **AND** 累计涨幅计算：从用户首次买入日期到当前日期的 CPI 累计复合涨幅

#### Scenario: 组合 vs 沪深300 对比
- **WHEN** 页面渲染基准对比区域
- **THEN** 通过 `/api/finance/index-history?code=000300.SH&count=300` 获取沪深300 历史数据
- **AND** 计算用户投资期间（最早买入日至当前）沪深300 的累计涨跌幅
- **AND** 在对比图表/卡片中展示：组合收益率 vs 沪深300 收益率

#### Scenario: 基准对比可视化
- **WHEN** 基准数据加载完成
- **THEN** 使用柱状图或横向对比条展示：
  - 组合持仓收益率（红色/绿色）
  - 组合年化 IRR（蓝色）
  - CPI 累计涨幅（橙色）
  - 沪深300 累计涨幅（紫色）

## MODIFIED Requirements

### Requirement: 理财模块 Tab 点击行为
原行为：点击「理财模块」调用 `onNavigate('finance')` 跳转页面。
现修改为：仅在 Analysis.jsx 内部切换 `analysisTab` 状态，渲染内嵌理财分析内容。

## REMOVED Requirements
无
