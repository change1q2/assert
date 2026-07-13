# 资产穿透页面功能增强 - 实施计划

## [x] Task 1: 自定义时间区间选择器
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在AssetPenetration.jsx中，点击"自定义"按钮时显示时间区间选择器
  - 提供常用时间段选项：近一周、近一月、近三月、近半年、近一年
  - 点击选项后更新timeRange状态，触发数据重新计算
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgment` TR-1.1: 点击"自定义"按钮后显示时间区间选择器弹窗
  - `human-judgment` TR-1.2: 选择任意时间段后，页面顶部盈亏数据更新为对应时间范围

## [/] Task 2: 添加纳斯达克和标普500指数
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在AssetPenetration.jsx的indexOptions数组中添加纳斯达克(IXIC)和标普500(SPX)指数
  - 修改后端finance-service.js，添加从百度财经获取美股指数数据的函数
  - 修改前端获取指数数据的逻辑，支持美股指数
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgment` TR-2.1: 指数选择区域显示纳斯达克和标普500选项
  - `human-judgment` TR-2.2: 点击纳斯达克或标普500后，指数对比区域显示对应数据

## [x] Task 3: 修复指数曲线图数据来源
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 修改后端finance-service.js，添加从中证指数官网获取指数历史数据的函数
  - 修改前端收益率曲线图的数据获取逻辑，使用真实指数数据而非随机模拟数据
  - 确保曲线显示完整的历史数据
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgment` TR-3.1: 收益率曲线显示完整的历史数据点
  - `human-judgment` TR-3.2: 指数曲线数据与中证指数官网数据一致

## [x] Task 4: 实现指数K线图显示
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 修改后端finance-service.js，添加获取K线数据的函数（开盘价、收盘价、最高价、最低价）
  - 修改前端K线图渲染逻辑，正确绘制K线（阳线红色、阴线绿色）
  - 切换到K线视图时显示完整的K线图
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgment` TR-4.1: 点击"K线"按钮后显示K线图
  - `human-judgment` TR-4.2: K线正确显示开盘价、收盘价、最高价、最低价

## [x] Task 5: 仓位分析饼图三级分类钻取
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改AssetPenetration.jsx，添加仓位分析饼图组件
  - 实现一级分类显示（categoryL1）
  - 实现点击一级分类切换到二级分类（categoryL2）
  - 实现点击二级分类切换到三级分类（categoryL3）
  - 添加返回上一级的按钮
- **Acceptance Criteria Addressed**: AC-5, AC-6, AC-7
- **Test Requirements**:
  - `human-judgment` TR-5.1: 勾选"仓位分析"后显示一级分类饼图
  - `human-judgment` TR-5.2: 点击一级分类后切换到二级分类饼图
  - `human-judgment` TR-5.3: 点击二级分类后切换到三级分类饼图
  - `human-judgment` TR-5.4: 显示返回上一级按钮，点击后返回上一级

## [x] Task 6: 日历收益日收益颜色和切换逻辑优化
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改日历收益日视图的颜色逻辑：正数显示红色，负数显示蓝色
  - 修改日历单元格的数值显示：根据calendarMode显示收益率或收益金额
  - 确保切换收益率/收益金额时，日历显示相应数据
- **Acceptance Criteria Addressed**: AC-8, AC-9
- **Test Requirements**:
  - `human-judgment` TR-6.1: 日收益为正数的日期单元格显示红色
  - `human-judgment` TR-6.2: 日收益为负数的日期单元格显示蓝色
  - `human-judgment` TR-6.3: 点击"收益率"按钮后，日历显示百分比数据
  - `human-judgment` TR-6.4: 点击"收益金额"按钮后，日历显示金额数据

## [x] Task 7: 月收益显示格式优化
- **Priority**: medium
- **Depends On**: Task 6
- **Description**: 
  - 修改月收益视图，按图片格式显示12个月的数据
  - 使用网格布局显示月份，正数红色背景，负数蓝色背景
  - 显示收益金额和收益率
  - 底部显示年度收益汇总和同期上证数据
- **Acceptance Criteria Addressed**: AC-10
- **Test Requirements**:
  - `human-judgment` TR-7.1: 月收益视图显示12个月的网格布局
  - `human-judgment` TR-7.2: 盈利月份显示红色背景，亏损月份显示蓝色背景
  - `human-judgment` TR-7.3: 底部显示年度收益和同期上证数据

## [x] Task 8: 年收益显示格式优化
- **Priority**: medium
- **Depends On**: Task 6
- **Description**: 
  - 修改年收益视图，按图片格式显示多年的数据
  - 使用网格布局显示年份，正数红色背景，负数蓝色背景
  - 显示收益金额和收益率
  - 底部显示全部总收益和同期上证数据
- **Acceptance Criteria Addressed**: AC-11
- **Test Requirements**:
  - `human-judgment` TR-8.1: 年收益视图显示多年的网格布局
  - `human-judgment` TR-8.2: 盈利年份显示红色背景，亏损年份显示蓝色背景
  - `human-judgment` TR-8.3: 底部显示全部总收益和同期上证数据

## [x] Task 9: 阶段收益显示格式优化
- **Priority**: medium
- **Depends On**: Task 6
- **Description**: 
  - 修改阶段收益视图，按图片格式显示表格数据
  - 包含阶段、收益、收益率、同期上证列
  - 显示本周、本月、近半年、马年以来、最大盈利区间、最大回撤区间、自定义区间
  - 收益为正数显示红色，负数显示蓝色
- **Acceptance Criteria Addressed**: AC-12
- **Test Requirements**:
  - `human-judgment` TR-9.1: 阶段收益视图显示完整的表格，包含所有指定阶段
  - `human-judgment` TR-9.2: 表格包含阶段、收益、收益率、同期上证列
  - `human-judgment` TR-9.3: 收益为正数显示红色，负数显示蓝色

## [x] Task 10: 后端API增强 - 添加指数历史数据接口
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在finance-service.js中添加getIndexHistory函数，从中证指数官网获取指数历史数据
  - 在finance-service.js中添加getUSIndex函数，从百度财经获取美股指数数据
  - 在finance.js路由中添加/api/finance/index-history接口
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-10.1: GET /api/finance/index-history?code=000016 返回200状态码
  - `programmatic` TR-10.2: 返回数据包含日期、开盘价、收盘价、最高价、最低价字段

## [x] Task 11: 日收益日历整框变色优化
- **Priority**: high
- **Depends On**: Task 6
- **Description**: 
  - 修改日收益日历单元格样式，整个背景填充颜色
  - 正数红色背景，负数蓝色背景，颜色深度随收益大小变化
  - 日期数字和收益数据显示在色块上，确保清晰可读
  - 日期数字颜色调整为白色或深色以保证对比度
- **Acceptance Criteria Addressed**: AC-13
- **Test Requirements**:
  - `human-judgment` TR-11.1: 日收益日历每个单元格整个背景都有颜色
  - `human-judgment` TR-11.2: 正数红色背景，负数蓝色背景
  - `human-judgment` TR-11.3: 日期和收益数据在色块上清晰可读

## [x] Task 12: 柱状图优化（正方向+颜色区分+横向滚动）
- **Priority**: high
- **Depends On**: Task 6
- **Description**: 
  - 修改柱状图所有柱子统一向上正方向显示
  - 盈利用红色柱子，亏损用蓝色柱子
  - 每个柱子顶部显示金额数值，正数显示+号，负数显示-号
  - 数据超出可视范围时支持横向滚动拖动查看
  - 日/月/年视图的柱状图都应用此优化
- **Acceptance Criteria Addressed**: AC-14
- **Test Requirements**:
  - `human-judgment` TR-12.1: 所有柱子统一向上正方向显示，没有向下的柱子
  - `human-judgment` TR-12.2: 盈利柱子红色，亏损柱子蓝色
  - `human-judgment` TR-12.3: 每个柱子顶部显示金额数值，负数显示负号
  - `human-judgment` TR-12.4: 数据多时可以横向滚动查看

## [x] Task 13: 我的资产模块重构 - 移除资产分类占比
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 移除现有的"资产分类收益占比"模块（categoryL1PnlDistribution饼图）
  - 保留"我的资产"模块的银证转入/转出、期初资产、净流入、账户盈亏、期末资产部分
- **Acceptance Criteria Addressed**: AC-15
- **Test Requirements**:
  - `human-judgment` TR-13.1: 页面不再显示"资产分类收益占比"模块
  - `human-judgment` TR-13.2: "我的资产"模块保留完整功能

## [x] Task 14: 我的资产模块 - 双饼图布局和分类选择
- **Priority**: high
- **Depends On**: Task 13
- **Description**: 
  - 在"我的资产"下方新增资产分类饼图区域
  - 一行显示2个饼图：左侧为持仓分组/持仓分类饼图，右侧为一至四级分类饼图
  - 添加分类方式选择按钮/下拉，用户可以自由切换分类方式
  - 持仓分组/持仓分类为一个独立维度的饼图
  - 一级/二级/三级/四级分类为一个层级关系的饼图
- **Acceptance Criteria Addressed**: AC-15
- **Test Requirements**:
  - `human-judgment` TR-14.1: 一行显示2个饼图，左右并排布局
  - `human-judgment` TR-14.2: 左侧饼图为持仓分组/持仓分类维度
  - `human-judgment` TR-14.3: 右侧饼图为一至四级分类维度
  - `human-judgment` TR-14.4: 有分类方式选择控件，用户可切换

## [x] Task 15: 分类饼图层级钻取（一至四级）
- **Priority**: high
- **Depends On**: Task 14
- **Description**: 
  - 右侧饼图默认显示一级分类
  - 点击一级分类中的某一项，饼图切换为该分类下的二级分类数据
  - 点击二级分类中的某一项，切换到三级分类
  - 点击三级分类中的某一项，切换到四级分类
  - 提供"返回上一级"按钮，支持逐级返回
  - 左侧持仓分组/分类饼图独立运作，不参与层级钻取
- **Acceptance Criteria Addressed**: AC-16
- **Test Requirements**:
  - `human-judgment` TR-15.1: 右侧饼图默认显示一级分类
  - `human-judgment` TR-15.2: 点击一级分类项后切换到二级分类
  - `human-judgment` TR-15.3: 点击二级分类项后切换到三级分类
  - `human-judgment` TR-15.4: 点击三级分类项后切换到四级分类
  - `human-judgment` TR-15.5: 显示返回上一级按钮，点击后返回上一层级
  - `human-judgment` TR-15.6: 左侧持仓分组饼图不受层级钻取影响