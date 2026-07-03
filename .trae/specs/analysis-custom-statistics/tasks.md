# 统计分析 - 自定义模式 - 实施计划

## [x] Task 1: 实现自定义模式日期范围选择器
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 实现"2026年06月02日 — 2026年07月02日"格式的日期范围选择器
  - 提供开始日期和结束日期选择
  - 默认显示最近30天
- **Acceptance Criteria Addressed**: 自定义日期范围选择器
- **Test Requirements**:
  - `human-judgement` TR-1.1: 日期范围选择器显示正确
  - `human-judgement` TR-1.2: 切换日期后数据更新
- **Notes**: 使用原生date input组件

## [x] Task 2: 实现总收支统计卡片
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 显示总支出、总收入、总结余三个蓝色统计卡片
  - 数据使用真实API
  - 卡片可折叠/展开
- **Acceptance Criteria Addressed**: 总收支统计卡片
- **Test Requirements**:
  - `human-judgement` TR-2.1: 三个卡片显示正确
- **Notes**: 复用现有的格式函数

## [x] Task 3: 实现收支走势折线图
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 使用recharts的LineChart组件
  - X轴显示日期范围
  - Y轴显示金额
  - 红色为支出，绿色为收入
- **Acceptance Criteria Addressed**: 收支走势折线图
- **Test Requirements**:
  - `human-judgement` TR-3.1: 折线图显示正确
- **Notes**: 使用recharts的LineChart

## [x] Task 4: 实现资产走势面积图
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 使用recharts的AreaChart组件
  - 显示资产变化的面积图
- **Acceptance Criteria Addressed**: 资产走势面积图
- **Test Requirements**:
  - `human-judgement` TR-4.1: 资产走势图表显示正确
- **Notes**: 使用recharts的AreaChart

## [x] Task 5: 实现收支对比桑基图
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - 使用recharts的Sankey组件
  - 支持一级分类/全部切换
  - 显示收入和支出的流向
- **Acceptance Criteria Addressed**: 收支对比桑基图
- **Test Requirements**:
  - `human-judgement` TR-5.1: 桑基图显示正确
- **Notes**: 使用recharts的Sankey

## [x] Task 6: 实现支出占比空心饼图
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 使用recharts的PieChart设置innerRadius
  - 支持一级分类/全部切换
  - 右侧有"显示收支金额"复选框
- **Acceptance Criteria Addressed**: 支出占比空心饼图
- **Test Requirements**:
  - `human-judgement` TR-6.1: 空心饼图显示正确
- **Notes**: 使用recharts的PieChart

## [x] Task 7: 实现支出数据列表
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 显示所有支出分类的列表
  - 每项显示分类名、笔数、占比、金额
  - 按金额倒序排列
- **Acceptance Criteria Addressed**: 支出数据列表
- **Test Requirements**:
  - `human-judgement` TR-7.1: 列表显示正确
- **Notes**: 自定义渲染

## [x] Task 8: 实现标签占比空心饼图
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 显示按标签统计的支出占比空心饼图
  - 右侧有"所有标签"下拉框
- **Acceptance Criteria Addressed**: 标签占比空心饼图
- **Test Requirements**:
  - `human-judgement` TR-8.1: 标签占比饼图显示正确
- **Notes**: 使用recharts的PieChart

## [x] Task 9: 实现标签数据列表
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 显示所有标签的列表
  - 每项显示标签名、笔数、支出、收入
- **Acceptance Criteria Addressed**: 标签数据列表
- **Test Requirements**:
  - `human-judgement` TR-9.1: 标签列表显示正确
- **Notes**: 自定义渲染

## [x] Task 10: 验证构建和运行
- **Priority**: high
- **Depends On**: Task 9
- **Description**: 运行npm run build验证构建成功
- **Acceptance Criteria Addressed**: 全部
- **Test Requirements**:
  - `programmatic` TR-10.1: npm run build构建成功
  - `human-judgement` TR-10.2: 开发服务器可访问