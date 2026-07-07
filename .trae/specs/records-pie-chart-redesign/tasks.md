# 收支分析饼图 redesign - 实施计划

## [x] Task 1: 数据聚合函数实现
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 实现收入大类聚合函数：将 records 按收入一级分类（categories.income 的 key）聚合
  - 实现支出大类聚合函数：将 records 按支出一级分类（categories.expense 的 key）聚合
  - 实现二级分类明细聚合函数：按 category + subCategory 两级聚合
  - 每个聚合结果包含：name、value、percent、color
- **Acceptance Criteria Addressed**: AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-1.1: 收入大类聚合结果数量 = categories.income 中有数据的大类数量
  - `programmatic` TR-1.2: 支出大类聚合结果数量 = categories.expense 中有数据的大类数量
  - `programmatic` TR-1.3: 二级分类聚合结果，各大类下明细值之和 = 大类值
  - `programmatic` TR-1.4: 所有聚合结果的 percent 之和 ≈ 100%（误差 < 0.1%）
- **Notes**: 颜色按大类分配，同一大类的二级分类使用同色系不同深浅

## [x] Task 2: 切换按钮组件与状态管理
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 新增 incomePieView 和 expensePieView 两个 state（值为 'category' | 'detail'）
  - 实现切换按钮组组件（胶囊形样式）
  - 收入占比和支出占比各有独立的切换状态
  - 默认显示一级分类视图
- **Acceptance Criteria Addressed**: AC-3, AC-7
- **Test Requirements**:
  - `programmatic` TR-2.1: 两个饼图的切换状态互不影响
  - `programmatic` TR-2.2: 点击按钮正确切换 state 值
  - `human-judgement` TR-2.3: 按钮样式符合设计（圆角胶囊、选中高亮）
- **Notes**: 按钮放置在卡片标题右侧

## [x] Task 3: Recharts 空心环形饼图实现
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**: 
  - 将原生 SVG 饼图替换为 Recharts PieChart 组件
  - 设置 innerRadius 和 outerRadius 实现空心环形效果
  - 配置 label 和 labelLine 实现扇区外侧标签
  - 标签格式：名称 + 百分比（1位小数）
  - 空数据时显示占位提示
  - 颜色映射与现有配色一致
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-6, AC-8
- **Test Requirements**:
  - `human-judgement` TR-3.1: 饼图为空心环形样式
  - `human-judgement` TR-3.2: 扇区外侧有标签和引导线
  - `human-judgement` TR-3.3: 切换视图时饼图平滑更新
  - `human-judgement` TR-3.4: 空数据时显示「暂无数据」
  - `programmatic` TR-3.5: 收入和支出饼图各使用独立的数据源
- **Notes**: 导入 PieChart, Pie, Cell, Tooltip, ResponsiveContainer

## [x] Task 4: 构建验证与浏览器测试
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 运行 npm run build 确保无构建错误
  - 在浏览器中验证所有功能
  - 检查一级分类和全部视图的数据正确性
  - 检查标签显示和饼图样式
- **Acceptance Criteria Addressed**: AC-1 ~ AC-8
- **Test Requirements**:
  - `programmatic` TR-4.1: npm run build 退出码为 0
  - `human-judgement` TR-4.2: 浏览器中所有功能正常显示
  - `human-judgement` TR-4.3: 深色模式下样式正常
