# 理财模块功能增强 - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: 列表筛选功能（默认筛选 + 高级筛选）
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 CategoryTable 组件顶部添加筛选栏，默认显示：代码/名称搜索、所属账户下拉、市场下拉、货币下拉
  - 添加"高级筛选"按钮，点击展开显示更多筛选：资产类型、资产分类一级、资产分类二级、持仓分组、持位分类、标签
  - 筛选逻辑：多条件 AND 组合，筛选变化后重置到第 1 页
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgment` TR-1.1: 默认筛选器显示4个（代码/名称、账户、市场、货币）
  - `human-judgment` TR-1.2: 点击高级筛选展开/收起更多筛选项
  - `human-judgment` TR-1.3: 筛选后列表数据正确过滤

## [x] Task 2: 列表字段设置（自定义显示 + 排序）
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 添加"列设置"按钮，点击弹出设置面板
  - 面板中列出所有可用字段，带复选框可切换显示/隐藏
  - 支持拖拽调整列顺序（或上下箭头按钮）
  - 设置状态持久化到 localStorage（key: `finance_table_columns`）
  - 表格列根据设置动态渲染
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgment` TR-2.1: 列设置按钮存在，点击弹出面板
  - `human-judgment` TR-2.2: 复选框可切换列显示/隐藏
  - `human-judgment` TR-2.3: 可调整列顺序
  - `programmatic` TR-2.4: 刷新页面后设置保持（localStorage 验证）

## [x] Task 3: 行操作列（编辑 + 删除）
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在列表最后增加"操作"列，包含编辑（Edit2图标）和删除（Trash2图标）按钮
  - 点击编辑：打开编辑弹窗，数据预填，保存后更新数据
  - 点击删除：弹出确认对话框，确认后调用删除接口并刷新
  - 新增 updateAccount 和 deleteAccount API 函数（如不存在）
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgment` TR-3.1: 每行末尾有编辑和删除按钮
  - `human-judgment` TR-3.2: 点击编辑打开弹窗且数据正确预填
  - `human-judgment` TR-3.3: 点击删除弹出确认，确认后数据删除

## [x] Task 4: 新增弹窗 - 代码/名称搜索联想 + 自动获取现价
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 资产代码输入框增加防抖搜索（300ms），调用 /api/finance/lookup 接口
  - 搜索结果以下拉列表形式展示（代码 + 名称）
  - 选择后自动填充代码、名称，并调用 getQuotes 获取现价自动填入
  - 资产名称输入框也支持同样的搜索联想
  - 新增 lookupSecurities 和 fetchQuote API 封装函数
- **Acceptance Criteria Addressed**: AC-4, AC-8（行情来源）
- **Test Requirements**:
  - `human-judgment` TR-4.1: 输入代码时显示匹配下拉列表
  - `human-judgment` TR-4.2: 选择后自动填充代码和名称
  - `human-judgment` TR-4.3: 现价自动获取并填入

## [x] Task 5: 新增弹窗 - 字段调整（必填、删除、自动计算）
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 持仓成本和份额/数量添加必填标记（红色星号），保存前校验
  - 删除"买入均价"字段
  - 删除"当日参考盈亏"和"当日收益率"字段
  - 持仓盈亏 = (现价 - 成本价) × 数量，自动计算且可手动编辑
  - 盈亏率 = 持仓盈亏 / 成本 × 100%，自动计算且可手动编辑
  - 当前价值 = 数量 × 现价，自动计算且可手动编辑
  - 重置表单时恢复默认值
- **Acceptance Criteria Addressed**: AC-5, AC-7（当前价值自动计算）
- **Test Requirements**:
  - `human-judgment` TR-5.1: 持仓成本和份额/数量有必填标记
  - `human-judgment` TR-5.2: 买入均价字段已删除
  - `human-judgment` TR-5.3: 当日盈亏和日收益率字段已删除
  - `human-judgment` TR-5.4: 持仓盈亏和盈亏率自动计算且可编辑
  - `human-judgment` TR-5.5: 当前价值自动计算且可编辑

## [x] Task 6: 国内市场默认 CNY + 资产分类联动
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - 市场为"国内市场"时，货币单位自动填充为 "CNY"
  - 切换市场时相应调整货币单位默认值（港股→HKD，美股→USD）
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `programmatic` TR-6.1: 选择国内市场时 currency 为 CNY
  - `human-judgment` TR-6.2: 切换市场时货币单位相应更新

## [x] Task 7: 列表字段完整性 + 当日盈亏自动计算
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 资产分类一级下拉选项从 state.assetClasses 获取（取 name 字段）
  - 资产分类二级根据选中的一级分类动态过滤（children）
  - 删除硬编码的 CATEGORY_L1_OPTIONS 和 CATEGORY_L2_OPTIONS
  - 资产三级分类也从 assetClasses 的三级分类获取
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `human-judgment` TR-7.1: 资产分类下拉选项与资产分类模块一致
  - `human-judgment` TR-7.2: 二级分类随一级分类联动变化

## [x] Task 8: 列表分页（全局分页 + 每页条数）
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - 确保表格列包含新增弹窗的所有字段（市场、货币、资产类型、所属账户、资产分类一二三、持仓分组、持位分类、名称、代码、持仓成本、数量、现价、持仓天数、当前价值、持仓盈亏、盈亏率、当日盈亏、日收益率、标签）
  - 页面加载时批量获取有代码的持仓的实时行情
  - 根据实时行情计算当日盈亏 = (现价 - 昨收) × 数量
  - 当日收益率 = 当日盈亏 / 昨收市值 × 100%
  - "其他"分类也使用标准表格展示
- **Acceptance Criteria Addressed**: AC-8, AC-10, AC-11
- **Test Requirements**:
  - `human-judgment` TR-8.1: 列表字段完整，包含新增弹窗所有字段
  - `human-judgment` TR-8.2: 当日盈亏和日收益率有数值显示
  - `human-judgment` TR-8.3: "其他"分类使用标准表格

## [x] Task 9: 构建验证
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - 将当前按分类分组展示改为统一的全局列表视图（或保留分类标签但数据统一分页）
  - 添加分页组件，支持切换页码、每页条数选择
  - 默认每页 10 条
  - 分页状态随筛选变化重置到第 1 页
- **Acceptance Criteria Addressed**: AC-9, AC-13
- **Test Requirements**:
  - `human-judgment` TR-9.1: 列表底部有分页控件
  - `human-judgment` TR-9.2: 可切换页码，数据正确更新
  - `human-judgment` TR-9.3: 筛选变化后回到第 1 页

## [ ] Task 10: 构建验证
- **Priority**: high
- **Depends On**: Task 1-9
- **Description**:
  - 运行 npm run build 确保无构建错误
  - 浏览器中手动验证所有功能
- **Acceptance Criteria Addressed**: All
- **Test Requirements**:
  - `programmatic` TR-10.1: npm run build 退出码为 0
  - `human-judgment` TR-10.2: 所有功能在浏览器中验证通过

# Task Dependencies
- Task 8 depends on Task 2
- Task 9 depends on Task 1
- Task 10 depends on Tasks 1, 2, 3, 4, 5, 6, 7, 8, 9
- All other tasks are independent and can be parallelized
