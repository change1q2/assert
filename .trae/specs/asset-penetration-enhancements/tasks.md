# 资产穿透页面功能增强 - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: 交易记录表单双向校验
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 Finance.jsx 中的交易记录表单，实现金额、价格、数量三者之间的双向校验
  - 当前实现：价格变化更新金额，数量变化更新金额，但金额变化不会反推数量
  - 需要实现：金额变化时，根据价格反推数量（数量=金额/价格）
  - 修改位置：DetailModal 组件中的新增记录表单和识别结果校验表单
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-1.1: 验证价格变化时金额自动更新
  - `human-judgement` TR-1.2: 验证数量变化时金额自动更新
  - `human-judgement` TR-1.3: 验证金额变化时数量自动反推计算
- **Notes**: 需要注意价格为0时的除法处理，避免除以零错误

## [x] Task 2: 收益率曲线负数显示与实时指数
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 确保收益率曲线能正确显示负数收益率，Y轴刻度应包含负数范围
  - 当前实现已有两条曲线（用户收益-红色，指数收益-蓝色），但需要确保负数数据正确显示
  - 确保从网络API获取实时指数数据用于曲线计算
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-4
- **Test Requirements**:
  - `human-judgement` TR-2.1: 验证负数收益率时曲线显示在0轴下方
  - `human-judgement` TR-2.2: 验证Y轴刻度包含负数（如-10%, -5%）
  - `human-judgement` TR-2.3: 验证同时显示用户收益曲线和指数收益曲线
- **Notes**: 曲线计算逻辑已在 AssetPenetration.jsx 的 SVG 组件中实现，需要检查负数处理

## [x] Task 3: 指数对比实时数据显示
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 指数对比模块显示各指数的实时数据（价格、涨跌幅）
  - 当前实现已通过 allIndexData 获取实时数据，需要确保显示的是实时数据而非模拟数据
  - 可能需要增加指数价格的显示
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgement` TR-3.1: 验证指数对比模块显示各指数的实时涨跌幅
  - `human-judgement` TR-3.2: 验证数据来源于网络API而非模拟数据
- **Notes**: 后端 finance-service.js 已提供 getIndexHistory 和 getUSIndex 方法

## [x] Task 4: 收益数据实时计算
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 修改日历收益、月度收益、年度收益、阶段收益的数据生成逻辑
  - 当前使用随机模拟数据，需要改为根据理财模块的实际金额数据计算
  - 无数据的部分按0显示
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `human-judgement` TR-4.1: 验证日历收益数据基于实际资产数据
  - `human-judgement` TR-4.2: 验证月度收益数据基于实际资产数据
  - `human-judgement` TR-4.3: 验证年度收益数据基于实际资产数据
  - `human-judgement` TR-4.4: 验证阶段收益数据基于实际资产数据
  - `human-judgement` TR-4.5: 验证无数据部分显示0而非随机数据
- **Notes**: 需要分析理财模块数据结构，了解如何计算不同时间范围的收益

## [x] Task 5: 资产分类层级钻取
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 确保资产分类模块支持四级层级钻取（一级→二级→三级→四级）
  - 当前数据结构 assetCategoryData 已支持四级分类，但需要确保点击钻取功能正常
  - 当某层级无下一级子分类时，该分类不可点击
  - 返回上级按钮功能完善
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `human-judgement` TR-5.1: 验证点击一级分类（如股票）显示二级分类（A股、港股）
  - `human-judgement` TR-5.2: 验证点击二级分类（如A股）显示三级分类（场内、场外）
  - `human-judgement` TR-5.3: 验证点击三级分类（如场内）显示四级分类
  - `human-judgement` TR-5.4: 验证无下一级子分类的分类不可点击
  - `human-judgement` TR-5.5: 验证返回上级按钮正常工作
- **Notes**: 当前数据结构已支持四级分类，需要检查 PieChartSVG 组件的 onClick 事件和返回上级逻辑
