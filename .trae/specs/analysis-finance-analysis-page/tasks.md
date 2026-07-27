# Tasks

- [x] Task 1: 修改理财模块 Tab 点击行为（内嵌展示）
  - [x] 修改 Analysis.jsx 中 Tab 点击逻辑：当 tab.value === 'finance' 时，仅 setAnalysisTab，不调用 onNavigate
  - [x] 保留 onNavigate 逻辑用于 'independent-assets' 和 'debts'
  - [x] 在 analysisTab === 'finance' 时，渲染新的理财分析内容区域

- [x] Task 2: 实现 XIRR 计算工具函数
  - [x] 在 FinanceAnalysis.jsx 中新增 `calculateXIRR(cashflows)` 函数
  - [x] 输入格式：`[{ date: 'YYYY-MM-DD', amount: number }]`，amount 正为流入、负为流出
  - [x] 使用 Newton-Raphson 迭代，初始猜测值 0.1，最大迭代 100 次，容差 1e-7
  - [x] 返回年化 IRR 百分比，无法收敛时返回 null
  - [x] 新增 `daysBetween(d1, d2)` 辅助函数

- [x] Task 3: 实现顶部统计卡片
  - [x] 从 stateData.financeAssets 提取数据，计算总市值、总成本、持仓收益、持仓收益率
  - [x] 收集所有资产的现金流（买入负、卖出正、分红正），追加当前市值作为终值正现金流
  - [x] 调用 calculateXIRR 计算组合年化 IRR
  - [x] 渲染 5 张统计卡片，使用 Tailwind 样式

- [x] Task 4: 实现资产 IRR 明细列表
  - [x] 对每个 financeAssets 项单独提取 transactions 现金流
  - [x] 追加当前市值作为终值现金流（日期为今天）
  - [x] 调用 calculateXIRR 计算单资产 IRR
  - [x] 渲染表格：名称、代码、当前市值、总成本、持仓收益、持仓收益率、分红总额、IRR
  - [x] 无数据或 IRR 无法收敛时显示「—」

- [x] Task 5: 实现基准对比区域
  - [x] 前端内置 CPI 月度同比数据（2020-01 起，数组格式）
  - [x] 实现 `getCpiCumulativeReturn(startDate, endDate)`：计算期间 CPI 累计复合涨幅
  - [x] 调用 `/api/finance/index-history?code=000300.SH&count=300` 获取沪深300 历史数据
  - [x] 实现指数期间累计涨跌幅计算
  - [x] 渲染对比图表（柱状图），展示组合持仓收益率、组合 IRR、CPI、沪深300

- [x] Task 6: 构建验证与浏览器测试
  - [x] npm run build 成功无报错
  - [x] 代码审查确认 Tab 切换、统计卡片、IRR 列表、基准对比均正确实现

# Task Dependencies
- Task 2 为前置工具函数，Task 3/4/5 依赖 Task 2
- Task 3/4/5 可并行开发
- Task 6 依赖所有前置任务
