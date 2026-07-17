# 明细弹窗数据校验与场外基金修复 - Product Requirement Document

## Overview
- **Summary**: 修复明细弹窗中的数据校验模块显示问题和场外基金明细弹窗白屏闪退问题
- **Purpose**: 确保场内明细弹窗显示正确的列表数据，场外基金明细弹窗正常打开
- **Target Users**: 所有使用理财模块的用户

## Goals
- 修复数据校验模块中"列表持仓成本"显示为0或与列表不一致的问题
- 修复"明细持仓成本"与"列表持仓成本"对比口径错误（之前误对比"列表当前市值"）
- 确保浮动盈亏=持仓盈亏(holdingPnl)，当日参考盈亏=当日盈亏(dailyPnl)
- 当 stateData.financeAssets 中 prevPrice/currentPrice 缺失或为 0 时，回退使用实时行情（quotesMap）计算当日盈亏
- 修复场外基金明细弹窗白屏闪退问题

## Non-Goals (Out of Scope)
- 不修改其他模块的功能逻辑
- 不新增额外的校验规则

## Background & Context
- 当前明细弹窗中数据校验模块的"列表当前市值"字段被错误地用于对比，应改为"列表持仓成本"（即 listCost = costPrice × quantity）
- 浮动盈亏和当日参考盈亏在某些情况下显示为0，主要原因是 DetailModal 没有访问实时行情 quotesMap，仅从 stateData.financeAssets 读取 prevPrice/currentPrice，而 loadQuotes 只更新 quotesMap 不更新 financeAssets
- 场外基金点击明细弹窗时出现白屏闪退，是数据字段缺失导致的渲染错误

## Functional Requirements
- **FR-1**: 数据校验模块的"列表持仓成本"应等于明细中计算的成本（costPrice × quantity），与列表持仓成本保持一致
- **FR-2**: 浮动盈亏应等于列表中的`holdingPnl`（持仓盈亏）
- **FR-3**: 当日参考盈亏应等于列表中的`dailyPnl`（当日盈亏），当 stateData 中字段缺失时回退到实时行情（quotesMap）计算
- **FR-4**: 场外基金明细弹窗应正常打开，不出现白屏闪退

## Non-Functional Requirements
- **NFR-1**: 修复后不应影响其他功能模块的正常运行
- **NFR-2**: 页面加载速度应保持正常，无明显卡顿

## Constraints
- **Technical**: React + Vite + Tailwind CSS 前端架构，Node.js/Koa 后端服务
- **Dependencies**: 依赖现有数据结构和API接口

## Assumptions
- 列表数据中存在`currentValue`、`holdingPnl`、`dailyPnl`字段
- 场外基金数据可能缺少某些字段导致渲染错误

## Acceptance Criteria

### AC-1: 列表持仓成本正确显示
- **Given**: 用户打开场内资产的明细弹窗
- **When**: 查看数据校验模块
- **Then**: "列表持仓成本"显示 `costPrice × quantity` 的值，与明细持仓成本对比
- **Verification**: `human-judgment`

### AC-2: 浮动盈亏等于持仓盈亏
- **Given**: 用户打开场内资产的明细弹窗
- **When**: 查看浮动盈亏区域
- **Then**: 浮动盈亏显示列表中的`holdingPnl`值
- **Verification**: `human-judgment`

### AC-3: 当日参考盈亏等于当日盈亏
- **Given**: 用户打开场内资产的明细弹窗
- **When**: 查看当日参考盈亏区域
- **Then**: 当日参考盈亏显示列表中的`dailyPnl`值，与列表保持一致
- **Verification**: `human-judgment`

### AC-4: 场外基金明细弹窗正常打开
- **Given**: 用户点击场外基金的明细按钮
- **When**: 弹窗打开
- **Then**: 弹窗正常显示基金详情，不出现白屏闪退
- **Verification**: `human-judgment`

## Open Questions
- [ ] 场外基金数据具体缺少哪些字段导致白屏闪退？

---

# 明细弹窗数据校验与场外基金修复 - Implementation Plan

## [x] Task 1: 修复数据校验模块"列表持仓成本"对比口径
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 数据校验模块原对比"列表当前市值"，应改为"列表持仓成本"（listCost = costTotal）
  - 对比指标：明细持仓成本 = buyTotalAmount - sellTotalAmount；列表持仓成本 = costTotal
  - 标签从"列表当前市值"改为"列表持仓成本"
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgment` TR-1.1: 打开场内资产明细弹窗，确认"列表持仓成本"显示正确值

## [x] Task 2: 修复浮动盈亏和当日参考盈亏数据来源
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 确认浮动盈亏使用 `latestData.holdingPnl` 字段，当日参考盈亏使用 `latestData.dailyPnl` 字段
  - 添加字段存在性检查和默认值处理
  - 当 stateData 字段缺失时回退到实时计算
- **Acceptance Criteria Addressed**: AC-2, AC-3
- **Test Requirements**:
  - `human-judgment` TR-2.1: 打开场内资产明细弹窗，确认浮动盈亏显示持仓盈亏值
  - `human-judgment` TR-2.2: 打开场内资产明细弹窗，确认当日参考盈亏显示当日盈亏值

## [x] Task 3: 修复场外基金明细弹窗白屏闪退问题
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 排查场外基金数据字段缺失问题
  - 在 DetailModal 组件中添加字段缺失的默认值处理
  - 添加错误边界或 try-catch 避免渲染错误导致白屏
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgment` TR-3.1: 点击场外基金明细按钮，确认弹窗正常打开
  - `human-judgment` TR-3.2: 弹窗显示完整的基金详情信息

## [x] Task 4: DetailModal 接入实时行情（quotesMap）计算当日盈亏
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - DetailModal 之前没有访问 quotesMap，导致当日参考盈亏与列表不一致
  - 父组件将 quotesMap 作为 prop 传递给 DetailModal
  - DetailModal 的 dailyPnl/dailyPnlRate 计算优先使用 quotesMap 中的实时价格和昨收价，其次才用 stateData 中的 prevPrice/currentPrice
  - 保证当日参考盈亏与列表"当日盈亏"完全一致
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgment` TR-4.1: 打开场内股票明细弹窗，确认当日参考盈亏与列表"当日盈亏"完全一致
  - `human-judgment` TR-4.2: 打开场外基金明细弹窗，确认当日参考盈亏与列表"当日盈亏"完全一致

## [x] Task 5: 构建测试与验证
- **Priority**: medium
- **Depends On**: Task 1, Task 2, Task 3, Task 4
- **Description**:
  - 运行前端构建命令验证代码正确性
  - 测试场内和场外基金明细弹窗功能
- **Acceptance Criteria Addressed**: 所有AC
- **Test Requirements**:
  - `programmatic` TR-5.1: `npm run build` 构建成功（exit code 0）
  - `human-judgment` TR-5.2: 所有功能正常运行

---
# 明细弹窗数据校验与场外基金修复 - Verification Checklist

- [x] Checkpoint 1: 场内资产明细弹窗数据校验模块"列表持仓成本"显示正确值（与明细持仓成本一致或合理差异）
- [x] Checkpoint 2: 场内资产明细弹窗浮动盈亏显示列表中的持仓盈亏值
- [x] Checkpoint 3: 场内资产明细弹窗当日参考盈亏显示列表中的当日盈亏值（与列表完全一致）
- [x] Checkpoint 4: 场外基金明细弹窗正常打开，不出现白屏闪退
- [x] Checkpoint 5: 前端构建成功（npm run build exit code 0）