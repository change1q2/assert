# 资产分类对比饼图与独立资产总成本模块 - 实现计划

## [x] Task 1: 独立资产页面增加总成本统计计算
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 IndependentAssets.jsx 的 `summaryData` useMemo 中增加 `totalCost` 计算逻辑
  - 各类资产的成本字段：保险(premiumTotal)、房产(purchasePrice)、车辆(purchasePrice)、固定投资(investmentCost)、股权(investmentCost)、定期存款(amount)
- **Acceptance Criteria Addressed**: AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-1.1: summaryData 返回 totalCost 字段，值为各类独立资产成本之和
  - `human-judgement` TR-1.2: 检查各类资产成本字段映射是否合理

## [x] Task 2: 独立资产页面新增总成本卡片
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 在 `renderSummaryCards` 函数中新增一张「总成本」卡片
  - 样式与现有卡片保持一致，使用橙色渐变背景
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgement` TR-2.1: 页面显示四张卡片（总价值、总成本、演示收益、实际收益），样式统一
  - `human-judgement` TR-2.2: 总成本数值与实际数据一致

## [x] Task 3: 统计分析页面提取资产分类数据
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 Analysis.jsx 中从 stateData 提取 financeAssets 和 independentAssets
  - 计算理财资产总市值(sum currentValue)、理财资产总成本(sum cost)
  - 计算独立资产总价值和总成本（复用独立资产页面的计算逻辑）
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-4
- **Test Requirements**:
  - `programmatic` TR-3.1: 理财资产总市值 = sum(financeAssets.currentValue)
  - `programmatic` TR-3.2: 理财资产总成本 = sum(financeAssets.cost)
  - `programmatic` TR-3.3: 独立资产总价值和总成本计算逻辑与 IndependentAssets.jsx 一致

## [x] Task 4: 统计分析页面增加资产分类对比饼图
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 在 Analysis.jsx 的收支分析区域附近新增资产分类对比区域
  - 创建两个饼图：总市值对比（理财资产 vs 独立资产）、总成本对比（理财资产 vs 独立资产）
  - 使用 Recharts PieChart 组件，与现有饼图样式保持一致
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `human-judgement` TR-4.1: 饼图正常渲染，显示理财资产和独立资产两个扇区
  - `human-judgement` TR-4.2: 鼠标悬停显示具体数值和占比
  - `human-judgement` TR-4.3: 无数据时显示友好提示

## [x] Task 5: 构建验证
- **Priority**: high
- **Depends On**: Task 2, Task 4
- **Description**: 
  - 运行 npm run build 验证代码无语法错误
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `programmatic` TR-5.1: npm run build 成功，无报错
