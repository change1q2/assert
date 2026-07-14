# 理财模块筛选汇总与列调整 - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: 调整筛选汇总卡片数据项与计算公式
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 HoldingsSummaryCard 组件：移除总本金、平均成本，保留 5 项（当前市值、持仓盈亏、持仓收益率、当日盈亏、当日收益率）
  - 布局改为一行 5 列（grid-cols-5）
  - 修改 computed.holdingsSummary 的计算逻辑：
    - totalPnlRate = totalPnl / totalMarketValue * 100%（原为 totalPnl / totalCost）
    - totalDailyPnlRate = totalDailyPnl / totalMarketValue * 100%（原为 totalDailyPnl / totalCost）
    - 删除 avgCost 字段的计算
  - 底部表格合计行的持仓盈亏率也同步改为以当前市值为分母
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3]
- **Test Requirements**:
  - `programmatic` TR-1.1: holdingsSummary.totalPnlRate 的值等于 totalPnl / totalMarketValue * 100，当 totalMarketValue 为 0 时为 0
  - `programmatic` TR-1.2: holdingsSummary.totalDailyPnlRate 的值等于 totalDailyPnl / totalMarketValue * 100，当 totalMarketValue 为 0 时为 0
  - `human-judgement` TR-1.3: 筛选汇总卡片只显示 5 个数据项，布局为一行 5 列均匀分布，文字标签正确
  - `human-judgement` TR-1.4: 盈亏颜色正确（正绿负红），数值格式正确（3位小数，百分比2位）
- **Notes**: 注意除数为 0 的边界情况

## [x] Task 2: 调整列表列名与删除均价列
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - DEFAULT_COLUMNS 中 "名称" 列 label 改为 "资产名称"
  - DEFAULT_COLUMNS 中删除 "均价"(avgBuyPrice) 列条目
  - DEFAULT_COLUMNS 中 "日收益%" 列 label 改为 "当日收益率"
  - fieldLabelMap 中对应字段的 label 也同步更新
- **Acceptance Criteria Addressed**: [AC-4, AC-5]
- **Test Requirements**:
  - `programmatic` TR-2.1: DEFAULT_COLUMNS 数组中不存在 key 为 'avgBuyPrice' 的条目
  - `human-judgement` TR-2.2: 列表表头显示"资产名称"和"当日收益率"，不显示"均价"列
  - `human-judgement` TR-2.3: 列设置弹窗中列列表正确反映上述变更
- **Notes**: 已保存的用户自定义列设置（localStorage）中如果还有 avgBuyPrice，需做兼容处理（忽略该列）

## [/] Task 3: 列设置弹窗交互优化
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 保持弹窗右对齐定位（right-0），确保完整显示
  - 添加点击外部关闭功能：使用 useRef 引用弹窗容器，在 document 上添加 click 事件监听，点击目标不在弹窗内时关闭
  - 弹窗打开时添加事件监听，关闭时移除（useEffect 清理）
- **Acceptance Criteria Addressed**: [AC-6, AC-7]
- **Test Requirements**:
  - `human-judgement` TR-3.1: 点击"列设置"按钮后弹窗完整显示，右边缘与按钮对齐
  - `human-judgement` TR-3.2: 点击弹窗外部区域，弹窗关闭
  - `human-judgement` TR-3.3: 点击弹窗内部区域（包括复选框、按钮、列表项），弹窗不关闭
  - `human-judgement` TR-3.4: 点击弹窗右上角 X 按钮仍可正常关闭
- **Notes**: 使用 event.stopPropagation 或 contains 判断来区分内部/外部点击

## [x] Task 4: 构建验证
- **Priority**: high
- **Depends On**: [Task 1, Task 2, Task 3]
- **Description**: 
  - 运行 npm run build 确保前端构建无错误
- **Acceptance Criteria Addressed**: [AC-8]
- **Test Requirements**:
  - `programmatic` TR-4.1: npm run build 执行成功，exit code 为 0
- **Notes**:
