# 收支分析页面全面重构 - 产品需求文档

## Overview
- **Summary**: 全面重构收支分析页面，包括日期筛选组件重设计、布局调整、账户与账本合并、前后端数据结构统一
- **Purpose**: 提升用户体验，简化数据模型，确保前后端数据一致性
- **Target Users**: 使用收支分析功能的所有用户

## Goals
- 重设计日期筛选组件，支持日常/月统计/年统计/自定义四种模式
- 删除右侧冗余的日期筛选按钮（2026年、本月、上月等）
- 调整页面布局，收支分析卡片放最上面，按钮位置优化
- 合并账户和账本概念，统一为账本
- 统一前后端数据结构，确保数据正确同步

## Non-Goals (Out of Scope)
- 修改数据库表结构（保持现有结构，调整字段映射）
- 新增图表组件库
- 修改其他页面

## Background & Context
- 当前日期筛选右侧有冗余的月份选择按钮
- 自定义模式未实现日期区间选择
- 账户和账本概念重复，需要合并
- 前后端数据字段名不一致，需要统一

## Functional Requirements
- **FR-1**: 日常模式显示日历表，清楚标记每日收支，支持卡片大小调整
- **FR-2**: 月统计模式显示1-12月柱状图
- **FR-3**: 年统计模式显示年度趋势图
- **FR-4**: 自定义模式支持日期区间选择，根据区间长度自动切换显示粒度（日/月/年）
- **FR-5**: 删除右侧日期筛选按钮（2026年、本月等）
- **FR-6**: 收支分析卡片移至页面顶部，刷新按钮放最右侧
- **FR-7**: 新增按钮移至收支记录列表右上角（重置筛选左边）
- **FR-8**: 删除账户概念，统一为账本，新增弹窗账户字段改为账本
- **FR-9**: 前后端数据结构统一，确保数据正确保存和加载

## Non-Functional Requirements
- **NFR-1**: 页面响应时间 < 2秒
- **NFR-2**: 图表渲染流畅，无卡顿
- **NFR-3**: 界面美观，符合现有设计风格

## Constraints
- **Technical**: React + Vite + TailwindCSS，使用 recharts 图表库
- **Dependencies**: 后端 MySQL 数据库

## Assumptions
- 用户已登录，能正常访问 API
- MySQL 数据库已配置运行

## Acceptance Criteria

### AC-1: 日常模式日历表
- **Given**: 用户点击"日常"标签
- **When**: 页面显示日历组件
- **Then**: 日历上标记每日收支，卡片大小可调整
- **Verification**: `human-judgment`

### AC-2: 月统计模式图表
- **Given**: 用户点击"月统计"标签
- **When**: 页面加载月统计数据
- **Then**: 显示1-12月的收支柱状图
- **Verification**: `human-judgment`

### AC-3: 年统计模式图表
- **Given**: 用户点击"年统计"标签
- **When**: 页面加载年统计数据
- **Then**: 显示年度收支趋势图
- **Verification**: `human-judgment`

### AC-4: 自定义日期区间
- **Given**: 用户点击"自定义"标签
- **When**: 用户选择起始和结束日期
- **Then**: 根据区间长度自动选择显示粒度
- **Verification**: `human-judgment`

### AC-5: 删除右侧筛选按钮
- **Given**: 用户查看页面顶部
- **When**: 观察日期筛选区域
- **Then**: 右侧无2026年、本月等按钮
- **Verification**: `human-judgment`

### AC-6: 布局调整
- **Given**: 用户查看页面
- **When**: 观察页面结构
- **Then**: 收支分析卡片在最上方，刷新按钮在右侧，新增按钮在记录列表右上角
- **Verification**: `human-judgment`

### AC-7: 账户与账本合并
- **Given**: 用户打开新增弹窗
- **When**: 观察表单字段
- **Then**: 无账户字段，只有账本字段
- **Verification**: `human-judgment`

### AC-8: 数据结构统一
- **Given**: 用户新增记录并保存
- **When**: 页面刷新
- **Then**: 记录数据正确显示，无字段缺失
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要保留账户管理功能？（当前设计为完全删除账户概念）