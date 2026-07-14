# 理财模块筛选汇总增强与实时行情 - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: 修改筛选汇总卡片布局和数据项
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 HoldingsSummaryCard 组件：从单行5列改为2行显示
  - 第一行：当前总市值、持仓总成本、持仓总盈亏（3列）
  - 第二行：持仓总收益率、当日总盈亏、当日总收益率（3列）
  - 更新标签文字：当前市值→当前总市值，持仓盈亏→持仓总盈亏，持仓收益率→持仓总收益率，当日盈亏→当日总盈亏，当日收益率→当日总收益率
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `human-judgement` TR-1.1: 筛选汇总卡片显示为2行，第一行3项，第二行3项
  - `human-judgement` TR-1.2: 所有标签文字正确更新（当前总市值、持仓总成本、持仓总盈亏、持仓总收益率、当日总盈亏、当日总收益率）
- **Notes**: 使用 grid-cols-3 布局

## [x] Task 2: 修改持仓总成本和收益率计算公式
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 computed.holdingsSummary 的计算逻辑：
    - totalCost 改为 Σ(持仓成本 × 数量)，即 financeAccounts.reduce((sum, a) => sum + (parseFloat(a.cost) || 0) * (parseFloat(a.quantity) || 0), 0)
    - totalPnlRate = (totalMarketValue - totalCost) / totalCost × 100%（原先是 totalPnl / totalMarketValue）
    - totalDailyPnlRate = totalDailyPnl / totalMarketValue × 100%（保持不变）
  - 修改底部表格合计行的持仓盈亏率计算，同步使用新公式
- **Acceptance Criteria Addressed**: [AC-2, AC-3, AC-4]
- **Test Requirements**:
  - `programmatic` TR-2.1: holdingsSummary.totalCost 的值等于 Σ(cost × quantity)
  - `programmatic` TR-2.2: holdingsSummary.totalPnlRate 的值等于 (totalMarketValue - totalCost) / totalCost × 100，当 totalCost 为 0 时为 0
  - `programmatic` TR-2.3: holdingsSummary.totalDailyPnlRate 的值等于 totalDailyPnl / totalMarketValue × 100，当 totalMarketValue 为 0 时为 0
- **Notes**: 注意除数为0的边界情况

## [x] Task 3: 列表现价使用实时数据并显示涨跌颜色
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 categorizedHoldings 中 currentPrice 的赋值逻辑：优先使用 quotesMap[a.code]?.price，无数据时使用 a.currentPrice
  - 修改 renderCell 函数中 currentPrice 的渲染逻辑：
    - 如果 quotesMap 中存在该代码的 price 和 prevClose：
      - price > prevClose: 绿色
      - price < prevClose: 红色
      - price == prevClose: 默认颜色
    - 无实时数据时保持默认颜色
- **Acceptance Criteria Addressed**: [AC-5, AC-6, AC-7]
- **Test Requirements**:
  - `human-judgement` TR-3.1: 列表现价列显示实时数据（刷新后价格会更新）
  - `human-judgement` TR-3.2: 现价高于昨日收盘价时显示绿色
  - `human-judgement` TR-3.3: 现价低于昨日收盘价时显示红色
  - `human-judgement` TR-3.4: 无实时数据时使用本地数据，颜色为默认值
- **Notes**: 需要确保 quotesMap 中包含 prevClose 字段（后端 getQuotes 已返回）

## [x] Task 4: 当日盈亏使用实时数据计算
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 修改 getDailyPnl 函数：确保使用实时数据计算当日盈亏 = (price - prevClose) × quantity
  - 当前已有逻辑：if (a.code && quotesMap[a.code] && quotesMap[a.code].price != null && quotesMap[a.code].prevClose != null) return (quotesMap[a.code].price - quotesMap[a.code].prevClose) * qty;
  - 确保这个逻辑正确执行并传递到 holdingsSummary.totalDailyPnl
- **Acceptance Criteria Addressed**: [AC-8]
- **Test Requirements**:
  - `programmatic` TR-4.1: 当 quotesMap 中有 price 和 prevClose 时，dailyPnl = (price - prevClose) × quantity
  - `human-judgement` TR-4.2: 当日总盈亏随实时价格变化而更新
- **Notes**: 当前代码已有此逻辑，需确认逻辑正确且数据传递链完整

## [x] Task 5: 构建验证
- **Priority**: high
- **Depends On**: [Task 1, Task 2, Task 3, Task 4]
- **Description**: 
  - 运行 npm run build 确保前端构建无错误
- **Acceptance Criteria Addressed**: [AC-9]
- **Test Requirements**:
  - `programmatic` TR-5.1: npm run build 执行成功，exit code 为 0
- **Notes**:
