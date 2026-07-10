# 统计分析页面优化 - 实施计划

## [x] Task 1: 年统计时间筛选增加"所有"按钮
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在年统计视图的年份选择器左侧增加"所有"按钮
  - 新增 selectedYearAll 状态（boolean）
  - 点击"所有"时，selectedYearAll = true，显示全部年份数据
  - 点击具体年份时，selectedYearAll = false
  - 所有年统计数据计算函数增加对"所有"模式的支持
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-1.1: 年统计页面有"所有"按钮
  - `human-judgement` TR-1.2: 点击"所有"后显示全部数据

## [x] Task 2: 收支统计柱状图添加金额标签
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 年统计的收支统计柱状图每个柱子顶部显示金额
  - 使用 Recharts Bar 的 label 属性
  - 金额格式：带货币符号，整数显示
  - 文字大小 10-11px，颜色与柱子一致
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement` TR-2.1: 柱状图顶部有金额标签
  - `human-judgement` TR-2.2: 金额格式正确

## [x] Task 3: 移除年统计的收支热力图
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 删除年统计视图中的"收支热力日历"模块
  - 保留月统计和日常视图的热力图不变
  - 如果 yHeatmap 等变量只在年统计使用，可清理但非必须
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgement` TR-3.1: 年统计页面无热力图模块
  - `human-judgement` TR-3.2: 月统计热力图不受影响

## [x] Task 4: 收支对比同步收支分析分类视图
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 确认年统计的收支对比已有 yearCategoryView 状态
  - 一级分类视图：按大类聚合（与 Records.jsx 一致）
  - 全部视图：所有二级分类
  - 数据聚合逻辑参考 Records.jsx 的 computePieChartData
  - 确保 yearCategoryData 有 income 和 expense 两个数组
- **Acceptance Criteria Addressed**: AC-4, AC-6
- **Test Requirements**:
  - `human-judgement` TR-4.1: 一级分类/全部切换正常
  - `human-judgement` TR-4.2: 数据聚合正确

## [x] Task 5: 支出占比饼图支持收入/支出切换
- **Priority**: high
- **Depends On**: Task 4
- **Description**: 
  - 新增 yearPieType 状态（'expense' | 'income'）
  - 饼图标题旁增加切换按钮
  - 饼图改为空心环形（innerRadius/outerRadius）
  - 所有扇区显示标签（名称 + 百分比）
  - 标签有引导线
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgement` TR-5.1: 有切换按钮，切换正常
  - `human-judgement` TR-5.2: 空心环形饼图，有标签

## [x] Task 6: 支出数据列表和标签数据对齐
- **Priority**: medium
- **Depends On**: Task 5
- **Description**: 
  - 支出数据列表使用与饼图相同的数据源
  - 支持一级分类/全部视图切换
  - 标签占比饼图和标签数据列表使用收支分析的标签数据
  - 确保标签数据的百分比计算正确
- **Acceptance Criteria Addressed**: AC-6, AC-7
- **Test Requirements**:
  - `human-judgement` TR-6.1: 支出列表与饼图数据一致
  - `human-judgement` TR-6.2: 标签数据正确

## [x] Task 7: 构建验证与浏览器测试
- **Priority**: high
- **Depends On**: Task 1, 2, 3, 4, 5, 6
- **Description**: 
  - 运行 npm run build 确保无构建错误
  - 在浏览器中验证所有功能
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `programmatic` TR-7.1: npm run build 退出码为 0
  - `human-judgement` TR-7.2: 浏览器中所有功能正常
