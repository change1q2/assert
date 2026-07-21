# Tasks

- [x] Task 1: 修复列表出租方式显示并新增起租/到期时间列
  - [x] 检查出租方式字段名与数据一致性，修复显示问题
  - [x] 列表表头新增"起租时间"、"到期时间"列
  - [x] 列表数据行渲染起租时间和到期时间
  - [x] 调整 colSpan 从 19 到 21

- [x] Task 2: 重构 generateRentDetails 为按月生成付款记录
  - [x] 根据 rentMethod（押一付一/押一付三）决定生成周期
  - [x] 根据 rentStartDate 和 rentEndDate 计算总月数
  - [x] 押一付一：每月生成一条 {month, amountDue, amountPaid, paymentStatus}
  - [x] 押一付三：每三个月生成一条 {month, amountDue, amountPaid, paymentStatus}
  - [x] amountDue 根据周期和月租金计算
  - [x] paymentStatus 默认"未付款"

- [x] Task 3: 重构明细弹窗 UI（收益统计 + 付款记录表格）
  - [x] 弹窗顶部添加收益统计卡片：租赁天数/月数/年数、日/月/年收益
  - [x] 表格列改为：月份、应付款、实付款、是否付款、操作
  - [x] 是否付款状态带颜色标签（未付款灰色/已付款绿色/已逾期红色）
  - [x] 实付款可编辑，是否付款可切换
  - [x] 移除旧的"生成12期"按钮和相关逻辑

- [x] Task 4: 构建验证
  - [x] npm run build 成功
  - [x] 浏览器测试所有功能正常
