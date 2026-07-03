# 外部工具头像增强 - 实施计划

## [x] Task 1: 修改房产趋势追踪点击行为，复制链接并显示提示
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 `openExternalTool` 函数，检测房产趋势追踪工具
  - 使用 Clipboard API 复制URL到剪贴板
  - 显示提示消息"已复制链接，请在微信中打开查看小程序"
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgment` TR-1.1: 点击房产趋势追踪后，URL被复制到剪贴板
  - `human-judgment` TR-1.2: 点击后显示微信小程序提示消息

## [x] Task 2: 为名人追踪模块添加名人头像图片
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 `defaultExternalTools` 数组，为白毛股神、巴菲特、芒格、木头姐添加 avatar 字段
  - 使用图片生成API生成对应名人头像
  - 修改工具卡片渲染逻辑，支持显示图片头像
- **Acceptance Criteria Addressed**: AC-2, AC-5
- **Test Requirements**:
  - `human-judgment` TR-2.1: 白毛股神追踪显示白毛股神头像
  - `human-judgment` TR-2.2: 巴菲特知识库显示巴菲特头像
  - `human-judgment` TR-2.3: 芒格思维模型显示芒格头像
  - `human-judgment` TR-2.4: 木头姐ARK追踪显示木头姐头像
  - `programmatic` TR-2.5: 图片加载失败时显示默认图标

## [x] Task 3: 为AI追踪模块添加AI主题图片
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 `defaultExternalTools` 数组，为产业链图谱、AI深度报告添加 avatar 字段
  - 使用图片生成API生成AI主题概念图
- **Acceptance Criteria Addressed**: AC-3, AC-5
- **Test Requirements**:
  - `human-judgment` TR-3.1: 产业链图谱显示AI产业链概念图
  - `human-judgment` TR-3.2: AI深度报告解析显示AI数据分析概念图
  - `programmatic` TR-3.3: 图片加载失败时显示默认图标

## [x] Task 4: 为其他工具添加产品概念图
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 修改 `defaultExternalTools` 数组，为BTC指标添加 avatar 字段
  - 使用图片生成API生成加密货币/BTC概念图
- **Acceptance Criteria Addressed**: AC-4, AC-5
- **Test Requirements**:
  - `human-judgment` TR-4.1: BTC指标显示加密货币/BTC概念图
  - `programmatic` TR-4.2: 图片加载失败时显示默认图标

## [x] Task 5: 构建验证
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3, Task 4
- **Description**: 
  - 执行 `npm run build` 验证代码编译通过
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-5.1: 前端构建成功，无错误
