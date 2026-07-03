# 统计分析页面 - 月统计模式重构

## Overview
- **Summary**: 根据设计图片重新实现月统计模式页面，包含年份选择、月份切换、收支统计卡片、各类图表和数据列表
- **Purpose**: 使月统计页面与设计图片一致，提供完整的统计分析功能
- **Target Users**: 所有使用财务应用的用户

## Goals
- 实现月统计模式的完整页面布局，与设计图片一致
- 支持年份选择和月份快速切换（本月、上月、5月等）
- 实现收支统计卡片（月支出、月收入、月结余）
- 实现收支统计柱状图（支持支出/收入/结余切换）
- 实现资产走势、收支对比、支出占比（空心饼图）、支出数据、报表统计、标签占比、标签数据、本月总结

## Non-Goals (Out of Scope)
- 不修改后端API接口
- 不修改其他模式（日常、年统计、自定义）的实现

## Background & Context
- 用户提供了月统计模式的设计图片，展示了完整的页面布局
- 现有Analysis.jsx已实现基础功能，但布局与设计图片不一致
- 需要使用真实API数据（fetchState）

## Functional Requirements
- **FR-1**: 顶部显示时间周期切换（日常/月统计/年统计/自定义），参考设计图片样式
- **FR-2**: 第二行显示年份选择器（如2026）和月份切换按钮（本月、上月、5月、4月等）
- **FR-3**: 第三行显示月支出、月收入、月结余三个统计卡片
- **FR-4**: 第四行显示收支统计柱状图，支持支出/收入/结余切换
- **FR-5**: 资产走势图表
- **FR-6**: 收支对比（一级分类/全部切换）
- **FR-7**: 支出占比（空心饼图，一级分类/全部切换）
- **FR-8**: 支出数据列表（显示分类、金额、占比、同比）
- **FR-9**: 报表统计表（日期、收入、支出、结余）
- **FR-10**: 标签占比（空心饼图）
- **FR-11**: 标签数据列表
- **FR-12**: 本月总结（可编辑）

## Non-Functional Requirements
- **NFR-1**: 页面样式与设计图片一致
- **NFR-2**: 支持深色模式
- **NFR-3**: 响应式布局

## Constraints
- **Technical**: React + Vite, 使用recharts图表库, 使用lucide-react图标库

## Acceptance Criteria

### AC-1: 时间周期切换
- **Given**: 统计分析页面已加载
- **When**: 点击日常/月统计/年统计/自定义切换按钮
- **Then**: 页面切换到对应模式
- **Verification**: `human-judgment`

### AC-2: 年份和月份选择
- **Given**: 处于月统计模式
- **When**: 选择年份或点击月份按钮
- **Then**: 统计数据更新为对应年月
- **Verification**: `human-judgment`

### AC-3: 收支统计卡片
- **Given**: 处于月统计模式
- **When**: 页面加载完成
- **Then**: 显示月支出、月收入、月结余三个卡片，数据正确
- **Verification**: `human-judgment`

### AC-4: 收支统计柱状图
- **Given**: 处于月统计模式
- **When**: 切换支出/收入/结余标签
- **Then**: 柱状图显示对应数据
- **Verification**: `human-judgment`

### AC-5: 资产走势
- **Given**: 处于月统计模式
- **When**: 页面加载完成
- **Then**: 显示资产走势图表
- **Verification**: `human-judgment`

### AC-6: 收支对比
- **Given**: 处于月统计模式
- **When**: 切换一级分类/全部
- **Then**: 收支对比数据更新
- **Verification**: `human-judgment`

### AC-7: 支出占比
- **Given**: 处于月统计模式
- **When**: 页面加载完成
- **Then**: 显示空心饼图，切换一级分类/全部数据更新
- **Verification**: `human-judgment`

### AC-8: 支出数据列表
- **Given**: 处于月统计模式
- **When**: 页面加载完成
- **Then**: 显示支出数据列表，包含分类、金额、占比、同比
- **Verification**: `human-judgment`

### AC-9: 报表统计
- **Given**: 处于月统计模式
- **When**: 页面加载完成
- **Then**: 显示报表统计表
- **Verification**: `human-judgment`

### AC-10: 标签占比和标签数据
- **Given**: 处于月统计模式
- **When**: 页面加载完成
- **Then**: 显示标签占比饼图和标签数据列表
- **Verification**: `human-judgment`

### AC-11: 本月总结
- **Given**: 处于月统计模式
- **When**: 点击本月总结区域
- **Then**: 可以编辑本月总结内容，保存到localStorage
- **Verification**: `human-judgment`

## Open Questions
- [ ] 是否需要支持其他时间周期模式（日常、年统计、自定义）的类似重构
- [ ] 本月总结的数据是否需要持久化存储