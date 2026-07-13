# 债权类场外基金校验逻辑优化 - 实现计划

## [x] Task 1: 修改 tradeStats 计算逻辑，为债权类场外基金使用独立规则
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 tradeStats 的 useMemo 逻辑，当 isBondFund 为 true 时，使用简化的计算规则
  - 债权类场外基金：确认金额之和（所有交易）- 手续费 = expectedAsset，确认份额之和 = expectedQuantity
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-1.1: 债权类场外基金显示正确的校验规则
  - `human-judgement` TR-1.2: 其他类型资产仍使用原有校验规则

## [x] Task 2: 添加同步最新数据按钮和功能
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 在校验区域添加"同步最新数据"按钮（仅在校验不通过且为债权类场外基金时显示）
  - 点击按钮后，调用 saveState 更新持仓数据：成本价 = (确认金额之和-手续费)/确认份额之和，份额 = 确认份额之和
- **Acceptance Criteria Addressed**: AC-2, AC-3
- **Test Requirements**:
  - `human-judgement` TR-2.1: 校验不通过时显示"同步最新数据"按钮
  - `human-judgement` TR-2.2: 点击同步按钮后，持仓数据更新为交易记录计算的值
  - `human-judgement` TR-2.3: 同步后校验显示通过

## [x] Task 3: 验证修复效果
- **Priority**: medium
- **Depends On**: Task 2
- **Description**: 
  - 重新构建前端
  - 手动测试债权类场外基金的校验和同步功能
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `human-judgement` TR-3.1: 债权类场外基金使用正确的校验规则
  - `human-judgement` TR-3.2: 校验不通过时显示同步按钮并能正确同步数据