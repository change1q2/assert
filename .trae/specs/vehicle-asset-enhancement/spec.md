# 车辆资产增强 Spec

## Why
现有车辆资产表单的类型、厂商、型号字段需要用户手动输入，缺乏数据规范且容易出错。同时列表缺少直观的折损和收益指标，无法快速评估车辆资产的价值变动。

## What Changes
- 新增车辆品牌型号数据源文件，涵盖主流车辆品牌和车型
- 车辆表单中"类型"、"厂商"、"型号"字段改为支持下拉选择+自定义输入的 combobox 模式
- 三个字段联动：选择类型 → 可选厂商范围过滤 → 选择厂商 → 可选型号范围过滤
- 车辆列表新增"折损价格"列（购买价格 - 二手价格）
- 车辆列表新增"收益率"列（(二手价格 - 购买价格) / 购买价格 × 100%）
- 暗色模式兼容

## Impact
- Affected specs: independent-assets
- Affected code: [IndependentAssets.jsx](file:///d:/code/assert/assert_WEB/src/pages/IndependentAssets.jsx)
- New file: [assert_WEB/src/data/vehicle-data.js](file:///d:/code/assert/assert_WEB/src/data/vehicle-data.js)

## ADDED Requirements

### Requirement: 车辆品牌型号数据
The system SHALL 提供一套完整的车辆品牌型号数据，支持表单下拉选择。

#### Scenario: 数据结构
- **WHEN** 加载车辆资产页面
- **THEN** 系统可使用车辆数据文件中的品牌和型号信息
- **AND** 数据包含主流品牌（如大众、丰田、宝马、奔驰、奥迪、本田、日产、比亚迪、特斯拉等）和对应的热门车型

### Requirement: 表单字段 Combobox 交互
The system SHALL 为车辆新增/编辑表单提供类型、厂商、型号的联动下拉选择，同时支持自定义输入。

#### Scenario: 类型选择
- **WHEN** 用户点击"类型"输入框
- **THEN** 显示下拉选项：小轿车、SUV、MPV、跑车、电动车、皮卡、面包车
- **AND** 用户可以直接选择或手动输入其他类型

#### Scenario: 厂商选择
- **WHEN** 用户点击"厂商"输入框
- **THEN** 根据已选类型过滤可选厂商列表（如选"电动车"时优先显示新能源品牌）
- **AND** 用户可以直接选择或手动输入其他厂商

#### Scenario: 型号选择
- **WHEN** 用户点击"型号"输入框
- **THEN** 根据已选厂商显示该厂商下的热门车型列表
- **AND** 用户可以直接选择或手动输入其他型号

### Requirement: 列表新增计算字段
The system SHALL 在车辆资产列表中自动计算并展示折损价格和收益率。

#### Scenario: 折损价格展示
- **WHEN** 用户查看车辆资产列表
- **THEN** 每行显示"折损价格" = 购买价格 - 二手价格
- **AND** 使用货币格式化显示

#### Scenario: 收益率展示
- **WHEN** 用户查看车辆资产列表
- **THEN** 每行显示"收益率" = (二手价格 - 购买价格) / 购买价格 × 100%
- **AND** 使用百分比格式化显示（负数显示为亏损）

## MODIFIED Requirements

### Requirement: 车辆资产列表展示
原有列表字段：类型、厂商、型号、购买价格、二手价格、新车价、操作
修改为：类型、厂商、型号、购买价格、二手价格、新车价、**折损价格**、**收益率**、操作

### Requirement: 车辆资产表单交互
原有表单字段保持（类型、厂商、型号、购买价格、二手价格、新车价），但类型和厂商从 select 改为 input + datalist 的 combobox 模式，型号新增 combobox 模式。

## REMOVED Requirements
无
