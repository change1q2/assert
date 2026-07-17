# 资产穿透增强功能 - 实施计划

## [x] Task 1: 仓位分析改为热力图显示
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 将仓位分析区域的饼图改为热力图显示
  - 热力图数据基于 financeAccounts 中各资产的仓位占比（currentValue / totalValue）
  - 使用 SVG 绘制热力图，颜色从浅到深对应占比大小
  - 支持点击交互，显示资产名称和占比详情
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgment` TR-1.1: 勾选仓位分析后显示热力图
  - `human-judgment` TR-1.2: 热力图颜色深浅与仓位占比对应
  - `programmatic` TR-1.3: 构建成功

## [x] Task 2: 仓位分析勾选时右侧数据联动
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 当勾选仓位分析时，右侧收益率和收益额区域显示选中分类的汇总数据
  - 计算选中分类的 totalValue、totalCost、totalPnl、totalPnlRate
  - 在 analysisView 切换时保持联动数据更新
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgment` TR-2.1: 勾选仓位分析后右侧数据跟随变化
  - `human-judgment` TR-2.2: 切换收益率/盈亏金额/总资产视图时数据正确更新
  - `programmatic` TR-2.3: 构建成功

## [x] Task 3: 极值分析显示最大收益率和最大回撤
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 实现极值分析功能，显示历史最大收益率和最大回撤
  - 从 indexHistoryData 中计算最大收益率（单日涨幅最大）
  - 从 indexHistoryData 中计算最大回撤（从最高点到最低点的跌幅）
  - 显示极值数值和对应的日期信息
- **Acceptance Criteria Addressed**: AC-3, AC-4
- **Test Requirements**:
  - `human-judgment` TR-3.1: 勾选极值分析后显示最大收益率
  - `human-judgment` TR-3.2: 勾选极值分析后显示最大回撤
  - `programmatic` TR-3.3: 构建成功

## [x] Task 4: 标记买卖点改为资产类型柱状图
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 将"标记买卖点"选项改为"资产类型"
  - 按 assetType 分组统计各类型的涨跌情况
  - 使用 SVG 绘制柱状图，显示每个类型的市值和涨跌额
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgment` TR-4.1: 选项名称改为"资产类型"
  - `human-judgment` TR-4.2: 勾选后显示按资产类型分组的柱状图
  - `programmatic` TR-4.3: 构建成功

## [x] Task 5: 标签分析改为资产分析柱状图
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 将"标签分析"选项改为"资产分析"
  - 按 categoryL1（一级分类）分组统计各分类的市值
  - 使用 SVG 绘制柱状图，显示每个一级分类的市值
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `human-judgment` TR-5.1: 选项名称改为"资产分析"
  - `human-judgment` TR-5.2: 勾选后显示按一级分类分组的市值柱状图
  - `programmatic` TR-5.3: 构建成功

## [x] Task 6: 增加百度财经备用数据源
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 在 fetchFinanceQuotes 或相关数据获取逻辑中增加百度财经数据源
  - 当主数据源（新浪财经）返回数据不全时，自动从百度财经获取补充
  - 解析百度财经的股票数据格式
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `human-judgment` TR-6.1: 主数据源数据不全时自动使用备用数据源
  - `programmatic` TR-6.2: 构建成功

## [x] Task 7: 构建测试与验证
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3, Task 4, Task 5, Task 6
- **Description**: 
  - 前端执行 `npm run build` 确认构建成功
  - 检查所有修改的组件无编译错误
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `programmatic` TR-7.1: `npm run build` 退出码为 0

# Task Dependencies
- Task 2 depends on Task 1
- Task 7 depends on Task 1, Task 2, Task 3, Task 4, Task 5, Task 6