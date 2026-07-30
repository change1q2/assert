# 理财模块修复后集成测试 - 验证清单

## 登录验证
- [ ] Checkpoint 1: SuperAdmin / Super12345 登录成功，进入系统主页

## 建仓现金扣减
- [ ] Checkpoint 2: 新增持仓表单中"所属账户"下拉框显示 test 账户
- [ ] Checkpoint 3: 持仓创建成功，显示在活跃持仓列表
- [ ] Checkpoint 4: 明细弹窗打开成功，显示建仓交易记录
- [ ] Checkpoint 5: 建仓交易记录显示关联现金账户信息

## 清仓归档
- [ ] Checkpoint 6: 添加清仓交易记录成功保存
- [ ] Checkpoint 7: 持仓自动从活跃列表消失
- [ ] Checkpoint 8: 切换到归档持仓标签，可看到已归档的持仓
- [ ] Checkpoint 9: 归档列表显示正确的资产名称和清仓信息

## 现金账户
- [ ] Checkpoint 10: 账户管理页面存在自动创建的现金账户
- [ ] Checkpoint 11: 现金账户余额反映建仓扣减和清仓增加的变化

## 部分卖出
- [ ] Checkpoint 12: 新增"部分卖出测试"持仓成功
- [ ] Checkpoint 13: 添加卖出交易（50股@11元）成功保存
- [ ] Checkpoint 14: 持仓仍在活跃列表，剩余数量为 150
- [ ] Checkpoint 15: 现金账户余额正确反映卖出资金流入

## 交易记录关联
- [ ] Checkpoint 16: 每条交易记录显示关联账户名称
- [ ] Checkpoint 17: 交易记录中关联账户信息完整且可读

## 数据完整性
- [ ] Checkpoint 18: localStorage 数据未被清除
- [ ] Checkpoint 19: 所有测试操作刷新页面后数据仍然保留
