# 理财模块集成修复 PRD

## Overview
- **Summary**: 对理财和独立资产模块进行 7 项集成修复：(1) 修正 loadFundNav 仅处理基金/债权类场外资产；(2) 股票类默认为场内获取行情；(3) 资产总览独立总资产数据源修正；(4) 饼图隐藏占比<1%的小项；(5) 统计分析独立资产饼图同步所有资产类型；(6) 独立资产货币全局转换为人民币；(7) 账户本去掉货币下拉选项。
- **Purpose**: 修复理财模块中多个数据流向错误和显示问题，确保资产类型路由正确、统计完整、货币一致。
- **Target Users**: Wealth OS 理财模块和独立资产模块的使用者。

## Goals
- 修正 loadFundNav 过滤逻辑，仅基金类+债权类且场外的资产才走净值接口
- 确保股票类资产（包括港股通）通过实时行情接口获取价格
- 独立资产总览数据与独立资产页面保持一致
- 饼图占比 <1% 的分类合并为"其他"或隐藏
- 统计分析饼图支持所有独立资产类型
- 独立资产（含保险等外币资产）自动根据汇率转换为人民币
- 账户本统一使用全局货币单位进行转换

## Non-Goals
- 不改变后端 API 接口
- 不修改数据库表结构
- 不重构组件架构

## Background & Context
- 当前 `loadFundNav` 仅过滤 `assetType === '基金'`，需扩展支持 `assetType === '债券'`
- 当前 `loadQuotes` 对股票类的处理已基本正确，但需确保明确为场内默认
- Overview.jsx L628-676 的独立资产计算逻辑与 IndependentAssets.jsx L1644-1717 的逻辑存在差异
- Analysis.jsx 的饼图（L1155）当前直接显示所有分类，无小项过滤
- IndependentAssetAnalysis.jsx 的 `CATEGORY_CONFIG` 已包含 6 种类型，但需与 IndependentAssets 数据来源对齐
- IndependentAssets.jsx 中保险等外币资产（如 USD）在 summary 计算中直接累加，未转换为 CNY
- Accounts.jsx L1991-1999 存在独立的货币下拉，应改为统一使用全局汇率转换

## Functional Requirements
- **FR-1**: `loadFundNav` 过滤条件改为：`(assetType === '基金' || assetType === '债券') && categoryL3 === '场外'`
- **FR-2**: `loadQuotes` 过滤条件：股票类无论 L3 为场内/场外都获取行情（已实现，验证）
- **FR-3**: Overview.jsx 独立总资产计算复用 IndependentAssets.jsx 的 summaryData 计算结果
- **FR-4**: 支出占比饼图（Analysis.jsx）占比 <1% 的项过滤掉或合并为"其他"
- **FR-5**: IndependentAssetAnalysis 饼图的 categoryDistribution 遍历 IndependentAssets 的所有存在的类型
- **FR-6**: IndependentAssets.jsx 的 summaryData 计算使用 `convertCurrency(itemValue, itemCurrency, 'CNY', exchangeRates)` 转换为人民币
- **FR-7**: Accounts.jsx 移除独立货币下拉选项，改用全局汇率 CNY 基准转换

## Non-Functional Requirements
- **NFR-1**: 所有修改构建通过，无运行时错误
- **NFR-2**: 货币转换精度保持一致（4 位小数）
- **NFR-3**: 饼图渲染性能不降低

## Constraints
- **Technical**: 前端 React + Vite + Tailwind；使用已有的 `convertCurrency`、`formatCurrencyWithRate` 工具
- **Dependencies**: 依赖 `exchangeRates` 实时汇率数据

## Acceptance Criteria

### AC-1: loadFundNav 仅处理基金/债权场外资产
- **Given**: 资产列表包含股票、基金、债券等多种类型
- **When**: loadFundNav 执行过滤
- **Then**: 只有 assetType 为"基金"或"债券"且 categoryL3 为"场外"的资产被选中
- **Verification**: `programmatic`

### AC-2: 股票类默认走行情接口
- **Given**: 股票类资产（包括港股通）
- **When**: loadQuotes 执行
- **Then**: 股票类资产始终被选中获取实时行情
- **Verification**: `programmatic`

### AC-3: 独立总览数据一致
- **Given**: 独立资产模块有保险、房产、车辆等数据
- **When**: 查看资产总览卡片
- **Then**: 独立总资产数值与独立资产页面的"总价值"一致
- **Verification**: `human-judgment`

### AC-4: 饼图小项过滤
- **Given**: 支出占比饼图有多个分类
- **When**: 某分类占比 <1%
- **Then**: 该分类不显示在饼图上（合并为其他或过滤）
- **Verification**: `human-judgment`

### AC-5: 独立资产饼图完整
- **Given**: 独立资产新增了类型（如"其他"）
- **When**: 查看统计分析中的独立资产类别占比饼图
- **Then**: 新类型正确显示在饼图中
- **Verification**: `human-judgment`

### AC-6: 外币资产自动转换
- **Given**: 保险资产以 USD 计价
- **When**: 查看独立资产账户本卡片
- **Then**: USD 金额按汇率自动转换为人民币显示
- **Verification**: `programmatic`

### AC-7: 账户本统一货币
- **Given**: 账户本有多种货币的资产
- **When**: 查看账户本合计
- **Then**: 所有金额按全局汇率统一转换为人民币
- **Verification**: `programmatic`

### AC-8: 构建通过并部署
- **Given**: 所有修改完成
- **When**: 运行 `npm run build` 和部署
- **Then**: 构建通过并成功部署到 GitHub 和 Vercel
- **Verification**: `programmatic`
