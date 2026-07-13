# 资产穿透页面升级 - 实现计划

## [x] Task 1: 盈亏总览模块和时间区间切换
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 重新设计顶部区域为券商风格的盈亏总览
  - 显示当前时间区间的盈亏金额和收益率
  - 添加时间区间切换按钮（当日/本月/近三月/今年/全部/自定义）
  - 实现时间区间切换的状态管理，全局数据根据区间更新
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `human-judgement` TR-1.1: 顶部显示盈亏金额和收益率
  - `human-judgement` TR-1.2: 时间区间按钮可点击切换
  - `human-judgement` TR-1.3: 切换时间区间后数据更新
  - `programmatic` TR-1.4: 时间区间切换状态正确传递

## [x] Task 2: 收益率曲线模块（含指数对比）
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 添加收益率曲线区域，支持曲线收益率/K线收益率切换
  - 显示用户收益线和指数对比线（两条线）
  - 添加指数选择标签（上证/深证/创业板/上证50/沪深300/中证500）
  - 实现指数数据获取（从网络API获取）
  - 支持自定义指数输入
- **Acceptance Criteria Addressed**: AC-3, AC-4
- **Test Requirements**:
  - `human-judgement` TR-2.1: 显示用户收益线和指数对比线
  - `human-judgement` TR-2.2: 曲线/K线切换按钮可点击
  - `human-judgement` TR-2.3: 指数选择标签可切换
  - `programmatic` TR-2.4: 指数数据正确获取并显示
  - `human-judgement` TR-2.5: 自定义指数功能可用

## [x] Task 3: 收益分析模块
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 创建收益分析卡片
  - 支持收益率/盈亏金额/总资产三种维度切换
  - 显示收益分析功能复选框（仓位分析、极值分析、最大回撤等）
  - 数据根据时间区间自动更新
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgement` TR-3.1: 收益分析卡片显示正确
  - `human-judgement` TR-3.2: 收益率/盈亏金额/总资产可切换
  - `human-judgement` TR-3.3: 收益分析功能复选框显示
  - `programmatic` TR-3.4: 数据计算与理财模块一致

## [x] Task 4: 指数对比模块
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**: 
  - 创建指数对比卡片
  - 显示"本月跑赢/跑输上证指数"（根据选中指数变化）
  - 显示用户收益率与各指数的对比条
  - 显示差值百分比
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `human-judgement` TR-4.1: 显示跑赢/跑输状态
  - `human-judgement` TR-4.2: 显示用户与各指数对比条
  - `human-judgement` TR-4.3: 切换指数后对比数据更新
  - `programmatic` TR-4.4: 差值计算正确

## [x] Task 5: 日历收益模块
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 创建日历收益区域
  - 支持日收益/月收益/年收益/阶段收益筛选
  - 支持日历图/柱状图切换
  - 日历图显示每日盈亏（红绿颜色区分）
  - 支持收益率/收益金额切换
  - 支持年月选择器
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `human-judgement` TR-5.1: 日历图显示每日盈亏
  - `human-judgement` TR-5.2: 日收益/月收益/年收益/阶段收益可切换
  - `human-judgement` TR-5.3: 日历图/柱状图可切换
  - `human-judgement` TR-5.4: 收益率/收益金额可切换
  - `human-judgement` TR-5.5: 年月选择器可用

## [x] Task 6: 个股盈亏模块
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 创建个股盈亏区域
  - 显示各持仓资产的盈亏排名（金银铜牌标识）
  - 支持图表/列表视图切换
  - 数据根据时间区间更新
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `human-judgement` TR-6.1: 显示个股盈亏排名
  - `human-judgement` TR-6.2: 前三名有金银铜牌标识
  - `human-judgement` TR-6.3: 图表/列表视图可切换
  - `programmatic` TR-6.4: 排名顺序正确

## [x] Task 7: 操作分析和我的资产模块
- **Priority**: medium
- **Depends On**: Task 1
- **Description**: 
  - 创建操作分析卡片（交易股票数、平均持仓天数、建清仓次数、交易成功率、平均仓位、资金周转率）
  - 创建我的资产卡片（银证转入/转出、期初/期末资产、净流入、账户盈亏）
  - 显示资金流向关系图
- **Acceptance Criteria Addressed**: AC-9
- **Test Requirements**:
  - `human-judgement` TR-7.1: 操作分析统计数据显示正确
  - `human-judgement` TR-7.2: 我的资产资金流向显示正确
  - `human-judgement` TR-7.3: 资金流向关系图显示
  - `programmatic` TR-7.4: 数据计算正确

## [x] Task 8: 资产分类收益占比饼图模块
- **Priority**: medium
- **Depends On**: Task 1
- **Description**: 
  - 创建资产分类收益占比区域
  - 使用饼图显示各资产分类的收益占比
  - 显示各分类的收益金额
  - 数据根据时间区间更新
- **Acceptance Criteria Addressed**: AC-10
- **Test Requirements**:
  - `human-judgement` TR-8.1: 饼图显示各分类占比
  - `human-judgement` TR-8.2: 各分类收益金额显示
  - `programmatic` TR-8.3: 占比计算正确（总和100%）

## [x] Task 9: 全局数据一致性和整体样式优化
- **Priority**: high
- **Depends On**: Task 1-8
- **Description**: 
  - 验证所有板块数据根据时间区间和指数选择同步更新
  - 统一页面风格，与券商APP设计保持一致
  - 响应式布局验证
  - 修复数据计算问题，确保与理财模块一致
- **Acceptance Criteria Addressed**: AC-11
- **Test Requirements**:
  - `programmatic` TR-9.1: 所有板块数据同步更新
  - `human-judgement` TR-9.2: 整体页面风格一致
  - `human-judgement` TR-9.3: 响应式布局正常
  - `programmatic` TR-9.4: 数据计算与理财模块一致
