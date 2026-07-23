# 理财分析按一级分类聚合与术语统一 - 实现计划

## [x] Task 1: 按一级分类聚合资产数据
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 FinanceAnalysis.jsx 中新增 `categoryMetrics` useMemo
  - 按 `categoryL1` 字段将 financeAssets 分组
  - 对每个一级分类计算：当前总市值、总成本、收益额、收益率
- **Acceptance Criteria Addressed**: AC-1（一级分类聚合展示）
- **Test Requirements**:
  - `programmatic` TR-1.1: categoryMetrics 返回按 categoryL1 分组的对象
  - `programmatic` TR-1.2: 每个分类的 totalValue = sum(assets.currentValue)
  - `programmatic` TR-1.3: 每个分类的 totalCost = sum(assets.cost)
  - `programmatic` TR-1.4: 每个分类的 pnl = totalValue - totalCost
  - `programmatic` TR-1.5: 每个分类的 pnlRate = pnl / totalCost × 100%

## [x] Task 2: 计算每个一级分类的 IRR
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 在 categoryMetrics 计算中，为每个一级分类计算 IRR
  - 收集该分类下所有资产的交易现金流（买入为负、卖出/分红为正）
  - 追加当前总市值作为终值
  - 使用 calculateXIRR 函数计算年化收益率
- **Acceptance Criteria Addressed**: AC-1（分类 IRR 计算）
- **Test Requirements**:
  - `programmatic` TR-2.1: 每个分类的 IRR 基于该分类所有资产的现金流计算
  - `programmatic` TR-2.2: 现金流包含买入（负）、卖出（正）、分红（正）和当前市值（正）
  - `programmatic` TR-2.3: IRR 为 null 时显示"—"

## [x] Task 3: 修改资产明细列表展示
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - 将"资产 IRR 明细"表格改为按一级分类展示
  - 表头：一级分类名称、当前总市值、总成本、收益额、收益率、IRR
  - 移除原有"代码"、"分红总额"列
  - 标题改为"资产分类明细"
- **Acceptance Criteria Addressed**: AC-1（聚合展示）
- **Test Requirements**:
  - `human-judgement` TR-3.1: 表格每行对应一个一级分类
  - `human-judgement` TR-3.2: 表头字段正确显示
  - `human-judgement` TR-3.3: 未分类资产归类为"其他"

## [x] Task 4: 统一顶部卡片术语
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 将"持仓收益"卡片标题改为"总盈亏"
  - 将"持仓收益率"卡片标题改为"总收益率"
- **Acceptance Criteria Addressed**: AC-2（术语统一）
- **Test Requirements**:
  - `human-judgement` TR-4.1: 卡片标题显示"总盈亏"而非"持仓收益"
  - `human-judgement` TR-4.2: 卡片标题显示"总收益率"而非"持仓收益率"

## [x] Task 5: 新增数据对比区域
- **Priority**: medium
- **Depends On**: Task 4
- **Description**:
  - 在顶部卡片下方新增"数据对比"区域
  - 左侧显示"统计分析（理财分析）"数据
  - 右侧显示"理财模块"数据（从 Finance.jsx 的 summary 中获取）
  - 对比项：总市值、总成本、总盈亏、总收益率
- **Acceptance Criteria Addressed**: AC-3（数据对比）
- **Test Requirements**:
  - `human-judgement` TR-5.1: 左右对比布局清晰
  - `human-judgement` TR-5.2: 左侧数据来源于 FinanceAnalysis 计算
  - `human-judgement` TR-5.3: 右侧数据来源于理财模块汇总
  - `programmatic` TR-5.4: 左右总市值相等
  - `programmatic` TR-5.5: 左右总成本相等

## [x] Task 6: 构建验证
- **Priority**: high
- **Depends On**: Task 3, Task 5
- **Description**:
  - 运行 npm run build 验证无语法错误
- **Acceptance Criteria Addressed**: 所有 AC
- **Test Requirements**:
  - `programmatic` TR-6.1: npm run build 成功无报错