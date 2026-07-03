# 外部工具头像增强 - 产品需求文档

## Overview
- **Summary**: 增强外部工具的展示效果，包括微信小程序链接的特殊处理（复制链接+提示）和为各工具添加自定义头像图片
- **Purpose**: 提升用户体验，让工具卡片更直观、更具辨识度
- **Target Users**: 使用辅助工具模块的所有用户

## Goals
- [ ] 房产趋势追踪点击后复制URL到剪贴板并显示微信小程序提示
- [ ] 名人追踪模块使用对应名人头像图片
- [ ] AI追踪模块使用AI主题图片作为头像
- [ ] 其他工具使用对应产品概念图作为头像

## Non-Goals (Out of Scope)
- [ ] 不修改工具的功能逻辑和路由跳转
- [ ] 不添加新的工具或模块
- [ ] 不修改工具配置管理功能

## Background & Context
当前外部工具使用Lucide图标作为统一标识，用户反馈希望更直观地展示各工具特性。房产趋势追踪链接指向微信小程序，直接点击无法在浏览器中打开，需要特殊处理。

## Functional Requirements
- **FR-1**: 点击房产趋势追踪时，自动复制URL到剪贴板并显示提示消息
- **FR-2**: 名人追踪模块（白毛股神、巴菲特、芒格、木头姐）显示对应名人头像
- **FR-3**: AI追踪模块（产业链图谱、AI深度报告）显示AI主题图片
- **FR-4**: 其他工具（BTC指标、房产趋势）显示对应产品概念图

## Non-Functional Requirements
- **NFR-1**: 头像图片加载失败时应显示默认图标作为降级
- **NFR-2**: 图片应使用CDN加速，加载速度<500ms
- **NFR-3**: 支持深色/浅色主题切换

## Constraints
- **Technical**: 使用现有的图片生成API（trae-api-cn.mchost.guru）
- **Dependencies**: 需要网络访问外部图片服务

## Assumptions
- [ ] 用户设备支持Clipboard API
- [ ] 网络连接正常可访问图片服务

## Acceptance Criteria

### AC-1: 房产趋势追踪复制链接并提示
- **Given**: 用户在辅助工具页面
- **When**: 点击"房产趋势追踪"工具卡片
- **Then**: URL被复制到剪贴板，显示提示"已复制链接，请在微信中打开查看小程序"
- **Verification**: `human-judgment`

### AC-2: 名人追踪显示名人头像
- **Given**: 用户在辅助工具页面的名人追踪模块
- **When**: 查看白毛股神、巴菲特、芒格、木头姐工具卡片
- **Then**: 每个工具显示对应名人的头像图片
- **Verification**: `human-judgment`

### AC-3: AI追踪显示AI图片
- **Given**: 用户在辅助工具页面的AI追踪模块
- **When**: 查看产业链图谱、AI深度报告工具卡片
- **Then**: 每个工具显示AI主题的概念图片
- **Verification**: `human-judgment`

### AC-4: 其他工具显示产品概念图
- **Given**: 用户在辅助工具页面的其他工具模块
- **When**: 查看BTC指标工具卡片
- **Then**: 显示加密货币/BTC相关的概念图片
- **Verification**: `human-judgment`

### AC-5: 图片加载失败降级
- **Given**: 图片服务不可用或网络异常
- **When**: 工具卡片加载时
- **Then**: 显示默认Lucide图标作为降级
- **Verification**: `programmatic`

## Open Questions
- [ ] 暂无

## Quality Checklist
- [x] Every goal has at least one acceptance criterion
- [x] Every acceptance criterion has a verification type
- [x] Non-goals are explicitly stated
- [x] Constraints are realistic and complete
- [x] No requirement contradicts another
- [x] Ambiguous user language has been clarified or flagged
