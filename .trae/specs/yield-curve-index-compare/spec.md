# 场内穿透收益率曲线与指数对比 Spec

## Why
资产穿透页面需要一个专业的收益率曲线模块，展示用户投资组合收益率走势，并支持与主流指数对比，帮助用户直观判断自身投资表现是否跑赢市场。

## What Changes
- 在场内穿透页面新增「收益率曲线」独立模块
- 支持用户收益走势线与指数走势线双轴对比
- 时间区间切换（当日/本月/近三月/今年/全部/自定义）
- 指数快捷选择标签（上证/深证/创业板/上证50/沪深300/中证500/纳斯达克/标普500）
- 自定义指数输入框，支持用户输入任意指数代码对比
- 曲线/K线视图切换
- 数据源策略：A股指数使用 tencent/mootdx，美股/港股指数使用 eastmoney

## Impact
- Affected specs: asset-penetration-v2
- Affected code: assert_WEB/src/pages/AssetPenetration.jsx（内嵌实现）、assert_PLATFORM/server/services/finance-service.js（新增指数数据获取接口）

## ADDED Requirements
### Requirement: 收益率曲线展示
The system SHALL 在资产穿透页面提供收益率曲线区域，包含：
- 用户收益率走势线（红色）— 基于当前总持仓收益率与指数走势的近似映射
- 选中指数收益率走势线（蓝色）— 基于真实指数历史数据
- 图例显示「用户收益」和「指数」两条线
- X轴为时间，Y轴为收益率（百分比）
- X轴时间刻度按时间区间自动适配，避免标签重叠：
  - 当日：显示 9:30、10:30、11:30、13:00、14:00、15:00
  - 本月：每7天显示一个刻度，格式 MM-DD（如 07-01、07-06、07-13、07-20、07-27）
  - 近三月：每月1日显示一个刻度，格式 MM-DD（如 05-01、06-01、07-01）
  - 今年：从今年1月到当前月，每月1日显示一个刻度，格式 MM-DD（如 01-01、02-01…07-01）
  - 全部/自定义：每月1日显示一个刻度
- 支持鼠标悬停显示具体日期/时间和收益率数值
- 支持最大收益标注和最大回撤标注

#### Scenario: 页面加载默认状态
- **WHEN** 用户进入资产穿透页面
- **THEN** 默认显示「本月」时间区间，指数对比线默认显示「上证指数」

### Requirement: 时间区间切换
The system SHALL 提供时间区间切换按钮：当日、本月、近三月、今年、全部、自定义。
- 点击「自定义」时弹出日期选择器，允许用户选择起始和结束日期
- 切换时间区间后，用户收益线和指数线同步更新

#### Scenario: 切换时间区间
- **WHEN** 用户点击「近三月」按钮
- **THEN** 曲线图更新为近三个月的数据范围

### Requirement: 指数选择与切换
The system SHALL 提供指数快捷选择标签：
- A股指数：上证（000001.SH）、深证（399001.SZ）、创业板（399006.SZ）、上证50（000016.SH）、沪深300（000300.SH）、中证500（000905.SH）
- 美股指数：纳斯达克（IXIC）、标普500（SPX）
- 自定义指数输入框：用户可输入任意指数代码，点击「确定」后加载对比线

#### Scenario: 切换指数
- **WHEN** 用户点击「沪深300」标签
- **THEN** 蓝色指数对比线更新为沪深300收益率走势

### Requirement: 曲线/K线切换
The system SHALL 提供「曲线」和「K线」两个切换按钮：
- 「曲线」模式：显示两条平滑的收益率折线（用户收益线 + 指数线）
- 「K线」模式：显示指数K线柱状图（仅指数线，用户收益线隐藏）

### Requirement: 多数据源策略
The system SHALL 按以下策略获取指数数据：
- A股指数（上证、深证、创业板、上证50、沪深300、中证500）：优先使用 tencent/mootdx 数据源获取历史K线，fallback 到 eastmoney
- 美股/港股指数（纳斯达克、标普500）：使用 eastmoney 数据源
- 自定义指数：根据代码前缀判断（.SH/.SZ 用 A股策略，其他用 eastmoney）

完整数据源矩阵：
| Source | Markets | Auth | Role |
|--------|---------|------|------|
| tencent · mootdx | A-share | none | 首选A股数据源（mootdx = 通达信 TCP） |
| eastmoney | A / US / HK | none | OHLCV + 深度数据，A股/美股/港股的fallback |
| baostock · akshare | A (+ US/HK/futures/macro/fx) | none | 免费fallback |
| tushare | A / futures / fund / macro | token |  richest A-share（可选） |
| yahoo · sina · stooq | US (/HK) | none | 美股直接报价/K线 |
| yfinance | US / HK | none | wrapper |
| finnhub · alphavantage · tiingo · fmp | US | key | 可选美股付费源 |
| qveris | global multi-asset | key · credits | premium marketplace（显式调用，不参与自动fallback） |
| okx · ccxt | crypto | none | 加密货币 |
| futu | HK / A | OpenD | 可选本地FutuOpenD |
| india_broker | India (NSE/BSE) | broker login | 印度市场fallback |
| local | any | none | 本地CSV/Parquet/DuckDB via local: 前缀 |

国内A股使用 tencent · mootdx，港股或美股使用 eastmoney。

#### Scenario: 数据获取
- **WHEN** 用户选择「上证指数」
- **THEN** 系统通过 tencent/mootdx 获取上证指数历史数据，若失败则 fallback 到 eastmoney

### Requirement: 用户收益率计算
The system SHALL 提供用户收益率走势线：
- 由于系统当前不存储每日历史市值快照，用户收益线采用近似计算方法：
  - 非当日模式：获取选中指数在选定时间区间内的每日收益率序列，将指数收益率序列按用户当前总持仓收益率进行线性缩放
  - 当日模式：基于最近一个交易日的开盘价和收盘价，按 9:30-15:00 线性插值生成7个分时点，再按当前总持仓收益率缩放
  - 公式：`userRate[idx] = indexRate[idx] × (currentTotalPnlRate / indexTotalRate)`
  - 使用户收益线起点为0%，终点等于当前总持仓收益率
- 指数线为真实历史数据：`indexRate[idx] = (close[idx] - close[0]) / close[0] × 100%`
- 当日模式下的分时走势为模拟数据，未来可接入真实分时行情接口（见 Open Questions）

## MODIFIED Requirements
无

## REMOVED Requirements
无

## Open Questions
- [ ] 是否需要基于交易记录+历史K线/净值回溯计算真实的用户每日市值历史？这需要：
  1. 收集所有资产的交易记录
  2. 获取每个资产在相关时间段的历史价格（K线/净值）
  3. 按日回溯持仓数量和市值
  4. 计算每日累计收益率
  该方案计算量大，可作为未来迭代优化项。
