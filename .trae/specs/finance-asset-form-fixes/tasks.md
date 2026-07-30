# 持仓资产表单功能完善 - 实现计划

## [x] Task 1: 修复基金场内盈亏计算逻辑
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改Finance.jsx中资产详情表单的显示条件，将基金场内分类纳入自动计算盈亏的逻辑
  - 当前条件只判断股票和基金场内/场外，需要扩展为所有三级分类为"场内"的资产类型
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `human-judgement` TR-1.1: 选择基金+场内，输入成本和数量，盈亏自动计算不为0
  - `human-judgement` TR-1.2: 场内分类不显示持仓盈亏、盈亏率、当前市值手动输入框
- **Notes**: 当前代码在4640行附近，条件为 `!(newAccount.market === '国内市场' && (newAccount.assetType === '股票' || (newAccount.assetType === '基金' && (newAccount.categoryL3 === '场内' || newAccount.categoryL3 === '场外'))))`，需要改为基于categoryL3 === '场内'的判断

## [x] Task 2: 三级分类设为必填项
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在新增持仓资产表单中，将资产分类三级设为必填项
  - 修改FormField组件的required属性
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgement` TR-2.1: 未选择三级分类时点击保存，表单验证不通过
  - `human-judgement` TR-2.2: 三级分类标签显示红色星号标识必填
- **Notes**: 当前三级分类FormField在4400行，需要添加required属性

## [x] Task 3: 实现市场与二级分类联动
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改categoryL2Options的计算逻辑，根据市场选择动态显示二级分类选项
  - 港股市场→港股，美股市场→美股，国内市场→A股、港股通
- **Acceptance Criteria Addressed**: AC-6, AC-7, AC-8
- **Test Requirements**:
  - `human-judgement` TR-3.1: 选择港股市场，二级分类只显示"港股"
  - `human-judgement` TR-3.2: 选择美股市场，二级分类只显示"美股"
  - `human-judgement` TR-3.3: 选择国内市场，二级分类显示"A股"和"港股通"
- **Notes**: 当前categoryL2Options在3654行，需要添加市场联动逻辑

## [x] Task 4: 实现资产分类一级与资产类型联动
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改CATEGORY_L1_ASSET_TYPES映射，确保资产类型选项根据一级分类动态显示
  - 确保新增资产类型时也按一级分类保存
- **Acceptance Criteria Addressed**: AC-10
- **Test Requirements**:
  - `human-judgement` TR-4.1: 选择不同一级分类，资产类型下拉选项变化
  - `human-judgement` TR-4.2: 新增资产类型时，只在对应一级分类下显示
- **Notes**: 当前CATEGORY_L1_ASSET_TYPES需要确认是否已存在，需要查看代码

## [x] Task 5: 实现筛选条件历史保存和自定义组合
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 在CategoryTable组件中添加保存筛选条件功能
  - 使用localStorage保存筛选条件组合，支持自定义名称
  - 添加快速选择历史筛选条件的下拉菜单
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgement` TR-5.1: 设置筛选条件后可保存并命名
  - `human-judgement` TR-5.2: 下次进入页面可直接点击历史筛选条件组合
- **Notes**: 需要在CategoryTable组件中添加保存按钮和历史记录下拉

## [x] Task 6: 修复账户管理余额显示
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 在Accounts.jsx中添加余额计算逻辑
  - 根据financeAssets中的数据计算每个账户的余额
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgement` TR-6.1: 账户列表显示正确的余额数据
  - `human-judgement` TR-6.2: 余额数据与持仓资产中的账户关联数据一致
- **Notes**: 需要从stateData中获取financeAssets数据并按账户分组计算

## [x] Task 7: 实现账户货币转换显示
- **Priority**: medium
- **Depends On**: Task 6
- **Description**: 
  - 在Accounts.jsx中添加货币选择功能
  - 根据所选货币和汇率转换显示账户余额
- **Acceptance Criteria Addressed**: AC-9
- **Test Requirements**:
  - `human-judgement` TR-7.1: 选择不同货币，账户余额按汇率转换显示
  - `human-judgement` TR-7.2: 切换货币时显示正确的符号和格式
- **Notes**: 需要使用现有的exchangeRates数据和货币转换工具函数