# 资产分类联动与天数自动计算 - The Implementation Plan (Decomposed and Prioritized Task List)

## [ ] Task 1: 构建资产分类四级联动配置表
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 Finance.jsx 中新增 `CASCADE_OPTIONS` 配置对象，按 `market → assetType → categoryL1 → categoryL2 → categoryL3 → categoryL4` 层级定义所有选项和默认值
  - 配置覆盖国内市场下的 13 种资产类型：股票、基金、债券、现金、期货、期权、外汇、保险、房产、实体投资、黄金、白银、原油
  - 每条配置包含：l1Options（一级可选列表）、l1Default（一级默认值）、l2Options（二级可选，可能依赖一级选择）、l2Default、l3Options、l3Default、l4Options（可能依赖三级选择）
- **Acceptance Criteria Addressed**: AC-1 ~ AC-10
- **Test Requirements**:
  - `programmatic` TR-1.1: 配置表结构完整，所有 13 种资产类型均有对应配置项
  - `programmatic` TR-1.2: 每种资产类型的默认值和可选列表符合 spec.md 中的表格定义
  - `human-judgement` TR-1.3: 配置结构清晰易读，便于后续维护扩展
- **Notes**: 保险/房产/实体投资的三级分类不是场内/场外，而是具体业务类型

## [ ] Task 2: 新增弹窗分类联动逻辑实现
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 重写 `categoryL2Options`、`categoryL3Options`、`categoryL4Options` 的 useMemo 计算逻辑，改为基于 CASCADE_OPTIONS 配置动态计算
  - 修改新增弹窗中 market、assetType、categoryL1、categoryL2、categoryL3 的 onChange 处理，上级变化时自动重置下级为默认值（或清空）
  - 保持对 assetClasses 后端配置和 localStorage 自定义选项的兼容
  - 当市场不是"国内市场"时，回退到现有逻辑
- **Acceptance Criteria Addressed**: AC-1 ~ AC-10
- **Test Requirements**:
  - `human-judgement` TR-2.1: 股票类型：一级显示权益类/分红类，默认权益类；二级默认A股；三级默认场内；权益类→四级长期/短期，分红类→四级吃息
  - `human-judgement` TR-2.2: 基金类型：一级默认权益类；二级默认A股；三级可选场内/场外；四级长期/短期
  - `human-judgement` TR-2.3: 债券类型：一级默认债权类；二级默认A股；三级可选场内/场外；场内→国债/可转债，场外→纯债/混合债/地方债/企业债/固收+
  - `human-judgement` TR-2.4: 现金类型：一级默认现金类；二级可选活期存款/定期存款；三级可选场内/场外；活期+场内→货币基金/短融；定期+场外→货币基金/银行理财/定期存款/短期存款
  - `human-judgement` TR-2.5: 期货/期权类型：一级默认权益类；二级默认A股；三级默认场内；四级博弈/对冲
  - `human-judgement` TR-2.6: 外汇类型：一级默认现金类；二级可选欧元/美元/日元/人民币；三级默认场内；四级超期/短期
  - `human-judgement` TR-2.7: 保险类型：一级默认分红类；二级默认A股；三级可选分红险/储蓄险
  - `human-judgement` TR-2.8: 房产/实体投资类型：一级默认分红类；二级默认固定投资；三级分别为房租/营业收益
  - `human-judgement` TR-2.9: 黄金类型：一级默认商品类；二级默认A股；三级可选场内/场外；场内→黄金股/黄金ETF-LOF；场外→实物黄金/银行积存金/纸黄金
  - `human-judgement` TR-2.10: 白银类型：一级默认商品类；二级默认A股；三级默认场内；四级白银股/白银ETF-LOF
  - `human-judgement` TR-2.11: 原油类型：一级默认商品类；二级默认A股；三级默认场内；四级原油股/原油ETF-LOF
- **Notes**: 保险/房产/实体投资的三级分类 select 中可能不再显示"场内/场外"选项，而是直接显示业务类型

## [ ] Task 3: 持仓天数自动递增功能
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 新增 `createdAt` 或 `purchaseDate` 字段（如已有则复用），记录资产录入/买入日期
  - 列表和详情页的 holdingDays 改为动态计算：`当前天数 = 原始天数 + (今天 - 录入日期的天数差)`
  - 若用户手动修改持仓天数，更新录入日期为 `今天 - 新天数`
  - 保存时同时存储原始天数和基准日期，确保跨日刷新后正确累加
- **Acceptance Criteria Addressed**: AC-11
- **Test Requirements**:
  - `programmatic` TR-3.1: 新增资产后，当天显示的天数与录入值一致
  - `programmatic` TR-3.2: 将系统日期设置为录入日+1天后，天数自动 +1
  - `programmatic` TR-3.3: 手动修改天数后保存，刷新后以新天数为基准继续递增
  - `human-judgement` TR-3.4: 列表和详情页显示的天数一致
- **Notes**: 优先在前端计算，避免后端定时任务的复杂度。可以用 `holdingDaysBase`（基准天数）+ `holdingDaysDate`（基准日期）两个字段存储，显示时动态计算

## [x] Task 4: 新增弹窗图片识别确认导入按钮
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在新增弹窗的图片识别结果显示区域底部添加"确认导入"按钮
  - 点击后将 OCR 识别结果填充到 `newAccount` 表单对应字段（名称、代码、成本、数量等）
  - 按钮样式与主操作按钮一致（indigo 背景色）
  - 填充后自动隐藏识别结果区域，回到表单视图
- **Acceptance Criteria Addressed**: AC-12
- **Test Requirements**:
  - `human-judgement` TR-4.1: 上传图片识别完成后，识别结果区域底部有"确认导入"按钮
  - `human-judgement` TR-4.2: 点击确认导入后，表单字段被正确填充，识别结果区域收起
  - `human-judgement` TR-4.3: 按钮样式与整体 UI 风格一致
- **Notes**: 参考 DetailModal 中已有的识别结果校验弹窗实现方式

## [x] Task 5: 构建验证与兼容性测试
- **Priority**: medium
- **Depends On**: Task 1, 2, 3, 4
- **Description**:
  - 运行 `npm run build` 确保无编译错误
  - 验证现有 localStorage 自定义分类选项（categoryL3CustomOptions、categoryL4Options）仍然可用
  - 验证编辑资产时分类联动逻辑正常
  - 验证筛选设置中的分类筛选不受影响
- **Acceptance Criteria Addressed**: AC-1 ~ AC-12
- **Test Requirements**:
  - `programmatic` TR-5.1: npm run build 成功，无 error
  - `human-judgement` TR-5.2: 自定义三级/四级分类选项仍然显示在下拉列表中
  - `human-judgement` TR-5.3: 编辑已有资产时，分类联动正常工作，原有数据不丢失
  - `human-judgement` TR-5.4: 筛选设置中的分类筛选功能正常
- **Notes**: 确保不破坏现有功能
