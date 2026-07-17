# 房产表单改造 Spec

## Why
当前房产新增表单的字段设计不符合实际使用场景：缺少"自用/出租"用途区分、类型不可自定义、存在不需要的价格字段。需要重构表单和列表以反映真实房产管理需求。

## What Changes
- 类型字段改为可自定义输入（默认选项：住宅、工厂、商铺、公寓），支持手动输入其他类型
- 删除"地区平均价格"、"二手价"、"新房平均价"三个字段
- 新增"方式"字段：自用 / 出租
- 选择"自用"后，后续出租相关字段不显示（无需填写）
- 选择"出租"后，显示以下字段：
  - 出租方式：押一付一 / 押一付三
  - 租金（number）
  - 押金（number）
  - 是否出租：是 / 否
- 列表表头同步更新，显示所有新增字段，删除已移除的字段

## Impact
- Affected code: `assert_WEB/src/pages/IndependentAssets.jsx` — `renderRealEstateForm()` 和 `renderRealEstateTable()`

## ADDED Requirements

### Requirement: 房产类型自定义
The system SHALL 提供房产类型下拉选择，默认选项为住宅、工厂、商铺、公寓，同时支持用户手动输入自定义类型。

#### Scenario: 选择默认类型
- **WHEN** 用户点击类型下拉框
- **THEN** 显示住宅、工厂、商铺、公寓四个默认选项

#### Scenario: 自定义类型
- **WHEN** 用户在类型下拉框中手动输入文本
- **THEN** 该文本作为类型值保存

### Requirement: 房产方式选择
The system SHALL 提供方式选择字段，选项为"自用"和"出租"。

#### Scenario: 选择自用
- **WHEN** 用户选择"自用"
- **THEN** 后续出租相关字段（出租方式、租金、押金、是否出租）不显示

#### Scenario: 选择出租
- **WHEN** 用户选择"出租"
- **THEN** 显示出租方式、租金、押金、是否出租字段

### Requirement: 出租字段
The system SHALL 在选择"出租"后显示以下字段：
- 出租方式：下拉选择"押一付一"或"押一付三"
- 租金：数字输入
- 押金：数字输入
- 是否出租：下拉选择"是"或"否"

### Requirement: 列表同步更新
The system SHALL 在房产列表中显示所有当前字段：
- 国家、省份、城市、地区、类型、方式、出租方式、租金、押金、是否出租、操作
- 已删除的字段（地区平均价格、二手价、新房平均价）不再显示

## REMOVED Requirements

### Requirement: 地区平均价格字段
**Reason**: 不再需要
**Migration**: 已有数据中的 avgPrice 字段保留但不显示

### Requirement: 二手价字段
**Reason**: 不再需要
**Migration**: 已有数据中的 secondHandPrice 字段保留但不显示

### Requirement: 新房平均价字段
**Reason**: 不再需要
**Migration**: 已有数据中的 newHousePrice 字段保留但不显示
