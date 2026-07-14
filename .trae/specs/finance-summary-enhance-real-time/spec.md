# 理财模块筛选汇总增强与实时行情 - Product Requirement Document

## Overview
- **Summary**: 增强筛选汇总卡片的数据项和计算公式，增加持仓总成本指标，并利用后端已有的实时行情接口获取线上数据，实现现价实时更新和涨跌颜色显示。
- **Purpose**: 提供更准确的盈亏计算和实时数据展示，帮助用户更好地了解持仓状况。
- **Target Users**: 理财模块用户（持仓管理者）

## Goals
- 筛选汇总卡片显示 6 项数据：当前总市值、持仓总成本、持仓总盈亏、持仓总收益率、当日总盈亏、当日总收益率（2行显示）
- 持仓总收益率 = (当前总市值 − 持仓总成本) / 持仓总成本 × 100%
- 当日总收益率 = 当日总盈亏 / 当前总市值 × 100%
- 列表现价从线上获取实时数据
- 现价涨显示绿色，跌显示红色（相对于昨日收盘价）

## Non-Goals (Out of Scope)
- 不涉及后端行情接口的新增或修改（已有腾讯/东方财富数据源）
- 不涉及账户本卡片的调整
- 不涉及顶部四张核心统计卡的调整
- 不涉及数据库结构变更

## Background & Context
- 后端已有 finance-service.js 从腾讯行情(qt.gtimg.cn)和东方财富(push2.eastmoney.com)获取实时数据
- 前端已有 fetchFinanceQuotes API 调用和 quotesMap 状态管理
- 当前筛选汇总卡片为单行5列，显示当前市值、持仓盈亏、持仓收益率、当日盈亏、当日收益率
- 当前持仓总成本计算为 financeAccounts.reduce((sum, a) => sum + (parseFloat(a.cost) || 0), 0)，即持仓成本字段的简单累加，而非持仓成本×数量

## Functional Requirements
- **FR-1**: 筛选汇总卡片按2行显示，第一行：当前总市值、持仓总成本、持仓总盈亏；第二行：持仓总收益率、当日总盈亏、当日总收益率
- **FR-2**: 持仓总成本 = Σ(持仓成本 × 数量)，即每行持仓成本乘以数量后的总和
- **FR-3**: 持仓总收益率 = (当前总市值 − 持仓总成本) / 持仓总成本 × 100%
- **FR-4**: 当日总收益率 = 当日总盈亏 / 当前总市值 × 100%
- **FR-5**: 列表现价列使用线上实时数据（从 quotesMap 获取）
- **FR-6**: 现价显示颜色：高于昨日收盘价显示绿色，低于昨日收盘价显示红色
- **FR-7**: 当日盈亏计算使用实时数据：(现价 - 昨日收盘价) × 数量

## Non-Functional Requirements
- **NFR-1**: 所有数值保留3位小数（与现有 formatNum 一致）
- **NFR-2**: 百分比保留2位小数，带 +/- 符号（与现有 formatPercentage 一致）
- **NFR-3**: 盈亏颜色规则保持一致（正绿负红）
- **NFR-4**: 实时数据获取失败时降级使用本地存储的数据

## Constraints
- **Technical**: 仅修改前端 assert_WEB/src/pages/Finance.jsx
- **Business**: 保持现有数据结构和后端 API 不变
- **Dependencies**: 后端 finance-service.js 已存在且可用

## Assumptions
- 用户资产代码格式符合现有 tencentCodeFor 的识别规则（国内市场代码以6/9开头为沪市，0/1/3开头为深市）
- 后端服务运行正常，能够获取实时行情数据
- quotesMap 中包含 price（现价）和 prevClose（昨日收盘价）字段

## Acceptance Criteria

### AC-1: 筛选汇总卡片数据项与布局
- **Given**: 用户进入理财模块，持仓明细下有筛选汇总卡片
- **When**: 查看筛选汇总卡片
- **Then**: 卡片按2行显示6项数据：第一行（当前总市值、持仓总成本、持仓总盈亏），第二行（持仓总收益率、当日总盈亏、当日总收益率）
- **Verification**: `human-judgment`

### AC-2: 持仓总成本计算公式
- **Given**: 列表中有多项持仓，每项有持仓成本(cost)和数量(quantity)
- **When**: 计算持仓总成本
- **Then**: 持仓总成本 = Σ(cost × quantity)，即每行持仓成本乘以数量后的总和
- **Verification**: `programmatic`

### AC-3: 持仓总收益率计算公式
- **Given**: 当前总市值为 MV，持仓总成本为 TC
- **When**: 计算持仓总收益率
- **Then**: 持仓总收益率 = (MV - TC) / TC × 100%，结果显示为带 +/- 号的百分比，保留2位小数
- **Verification**: `programmatic`

### AC-4: 当日总收益率计算公式
- **Given**: 当日总盈亏为 DPnL，当前总市值为 MV
- **When**: 计算当日总收益率
- **Then**: 当日总收益率 = DPnL / MV × 100%，结果显示为带 +/- 号的百分比，保留2位小数
- **Verification**: `programmatic`

### AC-5: 现价实时更新
- **Given**: 用户有持仓且资产代码可被识别
- **When**: 页面加载或点击刷新
- **Then**: 列表现价列显示从线上获取的实时数据（优先使用 quotesMap 中的 price）
- **Verification**: `human-judgment`

### AC-6: 现价涨跌颜色显示
- **Given**: quotesMap 中包含 price 和 prevClose
- **When**: 现价 > 昨日收盘价
- **Then**: 现价显示为绿色
- **Verification**: `human-judgment`

### AC-7: 现价跌颜色显示
- **Given**: quotesMap 中包含 price 和 prevClose
- **When**: 现价 < 昨日收盘价
- **Then**: 现价显示为红色
- **Verification**: `human-judgment`

### AC-8: 当日盈亏计算
- **Given**: quotesMap 中包含 price 和 prevClose，持仓有数量
- **When**: 计算当日盈亏
- **Then**: 当日盈亏 = (price - prevClose) × quantity，使用实时数据计算
- **Verification**: `programmatic`

### AC-9: 构建验证
- **Given**: 代码修改完成
- **When**: 运行 npm run build
- **Then**: 构建成功，无错误
- **Verification**: `programmatic`

## Open Questions
- [ ] 现价等于昨日收盘价时显示什么颜色？（建议：灰色/黑色，保持默认）
- [ ] 列表中是否需要显示"昨日收盘价"列？（当前未显示，建议不新增）
