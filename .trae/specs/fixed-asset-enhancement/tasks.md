# Tasks

- [x] Task 1: 固定投资类型支持自定义新增
  - [x] SubTask 1.1: 新增 `customFixedInvestmentTypes` state
  - [x] SubTask 1.2: 修改 `renderFixedInvestmentForm` 中「类型」下拉，下拉选项 = 内置 + 自定义
  - [x] SubTask 1.3: 在下拉旁添加「+」按钮，点击 prompt 输入新类型

- [x] Task 2: 标签 "定期存" → "定期资产"
  - [x] SubTask 2.1: 修改 ASSET_TYPES 中 label 字段
  - [x] SubTask 2.2: 修改 `renderFixedDepositTable` 标题

- [x] Task 3: 定期资产默认值/数据结构更新
  - [x] SubTask 3.1: 修改 formDefaults.fixeddeposit 新增字段：market（默认「国内市场」）、location、usage、termType（长期/短期）、interestRate、startDate、endDate
  - [x] SubTask 3.2: 删除 period 字段

- [x] Task 4: 定期资产表单重写
  - [x] SubTask 4.1: 「市场」下拉（国内市场 / 海外市场），默认国内市场
  - [x] SubTask 4.2: 「地点」下拉联动（国内市场→省份，海外市场→国家）
  - [x] SubTask 4.3: 「类型」下拉 + 自定义新增按钮
  - [x] SubTask 4.4: 新增「作用」文本输入
  - [x] SubTask 4.5: 「方式」下拉（长期 / 短期）
  - [x] SubTask 4.6: 「开始时间」「结束时间」日期字段
  - [x] SubTask 4.7: 「利率」字段（替代「利息」）
  - [x] SubTask 4.8: 「金额」「货币种类」「账户本」保留
  - [x] SubTask 4.9: 「预期收益」自动计算 = 金额 × 利率 × 年化年数；只读展示

- [x] Task 5: 定期资产列表字段更新
  - [x] SubTask 5.1: 表头改为：市场、地点、类型、方式、货币种类、金额、利率、开始时间、结束时间、预期收益、实际收益、操作
  - [x] SubTask 5.2: 表格内容更新
  - [x] SubTask 5.3: 「操作」列添加「明细」按钮

- [x] Task 6: 定期资产明细弹窗
  - [x] SubTask 6.1: 新增 `showFixedDepositDetailModal`、`selectedFixedDeposit` state
  - [x] SubTask 6.2: 实现 `renderFixedDepositDetailModal`：日/月/年利息、日/月/年利率、到期日倒计时天数、到期总收益、总利率
  - [x] SubTask 6.3: 缺少必要字段时对应项显示「—」

- [x] Task 7: 账户计算兼容 fixeddeposit
  - [x] SubTask 7.1: 账户聚合中 fixeddeposit 分支保持 amount 计算

- [x] Task 8: 构建与验证
  - [x] SubTask 8.1: npm run build 成功
  - [x] SubTask 8.2: 手动验证固定投资类型自定义、定期资产全部新字段、明细弹窗计算正确

# Task Dependencies
- Task 3 依赖 Task 2（先改标签）
- Task 4 依赖 Task 3（先改默认值/数据结构）
- Task 5 依赖 Task 4（列表要展示新字段）
- Task 6 依赖 Task 4（明细弹窗读取新字段）
