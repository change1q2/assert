# 独立资产模块 - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: 创建独立资产模块页面框架
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 `src/pages/` 下创建 `IndependentAssets.jsx` 文件
  - 创建基本页面结构：汇总数据卡片、账户本表格、资产类型标签页
  - 添加导航路由到 App.jsx
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgment` TR-1.1: 页面正常显示，导航到独立资产模块
  - `human-judgment` TR-1.2: 页面结构完整（汇总、账户本、资产类型）
- **Notes**: 参考 Finance.jsx 和 Accounts.jsx 的结构

## [x] Task 2: 实现汇总数据展示
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 计算并展示总价值、演示收益总额、实际收益总额
  - 汇总数据从各资产类型数据中计算得出
  - 创建汇总卡片组件
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgment` TR-2.1: 汇总数据卡片显示正确
  - `human-judgment` TR-2.2: 数据随资产变化实时更新
- **Notes**: 汇总逻辑需要遍历所有资产类型

## [x] Task 3: 实现账户本数据同步
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 从 stateData.accounts 中读取账户数据
  - 创建账户本表格，显示账户名称、类型、余额等
  - 支持分页功能
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgment` TR-3.1: 账户本数据与账户管理模块一致
  - `human-judgment` TR-3.2: 表格支持分页和滚动
- **Notes**: 只读显示，不支持在独立资产模块修改账户

## [x] Task 4: 实现保险资产管理
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 创建保险资产表格，参考用户提供的图片格式
  - 表单字段：保单年度、缴付保费总额、保证金额（保证现金价值、复归红利、终期分红）、非保证金额、演示收益额、演示收益率、演示年化收益率、实际收益额、实际收益率、实际年化收益率
  - 支持新增、编辑、删除操作
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgment` TR-4.1: 保险表单包含所有要求字段
  - `human-judgment` TR-4.2: 表格显示与图片格式一致
  - `human-judgment` TR-4.3: 增删改功能正常
- **Notes**: 参考用户提供的退保发还金额表格图片

## [x] Task 5: 实现房产资产管理
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 创建房产资产表格
  - 表单字段：国家、省份、市区、地区、类型、地区平均价格、二手价、新房平均价
  - 支持新增、编辑、删除操作
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgment` TR-5.1: 房产表单包含所有要求字段
  - `human-judgment` TR-5.2: 增删改功能正常
- **Notes**: 类型字段包含住宅、商业、工业等选项

## [x] Task 6: 实现车辆资产管理
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 创建车辆资产表格
  - 表单字段：类型（小轿车/电动车）、厂商、型号、购买价格、二手价格、新车价
  - 支持新增、编辑、删除操作
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `human-judgment` TR-6.1: 车辆表单包含所有要求字段
  - `human-judgment` TR-6.2: 增删改功能正常
- **Notes**: 类型字段为单选：小轿车或电动车

## [x] Task 7: 实现固定投资管理
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - 创建固定投资表格
  - 表单字段：国家、省份、地区、类型、投入成本、分红时间、分红金额
  - 支持新增、编辑、删除操作
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `human-judgment` TR-7.1: 固定投资表单包含所有要求字段
  - `human-judgment` TR-7.2: 增删改功能正常
- **Notes**: 类型字段包含债券、基金定投等选项

## [x] Task 8: 实现股权管理
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - 创建股权表格，参考理财模块持仓明细字段
  - 字段：名称、代码、成本、数量、当前价格、市值、盈亏、盈亏比例等
  - 支持新增、编辑、删除操作
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `human-judgment` TR-8.1: 股权列表字段与理财模块持仓明细一致
  - `human-judgment` TR-8.2: 增删改功能正常
- **Notes**: 参考 Finance.jsx 持仓明细表字段

## [x] Task 9: 实现定期存款管理
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - 创建定期存款表格
  - 表单字段：市场、地点、类型、货币种类、金额、利息、期间、预期收益、实际收益
  - 支持新增、编辑、删除操作
- **Acceptance Criteria Addressed**: AC-9
- **Test Requirements**:
  - `human-judgment` TR-9.1: 定期存款表单包含所有要求字段
  - `human-judgment` TR-9.2: 增删改功能正常
- **Notes**: 期间字段单位为月或年

## [x] Task 10: 实现数据持久化和构建验证
- **Priority**: medium
- **Depends On**: Task 2-9
- **Description**:
  - 将所有资产数据存储到 stateData 中并保存到 localStorage
  - 确保刷新页面后数据不丢失
  - 运行构建命令验证代码正确性
- **Acceptance Criteria Addressed**: AC-10
- **Test Requirements**:
  - `programmatic` TR-10.1: `npm run build` 构建成功（exit code 0）
  - `human-judgment` TR-10.2: 刷新页面数据保持不变
- **Notes**: 使用现有 fetchState/saveState API
