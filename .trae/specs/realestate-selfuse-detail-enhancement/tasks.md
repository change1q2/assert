# Tasks

- [x] Task 1: 修改自用表单字段（税费/中介费利率化 + 删除二手价 + 新增购买类型）
  - [x] 修改 getDefaultFormData：tax改为taxRate，agencyFee改为agencyFeeRate，新增purchaseType
  - [x] 自用表单移除"二手价"输入框
  - [x] 自用表单新增"购买类型"下拉（新房/二手房）
  - [x] 税费改为"税费利率(%)"输入框，自动计算税费金额=购买价×税率/100
  - [x] 中介费改为"中介费利率(%)"输入框，自动计算中介费金额=购买价×费率/100
  - [x] 列表新增"购买类型"列
  - [x] 列表显示税费金额和中介费金额（使用taxRate和agencyFeeRate计算）

- [x] Task 2: 新增自用房产明细弹窗
  - [x] 新增 state：showSelfUseDetailModal, selectedSelfUseProperty, marketPricePerSqm, marketArea
  - [x] 新增 renderSelfUseDetailModal 函数
  - [x] 弹窗分为"购买数据"和"市场数据"两部分
  - [x] 购买数据只读：每平方米价格、面积、购买金额（自动计算）
  - [x] 市场数据可编辑：市场每平方米价格、市场面积、市场金额（自动计算）
  - [x] 自动计算：每平方差额、盈亏率
  - [x] 网络获取市场均价：通过input placeholder提示可手动输入或从网络获取

- [x] Task 3: 自用房产操作列增加明细按钮
  - [x] 列表操作列对自用房产显示"明细"按钮
  - [x] 点击明细按钮打开自用房产明细弹窗

- [x] Task 4: 构建验证
  - [x] npm run build 成功
  - [x] 浏览器测试所有功能正常
