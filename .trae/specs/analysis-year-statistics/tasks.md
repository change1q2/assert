# 统计分析页面 - 年统计模式 - 实施计划

## [x] Task 1: 实现年统计模式顶部布局（年份选择+收支卡片）
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 实现年份选择器（今年、去年、2024、2023）
  - 实现年度收支卡片（年支出、年收入、年结余）
- **Acceptance Criteria Addressed**: 年统计模式 - 顶部时间周期切换, 年统计模式 - 年度收支卡片
- **Test Requirements**:
  - `human-judgement` TR-1.1: 年份选择器显示正确
  - `human-judgement` TR-1.2: 收支卡片显示正确数据
- **Notes**: 参考月统计模式的实现

## [x] Task 2: 实现收支统计柱状图和收支热力日历
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 实现年度各月收支统计柱状图
  - 支持支出/收入/结余切换
  - 实现收支热力日历图
- **Acceptance Criteria Addressed**: 年统计模式 - 收支统计柱状图, 年统计模式 - 收支热力日历
- **Test Requirements**:
  - `human-judgement` TR-2.1: 柱状图显示12个月数据
  - `human-judgement` TR-2.2: 热力日历显示正确
- **Notes**: 使用recharts的BarChart和自定义热力日历

## [x] Task 3: 实现资产走势和收支对比桑基图
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - 实现年度资产走势面积图
  - 实现收支对比桑基图
  - 支持一级分类/全部切换
- **Acceptance Criteria Addressed**: 年统计模式 - 资产走势, 年统计模式 - 收支对比桑基图
- **Test Requirements**:
  - `human-judgement` TR-3.1: 资产走势图表显示正确
  - `human-judgement` TR-3.2: 收支对比桑基图显示正确
- **Notes**: 使用recharts的AreaChart和Sankey

## [x] Task 4: 实现支出占比饼图（文字居中）和支出数据列表
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - 实现支出占比空心饼图
  - 饼图文字居中显示（分类+百分比）
  - 实现"显示收支金额"复选框
  - 实现支出数据列表（分类、笔数、占比、金额、同比）
- **Acceptance Criteria Addressed**: 年统计模式 - 支出占比空心饼图, 年统计模式 - 支出数据列表, 所有饼图文字居中
- **Test Requirements**:
  - `human-judgement` TR-4.1: 饼图文字居中显示
  - `human-judgement` TR-4.2: 支出数据列表显示正确
- **Notes**: 使用recharts的PieChart

## [x] Task 5: 实现报表统计表格
- **Priority**: medium
- **Depends On**: Task 4
- **Description**:
  - 实现报表统计表格
  - 显示每月的收入、支出、结余数据
- **Acceptance Criteria Addressed**: 年统计模式 - 报表统计表
- **Test Requirements**:
  - `human-judgement` TR-5.1: 报表统计表显示正确
- **Notes**: 表格形式展示

## [x] Task 6: 实现标签占比饼图（文字居中）和标签数据列表
- **Priority**: high
- **Depends On**: Task 5
- **Description**:
  - 实现标签占比空心饼图
  - 饼图文字居中显示
  - 实现"所有标签"下拉框
  - 实现标签数据列表（标签、笔数、支出、收入）
- **Acceptance Criteria Addressed**: 年统计模式 - 标签占比空心饼图, 年统计模式 - 标签数据列表
- **Test Requirements**:
  - `human-judgement` TR-6.1: 标签占比饼图文字居中
  - `human-judgement` TR-6.2: 标签数据列表显示正确
- **Notes**: 使用recharts的PieChart

## [x] Task 7: 实现年度总结
- **Priority**: medium
- **Depends On**: Task 6
- **Description**:
  - 实现年度总结编辑区域
  - 支持编辑和保存
  - 数据保存到localStorage
- **Acceptance Criteria Addressed**: 年统计模式 - 年度总结
- **Test Requirements**:
  - `human-judgement` TR-7.1: 年度总结可编辑
  - `human-judgement` TR-7.2: 保存后数据持久化
- **Notes**: 参考月统计的本月总结实现

## [x] Task 8: 修复所有饼图文字居中问题
- **Priority**: high
- **Depends On**: Task 4, Task 6
- **Description**:
  - 修复月统计模式的所有饼图文字居中
  - 修复自定义模式的所有饼图文字居中
  - 确保所有饼图（支出占比、标签占比等）文字都在中间显示
- **Acceptance Criteria Addressed**: 所有饼图文字居中
- **Test Requirements**:
  - `human-judgement` TR-8.1: 月统计饼图文字居中
  - `human-judgement` TR-8.2: 自定义模式饼图文字居中
- **Notes**: 统一修改所有PieChart组件

## [x] Task 9: 验证构建和启动服务
- **Priority**: high
- **Depends On**: Task 7, Task 8
- **Description**: 运行npm run build验证构建成功，启动前后端服务
- **Acceptance Criteria Addressed**: 全部
- **Test Requirements**:
  - `programmatic` TR-9.1: npm run build构建成功
  - `human-judgement` TR-9.2: 开发服务器可访问
- **Notes**: 启动后端3000端口，前端4173端口