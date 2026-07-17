# 收益率曲线真实趋势与时间轴倒序 Spec

## Why
场内穿透页面的收益率曲线图存在两个问题：
1. 指数走势线没有真实反映标的的网络走势趋势，右边的百分比应直接显示指数的涨跌幅度，而非经过缩放的"用户收益率近似值"
2. X轴时间标签需要按 MM-DD 格式倒序排列（如 07-01、07-02、...），当前可能显示顺序不正确

## What Changes
- 修改收益率曲线图的数据计算逻辑：指数线直接使用历史数据计算收益率序列（每点 = (close - firstClose) / firstClose * 100%），不再与用户持仓收益率做缩放
- 修改 X轴时间标签渲染：按 MM-DD 格式从左到右倒序排列（最早日期在最左边）
- 保留用户收益线：用户收益线仍按当前总持仓收益率做线性缩放（从 0% 到当前总收益率）

## Impact
- Affected specs: yield-curve-visualization, yield-curve-index-compare, index-etf-binding-and-search-dropdown
- Affected code: `assert_WEB/src/pages/AssetPenetration.jsx`（收益率曲线 SVG 渲染逻辑）

## ADDED Requirements

### Requirement: 指数走势线真实收益率
系统 SHALL 直接计算指数历史收益率，真实反映标的走势。

#### Scenario: 计算指数收益率序列
- **WHEN** 获取到指数历史数据 `{ history: [{date, close}, ...] }`
- **THEN** 系统取第一个有效收盘价作为基准 `firstClose`
- **AND** 每个数据点的收益率 = `(close - firstClose) / firstClose * 100`
- **AND** 曲线图 Y轴显示该真实收益率百分比
- **AND** 右侧 Y轴刻度与指数涨跌幅度一致（如 +2%、-1% 等）

#### Scenario: 用户收益线保持缩放
- **WHEN** 当前用户总持仓收益率为 `currentPnlRate`
- **THEN** 用户收益线从 0%（左端点）到 `currentPnlRate`（右端点）做线性缩放
- **AND** 与指数线在同一坐标系中展示，方便对比

### Requirement: 时间轴 MM-DD 倒序排列
系统 SHALL 将 X轴时间标签按 MM-DD 格式从左到右升序排列（最早日期在左）。

#### Scenario: 时间轴标签格式
- **WHEN** 渲染收益率曲线 X轴
- **THEN** 每个刻度显示 `MM-DD` 格式（如 07-01）
- **AND** 从左到右时间递增（最早的日期在左边）

#### Scenario: 数据点顺序与标签匹配
- **WHEN** 历史数据 `history` 从后端返回（可能按时间倒序）
- **THEN** 前端渲染前将数据反转 `history.slice(0, displayDays).reverse()`
- **AND** SVG path 的点顺序与反转后的数据一致

## MODIFIED Requirements

### Requirement: 收益率计算逻辑
原逻辑：指数收益率与用户收益率做比例缩放。现修改为：指数收益率直接计算真实涨跌幅度，用户收益率单独缩放。

### Requirement: X轴时间渲染
原渲染：时间轴可能显示顺序不一致。现修改为：统一按 MM-DD 升序（从左到右时间递增）。