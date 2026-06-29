# 收支分析页面筛选增强 - 实现计划

## [x] Task 1: 删除新增弹窗中的设置功能
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 删除新增弹窗中的设置区域（约第1671-1687行）
  - 删除相关的 showSettingsSection 状态
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `human-judgment` TR-1.1: 打开新增弹窗，确认无设置区域

## [x] Task 2: 将标签改为下拉选项并支持管理
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 将新增弹窗中的标签输入框改为下拉选择
  - 支持从现有标签列表中选择
  - 添加标签管理功能（编辑、删除）
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `human-judgment` TR-2.1: 标签字段显示为下拉选择
  - `human-judgment` TR-2.2: 支持标签管理功能

## [x] Task 3: 优化筛选区域布局
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 为每个筛选添加提示文字（日期：、账本：等）
  - 将日期筛选改为下拉选择（按日/周/月）
  - 将一级分类筛选改为下拉选择（从 categories 数据获取）
  - 将二级分类筛选改为下拉选择（根据一级分类动态更新）
- **Acceptance Criteria Addressed**: [AC-3]
- **Test Requirements**:
  - `human-judgment` TR-3.1: 每个筛选前面有提示文字
  - `human-judgment` TR-3.2: 日期和分类使用下拉选择

## [x] Task 4: 将金额/标签/备注筛选折叠进高级筛选
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 从主筛选区域移除金额（最小/最大）、标签、备注筛选
  - 在高级列表设置弹窗中添加这些筛选选项
- **Acceptance Criteria Addressed**: [AC-4]
- **Test Requirements**:
  - `human-judgment` TR-4.1: 主筛选区域无金额、标签、备注筛选
  - `human-judgment` TR-4.2: 高级筛选中包含这些选项

## [x] Task 5: 添加"全部"日期视图标签
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在"日常"左侧添加"全部"标签
  - 默认选中"全部"
  - "全部"模式下显示总体统计数据，不显示日历或图表
- **Acceptance Criteria Addressed**: [AC-5]
- **Test Requirements**:
  - `human-judgment` TR-5.1: 日期筛选区域有"全部"标签
  - `human-judgment` TR-5.2: 默认选中"全部"

## [x] Task 6: 动态更新统计卡片标题
- **Priority**: high
- **Depends On**: Task 5
- **Description**: 
  - 创建函数根据 timePeriod 和 selectedDate 计算统计标题
  - 全部：总收入、总支出、净收入
  - 日常（选中日期）：当日收入、当日支出、当日净收入
  - 月统计：当月收入、当月支出、当月净收入
  - 年统计：当年收入、当年支出、当年净收入
  - 自定义：根据选择的日期范围显示对应标题
- **Acceptance Criteria Addressed**: [AC-6]
- **Test Requirements**:
  - `human-judgment` TR-6.1: 统计卡片标题随日期选择动态变化

## [x] Task 7: 确保数据同步过滤
- **Priority**: high
- **Depends On**: Task 5, Task 6
- **Description**: 
  - 确保收入占比、支出占比图表根据日期筛选条件更新
  - 确保收支记录列表根据日期筛选条件过滤
  - 确保统计卡片数据根据日期筛选条件计算
- **Acceptance Criteria Addressed**: [AC-7]
- **Test Requirements**:
  - `human-judgment` TR-7.1: 收入占比图表跟随日期筛选变化
  - `human-judgment` TR-7.2: 支出占比图表跟随日期筛选变化
  - `human-judgment` TR-7.3: 收支记录列表跟随日期筛选过滤

## [x] Task 8: 整体功能验证
- **Priority**: medium
- **Depends On**: All previous tasks
- **Description**: 
  - 端到端测试所有功能
  - 确保所有筛选功能正常工作
  - 确保数据同步过滤正常
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7]
- **Test Requirements**:
  - `human-judgment` TR-8.1: 所有功能测试通过
  - `programmatic` TR-8.2: 前端构建成功