# 负债资产显示 + 生存资金独立化 - 实现计划

## 任务 1: 负债账户数据聚合修复
- **状态**: `pending`
- **优先级**: high
- **依赖项**: 无
- **描述**:
  - 修复 `Accounts.jsx` 中 `accountStats` 的负债数据聚合逻辑
  - 从债务模块获取：剩余未还金额（marketValue）、本金总额（holdingCost）、已还金额、盈亏
  - 确保 `debt.amount` 字段正确映射到剩余未还金额
  - 处理 `debt.plan` 中的还款计划数据，计算已还期数和剩余期数
  - 账户列表中负债类型行正确显示市值、成本、盈亏、余额
- **验收标准关联**: AC-1
- **测试要求**:
  - `rule` TR-1.1: 负债账户的 accountStats.marketValue 等于关联债务的剩余未还金额之和；通过条件：代码审查 + 单元级验证计算
  - `rule` TR-1.2: 负债账户的 accountStats.holdingCost 等于关联债务的本金之和；通过条件：同上
  - `rule` TR-1.3: 负债账户盈亏计算为 -(市值-成本)；通过条件：代码审查
  - `rubric` TR-1.4: 负债数据一致性；规模 1-5；锚点 1=数据错误/缺失；3=基本正确/个别遗漏；5=完全正确/与债务模块实时一致；阈值 >= 4；证据：账户列表截图 + 债务模块对比

## 任务 2: 负债账户详情页展示
- **状态**: `pending`
- **优先级**: high
- **依赖项**: 任务 1
- **描述**:
  - 在账户详情弹窗中，当有效类型为「负债」时，显示债务明细区域
  - 展示：债务名称、本金、利率、已还金额、剩余金额、还款方式
  - 可选：展示最近3期还款计划
- **验收标准关联**: AC-2
- **测试要求**:
  - `rule` TR-2.1: 选中负债账户时详情弹窗显示债务明细；通过条件：截图验证
  - `rule` TR-2.2: 债务明细的数值与债务模块一致；通过条件：对比验证

## 任务 3: 生存资金数据模型与后端存储
- **状态**: `pending`
- **优先级**: high
- **依赖项**: 无
- **描述**:
  - 在 `state-service.js` 的 `saveUserState` 和 `loadUserState` 中添加 `survival_funds` 表的读写
  - 表结构：id, user_id, name, type, currency, amount, account_id, cost_basis, metadata_json
  - 添加 `freedom_budgets` 表：id, user_id, name, category, period_type('daily'|'weekly'|'monthly'|'yearly'), budget_amount, actual_amount, metadata_json
  - 数据迁移：将现有 `independentAssets.survivalfund` 数据迁移到 `survival_funds` 表
- **验收标准关联**: AC-10
- **测试要求**:
  - `rule` TR-3.1: saveUserState 包含 survival_funds 的 INSERT/DELETE；通过条件：代码审查
  - `rule` TR-3.2: loadUserState 包含 survival_funds 的 SELECT；通过条件：代码审查
  - `rule` TR-3.3: saveUserState 包含 freedom_budgets 的 INSERT/DELETE；通过条件：代码审查
  - `rule` TR-3.4: 刷新页面后 survivalFunds 和 freedomBudgets 数据保留；通过条件：刷新前后对比

## 任务 4: 生存资金页面 - 路由与侧边栏
- **状态**: `pending`
- **优先级**: high
- **依赖项**: 无
- **描述**:
  - 创建 `SurvivalFunds.jsx` 页面组件
  - 在 `App.jsx` 的 menuItems 中添加 `survival-funds` 入口（位于 `finance` 上方）
  - 在路由配置中添加对应路径
  - 布局结构：4 行（总览卡片 / 自由度 / 账户本 / 列表）
- **验收标准关联**: AC-3
- **测试要求**:
  - `rule` TR-4.1: 侧边栏存在 id='survival-funds' 的菜单项；通过条件：侧边栏截图
  - `rule` TR-4.2: 点击侧边栏项正确切换到生存资金页面；通过条件：交互测试

## 任务 5: 生存资金总览卡片
- **状态**: `pending`
- **优先级**: high
- **依赖项**: 任务 4
- **描述**:
  - 实现第一行：总价值、总成本、总收益、总收益率 四张卡片
  - 使用 useMemo 计算，支持多币种折算
  - 总价值 = sum(survivalFund.amount 折算到 CNY)
  - 总成本 = sum(survivalFund.costBasis 折算到 CNY)
  - 总收益 = 总价值 - 总成本
  - 总收益率 = 总收益 / 总成本 (处理除零)
- **验收标准关联**: AC-4
- **测试要求**:
  - `rule` TR-5.1: 四张卡片显示正确计算值；通过条件：手动计算对比
  - `rule` TR-5.2: 多币种折算正确；通过条件：设置不同币种的生存资金验证
  - `rubric` TR-5.3: 视觉效果；规模 1-5；阈值 >= 4；证据：截图

## 任务 6: 自由现金流自由度计算
- **状态**: `pending`
- **优先级**: high
- **依赖项**: 任务 3, 任务 4
- **描述**:
  - 实现第二行：日/周/月/年四个自由度卡片
  - 自由额度 = sum(freedomBudget.budgetAmount where period_type matches)
  - 实际金额 = sum(freedomBudget.actualAmount where period_type matches)
  - 自由度 = 实际 / 预算 (处理除零)
  - 自由现金流列表：表格形式，支持新增/编辑/删除
  - 新增表单：自由名称（自定义输入 + 预设选项下拉）、周期、预算金额、实际金额
  - 最下方合计行
- **验收标准关联**: AC-5, AC-6
- **测试要求**:
  - `rule` TR-6.1: 四个自由度卡片计算正确；通过条件：手动计算对比
  - `rule` TR-6.2: 自由现金流列表 CRUD 正常；通过条件：新增/编辑/删除测试
  - `rule` TR-6.3: 列表合计行数值正确；通过条件：合计 = sum(各行)
  - `rubric` TR-6.4: 自由度可视化效果；规模 1-5；阈值 >= 4

## 任务 7: 生存资金账户本
- **状态**: `pending`
- **优先级**: medium
- **依赖项**: 任务 4
- **描述**:
  - 实现第三行：账户本列表
  - 从 stateData.accounts 过滤类型为'独立资产'且关联生存资金的账户
  - 每个账户卡片显示：账户名、当前余额（从 accountStats 获取）、收益率
  - 底部合计余额
- **验收标准关联**: AC-7
- **测试要求**:
  - `rule` TR-7.1: 账户本卡片正确显示余额数据；通过条件：截图 + 手动验证
  - `rule` TR-7.2: 合计余额 = sum(各账户余额)；通过条件：计算验证

## 任务 8: 生存资金列表
- **状态**: `pending`
- **优先级**: high
- **依赖项**: 任务 3, 任务 4
- **描述**:
  - 实现第四行：生存资金列表
  - 字段：名称、类型（应急储备/日常开支/长期储备/投资本金）、币种、金额、账户本、操作
  - 支持新增/编辑/删除
  - 新增表单：名称、类型下拉、币种、金额、账户本下拉
  - 最下方合计行，支持币种切换
- **验收标准关联**: AC-8
- **测试要求**:
  - `rule` TR-8.1: 列表 CRUD 正常；通过条件：新增/编辑/删除测试
  - `rule` TR-8.2: 合计行数值 = sum(各行金额折算)；通过条件：截图验证
  - `rule` TR-8.3: 新增表单账户本下拉显示所有可选账户；通过条件：下拉截图

## 任务 9: 独立资产模块清理
- **状态**: `pending`
- **优先级**: medium
- **依赖项**: 任务 4, 任务 8
- **描述**:
  - 从 `IndependentAssets.jsx` 的 tabs 中移除「生存资金」tab
  - 保留现有数据兼容层（读取 survivalfund 数据时从新的 state 路径获取）
  - 更新路由：确保独立资产页面不再渲染生存资金 tab
- **验收标准关联**: AC-9
- **测试要求**:
  - `rule` TR-9.1: 独立资产 tabs 不包含生存资金；通过条件：截图验证
  - `rule` TR-9.2: 独立资产其他功能不受影响；通过条件：构建 + 现有功能测试

## 任务 10: 构建验证与集成测试
- **状态**: `pending`
- **优先级**: high
- **依赖项**: 任务 1-9
- **描述**:
  - 运行 `npm run build` 确保无编译错误
  - 手动验证所有功能点
  - 刷新持久化测试
  - 多账户场景测试
- **验收标准关联**: AC-1 至 AC-11
- **测试要求**:
  - `rule` TR-10.1: `npm run build` 无错误；通过条件：构建日志
  - `rule` TR-10.2: 所有功能点手动验证通过；通过条件：截图 + 检查清单
  - `rule` TR-10.3: 刷新后数据持久化；通过条件：刷新前后对比
