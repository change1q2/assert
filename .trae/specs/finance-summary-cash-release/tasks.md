# 持仓汇总行修复 + 现金余额联动 + 释放资金 - 实施计划

## Task 1: 归档持仓合计行增加最终盈亏/收益率列
- **状态**: `completed`
- **优先级**: high
- **依赖**: 无
- **描述**:
  - 在 `FinanceHoldingsTable.jsx` 表格 tfoot 合计行中，为 `finalPnl` 和 `finalPnlPercent` 列增加专门的计算与渲染逻辑
  - `finalPnl`: 累加所有分页归档持仓的 `finalPnl`（按币种折算到目标货币）
  - `finalPnlPercent`: 加权平均收益率（总盈亏 / 总成本 * 100）
- **验收标准关联**: AC-1
- **测试要求**:
  - `rule` TR-1.1: 合计行 `col.key === 'finalPnl'` 分支存在且渲染值非空
  - `rule` TR-1.2: 合计行 `col.key === 'finalPnlPercent'` 分支存在且渲染值非空
  - `rule` TR-1.3: 非归档模式（active）合计行不受影响，保持原有渲染逻辑
- **备注**: 参考现有 `holdingPnl`/`holdingPnlRate` 的合计行实现模式
- **完成证据**:
  - TR-1.1: `FinanceHoldingsTable.jsx` L1589-L1599 新增 `col.key === 'finalPnl'` 分支
  - TR-1.2: `FinanceHoldingsTable.jsx` L1601-L1618 新增 `col.key === 'finalPnlPercent'` 分支
  - TR-1.3: 新增分支仅依赖 `otherItems`（归档/活跃通用），不影响活跃持仓合计行

## Task 2: 统一账户详情页现金类资产筛选口径
- **状态**: `completed`
- **优先级**: high
- **依赖**: 无
- **描述**:
  - 修改 `Accounts.jsx` 中 `holdingsSummary` 的筛选条件（L1760 附近）
  - 当前仅用 `categoryL1 === '现金类'` 筛选
  - 扩展为同时匹配: `categoryL1 === '现金类'` OR `assetType` 为 `'现金'`/`'现金余额'`/`'货币基金'` OR `assetKind` 为 `'现金'`/`'货币基金'`
  - 参考 `balanceData` (L1034-L1037) 的匹配逻辑
- **验收标准关联**: AC-2
- **测试要求**:
  - `rule` TR-2.1: 符合 `assetType === '现金余额'` 但 `categoryL1` 不为 `'现金类'` 的资产被计入余额
  - `rule` TR-2.2: `balanceByType` 分组按正确的 assetType 生成
  - `rule` TR-2.3: 货币基金资产（通过 `_isMoneyFundHolding` 判定）被正确排除/包含
- **备注**: 需注意货币基金已在 `balanceData` 中包含，但 `holdingsSummary` 需要保持一致
- **完成证据**:
  - TR-2.1: `Accounts.jsx` L1760-L1765 扩展匹配条件: `categoryL1 === '现金类' || at === '现金' || at === '现金余额' || at === '货币基金' || ak === '现金' || ak === '货币基金'`
  - TR-2.2: `balanceByType[typeKey]` 逻辑保持不变，按 assetType 分组
  - TR-2.3: 货币基金通过 `at === '货币基金'` 条件被包含

## Task 3: 交易记录增加「释放资金」展示字段
- **状态**: `completed`
- **优先级**: high
- **依赖**: 无
- **描述**:
  - 修改 `Finance.jsx` 交易记录展示区域
  - 对国内/货币基金布局和非国内布局，均增加第 5 列「释放资金」
  - 仅在卖出类型（`卖出`/`清仓`）时显示
  - 计算公式: `释放资金 = Math.abs(parseFloat(record.amount) || 0) - (parseFloat(record.fee) || 0)`
  - 显示正数，使用绿色/红色样式
- **验收标准关联**: AC-3
- **测试要求**:
  - `rule` TR-3.1: 卖出/清仓类型交易记录显示释放资金字段
  - `rule` TR-3.2: 买入/建仓/分红类型交易记录不显示释放资金字段
  - `rule` TR-3.3: 释放资金数值 = |amount| - fee，显示为正数
- **备注**: 释放资金为计算字段，不存储到 record 对象中
- **完成证据**:
  - TR-3.1: 两种布局（L2192-L2207 和 L2280-L2295）均增加释放资金列
  - TR-3.2: 条件 `txType === '卖出' || txType === '清仓'` 控制仅卖出/清仓时显示
  - TR-3.3: 公式 `amount - fee`，使用 `toFixed(2)` 显示为正数

## Task 4: 卖出交易自动联动现金余额资产
- **状态**: `completed`
- **优先级**: high
- **依赖**: Task 3
- **描述**:
  - 修改 `Finance.jsx` 中 `handleAddRecord` 函数的卖出流程
  - 在保存卖出交易记录时:
    1. 计算释放资金金额: `releasedFunds = Math.abs(amount) - fee`
    2. 查找对应账户下是否存在 `categoryL1 === '现金类'` AND `assetType === '现金余额'` 的资产
    3. 若存在且货币一致: 将 `releasedFunds` 累加到该资产的 `shares`/`quantity` 和 `currentValue`
    4. 若不存在: 显示 `alert()` 提示用户
- **验收标准关联**: AC-4, AC-5
- **测试要求**:
  - `rule` TR-4.1: 卖出交易保存后，现金余额资产的 shares 字段增加释放资金
  - `rule` TR-4.2: 现金余额资产不存在时弹出用户提示
  - `rule` TR-4.3: 货币单位不一致时跳过自动累加（不报错）
  - `rule` TR-4.4: 买入交易不触发任何现金余额资产的 shares 累加
- **完成证据**:
  - TR-4.1: `Finance.jsx` L1306-L1316 遍历 updatedFinanceAssets 更新 shares/quantity/currentValue
  - TR-4.2: `Finance.jsx` L1319-L1321 `alert()` 提示用户
  - TR-4.3: L1304-L1305 货币一致性检查 `tradeCurrency === assetCurrency`
  - TR-4.4: L1287 `isSell` 条件 `txType === '卖出' || txType === '清仓'`，买入不会触发

## Task 5: 构建验证
- **状态**: `completed`
- **优先级**: high
- **依赖**: Task 1, Task 2, Task 3, Task 4
- **描述**:
  - 在 `assert_WEB` 目录下执行 `npm run build`
  - 确认 exit code 为 0
  - 无新增编译错误
- **验收标准关联**: AC-6
- **测试要求**:
  - `rule` TR-5.1: 构建成功，exit code 为 0
  - `rule` TR-5.2: 无新的 ESLint/TypeScript 错误
- **完成证据**:
  - TR-5.1: `npm run build` exit code 0，built in 8.20s
  - TR-5.2: 2308 modules transformed，无新增错误
