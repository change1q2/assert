# 统计分析页面重构 - 真实数据版 - 实现计划

## [/] Task 1: 创建三种模式切换组件（收支分析/理财模块/债务模块）
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在页面顶部添加收支分析、理财模块、债务模块三个切换按钮
  - 默认选中收支分析模式
  - 样式与设计图片一致
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `human-judgement` TR-1.1: 三个切换按钮显示在页面顶部
  - `human-judgement` TR-1.2: 点击按钮切换到对应模式
- **Notes**: 参考设计图片的样式

## [ ] Task 2: 实现数据加载和处理逻辑
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 使用`fetchState()`获取真实数据
  - 实现加载状态显示
  - 处理收支记录、资产数据、债务数据的统计计算
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `human-judgement` TR-2.1: 页面显示加载状态
  - `human-judgement` TR-2.2: 加载完成后显示真实数据
- **Notes**: 参考Records.jsx、Finance.jsx、Debts.jsx的数据处理逻辑

## [ ] Task 3: 实现收支分析模式（日常/月统计/年统计/自定义）
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 根据时间范围筛选收支记录
  - 计算收支统计（总收入、总支出、结余）
  - 计算分类统计（按一级分类、二级分类）
  - 计算标签统计
  - 计算资产汇总
- **Acceptance Criteria Addressed**: [AC-3]
- **Test Requirements**:
  - `human-judgement` TR-3.1: 日常模式显示本周数据
  - `human-judgement` TR-3.2: 月统计模式显示本月数据
  - `human-judgement` TR-3.3: 年统计模式显示本年数据
  - `human-judgement` TR-3.4: 自定义模式显示指定日期范围数据
- **Notes**: 参考Records.jsx的时间筛选逻辑

## [ ] Task 4: 实现收支分析模式的图表和统计卡片
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 收支统计柱状图（按日/按月）
  - 资产汇总环形图
  - 支出占比环形图
  - 标签数据列表
  - 收支统计卡片
- **Acceptance Criteria Addressed**: [AC-3]
- **Test Requirements**:
  - `human-judgement` TR-4.1: 图表显示真实数据
  - `human-judgement` TR-4.2: 统计卡片显示真实数据
- **Notes**: 使用recharts图表库

## [ ] Task 5: 实现理财模块模式
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 资产分类统计（按资产类别）
  - 持仓盈亏统计
  - 账户汇总卡片
  - 资产走势图表
- **Acceptance Criteria Addressed**: [AC-4]
- **Test Requirements**:
  - `human-judgement` TR-5.1: 资产分类统计显示真实数据
  - `human-judgement` TR-5.2: 持仓盈亏统计显示真实数据
  - `human-judgement` TR-5.3: 账户汇总显示真实数据
- **Notes**: 参考Finance.jsx的数据处理逻辑

## [ ] Task 6: 实现债务模块模式
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 债权/债务统计
  - 还款计划
  - 逾期提醒
  - 债务分类统计
- **Acceptance Criteria Addressed**: [AC-5]
- **Test Requirements**:
  - `human-judgement` TR-6.1: 债权/债务统计显示真实数据
  - `human-judgement` TR-6.2: 还款计划显示真实数据
  - `human-judgement` TR-6.3: 逾期提醒显示真实数据
- **Notes**: 参考Debts.jsx的数据处理逻辑

## [ ] Task 7: 实现账本多选筛选和模块设置功能
- **Priority**: medium
- **Depends On**: Task 3
- **Description**: 
  - 账本下拉多选筛选（收支分析模式）
  - 模块设置（显示/隐藏卡片）
  - 设置保存到localStorage
- **Acceptance Criteria Addressed**: [AC-6, AC-7]
- **Test Requirements**:
  - `human-judgement` TR-7.1: 账本筛选功能正常
  - `human-judgement` TR-7.2: 模块设置功能正常
- **Notes**: 参考之前的实现

## [ ] Task 8: 验证构建和运行
- **Priority**: high
- **Depends On**: Task 4, Task 5, Task 6, Task 7
- **Description**: 运行npm run build验证项目构建成功，启动开发服务器验证页面效果
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7]
- **Test Requirements**:
  - `programmatic` TR-8.1: npm run build构建成功，exit code 0
  - `human-judgement` TR-8.2: 开发服务器启动成功，页面可正常访问
- **Notes**: 构建成功后启动开发服务器