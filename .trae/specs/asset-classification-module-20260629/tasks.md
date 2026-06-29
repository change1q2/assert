# 资产分类模块增强 - 实施计划

## [x] Task 1: 默认四大类初始化逻辑
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 AssetClasses.jsx 中增加默认四大类初始化逻辑：权益类、商品类、债权类、现金类
  - 当 assetClasses 为空数组时，自动创建4个默认分类对象
  - 每个默认分类包含：id（自动生成）、name、color（预设颜色）、visible: true、children 空数组、数值字段默认0
  - 预设颜色：权益类 #6366F1（靛蓝）、商品类 #F59E0B（琥珀）、债权类 #10B981（翠绿）、现金类 #06B6D4（青色）
  - 初始化后自动调用 saveState 保存到数据库
- **Files**: assert_WEB/src/pages/AssetClasses.jsx
- **Verification**: 清空 assetClasses 后刷新页面，自动出现4个默认分类

## [x] Task 2: 资产分类统计指标计算
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 重构 computeClassStats 函数，基于 assetClasses 完整字段计算指标
  - 计算每个分类的：当前价值(value)、期初价值(openingValue)、目标价值(targetValue)
  - 计算盈亏额 = value - openingValue，盈亏率 = openingValue > 0 ? (盈亏额 / openingValue) * 100 : 0
  - 计算占总资产占比 = totalValue > 0 ? (value / totalValue) * 100 : 0
  - 计算距离目标进度 = targetValue > 0 ? (value / targetValue) * 100 : 0
  - 保留从 financeAccounts 自动汇总的能力（作为后备/对比数据）
- **Files**: assert_WEB/src/pages/AssetClasses.jsx
- **Verification**: 分类列表正确显示各分类的当前价值、盈亏额、占比等数据

## [x] Task 3: 图表可视化区域
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - 在页面顶部新增图表区域，使用 recharts 库（项目中已有）
  - 图表1：资产分类占比环形图（PieChart，内半径40%外半径70%，中心显示总价值）
  - 图表2：资产增长趋势折线图（LineChart，展示各分类的期初价值到当前价值的增长线）
  - 图表3：分类对比柱状图（BarChart，各分类的期初价值和当前价值并排柱子）
  - 图表响应式布局：大屏3列并排，中屏2列，小屏1列
  - 图表颜色使用分类各自的 color 字段
  - 无数据时显示友好空状态
- **Files**: assert_WEB/src/pages/AssetClasses.jsx
- **Verification**: 页面顶部正确显示3个图表，数据与分类列表一致

## [x] Task 4: 分类卡片网格列表
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - 将原有的表格列表改为卡片网格布局
  - 每个卡片包含：分类名称（带颜色圆点）、当前价值（大字）、盈亏额+盈亏率、占总资产占比进度条、目标价值+进度、年度收益/支出、期望收益率
  - 卡片右上角显示管理按钮组：前移、后移、编辑、隐藏/显示、删除
  - 隐藏的分类以半透明/置灰样式展示，可操作「显示」按钮恢复
  - 网格布局：大屏4列、中屏3列、小屏2列、移动端1列
  - 卡片 hover 效果：轻微上浮+阴影加深
- **Files**: assert_WEB/src/pages/AssetClasses.jsx
- **Verification**: 分类以卡片网格形式展示，各指标正确，管理按钮可用

## [x] Task 5: 筛选区域与联动
- **Priority**: medium
- **Depends On**: Task 4
- **Description**:
  - 在页面顶部新增筛选区域（紫色渐变 section 下方）
  - 筛选条件：分类名称搜索框（模糊匹配）、显示隐藏分类开关（默认不显示）
  - 筛选后，图表数据、统计卡片、分类卡片列表全部实时重新计算和渲染
  - 增加「重置筛选」按钮
  - 筛选状态用 React state 管理
- **Files**: assert_WEB/src/pages/AssetClasses.jsx
- **Verification**: 输入筛选条件后，图表和列表只展示符合条件的分类

## [x] Task 6: 新增/编辑弹窗增强
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 重构新增/编辑弹窗表单，字段包括：
    - 分类名称（文本输入）
    - 二级分类列表（动态添加/删除输入框组）
    - 当前价值（数字输入）
    - 期初价值（数字输入）
    - 目标价值（数字输入）
    - 期望收益率（数字输入，%）
    - 年度收益（数字输入）
    - 年度支出（数字输入）
    - 颜色选择器（预设色板 + 自定义颜色输入）
    - 可见性开关
  - 弹窗打开时，如果是新增模式，自动从 `stateData.financeAssets` 中按分类名称匹配数据
  - 自动填充逻辑：遍历 financeAssets，按 category/subcategory 匹配分类名称，累加 currentPrice*shares 作为当前价值，累加 costPrice*shares 作为期初价值
  - 表单验证：分类名称必填
- **Files**: assert_WEB/src/pages/AssetClasses.jsx
- **Verification**: 打开新增弹窗，自动填充理财模块数据；保存后字段完整持久化

## [x] Task 7: 分类排序与可见性操作
- **Priority**: medium
- **Depends On**: Task 4, Task 6
- **Description**:
  - 实现前移/后移功能：点击前移/后移按钮，调整分类在数组中的顺序，重新渲染
  - 实现隐藏/显示功能：切换分类的 visible 字段，保存 state
  - 实现删除功能：确认后从数组移除，保存 state
  - 所有排序/可见性变更后调用 saveState 持久化
  - 隐藏的分类在默认筛选下不显示，但可通过筛选开关查看
- **Files**: assert_WEB/src/pages/AssetClasses.jsx
- **Verification**: 前移/后移/隐藏/显示/删除操作正常，刷新后状态保持

## [x] Task 8: 统计卡片区
- **Priority**: medium
- **Depends On**: Task 2
- **Description**:
  - 在图表区域下方新增统计卡片区
  - 卡片内容：总资产市值、总资产成本、总盈亏、年度总收益、年度总支出、平均期望收益率
  - 每个卡片带图标和颜色标识
  - 数据基于当前筛选后的分类集合计算
- **Files**: assert_WEB/src/pages/AssetClasses.jsx
- **Verification**: 统计卡片显示正确，筛选后数据实时更新

## [x] Task 9: 整体联调与边界处理
- **Priority**: medium
- **Depends On**: Task 1-8
- **Description**:
  - 确保所有模块联动正常（筛选 + 图表 + 卡片列表 + 统计卡片）
  - 处理无数据/空状态：各模块有友好的空提示
  - 深色/浅色主题兼容性检查
  - 移动端响应式检查（卡片网格自适应、图表不溢出）
  - 性能检查：大量分类（>20个）时渲染不卡顿
- **Files**: assert_WEB/src/pages/AssetClasses.jsx
- **Verification**: 各功能组合使用正常，深色模式显示正常，移动端布局正常

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 2
- Task 5 depends on Task 4
- Task 6 has no dependencies (独立弹窗重构)
- Task 7 depends on Task 4, Task 6
- Task 8 depends on Task 2
- Task 9 depends on Task 1-8
