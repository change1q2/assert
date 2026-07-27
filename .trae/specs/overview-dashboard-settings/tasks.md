# 资产总览看板设置 - 实现计划

## [x] Task 1: 定义卡片配置元数据
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 Overview.jsx 中定义 `OVERVIEW_CARDS` 常量，列出所有可配置卡片
  - 每项包含：`id`、`name`、`defaultVisible`、`defaultOrder`
  - 卡片列表：
    1. `progress-goal` - 进度目标
    2. `core-metrics` - 核心指标卡片组
    3. `profit-pnl` - 收益与盈亏
    4. `asset-allocation` - 资产配置
    5. `cashflow-pie` - 流入/流出构成
    6. `quick-actions` - 快捷入口
    7. `asset-ranking` - 资产排行
- **Acceptance Criteria Addressed**: AC-3（卡片列表展示）

## [x] Task 2: 实现设置加载与保存逻辑
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 在 Overview.jsx 顶部引入 `getCache` 和 `setCache` from `'../utils/cache'`
  - 定义 `LAYOUT_CACHE_KEY = 'asset_platform_overview_dashboard_layout'`
  - 实现 `loadLayout()` 函数：读取 localStorage，缺失卡片用默认配置补全
  - 实现 `saveLayout(layout)` 函数：保存到 localStorage
  - 使用 useState 维护 `layout` 状态
- **Acceptance Criteria Addressed**: AC-7（保存设置）、AC-8（加载设置）、AC-9（缺失卡片处理）

## [x] Task 3: 在 Hero Bar 右上角添加看板设置按钮
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 从 lucide-react 导入 `Settings` 图标
  - 在 Hero Bar 区域（约 628-657 行）的 flex 容器右侧新增按钮：
    ```jsx
    <button
      onClick={() => setShowSettings(true)}
      className="p-2 rounded-lg hover:bg-white/20 transition-colors"
      title="看板设置"
    >
      <Settings className="w-5 h-5 text-gray-700 dark:text-gray-300" />
    </button>
    ```
  - 添加 `showSettings` state
- **Acceptance Criteria Addressed**: AC-1（看板设置入口按钮）

## [x] Task 4: 实现设置弹窗 UI
- **Priority**: high
- **Depends On**: Task 2, Task 3
- **Description**:
  - 在页面 return 顶层新增一个 `{showSettings && <DashboardSettings ... />}` 弹窗
  - 弹窗结构：
    - 全屏遮罩（`fixed inset-0 bg-black/40 z-50`），点击关闭
    - 居中面板（`max-w-md mx-auto mt-20 bg-white dark:bg-slate-800 rounded-xl p-6`）
    - 标题栏：标题"看板设置" + 副标题 + 关闭按钮
    - 卡片列表：每项包含拖动手柄、名称、显示开关
    - 底部"恢复默认"按钮
  - 使用 Tailwind 实现开关组件（用 checkbox + 样式包装）
- **Acceptance Criteria Addressed**: AC-2（看板设置面板）

## [x] Task 5: 实现卡片显示切换
- **Priority**: high
- **Depends On**: Task 4
- **Description**:
  - 在弹窗中，每个卡片项的开关切换时：
    - 更新 layout state 中对应卡片的 `visible` 字段
    - 自动调用 saveLayout
  - 关闭开关的卡片项样式变为半透明
- **Acceptance Criteria Addressed**: AC-3（切换显示状态）

## [x] Task 6: 实现拖动排序
- **Priority**: high
- **Depends On**: Task 5
- **Description**:
  - 给每个卡片项添加 `draggable` 属性
  - 实现 `onDragStart`：记录被拖动项的 id
  - 实现 `onDragOver`：阻止默认行为，标记目标位置
  - 实现 `onDrop`：将源项插入到目标位置，更新 order
  - 实现 `onDragEnd`：清理状态
  - 拖动中视觉反馈：被拖动项 opacity-50，目标位置高亮
- **Acceptance Criteria Addressed**: AC-4（拖动排序）

## [x] Task 7: 实现恢复默认
- **Priority**: medium
- **Depends On**: Task 4
- **Description**:
  - 在弹窗底部添加"恢复默认"按钮
  - 点击时调用 `loadLayout(true)` 或重置 layout 为默认值
  - 立即更新弹窗内列表显示
- **Acceptance Criteria Addressed**: AC-6（恢复默认）

## [x] Task 8: 按设置渲染卡片
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - 将 Overview.jsx 中的主要 section（进度目标、核心指标、收益与盈亏、资产配置、流入流出饼图、快捷入口/资产排行）包裹到一个统一的渲染逻辑中
  - 根据 layout 中各卡片的 `visible` 和 `order` 字段决定渲染顺序和是否渲染
  - 注意：保持原有所有计算逻辑（financeTotalPnl 等）不变
  - 重新组织 JSX 渲染顺序，使用 `layout.cards.sort((a, b) => a.order - b.order)` 后遍历渲染
- **Acceptance Criteria Addressed**: AC-9（按设置渲染卡片）

## [x] Task 9: 构建验证
- **Priority**: high
- **Depends On**: Task 1-8
- **Description**:
  - 运行 `npm --prefix assert_WEB run build` 确保无编译错误
  - 验证 localStorage 读写正常
  - 验证拖动和切换显示状态功能正常
- **Acceptance Criteria Addressed**: 所有 AC

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 4] depends on [Task 2, Task 3]
- [Task 5] depends on [Task 4]
- [Task 6] depends on [Task 5]
- [Task 7] depends on [Task 4]
- [Task 8] depends on [Task 2]
- [Task 9] depends on [Task 1, Task 2, Task 3, Task 4, Task 5, Task 6, Task 7, Task 8]
