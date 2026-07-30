# 验证清单 - 理财模块清仓归档与现金流管理

## 修复项验证
- [x] Checkpoint 1: 新增持仓表单"所属账户"下拉框显示账户管理中的所有账户 ✅
- [x] Checkpoint 2: 编辑持仓表单"所属账户"正确回填当前账户 ✅
- [x] Checkpoint 3: 持仓列表"编辑"按钮打开编辑弹窗并预填数据 ✅
- [x] Checkpoint 4: 持仓列表"明细"按钮打开明细弹窗 ✅
- [x] Checkpoint 5: 持仓列表"删除"按钮弹出确认对话框 ✅
- [x] Checkpoint 6: 点击持仓行空白区域打开明细弹窗 ✅

## 清仓交易验证
- [x] Checkpoint 7: 交易记录类型下拉框包含"清仓"选项 ✅
- [x] Checkpoint 8: 清仓类型有独立视觉标签（颜色区分） ✅
- [x] Checkpoint 9: 卖出数量 >= 持仓数量时自动标记为清仓 ✅
- [x] Checkpoint 10: 清仓后持仓从活跃列表消失 ✅
- [x] Checkpoint 11: 清仓后归档列表新增对应记录 ✅

## 归档列表验证
- [x] Checkpoint 12: 理财模块有"活跃持仓"和"归档持仓"切换 ✅
- [x] Checkpoint 13: 归档列表显示资产名称、代码、清仓日期、最终盈亏 ✅
- [x] Checkpoint 14: 归档持仓可查看明细（只读模式） ✅
- [x] Checkpoint 15: 归档列表支持删除操作 ✅
- [x] Checkpoint 16: 归档列表支持分页 ✅

## 现金账户联动验证
- [x] Checkpoint 17: 建仓交易保存后现金账户余额正确扣减（含手续费） ✅
- [x] Checkpoint 18: 买入交易保存后现金账户余额正确扣减（含手续费） ✅
- [x] Checkpoint 19: 卖出交易保存后现金账户余额正确增加（扣手续费） ✅
- [x] Checkpoint 20: 清仓交易保存后现金账户余额正确增加（扣手续费） ✅
- [x] Checkpoint 21: 无现金账户时交易触发自动创建现金账户 ✅
- [x] Checkpoint 22: 自动创建的现金账户名称为 "{账户名} 现金账户" ✅
- [x] Checkpoint 23: 自动创建的现金账户货币单位与持仓一致 ✅

## 交易记录关联验证
- [x] Checkpoint 24: 新交易记录包含 cashAccountId 和 cashAccountName 字段 ✅
- [x] Checkpoint 25: 明细弹窗交易记录显示关联的现金账户名称 ✅
- [x] Checkpoint 26: 老交易记录（无 cashAccountId）正常显示 ✅

## 数据完整性验证
- [x] Checkpoint 27: 数据库迁移文件执行无错误 ✅
- [x] Checkpoint 28: finance_asset_archives 表正确创建 ✅
- [x] Checkpoint 29: 交易记录表 cash_account_id 字段正确添加 ✅
- [x] Checkpoint 30: finance_assets 表 status 和 archive_date 字段正确添加 ✅
- [x] Checkpoint 31: 全流程数据一致性 ✅

## 兼容性验证
- [x] Checkpoint 32: 老数据（无状态字段、无现金账户关联）正常加载和显示 ✅
- [x] Checkpoint 33: 未清仓的持仓继续在活跃列表显示 ✅
- [x] Checkpoint 34: 统计分析正确区分活跃持仓和归档持仓 ✅

## 构建验证
- [x] Checkpoint 35: `npm run build` 成功无错误 ✅
- [x] Checkpoint 36: 前端开发服务器正常启动 ✅
- [x] Checkpoint 37: 后端 API 服务正常启动 ✅
- [x] Checkpoint 38: 登录后理财模块正常加载 ✅

## 增强功能验证
- [x] Checkpoint 39: 选择清仓类型时数量自动填充剩余持仓 ✅
- [x] Checkpoint 40: 选择清仓类型时价格自动填充当前价格 ✅
- [x] Checkpoint 41: 列表持仓数量随买入交易自动增加 ✅
- [x] Checkpoint 42: 列表持仓数量随卖出交易自动减少 ✅
- [x] Checkpoint 43: 列表成本价根据交易明细自动更新 ✅
- [x] Checkpoint 44: 数据校验通过（明细持仓成本 = 列表持仓成本） ✅
- [x] Checkpoint 45: 交易表单费用字段在数量旁边 ✅
- [x] Checkpoint 46: 交易表单金额自动计算（价格×数量） ✅
- [x] Checkpoint 47: 金额在所有必填字段填写后才计算 ✅
- [x] Checkpoint 48: 归档持仓最终盈亏 = 卖出总金额 - 买入总金额 - 总费用 ✅
- [x] Checkpoint 49: 归档持仓最终收益率计算正确 ✅
- [x] Checkpoint 50: 归档明细中最终盈亏显示不为0（当有实际盈亏时） ✅
- [x] Checkpoint 51: 现金账户买入时扣减（金额+费用） ✅
- [x] Checkpoint 52: 现金账户卖出时增加（金额-费用） ✅

## 关键修复记录
- **Bug 1 (所属账户下拉框无数据)**：loadData 中检查 accounts 为空时从 localStorage/默认数据补充
- **Bug 2 (持仓列表按钮点击无效)**：表格行添加 onClick + stopPropagation
- **Bug 3 (清仓归档不生效)**：financeAccounts 映射遗漏 status/isArchived 字段，导致 activeHoldings 过滤失效
- **Bug 4 (现金账户重复创建)**：统一使用 `${accountName} 现金账户` 命名规则搜索和创建现金账户
- **Bug 5 (建仓交易未更新现金账户)**：handleSaveAccount 新增持仓时添加现金账户联动逻辑
