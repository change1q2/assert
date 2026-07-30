# 账户管理资产列表同步 - 实施计划

## [x] Task 1: 抽取共享表格组件 FinanceHoldingsTable
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 从 Finance.jsx 中抽取以下内容到 `assert_WEB/src/components/FinanceHoldingsTable.jsx`：
    - `DEFAULT_COLUMNS`、`ARCHIVED_COLUMNS` 列定义
    - `DEFAULT_FILTERS`、`ARCHIVED_FILTERS` 筛选条件定义
    - `CategoryTable` 组件（含 renderCell、筛选逻辑、分页、列设置、筛选设置、排序）
  - 新增 `readOnly` prop，当 `readOnly=true` 时：
    - 隐藏"新增持仓"、"批量编辑"、"筛选组合"、"定投设置"按钮
    - 隐藏操作列（编辑/删除/明细）
    - 隐藏勾选框列
  - 新增 `defaultAccountFilter` prop，初始化为 filterAccount state
  - 使用独立 localStorage key 前缀 `accounts_table_`（当 readOnly 时），避免与理财模块冲突
  - 保留 CategoryTable 原有 props 接口以确保 Finance.jsx 兼容性
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: 在 Finance.jsx 中引入 FinanceHoldingsTable 替换原 CategoryTable，所有功能正常
  - `programmatic` TR-1.2: `npm run build` 构建成功
  - `human-judgement` TR-1.3: 人工验证理财模块持仓明细 UI 与抽取前一致
- **Notes**: 文件大小若超过 500 行，将 renderCell 等辅助函数拆分到 `src/utils/financeTableHelpers.js`

## [x] Task 2: 账户管理页面集成共享表格组件
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 在 Accounts.jsx 中引入 FinanceHoldingsTable 组件
  - 替换原有的统一资产列表表格（L1216-L1295）为共享组件
  - 传入 props：
    - `holdings`: 筛选后的当前账户 financeAssets 数据（仅含非归档资产）
    - `readOnly={true}`
    - `defaultAccountFilter={account.name}`
    - `exchangeRates`, `selectedCurrency`, `marketOptions`, `currencyOptions` 等必要 props
  - 移除 unifiedAssets 中与独立资产、债务、记录相关的非理财数据逻辑（资产列表只展示理财资产）
  - 保留"勾选功能"在共享组件外部（或通过 `renderHeader` 方式保留在表格上方）
  - 筛选汇总卡片由共享组件内置
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-2.1: 点击账户后，资产列表默认按账户名筛选，仅展示该账户资产
  - `programmatic` TR-2.2: readOnly 模式下无增删改按钮和操作列
  - `human-judgement` TR-2.3: 列、筛选、分页、汇总卡片与理财模块一致
- **Notes**: 需确保共享组件 filterAccount 初始值正确填充

## [ ] Task 3: 数据计算一致性验证与修正
- **Priority**: medium
- **Depends On**: Task 1, Task 2
- **Description**:
  - 确认 Accounts.jsx 的 `calcFinanceAsset` 与 Finance.jsx 的 `computed` useMemo 使用完全一致的计算逻辑
  - 移除 Accounts.jsx 中 unifiedAssets 对非独立资产来源的处理（独立资产、债务、记录）
  - 确保持仓成本、平均买入成本、数量、市值、盈亏等字段计算一致
  - 验证两个页面的数据实时同步
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-3.1: 在理财模块修改平均买入成本后，账户管理页面同步显示
  - `programmatic` TR-3.2: 持仓成本 = 平均买入成本 × 数量，两个页面一致
  - `human-judgement` TR-3.3: 相同资产在两个页面所有字段数值一致
- **Notes**: 如需进一步统一，可将计算函数抽取到共享 utils

## [ ] Task 4: 构建验证与最终检查
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3
- **Description**:
  - 执行 `npm run build` 确认构建成功
  - 人工验证理财模块和账户管理页面的核心功能
  - 检查深色/浅色模式显示
  - 检查 localStorage key 独立性
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `programmatic` TR-4.1: `npm run build` 退出码为 0
  - `human-judgement` TR-4.2: 理财模块功能完整无回归
  - `human-judgement` TR-4.3: 账户管理资产列表功能正常
  - `human-judgement` TR-4.4: 深色/浅色模式均正确显示
- **Notes**: 完整回归测试，特别关注交易记录、归档、现金资产相关功能
