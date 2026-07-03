# 统计分析页面重构 - 真实数据版

## Overview
- **Summary**: 重构统计分析页面，支持收支分析、理财模块、债务模块三套分析数据的切换，使用真实API数据，实现所有页面功能。
- **Purpose**: 替换之前的假数据实现，使统计分析页面能够展示真实的财务数据，提供准确的分析功能。
- **Target Users**: 所有使用财务应用的用户

## Goals
- 支持收支分析、理财模块、债务模块三种模式的切换
- 使用真实API数据展示统计信息
- 实现所有页面功能（图表、统计、筛选等）
- 响应式布局，支持深色模式

## Non-Goals (Out of Scope)
- 不修改后端API接口
- 不添加新的API接口
- 不修改其他页面的数据结构

## Background & Context
- 现有项目使用`fetchState()`获取所有数据（records, accounts, debts, assetClasses等）
- 收支分析模块在Records.jsx中已有完整的数据处理逻辑
- 理财模块在Finance.jsx中已有资产数据处理逻辑
- 债务模块在Debts.jsx中已有债务数据处理逻辑
- 之前的Analysis.jsx使用假数据，需要替换为真实数据

## Functional Requirements
- **FR-1**: 支持三种模式切换（收支分析、理财模块、债务模块），默认显示收支分析
- **FR-2**: 使用`fetchState()`获取真实数据
- **FR-3**: 收支分析模式显示：本周/本月/本年/自定义时间范围的收支统计、分类统计、标签统计、资产汇总、预算占比
- **FR-4**: 理财模块显示：资产分类统计、持仓盈亏、收益走势、账户汇总
- **FR-5**: 债务模块显示：债权/债务统计、还款计划、逾期提醒、债务分类统计
- **FR-6**: 支持时间范围筛选（日常/月统计/年统计/自定义）
- **FR-7**: 支持账本多选筛选
- **FR-8**: 支持模块设置（显示/隐藏卡片）

## Non-Functional Requirements
- **NFR-1**: 页面加载时间<2秒
- **NFR-2**: 支持深色模式
- **NFR-3**: 响应式布局，适配不同屏幕尺寸

## Constraints
- **Technical**: React + Vite, 使用recharts图表库, 使用lucide-react图标库
- **Dependencies**: API接口已存在（/api/state）

## Assumptions
- 用户已登录，localStorage中有token
- API接口返回数据格式与现有页面一致

## Acceptance Criteria

### AC-1: 三种模式切换
- **Given**: 统计分析页面已加载
- **When**: 点击"收支分析"、"理财模块"、"债务模块"切换按钮
- **Then**: 页面切换到对应模式，显示该模式的统计数据
- **Verification**: `human-judgment`

### AC-2: 数据加载
- **Given**: 页面首次加载
- **When**: 用户进入统计分析页面
- **Then**: 页面显示加载状态，加载完成后显示真实数据
- **Verification**: `human-judgment`

### AC-3: 收支分析统计
- **Given**: 处于收支分析模式
- **When**: 选择不同时间范围（日常/月统计/年统计/自定义）
- **Then**: 页面显示对应时间范围的收支统计数据
- **Verification**: `human-judgment`

### AC-4: 理财模块统计
- **Given**: 处于理财模块模式
- **When**: 页面加载完成
- **Then**: 显示资产分类统计、持仓盈亏、收益走势等
- **Verification**: `human-judgment`

### AC-5: 债务模块统计
- **Given**: 处于债务模块模式
- **When**: 页面加载完成
- **Then**: 显示债权/债务统计、还款计划、逾期提醒等
- **Verification**: `human-judgment`

### AC-6: 账本筛选
- **Given**: 处于收支分析模式
- **When**: 使用账本下拉多选筛选
- **Then**: 统计数据根据选中的账本过滤
- **Verification**: `human-judgment`

### AC-7: 模块设置
- **Given**: 用户点击模块设置按钮
- **When**: 勾选/取消勾选显示卡片
- **Then**: 设置保存到localStorage，页面实时更新
- **Verification**: `human-judgment`

## Open Questions
- [ ] 是否需要添加预算功能（与用户之前提到的预算和目标功能）
- [ ] 理财模块的收益走势数据如何获取（需要后端支持还是前端计算）