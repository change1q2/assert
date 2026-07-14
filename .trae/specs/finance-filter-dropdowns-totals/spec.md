# 理财模块筛选下拉联动与顶部总览计算修正 - Product Requirement Document

## Overview
- **Summary**: 修复筛选下拉选项的数据源和联动逻辑，修正顶部总览（总市值、总成本、总盈亏、总收益率）的计算公式，确保与列表数据一致。
- **Purpose**: 确保筛选下拉选项与新增表单保持一致，并遵循市场→货币的关联逻辑；修正顶部总览数据计算，使其与列表实际数据对齐。
- **Target Users**: 理财模块用户（持仓管理者）

## Goals
- 筛选下拉选项使用与新增表单相同的数据源
- 筛选下拉遵循关联逻辑（选择国内市场→货币仅显示CNY，选择港股→显示HKD，选择美股→显示USD）
- 总市值=列表当前市值的总和
- 总成本=列表持仓成本的总和（持仓成本×数量的总和）
- 总盈亏=列表持仓盈亏的总和
- 总收益率=(总市值-总成本)/总成本×100%

## Non-Goals (Out of Scope)
- 不涉及后端 API 或数据库结构变更
- 不涉及其他模块的修改

## Background & Context
- 当前筛选下拉选项使用从 holdings 数据中提取的唯一值，可能与新增表单的选项不一致
- 当前市场与货币筛选没有联动逻辑
- 顶部总览的总成本计算可能使用了错误的公式（仅累加成本而非成本×数量）

## Functional Requirements
- **FR-1**: 市场筛选下拉使用 MARKET_OPTIONS 常量（国内市场、港股市场、美股市场、其他市场）
- **FR-2**: 货币筛选下拉使用 CURRENCY_SUGGESTIONS 常量，并根据选中的市场进行联动过滤
- **FR-3**: 资产类型筛选下拉使用 ASSET_TYPE_OPTIONS 常量（股票、基金、债券等）
- **FR-4**: 资产分类筛选下拉使用 assetClassOptions（与新增表单一致）
- **FR-5**: 总市值=filtered.reduce(sum + currentValue)，即列表当前市值的总和
- **FR-6**: 总成本=filtered.reduce(sum + cost×quantity)，即列表持仓成本×数量的总和
- **FR-7**: 总盈亏=filtered.reduce(sum + holdingPnl)，即列表持仓盈亏的总和
- **FR-8**: 总收益率=(总市值-总成本)/总成本×100%

## Non-Functional Requirements
- **NFR-1**: 保持现有数据结构和后端 API 不变
- **NFR-2**: 联动逻辑响应及时，无明显延迟

## Constraints
- **Technical**: 仅修改前端 assert_WEB/src/pages/Finance.jsx
- **Business**: 保持现有数据结构和后端 API 不变

## Assumptions
- 用户资产代码格式符合现有 tencentCodeFor 的识别规则
- 后端服务运行正常，能够获取实时行情数据

## Acceptance Criteria

### AC-1: 市场筛选下拉选项
- **Given**: 用户进入理财模块，查看持仓明细列表
- **When**: 点击市场筛选下拉
- **Then**: 显示选项为：全部市场、国内市场、港股市场、美股市场、其他市场
- **Verification**: `human-judgment`

### AC-2: 货币筛选联动
- **Given**: 用户选择市场为"国内市场"
- **When**: 点击货币筛选下拉
- **Then**: 仅显示 CNY 选项（或优先显示 CNY）
- **Verification**: `human-judgment`

### AC-3: 资产类型筛选下拉选项
- **Given**: 用户进入理财模块，查看持仓明细列表
- **When**: 点击资产类型筛选下拉
- **Then**: 显示选项为：全部资产类型、股票、基金、债券、期货、期权、外汇、数字货币、银行理财、保险、房产、其他
- **Verification**: `human-judgment`

### AC-4: 总市值计算正确
- **Given**: 列表显示多条持仓数据
- **When**: 查看顶部总览的总市值
- **Then**: 总市值=列表所有行当前市值的总和
- **Verification**: `human-judgment`

### AC-5: 总成本计算正确
- **Given**: 列表显示多条持仓数据
- **When**: 查看顶部总览的总成本
- **Then**: 总成本=列表所有行(持仓成本×数量)的总和
- **Verification**: `human-judgment`

### AC-6: 总盈亏计算正确
- **Given**: 列表显示多条持仓数据
- **When**: 查看顶部总览的总盈亏
- **Then**: 总盈亏=列表所有行持仓盈亏的总和
- **Verification**: `human-judgment`

### AC-7: 总收益率计算正确
- **Given**: 列表显示多条持仓数据
- **When**: 查看顶部总览的总收益率
- **Then**: 总收益率=(总市值-总成本)/总成本×100%
- **Verification**: `human-judgment`

### AC-8: 构建验证
- **Given**: 代码修改完成
- **When**: 运行 npm run build
- **Then**: 构建成功，无错误
- **Verification**: `programmatic`

## Open Questions
- [ ] 货币联动是完全过滤还是仅排序优先？（建议：完全过滤，只显示对应市场的货币）
