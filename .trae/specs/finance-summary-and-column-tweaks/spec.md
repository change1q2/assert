# 理财模块筛选汇总与列调整 - Product Requirement Document

## Overview
- **Summary**: 调整理财模块"筛选汇总"卡片的数据项与计算公式，修正列表列名与字段，并优化列设置弹窗的交互体验。
- **Purpose**: 让筛选汇总卡片展示更贴合用户业务视角的数据指标（以当前市值为基准计算收益率），统一列命名规范，改善列设置弹窗的可用性。
- **Target Users**: 理财模块用户（持仓管理者）

## Goals
- 筛选汇总卡片展示 5 项核心指标：当前市值、持仓盈亏、持仓收益率、当日盈亏、当日收益率
- 持仓收益率与当日收益率均以"当前市值"为分母计算
- 列表列名统一规范（名称→资产名称，日收益%→当日收益率），删除均价列
- 列设置弹窗右对齐完整显示，点击空白处自动关闭

## Non-Goals (Out of Scope)
- 不涉及账户本卡片的调整
- 不涉及顶部四张核心统计卡的调整
- 不涉及后端 API 或数据库结构变更
- 不涉及数据导入导出功能

## Background & Context
- 当前筛选汇总卡片（HoldingsSummaryCard）共 7 项数据，分两行显示（4+3），收益率以总成本为分母
- 列表 DEFAULT_COLUMNS 中包含"均价"(avgBuyPrice) 列，列名存在"名称""日收益%"等不一致命名
- 列设置弹窗当前为 `absolute right-0 top-full` 右对齐，但无点击外部关闭功能，用户需点击 X 按钮或再次点击列设置按钮才能关闭
- 相关代码集中在 [Finance.jsx](file:///c:/Users/YZ-X-096/.trae-cn/worktrees/assert/feat-douyin-project-changes-4EQ8Jo/assert_WEB/src/pages/Finance.jsx)

## Functional Requirements
- **FR-1**: 筛选汇总卡片显示 5 项数据：当前市值、持仓盈亏、持仓收益率、当日盈亏、当日收益率
- **FR-2**: 持仓收益率 = 持仓盈亏 ÷ 当前市值 × 100%
- **FR-3**: 当日收益率 = 当日盈亏 ÷ 当前市值 × 100%
- **FR-4**: 列表"名称"列改为"资产名称"
- **FR-5**: 列表删除"均价"(avgBuyPrice) 列（从 DEFAULT_COLUMNS 移除，默认不可见）
- **FR-6**: 列表"日收益%"列改为"当日收益率"
- **FR-7**: 列设置弹窗右对齐完整显示，不超出视口
- **FR-8**: 点击列设置弹窗外部空白区域可关闭弹窗

## Non-Functional Requirements
- **NFR-1**: 所有数值保留 3 位小数（与现有 formatNum 一致）
- **NFR-2**: 百分比保留 2 位小数，带 +/- 符号（与现有 formatPercentage 一致）
- **NFR-3**: 盈亏颜色规则保持一致（正绿负红）
- **NFR-4**: 列设置数据持久化到 localStorage 不受影响

## Constraints
- **Technical**: 仅修改前端 assert_WEB/src/pages/Finance.jsx
- **Business**: 保持现有数据结构和后端 API 不变
- **Dependencies**: 无新增依赖

## Assumptions
- 用户希望筛选汇总卡片只保留 5 项核心指标（移除总本金、平均成本）
- 收益率计算公式变更为以当前市值为分母是用户明确的业务需求
- 列设置弹窗右对齐时，面板宽度 w-64 能完整显示在视口内

## Acceptance Criteria

### AC-1: 筛选汇总卡片数据项
- **Given**: 用户进入理财模块，持仓明细下有筛选汇总卡片
- **When**: 查看筛选汇总卡片
- **Then**: 卡片显示 5 项数据：当前市值、持仓盈亏、持仓收益率、当日盈亏、当日收益率（不再显示总本金和平均成本）
- **Verification**: `human-judgment`

### AC-2: 持仓收益率计算公式
- **Given**: 筛选后列表的当前市值总和为 MV，持仓盈亏总和为 PnL
- **When**: 计算持仓收益率
- **Then**: 持仓收益率 = PnL / MV * 100%，结果显示为带 +/- 号的百分比，保留 2 位小数
- **Verification**: `programmatic`
- **Notes**: 当前市值为 0 时显示 "—"

### AC-3: 当日收益率计算公式
- **Given**: 筛选后列表的当前市值总和为 MV，当日盈亏总和为 DPnL
- **When**: 计算当日收益率
- **Then**: 当日收益率 = DPnL / MV * 100%，结果显示为带 +/- 号的百分比，保留 2 位小数
- **Verification**: `programmatic`
- **Notes**: 当前市值为 0 时显示 "—"

### AC-4: 列名与列字段调整
- **Given**: 持仓明细列表
- **When**: 查看列表表头
- **Then**: "名称"列显示为"资产名称"，"日收益%"列显示为"当日收益率"，列表中无"均价"列
- **Verification**: `human-judgment`

### AC-5: 均价列从默认列配置移除
- **Given**: 新增用户或重置列设置后
- **When**: 查看列设置弹窗中的列列表
- **Then**: "均价"列不在默认可见列中（从 DEFAULT_COLUMNS 中移除该条目）
- **Verification**: `programmatic`

### AC-6: 列设置弹窗位置
- **Given**: 用户点击"列设置"按钮
- **When**: 弹窗展开
- **Then**: 弹窗右边缘与按钮右边缘对齐，完整显示在视口内，不被截断
- **Verification**: `human-judgment`

### AC-7: 点击空白处关闭列设置弹窗
- **Given**: 列设置弹窗已打开
- **When**: 用户点击弹窗外部的任意空白区域
- **Then**: 弹窗自动关闭
- **Verification**: `human-judgment`

### AC-8: 构建验证
- **Given**: 代码修改完成
- **When**: 运行 npm run build
- **Then**: 构建成功，无错误
- **Verification**: `programmatic`

## Open Questions
- [ ] 筛选汇总卡片 5 项数据的布局排列方式？（建议：一行 5 列均匀分布）
- [ ] 底部表格合计行的持仓盈亏率是否也同步改为以当前市值为分母计算？
