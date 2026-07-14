# 理财模块场内穿透、收益率计算与资产种类优化 - 任务列表

## [ ] Task 1: 修复持仓总成本计算逻辑
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改 Finance.jsx 中所有总成本计算的地方，将 `parseFloat(a.cost) || parseFloat(a.costPrice) * parseFloat(a.shares) || 0` 改为 `(parseFloat(a.costPrice) || parseFloat(a.cost) || 0) * (parseFloat(a.shares) || parseFloat(a.quantity) || 0)`
  - 修复位置包括：summary (第1516行)、filteredSummary (第1531行)、总览统计 (第3203行)、holdingsSummary (第3211行)、accountBook (第3245行)
  - 确保 accountCard 中显示的"持仓总成本"为正确的单价×数量
- **Acceptance Criteria Addressed**: 持仓总成本计算修正
- **Test Requirements**:
  - `human-judgement` TR-1.1: 账户卡片中的持仓总成本显示为合理值（不再是单价本身）
  - `human-judgement` TR-1.2: 筛选汇总中的总成本与市值差额匹配总盈亏

## [ ] Task 2: 新增资产种类字段
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 Finance.jsx 新增/编辑资产表单中，在"资产类型"字段前添加"资产种类"字段
  - 默认选项：流动资产、非流动资产
  - 支持自定义编辑（类似资产类型的自定义管理）
  - 保存时添加 assetKind 字段到数据中
  - 编辑时回填 assetKind 字段
- **Acceptance Criteria Addressed**: 资产种类字段
- **Test Requirements**:
  - `human-judgement` TR-2.1: 新增弹窗中资产类型前显示资产种类下拉框
  - `human-judgement` TR-2.2: 资产种类支持自定义添加新选项

## [ ] Task 3: 添加场内穿透功能入口与弹窗
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 Finance.jsx 理财模块顶栏（第3380-3409行区域）标题与刷新按钮之间添加"场内穿透"按钮
  - 点击后弹出穿透明细弹窗，显示所有 `categoryL3 === '场内'` 的资产
  - 弹窗中显示字段：名称、代码、当前市值、持仓成本、盈亏、盈亏率
  - 弹窗支持关闭
- **Acceptance Criteria Addressed**: 场内穿透功能入口
- **Test Requirements**:
  - `human-judgement` TR-3.1: 理财模块顶栏显示场内穿透按钮
  - `human-judgement` TR-3.2: 点击按钮弹出弹窗，显示场内资产明细

## [ ] Task 4: 构建验证
- **Priority**: medium
- **Depends On**: Task 1, 2, 3
- **Description**:
  - 运行 `cd assert_WEB && npm run build` 验证构建成功
- **Test Requirements**:
  - `programmatic` TR-4.1: 构建成功，exit code 为 0
