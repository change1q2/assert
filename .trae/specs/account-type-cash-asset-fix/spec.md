# 账户类型重构与现金类资产修复 - Product Requirement Document

## Overview
- **Summary**: 重构账户管理模块的账户类型体系，将原有的"资产"类型拆分为"独立资产"和"理财资产"两个一级类型，理财资产下新增二级市场选项（国内/港股/美股）。当创建理财资产类型账户时，自动在该账户下创建一笔现金类理财资产。同时修复现金类资产数量被强制重置为10000的BUG。
- **Purpose**: 使账户类型分类更贴合实际使用场景（理财模块交易资产应归属理财类账户，其他资产归属独立类账户），创建理财资产账户时自动初始化现金类资产，避免用户手动创建。修复现金类资产数量无法正常编辑的体验问题。
- **Target Users**: 使用账户管理模块创建/编辑账户的终端用户。

## Goals
- 将账户类型从原"资产/负债/打新/生活/死期/活期"重构为"独立资产/理财资产/负债/打新/生活/死期/活期"，理财资产下可选二级市场（国内资产、港股资产、美股资产）。
- 创建类型为"理财资产"的账户时，根据选择的二级市场自动在 financeAssets 中生成一笔现金类持仓资产，字段按用户给定的规则预填。
- 现金类资产的资产代码遵循 XJ_001、XJ_002、XJ_003... 的累计递增规则（全局累计）。
- 修复现金类资产的数量（shares/quantity）被某些同步逻辑覆盖为 10000 或账户余额导致编辑无效的问题。

## Non-Goals (Out of Scope)
- 不修改独立资产模块（IndependentAssets）的表单和数据结构。
- 不修改理财模块现有新增资产的自动创建现金类资产逻辑（只修复它造成的数量覆盖BUG）。
- 不修改债务模块的账户类型筛选规则（沿用之前的负债过滤实现）。
- 不做数据库迁移（所有变更均为前端 stateData 结构扩展，type/market 均存入 account 对象的新字段）。

## Background & Context
- 现有 `defaultAccountTypes = ['资产','负债','打新','生活','死期','活期']`，使用账户的 `type` 字段（无值时退化为 `liability` 布尔值）。
- 现有 Finance.jsx 在新增非现金理财资产时，如果所属账户下没有现金类资产，会自动创建一笔现金类资产（`cashAsset = {shares: _bal, ...}`），并且后续每次交易都会通过 `updateAccountBalance` 将现金类资产的 `shares/cost/currentValue` 整体重置为账户 balance，这导致用户在现金资产上编辑的数量被冲掉。这是BUG的根源。
- 现在需求要求创建"理财资产"类型账户时也自动创建现金资产，需要复用上述自动创建流程但不触发旧的数量覆盖，同时让现金资产的默认数量为 0.1（而非账户默认 balance 10000）。
- 市场与货币的映射关系：国内市场→CNY、港股市场→HKD、美股市场→USD。

## Functional Requirements
- **FR-1**: 账户新建/编辑弹窗中的"类型"字段，一级选项改为 `独立资产`、`理财资产`、`负债`、`打新`、`生活`、`死期`、`活期`。
- **FR-2**: 当一级类型选择"理财资产"时，UI 渲染出二级选择框，选项为 `国内资产`、`港股资产`、`美股资产`。二级值存入账户对象的 `financeMarket` 字段；一级类型存 `type = '理财资产'`。
- **FR-3**: 一级类型非"理财资产"时，隐藏二级选择框；保存时若之前存在 `financeMarket` 字段则清空。
- **FR-4**: 当创建账户（编辑账户不触发）且 type="理财资产" 时，在 handleSave 成功后追加一笔 financeAssets 记录，字段配置如下：
  - 市场 (market): `国内资产→国内市场`、`港股资产→港股市场`、`美股资产→美股市场`
  - 货币单位 (currency): 对应市场自动（国内→CNY，港股→HKD，美股→USD）
  - 资产种类 (assetKind/kind): `流动资产`
  - 资产一级分类 (category/categoryL1): `现金类`
  - 资产类型 (assetType/kind fallback): `现金`
  - 所属账户 (accountId/account): 刚创建的账户 name（保持与 Finance 模块一致的关联方式）
  - 资产二级分类 (subcategory/categoryL2): 第一个可用选项（国内→A股、港股→港股、美股→美股）
  - 资产三级分类 (tertiaryCategory/categoryL3): `场内`
  - 持仓分组 (positionGroup): `现金仓位`
  - 持仓分类 (positionCategory/positionType): `现金管理`
  - 资产详情·名称 (name): `XJ_${账户名称}`（例：账户"测试账户" → "XJ_测试账户"）
  - 资产详情·代码 (code): `XJ_` 加 3 位零填充序号，从 001 起全局递增（每创建一笔现金资产递增1）。
  - 平均买入成本 (costPrice/cost/avgBuyPrice): `1`
  - 份额/数量 (shares/quantity): `0.1`
  - 持仓天数 (holdingDays/holdingDaysBase): `1`
  - 现价 (currentPrice/prevPrice): `1`
  - 其他字段（pnl、currentValue、fees、tags 等）按数量 0.1 × 价格 1 常规计算即可。
- **FR-5**: 新增现金资产代码自增序号需要持久化，方案：首次从现有 `financeAssets` 中扫描所有 `code` 以 `XJ_` 开头的条目，提取最大数字；之后每次创建递增并写入 stateData 的新字段 `cashAssetCodeSeq`。
- **FR-6**: 修复现金类资产数量被覆盖的BUG：
  - 在 Finance.jsx 的 `updateAccountBalance` 中，对现金类资产同步时，不将 `shares` 字段强行覆写为账户 balance；改为保持 `shares/quantity = 0.1`（或用户后续编辑的值），仅同步 `currentValue` 为 balance，`cost` 不变（由现金类成本价恒为1保证）。
  - 在 Finance.jsx 自动创建现金类资产的既有逻辑（2481-2557行附近）中，不再用 `linkedAccount.balance` 覆写 shares/cost；保持默认的 0.1/1。
  - 在 Accounts.jsx 的自动创建现金类资产逻辑中，同样不回填账户 balance，只按 FR-4 要求的默认值写入。

## Non-Functional Requirements
- **NFR-1**: 保持 React Hooks 调用顺序一致，不在条件语句中使用 Hooks，避免白屏。
- **NFR-2**: 修改的文件不超过 4 个（Accounts.jsx、Finance.jsx，必要时新增一个共享工具文件），保持变更最小化。
- **NFR-3**: `npm run build` 构建成功无报错。
- **NFR-4**: 兼容已存在的旧数据（type 为 "资产" 且无 financeMarket 的账户），在 UI 显示时等价于"独立资产"。

## Constraints
- **Technical**: 前端 React + Ant 风格 Tailwind，后端 stateData 走既有的 fetchState/saveState，不新增后端API。
- **Business**: 现有负债账户过滤规则（仅债务模块显示、其他模块排除）必须保留，新增的"独立资产/理财资产"类型都被视为资产类型。
- **Dependencies**: 复用 Finance.jsx 中已有的市场/分类常量（marketOptions、categoryL2映射等）。

## Assumptions
- 假设用户提供的现金类资产数量默认 0.1 是最终期望（而不是 0 或 1），因为需求中明确写明"份额/数量：0.1"。
- 假设代码序号 XJ_XXX 是全局递增（跨所有账户），而不是每个账户独立。
- 假设 `account.name` 唯一，因此以 name 作为 financeAsset 的 accountId 关联字段不会出错（现有代码也是这么做的）。
- 假设旧数据中 type="资产" 的账户不需要迁移，兼容显示即可。

## Acceptance Criteria

### AC-1: 账户类型一级选项更新
- **Given**: 用户打开"添加账户"或"编辑账户"弹窗
- **When**: 展开"类型"下拉
- **Then**: 可见选项依次为：独立资产、理财资产、负债、打新、生活、死期、活期；原"资产"不再出现
- **Verification**: `human-judgment`
- **Notes**: 编辑旧数据 type="资产" 的账户时，下拉选中值自动落到"独立资产"。

### AC-2: 理财资产显示二级市场选择
- **Given**: 用户在账户弹窗中选择一级类型为"理财资产"
- **When**: UI 渲染表单
- **Then**: 出现二级"市场"选择框，选项为"国内资产、港股资产、美股资产"
- **Verification**: `human-judgment`

### AC-3: 非理财资产隐藏二级市场
- **Given**: 用户切换一级类型到"独立资产"/"负债"/其他非理财类型
- **When**: 二级市场区域渲染
- **Then**: 二级市场选择框隐藏或禁用，且保存时 financeMarket 被清空
- **Verification**: `programmatic`（查看最终保存的 account 对象）

### AC-4: 创建理财资产账户自动生成现金资产
- **Given**: 用户填写账户名称（例：华泰证券）、选类型"理财资产+国内资产"，点击保存
- **When**: 保存完成后进入理财模块查看该账户下持仓
- **Then**: 存在一笔资产：名称"XJ_华泰证券"、代码为"XJ_001"（若是第一笔）、市场=国内市场、货币=CNY、一级=现金类、类型=现金、二级=A股、三级=场内、持仓分组=现金仓位、持仓分类=现金管理、平均成本=1、数量=0.1、持仓天数=1、现价=1
- **Verification**: `human-judgment` + `programmatic`（检查 financeAssets 数据结构）

### AC-5: 不同市场生成正确默认值
- **Given**: 创建账户时分别选"港股资产"和"美股资产"
- **When**: 自动生成现金资产
- **Then**: 港股 → 市场=港股市场、货币=HKD、二级=港股；美股 → 市场=美股市场、货币=USD、二级=美股
- **Verification**: `programmatic`（检查生成对象的 market/currency/subcategory）

### AC-6: 资产代码 XJ_ 序号全局递增
- **Given**: 已存在 XJ_001
- **When**: 再创建 2 个理财资产类型账户
- **Then**: 新现金资产代码分别为 XJ_002、XJ_003
- **Verification**: `programmatic`（遍历 financeAssets 断言 code 递增连续性）

### AC-7: 旧数据兼容性
- **Given**: 历史数据中 account.type = "资产" 的账户
- **When**: 打开账户列表和详情页
- **Then**: 该账户被视为资产类型（非负债），列表中类型显示为"独立资产"，下拉编辑时默认选中"独立资产"
- **Verification**: `human-judgment`

### AC-8: 现金资产数量不再被同步逻辑覆盖为 10000
- **Given**: 在理财模块新增一个现金类资产，手动设置数量=0.1（或使用默认0.1）；在同一账户下再新增一笔股票买入交易触发 updateAccountBalance
- **When**: 回到列表页刷新后，查看该现金资产的数量
- **Then**: 现金类资产的 shares/quantity 仍为 0.1（或用户后改的值），不为账户 balance，也不是 10000；currentValue 等于账户余额
- **Verification**: `programmatic`（检查 financeAsset 的 shares vs currentValue）

### AC-9: 编辑现金资产数量生效
- **Given**: 存在一笔数量=0.1 的现金资产
- **When**: 通过编辑弹窗把数量改成 50，保存
- **Then**: 保存后列表中该现金资产的 shares/quantity 为 50，不被回退到 0.1 或 10000
- **Verification**: `human-judgment`

### AC-10: 构建验证
- **Given**: 完成所有代码修改
- **When**: 执行 `npm run build`
- **Then**: 构建成功，exit code = 0
- **Verification**: `programmatic`

## Open Questions
- [ ] 现金资产代码序号 XJ_XXX 是否需要跨账户全局递增？（当前规格按全局实现，若用户希望按账户内独立递增可调整）
- [ ] 理财资产二级市场选择后，账户本身的 currency（货币字段）是否应自动锁定为对应货币（目前规格让 currency 跟随市场自动，即覆盖用户选择）？
