# 理财模块 - 详情弹窗与交易记录优化 - 任务分解

## [ ] Task 1: 修复四级分类筛选白屏问题
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 CategoryTable 组件中添加 `categoryL4Options` prop 传递
  - 确保筛选区域四级分类下拉框使用正确的数据源
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgment` TR-1.1: 勾选筛选设置中的四级分类，页面正常显示，下拉框可正常选择
  - `human-judgment` TR-1.2: 构建成功，无 JavaScript 错误

## [ ] Task 2: 债权类二级分类选项配置
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在新增资产弹窗中，修改二级分类下拉选项的联动逻辑
  - 当一级分类为"债权类"时，二级分类显示"中债"、"美债"选项
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgment` TR-2.1: 新增资产时选择债权类，二级分类显示中债、美债
  - `human-judgment` TR-2.2: 其他一级分类保持原有二级分类选项不变

## [ ] Task 3: 四级分类改为下拉选项并建立关联关系
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 将四级分类从输入框改为下拉选择框
  - 实现四级分类与一级分类的关联存储（localStorage）
  - 修改新增弹窗和筛选区域的四级分类组件
  - 添加四级分类管理弹窗（增删改）
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgment` TR-3.1: 四级分类显示为下拉框，可选择已有选项
  - `human-judgment` TR-3.2: 在权益类下添加的四级分类，切换到债权类时不显示
  - `human-judgment` TR-3.3: 四级分类选项持久化到 localStorage

## [ ] Task 4: 债券类场外资产详情弹窗卡片优化
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改详情弹窗卡片区域，根据资产类型动态调整显示
  - 当一级分类为债券类且三级分类为场外时，卡片标题改为"资产"
  - 显示昨日收益、持仓收益、持仓收益率、最新净值、日涨幅、持仓成本单价、累计收益、全部份额、可用份额、持有收益、持有收益率等字段
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgment` TR-4.1: 债券类场外资产详情弹窗卡片标题显示"资产"
  - `human-judgment` TR-4.2: 卡片包含昨日收益、持仓收益、持仓收益率等字段
  - `human-judgment` TR-4.3: 其他类型资产保持原有卡片显示

## [ ] Task 5: 交易记录字段升级
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 交易记录类型新增"建仓"选项
  - 修改交易记录显示布局：类型+日期在右侧，下方显示确认金额、确认份额、确认净值、手续费
  - 修改新增记录弹窗字段为确认金额、确认份额、确认净值、手续费
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgment` TR-5.1: 交易记录类型包含建仓/买入/卖出/分红
  - `human-judgment` TR-5.2: 记录显示布局正确，日期在类型右侧
  - `human-judgment` TR-5.3: 新增记录弹窗字段为确认金额、确认份额、确认净值、手续费

## [ ] Task 6: 添加定投功能
- **Priority**: medium
- **Depends On**: Task 5
- **Description**: 
  - 在图片识别按钮右侧添加定投开关按钮
  - 实现定投设置弹窗，支持按金额/份额定投切换
  - 支持定投周期选择：每日、每周、每两周、每月
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `human-judgment` TR-6.1: 定投开关按钮显示在图片识别右侧
  - `human-judgment` TR-6.2: 点击后可选择按金额或按份额定投
  - `human-judgment` TR-6.3: 可选择每日/每周/每两周/每月周期

## [ ] Task 7: 图片识别改为场外基金模式
- **Priority**: medium
- **Depends On**: Task 5
- **Description**: 
  - 修改图片识别模拟数据为场外基金格式
  - 修改识别结果校验弹窗字段为确认金额、确认份额、确认净值、手续费
  - 确保与交易记录字段保持一致
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `human-judgment` TR-7.1: 识别结果校验弹窗字段为确认金额、确认份额、确认净值、手续费
  - `human-judgment` TR-7.2: 导入后交易记录显示正确

