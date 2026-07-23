# Tasks

- [x] Task 1: 移除总资产切换按钮及关联渲染
  - [x] SubTask 1.1: 将收益分析顶部按钮数组从 `['rate', 'amount', 'asset']` 改为 `['rate', 'amount']`
  - [x] SubTask 1.2: 移除 `analysisView === 'asset'` 的所有渲染分支（右边面板 `selectedPositionItem` 区域、全局汇总区域）
  - [x] SubTask 1.3: 将 `analysisView` 默认值保持为 `'rate'`

- [x] Task 2: 仓位分析饼图按 categoryL1 分组并支持下钻
  - [x] SubTask 2.1: 修改 `drilldownPieData` useMemo，当 `drillDownPath.length === 0` 时按 `categoryL1` 分组统计
  - [x] SubTask 2.2: 当 `drillDownPath.length === 1` 时，过滤出该 `categoryL1` 下的资产，按 `assetType` 分组统计
  - [x] SubTask 2.3: 饼图数值根据 `analysisView` 切换：`rate` 模式用加权收益率，`amount` 模式用盈亏金额
  - [x] SubTask 2.4: 饼图扇区点击事件保持现有下钻逻辑（更新 `drillDownPath`）
  - [x] SubTask 2.5: 面包屑导航和返回按钮保持现有逻辑

- [x] Task 3: 极值分析支持率/金额双模式
  - [x] SubTask 3.1: 当 `analysisView === 'rate'` 时，保持现有最大收益率计算和展示
  - [x] SubTask 3.2: 当 `analysisView === 'amount'` 时，计算并显示最大盈亏金额（从 `financeAccounts` 的 `holdingPnl` 取最大值）
  - [x] SubTask 3.3: 走势图数据随 `analysisView` 切换（rate 用收益率序列，amount 用盈亏金额序列）

- [x] Task 4: 最大回撤支持率/金额双模式
  - [x] SubTask 4.1: 当 `analysisView === 'rate'` 时，保持现有最大回撤率计算
  - [x] SubTask 4.2: 当 `analysisView === 'amount'` 时，计算最大回撤金额（从累计盈亏金额序列计算峰值到谷值的最大差额）

- [x] Task 5: 操作分析模块重构——移除按钮并基于真实数据计算
  - [x] SubTask 5.1: 移除操作分析模块顶部的"操作统计"和"账户表现"两个按钮
  - [x] SubTask 5.2: 交易股票数保持 `financeAccounts.length`
  - [x] SubTask 5.3: 平均持仓天数：遍历 `financeAccounts`，取每个资产的 `transactions` 最早日期到当前日期的天数差，求平均
  - [x] SubTask 5.4: 建清仓次数：遍历所有 `transactions`，统计买入/卖出次数
  - [x] SubTask 5.5: 交易成功率：统计有卖出记录的交易中盈利次数占比
  - [x] SubTask 5.6: 平均仓位：当前持仓总市值 / 历史最大投入本金 × 100%
  - [x] SubTask 5.7: 资金周转率：累计卖出金额 / 当前持仓总市值
  - [x] SubTask 5.8: 移除雷达图（业绩评分）的静态假数据，改为基于真实数据计算或直接移除该图表

- [x] Task 6: 操作分析添加公式说明按钮
  - [x] SubTask 6.1: 在操作分析模块右上角添加 `?` 图标按钮（使用 `HelpCircle` 或 `Info` 图标）
  - [x] SubTask 6.2: 实现 tooltip/弹窗组件，列出每个指标的名称和计算公式
  - [x] SubTask 6.3: 公式内容：交易股票数、平均持仓天数、建清仓次数、交易成功率、平均仓位、资金周转率

# Task Dependencies
- Task 2 依赖 Task 1（需要先确定 analysisView 只有两个值）
- Task 3 依赖 Task 1
- Task 4 依赖 Task 1
- Task 5 和 Task 6 可独立执行，与其他任务无依赖
