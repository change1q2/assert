# 资产分类卡片展开二级分类 - 实施计划

## [x] Task 1: 卡片展开/收起状态管理
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 AssetClasses.jsx 中新增 `expandedClassIds` state 用于记录当前展开的分类 ID
  - 新增 `toggleExpand(clsId)` 函数，切换展开状态
  - 支持同时展开多个分类（用 Set 或数组存储展开的 ID）
- **Files**: assert_WEB/src/pages/AssetClasses.jsx
- **Verification**: 点击展开按钮，卡片下方出现展开区域

## [x] Task 2: 分类卡片展开区域 UI
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 在每个分类卡片内部，底部新增展开区域（当该分类在展开状态时显示）
  - 展开区域包含：二级分类列表 + 添加按钮
  - 展开区域有明显的视觉区分（如浅色背景、左侧边框）
  - 展开区域内的内容需要滚动条（如果二级分类过多）
- **Files**: assert_WEB/src/pages/AssetClasses.jsx
- **Verification**: 展开区域正确显示，内容布局美观

## [x] Task 3: 二级分类列表展示
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - 遍历 `cls.children` 数组，渲染每个二级分类
  - 每个二级分类显示：名称、当前价值、期初价值、盈亏额、盈亏率
  - 二级分类的 value/openingValue 如果为空，默认使用 0
  - 每个二级分类右侧显示编辑和删除按钮
- **Files**: assert_WEB/src/pages/AssetClasses.jsx
- **Verification**: 二级分类列表正确显示各项数据

## [x] Task 4: 添加二级分类功能
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - 在展开区域内显示「添加二级分类」按钮
  - 点击后显示输入框，输入二级分类名称
  - 保存后将新二级分类添加到 `children` 数组
  - 新增后调用 `saveState` 持久化
- **Files**: assert_WEB/src/pages/AssetClasses.jsx
- **Verification**: 可以成功添加二级分类，刷新后数据保持

## [x] Task 5: 编辑和删除二级分类功能
- **Priority**: medium
- **Depends On**: Task 3
- **Description**:
  - 点击二级分类的编辑按钮，进入编辑模式（输入框变为可编辑）
  - 保存后更新二级分类名称
  - 点击删除按钮，弹出确认框，确认后移除该二级分类
  - 所有操作后调用 `saveState` 持久化
- **Files**: assert_WEB/src/pages/AssetClasses.jsx
- **Verification**: 编辑和删除功能正常，刷新后数据保持

## [x] Task 6: 主分类价值自动汇总
- **Priority**: medium
- **Depends On**: Task 3
- **Description**:
  - 当主分类有二级分类时，主分类的显示价值优先使用其自身的 value（如果有）
  - 如果主分类 value 为 0 但有二级分类，则自动汇总所有二级分类的 value 作为主分类的显示值
  - 汇总计算在 `computeStatsForClasses` 或单独的计算函数中处理
- **Files**: assert_WEB/src/pages/AssetClasses.jsx
- **Verification**: 有二级分类时，主分类卡片显示正确的汇总价值

## [x] Task 7: 展开/收起按钮样式
- **Priority**: low
- **Depends On**: Task 1
- **Description**:
  - 在卡片右上角按钮组中添加展开/收起按钮（ChevronDown/ChevronUp 图标）
  - 展开状态显示向上箭头，收起状态显示向下箭头
  - 按钮 hover 效果
- **Files**: assert_WEB/src/pages/AssetClasses.jsx
- **Verification**: 按钮样式美观，状态切换正确

## [x] Task 8: 整体联调与边界处理
- **Priority**: medium
- **Depends On**: Task 1-7
- **Description**:
  - 确保展开/收起不影响其他功能（筛选、排序、编辑主分类等）
  - 大量二级分类时的滚动和性能
  - 空二级分类列表时显示友好提示
  - 深色/浅色主题兼容性
- **Files**: assert_WEB/src/pages/AssetClasses.jsx
- **Verification**: 各功能组合使用正常

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 2
- Task 5 depends on Task 3
- Task 6 depends on Task 3
- Task 7 depends on Task 1
- Task 8 depends on Task 1-7
