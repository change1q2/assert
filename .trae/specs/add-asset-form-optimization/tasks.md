# 新增资产表单优化 - 实施计划

## [x] Task 1: 字段顺序调整和命名修改
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 调整表单字段顺序：资产类型放在资产分类一级前面
  - "资产分类"字段标签改为"资产分类一级"
  - 调整相关字段的位置布局
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgment` TR-1.1: 资产类型字段显示在资产分类一级前面
  - `human-judgment` TR-1.2: "资产分类"字段显示为"资产分类一级"

## [x] Task 2: 级联选择逻辑实现
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 未选择市场时，货币单位输入框禁用
  - 未选择货币单位时，资产类型下拉框禁用
  - 选择国内市场时货币单位默认设置为CNY
  - 选择其他字段不受级联限制
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-4
- **Test Requirements**:
  - `human-judgment` TR-2.1: 未选择市场时货币单位禁用
  - `human-judgment` TR-2.2: 未选择货币单位时资产类型禁用
  - `human-judgment` TR-2.3: 选择国内市场后货币单位自动变为CNY
  - `human-judgment` TR-2.4: 其他字段不受级联限制

## [x] Task 3: 动态表单提示
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 当资产类型选择股票或基金，且资产三级分类为场内时
  - 资产名称输入框的placeholder显示"请填写股票名称"
  - 不满足条件时保持原有提示
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgment` TR-3.1: 股票+场内时资产名称提示为"请填写股票名称"
  - `human-judgment` TR-3.2: 基金+场内时资产名称提示为"请填写股票名称"
  - `human-judgment` TR-3.3: 其他情况时保持原有提示
