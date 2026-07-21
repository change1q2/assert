# 车辆/固定投资/定期资产改造计划

## Summary
1. 车辆「电动车」类型拆分为「2 轮电动车」，联动 9 号、雅迪、极核等厂商和对应型号
2. 固定投资的国家/省份/地区改为下拉（与定期资产共用国家/省份数据）
3. 修复定期资产点击「明细」/列表/新增可能引起的白屏问题

## Current State Analysis

### 1. 车辆类型/厂商/型号数据
- 数据源：[vehicle-data.js](file:///d:/code/assert/assert_WEB/src/data/vehicle-data.js)
- 当前 `VEHICLE_TYPES` = `['小轿车', 'SUV', 'MPV', '跑车', '电动车', '皮卡', '面包车']`
- 当前 `电动车` 厂商只有「比亚迪、特斯拉、蔚来、小鹏、理想」，**不是 2 轮电动车**（2 轮电动车头部品牌是 9 号、雅迪、极核）
- 当前厂商 `9号 / 雅迪 / 极核` **不存在**

### 2. 固定投资表单
- 当前：国家/省份/地区是 `<input type="text">`（截图确认）
- 位置：[IndependentAssets.jsx](file:///d:/code/assert/assert_WEB/src/pages/IndependentAssets.jsx#L1355-L1442) 的 `renderFixedInvestmentForm`
- 数据 `fixedinvestment` 默认值在 [getDefaultFormData](file:///d:/code/assert/assert_WEB/src/pages/IndependentAssets.jsx#L303-L314)

### 3. 定期资产白屏根因分析
- 表格渲染：[renderFixedDepositTable](file:///d:/code/assert/assert_WEB/src/pages/IndependentAssets.jsx#L1196-L1264) — 全部 12 列，结构正常
- 表单渲染：[renderFixedDepositForm](file:///d:/code/assert/assert_WEB/src/pages/IndependentAssets.jsx#L1861-L2009) — 全部有 `|| ''` 兜底
- 明细弹窗：[renderFixedDepositDetailModal](file:///d:/code/assert/assert_WEB/src/pages/IndependentAssets.jsx#L2494-L2627) — 全部有 `!== null` 兜底
- **最可能的白屏原因**：
  - 老数据（之前保存的 fixeddeposit 数据）无 `market/location/usage/termType/interestRate/startDate/endDate` 字段，列表渲染时所有字段都 fallback 到 `—`，不应该崩
  - 但 **`handleEdit` 直接 `setFormData(item)`** 把老数据（不含新字段）灌进 formData 后弹窗打开，调用 `formatCurrency` 或 `formatPercentage` 时因老数据无 currency 字段传入 undefined，可能导致运行时异常
  - 另一个常见原因：JSX 中 `<div>{formatPercentage(item.interest)}</div>` 当 `item.interest === ''` 时，`formatPercentage('')` 返回什么？未确认
- **白屏修复策略**：在 `handleEdit` 中合并默认值；并清理 vite 缓存重启

## Proposed Changes

### A. 车辆类型/厂商/型号联动（[vehicle-data.js](file:///d:/code/assert/assert_WEB/src/data/vehicle-data.js)）
- 修改 `VEHICLE_TYPES`：将 `电动车` 替换为 `2轮电动车`
- `VEHICLE_BRANDS['2轮电动车']` = `['9号', '雅迪', '极核', '小牛', '爱玛', '台铃', '小刀']`
- `VEHICLE_MODELS` 新增各品牌代表型号：
  - 9号：`N70C、N85C、N90、MIX]
  - 雅迪：`冠能T5、冠能E5、欧逸、M6]
  - 极核：`AE2、AE4、AE6、AE8]
  - 小牛：`N1S、U1 Pro、M1 Pro、NQi GT]
  - 爱玛：`爱玛蛋蛋、爱玛欣果、爱玛战鹰]
  - 台铃：`台铃超能S、台铃狮子王、台铃星河]
  - 小刀：`小刀电动车-X1、小刀长征版]
- 现有 `电动车` 老数据兼容：若 `item.vehicleType === '电动车'`，表单内显示并保存时仍允许保留（不在选项中会强制改？— **不强制**，下拉只显示「2轮电动车」，老数据编辑时显示为空，让用户重选）

### B. 固定投资国家/省份/地区下拉（[IndependentAssets.jsx](file:///d:/code/assert/assert_WEB/src/pages/IndependentAssets.jsx)）
- 抽出 `renderLocationSelectors()` 共用函数（避免与 fixeddeposit 重复）：
  - `countryOptions`：`['中国', '美国', '英国', '日本', '德国', '法国', '加拿大', '澳大利亚', '新加坡', '韩国', '中国香港', '其他']`
  - `provinceOptions`（country==='中国'时）：`['北京', '上海', '广东', '江苏', '浙江', ...全国省份直辖市..., '其他']`
  - `districtOptions`（province 已选时）：用「请输入」+ 自由填写（与现状一致，最细粒度）
- 联动逻辑：国家变更 → 清空省份和地区；省份变更 → 清空地区
- 地区保留为文本输入（粒度太细不适合做下拉）

### C. 定期资产白屏修复
- 修改 `handleEdit`：[IndependentAssets.jsx](file:///d:/code/assert/assert_WEB/src/pages/IndependentAssets.jsx#L378-L382)
  - 用 `getDefaultFormData(activeTab)` 合并老 item，确保新字段有默认值
- 清理 vite 缓存：`rm -rf node_modules/.vite` 后重启 dev
- 重新构建验证：`npm run build`

## Assumptions & Decisions
- 车辆「电动车」改「2轮电动车」是用户明确要求，原「电动车」选项直接被替换
- 老 fixeddeposit 数据中无新字段时，编辑时合并默认值确保 formData 完整
- 固定投资「地区」保持文本输入（粒度太细），不强制下拉
- 假设 vite 缓存是白屏的隐性原因之一（虽然代码逻辑有兜底，但缓存的 stale 模块可能造成运行时异常）
- 不修改 PremiumCheck.jsx 的 JSX 警告（不在本次需求范围）

## Verification
1. `npm run build` 成功，无新增错误
2. 手动验证：
   - 车辆类型选择「2轮电动车」→ 厂商出现 9号/雅迪/极核等；选择厂商 → 型号联动
   - 固定投资国家/省份下拉正常，地区为文本输入
   - 定期资产 Tab 切换、新增、编辑、明细均不白屏
3. 浏览器 Console 无 React 报错

## Files to Modify
- [vehicle-data.js](file:///d:/code/assert/assert_WEB/src/data/vehicle-data.js) — 类型/厂商/型号数据
- [IndependentAssets.jsx](file:///d:/code/assert/assert_WEB/src/pages/IndependentAssets.jsx) — handleEdit 合并默认值；renderFixedInvestmentForm 改为下拉
- 可能：[IndependentAssets.jsx](file:///d:/code/assert/assert_WEB/src/pages/IndependentAssets.jsx) — renderRealEstateForm 中 country/province/district 也改为下拉（用户截图只说"固定投资"，但 realestate 也有同样字段，可一并优化）
