# 理财模块持仓明细功能增强 - 实现计划

## [x] Task 1: 修改持仓分类下拉选项逻辑（股票类型专属选项）
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改持仓分类下拉选项，当资产类型为"股票"时，显示：成长股、价值股、周期股、消费股
  - 其他资产类型保持原有选项
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `human-judgment` TR-1.1: 资产类型选择股票时，持仓分类下拉显示成长股、价值股、周期股、消费股
  - `human-judgment` TR-1.2: 资产类型选择其他（基金、债券等）时，持仓分类保持原有选项

## [x] Task 2: 修改场内资产交易记录表单（价格、数量、金额自动计算）
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改DetailModal组件，当资产为国内市场且三级分类为"场内"时，新增记录表单显示：类型、日期、时间、价格、数量、金额（自动计算）、费用
  - 金额字段根据价格*数量自动计算
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `human-judgment` TR-2.1: 场内资产新增记录弹窗显示正确字段
  - `human-judgment` TR-2.2: 输入价格和数量后，金额自动计算

## [x] Task 3: 修改场内资产图片识别与导入功能
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 修改图片识别结果展示，场内资产显示：类型、日期、时间、价格、数量、金额、费用
  - 添加人工确认机制
  - 添加"导入"按钮，确认后导入交易记录
- **Acceptance Criteria Addressed**: [AC-3]
- **Test Requirements**:
  - `human-judgment` TR-3.1: 图片识别结果显示正确字段
  - `human-judgment` TR-3.2: 识别结果可编辑修改
  - `human-judgment` TR-3.3: 点击导入按钮后，交易记录成功导入

## [x] Task 4: 修复新增资产时数据无法录入问题
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 检查新增资产表单的数据提交逻辑
  - 修复数据无法正确保存到数据库的问题
- **Acceptance Criteria Addressed**: [AC-4]
- **Test Requirements**:
  - `human-judgment` TR-4.1: 填写完整表单后点击保存，数据成功保存并显示在列表中

## [x] Task 5: 修改场外资产交易记录表单（确认金额、份额、净值）
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改DetailModal组件，当资产为国内市场且三级分类为"场外"时，新增记录表单显示：类型、日期、时间、确认金额、确认份额、确认净值、手续费
- **Acceptance Criteria Addressed**: [AC-5]
- **Test Requirements**:
  - `human-judgment` TR-5.1: 场外资产新增记录弹窗显示正确字段

## [x] Task 6: 修改场外资产明细弹窗展示
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 修改DetailModal组件，场外资产弹窗上方显示：资产、昨日收益、持仓收益、持仓收益率
  - 中间显示：最新净值、净值日期、日涨幅、持仓成本单价、累计收益、全部份额、可用份额、持有收益、持有收益率
- **Acceptance Criteria Addressed**: [AC-6]
- **Test Requirements**:
  - `human-judgment` TR-6.1: 场外资产明细弹窗上方显示正确的统计信息
  - `human-judgment` TR-6.2: 中间显示正确的资产字段信息

## [/] Task 7: 修改场外资产图片识别与导入功能
- **Priority**: medium
- **Depends On**: Task 5
- **Description**: 
  - 修改图片识别结果展示，场外资产显示：类型、日期、时间、确认金额、确认份额、确认净值、手续费
  - 添加人工确认机制
  - 添加"导入"按钮，确认后导入交易记录
- **Acceptance Criteria Addressed**: [AC-7]
- **Test Requirements**:
  - `human-judgment` TR-7.1: 场外资产图片识别结果显示正确字段
  - `human-judgment` TR-7.2: 点击导入按钮后，交易记录成功导入