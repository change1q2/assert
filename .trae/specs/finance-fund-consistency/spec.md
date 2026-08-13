# 理财模块货基列表对齐 + 独立资产定期资产字段调整 + 账户本持仓只读视图 - 产品需求文档

## 概述
本需求包含三个独立子任务，均属于"展示字段一致性"优化：
1. 理财模块货币基金（货基）列表的"累计收益、持有收益、持有收益率"直接复用明细弹窗的计算/存储值，保持内外数值完全一致；
2. 独立资产模块"定期资产"列表增加"账户本"与"名称"字段，并将表单中的"作用"字段改名为"名称"；
3. 账户管理模块"账户本"详情中展示的持仓列表字段必须与对应资产列表（理财模块的持仓列表、独立资产的股权等）完全一致，且不可编辑、不可删除，仅可查看。

## 目标
- **G1**: 货基列表中 `累计收益 / 持有收益 / 持有收益率` 三列与明细弹窗显示完全一致。
- **G2**: 独立资产-定期资产列表中新增"账户本"列和"名称"列；新增/编辑表单中"作用"字段 label 改为"名称"，其值自动作为列表的"名称"字段显示。
- **G3**: 账户管理模块"账户本"详情中的持仓表（FinanceHoldingsTable readOnly=true）字段集合与对应资产列表完全一致（包括独立资产股权的列表也会同步）。

## 非目标 (Out of Scope)
- 不改变理财模块非货基（股票/债券/场外基金等）的现有计算逻辑。
- 不改变已实现盈亏、累计收益（已实现+浮动）的计算规则（用户之前已确认的 A 股规则保持不变）。
- 不修改账户管理模块的账户编辑/删除/合并功能。
- 不新增任何独立资产子模块的功能，仅调整字段展示。

## 背景与上下文
- 代码仓库为 `assert_WEB`（Vite + React + Tailwind）。
- 理财模块 `Finance.jsx` 中 `financeAccounts` 通过 `getFinanceAccountsMapped`（L4780-L4888）映射得到，用于驱动 `FinanceHoldingsTable`。
- 理财模块明细弹窗 `DetailsModal`（L1150+）对货基使用 `currentValue - costTotal` 计算 `mfCumulative`（累计收益）和 `floatPnl`（持有收益），并通过 `computedHoldingReturnRate`（持有收益率）显示。
- 列表 `FinanceHoldingsTable.jsx` 中 `renderColumn` 对货基 `cumulativeReturn / holdingPnl / holdingPnlRate` 进行实时 `_cv - _costTotal` 重算，这与明细弹窗的计算方式理论上一致，但使用的是列表侧映射的值，一旦 `currentValue/cost/quantity/costPrice` 有漂移，列表与明细就会不同步。
- 用户要求："直接去获取明细中对应字段的数据就行了" —— 即列表侧优先使用 `asset.cumulativeReturn / asset.holdingPnl / asset.holdingPnlRate`（这些字段在 `loadData` 与 `getFinanceAccountsMapped` 中已经派生出来并持久化），而非在渲染时再次临时计算。
- 独立资产-定期资产：当前列表字段为 `市场/地点/类型/方式/货币种类/金额/利率/开始时间/结束时间/到期总利息/到期总金额/到期日倒计时/操作`，缺少"账户本"和"名称"。
- 账户管理模块 `Accounts.jsx` L2172-L2192 已通过 `<FinanceHoldingsTable readOnly={true}>` 渲染账户详情的持仓列表，其字段由 `DEFAULT_COLUMNS` 决定，已天然对齐理财模块。但由于独立资产的股权已改为使用 `FinanceHoldingsTable`（见上一轮修改），需要确保账户本详情中 `categoryName="account_detail"` 下也能看到对应类型的独立资产持仓。

## 功能需求

### FR-1：货基列表对齐明细
- 理财模块列表中，货币基金的"累计收益、持有收益、持有收益率"三列显示值与明细弹窗完全一致。
- 实现方式：在 `FinanceHoldingsTable.jsx` 的 `renderColumn` 中，当 `isMoneyFundHold(h)` 时，`cumulativeReturn / holdingPnl / holdingPnlRate` 直接读取 `h.cumulativeReturn / h.holdingPnl / h.holdingPnlRate`（这些字段由 `getFinanceAccountsMapped` 中 `_finalCumulativeReturn/_finalHoldingPnl/_finalHoldingPnlRate` 注入），不再使用 `_cv - _costTotal` 临时计算。
- 若存储值为 `null/NaN`，才回退到现有计算逻辑。

### FR-2：独立资产-定期资产列表增加账户本和名称字段
- 定期资产列表新增两个列："账户本"（显示 `item.accountName`）和"名称"（显示 `item.usage`）。
- 新增/编辑定期资产的表单中，"作用"字段的 label 改为"名称"，其值仍存储在 `usage` 字段中，显示在列表的"名称"列。
- 列表字段顺序：在"货币种类"之后插入"账户本"列，在"类型"之后插入"名称"列（或按用户截图位置，名称放在类型右边，账户本放在方式右边）。

### FR-3：账户本持仓只读字段对齐
- 账户管理模块 `Accounts.jsx` L2172-L2192 的 `<FinanceHoldingsTable readOnly={true}>` 字段集合必须与对应资产列表完全一致（`DEFAULT_COLUMNS` 一致，列设置共用 `accounts_table_` 前缀）。
- 由于 `readOnly=true` 已在 `FinanceHoldingsTable` 内部关闭 `showOpsCol/showAddBtn/showBatchEdit/showSavedFiltersBtn`，天然满足"不支持编辑和删除"的要求。
- 账户本持仓表必须能显示理财模块的持仓 + 独立资产的股权持仓（`renderIndependentAssetSection` 负责拼接）。

## 非功能需求
- 性能：修改只限于字段读取与表单 label，不得引入额外 N+1 查询；渲染复杂度保持 O(n)。
- 一致性：所有字段格式化仍沿用 `formatCurrencyWithRate / formatPercentage / pnlClass` 等现有工具。
- 可维护性：字段来源与持久化逻辑保持单点（`loadData` 派生），列表渲染只做读取。

## 约束
- 技术栈：React + Vite + Tailwind，不可引入新依赖。
- 必须兼容历史数据：`holdingPnl/cumulativeReturn` 存储字段可能为 `0` 或 `null`，需要保留合理回退。
- 独立资产的定期资产"账户本"字段需要兼容已有数据（已有 `accountId/accountName`）。

## 假设
- `getFinanceAccountsMapped` 已将 `cumulativeReturn / holdingPnl / holdingPnlRate` 注入到 financeAccounts 中（验证 L4877-L4880），列表侧 `h.cumulativeReturn` 等字段可读。
- 用户截图中"账户本"列位于"货币种类"与"金额"之间；"名称"列位于"类型"与"方式"之间。

## 验收标准

### AC-1：货基列表三字段与明细一致
- **Given**: 理财模块存在若干货基持仓，其 `cumulativeReturn / holdingPnl / holdingPnlRate` 字段已由 `loadData` 派生
- **When**: 用户打开理财模块列表并打开任一货基的明细弹窗
- **Then**: 列表中该行的"累计收益、持有收益、持有收益率"三列值与明细弹窗顶部三卡片（最新收益 / 累计收益 / 持有收益 / 持有收益率对应字段）数值完全一致（单位、符号、小数位均相同）
- **Verification**: `human-judgment`

### AC-2：定期资产列表显示账户本和名称
- **Given**: 独立资产模块存在定期资产（含已绑定 accountId/accountName）
- **When**: 用户打开独立资产 → 定期资产标签页
- **Then**: 列表中新增"账户本"列（显示 accountName）和"名称"列（显示 usage）
- **Verification**: `human-judgment`

### AC-3：定期资产表单"作用"改为"名称"
- **Given**: 用户打开定期资产的新增或编辑弹窗
- **When**: 查看"作用"字段的 label
- **Then**: label 显示为"名称"；输入值在保存后作为列表"名称"列显示
- **Verification**: `human-judgment`

### AC-4：账户本持仓只读且字段一致
- **Given**: 账户管理模块存在账户，且该账户绑定了理财持仓或独立资产股权
- **When**: 用户打开该账户详情
- **Then**: 持仓表字段与理财模块/独立资产股权列表字段完全一致；操作列、新增按钮、批量编辑按钮均不可见（readOnly=true）
- **Verification**: `human-judgment`

### AC-5：构建成功
- **When**: 运行 `npm run build`
- **Then**: 构建成功，无语法错误
- **Verification**: `programmatic`

## 开放问题
- [ ] 独立资产的保险/房产/车辆/固定投资列表是否也要对齐账户本与名称字段？（当前需求只涉及定期资产）
- [ ] 账户本详情是否需要额外的筛选隐藏"独立资产"持仓（当前 `renderIndependentAssetSection` 已拼接展示）？
