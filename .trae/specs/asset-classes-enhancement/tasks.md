# 资产分类模块功能增强 - The Implementation Plan

## [x] Task 1: 资产分类占比饼图
- **Priority**: high
- **Depends On**: None
- **Description**: 在资产分类页面添加资产分类占比饼图卡片，数据从理财模块持仓明细的一级分类聚合
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-1.1: 页面显示资产分类占比饼图卡片
  - `human-judgement` TR-1.2: 饼图按一级分类展示，数据与理财模块一致
  - `human-judgement` TR-1.3: 饼图显示各分类金额和占比

## [x] Task 2: 海内外分布饼图
- **Priority**: high
- **Depends On**: None
- **Description**: 添加海内外分布饼图，国内市场vs海外市场，海外再细分为港股、美股、其他市场
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement` TR-2.1: 显示海内外分布饼图
  - `human-judgement` TR-2.2: 国内市场和海外市场对比
  - `human-judgement` TR-2.3: 海外市场细分为港股市场、美股市场、其他市场

## [x] Task 3: 资产增长趋势折线图
- **Priority**: high
- **Depends On**: None
- **Description**: 添加资产增长趋势折线图，按一级分类分线显示
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgement` TR-3.1: 显示资产增长趋势折线图
  - `human-judgement` TR-3.2: 每条线对应一个一级分类
  - `human-judgement` TR-3.3: 有几类一级分类就显示几条线

## [x] Task 4: 分类金额柱状图
- **Priority**: high
- **Depends On**: None
- **Description**: 添加分类金额柱状图，柱顶显示中文金额标注（如100.23万）
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgement` TR-4.1: 显示分类金额柱状图
  - `human-judgement` TR-4.2: 每个柱顶显示对应金额
  - `human-judgement` TR-4.3: 金额用中文标识（万），保留2位小数

## [x] Task 5: 统计数据同步与优化
- **Priority**: high
- **Depends On**: None
- **Description**: 资产分类统计数据与理财模块同步，删除年度总支出，添加总收益率，计算加权平均期望收益率
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgement` TR-5.1: 总资产市值 = 理财模块总市值
  - `human-judgement` TR-5.2: 总资产成本 = 理财模块总成本
  - `human-judgement` TR-5.3: 总盈亏 = 理财模块总盈亏
  - `human-judgement` TR-5.4: 年度总收益改名为总收益率 = 理财模块总收益率
  - `human-judgement` TR-5.5: 年度总支出已删除
  - `human-judgement` TR-5.6: 平均期望收益率按市值权重计算

## [x] Task 6: 分类删除关联校验
- **Priority**: high
- **Depends On**: None
- **Description**: 修复分类删除功能，添加关联数据校验和提示
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `human-judgement` TR-6.1: 点击删除按钮有响应
  - `human-judgement` TR-6.2: 有关联数据时提示先解除关联
  - `human-judgement` TR-6.3: 无关联数据时可以正常删除

## [x] Task 7: 编辑数据同步与校验
- **Priority**: high
- **Depends On**: None
- **Description**: 编辑分类时优先使用理财模块数据，当前价值自动计算不可编辑
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `human-judgement` TR-7.1: 编辑弹窗中当前价值从理财模块获取
  - `human-judgement` TR-7.2: 当前价值不可编辑，只读显示
  - `human-judgement` TR-7.3: 数据与理财模块保持一致

## [x] Task 8: 权益类详情页 - 编辑功能
- **Priority**: high
- **Depends On**: None
- **Description**: 右上角新增资产类型按钮删除，改成编辑按钮，可编辑目标价值和期望收益率
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `human-judgement` TR-8.1: 右上角新增按钮改为编辑按钮
  - `human-judgement` TR-8.2: 点击编辑可修改目标价值
  - `human-judgement` TR-8.3: 点击编辑可修改期望收益率

## [x] Task 9: 权益类详情页 - 对比卡片
- **Priority**: high
- **Depends On**: Task 8
- **Description**: 第二行添加对比卡片，当前价值vs目标价值，当前收益率vs期望收益率
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `human-judgement` TR-9.1: 显示当前价值和目标价值对比
  - `human-judgement` TR-9.2: 显示当前收益率和期望收益率对比
  - `human-judgement` TR-9.3: 数据来自理财模块

## [x] Task 10: 权益类详情页 - 资产类型占比饼图
- **Priority**: high
- **Depends On**: Task 8
- **Description**: 添加资产类型占比饼图，只显示一级分类为权益类的数据
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `human-judgement` TR-10.1: 显示资产类型占比饼图
  - `human-judgement` TR-10.2: 数据只包含一级分类为权益类的资产
  - `human-judgement` TR-10.3: 各资产类型金额正确显示

## [x] Task 11: 权益类详情页 - 海内外对比饼图
- **Priority**: high
- **Depends On**: Task 8
- **Description**: 添加海内外资产对比饼图，只显示一级分类为权益类的数据
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `human-judgement` TR-11.1: 显示海内外对比饼图
  - `human-judgement` TR-11.2: 数据只包含一级分类为权益类的资产
  - `human-judgement` TR-11.3: 国内市场和海外市场对比正确

## [x] Task 12: 权益类详情页 - 持仓明细列表
- **Priority**: high
- **Depends On**: Task 8
- **Description**: 添加资产类型明细列表，延用理财模块持仓明细的表单结构（筛选、搜索、列设置），只显示一级分类为权益类的数据
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `human-judgement` TR-12.1: 显示持仓明细列表
  - `human-judgement` TR-12.2: 包含筛选功能
  - `human-judgement` TR-12.3: 包含搜索功能
  - `human-judgement` TR-12.4: 包含列设置功能
  - `human-judgement` TR-12.5: 只显示一级分类为权益类的数据

## [x] Task 13: 构建验证
- **Priority**: medium
- **Depends On**: All previous tasks
- **Description**: 运行 npm run build 确保无编译错误
- **Acceptance Criteria Addressed**: All
- **Test Requirements**:
  - `programmatic` TR-13.1: npm run build 成功，无 error
