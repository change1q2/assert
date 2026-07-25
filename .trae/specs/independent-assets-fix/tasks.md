# 独立资产功能修复与增强 - 实施计划

## [/] Task 1: 修复独立资产数据保存问题
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 检查 `saveState` 调用的参数结构是否正确
  - 确保 `updateAssets` 函数能正确合并数据并保存到后端
  - 检查 `loadData` 函数是否正确从后端加载 `independentAssets` 数据
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: 新增定期资产后调用 `saveState` 应返回成功
  - `programmatic` TR-1.2: 刷新页面后 `fetchState` 返回的数据应包含新添加的资产
- **Notes**: 重点检查 `saveData` 和 `updateAssets` 函数的数据结构

## [ ] Task 2: 定期资产列表增加收益率列
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 修改 `renderFixedDepositTable` 函数，在表格头部添加"预期收益率"和"实际收益率"列
  - 在表格数据行中计算并显示预期收益率（预期收益/金额 * 100%）和实际收益率（实际收益/金额 * 100%）
  - 更新列数（从12列调整为14列）
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgment` TR-2.1: 定期资产表格应显示预期收益率和实际收益率列
  - `programmatic` TR-2.2: 预期收益率计算应为 expectedReturn/amount * 100%
  - `programmatic` TR-2.3: 实际收益率计算应为 actualReturn/amount * 100%

## [ ] Task 3: 修正定期资产账户本计算逻辑
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 修改 `renderAccountsTable` 函数中 `fixeddeposit` 类型的计算逻辑
  - 当前市值 = 金额 + 实际收益
  - 持有成本 = 金额
  - 实际现价 = 当前市值
  - 持有盈亏 = 实际收益
  - 收益率 = 实际收益 / 持有成本 * 100%
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-3.1: 金额10000、实际收益500的定期资产，当前市值应为10500
  - `programmatic` TR-3.2: 持有成本应为10000
  - `programmatic` TR-3.3: 实际现价应为10500
  - `programmatic` TR-3.4: 持有盈亏应为500
  - `programmatic` TR-3.5: 收益率应为5%

## [ ] Task 4: 过滤未关联资产的账户本
- **Priority**: medium
- **Depends On**: Task 1
- **Description**: 
  - 修改 `renderAccountsTable` 函数，确保只有关联了独立资产的账户本才在上方显示
  - 当前代码已有 `usedAccountIds` 逻辑，需要确认该逻辑是否正确工作
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgment` TR-4.1: 未关联任何资产的账户本不应出现在上方账户本区域
  - `programmatic` TR-4.2: `usedAccountIds` 集合应正确包含所有关联了资产的账户ID
