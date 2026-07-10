# 统计分析页面日常视图优化 - 实施计划

## [x] Task 1: 计算本日和本周统计数据
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 添加 todayStats 变量，计算当日支出、收入、结余
  - 添加 weekStats 变量，计算本周每天的支出和收入数据
  - 计算逻辑基于 records 数据和日期筛选
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `human-judgement` TR-1.1: 本日统计数据正确显示当日金额
  - `human-judgement` TR-1.2: 本周统计数据包含周一至周日的数据

## [x] Task 2: 创建日常视图专用组件 renderDailyAnalysis
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 创建 renderDailyAnalysis() 函数，专门处理日常视图
  - 第一行显示本日支出、本日收入、本日结余三个卡片
  - 第二行显示本周统计柱状图，支持支出/收入切换
  - 第三行显示预算占比环形图（前端模拟数据）
  - 第四行显示标签数据列表
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `human-judgement` TR-2.1: 日常视图布局符合参考图片
  - `human-judgement` TR-2.2: 本周统计图表支持支出/收入切换

## [x] Task 3: 修改时间模式渲染逻辑
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 修改第1738行的三元表达式，添加 timeMode === 'day' 的判断
  - 日常模式调用 renderDailyAnalysis()
  - 月统计模式保持原有默认视图
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgement` TR-3.1: 日常视图只显示四个模块
  - `human-judgement` TR-3.2: 月统计视图保持原有功能

## [x] Task 4: 构建验证与浏览器测试
- **Priority**: high
- **Depends On**: Task 1, 2, 3
- **Description**: 
  - 运行 npm run build 确保无构建错误
  - 在浏览器中验证日常视图的所有功能
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-4.1: npm run build 退出码为 0
  - `human-judgement` TR-4.2: 浏览器中日常视图所有功能正常
