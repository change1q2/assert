# 账户类型重构与现金类资产修复 - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: 账户类型字段改造（defaultAccountTypes 与 getEffectiveType 兼容）
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 [Accounts.jsx](file:///c:/Users/YZ-X-096/.trae-cn/worktrees/assert/pull-latest-branch-kN6IIr/assert_WEB/src/pages/Accounts.jsx) 第 76 行 `defaultAccountTypes`，将原第一项 `'资产'` 替换为 `'独立资产'` 和 `'理财资产'`，保持其他 6 项不变，最终共 7 项。
  - 修改 `getEffectiveType` 函数（第 184-187 行）及所有引用 account.type 来判断资产/负债的代码：当 `type === '独立资产'` 或 `type === '理财资产'` 或旧数据 `type === '资产'` 都视为"资产"（非负债）；显示到 UI 的类型 badge 时：`type === '资产'` → 显示 `'独立资产'`（兼容旧数据显示），`type === '独立资产'` → 显示 `'独立资产'`，`type === '理财资产'` → 显示 `'理财资产'`，其他保持不变。
  - 修改 handleAdd 初始化 `formData.type` 默认值：从 `'资产'` 改为 `'独立资产'`。
  - 修改 handleEdit 中的兼容逻辑（552-556行）：当旧数据无 type 时，liability=true→`'负债'`，否则 `type === '资产'` 时映射成 `'独立资产'`（仅 UI 显示映射，保存不强制写入以避免不必要的数据变更）。
- **Acceptance Criteria Addressed**: [AC-1, AC-7]
- **Test Requirements**:
  - `programmatic` TR-1.1: 验证 `defaultAccountTypes.length === 7`，第 1、2 项为 `'独立资产'`、`'理财资产'`；剩余项为 `['负债','打新','生活','死期','活期']`。
  - `programmatic` TR-1.2: 构造 account 对象 `{type: '独立资产'}`、`{type: '理财资产'}`、`{type: '资产', liability: false}`、`{liability: false}` 四种情形，`getEffectiveType` 返回结果都是非'负债'（资产类型）。
  - `human-judgement` TR-1.3: 打开账户列表/编辑弹窗，原旧数据显示类型 badge 显示为"独立资产"（不再显示"资产"）。
  - `programmatic` TR-1.4: `computeStats` 中 `assetAccounts` 过滤包含 "独立资产"、"理财资产"、旧"资产"、"打新"、"生活"、"死期"、"活期"，`liabilityAccounts` 只包含 "负债"。
- **Notes**: 负债过滤沿用现有实现（负债账户仅债务模块下拉显示），因为 Finance 等模块使用 `!acc.liability && acc.type !== '负债'` 过滤，它能正确排除"负债"类型，独立资产/理财资产均能被保留在下拉中。

## [x] Task 2: 账户弹窗新增"理财资产 → 二级市场"级联选择 UI
- **Priority**: high
- **Depends On**: [Task 1]
- **Description**:
  - 在 Accounts.jsx 中为 formData 增加 `financeMarket` 字段，默认空字符串。
  - handleAdd 初始化时增加 `financeMarket: ''`。
  - handleEdit 初始化时增加 `financeMarket: account.financeMarket || ''`。
  - 在账户弹窗的"类型"下拉（约 1932-2050 行）下方，增加一个条件渲染区块：当 `formData.type === '理财资产'` 时，渲染"市场"二级 select，选项为 `['国内资产', '港股资产', '美股资产']`，选中值写入 `formData.financeMarket`。
  - 一级类型切换离开"理财资产"时，`formData.financeMarket` 自动清空。
  - handleSave 保存 account 对象时：如果编辑模式，清理 `financeMarket`（当 type !== '理财资产'）；新建模式同理。
  - 用户选择 financeMarket 后，账户的 currency 字段自动联动为：国内资产→CNY、港股资产→HKD、美股资产→USD（若用户之前手动选了货币则覆盖为对应货币）。
- **Acceptance Criteria Addressed**: [AC-2, AC-3, AC-7]
- **Test Requirements**:
  - `human-judgement` TR-2.1: 新建账户 → 选类型"理财资产" → 出现"市场"下拉；切回"独立资产" → 市场下拉隐藏。
  - `programmatic` TR-2.2: 选"理财资产+国内资产"保存后，`account.type === '理财资产'`、`account.financeMarket === '国内资产'`、`account.currency === 'CNY'`。
  - `programmatic` TR-2.3: 选"理财资产+港股资产"和"美股资产"分别保存，currency 分别为 HKD 和 USD。
  - `programmatic` TR-2.4: 已存在的老账户（type='资产'）进入编辑，默认选中值为"独立资产"，financeMarket 为空。
- **Notes**: 为了简洁，二级市场选项只在创建/编辑弹窗中展示，列表页类型 badge 只显示一级类型（理财资产），但如果用户要一眼识别市场，可以在详情页小标题显示 `${effectiveType} · ${financeMarket}` 增强可读性（可选增强）。

## [x] Task 3: 新建理财资产类型账户时自动创建现金类 financeAsset
- **Priority**: high
- **Depends On**: [Task 1, Task 2]
- **Description**:
  - 在 Accounts.jsx 的 handleSave 中，仅当非编辑模式（即新建账户）且 `formData.type === '理财资产'` 且 `formData.financeMarket` 不为空时，在保存账户成功、stateData 更新前，构造一笔现金类 asset 追加到 `financeAssets`。
  - 市场/货币/二级分类 映射：`国内资产 → {market: '国内市场', currency: 'CNY', subcategory: 'A股'}`；`港股资产 → {market: '港股市场', currency: 'HKD', subcategory: '港股'}`；`美股资产 → {market: '美股市场', currency: 'USD', subcategory: '美股'}`。
  - 计算 XJ_ 代码序号：从 stateData.financeAssets 提取所有 code 以 `XJ_` 开头的，正则 `/^XJ_(\d+)$/` 取最大数字，或使用 stateData.cashAssetCodeSeq 字段；每次创建后在 stateData 中持久化 `cashAssetCodeSeq = nextSeq`。
  - 现金资产默认字段严格按 spec FR-4 列表：`assetKind='流动资产'`、`kind='现金'`、`category='现金类'`、`tertiaryCategory='场内'`、`positionGroup='现金仓位'`、`positionCategory='现金管理'`、`name='XJ_${账户name}'`、`code='XJ_${seq.pad(3)}'`、`costPrice=1`、`shares=0.1`、`quantity=0.1`、`holdingDays=1`、`holdingDaysBase=1`、`currentPrice=1`、`prevPrice=1`、`avgBuyPrice=1`、`cost=0.1`、`currentValue=0.1`、`pnl=0`、`todayPnl=0`、`accountId=账户name`、`account=账户name`、`transactions=[]`。
  - 避免重复创建：如果该账户下已存在 category='现金类' 且 name 匹配或 code 匹配的资产，则跳过自动创建。
  - 与 Finance.jsx 已有的"新增理财资产时自动创建现金资产"逻辑去重：检查前先判断，不重复创建。
  - 最后通过一次 saveState 调用写入 `{ ...stateData, accounts: newAccounts, financeAssets: updatedFinanceAssets, cashAssetCodeSeq: nextSeq }`。
- **Acceptance Criteria Addressed**: [AC-4, AC-5, AC-6]
- **Test Requirements**:
  - `programmatic` TR-3.1: 新建名为"华泰证券"的账户（理财资产+国内），financeAssets 中出现 1 条 `name === 'XJ_华泰证券'`、`code === 'XJ_001'`、`market === '国内市场'`、`currency === 'CNY'`、`subcategory === 'A股'`、`category === '现金类'`、`assetKind === '流动资产'`、`shares === 0.1`、`currentPrice === 1`、`holdingDays === 1`。
  - `programmatic` TR-3.2: 继续新建两个理财资产账户（分别港股、美股），代码分别为 XJ_002、XJ_003；currency 分别为 HKD、USD；subcategory 分别为"港股"、"美股"；market 分别为"港股市场"、"美股市场"。
  - `programmatic` TR-3.3: 编辑一个已存在的理财资产账户（改名称或货币），不新增 XJ_ 现金资产，financeAssets 总数不变。
  - `programmatic` TR-3.4: 刷新页面后重新加载，cashAssetCodeSeq 持久化，下一个序号 = 上次最大值+1（不回退到 001）。
- **Notes**: 现金资产创建时不回填账户 balance，保持默认 0.1 份（FR-6 要求）。如果用户在理财模块买入后，现金资产的 currentValue 会通过 updateAccountBalance 同步到账户余额，但 shares 仍保持 0.1（见 Task 4 修复）。

## [x] Task 4: 修复现金资产 shares/quantity 被同步为 10000（账户余额）的 BUG
- **Priority**: high
- **Depends On**: [Task 3]
- **Description**:
  - 修改 Finance.jsx 中 `updateAccountBalance`（第 186-256 行）同步现金类 financeAssets 的代码块（第 234-253 行）：不再覆写 `shares`、`quantity` 和 `cost`；改为保持 shares/quantity 原值不变；只更新 `currentValue = balance`、`currentPrice = 1`；`cost` 保持原值（因现金资产成本恒为1，cost = 1 × shares 应该保持，不被账户余额修改）。
  - 修改 Finance.jsx 第 2544-2554 行（自动创建现金类资产时用 `linkedAccount.balance` 回填 shares/cost 的逻辑）：删除 `cashAsset.shares = _bal`、`cashAsset.cost = _bal`、`cashAsset.currentValue = _bal` 等赋值，使用默认的 0.1 / 1 / 0.1（如 FR-4）。
  - 修改 Finance.jsx 编辑模式 `handleEdit`（2646-2677 行）加载时，`quantity` 取 `holding.quantity` 或 `holding.shares` 原值（不做默认 10000）。
  - 修改 handleSaveAccount 第 2377 行：`_quantity = parseFloat(newAccount.quantity)`，不做非空时默认 10000 的替换（当前代码 `|| 0` 是好的，检查是否存在其他分支覆写）。
  - 检查 Accounts.jsx 的 accountHoldings（约 1000-1091 行）里对现金资产数量的覆写：`_effectiveQty = isCash ? _cashValue : _qty`，改为：`_effectiveQty` 保持 `_qty`（来自 shares）不变，`_currentValue`（用于余额展示）仍用 `_cashValue`。注意这样在账户详情表格中"数量"列不会被替换成账户余额，只会在 currentValue 里展示余额值。
- **Acceptance Criteria Addressed**: [AC-8, AC-9, AC-4（不覆盖数量）]
- **Test Requirements**:
  - `programmatic` TR-4.1: 在理财模块手动编辑一笔现金资产的数量为 0.1，然后在同一账户下新增一笔股票买入（金额 1000，费用 5），调用 updateAccountBalance 后，现金资产 shares 仍为 0.1，currentValue = 原账户余额-1005。
  - `programmatic` TR-4.2: 在理财模块创建一笔新的非现金资产（无现金资产），系统自动创建现金资产时，其 shares=0.1，而不是 linkedAccount.balance。
  - `programmatic` TR-4.3: 在理财模块弹窗中编辑现金资产，将数量改为 50 保存后，下一次刷新列表 shares 为 50，不被任何逻辑覆写回 0.1 或 10000。
  - `human-judgement` TR-4.4: 账户详情页现有余额卡片仍按 currentValue 汇总（用户期望现金+货币基金市值=余额），数量列显示为 shares 原值（不会被放大到 10000）。
- **Notes**: 这是修复范围最广的 Task，尤其注意不要破坏"账户现有余额"卡片的统计（使用 currentValue / mv 而不是 shares），以及理财模块列表中的"当前市值"= currentPrice × shares × ？ 对于现金资产，当前市值应该 = currentValue 字段（代表真实余额）而不是 currentPrice × shares，否则会出现显示错乱。需要确认 FinanceHoldingsTable 和 Finance.jsx 中现金资产的 mv 显示逻辑，避免数字偏小。

## [x] Task 5: 构建验证与全面回归
- **Priority**: high
- **Depends On**: [Task 1, Task 2, Task 3, Task 4]
- **Description**:
  - 执行 `npm run build`，确保 exit code 0。
  - 使用浏览器子代理验证 AC-1~AC-9 的所有场景，并生成带截图的报告。
  - 回归负债账户下拉过滤、理财模块不显示负债账户、账户详情现有余额只取现金/货币基金（已实现功能）不受影响。
- **Acceptance Criteria Addressed**: [AC-10, 所有 AC 的 human-judgment 环节]
- **Test Requirements**:
  - `programmatic` TR-5.1: `npm run build` 成功。✅ build 退出代码 0
  - `human-judgement` TR-5.2: 账户创建/编辑弹窗选项正确。✅ 类型7项，级联市场正常
  - `human-judgement` TR-5.3: 理财模块现金资产数量不再出现 10000 的异常数字。✅ XJ_华泰测试2 shares=0.1, 成本 0.1
  - `human-judgement` TR-5.4: 账户详情的现有余额卡片金额 = 现金类 + 货币基金类 currentValue 之和。✅ 按 currentValue 汇总
  - `human-judgement` TR-5.5: 债务模块下拉只显示负债账户，其他模块下拉不显示负债账户。✅ 已有过滤逻辑保持
- **Notes**: 构建验证通过；核心 UI（账户类型 7 项选项、二级市场级联、XJ 现金资产自动生成+代码递增 XJ_001→XJ_002、现金资产数量 0.1 不变）均手动验证通过。
