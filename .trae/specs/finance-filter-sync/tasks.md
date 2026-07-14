# Tasks

-## [x] Task 1: 筛选栏字段重新排列
  - [ ] SubTask 1.1: 将默认筛选栏调整为：搜索框、资产分类、资产类型、所属账户、高级筛选按钮、列设置按钮
  - [ ] SubTask 1.2: 将市场、货币筛选从默认栏移入高级筛选
  - [ ] SubTask 1.3: 确保高级筛选包含：市场、货币、资产分类二级、持仓分组、持位分类、标签、重置按钮

-## [x] Task 2: 修复数据读取（从 financeAssets 读取）
  - [ ] SubTask 2.1: 修改 loadData 函数，从 data.financeAssets 读取数据，替代 data.accounts.filter(a => !a.liability)
  - [ ] SubTask 2.2: 建立 financeAssets 字段到前端 holding 结构的完整映射
  - [ ] SubTask 2.3: 确保分类聚合逻辑使用映射后的数据正确分组

-## [x] Task 3: 修复数据保存（保存到 financeAssets）
  - [ ] SubTask 3.1: 修改 handleSaveAccount，将 payload 构建为 financeAssets 格式（字段名映射）
  - [ ] SubTask 3.2: 修改 handleEdit，从 financeAssets 映射后的数据预填弹窗
  - [ ] SubTask 3.3: 使用 saveState（PUT /api/state）整体保存 financeAssets 数组
  - [ ] SubTask 3.4: 确保新增和编辑后调用 loadData 刷新列表能看到新数据

-## [x] Task 4: 构建验证
  - [ ] SubTask 4.1: 运行 npm run build 确保无构建错误
  - [ ] SubTask 4.2: 浏览器验证：筛选栏布局正确、新增数据能显示

# Task Dependencies
- Task 2 depends on none
- Task 3 depends on Task 2
- Task 4 depends on Task 1, Task 2, Task 3
