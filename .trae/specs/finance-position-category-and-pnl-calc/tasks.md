# Tasks

- [x] Task 1: 持仓分类支持自由增删改
  - [ ] SubTask 1.1: 将 POSITION_TYPE_OPTIONS 从常量改为 useState 状态变量
  - [ ] SubTask 1.2: 在持仓分类下拉旁边添加编辑按钮（Settings 图标）
  - [ ] SubTask 1.3: 添加管理弹窗，支持新增、编辑、删除操作
  - [ ] SubTask 1.4: 使用 localStorage 持久化自定义选项（key: 'finance_position_type_options'）
  - [ ] SubTask 1.5: 默认选项：核心股票仓位、成长股仓位、价值股仓位、ETF仓位、基金定投、打新仓位、波段操作、其他

- [x] Task 2: 修正持仓盈亏率计算公式
  - [ ] SubTask 2.1: 新增弹窗中：单份盈亏 = 现价 - 持仓成本，持仓盈亏 = 单份盈亏 × 份额，持仓盈亏率 = 单份盈亏 ÷ 持仓成本 × 100%
  - [ ] SubTask 2.2: 修正现价、数量、持仓成本变化的 onChange 逻辑
  - [ ] SubTask 2.3: 修正选择搜索结果后的计算逻辑
  - [ ] SubTask 2.4: 列表中持仓盈亏率列使用相同的计算公式

- [x] Task 3: 持仓盈亏率字段重命名和显示格式
  - [ ] SubTask 3.1: 新增弹窗中"盈亏率%"改为"持仓盈亏率"
  - [ ] SubTask 3.2: 列表中"盈亏率%"列名改为"持仓盈亏率"
  - [ ] SubTask 3.3: 持仓盈亏率显示为百分比格式（如 -0.43%），保留 2 位小数，正数前显示 + 号

- [x] Task 4: 构建与功能验证
  - [ ] SubTask 4.1: 运行 npm run build 确保无构建错误
  - [ ] SubTask 4.2: 浏览器验证持仓分类增删改、盈亏率计算和显示

# Task Dependencies
- Task 1, Task 2, Task 3 可并行
- Task 4 depends on Task 1, Task 2, Task 3
