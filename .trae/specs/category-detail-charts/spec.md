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

---

## 扩展需求（Tasks 8-13）：编辑、对比卡片、增强饼图、持仓明细

### Overview
- **Summary**: 将右上角新增按钮改为编辑按钮（编辑目标价值/期望收益率），第二行添加目标对比卡片，资产类型饼图按 assetType 聚合，海内外饼图细分为国内/港股/美股/其他 4 段，新增持仓明细列表延用 Finance.jsx 的筛选/搜索/列设置模式。
- **Purpose**: 提供分类详情页的目标管理、对比分析与持仓明细，统一与 Finance 模块的交互体验。

### Goals
- 右上角按钮改为"编辑"，可编辑 targetValue 和 expectedReturn 并持久化
- 第二行显示目标对比卡片（当前价值 vs 目标价值、当前收益率 vs 期望收益率）
- 资产类型占比饼图（按 assetType，数据来自权益类持仓）
- 海内外对比饼图细分为 4 段（国内/港股/美股/其他）
- 持仓明细列表延用 Finance.jsx 的筛选/搜索/列设置/分页，仅展示当前分类持仓

### ADDED Requirements

### Requirement: 编辑目标价值与期望收益率
The system SHALL provide an edit button (replacing the previous add button) in the top-right of the category detail page that opens a modal to edit targetValue and expectedReturn, persisting changes via saveState.

#### Scenario: 编辑并保存目标值
- **WHEN** 用户点击"编辑"按钮，修改 targetValue/expectedReturn 并保存
- **THEN** stateData.assetClasses 中对应分类更新，并通过 saveState 持久化到后端

### Requirement: 目标对比卡片
The system SHALL display a comparison card on the second row showing current value vs target value and current return rate vs expected return rate, with data aggregated from accounts where categoryL1 matches the current category.

#### Scenario: 显示对比
- **WHEN** 用户查看第二行对比卡片
- **THEN** 显示当前价值 → 目标价值、当前收益率 → 期望收益率，并配以进度条

### Requirement: 资产类型占比饼图
The system SHALL display a pie chart showing asset type breakdown (by assetType) for holdings where categoryL1 matches the current category.

### Requirement: 海内外对比饼图（4 段细分）
The system SHALL display a pie chart with 4 segments: 国内市场, 港股市场, 美股市场, 其他市场, classified by the market field of accounts where categoryL1 matches the current category.

#### Scenario: 市场分类
- **WHEN** account.market 包含"港股"
- **THEN** 归入港股市场
- **WHEN** account.market 包含"美股"
- **THEN** 归入美股市场
- **WHEN** account.market 为空或为"国内市场"
- **THEN** 归入国内市场
- **WHEN** 其他情况
- **THEN** 归入其他市场

### Requirement: 持仓明细列表
The system SHALL display a holdings detail list reusing Finance.jsx's filter/search/column-settings/pagination pattern, showing only holdings where categoryL1 matches the current category, with settings persisted to localStorage using category_detail_ prefix.

#### Scenario: 筛选与列设置持久化
- **WHEN** 用户调整筛选/列设置/分页大小
- **THEN** 设置持久化到 localStorage（key: category_detail_column_settings_<分类名> 等）
- **WHEN** 用户重新进入页面
- **THEN** 设置从 localStorage 恢复

### MODIFIED Requirements

### Requirement: 右上角按钮
[原"+ 新增"按钮改为"编辑"按钮，点击打开编辑弹窗而非新增资产类型弹窗]
