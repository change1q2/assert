# 资产总览看板设置 Spec

## Why
当前资产总览页面的所有 section 布局是硬编码的，用户无法根据自身需求调整卡片的显示/隐藏和排列顺序。需要为总览页面增加看板自定义能力，让用户能够灵活控制哪些卡片可见、按自己想要的顺序排列。

## What Changes
- 在总览页右上角新增"看板设置"按钮（齿轮图标）
- 点击后弹出设置面板（弹窗/抽屉），列出所有可配置卡片
- 用户可以勾选/取消勾选卡片的显示状态
- 用户可以拖动卡片调整顺序
- 设置持久化到 localStorage（使用已有的 `cache.js` 工具）
- 页面渲染时根据用户的设置过滤和排序卡片

## Impact
- Affected code:
  - `assert_WEB/src/pages/Overview.jsx` - 新增设置按钮、设置弹窗、按配置渲染卡片
  - `assert_WEB/src/utils/cache.js` - 无需改动，复用已有 `getCache/setCache` 函数

## ADDED Requirements

### Requirement: 看板设置入口按钮
系统 SHALL 在总览页 Hero Bar 区域右上角新增一个"看板设置"按钮。

#### Scenario: 显示设置入口
- **WHEN** 用户进入资产总览页面
- **THEN** 在 Hero Bar 标题"资产总览"所在行的右侧显示一个齿轮图标按钮（`Settings` 图标，来自 lucide-react）
- **AND** 按钮悬浮时显示"看板设置"tooltip
- **AND** 点击按钮打开看板设置面板

### Requirement: 看板设置面板
系统 SHALL 提供一个弹窗或抽屉式面板，展示所有可配置卡片。

#### Scenario: 打开设置面板
- **WHEN** 用户点击"看板设置"按钮
- **THEN** 打开一个全屏覆盖的弹窗（`fixed inset-0 z-50` 风格）
- **AND** 弹窗中央显示一个面板，包含：
  - 标题："看板设置"
  - 副标题："拖动调整顺序，勾选切换显示"
  - 关闭按钮（右上角 X）
  - 卡片列表：每个卡片项显示图标、名称、显示开关、拖动手柄
  - 底部"恢复默认"按钮
- **AND** 点击遮罩或关闭按钮关闭弹窗

#### Scenario: 卡片列表展示
- **WHEN** 设置面板打开时
- **THEN** 列出所有可配置卡片，按当前显示顺序展示：
  1. 进度目标
  2. 核心指标卡片组（总收入/总支出/理财总资产/独立总资产/总负债）
  3. 收益与盈亏
  4. 资产配置（理财资产配置/独立资产配置/综合资产配置）
  5. 流入/流出构成
  6. 快捷入口/资产排行等其它 section
- **AND** 每个卡片项包含：
  - 拖动手柄（`GripVertical` 图标，可拖动）
  - 卡片名称
  - 显示开关（开关组件，启用时为蓝色）
- **AND** 未启用的卡片项显示为灰色/半透明

### Requirement: 切换卡片显示状态
系统 SHALL 允许用户在设置面板中切换每个卡片的显示状态。

#### Scenario: 切换显示
- **WHEN** 用户点击某个卡片的显示开关
- **THEN** 切换该卡片的显示/隐藏状态
- **AND** 关闭开关的卡片在总览页面不渲染
- **AND** 设置自动保存到 localStorage

### Requirement: 拖动调整卡片顺序
系统 SHALL 允许用户通过拖动调整卡片的显示顺序。

#### Scenario: 拖动排序
- **WHEN** 用户按住某个卡片的拖动手柄并上下拖动
- **THEN** 实时显示拖动效果（被拖动项半透明，目标位置高亮）
- **AND** 释放后更新卡片顺序
- **AND** 顺序自动保存到 localStorage

#### Scenario: 默认使用 HTML5 Drag and Drop API
- **WHEN** 实现拖动时
- **THEN** 使用原生 HTML5 `draggable`、`onDragStart`、`onDragOver`、`onDrop` 事件
- **AND** 不引入第三方拖拽库

### Requirement: 恢复默认设置
系统 SHALL 允许用户一键恢复默认设置。

#### Scenario: 恢复默认
- **WHEN** 用户点击"恢复默认"按钮
- **THEN** 所有卡片恢复为启用状态
- **AND** 卡片顺序恢复为初始默认顺序
- **AND** 清空 localStorage 中的设置
- **AND** 设置面板关闭或刷新卡片列表显示

### Requirement: 持久化设置
系统 SHALL 将看板设置持久化到 localStorage。

#### Scenario: 保存设置
- **WHEN** 用户修改了任何卡片显示状态或顺序
- **THEN** 将完整设置对象保存到 localStorage
- **AND** key 为 `asset_platform_overview_dashboard_layout`
- **AND** 数据结构：
  ```json
  {
    "cards": [
      { "id": "progress-goal", "visible": true, "order": 0 },
      { "id": "core-metrics", "visible": true, "order": 1 },
      { "id": "profit-pnl", "visible": true, "order": 2 },
      { "id": "asset-allocation", "visible": true, "order": 3 },
      { "id": "cashflow-pie", "visible": true, "order": 4 },
      { "id": "quick-actions", "visible": true, "order": 5 }
    ]
  }
  ```

#### Scenario: 加载设置
- **WHEN** 用户打开总览页面
- **THEN** 读取 localStorage 中的设置
- **AND** 如果存在则应用用户的设置
- **AND** 如果不存在则使用默认配置（所有卡片可见、默认顺序）

### Requirement: 按设置渲染卡片
系统 SHALL 根据用户的设置渲染总览页面的卡片。

#### Scenario: 应用显示/隐藏
- **WHEN** 渲染总览页面时
- **THEN** 遍历用户设置中的卡片列表
- **AND** 只渲染 `visible: true` 的卡片
- **AND** 按 `order` 字段排序后渲染

#### Scenario: 缺失卡片处理
- **WHEN** localStorage 中的设置缺少某些新卡片
- **THEN** 自动为缺失卡片添加默认配置（可见、追加到末尾）
- **AND** 不影响已有用户设置

## MODIFIED Requirements
无

## REMOVED Requirements
无
