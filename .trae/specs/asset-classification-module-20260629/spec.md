# 资产分类模块增强 Spec

## Why
当前资产分类页面（AssetClasses.jsx）功能过于简陋，仅支持分类名称和描述，无法展示各类资产的当前价值、期初价值、目标价值、收益率等核心指标。用户需要一套完整的资产分类管理模块，支持默认四大类（权益类、商品类、债权类、现金类）+ 自定义分类，并能够可视化展示分类占比、增长趋势、对比分析等图表，同时新增弹窗能自动从理财模块获取数据填充。

## What Changes
- **重构 AssetClasses.jsx**：将简陋的分类列表升级为完整的资产分类管理模块
- **默认4大类初始化**：权益类、商品类、债权类、现金类，支持用户自定义其他类
- **丰富分类数据模型**：使用数据库已有的 `value`、`openingValue`、`targetValue`、`income`、`expense`、`expectedReturn`、`color`、`children` 等字段
- **图表可视化**：增加资产分类占比环形图、资产增长趋势折线图、分类对比柱状图（期初 vs 当前）
- **分类卡片列表**：每个分类卡片展示当前值/同比/收益率/目标等核心指标
- **分类管理功能**：支持前移/后移/编辑/隐藏/删除分类
- **筛选联动**：顶部筛选条件变化后，图表和列表数据实时对应变化
- **新增弹窗增强**：表单包含分类名称/二级分类/当前价值/期初价值/目标价值/期望收益率/年度收益/年度支出/颜色，并优先从理财模块（financeAssets）自动填充数据
- **二级分类支持**：利用 `children_json` 字段存储二级分类数组

## Impact
- Affected pages: `AssetClasses.jsx`
- Affected APIs: `fetchState` / `saveState`（通过 state 读写 assetClasses）
- Affected components: 新增图表组件可使用现有的 `PieChart.jsx`、`BarChart.jsx`、`LineChart.jsx`
- Affected data: `assetClasses` state 结构扩展，新增字段需要正确读写

## ADDED Requirements

### Requirement: 默认四大类初始化
The system SHALL 在用户首次进入资产分类页面或 assetClasses 为空时，自动初始化默认四大类：权益类、商品类、债权类、现金类。

#### Scenario: 首次使用
- **WHEN** 用户进入资产分类页面且当前 assetClasses 为空
- **THEN** 系统自动创建4个默认分类，每个分类带有合理的默认颜色和空值字段

### Requirement: 分类数据完整展示
The system SHALL 在资产分类页面展示每个分类的完整数据指标。

#### Scenario: 分类卡片展示
- **WHEN** 用户查看分类列表
- **THEN** 每个分类卡片显示：分类名称、颜色标识、当前价值、期初价值、目标价值、盈亏额、盈亏率、年度收益、年度支出、期望收益率、占总资产占比

### Requirement: 图表可视化
The system SHALL 在资产分类页面顶部展示三类图表。

#### Scenario: 图表展示
- **WHEN** 用户进入资产分类页面
- **THEN** 页面显示：
  1. 资产分类占比环形图（基于当前价值，中心显示总价值）
  2. 资产增长趋势折线图（各分类期初价值 vs 当前价值对比趋势）
  3. 分类对比柱状图（各分类的期初价值和当前价值并排对比）

### Requirement: 筛选联动
The system SHALL 支持按分类名称、可见性等条件筛选，筛选后图表和列表数据实时变化。

#### Scenario: 筛选数据
- **WHEN** 用户在筛选区域选择/输入条件
- **THEN** 图表和分类列表只展示符合条件的分类，统计数据重新计算

### Requirement: 分类排序与可见性
The system SHALL 支持对分类进行前移、后移、编辑、隐藏操作。

#### Scenario: 管理分类
- **WHEN** 用户点击分类卡片上的管理按钮
- **THEN** 可以前移、后移调整排序，可以隐藏/显示分类，可以编辑分类详情

### Requirement: 新增弹窗自动填充
The system SHALL 在新增分类弹窗中，优先从理财模块（financeAssets）获取数据自动填充表单字段。

#### Scenario: 自动填充
- **WHEN** 用户打开新增分类弹窗
- **THEN** 系统尝试从 `stateData.financeAssets` 中按分类名称匹配数据，自动计算并填充：当前价值（持仓市值总和）、期初价值（成本总和）、年度收益/支出（关联记录数据）

### Requirement: 二级分类支持
The system SHALL 支持在每个主分类下维护二级分类列表。

#### Scenario: 二级分类管理
- **WHEN** 用户在新增/编辑弹窗中操作
- **THEN** 可以添加、删除、编辑二级分类名称

## MODIFIED Requirements

### Requirement: AssetClasses 页面重构
**现有**：简单的分类名称+描述表格，仅支持增删改名称和描述
**修改后**：完整的资产分类管理模块，包含图表区、统计卡片区、分类卡片网格、筛选区

### Requirement: assetClasses 数据结构扩展
**现有**：`{ name, description }`
**修改后**：`{ id, name, children: [{name}], visible, value, openingValue, targetValue, income, expense, laborIncome, color, expectedReturn }`

## REMOVED Requirements
无
