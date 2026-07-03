# 资产分类多层级 & 饼图穿透 - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: 数据层重构 - 从理财模块自动聚合资产分类数据
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 重构 `computeStatsForClasses` 及相关数据计算逻辑，新增从 `state.accounts`（理财模块数据）按 `categoryL1` 聚合的功能
  - 新增海内外市场分组计算逻辑（国内市场 vs 海外市场）
  - 新增按资产类型（assetType）分组聚合的计算函数，用于饼图穿透和二级列表
  - 保持现有手动输入价值的兼容（当理财模块无数据时回退）
- **Acceptance Criteria Addressed**: AC-6, AC-7
- **Test Requirements**:
  - `programmatic` TR-1.1: 当理财模块有数据时，资产分类价值 = 对应 categoryL1 资产的 currentValue 之和，数值误差为 0
  - `programmatic` TR-1.2: 海内外分组正确：国内市场 → 国内，港股/美股/其他 → 海外
  - `programmatic` TR-1.3: 按 assetType 分组聚合函数返回正确的分类数据
  - `human-judgement` TR-1.4: 数据计算逻辑清晰，代码可读性良好，函数命名准确
- **Notes**: 海外市场归类逻辑：MARKET_OPTIONS 中不等于"国内市场"的都归为海外

## [x] Task 2: 一级分类添加/编辑表单 - 名称改下拉选择
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 将添加/编辑分类弹窗中的"分类名称"从文本输入改为下拉选择框
  - 下拉选项与理财模块 CATEGORY_L1_OPTIONS 一致：权益类、固收类、现金类、另类投资、商品
  - 选择分类后自动填充对应颜色（从预设颜色映射）
  - 新增分类时检查是否已存在同名分类
- **Acceptance Criteria Addressed**: AC-1, AC-6
- **Test Requirements**:
  - `programmatic` TR-2.1: 添加分类弹窗中分类名称为 select 元素，包含 5 个一级分类选项
  - `programmatic` TR-2.2: 选择不同分类时颜色自动切换
  - `programmatic` TR-2.3: 重复添加同名分类时提示错误
  - `human-judgement` TR-2.4: 下拉样式与现有表单风格一致，交互流畅
- **Notes**: 颜色映射参考：权益类=#6366F1, 固收类=#10B981, 现金类=#06B6D4, 另类投资=#8B5CF6, 商品=#F59E0B

## [x] Task 3: 二级资产类型列表 - 多层级结构实现
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 改造现有二级分类展开区域，从简单文本列表改为结构化的资产类型列表
  - 二级列表项包含：市场标签、资产类型名称、当前价值、盈亏/盈亏率
  - 数据从理财模块按 `categoryL1 + assetType + market` 自动聚合
  - 保留手动添加二级项的功能（使用 prompt 或简化弹窗）
  - 二级列表支持滚动，高度限制在合理范围
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `programmatic` TR-3.1: 展开一级分类后，二级列表显示该分类下所有资产类型分组
  - `programmatic` TR-3.2: 每个二级项显示市场标签（国内/海外）、资产类型名称、价值
  - `programmatic` TR-3.3: 各二级项价值之和 = 一级分类总价值
  - `human-judgement` TR-3.4: 二级列表视觉层次清晰，与一级卡片风格统一
- **Notes**: 二级列表按价值降序排列

## [x] Task 4: 二级资产类型添加 - 市场和资产类型下拉联动
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - 将二级分类添加方式从简单 prompt 改为带表单的弹窗或内联表单
  - 市场下拉仅 2 个选项：国内市场、海外市场
  - 资产类型下拉与理财模块 ASSET_TYPE_OPTIONS 联动：股票、基金、债券、期货、期权、外汇、数字货币、银行理财、保险、房产、其他
  - 添加后自动从理财模块匹配数据并计算价值
- **Acceptance Criteria Addressed**: AC-2, AC-3
- **Test Requirements**:
  - `programmatic` TR-4.1: 添加二级资产类型时，市场下拉只有 2 个选项
  - `programmatic` TR-4.2: 资产类型下拉包含完整的 11 个选项
  - `programmatic` TR-4.3: 添加后数据正确聚合显示
  - `human-judgement` TR-4.4: 表单交互体验流畅，符合预期
- **Notes**: 海外市场在存储时统一存为"海外市场"，匹配时按非国内市场归类

## [x] Task 5: 海内外资产占比饼图
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - 在图表区域新增第四个卡片（或调整现有三栏布局为四栏/两排）
  - 饼图标题："海内外资产占比"
  - 数据：国内资产 vs 海外资产，两组数据
  - 样式与现有饼图一致：环形图、中心显示总资产、自定义 tooltip
  - 颜色：国内用蓝色系，海外用橙色系
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-5.1: 页面渲染后海内外饼图存在，数据正确
  - `programmatic` TR-5.2: 国内占比 + 海外占比 = 100%
  - `human-judgement` TR-5.3: 饼图样式与现有三个图表协调统一
  - `human-judgement` TR-5.4: tooltip 显示金额和百分比，格式正确
- **Notes**: 图表区域布局从 3 列改为 4 列（lg:grid-cols-4），或保持 3 列新增一行

## [x] Task 6: 资产分类饼图穿透下钻功能
- **Priority**: high
- **Depends On**: Task 1, Task 5
- **Description**:
  - 改造"资产分类占比"饼图，支持点击扇区穿透
  - 点击某分类后，饼图切换为该分类下的资产类型占比（股票、基金、债券等）
  - 新增面包屑导航/返回按钮，可回到一级视图
  - 穿透状态有明确的视觉标识（标题变更、返回箭头）
  - 过渡动画：淡入淡出效果
- **Acceptance Criteria Addressed**: AC-5, AC-8
- **Test Requirements**:
  - `programmatic` TR-6.1: 点击饼图扇区触发穿透，饼图数据切换为资产类型分组
  - `programmatic` TR-6.2: 穿透后各资产类型占比之和 = 100%（该分类内）
  - `programmatic` TR-6.3: 点击返回按钮回到一级分类视图
  - `human-judgement` TR-6.4: 穿透交互自然，面包屑/返回按钮清晰易用
  - `human-judgement` TR-6.5: 过渡动画平滑，不突兀
- **Notes**: 使用 recharts 的 Pie 组件 onClick 事件实现穿透；状态用 useState 管理当前穿透层级

## [x] Task 7: 整体联调和细节优化
- **Priority**: medium
- **Depends On**: Task 2, Task 4, Task 6
- **Description**:
  - 整体测试各功能模块联动是否正常
  - 修复边界情况：空数据状态、单分类穿透、全海外/全国内场景
  - 移动端适配检查和修复
  - 代码清理：移除无用的旧逻辑、统一变量命名
- **Acceptance Criteria Addressed**: AC-1 ~ AC-8
- **Test Requirements**:
  - `programmatic` TR-7.1: 无数据时各模块显示"暂无数据"占位
  - `human-judgement` TR-7.2: 移动端（< 768px）布局正常，图表和列表可滚动
  - `human-judgement` TR-7.3: 整体视觉风格统一，无明显违和
  - `human-judgement` TR-7.4: 代码结构清晰，无冗余逻辑
- **Notes**: 此任务为质量保障，覆盖所有 AC 的回归验证

## [/] Task 8: 分类详情视图 - 点击卡片进入下一层级显示资产类型明细
- **Priority**: high
- **Depends On**: Task 3, Task 4, Task 6
- **Description**:
  - 将分类列表从卡片内展开改为双层视图：总览网格 + 详情页
  - 点击分类卡片进入详情页，详情页显示该分类的资产类型明细
  - 在详情页中提供"添加类型"按钮
  - 返回按钮可回到分类总览网格
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `programmatic` TR-8.1: 点击分类卡片后切换到详情视图
  - `programmatic` TR-8.2: 详情页显示该分类的资产类型明细
  - `programmatic` TR-8.3: 详情页提供添加类型按钮
  - `human-judgement` TR-8.4: 详情页布局清晰，与现有风格统一
- **Notes**: 详情页复用现有二级列表渲染逻辑
