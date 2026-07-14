# 持仓明细列表整合与汇总卡片 - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: 持仓明细改为单一列表
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 移除按资产分类分组的显示逻辑（categoryNames.map 和 CategoryTable 组件）
  - 将所有持仓数据显示在一个表格中
  - 保留原有的筛选、搜索、分页、列设置功能
  - 保留原有的编辑和删除操作
  - 参考 CategoryTable 组件的结构，创建单一列表
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-1.1: 所有持仓资产显示在一个表格中，不再按资产分类分组
  - `human-judgement` TR-1.2: 列表上方显示筛选条件和搜索框
  - `human-judgement` TR-1.3: 编辑和删除操作正常工作
- **Notes**: 需要修改 1786-1803 行的渲染逻辑，将分类分组改为单一列表

## [x] Task 2: 添加汇总卡片组件
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 在持仓明细列表下方添加汇总卡片
  - 汇总卡片包含：总市值、总成本、总盈亏、总收益率、当日收益、当日收益率
  - 卡片样式参考账户卡片（AccountCard）
  - 盈亏数字按正负显示不同颜色（绿色为正，红色为负）
  - 收益率显示为百分比格式
- **Acceptance Criteria Addressed**: AC-2, AC-5
- **Test Requirements**:
  - `human-judgement` TR-2.1: 汇总卡片显示在持仓明细列表下方
  - `human-judgement` TR-2.2: 卡片包含所有要求的字段
  - `human-judgement` TR-2.3: 卡片样式与账户卡片一致
  - `human-judgement` TR-2.4: 正数显示绿色，负数显示红色
- **Notes**: 可以参考 AccountCard 组件的样式和结构

## [x] Task 3: 汇总数据计算逻辑
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**: 
  - 计算汇总数据：总市值、总成本、总盈亏、总收益率、当日收益、当日收益率
  - 总收益率 = 总盈亏 ÷ 总成本 × 100%
  - 当日收益率 = 当日收益 ÷ 总成本 × 100%
  - 处理总成本为 0 的情况（避免除以 0）
  - 汇总数据基于 computed.financeAccounts（已筛选的数据）
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgement` TR-3.1: 总市值 = 所有持仓 currentValue 之和
  - `human-judgement` TR-3.2: 总成本 = 所有持仓 cost 之和
  - `human-judgement` TR-3.3: 总盈亏 = 所有持仓 holdingPnl 之和
  - `human-judgement` TR-3.4: 总收益率和当日收益率计算正确
  - `human-judgement` TR-3.5: 总成本为 0 时不报错
- **Notes**: 需要在 computed 中添加汇总计算逻辑

## [x] Task 4: 汇总数据动态更新
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 确保筛选条件变化时，汇总卡片数据自动更新
  - 确保分页不影响汇总数据（汇总所有符合筛选条件的数据）
  - 确保新增/编辑/删除持仓后，汇总卡片数据自动更新
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgement` TR-4.1: 应用筛选条件后，汇总卡片数据更新
  - `human-judgement` TR-4.2: 分页切换时，汇总数据不变
  - `human-judgement` TR-4.3: 新增/编辑/删除持仓后，汇总数据更新
- **Notes**: computed.financeAccounts 已包含筛选逻辑，只需确保汇总计算依赖正确

## [x] Task 5: 构建与功能验证
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3, Task 4
- **Description**: 
  - 运行 `npm run build` 确保无构建错误
  - 浏览器端到端验证各项功能
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `programmatic` TR-5.1: npm run build 构建成功，exit code 为 0
  - `human-judgement` TR-5.2: 浏览器手动验证所有 AC 检查点通过
