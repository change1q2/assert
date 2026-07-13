# 持仓资产页面A股相关功能增强 - 实施计划

## [x] Task 1: 资产类型列默认显示
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改DEFAULT_COLUMNS中assetType列的visible属性从false改为true
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgment` TR-1.1: 页面加载后表格中显示"资产类型"列
  - `human-judgment` TR-1.2: 资产类型列显示正确的值（股票、基金等）

## [x] Task 2: A股场内股票/基金交易记录新增表单
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在DetailModal组件中添加判断逻辑：当categoryL2=A股、categoryL3=场内、assetType=股票或基金时
  - 新增记录表单显示6个字段：类型（买入/卖出/分红/建仓）、日期（年月日）、价格（购买价）、数量、金额（价格*数量）、费用
  - 非A股场内股票/基金资产保持原有表单不变
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgment` TR-2.1: A股场内股票/基金资产点击"新增记录"后显示6个字段表单
  - `human-judgment` TR-2.2: 表单包含类型下拉选择（买入、卖出、分红、建仓）
  - `human-judgment` TR-2.3: 表单包含日期选择器（年月日）
  - `human-judgment` TR-2.4: 表单包含价格、数量、金额、费用输入框
  - `human-judgment` TR-2.5: 非A股场内股票/基金资产显示原有表单

## [x] Task 3: 图片识别人工校验字段优化
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 修改图片识别校验模态框（showRecognizeModal）的字段布局
  - 显示6个字段：类型、日期、价格、数量、金额、费用
  - 确保每个字段均可编辑，类型使用下拉选择
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgment` TR-3.1: 上传图片后显示识别结果校验模态框
  - `human-judgment` TR-3.2: 模态框显示6个字段（类型、日期、价格、数量、金额、费用）
  - `human-judgment` TR-3.3: 每个字段均可编辑修改
  - `human-judgment` TR-3.4: 修改后点击"确认导入"按钮完成导入
