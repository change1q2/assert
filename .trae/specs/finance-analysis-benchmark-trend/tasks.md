# 理财分析基准对比增强与资产类型数据同步 - 实现计划

## [x] Task 1: 修改基准对比数据 - 去掉持仓收益率，新增实际收益率
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改 benchmarkData useMemo，去掉"持仓收益率"
  - 新增"实际收益率"计算：实际收益率 = IRR - CPI累计涨幅
  - 修改柱状图展示的指标列表
- **Acceptance Criteria Addressed**: AC-2（实际收益率计算）
- **Test Requirements**:
  - `human-judgement` TR-1.1: 柱状图不再显示"持仓收益率"
  - `human-judgement` TR-1.2: 柱状图显示"实际收益率"指标
  - `programmatic` TR-1.3: 实际收益率计算正确（IRR - CPI）

## [x] Task 2: 修改沪深300数据获取 - 使用1B0300
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改 useEffect 中获取沪深300数据的API调用，将code从000300.SH改为1B0300
- **Acceptance Criteria Addressed**: AC-2（沪深300数据获取）
- **Test Requirements**:
  - `programmatic` TR-2.1: API调用使用code=1B0300
  - `human-judgement` TR-2.2: 沪深300数据正常显示

## [x] Task 3: 新增趋势图组件
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**:
  - 在基准对比区域新增趋势图（LineChart）
  - 趋势图左侧Y轴为幅度百分比，下方X轴为时间（按月显示）
  - 趋势图包含四条线：组合年化IRR、CPI涨幅、沪深300、实际收益率
- **Acceptance Criteria Addressed**: AC-1（基准对比趋势图）
- **Test Requirements**:
  - `human-judgement` TR-3.1: 趋势图显示在柱状图上方
  - `human-judgement` TR-3.2: Y轴显示幅度百分比，X轴按月显示
  - `human-judgement` TR-3.3: 趋势图包含四条数据线

## [x] Task 4: 修复资产类型数据同步问题
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 检查并修复 categoryMetrics 的计算逻辑
  - 确保按categoryL1正确分组，数据计算与理财模块一致
  - 验证权益类等一级分类数据显示正确
- **Acceptance Criteria Addressed**: AC-3（资产类型数据同步）
- **Test Requirements**:
  - `programmatic` TR-4.1: categoryMetrics按categoryL1正确分组
  - `programmatic` TR-4.2: 每个分类的currentValue、cost、pnl计算正确
  - `human-judgement` TR-4.3: 资产分类明细显示正确的数据（如权益类 45,171 85276.30 -40105.3 -47.30%）

## [x] Task 5: 构建验证
- **Priority**: high
- **Depends On**: Task 3, Task 4
- **Description**:
  - 运行 npm run build 验证无语法错误
- **Acceptance Criteria Addressed**: 所有 AC
- **Test Requirements**:
  - `programmatic` TR-5.1: npm run build 成功无报错