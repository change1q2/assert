# 验证检查清单

- [x] Checkpoint 1: `FinanceHoldingsTable.jsx` 中货基的 `cumulativeReturn / holdingPnl / holdingPnlRate` 渲染分支直接读取 `h.cumulativeReturn / h.holdingPnl / h.holdingPnlRate` 存储值，不再实时重算。
- [x] Checkpoint 2: 理财模块货基列表"累计收益、持有收益、持有收益率"三列与明细弹窗数值完全一致（含正负号与小数位）。
- [x] Checkpoint 3: 独立资产 → 定期资产列表新增"名称"列（显示 item.usage）和"账户本"列（显示 item.accountName）。
- [x] Checkpoint 4: 定期资产新增/编辑表单中，"作用"字段 label 已改为"名称"，保存后值正确回填到列表"名称"列。
- [x] Checkpoint 5: 账户管理模块 → 账户本详情中的持仓表（readOnly=true）字段集合与理财模块/独立资产股权列表完全一致。
- [x] Checkpoint 6: 账户本详情持仓表无操作列、无新增按钮、无批量编辑按钮、无保存的筛选按钮。
- [x] Checkpoint 7: `npm run build` 构建成功，无语法错误（exit code 0）。
