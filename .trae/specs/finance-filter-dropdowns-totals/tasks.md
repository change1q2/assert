# 理财模块筛选下拉联动与顶部总览计算修正 - The Implementation Plan (Decomposed and Prioritized Task List)

## [ ] Task 1: 修改市场筛选下拉使用 MARKET_OPTIONS 常量
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 将市场筛选下拉从使用 holdings 数据中提取的 uniqueMarkets 改为使用 MARKET_OPTIONS 常量
  - MARKET_OPTIONS = ['国内市场', '港股市场', '美股市场', '其他市场']
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `human-judgement` TR-1.1: 市场筛选下拉显示正确选项（全部市场、国内市场、港股市场、美股市场、其他市场）

## [ ] Task 2: 实现货币筛选与市场的联动逻辑
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 将货币筛选下拉从使用 holdings 数据中提取的 uniqueCurrencies 改为使用 CURRENCY_SUGGESTIONS 常量
  - 根据选中的市场过滤货币选项：国内市场→CNY，港股市场→HKD，美股市场→USD，其他市场→全部货币
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `human-judgement` TR-2.1: 选择国内市场时，货币筛选仅显示 CNY
  - `human-judgement` TR-2.2: 选择港股市场时，货币筛选仅显示 HKD
  - `human-judgement` TR-2.3: 选择美股市场时，货币筛选仅显示 USD
  - `human-judgement` TR-2.4: 选择其他市场或不选择市场时，货币筛选显示全部选项

## [ ] Task 3: 修改资产类型筛选下拉使用 ASSET_TYPE_OPTIONS 常量
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 将资产类型筛选下拉从使用 holdings 数据中提取的 uniqueAssetTypes 改为使用 ASSET_TYPE_OPTIONS 常量
  - ASSET_TYPE_OPTIONS = ['股票', '基金', '债券', '期货', '期权', '外汇', '数字货币', '银行理财', '保险', '房产', '其他']
- **Acceptance Criteria Addressed**: [AC-3]
- **Test Requirements**:
  - `human-judgement` TR-3.1: 资产类型筛选下拉显示正确选项

## [ ] Task 4: 修改资产分类筛选使用 assetClassOptions
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 将资产分类筛选下拉从使用 holdings 数据中提取的 uniqueCategoryL1 改为使用 assetClassOptions（与新增表单一致）
- **Acceptance Criteria Addressed**: [AC-3]
- **Test Requirements**:
  - `human-judgement` TR-4.1: 资产分类筛选下拉显示与新增表单一致的选项

## [ ] Task 5: 修正顶部总览计算公式
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 总市值 = filtered.reduce(sum + currentValue)
  - 总成本 = filtered.reduce(sum + cost × quantity)
  - 总盈亏 = filtered.reduce(sum + holdingPnl)
  - 总收益率 = (总市值 - 总成本) / 总成本 × 100%
- **Acceptance Criteria Addressed**: [AC-4, AC-5, AC-6, AC-7]
- **Test Requirements**:
  - `human-judgement` TR-5.1: 总市值等于列表当前市值总和
  - `human-judgement` TR-5.2: 总成本等于列表持仓成本×数量的总和
  - `human-judgement` TR-5.3: 总盈亏等于列表持仓盈亏总和
  - `human-judgement` TR-5.4: 总收益率=(总市值-总成本)/总成本×100%

## [ ] Task 6: 构建验证
- **Priority**: high
- **Depends On**: [Task 1, Task 2, Task 3, Task 4, Task 5]
- **Description**: 
  - 运行 npm run build 确保前端构建无错误
- **Acceptance Criteria Addressed**: [AC-8]
- **Test Requirements**:
  - `programmatic` TR-6.1: npm run build 退出码为 0
