# 收益率曲线可视化 - 实现计划

## [x] Task 1: 优化X轴时间刻度显示
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 实现 `getYieldCurveData` 辅助函数，统一生成曲线图数据与X轴标签
  - 当日模式：显示 9:30-15:00 六个时间点
  - 本月模式：每7天显示一个 MM-DD 刻度
  - 近三月模式：每月1日显示一个 MM-DD 刻度
  - 今年模式：从今年1月到当前月每月1日显示一个 MM-DD 刻度
  - 全部/自定义模式：每月1日显示一个刻度
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `human-judgment` TR-1.1: 切换不同时间区间，检查X轴刻度是否正确显示
  - `human-judgment` TR-1.2: 检查日期格式是否为 MM-DD

## [x] Task 2: 优化Y轴收益率刻度自适应
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 实现 `getYAxisStep` 函数，根据数据范围计算刻度间隔
  - 实现 `getYAxisTicks` 函数，生成Y轴刻度值数组
  - 支持负收益率显示
  - 确保0%轴始终可见（当数据跨越0时）
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgment` TR-2.1: 检查不同数据范围下Y轴刻度间隔是否正确
  - `human-judgment` TR-2.2: 检查负收益率是否正确显示

## [x] Task 3: 优化曲线样式与网格线
- **Priority**: medium
- **Depends On**: Task 1, Task 2
- **Description**: 
  - 优化网格线样式（浅灰色虚线）
  - 添加曲线下方渐变填充效果
  - 调整曲线颜色：用户收益红色，指数蓝色
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `human-judgment` TR-3.1: 检查网格线是否清晰可见
  - `human-judgment` TR-3.2: 检查曲线颜色是否正确

## [x] Task 4: 构建验证
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3
- **Description**: 
  - 运行 npm run build 验证构建是否成功
- **Acceptance Criteria Addressed**: All
- **Test Requirements**:
  - `programmatic` TR-4.1: npm run build 成功无报错