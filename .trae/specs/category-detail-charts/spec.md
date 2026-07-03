# 分类详情页图表增强 - Product Requirement Document

## Overview
- **Summary**: 修复分类详情页空白问题，并增强详情页的图表展示：饼图显示资产类型占比、柱状图显示金额、海内外对比图支持货币切换。
- **Purpose**: 提供更直观的数据可视化，支持货币单位切换查看海外资产换算后的价值。
- **Target Users**: 资产管理者、理财用户

## Goals
- 修复分类详情页空白问题（已修复）
- 详情页右上角增加新增按钮
- 详情页第一行显示饼图（资产类型占比）和柱状图（金额）
- 详情页第二行显示海内外资产对比图
- 支持货币切换，海外资产按汇率换算显示

## Non-Goals (Out of Scope)
- 新增汇率实时获取功能（使用固定汇率）
- 资产分类总览页面的改动

## Background & Context
- 当前分类详情页点击卡片后显示，但缺少图表展示
- 需要支持人民币(CNY)和美元(USD)两种货币切换
- 固定汇率：1 USD = 7.2 CNY（可配置）

## Functional Requirements
- **FR-1**: 分类详情页右上角显示"+ 新增"按钮
- **FR-2**: 详情页第一行显示饼图，展示各资产类型占比
- **FR-3**: 详情页第一行显示柱状图，展示各资产类型金额
- **FR-4**: 详情页第二行显示海内外资产对比图（饼图）
- **FR-5**: 货币切换按钮支持CNY/USD切换
- **FR-6**: 切换货币后，海外资产自动按汇率换算显示

## Non-Functional Requirements
- **NFR-1**: 图表响应式布局，移动端单列显示
- **NFR-2**: 货币切换后数据更新流畅，无卡顿
- **NFR-3**: 汇率配置可修改，默认1 USD = 7.2 CNY

## Constraints
- **Technical**: 使用 recharts 库实现图表
- **Dependencies**: 现有 AssetClasses.jsx 代码结构

## Assumptions
- 海外资产默认使用 USD 计价
- 汇率使用固定值：1 USD = 7.2 CNY
- 国内资产使用 CNY 计价

## Acceptance Criteria

### AC-1: 详情页右上角新增按钮
- **Given**: 用户进入分类详情页
- **When**: 查看页面右上角
- **Then**: 显示"+ 新增"按钮，点击打开添加资产类型弹窗
- **Verification**: `human-judgment`

### AC-2: 资产类型占比饼图
- **Given**: 用户进入分类详情页
- **When**: 查看第一行左侧
- **Then**: 显示饼图，展示各资产类型占比，hover显示百分比
- **Verification**: `human-judgment`

### AC-3: 资产类型金额柱状图
- **Given**: 用户进入分类详情页
- **When**: 查看第一行右侧
- **Then**: 显示柱状图，展示各资产类型金额，hover显示具体数值
- **Verification**: `human-judgment`

### AC-4: 海内外对比图
- **Given**: 用户进入分类详情页
- **When**: 查看第二行
- **Then**: 显示海内外资产对比饼图，国内和海外各占一部分
- **Verification**: `human-judgment`

### AC-5: 货币切换功能
- **Given**: 用户进入分类详情页
- **When**: 点击货币切换按钮（CNY/USD）
- **Then**: 所有金额显示切换为对应货币，海外资产按汇率换算
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要更多货币选项（如 EUR、JPY）？
- [ ] 汇率是否需要从后端获取？
