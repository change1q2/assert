# 券商理财资产 - 现金类资产自动创建命名规则修订 PRD

## Why
当前在账户管理中创建"理财资产"类型账户时，会自动创建一条现金类持仓资产，但其命名规则 `XJ_{账户名}` / `XJ_001` 既不直观也难以全局排序。用户要求将券商大类下的理财资产自动创建逻辑改为统一的全局自增命名 `ZZGL_001` / `ZZDM_001`，并将"平均买入成本"与"现金（现价）"锁定为不可修改的常量 1，份额默认为 0.1，便于作为账户资金的稳定锚点。

## What Changes
- **MODIFIED** 自动创建现金类资产的前置条件：保持"任何大类 + 类型 = 理财资产 + 已选市场"（原收紧为仅券商大类的方案已放宽）
- **MODIFIED** 资产名称生成规则：`XJ_{账户名}` → `ZZGL_{3位序号}`（全局自增，与账户名解耦）
- **MODIFIED** 资产代码生成规则：`XJ_{3位序号}` → `ZZDM_{3位序号}`（全局自增，与账户名解耦）
- **MODIFIED** 默认字段值：
  - `avgBuyPrice`（平均买入成本）：1，且后续在表单中不可修改
  - `currentPrice`（现金/现价）：1，且后续在表单中不可修改
  - `shares` / `quantity`（份额/数量）：0.1
- **KEPT** 市场映射规则保持不变：国内市场 → A股，港股市场 → 港股，美股市场 → 美股
- **KEPT** 其余字段默认值、现金类资产不参与交易记录、余额联动逻辑保持不变

## Impact
- Affected specs:
  - `finance-cash-asset-auto-create`（原自动创建 spec，本次为对其命名规则的修订）
- Affected code:
  - [assert_WEB/src/pages/Accounts.jsx](file:///c:/Users/YZ-X-096/.trae-cn/worktrees/assert/pull-latest-branch-kN6IIr/assert_WEB/src/pages/Accounts.jsx) - `handleSave` 函数中自动创建现金类资产的代码块（第 654-744 行）
  - [assert_WEB/src/pages/Finance.jsx](file:///c:/Users/YZ-X-096/.trae-cn/worktrees/assert/pull-latest-branch-kN6IIr/assert_WEB/src/pages/Finance.jsx) - 新建/编辑资产表单中对现金类资产字段的只读约束（costPrice / currentPrice 输入框 disabled 状态）

## ADDED Requirements
（无新增需求，均为对已有功能的修改）

## MODIFIED Requirements

### Requirement: 券商理财资产自动创建现金类持仓资产

当用户在账户管理中新建账户，且满足以下全部条件时：
- 账户大类（`formData.category`）：任意（不限制）
- 账户类型（`formData.type`）= `理财资产`
- 已选择市场（`formData.financeMarket`）∈ {`国内资产`, `港股资产`, `美股资产`}

系统 SHALL 自动创建一条现金类持仓资产，字段规范如下：

| 字段 | 取值 | 说明 |
| --- | --- | --- |
| `id` | `cash-asset-{timestamp}` | 唯一标识 |
| `market` | 映射后值 | 国内资产→国内市场、港股资产→港股市场、美股资产→美股市场 |
| `currency` | 映射后值 | 国内资产→CNY、港股资产→HKD、美股资产→USD |
| `assetKind` | `流动资产` | 资产种类 |
| `kind` | `现金` | 资产类型 |
| `accountId` / `account` | 新建账户名 | 所属账户 |
| `category` | `现金类` | 资产分类一级 |
| `subcategory` | 映射后值 | 国内→A股、港股→港股、美股→美股 |
| `tertiaryCategory` | `场内` | 资产分类三级 |
| `positionGroup` | `现金仓位` | 持仓分组 |
| `positionCategory` | `现金管理` | 持仓分类 |
| `name` | `ZZGL_{3位序号}` | **资产名称全局自增**，序号从现有资产中扫描最大值后 +1 |
| `code` | `ZZDM_{3位序号}` | **资产代码全局自增**，序号与 name 保持一致 |
| `costPrice` | `1` | 平均买入成本，固定为 1 |
| `avgBuyPrice` | `1` | 平均买入成本，固定为 1，表单中不可修改 |
| `currentPrice` | `1` | 现价（用户称为"现金"），固定为 1，表单中不可修改 |
| `prevPrice` | `1` | 前一日收盘价 |
| `shares` / `quantity` | `0.1` | 份额/数量，默认 0.1 |
| `availableShares` | `0.1` | 可用份额 |
| `cost` | `0.1` | 持仓成本 = avgBuyPrice × shares |
| `currentValue` | `0.1` | 当前市值 = currentPrice × shares |
| 其余盈亏/天数/标签字段 | `0` 或 `''` | 与现有逻辑保持一致 |

#### Scenario: 创建券商国内理财资产账户

- **WHEN** 用户在账户管理新建账户，大类选择"券商"，类型选择"理财资产"，市场选择"国内资产"，填写账户名并保存
- **THEN** 系统在 `financeAssets` 中新增一条现金类资产：
  - `name` = `ZZGL_001`（若为首次创建）
  - `code` = `ZZDM_001`
  - `market` = `国内市场`，`currency` = `CNY`，`subcategory` = `A股`
  - `avgBuyPrice` = `1`，`currentPrice` = `1`，`shares` = `0.1`
  - `accountId` = 新建账户名

#### Scenario: 全局自增序号

- **GIVEN** 现有 `financeAssets` 中已存在 `name=ZZGL_001, code=ZZDM_001` 和 `name=ZZGL_003, code=ZZDM_003` 两条现金类资产
- **WHEN** 用户再次创建券商理财资产账户
- **THEN** 新资产的 `name` = `ZZGL_004`，`code` = `ZZDM_004`（取最大序号 3 + 1）

#### Scenario: 非券商大类同样触发自动创建

- **WHEN** 用户新建账户，大类选择"银行"或"基金平台"等任意分类，类型选择"理财资产"并选择市场
- **THEN** 系统同样创建现金类持仓资产（命名规则、默认值与券商大类一致）
- **NOTE** 自动创建条件已放宽，不再限制大类。

#### Scenario: 同一账户不重复创建

- **GIVEN** 某券商账户下已存在 `accountId` 匹配的现金类资产
- **WHEN** 用户再次为该账户创建理财资产（理论场景，实际同账户不会重复创建）
- **THEN** 系统 NOT 重复创建现金类资产

### Requirement: 现金类资产字段在表单中只读

在理财模块的资产新建/编辑表单中，当资产的 `assetType` = `现金` 或 `categoryL1` = `现金类` 时：
- **平均买入成本**（`avgBuyPrice` / `costPrice`）输入框 SHALL 处于 `disabled` 状态，固定显示为 `1`
- **现价**（`currentPrice`，对应"现金"概念）输入框 SHALL 处于 `disabled` 状态，固定显示为 `1`
- 输入框样式 SHALL 使用灰底 + `cursor-not-allowed`，与现有现金类字段禁用样式一致

#### Scenario: 编辑现金类资产时字段只读

- **GIVEN** 用户在理财模块打开一条现金类资产的编辑表单
- **WHEN** 表单加载完成
- **THEN** "平均买入成本"与"现价"输入框为禁用状态，值固定为 1，用户无法手动修改

## REMOVED Requirements
（无移除需求）

## Open Questions
- [ ] **BREAKING 影响**：原逻辑对所有大类的"理财资产"账户都会自动创建现金类资产，本次修订收紧为仅"券商"大类。是否需要保留对其他大类（如"银行""基金平台"）的兼容？默认按用户字面要求：仅券商触发。
- [ ] "现金默认为1"的语义确认：用户表述中的"现金"字段，本 spec 解释为 `currentPrice`（现价，现金类资产的 1 元锚点）。如实际指 `currentValue`（市值），则需将 `shares` 改为 1，与"份额默认 0.1"冲突。默认按 `currentPrice = 1` 实施。
- [ ] 已存在的 `XJ_xxx` 命名的历史数据是否需要迁移为 `ZZGL_xxx` / `ZZDM_xxx`？默认：不迁移，仅新创建的资产使用新规则。
