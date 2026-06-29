# 资产分类卡片展开二级分类增强 Spec

## Why
当前资产分类卡片只显示主分类（一级分类）的数据，用户需要在卡片上直接查看和管理二级分类的数据，支持展开/收起操作。

## What Changes
- **卡片展开功能**：每个分类卡片增加展开/收起按钮，点击展开后显示该分类下的二级分类列表
- **二级分类显示**：展开区域显示该主分类下的所有二级分类，每个二级分类显示名称和当前价值
- **二级分类管理**：在展开区域内支持添加、编辑、删除二级分类

## Impact
- Affected pages: `AssetClasses.jsx`
- Affected data: 二级分类数据存储在 `assetClasses[].children` 字段中

## ADDED Requirements

### Requirement: 卡片展开/收起功能
The system SHALL 在每个分类卡片的右上角提供展开/收起按钮，点击后展开/收起二级分类列表。

#### Scenario: 展开卡片
- **WHEN** 用户点击分类卡片上的展开按钮
- **THEN** 卡片下方展开一个区域，显示该主分类下的所有二级分类列表

#### Scenario: 收起卡片
- **WHEN** 用户点击已展开卡片的收起按钮
- **THEN** 展开区域隐藏，卡片恢复到收起状态

### Requirement: 二级分类数据展示
The system SHALL 在展开区域内显示每个二级分类的名称、当前价值和期初价值。

#### Scenario: 二级分类列表展示
- **WHEN** 用户展开一个分类卡片
- **THEN** 显示该分类下的所有二级分类，每个显示：
  - 二级分类名称
  - 当前价值
  - 期初价值
  - 盈亏额和盈亏率

### Requirement: 二级分类增删改
The system SHALL 在展开区域内支持添加、编辑、删除二级分类。

#### Scenario: 添加二级分类
- **WHEN** 用户在展开区域内点击「添加二级分类」按钮
- **THEN** 显示输入框让用户输入二级分类名称，保存后添加到 children 数组

#### Scenario: 编辑二级分类
- **WHEN** 用户在二级分类上点击编辑按钮
- **THEN** 显示输入框让用户修改二级分类名称

#### Scenario: 删除二级分类
- **WHEN** 用户在二级分类上点击删除按钮
- **THEN** 确认后从 children 数组中移除该二级分类

### Requirement: 二级分类数据汇总
The system SHALL 自动计算主分类下的二级分类总价值，并在卡片收起时显示总价值。

#### Scenario: 数据汇总
- **WHEN** 主分类有多个二级分类时
- **THEN** 主分类的当前价值 = 所有二级分类的当前价值之和（除非主分类有自己的独立 value）
- **显示**：展开时显示每个二级分类的详情，收起时只显示主分类的总价值

## MODIFIED Requirements
无

## REMOVED Requirements
无
