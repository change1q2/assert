# 资产分类图表优化 - 实现计划

## [x] Task 1: 饼图过滤0%数据
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改资产分类占比饼图数据过滤逻辑，过滤value为0的分类
  - 修改海内外资产占比饼图数据过滤逻辑，过滤value为0的分类
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: 当某分类金额为0时，饼图不显示该分类
  - `human-judgement` TR-1.2: 饼图只显示有数据的分类

## [x] Task 2: 标签自动延伸避免重叠
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 为饼图设置labelLine属性，使标签自动延伸到空白区域
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement` TR-2.1: 标签重叠时自动延伸到空白区域

## [x] Task 3: 新增独立资产占比饼图
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 新增computeIndependentAssetsPie函数计算独立资产占比数据
  - 在饼图行新增独立资产占比饼图组件
  - 调整响应式布局为3列
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgement` TR-3.1: 页面显示独立资产占比饼图
  - `human-judgement` TR-3.2: 显示保险、房产、车辆等类别数据

## [x] Task 4: 饼图中心显示优化
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 修改饼图中心显示逻辑，使用formatAmountChinese函数显示"万"单位
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgement` TR-4.1: 饼图中心显示使用"万"单位
  - `human-judgement` TR-4.2: 中心显示不覆盖饼图区域

## [x] Task 5: 修复增长趋势显示所有7个标准分类
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改generateTrendData函数，确保包含DEFAULT_CLASSES中的所有7个分类
  - 对于没有数据的分类，显示0值趋势线
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-5.1: 增长趋势图categories数组包含7个标准分类
  - `human-judgement` TR-5.2: 增长趋势图显示所有7个分类的趋势线

## [x] Task 6: 修复分类金额柱状图显示所有7个标准分类
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改computeCategoryL1Amounts函数，确保包含DEFAULT_CLASSES中的所有7个分类
  - 对于没有数据的分类，显示0值柱状
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `programmatic` TR-6.1: 柱状图数据包含7个标准分类
  - `human-judgement` TR-6.2: 柱状图显示所有7个分类的柱子

