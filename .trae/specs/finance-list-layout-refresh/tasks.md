# Tasks

- [x] Task 1: 筛选汇总卡片移到列表上方并更新内容
  - [ ] SubTask 1.1: 修改 HoldingsSummaryCard 组件显示内容（总本金、平均成本、总盈亏、总收益率、当前市值、当日收益、当日收益率）
  - [ ] SubTask 1.2: 更新 holdingsSummary 计算逻辑（增加平均成本、总本金字段）
  - [ ] SubTask 1.3: 将 HoldingsSummaryCard 从 CategoryTable 下方移到 CategoryTable 上方
  - [ ] SubTask 1.4: 卡片标题从"持仓汇总"改为"筛选汇总"

- [x] Task 2: 移除 all 标签并重新排列筛选项
  - [ ] SubTask 2.1: 移除 CategoryTable 组件内的分类名称标签（h3 + 圆点 + 项数）
  - [ ] SubTask 2.2: 将所有基础筛选项（市场、货币、二级分类、持仓分组）从高级筛选第二行移到第一行
  - [ ] SubTask 2.3: 调整筛选项顺序：所属账户、全部市场、全部货币、全部二级分类、全部持仓分组、高级筛选、列设置、搜索
  - [ ] SubTask 2.4: 移除高级筛选按钮（因为所有筛选项已在第一行平铺）

- [x] Task 3: 新增按钮移到列表右上角
  - [ ] SubTask 3.1: 从页面顶部移除新增按钮
  - [ ] SubTask 3.2: 在 CategoryTable 筛选项右侧添加新增按钮
  - [ ] SubTask 3.3: 确保新增按钮功能正常（打开新增弹窗）

- [x] Task 4: 列表增加序号列和全选功能
  - [ ] SubTask 4.1: 在表头第一列添加全选 checkbox
  - [ ] SubTask 4.2: 在每行第一列添加序号 + 单选 checkbox
  - [ ] SubTask 4.3: 实现全选/取消全选逻辑
  - [ ] SubTask 4.4: 添加 useState 管理选中状态

- [x] Task 5: 数值精度改为3位小数
  - [ ] SubTask 5.1: 修改 formatNum 函数，toFixed(2) 改为 toFixed(3)
  - [ ] SubTask 5.2: 检查所有使用 formatNum 的地方，确保3位小数显示正确
  - [ ] SubTask 5.3: 检查 formatCurrency 是否需要同步修改

- [x] Task 6: 构建与功能验证
  - [ ] SubTask 6.1: 运行 npm run build 确保无构建错误
  - [ ] SubTask 6.2: 浏览器端到端验证布局和功能

# Task Dependencies
- Task 1, Task 2, Task 3, Task 4, Task 5 可并行
- Task 6 depends on Task 1, Task 2, Task 3, Task 4, Task 5
