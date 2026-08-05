# 理财模块集成修复 - 实施计划

## [x] Task 1: 修正 loadFundNav 和 loadQuotes 过滤逻辑
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 `loadFundNav` 的过滤条件：`assetType === '基金'` → `(assetType === '基金' || assetType === '债券')`
  - 确保 `loadQuotes` 中股票类（包括港股通）始终获取行情（无需修改，已验证）
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-1.1: loadFundNav 仅返回基金+债券+场外的资产
  - `programmatic` TR-1.2: loadQuotes 返回所有股票类资产
- **Files**: `src/pages/Finance.jsx` (L1180-1220 区域)

## [x] Task 2: Overview 独立总资产数据源统一
- **Priority**: high
- **Depends On**: Task 6（货币转换依赖）
- **Description**: 
  - Overview.jsx 的独立资产计算需复用与 IndependentAssets.jsx 一致的计算逻辑
  - 确保所有资产类型（保险、房产、车辆、固定投资、股权、定期资产）都被正确统计
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgement` TR-2.1: 对比 Overview 独立总资产与 IndependentAssets 总价值数值一致
- **Files**: `src/pages/Overview.jsx`

## [x] Task 3: 饼图小项过滤（占比 <1%）
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - Analysis.jsx 中支出占比饼图数据 `cCategory.expense` 过滤掉 percent < 1% 的项
  - 合并或直接过滤
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgement` TR-3.1: 饼图不显示占比 <1% 的分类
- **Files**: `src/pages/Analysis.jsx` (L1155)

## [x] Task 4: 独立资产饼图同步所有类型
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - IndependentAssetAnalysis.jsx 的 `categoryDistribution` 应自动同步 IndependentAssets 中存在的所有类型
  - 当前 CATEGORY_CONFIG 已包含 6 种类型，验证是否需要添加额外支持
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgement` TR-4.1: 饼图显示所有已有独立资产类型
- **Files**: `src/components/IndependentAssetAnalysis.jsx`

## [x] Task 5: 独立资产货币全局转换
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - IndependentAssets.jsx 的 `summaryData` 和列表展示使用 `convertCurrency` 将外币转换为人民币
  - 引入 exchangeRates 依赖，对 USD/HKD 等外币资产按汇率转换
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `programmatic` TR-5.1: USD 保险资产在 summaryData 中按 USD/CNY 汇率转换
  - `human-judgement` TR-5.2: 独立资产页面的外币资产显示已转换为人民币
- **Files**: `src/pages/IndependentAssets.jsx`

## [x] Task 6: 账户本去掉货币下拉全局转换
- **Priority**: high
- **Depends On**: Task 5
- **Description**: 
  - 移除 Accounts.jsx L1991-1999 的独立货币下拉
  - 所有金额使用 convertCurrency 从原币种转换为 CNY（或全局默认）
  - 与 Finance.jsx 的 selectedCurrency 统一
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `programmatic` TR-6.1: 账户本合计金额统一为人民币
  - `human-judgement` TR-6.2: 账户本不再有货币切换下拉
- **Files**: `src/pages/Accounts.jsx`

## [ ] Task 7: 构建测试与部署
- **Priority**: high
- **Depends On**: Task 1-6
- **Description**: 
  - 运行 `npm run build` 确保构建通过
  - 提交到 GitHub 并部署
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `programmatic` TR-7.1: `npm run build` 无错误
  - `programmatic` TR-7.2: Git push 成功，Vercel 部署成功
- **Files**: 所有修改过的文件
