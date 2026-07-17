# 明细弹窗数据校验与场外基金修复 - The Implementation Plan (Decomposed and Prioritized Task List)

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
- **Notes**: 用户最新反馈明确了对比口径应为"列表持仓成本"而非"列表当前市值"

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
- **Notes**: 用户最新反馈"当日参考盈亏=当日盈亏"，需与列表逻辑保持一致

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