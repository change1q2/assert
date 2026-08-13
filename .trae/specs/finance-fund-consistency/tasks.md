# 理财模块货基列表对齐 + 独立资产定期资产字段调整 + 账户本持仓只读视图 - 实施计划

## [x] 任务 1：货基列表三字段直接读取存储值（与明细一致）
- **优先级**: 高
- **依赖**: 无
- **描述**:
  - 修改 `assert_WEB/src/components/FinanceHoldingsTable.jsx` 中 `renderColumn` 的 `cumulativeReturn / holdingPnl / holdingPnlRate` 分支。
  - 当 `isMoneyFundHold(h)` 时，直接读取 `h.cumulativeReturn / h.holdingPnl / h.holdingPnlRate`（这些字段由 `getFinanceAccountsMapped` 持久化注入），不再使用 `_cv - _costTotal` 计算。
  - 若存储值为 `null/NaN`，回退到原有计算逻辑作为兜底。
- **验收标准**: AC-1
- **测试要求**:
  - `human-judgement` TR-1.1: 打开理财模块列表与货基明细弹窗，核对"累计收益/持有收益/持有收益率"三列数值完全一致（含正负号与小数位）。
  - `programmatic` TR-1.2: `npm run build` 成功。
- **备注**: 只改渲染层，不改 `getFinanceAccountsMapped` 的派生逻辑。

## [x] 任务 2：独立资产-定期资产列表增加"账户本"和"名称"字段
- **优先级**: 高
- **依赖**: 无
- **描述**:
  - 修改 `assert_WEB/src/pages/IndependentAssets.jsx` 中 `renderFixedDepositTable`：
    - 表头新增两列："名称"（在"类型"之后）、"账户本"（在"货币种类"之后）。
    - 每行数据绑定："名称"显示 `item.usage`；"账户本"显示 `item.accountName`（缺失则回退到 `accounts` 中查找 `accountId` 对应的 `name`）。
- **验收标准**: AC-2
- **测试要求**:
  - `human-judgement` TR-2.1: 打开独立资产 → 定期资产标签，确认列表新增"账户本"和"名称"列，且显示正确。
  - `programmatic` TR-2.2: `npm run build` 成功。

## [x] 任务 3：定期资产表单"作用"字段 label 改为"名称"
- **优先级**: 高
- **依赖**: 任务 2
- **描述**:
  - 修改 `renderFixedDepositForm` 中 `作用` 字段的 `<label>` 文本为 `名称`，底层仍绑定 `formData.usage` 字段。
  - 确保保存后 `usage` 字段作为"名称"列显示在定期资产列表。
- **验收标准**: AC-3
- **测试要求**:
  - `human-judgement` TR-3.1: 新增/编辑定期资产，label 显示为"名称"；保存后列表"名称"列显示输入值。
  - `programmatic` TR-3.2: `npm run build` 成功。

## [x] 任务 4：账户本持仓只读视图字段对齐
- **优先级**: 高
- **依赖**: 任务 1、任务 2、任务 3
- **描述**:
  - 账户管理模块 `Accounts.jsx` L2172-L2192 中 `<FinanceHoldingsTable readOnly={true}>` 的字段集合通过 `DEFAULT_COLUMNS` 与理财模块保持一致，已天然对齐；需确保独立资产股权持仓（上一轮已改为 FinanceHoldingsTable）也能在账户本详情中显示（通过 `renderIndependentAssetSection` 已完成）。
  - 验证 `readOnly=true` 状态下：操作列、新增按钮、批量编辑按钮、保存的筛选按钮均不可见。
- **验收标准**: AC-4
- **测试要求**:
  - `human-judgement` TR-4.1: 打开账户本详情，字段列与理财模块一致；无操作/新增/批量编辑按钮。
  - `programmatic` TR-4.2: `npm run build` 成功。

## [x] 任务 5：整体构建与回归验证
- **优先级**: 高
- **依赖**: 任务 1-4
- **描述**:
  - 运行 `npm run build`，确保无语法错误。
  - 手动验证四个场景：理财货基列表、独立资产定期资产列表/表单、账户本详情。
- **验收标准**: AC-5
- **测试要求**:
  - `programmatic` TR-5.1: `npm run build` 退出码为 0。
  - `human-judgement` TR-5.2: 所有 UI 改动与验收标准一致。
