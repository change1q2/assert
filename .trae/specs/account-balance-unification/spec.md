# 账户余额数据统一 - Product Requirement Document

## Overview
- **Summary**: 统一账户管理列表页、账户详情页、理财模块明细弹窗中的余额显示数据源，全部以 `accounts[].balance` 为唯一真值来源；现金类资产自动与账户余额双向同步；详情页默认勾选现金类资产并计入现有余额。
- **Purpose**: 解决账户列表余额 157.50 / 详情页余额 ¥0 / 理财模块余额 ¥2045 三处不一致的问题，确保余额显示同一值且自动同步。
- **Target Users**: 个人资产管理系统的理财与账户管理模块用户。

## Goals
- 账户列表「余额」列 = 账户详情「现有余额」= 理财明细弹窗「账户余额」。
- 唯一数据源：`accounts[].balance`。
- 现金类持仓资产（financeAssets.categoryL1==='现金类'）与账户余额双向同步：写入 account.balance 时同步更新现金资产的 currentValue / shares / cost；读取时以 account.balance 为准覆盖现金资产自身字段显示。
- 详情页资产列表默认勾选所有「一级分类=现金类」的资产；其他资产默认不勾选。

## Non-Goals (Out of Scope)
- 不修改账户管理模块以外的筛选 / 统计卡片。
- 不修改独立资产、债务、收支记录模块。
- 不实现跨币种汇率自动换算（沿用现有 convertCurrency 工具）。
- 不修改归档持仓的最终盈亏计算。

## Background & Context
- **数据模型**: 
  - `accounts[]`: `{ id, name, balance, currency, type, ... }` — 账户的「真实余额」字段 `balance`。
  - `financeAssets[]`: `{ accountId, category, categoryL1, currentValue, shares, cost, currentPrice, ..., transactions }` — 理财模块持仓资产，其中 `category==='现金类'` 是资金载体。
  - `financeAssetArchives[]`: 归档资产（不参与余额计算）。
- **当前问题**:
  1. 详情页「现有余额」 = `balanceData.totalBalance`，由勾选资产的 `mv` 求和 → 现金资产的 `mv=currentValue=0`（未同步 account.balance）→ 显示 ¥0
  2. 列表页「余额」列 = `calculateAccountBalance[account.id]` = `stats.marketValue`（accountStats 聚合所有关联资产的 mv）→ 与详情不一致
  3. 理财模块明细弹窗直接取 `linkedAccount.balance` → 显示账户真实余额 2045，但账户管理未与其对齐。
- **交易联动**: `updateAccountBalance`（Finance.jsx 模块级函数）已实现 买入/卖出 时更新 account.balance；现金类资产的 currentValue / shares 未随之同步 → mv 与账户不一致。

## Functional Requirements

- **FR-1**: 账户列表「余额」列与详情页「现有余额」都直接显示 `account.balance`，不再由资产 mv 聚合计算。
- **FR-2**: 理财模块明细弹窗的「账户余额卡片」显示 `account.balance`，与账户管理完全一致。
- **FR-3**: 现金类持仓资产与账户余额双向同步：
  - **写入同步**：每当 updateAccountBalance 或交易联动更新 account.balance 后，同步更新所有关联的现金类 financeAssets 条目的：
    - `currentValue = balance`
    - `shares = balance`（数量 = 金额，因为现价=0不参与计算）
    - `cost = balance`
    - `currentPrice = 1`（每份=1单位货币，使得 shares * currentPrice = currentValue 自洽；用于详情列显示）
    - 仅对 `category==='现金类'` 且 `accountId/account === account.id or account.name` 的条目执行。
  - **读取显示覆盖**：在 Accounts.jsx 的 unifiedAssets 与 calcFinanceAsset 中，若资产 categoryL1==='现金类'，使用「其关联账户的 balance」作为 mv 显示值；成本 cost 保持不变。
- **FR-4**: 详情页资产列表默认勾选规则：
  - `categoryL1==='现金类'` → `defaultIncluded = true`
  - 非现金类 → `defaultIncluded = false`（保持现有 false，不再默认勾选其他类型）
  - 现金类资产 checkbox 显示为已勾选且行底色为 emerald-50。
- **FR-5**: 新增资产时（handleSaveAccount）创建现金类资产后，立即用「该账户当前 balance」初始化现金类资产的 currentValue/shares/cost（避免默认 0 不一致）。

## Non-Functional Requirements
- **NFR-1**: 同一账户余额更新在单 saveState 批次内完成（账户 + 现金类资产一起写），保证最终一致性。
- **NFR-2**: 性能：不增加详情页加载时间（<500ms 本地渲染）。
- **NFR-3**: 向后兼容：老数据若无现金类资产，详情页现有余额仍正确显示 account.balance（直接读字段），且不崩溃。

## Constraints
- **技术**: React + JavaScript（Finance.jsx、Accounts.jsx 单文件修改）
- **状态存储**: 仍通过 `saveState({...stateData, accounts, financeAssets})` 统一写入后端。
- **字段命名**: 现金类资产判定使用 `a.category === '现金类' || a.categoryL1 === '现金类'` 兼容两种字段。

## Assumptions
- 一个账户关联的「现金类」financeAssets 条目最多 1 条（若有更多条，全部按 account.balance 覆盖显示；写入时全部同步更新）。
- `account.balance` 的货币单位与现金资产的 `currency` 一致（updateAccountBalance 已在不一致时跳过）。
- 用户希望 account.balance 是资金余额的「唯一可信来源」，即使现金资产的 currentValue/shares 字段被覆盖也不影响。

## Acceptance Criteria

### AC-1: 账户列表余额 = 详情现有余额
- **Given**: 用户打开账户管理列表页，其中 test 账户 `accounts[].balance = 2045`
- **When**: 查看列表余额列，再点击进入该账户详情页
- **Then**: 列表余额列 = ¥2,045 且 详情「现有余额」= ¥2,045，完全一致
- **Verification**: `programmatic`

### AC-2: 理财明细弹窗账户余额一致
- **Given**: 某理财资产关联账户名为 test，test 账户 `balance=2045`
- **When**: 打开该资产明细弹窗
- **Then**: 弹窗「test 账户余额」卡片显示 ¥2,045，与账户管理相同
- **Verification**: `programmatic`

### AC-3: 交易后 account.balance 与现金资产同步更新
- **Given**: test 账户存在现金类资产（XX账户现金管理），初始 balance=2045
- **When**: 用户在明细弹窗新增 买入 交易，金额=100，费用=5
- **Then**:
  - account.balance 变为 2045 - 100 - 5 = 1940
  - 账户管理列表余额 / 详情现有余额 / 下次打开理财弹窗余额三处均为 ¥1,940
  - 现金类资产的 currentValue/shares/cost 都变为 1940
- **Verification**: `programmatic`

### AC-4: 详情页默认勾选现金类、其他类型默认不勾选
- **Given**: 账户下有 2 项资产：现金类（XX账户现金管理）+ 权益类（测试建仓股）
- **When**: 进入该账户详情页
- **Then**: 现金类 checkbox 已选中，权益类未选中；现金行有 emerald-50 底色
- **Verification**: `human-judgment`

### AC-5: 新建资产创建现金类资产后自动用 account.balance 初始化
- **Given**: 某账户当前 balance=1000，尚未存在现金类资产
- **When**: 新建一笔权益类理财持仓并保存
- **Then**: 自动创建的现金类资产的 currentValue/shares/cost = 1000；详情现有余额直接取 account.balance=1000
- **Verification**: `programmatic`

### AC-6: 老数据无现金类资产时详情现有余额仍正确
- **Given**: 某账户 `balance=800`，但 financeAssets 下没有 category=现金类 的条目
- **When**: 进入账户详情页
- **Then**: 现有余额显示 ¥800（直接取 account.balance），资产列表显示其他资产；无报错无白屏
- **Verification**: `human-judgment`

## Open Questions
- [ ] 是否在勾选资产的合计卡片中仅保留现金类，不再显示「N项资产计入」对用户的误导？→ 按本 spec，现金类默认勾选即可。
- [ ] 多个现金类资产并存时，写入同步是否全部更新？→ 本 spec 按「全部同步」处理。
