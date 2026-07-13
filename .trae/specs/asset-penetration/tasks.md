# 资产穿透页面 - 实现计划

## [x] Task 1: 在理财模块顶部添加"场内穿透"切换按钮
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在理财模块顶部资产卡片的总资产数字右侧添加"场内穿透"按钮
  - 点击按钮调用 onAssetPenetration 回调跳转到资产穿透页面
  - 按钮样式与现有刷新按钮保持一致
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `human-judgement` TR-1.1: 理财模块顶部总资产右侧显示"场内穿透"按钮
  - `human-judgement` TR-1.2: 点击按钮后跳转到资产穿透页面
  - `human-judgement` TR-1.3: 按钮样式与现有设计风格一致

## [x] Task 2: 创建资产穿透页面组件和路由
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 创建 AssetPenetration.jsx 页面组件
  - 在 App.jsx 中添加路由配置和状态管理
  - 添加返回按钮回到理财模块
- **Acceptance Criteria Addressed**: AC-2, AC-3
- **Test Requirements**:
  - `human-judgement` TR-2.1: 资产穿透页面可以正常访问
  - `human-judgement` TR-2.2: 页面左上角有返回按钮可以回到理财模块

## [x] Task 3: 实现资产总览板块
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 页面顶部显示总资产、总盈亏、当日盈亏等核心指标
  - 使用渐变色背景，参考券商APP风格设计大数字展示
  - 红涨绿跌配色方案
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgement` TR-3.1: 资产总览板块显示总资产、总盈亏、当日盈亏
  - `human-judgement` TR-3.2: 使用渐变背景和大数字展示风格
  - `programmatic` TR-3.3: 数据计算逻辑正确

## [x] Task 4: 实现持仓分布板块
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 按一级分类展示资产分布占比（左卡片）
  - 按二级分类展示资产分布（右卡片）
  - 使用进度条展示占比
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgement` TR-4.1: 持仓分布板块显示各分类的资产占比
  - `human-judgement` TR-4.2: 使用进度条可视化展示
  - `programmatic` TR-4.3: 占比计算正确，各分类百分比之和为100%

## [x] Task 5: 实现涨跌幅排行板块
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 显示所有持仓资产列表，按日涨跌幅从高到低排序
  - 前三名使用特殊样式标识（红底白字圆形排名）
  - 显示名称、代码、现价、市值、日涨跌幅
  - 红涨绿跌颜色区分
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `human-judgement` TR-5.1: 持仓按日涨跌幅从高到低排序显示
  - `human-judgement` TR-5.2: 前三名有特殊标识样式
  - `human-judgement` TR-5.3: 涨跌颜色正确区分（红涨绿跌）
  - `programmatic` TR-5.4: 排序逻辑正确

## [x] Task 6: 实现账户分布板块
- **Priority**: medium
- **Depends On**: Task 2
- **Description**: 
  - 按账户展示资产分布
  - 显示每个账户的总资产、持仓收益率、占比
  - 卡片式布局展示
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `human-judgement` TR-6.1: 账户分布板块显示各账户资产情况
  - `human-judgement` TR-6.2: 显示市值、收益率和占比
  - `programmatic` TR-6.3: 数据计算与理财模块账户本一致

## [x] Task 7: 实现收益分析板块
- **Priority**: medium
- **Depends On**: Task 2
- **Description**: 
  - 显示盈利数量和亏损数量统计
  - 显示最佳表现持仓（收益率最高）
  - 显示最差表现持仓（收益率最低）
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `human-judgement` TR-7.1: 收益分析板块显示盈利/亏损数量
  - `human-judgement` TR-7.2: 显示最佳表现和最差表现持仓
  - `programmatic` TR-7.3: 收益率计算正确

## [x] Task 8: 数据一致性验证和整体样式优化
- **Priority**: medium
- **Depends On**: Task 1, Task 2, Task 3, Task 4, Task 5, Task 6, Task 7
- **Description**: 
  - 验证资产穿透页面数据与理财模块数据一致性
  - 统一页面风格，与现有设计保持一致
  - 响应式布局验证
  - 整体功能测试
- **Acceptance Criteria Addressed**: AC-9
- **Test Requirements**:
  - `programmatic` TR-8.1: 总资产、总盈亏、当日盈亏与理财模块一致
  - `programmatic` TR-8.2: 各分类汇总与持仓明细数据一致
  - `human-judgement` TR-8.3: 整体页面风格与现有设计一致
  - `human-judgement` TR-8.4: 响应式布局在不同屏幕宽度下正常显示
