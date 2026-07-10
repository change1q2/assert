# 收支分析预算功能优化 - Product Requirement Document

## Overview
- **Summary**: 在收支分析页面增加预算卡片入口，优化预算管理页面的添加分类功能，修复数据显示问题
- **Purpose**: 提升预算管理功能的可用性，使预算分类选择更符合现有记账系统的分类体系
- **Target Users**: 个人财务管理用户

## Goals
- 在收支分析页面添加预算卡片，方便用户快速进入预算管理
- 预算分类选择改为类别+二级分类的下拉框方式
- 确保预算趋势图正确显示支出和剩余数据
- 修复添加分类后数据不显示的问题

## Non-Goals (Out of Scope)
- 不修改预算管理的核心逻辑
- 不添加新的预算类型（如年度预算）
- 不修改预算提醒功能

## Background & Context
- 现有预算管理页面使用文本输入框输入分类名称
- 收支分析页面已有收入、支出、结余三张卡片
- 系统已有类别和二级分类的数据结构
- 添加分类后数据可能因组件未重新渲染而不显示

## Functional Requirements
- **FR-1**: 收支分析页面增加预算卡片，显示总预算和已使用金额，点击进入预算管理页面
- **FR-2**: 预算管理页面添加分类弹窗改为类别和二级分类两个下拉框
- **FR-3**: 类别为必填项，二级分类为非必填项
- **FR-4**: 预算趋势图正确显示支出和剩余两条线
- **FR-5**: 添加分类后列表立即刷新显示新数据

## Non-Functional Requirements
- **NFR-1**: 界面响应迅速，操作流畅
- **NFR-2**: 数据状态同步正确

## Constraints
- **Technical**: React + Hooks + Tailwind CSS + Recharts
- **Business**: 保持现有数据结构兼容性
- **Dependencies**: 使用现有类别和二级分类数据

## Assumptions
- 用户期望预算分类与记账分类保持一致
- 类别对应一级分类，二级分类对应子分类

## Acceptance Criteria

### AC-1: 收支分析页面预算卡片
- **Given**: 用户在收支分析页面
- **When**: 页面加载完成
- **Then**: 显示预算卡片，包含总预算金额、已使用金额、进度条
- **Verification**: `human-judgment`

### AC-2: 预算卡片跳转
- **Given**: 用户在收支分析页面
- **When**: 点击预算卡片或"添加预算"按钮
- **Then**: 跳转到预算管理页面
- **Verification**: `human-judgment`

### AC-3: 添加分类下拉框
- **Given**: 用户在预算管理页面点击"添加分类预算"
- **When**: 弹窗打开
- **Then**: 显示类别下拉框（必填）和二级分类下拉框（非必填）
- **Verification**: `human-judgment`

### AC-4: 类别二级联动
- **Given**: 用户已选择一个类别
- **When**: 点击二级分类下拉框
- **Then**: 只显示该类别下的二级分类选项
- **Verification**: `human-judgment`

### AC-5: 预算趋势图数据显示
- **Given**: 有预算数据和支出记录
- **When**: 查看预算趋势图
- **Then**: 支出线和剩余线都正确显示数值
- **Verification**: `human-judgment`

### AC-6: 添加分类后数据显示
- **Given**: 用户在预算管理页面
- **When**: 添加一个新的分类预算
- **Then**: 列表立即显示新添加的分类，总预算金额更新
- **Verification**: `human-judgment`

## Open Questions
- 无
