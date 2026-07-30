# 账户管理资产列表与理财模块持仓明细同步 - 产品需求文档

## Overview
- **Summary**: 将理财模块（Finance.jsx）的持仓明细表格组件（CategoryTable）抽取为共享组件，在账户管理页面（Accounts.jsx）中复用，使账户管理的资产列表字段、筛选条件、列设置与理财模块完全一致，并确保数据实时同步。
- **Purpose**: 消除账户管理资产列表与理财模块持仓明细之间的不一致性。当理财模块表格逻辑更新时（如新增列、修改计算方式），账户管理页面自动同步，无需手动维护两份代码。
- **Target Users**: 个人理财管理系统用户

## Goals
- 将 CategoryTable 组件从 Finance.jsx 抽取到独立共享组件文件
- 账户管理资产列表使用共享组件，支持列设置、筛选设置、排序、分页功能
- 账户管理中资产列表为只读模式（无增删改操作按钮）
- 自动筛选：账户管理默认只显示"所属账户"名称与当前账户名一致的资产
- 两个页面数据实时同步（使用相同的 stateData 源）

## Non-Goals (Out of Scope)
- 不修改理财模块持仓明细的业务逻辑
- 不修改账户管理的其他功能（分类管理、账户增删改等）
- 不改变现有表格的数据计算方式
- 不添加新的筛选条件或列

## Background & Context
- 当前 Finance.jsx 中的 `CategoryTable` 组件是一个内联子组件（L2052+），包含列定义、筛选条件、renderCell、筛选汇总卡片等大量逻辑
- 当前 Accounts.jsx 的资产列表（L1216+）是一个独立实现的简单表格，字段少、无列设置、无筛选功能
- 两个页面都读取 `stateData.financeAssets` 作为数据源，但计算方式不同，导致数据显示不一致
- 之前的修改已统一了部分计算逻辑，但表格结构仍然独立

## Functional Requirements
- **FR-1**: 抽取 CategoryTable 为独立共享组件 `FinanceHoldingsTable`，包含所有列定义、筛选条件、renderCell、分页、排序、列设置、筛选设置逻辑
- **FR-2**: 账户管理页面的资产列表使用共享组件，接收 props: `holdings`, `readOnly`, `filterAccount`, `exchangeRates`, `selectedCurrency` 等
- **FR-3**: readOnly 模式下隐藏"新增持仓"、"批量编辑"按钮及操作列的"编辑""删除""明细"按钮
- **FR-4**: 账户管理页面打开时，筛选条件自动设置为当前账户名称（filterAccount = account.name），且用户可在该筛选基础上进一步操作
- **FR-5**: 共享组件的数据（列设置、筛选设置）使用独立的 localStorage key，避免与理财模块设置冲突
- **FR-6**: 筛选汇总卡片在账户管理中也正常显示

## Non-Functional Requirements
- **NFR-1**: 共享组件文件大小 ≤ 500 行（如有必要可拆分辅助函数到 utils 文件）
- **NFR-2**: 页面切换时组件正确加载/卸载，无内存泄漏
- **NFR-3**: 深色/浅色模式均正确显示
- **NFR-4**: 保持现有路由结构不变，组件抽取为纯前端重构，无后端改动

## Constraints
- **Technical**: React + JavaScript + Ant Design + Tailwind CSS
- **Business**: 只读模式严格禁止任何修改操作
- **Dependencies**: 依赖 `stateData.financeAssets` 数据源，依赖 `getCurrencySymbol` 工具函数

## Assumptions
- 账户管理的资产列表只需要展示理财持仓资产，不需要展示独立资产、债务、记录等非理财数据
- 账户管理的勾选功能（toggleAssetBalance）与资产列表表格功能独立，保留在表格外部
- 共享组件的列设置 localStorage key 使用独立前缀 `accounts_table_` 避免冲突

## Acceptance Criteria

### AC-1: 共享组件抽取成功
- **Given**: Finance.jsx 的 CategoryTable 组件包含列定义、筛选、renderCell、分页等完整逻辑
- **When**: 将其抽取到独立文件 `FinanceHoldingsTable.jsx` 并在 Finance.jsx 中引入使用
- **Then**: 理财模块持仓明细的所有功能（列设置、筛选、排序、分页、编辑、删除、明细、新增）行为与抽取前完全一致
- **Verification**: `programmatic`
- **Notes**: 对比抽取前后理财模块的 UI 和交互行为

### AC-2: 账户管理资产列表功能一致
- **Given**: 用户在账户管理页面点击某个账户
- **When**: 资产列表使用共享 FinanceHoldingsTable 组件渲染
- **Then**: 显示的列、筛选条件、排序、分页、汇总卡片与理财模块一致
- **Verification**: `programmatic`

### AC-3: 只读模式
- **Given**: 账户管理页面的资产列表以 readOnly=true 渲染
- **When**: 用户查看列表
- **Then**: 不显示"新增持仓"、"批量编辑"、"保存筛选组合"、"定投设置"等操作按钮；操作列（编辑/删除/明细）被隐藏或置为不可用
- **Verification**: `human-judgment`
- **Notes**: 人工验证 UI 上无任何增删改入口

### AC-4: 自动按账户筛选
- **Given**: 用户打开账户管理中名为"test"的账户
- **When**: 资产列表加载完成
- **Then**: 筛选条件中"所属账户"自动填入"test"，列表仅展示属于"test"账户的资产
- **Verification**: `programmatic`

### AC-5: 数据实时同步
- **Given**: 用户在理财模块修改了资产的平均买入成本
- **When**: 切换到账户管理页面查看同一账户
- **Then**: 资产列表中显示的平均买入成本与理财模块一致
- **Verification**: `programmatic`

### AC-6: 构建通过
- **Given**: 所有代码修改完成
- **When**: 执行 `npm run build`
- **Then**: 构建成功，无错误
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要保留账户管理原有的勾选功能（toggleAssetBalance）在共享组件之外？当前计划保留。
- [ ] 账户管理是否需要支持"清仓日期"列（仅归档数据）？当前计划使用 DEFAULT_COLUMNS（不含归档专用列）。