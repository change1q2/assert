# 独立资产货币单位与保存修复 - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: 修复保险资产保存功能
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 调试并修复保险资产新增/编辑保存无效果的bug
  - 检查 handleSave 中 insurance 类型的数据保存逻辑
  - 检查 updateAssets 和 saveState 的调用链
  - 确保保存后列表正确刷新
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-1.1: 新增保单保存后列表正确显示新增记录
  - `human-judgement` TR-1.2: 编辑保单保存后列表数据正确更新
- **Notes**: 根本原因是 saveState 函数检查 response.ok，但 request 函数返回的是 JSON 对象，不是原始 Response 对象，所以 response.ok 永远是 undefined。修复：将 response.ok 改为 response.ok || response.success

## [x] Task 2: 添加货币单位选择字段到所有表单
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在所有6种资产类型（保险、房产、车辆、固定投资、股权、定期存）的表单中新增"货币单位"下拉字段
  - 选项：CNY（人民币）、USD（美元）、HKD（港币）、JPY（日元）、EUR（欧元）、GBP（英镑）
  - 默认值：CNY
  - 字段放在表单第一行或最后一行，保持布局美观
  - 定期存已有 currency 字段，保持一致
- **Acceptance Criteria Addressed**: AC-2, AC-5
- **Test Requirements**:
  - `human-judgement` TR-2.1: 6种资产表单都有货币单位下拉
  - `human-judgement` TR-2.2: 默认值为 CNY

## [x] Task 3: 列表新增币种列和金额货币符号
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - 所有6种资产列表新增"币种"列
  - 金额列根据币种显示对应货币符号
  - 货币符号映射：CNY→¥, USD→$, HKD→HK$, JPY→¥, EUR→€, GBP→£
  - 旧数据没有 currency 字段时默认显示 CNY
  - 修改 formatCurrency 或新增按币种格式化的工具函数
- **Acceptance Criteria Addressed**: AC-3, AC-4, AC-6
- **Test Requirements**:
  - `human-judgement` TR-3.1: 列表有"币种"列
  - `human-judgement` TR-3.2: 金额显示对应货币符号
  - `human-judgement` TR-3.3: 旧数据默认显示 CNY

## [x] Task 4: 构建验证和本地测试
- **Priority**: high
- **Depends On**: Task 1-3
- **Description**:
  - 运行 `npm run build` 验证构建成功
  - 本地浏览器测试：保险资产保存功能正常
  - 本地浏览器测试：各资产类型货币单位功能正常
- **Acceptance Criteria Addressed**: 所有AC
- **Test Requirements**:
  - `programmatic` TR-4.1: npm run build 构建成功
  - `human-judgement` TR-4.2: 本地测试所有功能正常
