# 房产资产增强 - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: 优化房产表单字段（自用价格+出租时间+字段顺序）
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改 `getDefaultFormData` 中 realestate 的默认字段，增加 purchasePrice、secondHandPrice、rentStartDate、rentEndDate、rentStatus
  - 自用方式下显示购买价、二手价输入字段
  - 出租方式下显示起租时间、到期时间字段
  - 调整字段顺序：是否出租放在出租方式之前
  - 修改旧的 avgPrice/newHousePrice 字段名（如果不用了就清理或保留兼容）
- **Acceptance Criteria Addressed**: AC-1, AC-3, AC-5
- **Test Requirements**:
  - `human-judgement` TR-1.1: 自用模式有购买价和二手价输入框
  - `human-judgement` TR-1.2: 出租模式有起租时间和到期时间输入框
  - `human-judgement` TR-1.3: 是否出租在出租方式之前

## [x] Task 2: 优化房产列表字段（折损率+出租状态+出租方式修复）
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 列表新增"购买价"、"二手价"、"折损率"列（自用相关）
  - 列表新增"出租状态"列（空闲中/已出租）
  - 修复出租方式未显示问题（检查列顺序和数据字段名）
  - 折损率 = (secondHandPrice - purchasePrice) / purchasePrice * 100%，用 formatPercentage 格式化
  - 调整列顺序，让相关字段放在一起
  - 调整 colSpan 数值
- **Acceptance Criteria Addressed**: AC-2, AC-4, AC-10
- **Test Requirements**:
  - `human-judgement` TR-2.1: 列表有折损率列且计算正确
  - `human-judgement` TR-2.2: 列表有出租状态列
  - `human-judgement` TR-2.3: 出租方式列正常显示数据

## [x] Task 3: 房产明细弹窗功能
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 在操作列增加"明细"按钮（仅出租房产显示，或都显示但空数据）
  - 新增 state: selectedProperty, showPropertyDetailModal, propertyDetailFormData, editingPropertyDetailIndex
  - 新增 renderPropertyDetailModal 函数（参考保险的 renderDetailModal）
  - 明细表格列：期数、开始时间、结束时间、是否交租、是否退租、操作（编辑/删除）
  - 新增/编辑行的表单弹窗或内联编辑
  - 保存明细到 property.rentDetails 数组
- **Acceptance Criteria Addressed**: AC-6, AC-7, AC-11
- **Test Requirements**:
  - `human-judgement` TR-3.1: 操作列有"明细"按钮
  - `human-judgement` TR-3.2: 明细弹窗有完整表格列
  - `human-judgement` TR-3.3: 可以新增/编辑/删除明细行

## [x] Task 4: 自动生成期数和交租状态颜色
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - 设置起租时间后，自动生成12期明细（每30天一期）
  - 期数从第1期到第12期
  - 第N期开始时间 = 起租时间 + (N-1)*30天
  - 第N期结束时间 = 起租时间 + N*30天 - 1天（或30天后）
  - 是否交租三个状态：已交租、未交租、已逾期
  - 已交租绿色文字/背景，未交租灰色，已逾期红色
  - 已逾期自动判断：当前日期 > 结束时间 且 状态为未交租
  - 是否退租：是、否
- **Acceptance Criteria Addressed**: AC-8, AC-9
- **Test Requirements**:
  - `human-judgement` TR-4.1: 设置起租时间后自动生成12期
  - `human-judgement` TR-4.2: 交租状态三种颜色正确
  - `human-judgement` TR-4.3: 是否退租字段正常

## [x] Task 5: 构建验证和本地测试
- **Priority**: high
- **Depends On**: Task 1-4
- **Description**:
  - 运行 `npm run build` 验证构建成功
  - 本地浏览器测试所有功能
- **Acceptance Criteria Addressed**: 所有AC
- **Test Requirements**:
  - `programmatic` TR-5.1: npm run build 构建成功
  - `human-judgement` TR-5.2: 本地测试所有功能正常
