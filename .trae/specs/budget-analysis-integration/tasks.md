# Tasks

- [x] Task 1: 分析页面预算卡片列表（日视图）
  - [x] SubTask 1.1: 从 stateData 读取真实 budgets 数据，替换硬编码 dailyBudgetData
  - [x] SubTask 1.2: 按 category 聚合 budgets，计算每个一级分类的总预算和总已用
  - [x] SubTask 1.3: 在预算占比饼图下方添加预算卡片列表，每张卡片包含图标、名称、进度条、已用/预算文本、支出金额
  - [x] SubTask 1.4: 进度条颜色规则：<80% 蓝色，80%-100% 橙色，>100% 红色
  - [x] SubTask 1.5: 预算卡片支持点击展开/收起，展开显示该类别下二级分类的预算进度

- [x] Task 2: 预算管理页面趋势图 Tooltip 优化
  - [x] SubTask 2.1: 修改 Tooltip formatter，分别标注 "支出" 和 "剩余"
  - [x] SubTask 2.2: 数值使用千分位格式显示

- [x] Task 3: 月度预算结转逻辑
  - [x] SubTask 3.1: 在 BudgetManagement.jsx 中添加月度结转计算逻辑
  - [x] SubTask 3.2: 计算本月实际支出与预算差额，超支部分从下月预算扣除
  - [x] SubTask 3.3: 当 remaining 为负数时，进度条和文本正确显示负数（如 "-200 / 1000"）
  - [x] SubTask 3.4: 正常结余不累积到下月，每月恢复原始预算金额

- [x] Task 4: 预算管理页面添加分类功能修复
  - [x] SubTask 4.1: 添加分类后 budgets 列表立即刷新显示
  - [x] SubTask 4.2: 总预算金额同步更新

- [x] Task 5: 构建验证
  - [x] SubTask 5.1: 运行 npm run build 确保无构建错误
  - [x] SubTask 5.2: 浏览器中验证所有功能

# Task Dependencies
- Task 1 depends on none
- Task 2 depends on none
- Task 3 depends on none
- Task 4 depends on none
- Task 5 depends on Task 1, 2, 3, 4
