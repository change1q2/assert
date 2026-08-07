# 理财模块功能优化 - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: 必填项校验增强
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 完善 `handleSaveAccount` 函数中的必填项校验
  - 确保所有带 `*` 标记的字段都被校验
  - 校验失败时弹出清晰的提示，列出缺失的字段名
  - 需要覆盖的字段：市场、资产种类、资产分类一级、资产类型、所属账户、资产分类二级、资产分类三级、持仓分组、持仓分类
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: 新增持仓时，所有必填字段为空点击保存，应弹出 alert 提示"请填写必填项：市场、资产种类、..."
  - `programmatic` TR-1.2: 编辑持仓时，清空必填字段后点击保存，应弹出相同格式的提示
  - `human-judgement` TR-1.3: 提示信息中的字段名称应使用用户友好的中文标签
- **Status**: ✅ Completed

## [x] Task 2: 持仓列表 CSV 导出功能
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 `FinanceHoldingsTable.jsx` 组件中添加导出按钮
  - 实现 `handleExportToCSV` 函数，将当前筛选条件下的持仓数据导出为 CSV
  - CSV 文件需要包含：代码、名称、市场、货币、资产类型、持仓成本、现价、数量、当前市值、持仓盈亏等主要字段
  - 添加 UTF-8 BOM 以支持 Excel 正确显示中文
  - 文件命名格式：持仓数据_YYYYMMDD.csv
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: 点击导出按钮后应触发浏览器下载，文件名符合格式要求
  - `programmatic` TR-2.2: 导出的 CSV 应包含当前筛选结果的所有持仓记录
  - `human-judgement` TR-2.3: 用 Excel 打开 CSV 文件，中文字符应正常显示
- **Status**: ✅ Completed

## [x] Task 3: 修复详情弹窗余额显示为负数
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 检查 `DetailModal` 组件中账户余额的显示逻辑
  - 定位余额显示为 -90.850 的原因（可能是格式符号或数值计算问题）
  - 修复余额显示逻辑，确保正数不显示为负数
  - 检查 `formatCurrencyWithRate` 函数是否正确处理余额值
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-3.1: 账户余额为正数时，详情弹窗显示应为正数（无前导负号）
  - `programmatic` TR-3.2: 账户余额为负数时（真实负债），才显示负号
  - `human-judgement` TR-3.3: 余额颜色应根据正负正确显示（蓝色正数/红色负数）
- **Status**: ✅ Completed

## [x] Task 4: 支持负份额交易记录
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 `handleAddRecord` 函数，允许 quantity 为负数
  - 添加负数份额时，自动减少账户余额：余额 = 余额 + |负数金额|（因为减少持仓相当于卖出）
  - 触发流动性判断：如果份额归零则标记为清仓
  - 保持与正份额交易相同的手续费处理逻辑
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-4.1: 添加 -30 股交易记录后，总份额应正确减少 30
  - `programmatic` TR-4.2: 添加负份额交易后，账户余额应相应增加
  - `programmatic` TR-4.3: 添加负份额导致份额为 0 时，应自动归档
- **Status**: ✅ Completed

## [x] Task 5: 货币基金详情弹窗字段改造
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 `DetailModal` 组件中，判断 `positionType === '货币基金'` 时切换显示字段
  - 显示新字段：7日年化、万份收益、累计收益、持有收益、持有收益率、持有份额、成本单价、分红方式
  - 保留原有：持仓天数、交易税费、数据校验、交易记录等通用区域
  - 分红方式默认值设为"红利再投"
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-5.1: 货币基金持仓详情弹窗应显示全部 8 个专用字段
  - `programmatic` TR-5.2: 非货币基金持仓详情弹窗不应显示货币基金专用字段
  - `human-judgement` TR-5.3: 字段布局应合理、美观，不影响原有交互
- **Status**: ✅ Completed

## [x] Task 6: 货币基金现价与收益计算逻辑
- **Priority**: high
- **Depends On**: Task 5
- **Description**: 
  - 货币基金现价字段默认值设为 1
  - 持有收益计算公式：持有收益 = 1 × 持有份额 - 成本单价 × 持有份额
  - 持有收益率 = 持有收益 / (成本单价 × 持有份额) × 100%
  - 万份收益字段独立展示，用于手动输入或显示每日收益
  - 在持仓表格中，货币基金的现价列显示为 1
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `programmatic` TR-6.1: 货币基金现价字段默认值为 1
  - `programmatic` TR-6.2: 份额 1000、成本 0.99 的货币基金，持有收益应计算为 10
  - `programmatic` TR-6.3: 持仓列表中货币基金的现价列显示为 ¥1.000
  - `programmatic` TR-6.4: 万份收益字段支持输入和显示
- **Status**: ✅ Completed
