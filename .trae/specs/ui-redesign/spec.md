# Wealth OS 前端视觉重设计 - Product Requirement Document

## Overview
- **Summary**: 使用 ui-ux-pro-max skill 生成的设计系统，对 Wealth OS 资产管理平台的整体前端视觉进行重新设计，提升专业感和数据可视化体验，不改变任何现有功能和业务逻辑。
- **Purpose**: 当前界面使用通用 indigo 配色和系统字体，缺乏金融产品应有的专业感和数据密度。通过引入设计系统提升视觉品质。
- **Target Users**: 个人投资者、资产管理用户

## Goals
- 建立统一的金融仪表板设计语言（色彩、字体、间距、阴影）
- 提升侧边栏、顶栏、卡片、表格、弹窗等核心组件的视觉品质
- 保持暗色模式一致性
- 保持所有现有功能逻辑不变

## Non-Goals (Out of Scope)
- 不修改任何业务逻辑、数据处理、API 调用
- 不新增功能或删除现有功能
- 不修改路由结构或页面组件层级
- 不引入新的第三方库（除字体外的 CSS 资源）

## Background & Context
- 项目使用 React + Tailwind CSS + Lucide React 图标
- 已有 17 个页面，支持暗色模式（dark: 前缀）
- ui-ux-pro-max skill 推荐设计系统：
  - 色彩：单色系 + 蓝色强调色（#18181B primary, #2563EB accent, #FAFAFA bg）
  - 字体：Fira Code（标题/数据）+ Fira Sans（正文）
  - 密度：高密度仪表板风格（8-32px 间距）
  - 效果：大胆悬停效果，200-300ms 过渡，scroll-snap

## Functional Requirements
- **FR-1**: 更新全局 CSS（index.css），引入 Fira Code + Fira Sans 字体，定义设计令牌（CSS 变量）
- **FR-2**: 重新设计 App.jsx 侧边栏 — 更精致的导航项、品牌区域、活跃状态指示
- **FR-3**: 重新设计 App.jsx 用户头像按钮和顶部区域
- **FR-4**: 更新全局组件样式（btn-primary, btn-secondary, modal, card 等）
- **FR-5**: 对关键页面（Overview, Finance, Records, Analysis）应用新设计语言
- **FR-6**: 保持暗色模式视觉一致性

## Non-Functional Requirements
- **NFR-1**: 所有过渡动画 200-300ms，使用 ease-out 缓动
- **NFR-2**: 文本对比度 ≥ 4.5:1（WCAG AA）
- **NFR-3**: 保持响应式布局（375px, 768px, 1024px, 1440px）
- **NFR-4**: 构建无错误，不影响现有功能

## Constraints
- **Technical**: React + Tailwind CSS + Vite，不引入新依赖
- **Dependencies**: Google Fonts（Fira Code + Fira Sans）

## Assumptions
- 用户已有网络访问 Google Fonts 的能力（如无法访问则回退到系统字体）
- 现有 Tailwind 配置不需要修改（通过 CSS 变量 + 自定义类实现）

## Acceptance Criteria

### AC-1: 全局设计令牌
- **Given**: 项目 index.css 文件
- **When**: 加载应用
- **Then**: 页面使用 Fira Code + Fira Sans 字体，CSS 变量定义设计令牌
- **Verification**: `programmatic`

### AC-2: 侧边栏视觉升级
- **Given**: 应用主界面
- **When**: 查看侧边栏
- **Then**: 品牌区域、导航项、活跃状态、悬停效果使用新设计语言
- **Verification**: `human-judgment`

### AC-3: 全局组件样式
- **Given**: 任意页面中的按钮、弹窗、卡片
- **When**: 渲染组件
- **Then**: 使用新设计系统的颜色、圆角、阴影、过渡效果
- **Verification**: `human-judgment`

### AC-4: 关键页面视觉
- **Given**: Overview, Finance, Records, Analysis 页面
- **When**: 查看页面
- **Then**: 卡片、表格、图表区域使用新设计语言，保持功能不变
- **Verification**: `human-judgment`

### AC-5: 暗色模式一致性
- **Given**: 切换到暗色模式
- **When**: 查看任意页面
- **Then**: 所有元素视觉一致，对比度达标
- **Verification**: `human-judgment`

### AC-6: 构建验证
- **Given**: 修改完成
- **When**: 运行 npm run build
- **Then**: 构建成功无错误
- **Verification**: `programmatic`

## Open Questions
- 无
