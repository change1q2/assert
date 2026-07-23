# Tasks

- [x] Task 1: 修改债务环比趋势X轴显示年月格式
  - [x] SubTask 1.1: 修改monthlyTrend数据结构，将month字段从"1月"改为"2026-01"格式
  - [x] SubTask 1.2: 更新XAxis的dataKey绑定到新的年月字段

- [x] Task 2: 删除债务同比对比的环比增长指标
  - [x] SubTask 2.1: 删除compareData中的mom计算逻辑
  - [x] SubTask 2.2: 删除图表下方环比增长的显示div
  - [x] SubTask 2.3: 保留同比增长的显示

- [x] Task 3: 新增总借出卡片
  - [x] SubTask 3.1: 在debtMetrics中计算totalLent（type为"借出"或"应收"的债务总和）
  - [x] SubTask 3.2: 在卡片网格中债务总本金后添加总借出卡片
  - [x] SubTask 3.3: 调整卡片布局为5列（grid-cols-5）或保持4列换行

- [x] Task 4: 债务类型分布改用饼图
  - [x] SubTask 4.1: 导入PieChart和Pie组件
  - [x] SubTask 4.2: 将BarChart替换为PieChart
  - [x] SubTask 4.3: 添加Label显示类别名称和百分比

- [x] Task 5: 本月待还账单汇总功能
  - [x] SubTask 5.1: 创建currentMonthRepayments计算函数，提取所有债务的还款计划
  - [x] SubTask 5.2: 筛选本月需要还款的记录
  - [x] SubTask 5.3: 计算本月待还总额
  - [x] SubTask 5.4: 更新UI显示本月待还账单列表和总额

- [x] Task 6: 构建验证
  - [x] SubTask 6.1: 运行npm run build确保无编译错误

# Task Dependencies
- [Task 2] 独立任务，无依赖
- [Task 3] 独立任务，无依赖
- [Task 4] 独立任务，无依赖
- [Task 5] 依赖Task 1（需要完整的年月格式）
- [Task 6] 依赖所有任务完成