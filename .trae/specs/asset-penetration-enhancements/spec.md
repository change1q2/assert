# 资产穿透增强功能 - 产品需求文档

## Overview
- **Summary**: 对场内穿透（资产穿透）页面进行5项增强：(1) 仓位分析改为热力图显示；(2) 极值分析显示最大收益率和最大回撤；(3) 标记买卖点改为资产类型柱状图；(4) 标签分析改为资产分析；(5) 增加百度财经作为备用数据源。
- **Purpose**: 提升资产穿透页面的数据可视化效果和数据分析能力，确保数据准确性。
- **Target Users**: 理财模块使用者

## Goals
1. 仓位分析改为热力图，按列表数据的仓位占比显示，勾选时右侧收益率和收益额跟随变化
2. 极值分析显示历史最大收益率和最大回撤
3. 标记买卖点改为资产类型，勾选时按资产类型显示涨跌柱状图
4. 标签分析改为资产分析，按资产一级分类显示柱状图
5. 增加百度财经作为备用数据源，数据不全时进行校验补充

## Non-Goals (Out of Scope)
- 不修改现有日历收益功能
- 不修改指数对比功能
- 不修改月度个股盈亏功能

## Background & Context
- 当前资产穿透页面（AssetPenetration.jsx）已有收益分析模块，包含仓位分析（饼图）、极值分析（未实现）、标记买卖点（未实现）、标签分析（未实现）
- 当前数据来源：新浪财经（hq.sinajs.cn）和自研 API（/api/finance/index）
- 用户希望增强可视化效果，从饼图改为热力图，并增加更多分析维度

## Functional Requirements
- **FR-1**: 仓位分析区域改为热力图显示，数据基于列表中各资产的仓位占比（currentValue / totalValue），勾选时右侧收益率和收益额区域显示选中分类的对应数据
- **FR-2**: 极值分析功能显示走势图历史上某一段时间内的最大收益率和最大回撤
- **FR-3**: "标记买卖点"选项改为"资产类型"，勾选时显示按资产类型（assetType）分组的涨跌统计柱状图
- **FR-4**: "标签分析"选项改为"资产分析"，显示按资产一级分类（categoryL1）分组的市值柱状图
- **FR-5**: 增加百度财经（finance.baidu.com）作为备用数据源，当主数据源数据不全时自动获取补充

## Non-Functional Requirements
- **NFR-1**: 热力图渲染性能良好，支持至少50个资产的显示
- **NFR-2**: 数据获取失败时自动降级到备用数据源，不影响用户体验
- **NFR-3**: 界面响应时间 < 500ms

## Constraints
- **Technical**: React + Vite + Tailwind CSS，无第三方图表库依赖（使用原生 SVG）
- **Data**: 主要数据源为新浪财经，备用数据源为百度财经
- **Dependencies**: 现有 fetchFinanceQuotes API 函数

## Assumptions
- 仓位占比 = currentValue / totalValue
- 资产类型字段为 assetType
- 一级分类字段为 categoryL1
- 历史数据从 indexHistoryData 获取

## Acceptance Criteria

### AC-1: 仓位分析热力图显示
- **Given**: 打开资产穿透页面，收益分析模块中勾选"仓位分析"
- **When**: 查看仓位分析区域
- **Then**: 显示热力图，每个单元格颜色深浅对应仓位占比大小
- **Verification**: human-judgment

### AC-2: 仓位分析勾选时右侧数据联动
- **Given**: 打开资产穿透页面，收益分析模块中勾选"仓位分析"
- **When**: 点击热力图中某一分类
- **Then**: 右侧收益率和收益额区域显示该分类的汇总数据
- **Verification**: human-judgment

### AC-3: 极值分析显示最大收益率
- **Given**: 打开资产穿透页面，收益分析模块中勾选"极值分析"
- **When**: 查看极值分析区域
- **Then**: 显示历史上某一段时间内的最大收益率数值和日期
- **Verification**: human-judgment

### AC-4: 极值分析显示最大回撤
- **Given**: 打开资产穿透页面，收益分析模块中勾选"极值分析"
- **When**: 查看极值分析区域
- **Then**: 显示历史上某一段时间内的最大回撤数值和日期范围
- **Verification**: human-judgment

### AC-5: 资产类型柱状图显示
- **Given**: 打开资产穿透页面，收益分析模块中勾选"资产类型"
- **When**: 查看资产类型区域
- **Then**: 显示按资产类型分组的柱状图，每个类型显示涨跌统计
- **Verification**: human-judgment

### AC-6: 资产分析柱状图显示
- **Given**: 打开资产穿透页面，收益分析模块中勾选"资产分析"
- **When**: 查看资产分析区域
- **Then**: 显示按一级分类分组的市值柱状图
- **Verification**: human-judgment

### AC-7: 百度财经备用数据源
- **Given**: 主数据源（新浪财经）返回数据不全
- **When**: 页面加载数据
- **Then**: 自动从百度财经获取补充数据
- **Verification**: human-judgment

### AC-8: 构建成功
- **Given**: 代码修改完成
- **When**: 执行 `npm run build`
- **Then**: 构建成功无错误
- **Verification**: programmatic

## Open Questions
- [ ] 热力图的具体布局样式（网格大小、颜色方案）
- [ ] 极值分析的时间范围是否与时间选择器联动