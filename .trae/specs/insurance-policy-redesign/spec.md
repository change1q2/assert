# 保险资产保单重构 Spec

## Why
现有保险资产表单使用扁平字段（保单年度、保费总额等），不符合真实保单管理场景。用户需要以"保单"为粒度管理资产，每份保单包含基础信息和多年度明细计划（退保发还金额表），并支持追踪预期与实际分红收益。

## What Changes
- 删除保险资产原有所有表单字段（policyYear, premiumTotal, guaranteedAmount等）
- 新增保单基础字段：保单号码、保单名称、受保人、缴费年限、生效日期、已交保费
- 保险资产列表展示保单基础信息+子代（明细计划）汇总
- 列表操作列增加"明细计划"按钮
- 新增"明细计划"弹窗，展示退保发还金额表格（按用户图片样式）
- 明细表格在"总额"后增加4个字段：预期分红收益率、实际分红达成率、实际分红金额、实际分红收益率
- **BREAKING**: 保险资产数据结构从扁平对象改为包含明细计划的嵌套对象

## Impact
- Affected specs: independent-assets
- Affected code: [IndependentAssets.jsx](file:///d:/code/assert/assert_WEB/src/pages/IndependentAssets.jsx)

## ADDED Requirements

### Requirement: 保单基础信息管理
The system SHALL 提供保单级资产管理，每份保单包含独立的保单号码、名称、受保人、缴费年限、生效日期和已交保费。

#### Scenario: 新增保单
- **WHEN** 用户在保险资产标签页点击"新增保单"
- **THEN** 弹出表单，字段为：保单号码（文本）、保单名称（文本）、受保人（文本）、缴费年限（数字/年）、生效日期（日期选择）、已交保费（货币金额）
- **AND** 表单保存后保单显示在列表中

#### Scenario: 保单列表展示
- **WHEN** 用户查看保险资产列表
- **THEN** 列表展示字段：保单号码、保单名称、受保人、缴费年限、生效日期、已交保费
- **AND** 每行最后有操作列：编辑按钮、删除按钮、明细计划按钮

### Requirement: 保单明细计划管理
The system SHALL 为每份保单提供多年度退保发还金额明细计划表，支持增删改查。

#### Scenario: 查看明细计划
- **WHEN** 用户点击某保单的"明细计划"按钮
- **THEN** 弹出明细计划弹窗
- **AND** 弹窗标题为"{保单名称} - 明细计划"

#### Scenario: 明细计划表格字段
- **WHEN** 明细计划弹窗打开
- **THEN** 表格列如下：
  - 保单年度终结（如：1, 2, 3, 5, 10, 15, 20, 25, 30, 65岁, 70岁...100岁）
  - 缴付保费总额（累计已缴保费）
  - 保证现金价值(A)
  - 复归红利(B)
  - 终期分红(C)
  - 总额(A)+(B)+(C)
  - 预期分红收益率(%)
  - 实际分红达成率(%)
  - 实际分红金额（货币）
  - 实际分红收益率(%)
- **AND** 表格样式与用户提供的退保发还金额图片一致（表头有合并单元格：退保发还金额下分保证金额和非保证金额）

#### Scenario: 新增/编辑明细行
- **WHEN** 用户在明细计划弹窗点击"新增行"
- **THEN** 弹出表单可填写：保单年度终结、缴付保费总额、保证现金价值、复归红利、终期分红、预期分红收益率、实际分红达成率、实际分红金额、实际分红收益率
- **AND** 总额自动计算 = 保证现金价值 + 复归红利 + 终期分红
- **AND** 保存后该行显示在表格中

#### Scenario: 删除明细行
- **WHEN** 用户点击某明细行的删除按钮
- **THEN** 弹出确认提示
- **AND** 确认后该行从表格中移除

## MODIFIED Requirements

### Requirement: 保险资产数据结构
原有保险资产数据字段全部废弃，新结构为：
```
{
  id: string,
  policyNumber: string,      // 保单号码
  policyName: string,        // 保单名称
  insuredPerson: string,     // 受保人
  paymentYears: number,      // 缴费年限
  effectiveDate: string,     // 生效日期 (YYYY-MM-DD)
  paidPremium: number,       // 已交保费
  details: [                 // 明细计划数组
    {
      id: string,
      yearEnd: string,       // 保单年度终结 (如 "1", "65岁", "100岁")
      premiumTotal: number,  // 缴付保费总额
      guaranteedCashValue: number,  // 保证现金价值(A)
      reversionaryBonus: number,    // 复归红利(B)
      terminalBonus: number,        // 终期分红(C)
      totalAmount: number,   // 总额(A+B+C)，自动计算
      expectedDividendYield: number, // 预期分红收益率
      actualDividendAchievement: number, // 实际分红达成率
      actualDividendAmount: number,  // 实际分红金额
      actualDividendYield: number,   // 实际分红收益率
    }
  ],
  createdAt: string,
}
```

### Requirement: 保险资产汇总统计
- **WHEN** 计算汇总数据时
- **THEN** 总价值使用所有保单的 `paidPremium` 之和
- **AND** 演示收益和实际收益暂时显示为所有保单明细中最后一行的 `totalAmount` 之和减去 `paidPremium`

## REMOVED Requirements
### Requirement: 原有保险资产扁平字段
**Reason**: 用户要求改为保单+明细计划的层级结构，原有字段不再适用
**Migration**: 原有保险资产数据将不可用，用户需要重新录入
