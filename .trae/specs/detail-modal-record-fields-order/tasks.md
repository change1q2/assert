# 明细弹窗交易记录字段顺序调整 - 实施计划

## [x] Task 1: 调整A股场内股票/基金新增记录表单字段顺序
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 将表单字段顺序从"类型、日期、价格、数量、金额、费用"调整为"类型、日期、价格、金额、数量、费用"
  - 保持金额自动计算逻辑不变（价格*数量）
  - 保持其他功能不变
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgment` TR-1.1: 表单字段顺序为：类型、日期、价格、金额、数量、费用
  - `human-judgment` TR-1.2: 金额自动计算功能正常（价格*数量）
  - `human-judgment` TR-1.3: 其他功能不受影响
