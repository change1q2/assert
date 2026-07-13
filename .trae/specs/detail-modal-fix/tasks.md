# 明细弹窗数据绑定修复 - 实现计划

## [x] Task 1: 修复 DetailModal 交易记录初始化问题
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 将 `tradeRecords` 的初始化方式从 `useState(initializer)` 改为使用 `useEffect` 监听 `data` 属性变化
  - 当 `data` 变化时，重新初始化 `tradeRecords` 为当前资产的交易记录
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `human-judgement` TR-1.1: 先打开资产A(300277)明细，关闭后打开资产B(110017)明细，确认交易记录显示正确
  - `human-judgement` TR-1.2: 确认校验区域的数据与当前资产一致

## [x] Task 2: 验证修复效果
- **Priority**: medium
- **Depends On**: Task 1
- **Description**: 
  - 重新构建前端
  - 手动测试切换查看不同资产的明细功能
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `human-judgement` TR-2.1: 验证3个不同资产的明细切换都能正确显示各自的交易记录
  - `human-judgement` TR-2.2: 验证校验对比功能使用正确的数据