# 资产总览收益与盈亏增强 - 验证清单

- [x] Checkpoint 1: 理财总资产卡片下方显示理财总盈亏和收益率（盈利绿色、亏损红色）
- [x] Checkpoint 2: 独立总资产卡片下方显示独立资产总盈亏和收益率（盈利绿色、亏损红色）
- [x] Checkpoint 3: 收益与盈亏卡片顶部显示总流入、总流出、综合现金流三个指标
- [x] Checkpoint 4: 总流入计算正确：totalIncome + max(理财总盈亏, 0) + max(独立资产总盈亏, 0)
- [x] Checkpoint 5: 总流出计算正确：totalExpense + max(-理财总盈亏, 0) + max(-独立资产总盈亏, 0) - liabilities.total
- [x] Checkpoint 6: 综合现金流计算正确：总流入 - 总流出，为正绿色、为负红色
- [x] Checkpoint 7: 分类盈亏列表已从收益与盈亏卡片中移除
- [x] Checkpoint 7.1: 总流入下方显示收入流入、理财流入、独立资产流入三个具体金额
- [x] Checkpoint 7.2: 总流出下方显示支出流出、理财流出、独立资产流出、总负债四个具体金额
- [x] Checkpoint 7.3: 综合现金流下方显示总流入和总流出汇总金额
- [x] Checkpoint 8: 流入构成饼图展示总收入、理财正盈亏、独立资产正盈亏的占比
- [x] Checkpoint 9: 流出构成饼图展示总支出、理财负盈亏绝对值、独立资产负盈亏绝对值、总负债的占比
- [x] Checkpoint 10: 总负债卡片标题右侧显示 Scale 图标
- [x] Checkpoint 11: "资产配置"标题已改为"理财资产配置"
- [x] Checkpoint 12: 理财资产配置饼图仅使用 financeAssets 数据
- [x] Checkpoint 13: 新增独立资产配置饼图，使用 independentAssets 按类型分组数据
- [x] Checkpoint 14: 新增综合资产配置饼图，仅展示理财资产 vs 独立资产两项
- [x] Checkpoint 15: npm run build 成功无报错
