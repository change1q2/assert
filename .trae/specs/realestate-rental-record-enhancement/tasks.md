# Tasks

- [x] Task 1: 付款记录数据结构扩展
  - [x] 在 paymentRecords 中增加字段：rentalStatus（已出租/未出租）、isTerminated（是否退租）、refundAmount（退款额）
  - [x] 生成付款记录时设置默认值：rentalStatus='已出租', isTerminated='未退租', refundAmount=月租金
  - [x] 确保已有数据兼容（无新字段时按默认值处理）

- [x] Task 2: 付款记录表格增加新列
  - [x] 表格表头增加：出租状态、是否退租、退款额
  - [x] 出租状态显示标签（已出租绿色/未出租灰色）
  - [x] 是否退租显示可点击切换的标签（已退租红色/未退租灰色）
  - [x] 退款额显示可编辑输入框，默认月租金，失焦保存
  - [x] 点击「已退租」后，该记录的出租状态自动变为「未出租」

- [x] Task 3: 付款记录按年折叠
  - [x] 将 paymentRecords 按年份分组
  - [x] 使用 React state 记录各年份的展开/折叠状态
  - [x] 当前年份默认展开，其他年份默认折叠
  - [x] 年份标题行带展开/折叠图标，点击切换

- [x] Task 4: 年度统计行
  - [x] 在每年度记录前（或标题后）显示统计行
  - [x] 当年总收入 = 该年 paymentStatus='paid' 的 received 总和
  - [x] 总空闲 = 该年 isTerminated='已退租' 的月份及之后月份数 × 月租金
  - [x] 总退款 = 该年所有 refundAmount 总和
  - [x] 统计行使用醒目背景色区分

- [x] Task 5: 构建验证
  - [x] npm run build 成功
  - [x] 浏览器测试功能正常
