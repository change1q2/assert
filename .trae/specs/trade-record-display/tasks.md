# 交易记录新增显示修复 - Implementation Plan

## [x] Task 1: 修复 handleAddRecord 函数中的字段映射
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 `handleAddRecord` 函数中，为新创建的记录添加前端渲染所需的字段（`type`、`date`、`time`、`quantity`、`fee`）
  - 保持与 `useState` 初始化时相同的字段映射逻辑
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `human-judgement` TR-1.1: 新增交易记录后，确认记录立即显示在交易记录列表中
  - `human-judgement` TR-1.2: 列表中显示的类型、日期、金额、数量、价格、手续费字段值与用户填写一致
- **Notes**: 需要修改 Finance.jsx 中 DetailModal 的 handleAddRecord 函数

## [x] Task 2: 验证修复效果
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 启动前端和后端服务
  - 打开持仓明细弹窗
  - 新增一条交易记录并验证显示
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `human-judgement` TR-2.1: 验证新增记录成功显示在列表中
  - `human-judgement` TR-2.2: 验证记录的所有字段显示正确
- **Notes**: 需要手动测试验证

## [x] Task 3: 更新版本号
- **Priority**: medium
- **Depends On**: Task 2
- **Description**: 将版本号从 V1.0.4 更新到 V1.0.5
- **Acceptance Criteria Addressed**: None
- **Test Requirements**:
  - `human-judgement` TR-3.1: 确认版本号更新正确
- **Notes**: 更新 App.jsx 和 UserProfile.jsx 中的版本号
