# 明细弹窗数据校验与功能修复 - 实施计划

## [x] Task 1: DetailModal 浮动盈亏和当日参考盈亏改为显示列表值
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 DetailModal 中"浮动盈亏"显示逻辑，直接使用 `latestData.holdingPnl` 而非重新计算
  - 修改"当日参考盈亏"显示逻辑，直接使用 `latestData.dailyPnl` 而非重新计算
  - 保持涨跌颜色判断（正数红色，负数绿色）
  - 保持百分比显示（holdingPnlRate、dailyPnlRate）
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `human-judgment` TR-1.1: 打开明细弹窗，浮动盈亏与列表持仓盈亏值一致
  - `human-judgment` TR-1.2: 当日参考盈亏与列表当日盈亏值一致
  - `programmatic` TR-1.3: 构建成功

## [x] Task 2: 增加交易记录与持仓成本校验机制
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 DetailModal 中新增校验区域（放在交易记录上方或汇总区域下方）
  - 计算所有"买入"类型记录（type === '买入' || type === '建仓'）的 amount 总和
  - 计算所有"卖出"类型记录（type === '卖出' || type === '清仓'）的 amount 总和
  - 计算：买入总金额 - 卖出总金额
  - 与 `latestData.cost` 对比
  - 一致时显示"校验通过"绿色样式
  - 不一致时显示差异值（计算值 - cost）红色样式
- **Acceptance Criteria Addressed**: AC-3, AC-5
- **Test Requirements**:
  - `human-judgment` TR-2.1: 数据一致时显示"校验通过"
  - `human-judgment` TR-2.2: 数据不一致时差异值红色高亮显示
  - `programmatic` TR-2.3: 构建成功

## [x] Task 3: 列表增加平均买入成本列
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 CategoryTable 的 columns 定义中增加"平均买入成本"列
  - 显示值 = cost / quantity（quantity 为可用份额/数量）
  - 列位置在"持仓成本"列之后
  - 格式化显示，保留3位小数
  - 按原始货币显示（与成本列一致）
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgment` TR-3.1: 列表中可见"平均买入成本"列
  - `human-judgment` TR-3.2: 值等于 cost / quantity
  - `programmatic` TR-3.3: 构建成功

## [x] Task 4: 修复交易记录编辑弹窗消失bug
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 排查交易记录编辑按钮点击后 DetailModal 关闭的原因
  - 可能原因：事件冒泡导致点击穿透到弹窗遮罩层、或 `onClose` 被错误触发、或编辑弹窗打开时状态重置导致 DetailModal 卸载
  - 修复方案：阻止事件冒泡（e.stopPropagation()），确保编辑弹窗打开时不影响 DetailModal 状态
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `human-judgment` TR-4.1: 点击编辑按钮，编辑弹窗打开且 DetailModal 保持显示
  - `programmatic` TR-4.2: 构建成功

## [x] Task 5: 图片识别自动补随机时间并按时间倒序排列
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 在图片识别导入交易记录的处理逻辑中，检查每条记录的 time 字段
  - 如果 time 为空或不存在，生成 9:30-15:00 之间的随机时间（格式 HH:mm）
  - 将日期和时间合并为完整日期时间（如 2026-07-15 14:32）
  - 所有交易记录按日期时间倒序排列（最新的排在最前面）
  - 排序依据：先按 date 降序，再按 time 降序
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `human-judgment` TR-5.1: 图片识别导入的无时间记录自动补充随机时间
  - `human-judgment` TR-5.2: 交易记录按时间倒序排列（最新在最前）
  - `programmatic` TR-5.3: 构建成功

## [x] Task 6: 构建测试与验证
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3, Task 4, Task 5
- **Description**: 
  - 前端执行 `npm run build` 确认构建成功
  - 检查所有修改的组件无编译错误
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `programmatic` TR-6.1: `npm run build` 退出码为 0

# Task Dependencies
- Task 6 depends on Task 1, Task 2, Task 3, Task 4, Task 5
