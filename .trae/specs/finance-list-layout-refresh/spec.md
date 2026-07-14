# 理财模块列表布局重构 Spec

## Why
当前理财模块列表布局存在以下问题：
1. 筛选汇总卡片位于列表下方，用户无法在进入页面时立即看到汇总数据
2. 列表上方显示"all"分类标签，占用了空间且意义不大
3. 筛选项布局分散，高级筛选需要展开才能看到部分筛选项
4. 列表缺少序号列，不方便批量操作
5. 新增按钮位于页面顶部，距离列表较远
6. 数值显示保留2位小数，无法满足3位小数的精度需求

## What Changes
- **BREAKING**: 筛选汇总卡片从列表下方移到列表上方，重命名为「筛选汇总」，显示6个数据：总本金、平均成本、总盈亏、总收益率、当前市值、当日收益、当日收益率
- **BREAKING**: 移除 CategoryTable 组件内的分类名称显示（如"all"标签），所有筛选项平铺显示在筛选栏第一行
- **BREAKING**: 筛选项重新排列顺序：所属账户、全部市场、全部货币、全部二级分类、全部持仓分组、高级筛选、列设置、搜索、新增/删除
- **BREAKING**: 新增按钮从页面顶部移动到列表右上角
- 列表第一列增加序号列，支持全选勾选（表头 checkbox + 每行 checkbox）
- 所有数值显示从保留2位小数改为保留3位小数

## Impact
- Affected code: assert_WEB/src/pages/Finance.jsx（CategoryTable 组件、筛选项布局、合计行、新增按钮位置、formatNum 函数）

## ADDED Requirements

### Requirement: 列表序号列与全选功能
The system SHALL 在列表第一列显示序号，并在表头提供全选 checkbox，支持批量选择。

#### Scenario: 序号列显示
- **WHEN** 用户查看持仓列表
- **THEN** 列表第一列显示序号（1, 2, 3...）
- **AND** 表头有全选 checkbox
- **AND** 每行有单选 checkbox

#### Scenario: 全选功能
- **WHEN** 用户点击表头全选 checkbox
- **THEN** 当前页所有行被选中
- **WHEN** 用户再次点击
- **THEN** 取消全选

### Requirement: 数值显示精度3位小数
The system SHALL 所有数值字段（价格、数量、盈亏等）显示保留3位小数。

#### Scenario: 价格显示
- **WHEN** 列表显示持仓成本、现价等价格字段
- **THEN** 保留3位小数（如 1.397）

#### Scenario: 数量显示
- **WHEN** 列表显示数量/份额字段
- **THEN** 保留3位小数（如 11048.960）

## MODIFIED Requirements

### Requirement: 筛选汇总卡片位置和内容
修改前：汇总卡片（HoldingsSummaryCard）位于 CategoryTable 下方，显示总市值、总成本、总盈亏、总收益率、当日收益、当日收益率
修改后：汇总卡片位于 CategoryTable 上方（列表标题和筛选项之间），重命名为「筛选汇总」，显示：总本金、平均成本、总盈亏、总收益率、当前市值、当日收益、当日收益率

- 总本金 = 所有持仓 cost 之和（即总成本）
- 平均成本 = 总成本 ÷ 持仓数量（这里应该是加权平均成本，即 totalCost / totalQuantity）
- 总盈亏 = 所有持仓 holdingPnl 之和
- 总收益率 = 总盈亏 ÷ 总成本 × 100%
- 当前市值 = 所有持仓 currentValue 之和
- 当日收益 = 所有持仓 dailyPnl 之和
- 当日收益率 = 当日收益 ÷ 总成本 × 100%

**Reason**: 用户需要在列表上方看到汇总数据，且字段命名需要更精确
**Migration**: 修改 HoldingsSummaryCard 组件位置和内容，更新数据计算逻辑

### Requirement: 筛选项布局
修改前：筛选项分第一行（搜索、账户、分类、类型、高级筛选、列设置）和第二行（高级筛选展开：市场、货币、二级分类、持仓分组），左侧有"all"分类标签
修改后：移除"all"分类标签，所有基础筛选项平铺在第一行：所属账户、全部市场、全部货币、全部二级分类、全部持仓分组、高级筛选、列设置、搜索、新增/删除

**Reason**: 用户希望筛选项一目了然，不需要展开高级筛选就能看到所有基础筛选项
**Migration**: 调整 CategoryTable 组件内筛选项布局

### Requirement: 新增按钮位置
修改前：新增按钮位于页面顶部（理财模块标题右侧）
修改后：新增按钮移动到列表右上角（筛选项右侧）

**Reason**: 新增按钮距离列表更近，操作更便捷
**Migration**: 将新增按钮从页面顶部移到 CategoryTable 组件内筛选项右侧

### Requirement: 数值显示精度
修改前：formatNum 函数保留 2 位小数
修改后：formatNum 函数保留 3 位小数

**Reason**: 用户要求更高的数值精度
**Migration**: 修改 formatNum 函数（约第 38 行），将 toFixed(2) 改为 toFixed(3)

## REMOVED Requirements
无
