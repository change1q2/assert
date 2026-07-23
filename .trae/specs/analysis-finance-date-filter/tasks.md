# Tasks

- [x] Task 1: Analysis.jsx 中将日期筛选状态传递给 FinanceAnalysis
  - [x] SubTask 1.1: 将 `timeMode`、`startDate`、`endDate`、`selectedYear`、`selectedMonth` 作为 props 传递给 FinanceAnalysis
  - [x] SubTask 1.2: 在 FinanceAnalysis 组件中添加 `dateRange` prop 解构

- [x] Task 2: FinanceAnalysis.jsx 接收并使用日期筛选参数
  - [x] SubTask 2.1: 接收 `timeMode`、`startDate`、`endDate`、`selectedYear`、`selectedMonth` props
  - [x] SubTask 2.2: 添加 `todayStr` 计算逻辑，根据筛选模式确定 `todayStr`（非当天时取筛选结束日期）
  - [x] SubTask 2.3: 过滤 `financeAssets.transactions`，只保留筛选日期范围内的交易记录
  - [x] SubTask 2.4: 筛选后的交易记录参与成本、收益、IRR 计算

- [x] Task 3: 非今日截止日期时的市值处理
  - [x] SubTask 3.1: 当 `todayStr` 不是实际今日时，使用原始 `financeAssets` 数据而非实时行情更新的 `updatedAssets`
  - [x] SubTask 3.2: 避免用今天的实时价格计算历史截止日期的市值

- [x] Task 4: 理财模块顶部日期筛选状态展示
  - [x] SubTask 4.1: 在理财模块标题下方添加日期筛选状态展示区域
  - [x] SubTask 4.2: 显示当前模式（日常/月统计/年统计/自定义）和对应日期范围

- [x] Task 5: 构建验证与测试
  - [x] SubTask 5.1: `npm run build` 成功无报错
  - [x] SubTask 5.2: 切换收支分析的日期模式后，切换到理财模块验证数据是否正确变化

# Task Dependencies
- Task 1 为前置任务，Task 2/3/4 依赖 Task 1
- Task 2 为 Task 3 的前置
- Task 5 依赖所有前置任务
