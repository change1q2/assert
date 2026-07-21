# 保险资产保单重构 - 任务清单

## [ ] Task 1: 重构保险资产数据结构
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改 [IndependentAssets.jsx](file:///d:/code/assert/assert_WEB/src/pages/IndependentAssets.jsx) 中保险资产的默认数据结构
  - 新字段：policyNumber, policyName, insuredPerson, paymentYears, effectiveDate, paidPremium
  - 新增 details 数组用于存储明细计划
  - 废弃旧字段：policyYear, premiumTotal, guaranteedAmount, nonGuaranteedAmount, demoProfitAmount, demoProfitRate, demoAnnualRate, actualProfitAmount, actualProfitRate, actualAnnualRate
- **Acceptance Criteria Addressed**: 保单数据结构

## [ ] Task 2: 重构保险资产列表展示
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 修改 `renderInsuranceTable` 方法
  - 列表展示字段：保单号码、保单名称、受保人、缴费年限、生效日期、已交保费
  - 操作列保留编辑和删除按钮
  - 新增"明细计划"按钮（蓝色文字按钮）
  - 点击明细计划按钮打开明细计划弹窗
- **Acceptance Criteria Addressed**: 保单列表展示

## [ ] Task 3: 重构保险资产新增/编辑表单
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 修改 `renderInsuranceForm` 方法，删除所有旧字段
  - 新表单字段（2列布局）：
    - 保单号码（文本输入）
    - 保单名称（文本输入）
    - 受保人（文本输入）
    - 缴费年限（数字输入，单位：年）
    - 生效日期（日期选择器）
    - 已交保费（货币金额输入）
  - 表单验证：保单号码、保单名称、受保人为必填
- **Acceptance Criteria Addressed**: 新增保单

## [ ] Task 4: 实现明细计划弹窗组件
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - 创建新的弹窗状态 `showDetailModal` 和 `selectedPolicy`
  - 弹窗标题："{保单名称} - 明细计划"
  - 弹窗宽度调整为适合宽表格的 max-w-5xl
  - 弹窗内包含：
    - 表格区域（可横向滚动）
    - "新增行"按钮
    - 关闭按钮
- **Acceptance Criteria Addressed**: 查看明细计划

## [ ] Task 5: 实现明细计划表格
- **Priority**: high
- **Depends On**: Task 4
- **Description**:
  - 表格列（按用户图片样式）：
    - 第一级表头：保单年度终结 | 缴付保费总额 | 退保发还金额（跨3列）| 总额(A+B+C) | 预期分红收益率 | 实际分红达成率 | 实际分红金额 | 实际分红收益率
    - 第二级表头：保证现金价值(A) | 复归红利(B) | 终期分红(C)
  - 数据从 `selectedPolicy.details` 读取
  - 每行有编辑和删除按钮
  - 空数据时显示"暂无明细计划数据"
  - 支持暗色模式
- **Acceptance Criteria Addressed**: 明细计划表格字段

## [ ] Task 6: 实现明细行新增/编辑表单
- **Priority**: high
- **Depends On**: Task 4
- **Description**:
  - 在明细计划弹窗内实现行级表单
  - 表单字段：
    - 保单年度终结（文本，如"1"、"65岁"）
    - 缴付保费总额（数字）
    - 保证现金价值(A)（数字）
    - 复归红利(B)（数字）
    - 终期分红(C)（数字）
    - 总额（只读，自动计算 A+B+C）
    - 预期分红收益率（数字，%）
    - 实际分红达成率（数字，%）
    - 实际分红金额（数字）
    - 实际分红收益率（数字，%）
  - 保存时更新到 `selectedPolicy.details` 数组
  - 同步更新主数据到 localStorage
- **Acceptance Criteria Addressed**: 新增/编辑明细行

## [ ] Task 7: 实现明细行删除功能
- **Priority**: medium
- **Depends On**: Task 4
- **Description**:
  - 每行明细数据后有删除按钮
  - 点击后弹出确认提示
  - 确认后从 details 数组移除
  - 同步更新主数据到 localStorage
- **Acceptance Criteria Addressed**: 删除明细行

## [ ] Task 8: 更新汇总统计逻辑
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - 修改 `summaryData` 中 insurance 类型的计算逻辑
  - 总价值 = 所有保单的 paidPremium 之和
  - 演示收益 = 所有保单明细最后一行的 totalAmount 之和 - paidPremium
  - 实际收益 = 同上（使用实际分红相关字段计算）
- **Acceptance Criteria Addressed**: 保险资产汇总统计

## [ ] Task 9: 构建验证
- **Priority**: high
- **Depends On**: Task 1-8
- **Description**:
  - 运行 `npm run build` 验证代码正确性
  - 修复任何构建错误
- **Acceptance Criteria Addressed**: 代码质量
