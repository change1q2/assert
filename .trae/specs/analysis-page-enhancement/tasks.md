# 统计分析页面增强 - 任务清单

## [ ] Task 1: 调整时间筛选位置到收支统计卡片上方
- **Priority**: high
- **Depends On**: None
- **Description**: 将日常/月统计/年统计三个时间筛选按钮从页面底部移至收支统计卡片上方，与账本选择同行显示
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgment` TR-1.1: 时间筛选按钮在收支统计卡片上方显示
  - `human-judgment` TR-1.2: 时间筛选与账本选择在同一行，响应式换行正常

## [ ] Task 2: 将账本选择改为下拉多选样式
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 将账本多选从侧边栏改为下拉多选组件，支持全选/取消全选，显示已选数量
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgment` TR-2.1: 下拉框显示已选账本数量
  - `human-judgment` TR-2.2: 支持多选账本，全选/取消全选功能正常

## [ ] Task 3: 实现按时间周期显示对应卡片功能
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 根据时间筛选（日常/月统计/年统计）显示对应的卡片功能，包括本周统计、资产汇总、预算占比、标签数据等
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgment` TR-3.1: 选择"日常"显示本周统计卡片
  - `human-judgment` TR-3.2: 选择"月统计"显示月度统计卡片
  - `human-judgment` TR-3.3: 选择"年统计"显示年度统计卡片

## [ ] Task 4: 新增预算和目标功能
- **Priority**: high
- **Depends On**: None
- **Description**: 在收支分析模块新增预算设置区域，支持按分类设置月度/年度预算目标，显示预算执行进度和剩余额度，支持预算预警
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgment` TR-4.1: 预算设置区域显示正常
  - `human-judgment` TR-4.2: 预算进度条正确显示执行进度
  - `human-judgment` TR-4.3: 超过预算时高亮提示

## [ ] Task 5: 新增模块设置功能
- **Priority**: medium
- **Depends On**: None
- **Description**: 新增模块设置按钮，设置面板支持勾选/取消勾选显示的卡片，调整卡片显示顺序，设置结果保存到localStorage
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgment` TR-5.1: 模块设置按钮显示正常，点击打开设置面板
  - `human-judgment` TR-5.2: 设置面板支持勾选/取消勾选卡片
  - `human-judgment` TR-5.3: 设置保存到localStorage，刷新页面保持配置

## [ ] Task 6: 验证构建和运行
- **Priority**: high
- **Depends On**: All previous tasks
- **Description**: 运行构建命令验证代码正确性，启动开发服务器验证页面功能
- **Test Requirements**:
  - `programmatic` TR-6.1: npm run build 成功执行
  - `human-judgment` TR-6.2: 页面正常加载，所有功能正常显示