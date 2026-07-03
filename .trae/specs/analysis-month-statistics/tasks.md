# 统计分析页面 - 月统计模式重构 - 实现计划

## [ ] Task 1: 实现时间周期切换组件（日常/月统计/年统计/自定义）
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 实现顶部时间周期切换按钮，样式参考设计图片
  - 默认选中月统计模式
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `human-judgement` TR-1.1: 四个切换按钮显示在页面顶部
  - `human-judgement` TR-1.2: 点击按钮切换到对应模式
- **Notes**: 参考设计图片的样式

## [x] Task 2: 实现年份选择和月份切换功能
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 实现年份选择器（如2026）
  - 实现月份切换按钮（本月、上月、5月、4月等）
  - 根据选择的年月筛选数据
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `human-judgement` TR-2.1: 年份选择器显示正确
  - `human-judgement` TR-2.2: 月份切换按钮功能正常
- **Notes**: 参考设计图片的样式

## [ ] Task 3: 实现收支统计卡片（月支出、月收入、月结余）
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 实现三个统计卡片：月支出、月收入、月结余
  - 显示真实数据，样式参考设计图片
- **Acceptance Criteria Addressed**: [AC-3]
- **Test Requirements**:
  - `human-judgement` TR-3.1: 三个卡片显示正确
  - `human-judgement` TR-3.2: 数据计算正确
- **Notes**: 参考设计图片的样式

## [ ] Task 4: 实现收支统计柱状图（支持支出/收入/结余切换）
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 实现收支统计柱状图
  - 支持支出/收入/结余三个标签切换
  - 使用recharts的BarChart组件
- **Acceptance Criteria Addressed**: [AC-4]
- **Test Requirements**:
  - `human-judgement` TR-4.1: 柱状图显示正确
  - `human-judgement` TR-4.2: 切换标签数据更新
- **Notes**: 使用recharts图表库

## [ ] Task 5: 实现资产走势和收支对比图表
- **Priority**: high
- **Depends On**: Task 4
- **Description**: 
  - 实现资产走势面积图
  - 实现收支对比（一级分类/全部切换）
- **Acceptance Criteria Addressed**: [AC-5, AC-6]
- **Test Requirements**:
  - `human-judgement` TR-5.1: 资产走势图表显示正确
  - `human-judgement` TR-5.2: 收支对比功能正常
- **Notes**: 使用recharts图表库

## [ ] Task 6: 实现支出占比（空心饼图）和支出数据列表
- **Priority**: high
- **Depends On**: Task 5
- **Description**: 
  - 实现支出占比空心饼图（一级分类/全部切换）
  - 实现支出数据列表（分类、金额、占比、同比）
- **Acceptance Criteria Addressed**: [AC-7, AC-8]
- **Test Requirements**:
  - `human-judgement` TR-6.1: 空心饼图显示正确
  - `human-judgement` TR-6.2: 支出数据列表显示正确
- **Notes**: 使用recharts的PieChart组件，设置innerRadius

## [ ] Task 7: 实现报表统计、标签占比、标签数据和本月总结
- **Priority**: high
- **Depends On**: Task 6
- **Description**: 
  - 实现报表统计表（日期、收入、支出、结余）
  - 实现标签占比空心饼图
  - 实现标签数据列表
  - 实现本月总结（可编辑，保存到localStorage）
- **Acceptance Criteria Addressed**: [AC-9, AC-10, AC-11]
- **Test Requirements**:
  - `human-judgement` TR-7.1: 报表统计表显示正确
  - `human-judgement` TR-7.2: 标签占比和标签数据显示正确
  - `human-judgement` TR-7.3: 本月总结可编辑
- **Notes**: 使用recharts图表库

## [ ] Task 8: 验证构建和运行
- **Priority**: high
- **Depends On**: Task 7
- **Description**: 运行npm run build验证项目构建成功，启动开发服务器验证页面效果
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11]
- **Test Requirements**:
  - `programmatic` TR-8.1: npm run build构建成功，exit code 0
  - `human-judgement` TR-8.2: 开发服务器启动成功，页面可正常访问
- **Notes**: 构建成功后启动开发服务器