# 分类详情独立页面与多货币支持 - Product Requirement Document

## Overview
- **Summary**: 创建独立的分类详情页面（而非在当前页显示），支持多种货币下拉选择，新增资产类型时也支持多货币。
- **Purpose**: 提供更好的页面导航体验，支持多币种资产管理。
- **Target Users**: 资产管理者、理财用户

## Goals
- 创建独立的分类详情页面（CategoryDetail）
- 点击分类卡片跳转到独立详情页面
- 货币切换改为下拉选择，支持多种货币
- 新增资产类型时支持选择货币

## Non-Goals (Out of Scope)
- 使用 react-router-dom（项目不使用路由）
- 新增汇率实时获取功能

## Background & Context
- 当前项目使用状态管理切换页面（App.jsx 中的 activeMenu）
- 需要添加新页面到 menuItems 和 renderContent
- 支持的货币：CNY、USD、EUR、JPY、GBP

## Functional Requirements
- **FR-1**: 创建独立的分类详情页面组件 CategoryDetail.jsx
- **FR-2**: 点击分类卡片跳转到独立详情页面
- **FR-3**: 货币切换改为下拉选择框，支持 5 种货币
- **FR-4**: 新增资产类型时支持选择货币（下拉选择）
- **FR-5**: 不同货币的资产按汇率换算显示

## Non-Functional Requirements
- **NFR-1**: 页面切换流畅，无明显卡顿
- **NFR-2**: 货币切换后所有数据正确更新
- **NFR-3**: 汇率配置可修改

## Constraints
- **Technical**: 使用现有状态管理方式，不引入路由
- **Dependencies**: 基于现有 AssetClasses.jsx 的详情页代码

## Assumptions
- 汇率使用固定值：1 USD = 7.2 CNY, 1 EUR = 7.8 CNY, 1 JPY = 0.048 CNY, 1 GBP = 9.1 CNY
- 默认货币为 CNY

## Acceptance Criteria

### AC-1: 独立详情页面
- **Given**: 用户在资产分类页面
- **When**: 点击分类卡片
- **Then**: 跳转到独立的分类详情页面，左侧菜单显示当前位置
- **Verification**: `human-judgment`

### AC-2: 多货币下拉选择
- **Given**: 用户在分类详情页面
- **When**: 点击货币下拉框
- **Then**: 显示 5 种货币选项（CNY、USD、EUR、JPY、GBP）
- **Verification**: `human-judgment`

### AC-3: 新增资产类型支持货币选择
- **Given**: 用户在详情页点击新增按钮
- **When**: 打开添加资产类型弹窗
- **Then**: 弹窗中包含货币下拉选择框
- **Verification**: `human-judgment`

### AC-4: 货币换算显示
- **Given**: 用户切换货币
- **Then**: 所有金额按对应汇率换算显示
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要更多货币选项？
