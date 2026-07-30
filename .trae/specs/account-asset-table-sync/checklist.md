# 验证清单

- [ ] Checkpoint 1: FinanceHoldingsTable.jsx 组件文件已创建，包含所有列定义、筛选条件、renderCell、分页、列设置、筛选设置逻辑
- [ ] Checkpoint 2: Finance.jsx 引入共享组件替换原 CategoryTable，理财模块所有功能（列设置、筛选、排序、分页、编辑、删除、明细、新增、归档切换）行为与之前完全一致
- [ ] Checkpoint 3: FinanceHoldingsTable 支持 `readOnly` prop，`readOnly=true` 时隐藏新增/批量编辑/筛选组合/定投设置按钮及操作列
- [ ] Checkpoint 4: FinanceHoldingsTable 支持 `defaultAccountFilter` prop，初始化为 filterAccount state
- [ ] Checkpoint 5: readOnly 模式下 localStorage 使用独立前缀 `accounts_table_`，不影响理财模块设置
- [ ] Checkpoint 6: Accounts.jsx 替换资产列表为共享组件，点击账户后自动按账户名筛选
- [ ] Checkpoint 7: 账户管理资产列表仅展示理财持仓资产（不含独立资产、债务、记录等）
- [ ] Checkpoint 8: 账户管理中勾选功能（toggleAssetBalance）保留在共享组件外部正常工作
- [ ] Checkpoint 9: 持仓成本 = 平均买入成本 × 数量，两个页面数值完全一致
- [ ] Checkpoint 10: 理财模块修改数据后，账户管理页面实时同步显示
- [ ] Checkpoint 11: 筛选汇总卡片在账户管理中正常显示
- [ ] Checkpoint 12: 深色/浅色模式下两个页面均正确显示
- [ ] Checkpoint 13: `npm run build` 构建成功，无错误
- [ ] Checkpoint 14: 理财模块所有原有功能（交易记录、归档、现金资产、定投等）无回归问题
