# 收支分析饼图优化 - Product Requirement Document

## Overview
- **Summary**: 对收支分析页面的饼图进行优化，包括标签文字大小自适应、确保所有占比标签显示完整、扩展颜色方案使每个分类都有独特颜色。
- **Purpose**: 解决当前饼图标签重叠、文字溢出、颜色重复等视觉问题，提升数据可读性和视觉体验。
- **Target Users**: 所有使用收支分析功能的用户

## Goals
- 标签文字大小根据饼图区域自适应，避免溢出
- 确保每一项的占比都能完整显示，不被遮挡或省略
- 扩展颜色方案，确保每个分类（包括二级分类）都有独特颜色

## Non-Goals (Out of Scope)
- 不修改饼图的基本结构（保持环形饼图和切换功能不变）
- 不修改数据聚合逻辑
- 不增加新的交互功能（如点击钻取）

## Background & Context
- 当前饼图使用 Recharts PieChart 组件，标签通过 label 属性显示
- 当前颜色方案：收入大类 6 色，支出大类 9 色，二级分类使用透明度变体
- 问题：标签文字大小固定，当分类数量多时会重叠；二级分类颜色透明度变体不够明显，导致视觉上难以区分

## Functional Requirements

### FR-1: 标签文字自适应大小
- 根据饼图容器尺寸和数据项数量自动调整标签文字大小
- 数据项数量较多时（如 >10 项），标签文字缩小
- 确保标签不溢出容器边界

### FR-2: 所有占比标签完整显示
- 优化标签布局，避免重叠
- 对于小占比项，确保标签仍能显示
- 必要时调整饼图尺寸或 innerRadius/outerRadius 比例

### FR-3: 扩展颜色方案
- 收入和支出各提供至少 20 种不同颜色
- 每个分类使用独特颜色，不再使用透明度变体
- 保持颜色的视觉区分度，避免相近色

## Non-Functional Requirements
- **NFR-1**: 标签文字最小不小于 10px，保证可读性
- **NFR-2**: 颜色对比度符合 WCAG AA 标准

## Constraints
- **Technical**: React + Recharts，Tailwind CSS
- **Dependencies**: 依赖现有的 computePieChartData 函数

## Assumptions
- 饼图容器高度固定为 300px
- 标签文字格式为：名称 + 百分比（保留1位小数）
- 颜色方案需要支持至少 30 个不同分类

## Acceptance Criteria

### AC-1: 标签文字自适应
- **Given**: 饼图数据项数量超过 10 个
- **When**: 查看饼图标签
- **Then**: 标签文字自动缩小，不溢出容器
- **Verification**: `human-judgment`

### AC-2: 所有标签完整显示
- **Given**: 饼图有多小占比项（<1%）
- **When**: 查看饼图
- **Then**: 所有项的标签都完整显示，无重叠遮挡
- **Verification**: `human-judgment`

### AC-3: 每个分类颜色唯一
- **Given**: 饼图有多个二级分类
- **When**: 查看饼图
- **Then**: 每个扇区颜色都不相同，视觉上容易区分
- **Verification**: `human-judgment`

### AC-4: 构建成功
- **Given**: 修改完成后运行 npm run build
- **When**: 构建完成
- **Then**: 构建成功，无错误
- **Verification**: `programmatic`

## Open Questions
- 是否需要对极小占比项（<0.5%）进行合并显示？
