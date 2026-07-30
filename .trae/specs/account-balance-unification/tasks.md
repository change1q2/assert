# 账户余额数据统一 - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: 统一账户列表和详情页的余额数据源到 account.balance
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - Accounts.jsx 中 `calculateAccountBalance[account.id]` 直接返回 `parseFloat(account.balance) || 0`，不再从资产 mv 聚合。
  - 详情页「现有余额」`balanceData.totalBalance` 直接显示 `selectedAccount.balance`；balanceByType 只保留现金类资产显示，其余类别的 balance 值以 account.balance 作为现金项。
  - 保留现有 balanceMapping 用于用户自定义勾选（如果用户主动修改了勾选，则 totalBalance=勾选资产 mv 求和，否则 totalBalance=account.balance）。
- **Acceptance Criteria Addressed**: [AC-1, AC-6]
- **Test Requirements**:
  - `programmatic` TR-1.1: `calculateAccountBalance[test.id] === parseFloat(test.balance)`
  - `programmatic` TR-1.2: 详情现有余额显示值 === account.balance 格式化后
  - `human-judgement` TR-1.3: 列表余额列与详情余额显示一致
- **Notes**: 删除 `calculateAccountBalance` 中 stats.marketValue 分支，删除 balanceMapping 的 account.id 顶层读取（保留 `{accountId}_{assetKey}` 二级映射形式，不与顶层 account.id 数字混用）。

## [x] Task 2: 理财模块明细弹窗账户余额与 account.balance 对齐
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - Finance.jsx DetailModal 中已存在关联账户余额卡片显示逻辑（linkedAccount.balance）。
  - 检查 formatCurrencyWithRate 正确换算；货币单位不同时仍以 linkedAccount.currency 为准。
  - 当 latestData.accountId 为账户名时，使用 `find(a => a.name === accountId || a.id === accountId)` 统一获取。
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `programmatic` TR-2.1: 卡片显示货币格式化值 === 基于 linkedAccount.balance 计算
  - `human-judgement` TR-2.2: 账户管理与理财弹窗余额值相同
- **Notes**: Finance.jsx 代码已大体满足，仅需校验并修复 name/id 匹配不准确问题。

## [x] Task 3: 现金类持仓资产与账户余额双向同步
- **Priority**: high
- **Depends On**: [Task 1, Task 2]
- **Description**:
  - Finance.jsx 模块级 `updateAccountBalance` 更新账户 balance 后，遍历 financeAssets 找到所有匹配该账户且 category==='现金类' 的条目，同步 `currentValue=balance`, `shares=balance`, `cost=balance`, `currentPrice=1`。
  - Accounts.jsx `calcFinanceAsset` 中，若资产是现金类：`mv = 关联账户.balance`（通过 accounts 按 accountId/name 查找）。
  - 统一账户勾选/统计逻辑：详情页中现金类资产 mv 使用 account.balance。
- **Acceptance Criteria Addressed**: [AC-3]
- **Test Requirements**:
  - `programmatic` TR-3.1: updateAccountBalance 返回更新后的 accounts，同时 financeAssets 中现金类资产 currentValue 已更新
  - `programmatic` TR-3.2: 保存后的 saveState 调用中同时包含 accounts 和 financeAssets
- **Notes**: 需保证货币单位不一致时跳过同步（与 updateAccountBalance 现有 guard 保持一致）。

## [x] Task 4: 详情页现金类默认勾选 & 新建资产后现金类资产用 account.balance 初始化
- **Priority**: medium
- **Depends On**: [Task 3]
- **Description**:
  - Accounts.jsx unifiedAssets 中 `defaultIncluded: (item.category || item.categoryL1) === '现金类'` 保持 true，其他保持 false。
  - Finance.jsx 新建资产时自动创建的现金类资产立即使用 `accounts.find(a => a.name===accountName || a.id===accountName)?.balance` 初始化 currentValue/shares/cost（找不到则保持 0）。
- **Acceptance Criteria Addressed**: [AC-4, AC-5]
- **Test Requirements**:
  - `human-judgement` TR-4.1: 详情页现金类勾选框默认选中，非现金类未选中
  - `programmatic` TR-4.2: 新建后现金类资产 currentValue === 关联账户初始 balance
- **Notes**: Account.name 和 accountId 可能是 name 字符串，注意兼容 id/name 两种匹配。

## [x] Task 5: 构建验证与本地冒烟测试
- **Priority**: high
- **Depends On**: [Task 1, Task 2, Task 3, Task 4]
- **Description**:
  - 执行 `npx vite build` 在 assert_WEB 目录验证无构建错误。
  - 本地启动服务后检查 3 处余额显示一致性、交易联动、默认勾选与无现金类老数据兼容。
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3, AC-4, AC-5, AC-6]
- **Test Requirements**:
  - `programmatic` TR-5.1: vite build exit code 0
  - `human-judgement` TR-5.2: 手工测试冒烟场景全部通过

# Task Dependencies
- [Task 3] depends on [Task 1] and [Task 2]
- [Task 4] depends on [Task 3]
- [Task 5] depends on [Task 1], [Task 2], [Task 3], [Task 4]
