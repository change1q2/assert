# 理财模块持仓成本计算与资产种类字段优化 - 任务列表

## [x] Task 1: 修复持仓总成本计算逻辑
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改 Finance.jsx 中 financeAccounts 数据映射逻辑（第3205-3206行），将 `cost` 映射为总成本：`(costPrice || cost) × (shares || quantity)`
  - 修改所有汇总计算处直接使用 `cost`（总成本），移除错误的 `|| costPrice * shares` 回退逻辑
  - 修复位置包括：summary (第1516行)、filteredSummary (第1531行)、总览统计 (第3226行)、holdingsSummary (第3234行)、accountBook (第3268行)、分类统计 (第3253行)
  - 保存逻辑中同步存储 `cost` 为总成本字段，确保数据一致性
- **Acceptance Criteria Addressed**: 持仓总成本计算修正
- **Test Requirements**:
  - `human-judgement` TR-1.1: 账户卡片中的持仓总成本显示为合理值（单价×数量）
  - `human-judgement` TR-1.2: 筛选汇总中的总成本与市值差额匹配总盈亏

## [x] Task 2: 新增资产种类字段
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 Finance.jsx 新增/编辑资产表单中，在"资产类型"字段前添加"资产种类"字段
  - 默认选项：流动资产、非流动资产
  - 支持下拉框旁自定义按钮，可添加新种类并持久化到 localStorage
  - 保存时添加 assetKind 字段到数据中
  - 编辑时回填 assetKind 字段
- **Acceptance Criteria Addressed**: 资产种类字段
- **Test Requirements**:
  - `human-judgement` TR-2.1: 新增弹窗中资产类型前显示资产种类下拉框
  - `human-judgement` TR-2.2: 资产种类支持自定义添加新选项并持久化

## [x] Task 3: 构建验证
- **Priority**: medium
- **Depends On**: Task 1, 2
- **Description**: 
  - 运行 `cd assert_WEB && npm run build` 验证构建成功
- **Test Requirements**:
  - `programmatic` TR-3.1: 构建成功，exit code 为 0
- **Status**: Completed - 构建成功，exit code 0
