# 新增资产表单优化 - 产品需求文档

## Overview
- **Summary**: 优化新增持仓资产表单的字段顺序、级联选择逻辑和动态表单提示，提升用户体验。
- **Purpose**: 使表单填写流程更加符合用户思维习惯，减少填写错误，提高效率。
- **Target Users**: 个人投资者，需要添加持仓资产的用户。

## Goals
- 调整字段顺序：资产类型放在资产分类前面，资产分类改名为资产分类一级
- 实现级联选择：市场 → 货币单位 → 资产类型的级联关系
- 国内市场默认货币单位为CNY
- 资产类型选择后动态改变资产名称提示和资产代码数据源

## Non-Goals (Out of Scope)
- 后端API修改
- 数据库结构变更
- 其他页面的表单优化

## Background & Context
- 当前新增资产表单位于 `assert_WEB/src/pages/Finance.jsx` 的 AddModal 中
- 当前字段顺序：市场、货币单位、资产分类、资产分类二级、三级分类、四级分类、资产类型...
- 当前已有市场切换时自动设置货币单位的逻辑
- 当前已有资产代码搜索功能（handleCodeSearch）

## Functional Requirements
- **FR-1**: 字段顺序调整 - 资产类型放在资产分类一级前面，资产分类改名为资产分类一级
- **FR-2**: 级联选择逻辑 - 选择市场后才能选择货币单位，选择货币单位后才能选择资产类型，其他字段无顺序限制
- **FR-3**: 国内市场默认CNY - 选择国内市场时货币单位默认选择CNY
- **FR-4**: 动态表单提示 - 当资产类型选择股票或基金，且资产三级分类为场内时，资产名称输入框提示改为"请填写股票名称"

## Non-Functional Requirements
- **NFR-1**: 表单交互流畅，无明显延迟
- **NFR-2**: UI与现有风格保持一致

## Constraints
- **Technical**: React + JavaScript, Tailwind CSS
- **Dependencies**: 现有Finance.jsx组件结构

## Assumptions
- 资产代码搜索功能已存在（handleCodeSearch）
- 数据源（同花顺/东方财富）的API调用已在现有代码中实现

## Acceptance Criteria

### AC-1: 字段顺序调整
- **Given**: 用户打开新增持仓资产弹窗
- **When**: 查看表单字段
- **Then**: 资产类型字段在资产分类一级字段前面，资产分类字段显示为"资产分类一级"
- **Verification**: `human-judgment`

### AC-2: 级联选择 - 市场→货币单位
- **Given**: 用户打开新增持仓资产弹窗
- **When**: 未选择市场时
- **Then**: 货币单位下拉框/输入框禁用或置灰
- **Verification**: `human-judgment`

### AC-3: 级联选择 - 货币单位→资产类型
- **Given**: 用户打开新增持仓资产弹窗
- **When**: 未选择货币单位时
- **Then**: 资产类型下拉框禁用或置灰
- **Verification**: `human-judgment`

### AC-4: 国内市场默认CNY
- **Given**: 用户选择市场为国内市场
- **When**: 市场切换完成
- **Then**: 货币单位自动设置为CNY
- **Verification**: `human-judgment`

### AC-5: 动态表单提示
- **Given**: 用户选择资产类型为股票或基金，且资产三级分类为场内
- **When**: 查看资产名称输入框
- **Then**: 资产名称输入框的placeholder显示"请填写股票名称"
- **Verification**: `human-judgment`

## Open Questions
- [ ] 资产代码数据源从同花顺或者东方财富获取，是否需要修改现有的搜索API？
