# 统计分析页面重构 - 实现计划

## [ ] Task 1: 创建时间周期切换组件
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 创建日常/月统计/年统计/自定义四个切换按钮组件
  - 实现日期范围选择器（日常模式）、年月选择器（月统计模式）、年份选择器（年统计模式）
  - 将账本选择改为下拉多选样式，支持全选/取消全选
  - 添加模块设置按钮
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3, AC-5, AC-6]
- **Test Requirements**:
  - `human-judgment` TR-1.1: 时间周期切换按钮功能正常，点击切换后页面内容随之变化
  - `human-judgment` TR-1.2: 日期选择器根据时间周期正确显示（日常显示日期范围，月统计显示年月，年统计显示年份）
  - `human-judgment` TR-1.3: 账本下拉多选功能正常，支持全选/取消全选
- **Notes**: 需要先查看现有代码结构，确保与现有组件风格一致

## [ ] Task 2: 实现日常模式页面（总收支卡片 + 收支走势折线图 + 资产走势面积图）
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 实现总支出/总收入/总结余统计卡片（蓝色背景，展示金额）
  - 实现收支走势折线图（支出红色、收入绿色）
  - 实现资产走势面积图（渐变填充）
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `human-judgment` TR-2.1: 总收支卡片正确显示支出、收入、结余金额
  - `human-judgment` TR-2.2: 收支走势折线图正确展示支出和收入趋势
  - `human-judgment` TR-2.3: 资产走势面积图正确展示资产变化趋势
- **Notes**: 使用recharts库实现图表，参考设计图片配色

## [ ] Task 3: 实现日常模式页面（收支对比桑基图 + 支出占比饼图）
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 实现收支对比桑基图（流向图，展示支出流向各分类）
  - 实现支出占比空心饼图（支持一级分类/全部切换）
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `human-judgment` TR-3.1: 收支对比桑基图正确展示支出流向
  - `human-judgment` TR-3.2: 支出占比饼图正确展示各分类占比，切换一级分类/全部正常工作
- **Notes**: 桑基图需要自定义实现或使用专门的桑基图组件

## [ ] Task 4: 实现日常模式页面（支出数据列表 + 标签占比 + 标签数据）
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 实现支出数据列表（按分类显示，带图标和金额）
  - 实现标签占比空心饼图
  - 实现标签数据列表（按标签分组显示收支）
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `human-judgment` TR-4.1: 支出数据列表正确显示各分类支出金额和笔数
  - `human-judgment` TR-4.2: 标签占比饼图正确展示各标签占比
  - `human-judgment` TR-4.3: 标签数据列表正确显示各标签收支统计
- **Notes**: 需要处理分类图标和标签数据的关联

## [ ] Task 5: 实现月统计模式页面（收支统计柱状图 + 收支热力日历图 + 报表统计）
- **Priority**: high
- **Depends On**: Task 4
- **Description**: 
  - 实现收支统计柱状图（按日统计，支持支出/收入/结余切换）
  - 实现收支热力日历图（显示每日收支热度）
  - 实现报表统计表（日期、收入、支出、结余）
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `human-judgment` TR-5.1: 收支统计柱状图正确展示每日收支数据
  - `human-judgment` TR-5.2: 收支热力日历图正确显示每日收支热度
  - `human-judgment` TR-5.3: 报表统计表正确展示每日收支数据
- **Notes**: 热力日历图需要自定义实现

## [ ] Task 6: 实现年统计模式页面（收支统计柱状图 + 报表统计 + 总结区域）
- **Priority**: high
- **Depends On**: Task 5
- **Description**: 
  - 实现收支统计柱状图（按月统计）
  - 实现报表统计表（月份、收入、支出、结余）
  - 实现本月总结/年度总结输入区域
- **Acceptance Criteria Addressed**: [AC-2, AC-3]
- **Test Requirements**:
  - `human-judgment` TR-6.1: 年统计收支柱状图正确展示每月收支数据
  - `human-judgment` TR-6.2: 年统计报表统计表正确展示每月收支数据
  - `human-judgment` TR-6.3: 总结输入区域功能正常
- **Notes**: 总结内容需要保存到localStorage

## [ ] Task 7: 实现预算和目标功能
- **Priority**: high
- **Depends On**: Task 4
- **Description**: 
  - 实现预算占比卡片（显示各分类预算分配）
  - 实现预算设置模态框（支持按分类设置月度/年度预算）
  - 实现预算执行进度展示
- **Acceptance Criteria Addressed**: [AC-4]
- **Test Requirements**:
  - `human-judgment` TR-7.1: 预算占比卡片正确显示各分类预算分配
  - `human-judgment` TR-7.2: 预算设置模态框支持添加和修改预算
  - `human-judgment` TR-7.3: 预算执行进度正确计算和展示
- **Notes**: 预算数据存储在localStorage中

## [ ] Task 8: 实现模块设置功能
- **Priority**: medium
- **Depends On**: Task 7
- **Description**: 
  - 实现模块设置面板（支持勾选/取消勾选显示的卡片）
  - 实现设置保存到localStorage
  - 实现页面加载时读取设置并应用
- **Acceptance Criteria Addressed**: [AC-6]
- **Test Requirements**:
  - `human-judgment` TR-8.1: 模块设置面板正确显示所有可配置卡片
  - `human-judgment` TR-8.2: 设置保存后页面实时更新
  - `human-judgment` TR-8.3: 刷新页面后设置保持生效
- **Notes**: 需要定义模块配置数据结构

## [ ] Task 9: 验证构建和运行
- **Priority**: high
- **Depends On**: Task 8
- **Description**: 
  - 运行npm run build验证构建是否成功
  - 启动开发服务器验证页面功能
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3, AC-4, AC-5, AC-6]
- **Test Requirements**:
  - `programmatic` TR-9.1: npm run build命令执行成功，exit code为0
  - `human-judgment` TR-9.2: 开发服务器启动成功，页面正常显示
- **Notes**: 确保所有代码没有语法错误