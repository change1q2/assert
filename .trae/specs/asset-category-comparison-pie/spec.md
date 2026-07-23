# 资产分类对比饼图与独立资产总成本模块 - 产品需求文档

## Overview
- **Summary**: 在统计分析页面的资产分类模块增加理财资产与独立资产的对比饼图，同时在独立资产页面新增总成本统计卡片，实现两类资产的总市值和总成本数据对比展示。
- **Purpose**: 用户需要直观了解理财资产（股票、基金等）与独立资产（保险、房产、车辆等）在总资产中的占比情况，以及各自的成本投入，帮助进行资产配置决策。
- **Target Users**: 使用资产管理系统进行投资分析和资产配置的用户

## Goals
- 在统计分析页面增加资产分类对比饼图，展示理财资产与独立资产的总市值占比
- 在统计分析页面增加资产成本对比，展示理财资产与独立资产的总成本占比
- 在独立资产页面新增总成本统计卡片，显示独立资产的累计成本投入

## Non-Goals (Out of Scope)
- 不改变现有收支分析的饼图展示逻辑
- 不改变现有理财模块和独立资产模块的其他功能
- 不涉及数据迁移或后端数据库结构变更

## Background & Context
- 当前统计分析页面已有收支分类饼图，但缺乏资产分类的整体视图
- 独立资产页面已有总价值、演示收益、实际收益三张卡片，但缺少总成本统计
- `stateData` 中同时包含 `financeAssets` 和 `independentAssets` 数据，可在前端直接计算汇总

## Functional Requirements
- **FR-1**: 统计分析页面新增资产分类对比区域，包含总市值对比饼图和总成本对比饼图
- **FR-2**: 饼图数据来源：理财资产总市值 = sum(financeAssets.currentValue)，理财资产总成本 = sum(financeAssets.cost)
- **FR-3**: 饼图数据来源：独立资产总价值 = 当前独立资产页面计算逻辑，独立资产总成本 = 各类独立资产的成本字段之和
- **FR-4**: 独立资产页面新增总成本卡片，显示独立资产的累计成本投入

## Non-Functional Requirements
- **NFR-1**: 饼图加载时间 < 1秒（基于前端已有数据计算）
- **NFR-2**: 响应式布局，支持桌面端和移动端显示
- **NFR-3**: 与现有页面风格保持一致，使用相同的 Tailwind 样式和 Recharts 图表组件

## Constraints
- **Technical**: 基于现有 React + Recharts + Tailwind 技术栈
- **Dependencies**: 依赖 `stateData` 中的 `financeAssets` 和 `independentAssets` 数据

## Assumptions
- `financeAssets` 中每项资产的 `currentValue` 和 `cost` 字段已正确计算
- `independentAssets` 中各类资产的成本字段存在（如房产的 purchasePrice、车辆的 purchasePrice 等）

## Acceptance Criteria

### AC-1: 统计分析页面显示资产总市值对比饼图
- **Given**: 用户进入统计分析页面
- **When**: 页面加载完成且存在理财资产或独立资产数据
- **Then**: 在资产分类区域显示饼图，展示理财资产和独立资产的总市值占比
- **Verification**: `programmatic`

### AC-2: 统计分析页面显示资产总成本对比饼图
- **Given**: 用户进入统计分析页面
- **When**: 页面加载完成且存在理财资产或独立资产数据
- **Then**: 在资产分类区域显示饼图，展示理财资产和独立资产的总成本占比
- **Verification**: `programmatic`

### AC-3: 独立资产页面显示总成本卡片
- **Given**: 用户进入独立资产页面
- **When**: 页面加载完成
- **Then**: 在顶部统计卡片区域新增「总成本」卡片，显示独立资产的累计成本
- **Verification**: `human-judgment`

### AC-4: 数据计算准确性
- **Given**: 存在理财资产和独立资产数据
- **When**: 计算各类资产的总市值和总成本
- **Then**: 计算结果与各资产明细之和一致
- **Verification**: `programmatic`

## Open Questions
- [ ] 资产分类对比饼图在统计分析页面的具体位置（建议在收支分析饼图附近或单独区域）
