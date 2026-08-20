# 持仓汇总行修复 + 现金余额联动 + 释放资金 - 独立审查

- [x] CP-R1: 归档持仓合计行显示最终盈亏
  - **类型**: `rule`
  - **覆盖**: AC-1, TR-1.1~TR-1.3
  - **证据**:
    - `finalPnl` 处理分支: `FinanceHoldingsTable.jsx` L1589-L1597，对 `otherItems` 求和 + `convertCurrency` 折算 + `pnlClass` 样式
    - `finalPnlPercent` 处理分支: L1599-L1608，加权计算 (totalFinalPnl / totalCost * 100) + `pnlClass` + `formatPercentage`
    - 默认空 td 兜底仍存在: L1609-L1615
    - `otherItems` 来源 `filteredWithRatio`，归档模式下已正确过滤

- [x] CP-R2: 账户详情页现有余额正确统计现金类资产
  - **类型**: `rule`
  - **覆盖**: AC-2, TR-2.1~TR-2.3
  - **证据**:
    - `Accounts.jsx` L1747-L1773 `holdingsSummary` useMemo: 匹配条件扩展为 `categoryL1 === '现金类' || at === '现金' || at === '现金余额' || at === '货币基金' || ak === '现金' || ak === '货币基金'`
    - `balanceByType[typeKey]` 按 assetType 正确分组
    - 货币基金通过 `at === '货币基金'` 条件正确包含

- [x] CP-R3: 交易记录显示释放资金字段
  - **类型**: `rule`
  - **覆盖**: AC-3, TR-3.1~TR-3.3
  - **证据**:
    - 国内/货币基金布局: L2232-L2247 (grid-cols-5 第5列)
    - 非国内布局: L2320-L2335 (grid-cols-5 第5列)
    - 条件: `txType === '卖出' || txType === '清仓'` — 不包含快速过户 ✓
    - 公式: `amount - fee`，`toFixed(2)` 正数显示，绿/红色样式

- [x] CP-R4: 卖出交易自动联动现金余额资产
  - **类型**: `rule`
  - **覆盖**: AC-4, AC-5, TR-4.1~TR-4.4
  - **证据**:
    - `Finance.jsx` L1285-L1323 `handleAddRecord`: isSell 检查 → releasedFunds 计算 → 查找 cashBalanceAsset → 更新 shares/quantity/currentValue
    - 货币一致性检查: L1304-L1305 `tradeCurrency === assetCurrency`
    - 无匹配资产时 `alert()` 提示: L1319-L1321
    - 买入不触发: L1287 `isSell` 条件仅包含卖出/清仓

- [x] CP-R5: 前端构建无错误
  - **类型**: `rule`
  - **覆盖**: AC-6, TR-5.1, TR-5.2
  - **证据**: `npm run build` exit code 0，built in 8.20s，2308 modules transformed

- [x] CP-U1: 视觉一致性与交互流畅度
  - **类型**: `rubric`
  - **覆盖**: AC-7
  - **规模**: 1-5
  - **锚点**: 1=样式混乱；3=基本可用；5=完美匹配
  - **通过阈值**: >= 4
  - **评分**: 5/5
  - **证据**:
    - 合计行新增分支与现有 `holdingPnl`/`holdingPnlRate` 分支完全一致的代码模式
    - 释放资金列使用 `font-semibold` + `text-green-600`/`text-red-500`，与现有金额列样式一致
    - grid-cols-4 → grid-cols-5 布局调整对称
    - `pnlClass` / `pnlSign` / `formatCurrencyWithRate` 工具函数一致复用

## Review History

### Review R1 (2026-08-21)
- **结果**: `pass`
- **检查项**:
  - CP-R1: 代码审查 FinanceHoldingsTable.jsx 合计行 tfoot
  - CP-R2: 代码审查 Accounts.jsx holdingsSummary
  - CP-R3: 代码审查 Finance.jsx 交易记录渲染
  - CP-R4: 代码审查 Finance.jsx handleAddRecord 卖出流程
  - CP-R5: `npm run build` 构建验证
  - CP-U1: 视觉一致性审查
- **证据**:
  - 所有代码修改已在目标位置，逻辑正确
  - 构建成功 exit code 0
  - 无遗留 actionable finding
- **Checkpoint Results**:
  - CP-R1 (`rule`): `pass`
  - CP-R2 (`rule`): `pass`
  - CP-R3 (`rule`): `pass`
  - CP-R4 (`rule`): `pass`
  - CP-R5 (`rule`): `pass`
  - CP-U1 (`rubric`): `pass`; score 5/5; rationale: 所有新增代码使用与现有代码完全一致的模式和工具函数
- **Findings**: 无
