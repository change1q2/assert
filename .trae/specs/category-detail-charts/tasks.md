# 分类详情页图表增强 - Implementation Plan

## [x] Task 1: 修复详情页空白问题（已修复）
- **Priority**: high
- **Depends On**: None
- **Description**: 添加缺失的 ArrowLeft 导入
- **Test Requirements**:
  - `programmatic`: 页面能正常渲染

## [ ] Task 2: 详情页右上角新增按钮
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 在详情页顶部右侧添加"+ 新增"按钮，与返回按钮并排
- **Test Requirements**:
  - `human-judgment`: 按钮显示在右上角
  - `programmatic`: 点击按钮打开添加资产类型弹窗

## [ ] Task 3: 资产类型占比饼图
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 在详情页第一行左侧添加饼图，展示该分类下各资产类型占比
- **Test Requirements**:
  - `human-judgment`: 饼图显示正确，图例清晰
  - `programmatic`: 各类型占比之和为100%

## [ ] Task 4: 资产类型金额柱状图
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 在详情页第一行右侧添加柱状图，展示各资产类型金额
- **Test Requirements**:
  - `human-judgment`: 柱状图显示正确，数值清晰
  - `programmatic`: 柱状图数据与列表数据一致

## [ ] Task 5: 海内外对比图
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 在详情页第二行添加海内外资产对比饼图
- **Test Requirements**:
  - `human-judgment`: 对比图显示正确，国内/海外标签清晰
  - `programmatic`: 占比之和为100%

## [ ] Task 6: 货币切换功能
- **Priority**: high
- **Depends On**: Task 3, Task 4, Task 5
- **Description**: 添加CNY/USD切换按钮，切换后海外资产按汇率换算
- **Test Requirements**:
  - `programmatic`: 切换CNY时显示人民币金额
  - `programmatic`: 切换USD时海外资产按7.2汇率换算显示
  - `human-judgment`: 切换流畅，无卡顿

## [ ] Task 7: 整体联调测试
- **Priority**: medium
- **Depends On**: All previous tasks
- **Description**: 测试所有功能联动，修复边界情况
- **Test Requirements**:
  - `human-judgment`: 整体布局协调，视觉统一
  - `human-judgment`: 响应式布局正常

## [x] Task 8: 右上角"新增资产类型"按钮改为"编辑"按钮
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 移除右上角"+ 新增"按钮，改为"编辑"按钮（Edit2 图标）
  - 点击打开编辑弹窗，可编辑 targetValue（目标价值）和 expectedReturn（期望收益率）
  - 保存时通过 saveState 更新 stateData.assetClasses 中对应分类，并持久化到后端
- **Test Requirements**:
  - `human-judgment`: 右上角显示"编辑"按钮而非"新增"按钮
  - `programmatic`: 点击编辑按钮打开弹窗，保存后 targetValue/expectedReturn 更新生效

## [x] Task 9: 第二行添加目标对比卡片
- **Priority**: high
- **Depends On**: Task 8
- **Description**:
  - 在第二行添加对比卡片，展示：当前价值 vs 目标价值、当前收益率 vs 期望收益率
  - 数据来源：stateData.accounts 中 categoryL1 === 当前分类 的账户聚合
  - 当前价值 = Σ currentValue，当前收益率 = (当前价值 − 总成本) / 总成本 × 100%
  - 使用箭头(→)和进度条直观展示对比
- **Test Requirements**:
  - `human-judgment`: 对比卡片显示当前值与目标值的对比
  - `programmatic`: 数据与权益类持仓聚合一致

## [x] Task 10: 资产类型占比饼图（按 assetType）
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 资产类型占比饼图，数据来自权益类持仓（categoryL1 === 当前分类）
  - 按 assetType 聚合 currentValue
  - 使用 recharts PieChart，保留现有实现
- **Test Requirements**:
  - `human-judgment`: 饼图显示各资产类型占比
  - `programmatic`: 占比之和为 100%

## [x] Task 11: 海内外对比饼图（国内/港股/美股/其他）
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 海内外对比饼图细分为 4 段：国内市场、港股市场、美股市场、其他市场
  - 数据来源：stateData.accounts 中 categoryL1 === 当前分类 的账户
  - 按 market 字段分类：包含"港股"归港股市场，包含"美股"归美股市场，空/国内归国内市场，其余归其他市场
- **Test Requirements**:
  - `human-judgment`: 饼图显示 4 段分类
  - `programmatic`: 4 段占比之和为 100%

## [x] Task 12: 持仓明细列表（延用 Finance.jsx 筛选/搜索/列设置）
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 添加持仓明细列表，仅展示 categoryL1 === 当前分类 的持仓
  - 延用 Finance.jsx 的 CategoryTable 模式：筛选、搜索、列设置、分页
  - 列设置持久化到 localStorage（key: category_detail_column_settings_<分类名>）
  - 筛选设置持久化到 localStorage（key: category_detail_filter_settings_<分类名>）
  - 分页大小持久化到 localStorage（key: category_detail_page_size_<分类名>）
  - 包含筛选汇总卡片（6 项指标：当前总市值、持仓总成本、持仓总盈亏、持仓总收益率、当日总盈亏、当日总收益率）
- **Test Requirements**:
  - `human-judgment`: 列表显示权益类持仓数据
  - `programmatic`: 筛选/搜索/列设置/分页功能正常
  - `programmatic`: 设置持久化到 localStorage

## [x] Task 13: 构建验证
- **Priority**: high
- **Depends On**: Task 8, Task 9, Task 10, Task 11, Task 12
- **Description**: 运行 `cd assert_WEB && npm run build` 验证构建成功
- **Test Requirements**:
  - `programmatic`: 构建无错误
