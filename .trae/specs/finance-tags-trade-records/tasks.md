# 财务页面优化 - 实现计划

## [x] Task 1: 修复标签筛选下拉框显示所有标签
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 `uniqueTags` 的计算逻辑，使其从 books 数组中的 tags 字段获取所有标签，而不仅仅从持仓数据中提取
  - 确保新增标签后筛选下拉框能立即显示
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgment` TR-1.1: 添加新标签后，筛选下拉框中能看到该标签
  - `human-judgment` TR-1.2: 选择新标签后能正确筛选持仓数据

## [x] Task 2: 仓位占比去掉前导符号
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 renderCell 函数中 positionRatio 的渲染逻辑
  - 移除 pnlSign 函数的使用，直接显示数字百分比
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgment` TR-2.1: 仓位占比显示为纯数字百分比，无正负号

## [x] Task 3: 详情弹窗交易记录支持新增
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 DetailModal 组件中添加交易记录状态管理
  - 添加新增交易记录表单（类型下拉、日期、时间、数量、金额、费用）
  - 添加保存和取消按钮
- **Acceptance Criteria Addressed**: AC-4, AC-6
- **Test Requirements**:
  - `human-judgment` TR-3.1: 点击新增按钮显示表单
  - `human-judgment` TR-3.2: 表单包含所有必填字段
  - `human-judgment` TR-3.3: 交易记录显示具体时间（年月日时分）

## [x] Task 4: 交易税费自动计算和统计汇总
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 修改交易税费显示逻辑，自动计算交易记录费用总和
  - 在持仓天数下方添加交易统计汇总卡片（买入总金额、卖出总金额、买入总数、卖出总数、交易总费用、分红收益）
- **Acceptance Criteria Addressed**: AC-3, AC-5
- **Test Requirements**:
  - `human-judgment` TR-4.1: 交易税费显示为所有交易记录费用总和
  - `human-judgment` TR-4.2: 统计卡片显示正确的汇总数据
  - `human-judgment` TR-4.3: 新增交易记录后统计数据自动更新

## [x] Task 5: 详情按钮从图标改为文字"明细"
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 修改列表操作列中的详情按钮
  - 将 Eye 图标替换为文字"明细"
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `human-judgment` TR-5.1: 详情按钮显示为文字"明细"

## [x] Task 6: 构建验证
- **Priority**: medium
- **Depends On**: All previous tasks
- **Description**: 
  - 运行 npm run build 验证代码正确性
- **Acceptance Criteria Addressed**: All
- **Test Requirements**:
  - `programmatic` TR-6.1: 构建成功无错误
