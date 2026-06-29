# 收支分析页面全面重构 - 实现计划

## [x] Task 1: 删除右侧日期筛选按钮
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 删除日期筛选区域右侧的年份和月份选择按钮（2026年、本月、上月、1月-4月等）
  - 保留左侧的日常/月统计/年统计/自定义标签
- **Acceptance Criteria Addressed**: [AC-5]
- **Test Requirements**:
  - `human-judgment` TR-1.1: 页面顶部日期筛选区域只有四个标签（日常/月统计/年统计/自定义）

## [x] Task 2: 调整页面布局
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 将收支分析卡片移至页面最顶部
  - 将刷新按钮移至收支分析卡片最右侧
  - 将新增按钮移至收支记录列表右上角（重置筛选按钮左边）
- **Acceptance Criteria Addressed**: [AC-6]
- **Test Requirements**:
  - `human-judgment` TR-2.1: 收支分析卡片在页面最上方
  - `human-judgment` TR-2.2: 刷新按钮在收支分析卡片最右侧
  - `human-judgment` TR-2.3: 新增按钮在收支记录列表右上角

## [x] Task 3: 合并账户与账本概念
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 删除账户相关状态和逻辑
  - 删除列表中的账户列
  - 将新增弹窗中的账户字段改为账本字段
  - 更新数据保存和加载逻辑，使用 bookId 代替 accountId
- **Acceptance Criteria Addressed**: [AC-7]
- **Test Requirements**:
  - `human-judgment` TR-3.1: 新增弹窗中无账户字段，只有账本字段
  - `human-judgment` TR-3.2: 列表中无账户列

## [x] Task 4: 日常模式日历表增强
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 增强日历组件，清楚标记每日收支
  - 添加卡片大小调整功能
  - 优化日历样式，使其更清晰易读
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `human-judgment` TR-4.1: 日历上清楚标记每日收支金额
  - `human-judgment` TR-4.2: 日历卡片大小可调整

## [x] Task 5: 月统计模式图表
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 创建月统计图表组件，显示1-12月收支柱状图
  - 使用 recharts 库实现柱状图
  - 支持切换年份
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `human-judgment` TR-5.1: 月统计模式显示12个月的收支柱状图

## [x] Task 6: 年统计模式图表
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 创建年统计图表组件，显示年度收支趋势图
  - 使用 recharts 库实现折线图或柱状图
- **Acceptance Criteria Addressed**: [AC-3]
- **Test Requirements**:
  - `human-judgment` TR-6.1: 年统计模式显示年度收支趋势图

## [x] Task 7: 自定义日期区间选择
- **Priority**: high
- **Depends On**: Task 5, Task 6
- **Description**: 
  - 添加日期区间选择组件（起始日期和结束日期）
  - 根据区间长度自动切换显示粒度：
    - 1个月内：按日统计显示
    - 1个月以上12个月以内：按月统计显示
    - 1年以上：按年统计显示
- **Acceptance Criteria Addressed**: [AC-4]
- **Test Requirements**:
  - `human-judgment` TR-7.1: 自定义模式可选择日期区间
  - `human-judgment` TR-7.2: 根据区间长度自动切换显示粒度

## [x] Task 8: 前后端数据结构统一
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 统一前后端记录数据字段映射
  - 修改前端 handleAddRecord 函数，确保所有字段正确传递
  - 修改前端列表显示逻辑，确保正确解析后端数据
  - 验证数据保存和加载的完整性
- **Acceptance Criteria Addressed**: [AC-8]
- **Test Requirements**:
  - `programmatic` TR-8.1: 前端构建成功
  - `human-judgment` TR-8.2: 新增记录后刷新页面，数据正确显示

## [x] Task 9: 整体功能验证
- **Priority**: medium
- **Depends On**: All previous tasks
- **Description**: 
  - 端到端测试所有功能
  - 确保日常/月统计/年统计/自定义四种模式正常工作
  - 验证布局调整后功能正常
  - 验证账户与账本合并后数据正确
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8]
- **Test Requirements**:
  - `human-judgment` TR-9.1: 所有日期筛选模式正常工作
  - `human-judgment` TR-9.2: 页面布局符合设计要求
  - `human-judgment` TR-9.3: 数据保存和加载正确