# 收支分析饼图优化 - 实施计划

## [x] Task 1: 扩展颜色方案
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 扩展收入大类颜色数组至 20+ 种
  - 扩展支出大类颜色数组至 20+ 种
  - 修改 computePieChartData 函数，为每个二级分类分配独特颜色，不再使用透明度变体
  - 移除 hexToRgba 透明度逻辑，改为直接使用不同颜色
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgement` TR-1.1: 每个扇区颜色不同，视觉区分明显
  - `programmatic` TR-1.2: 颜色数量 >= 20 种

## [x] Task 2: 标签文字自适应大小
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 根据数据项数量动态计算标签文字大小
  - 数据项 <= 5: 12px（默认）
  - 数据项 6-10: 11px
  - 数据项 11-15: 10px
  - 数据项 >15: 9px
  - 使用 label 组件的 style 属性设置字体大小
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-2.1: 数据多时标签文字缩小，不溢出
  - `human-judgement` TR-2.2: 文字最小不小于 9px，可读

## [x] Task 3: 优化标签布局避免重叠
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 调整饼图 innerRadius 和 outerRadius，增加标签空间
  - 优化 labelLine 长度，避免标签重叠
  - 考虑增加饼图容器高度（从 300px 调整为 350px）
  - 确保小占比项的标签也能显示
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement` TR-3.1: 所有标签完整显示，无重叠
  - `human-judgement` TR-3.2: 小占比项标签可见

## [x] Task 4: 构建验证与浏览器测试
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3
- **Description**: 
  - 运行 npm run build 确保无构建错误
  - 在浏览器中验证所有优化效果
  - 检查颜色、标签大小、布局
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-4.1: npm run build 退出码为 0
  - `human-judgement` TR-4.2: 浏览器中所有优化效果正常
