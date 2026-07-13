# Wealth OS 前端视觉重设计 - 实施计划

## [x] Task 1: 更新全局 CSS 设计令牌和字体
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 更新 index.css，引入 Fira Code + Fira Sans Google Fonts
  - 定义 CSS 设计令牌（颜色、间距、阴影、圆角、过渡时间）
  - 更新全局组件类（btn-primary, btn-secondary, modal, shadow-soft 等）
  - 颜色方案：Primary #18181B, Accent #2563EB, Background #FAFAFA, Border #E4E4E7
  - 暗色模式：Background #0F172A, Border #334155, Foreground #F8FAFC
- **Acceptance Criteria Addressed**: AC-1, AC-3
- **Test Requirements**:
  - `programmatic` TR-1.1: index.css 包含 @import Fira Code + Fira Sans 字体
  - `programmatic` TR-1.2: index.css 定义 :root CSS 变量 (--color-primary, --color-accent 等)
  - `programmatic` TR-1.3: npm run build 成功无错误
  - `human-judgement` TR-1.4: 暗色模式变量也正确定义

## [x] Task 2: 重新设计 App.jsx 布局（侧边栏 + 顶栏）
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 侧边栏品牌区域：使用新配色方案，更精致的 logo 区域
  - 导航项：活跃状态使用蓝色左边界 + 浅色背景，悬停效果 200ms 过渡
  - 侧边栏背景：从纯白改为带微妙渐变或更精致的背景
  - 用户头像按钮：使用新配色（蓝色 #2563EB），添加悬停效果
  - 退出登录按钮样式优化
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: App.jsx 中侧边栏使用新 Tailwind 类名
  - `human-judgement` TR-2.2: 活跃导航项有蓝色左边界指示
  - `human-judgement` TR-2.3: 悬停效果平滑（200-300ms）
  - `human-judgement` TR-2.4: 暗色模式下侧边栏视觉一致

## [x] Task 3: 重新设计 Login 页面
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - 登录卡片使用新设计系统（圆角、阴影、配色）
  - 输入框和按钮使用新样式
  - 背景使用更专业的金融风格
- **Acceptance Criteria Addressed**: AC-3, AC-4
- **Test Requirements**:
  - `human-judgement` TR-3.1: 登录页面视觉专业感提升
  - `human-judgement` TR-3.2: 表单元素使用新设计令牌

## [x] Task 4: 重新设计 Overview 页面
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 统计卡片：使用新阴影、圆角、配色
  - 图表区域：标题使用 Fira Code 字体
  - 数据展示：数字使用 Fira Code 强调精确感
  - 保持所有数据逻辑和功能不变
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgement` TR-4.1: 卡片视觉更精致（新阴影和圆角）
  - `human-judgement` TR-4.2: 数据数字使用 Fira Code 字体
  - `programmatic` TR-4.3: npm run build 成功

## [x] Task 5: 重新设计 Finance 页面
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 表格样式：更精致的表头、行间距、悬停效果
  - 弹窗样式：使用新设计系统的圆角和阴影
  - 表单元素：输入框、选择框使用新样式
  - 保持所有交易记录、资产管理功能不变
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgement` TR-5.1: 表格视觉更专业
  - `human-judgement` TR-5.2: 弹窗使用新设计系统
  - `programmatic` TR-5.3: npm run build 成功

## [x] Task 6: 重新设计 Records 和 Analysis 页面
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - 图表卡片样式升级
  - 数据列表样式优化
  - 筛选器、标签使用新设计
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgement` TR-6.1: 页面视觉与新设计系统一致
  - `programmatic` TR-6.2: npm run build 成功

## [x] Task 7: 构建验证和最终检查
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3, Task 4, Task 5, Task 6
- **Description**:
  - 运行 npm run build 确保无错误
  - 检查所有页面的暗色模式一致性
  - 确认所有功能逻辑未被修改
- **Acceptance Criteria Addressed**: AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-7.1: npm run build 成功，无新错误
  - `human-judgement` TR-7.2: 暗色模式所有页面视觉一致

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 1
- Task 5 depends on Task 1
- Task 6 depends on Task 1
- Task 7 depends on Task 1, 2, 3, 4, 5, 6
