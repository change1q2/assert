# 理财模块 - 归档持仓显示优化与交易本金联动 实施计划

## [x] Task 1: 归档持仓列表字段优化
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 确认 `ARCHIVED_COLUMNS` 已移除实时行情字段（当前市值、持仓盈亏、持仓盈亏率、当日盈亏、当日收益率、仓位占比）
  - 确认 `ARCHIVED_COLUMNS` 已添加最终盈亏（finalPnl）、最终收益率（finalPnlPercent）
  - 确认 `archivedHoldings` 映射中正确填充 `finalPnl` 和 `finalPnlPercent`
  - 确认渲染函数 `renderCell` 正确处理 `finalPnl` 与 `finalPnlPercent` 的 PnL 着色
  - 归档列表保留的字段：市场、货币、资产种类、资产名称、代码、持仓成本、平均买入成本、数量、天数、清仓日期、最终盈亏、最终收益率、所属账户、操作
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: 归档列表不显示当前市值、持仓盈亏、持仓盈亏率、当日盈亏、当日收益率、仓位占比字段
  - `programmatic` TR-1.2: 归档列表显示最终盈亏和最终收益率字段且数值来自 finalPnl / finalPnlPercent
  - `programmatic` TR-1.3: 老归档数据无 finalPnl 时显示为 0（不报错）

## [x] Task 2: 归档筛选条件调整
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 调整 `ARCHIVED_FILTERS`，只保留与归档列表字段对应的筛选项：市场、货币、资产种类、所属账户
  - 移除一级/二级/三级/四级分类、持仓分组、持仓分类等与归档列表无关的筛选项
  - 校验 `CategoryTable` 根据 `categoryName === 'archived'` 正确切换默认筛选器
  - 校验 `resetFiltersSettings` 在归档视图下重置为 `ARCHIVED_FILTERS`
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: 归档视图筛选条件只显示市场、货币、资产种类、所属账户
  - `programmatic` TR-2.2: 切换活跃/归档视图时筛选条件正确切换（活跃视图仍保留全部筛选项）
  - `human-judgement` TR-2.3: 筛选下拉数量合理，交互顺畅

## [x] Task 3: 筛选汇总优化
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 调整 `filteredSummary` 的归档分支：
    - `totalFinalPnl` = 筛选结果中所有归档持仓的 finalPnl 之和（按汇率换算为 CNY）
    - `totalCostAll` = `financeAssets` 中所有未归档持仓的 cost 之和（按汇率换算为 CNY）—— 作为分母
    - `totalFinalPnlRate` = totalFinalPnl / totalCostAll × 100%
  - 调整 `HoldingsSummaryCard` 在归档视图下只渲染最终总盈亏与最终总收益率
  - 当 `totalCostAll` 为 0 时，totalFinalPnlRate 回退为 0，避免除零
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-3.1: 归档视图汇总只显示最终总盈亏和最终总收益率
  - `programmatic` TR-3.2: 最终总盈亏 = 筛选结果 finalPnl 之和（跨币种按汇率换算）
  - `programmatic` TR-3.3: 最终总收益率 = 最终总盈亏 / 理财模块所有持仓总成本 × 100%
  - `programmatic` TR-3.4: 总成本为 0 时不报错，显示 0.00%

## [x] Task 4: 交易本金与所属账户余额联动
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 `updateCashAccount` 基础上扩展 `updateAccountBalance`：
    - 根据 `record.accountId` 在 `stateData.accounts` 中定位所属账户（非现金账户）
    - 买入/建仓：`account.balance -= (amount + fee)`
    - 卖出/清仓：`account.balance += (amount - fee)`
    - 分红：不调整账户余额
    - 货币单位不一致（account.currency !== record.currency）时跳过更新并记录日志
  - 在 `handleAddRecord`、`handleSaveAccount`、`handleLiquidateArchive` 中调用该逻辑，保证三条交易入口都触发联动
  - 保留原有现金账户联动逻辑（不可回退）
- **Acceptance Criteria Addressed**: AC-4, AC-5, AC-7
- **Test Requirements**:
  - `programmatic` TR-4.1: 买入/建仓交易后所属账户余额正确扣减（本金+手续费）
  - `programmatic` TR-4.2: 卖出/清仓交易后所属账户余额正确增加（本金-手续费）
  - `programmatic` TR-4.3: 分红交易不影响所属账户余额
  - `programmatic` TR-4.4: 货币单位不一致时不执行所属账户余额更新
  - `programmatic` TR-4.5: 现金账户联动逻辑仍然正常

## [x] Task 5: 构建验证和集成测试
- **Priority**: high
- **Depends On**: Task 1-4
- **Description**:
  - 执行 `npm run build` 确保无编译错误
  - 完整流程测试：
    1. 归档列表字段显示正确（6 个实时字段已移除，最终盈亏/最终收益率已显示）
    2. 归档筛选条件只保留 4 项（市场、货币、资产种类、所属账户）
    3. 筛选汇总计算正确（最终总盈亏、最终总收益率）
    4. 买入交易扣减所属账户余额和现金账户余额
    5. 卖出交易增加所属账户余额和现金账户余额
    6. 货币不一致时所属账户余额不更新
  - 验证老数据兼容性与活跃持仓视图不受影响
- **Acceptance Criteria Addressed**: AC-1 through AC-7
- **Test Requirements**:
  - `programmatic` TR-5.1: `npm run build` 成功无错误
  - `programmatic` TR-5.2: 归档列表字段测试通过
  - `programmatic` TR-5.3: 筛选条件测试通过
  - `programmatic` TR-5.4: 筛选汇总计算测试通过
  - `programmatic` TR-5.5: 交易本金联动测试通过（买入/卖出/分红/币种不一致四种场景）
