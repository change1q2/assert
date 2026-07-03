# 修复统计分析图表和导入功能

## Why
用户反馈了4个问题需要修复：
1. 收支统计图表切换支出/收入/结余时，Tooltip仍然显示全部数据
2. 饼图文字显示不全，需要显示在正中间
3. 收支对比需要用流量图表示
4. 导入功能需要增加动画效果和字段映射

## What Changes
- 修改收支统计图表的Tooltip逻辑，根据chartType显示对应数据
- 修改饼图的文字位置，显示在正中间
- 将收支对比的桑基图改为流量图
- 增加Excel导入的加载动画和字段映射功能

## Impact
- Affected specs: analysis-month-statistics, analysis-custom-statistics
- Affected code: assert_WEB/src/pages/Analysis.jsx, assert_WEB/src/pages/Records.jsx

## ADDED Requirements

### Requirement: 收支统计Tooltip动态显示
系统应根据当前选中的图表类型动态显示Tooltip内容。

#### Scenario: 选择支出类型
- **WHEN** 用户点击"支出"标签
- **THEN** Tooltip只显示支出数据
- **THEN** 显示格式："2026年7月1日 支出：111"

#### Scenario: 选择收入类型
- **WHEN** 用户点击"收入"标签
- **THEN** Tooltip只显示收入数据

#### Scenario: 选择结余类型
- **WHEN** 用户点击"结余"标签
- **THEN** Tooltip只显示结余数据

### Requirement: 饼图文字居中显示
系统应将饼图中的文字显示在正中间。

#### Scenario: 显示饼图
- **WHEN** 页面加载完成
- **THEN** 饼图中心显示分类名称和占比

### Requirement: 收支对比流量图
系统应使用流量图表示收支对比。

#### Scenario: 显示收支对比
- **WHEN** 页面加载完成
- **THEN** 显示收支对比的流量图

### Requirement: Excel导入字段映射
系统应提供字段映射功能，让用户将Excel字段与系统字段对应。

#### Scenario: 导入Excel
- **WHEN** 用户选择Excel文件
- **THEN** 显示加载进度动画
- **THEN** 显示字段映射界面
- **THEN** 用户选择对应关系后导入数据

## MODIFIED Requirements

### Requirement: 现有Tooltip实现
修改Tooltip的render逻辑，根据chartType动态显示数据。

### Requirement: 现有饼图实现
修改饼图的label位置，显示在中心。

### Requirement: 现有收支对比实现
将桑基图改为流量图。

### Requirement: 现有Excel导入实现
增加加载动画和字段映射功能。

## Non-Functional Requirements
- 页面样式与设计图片一致
- 支持深色模式
- 响应式布局