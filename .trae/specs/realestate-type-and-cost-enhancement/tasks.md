# 房产资产类型下拉与自用字段增强 - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: 类型改为纯下拉并支持增删改管理
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 将类型字段从 input+datalist 改为纯 select 下拉
  - 创建类型选项管理功能：新增 state 管理类型列表
  - 类型选项存储到 localStorage（key: realestateTypes）
  - 初始选项：住宅、工厂、商铺、公寓
  - 增加"管理类型"按钮，点击打开管理弹窗
  - 管理弹窗支持增删改类型选项
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `human-judgement` TR-1.1: 类型字段为纯下拉，不能手动输入
  - `human-judgement` TR-1.2: 可以通过管理弹窗增删改类型选项
  - `human-judgement` TR-1.3: 类型选项刷新页面后保持不变

## [x] Task 2: 自用模式增加新字段和自动计算
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改 getDefaultFormData，增加 pricePerSqm（每平方米价格）、area（面积）、tax（税费）、agencyFee（中介费）字段
  - 自用模式表单显示：每平方米价格、面积、税费、中介费输入框
  - 购买价改为只读，自动计算 = pricePerSqm × area
  - 移除原有的手动输入购买价（当为自用模式时）
  - 出租模式保持原字段不变
- **Acceptance Criteria Addressed**: AC-3, AC-4
- **Test Requirements**:
  - `human-judgement` TR-2.1: 自用模式有每平方米价格和面积输入框
  - `human-judgement` TR-2.2: 自用模式有税费和中介费输入框
  - `human-judgement` TR-2.3: 购买价自动计算且只读

## [x] Task 3: 列表新增字段显示
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - 列表新增"每平方米价格"、"面积"、"税费"、"中介费"列
  - 每平方米价格显示货币符号
  - 面积显示单位"㎡"
  - 税费和中介费显示货币符号
  - 调整列顺序，将相关字段放在一起
  - 调整 colSpan 数值
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgement` TR-3.1: 列表有每平方米价格列
  - `human-judgement` TR-3.2: 列表有面积列（带㎡单位）
  - `human-judgement` TR-3.3: 列表有税费和中介费列

## [x] Task 4: 构建验证和本地测试
- **Priority**: high
- **Depends On**: Task 1-3
- **Description**:
  - 运行 `npm run build` 验证构建成功
  - 本地浏览器测试所有功能
- **Acceptance Criteria Addressed**: 所有AC
- **Test Requirements**:
  - `programmatic` TR-4.1: npm run build 构建成功
  - `human-judgement` TR-4.2: 本地测试所有功能正常
