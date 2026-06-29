# 收支分析 UI/UX 优化 - 实施计划

## [ ] Task 1: 日历收支展示优化
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改 Records.jsx 中日历单元格渲染逻辑，将每日收入/支出金额直接放在日期数字下方
  - 收入金额用绿色 + 前缀，支出金额用红色 - 前缀，居中对齐排列
  - 放大日历单元格高度和间距（min-h 从当前值增加，grid gap 增大）
  - 确保小字体下文字不重叠、不截断
  - 收支金额为空时显示占位符保持布局稳定
- **Files**: assert_WEB/src/pages/Records.jsx（renderCalendar 函数相关部分）
- **Verification**: 打开日常 Tab，日历中每个日期下方正确显示收支金额，布局整齐无重叠

## [ ] Task 2: 筛选项布局重构
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 重构 Records.jsx 顶部紫色渐变 section 中的筛选器布局
  - 将全部账本、全部标签、币种筛选器统一放在同一行白色卡片区域（或紧邻操作按钮行）
  - 移除独立的「账本管理」「标签管理」「汇率设置」等设置按钮
  - 币种筛选器位置调整到刷新数据按钮前面
  - 保持响应式布局（移动端自动换行）
- **Files**: assert_WEB/src/pages/Records.jsx（顶部 section 筛选器区域）
- **Verification**: 页面顶部筛选项统一排列，无独立设置按钮，布局整齐

## [ ] Task 3: 新增弹窗增加设置入口和币种选择
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - 在新增收支弹窗底部或侧边增加「设置」折叠面板/Tab
  - 设置面板内包含：账本管理入口、标签管理入口、分类管理入口、汇率设置入口
  - 在新增弹窗表单中增加「币种」下拉选择字段，默认当前基准币种
  - 币种选择后，金额输入框旁显示对应币种符号
- **Files**: assert_WEB/src/pages/Records.jsx（新增弹窗 JSX 部分）
- **Verification**: 打开新增弹窗，能看到币种选择器和设置入口，保存后记录携带币种信息

## [ ] Task 4: 实时汇率对接
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 assert_WEB/src/api/index.js 中新增 fetchExchangeRates API 函数
  - 使用 exchangerate-api.com（或类似免费 API）获取实时汇率
  - 页面加载时自动调用，获取 CNY 为基准的汇率数据
  - 汇率数据存入 state，显示最后更新时间
  - 保留手动覆盖汇率的能力（高级设置中）
  - 添加 API 失败时的降级处理（使用上次缓存的汇率或默认汇率）
- **Files**: assert_WEB/src/api/index.js、assert_WEB/src/utils/currency.js
- **Verification**: 页面加载后汇率自动更新，控制台能看到汇率数据，失败时页面正常显示

## [ ] Task 5: 币种切换全局生效
- **Priority**: high
- **Depends On**: Task 4
- **Description**:
  - 修改 Records.jsx 中金额显示逻辑，当用户切换币种筛选器时
  - 所有金额（总收入、总支出、净收入、记录列表、图表数据）都按当前汇率换算为目标币种
  - 金额旁显示目标币种符号
  - 修改 formatAmount 工具函数支持币种参数
  - 图表数据在渲染前进行币种换算
- **Files**: assert_WEB/src/pages/Records.jsx、assert_WEB/src/utils/currency.js
- **Verification**: 切换币种后，页面所有金额实时换算并显示对应币种符号

## [ ] Task 6: 收入/支出占比显示分类图标
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - 修改 Records.jsx 中收入占比和支出占比的渲染逻辑
  - 每个分类行左侧显示对应分类的图标（从分类配置中获取 icon 字段）
  - 图标使用 lucide-react 动态渲染（根据 icon 名称映射到对应组件）
  - 图标与分类名称、占比百分比一同展示，保持列表整齐
- **Files**: assert_WEB/src/pages/Records.jsx（收入占比/支出占比 section）
- **Verification**: 收入占比和支出占比列表中，每个分类前都有对应图标

## [ ] Task 7: 记录列表字段增强
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改 Records.jsx 中收支记录列表表格结构
  - 增加「一级分类」「二级分类」两列（从 record.category 和 record.subCategory 读取）
  - 金额列旁显示对应币种标签（如 ¥、$）
  - 新增「折合人民币」列，显示按汇率换算后的 CNY 金额
  - 新增「标签」列，显示记录关联的标签（tag pills）
  - 新增「备注」列，显示记录备注
  - 保持响应式，列数增多时支持横向滚动
- **Files**: assert_WEB/src/pages/Records.jsx（收支记录列表表格部分）
- **Verification**: 记录列表显示完整字段，数据正确，布局不混乱

## [ ] Task 8: 列表字段筛选行
- **Priority**: medium
- **Depends On**: Task 7
- **Description**:
  - 在记录列表表头下方增加一行筛选控件
  - 每个可见字段对应一个筛选输入框或下拉选择器
  - 文本字段支持模糊匹配（日期、账本、分类、备注等）
  - 下拉字段支持精确匹配（类型：收入/支出）
  - 筛选条件变化时实时过滤记录列表
  - 增加「重置筛选」按钮
- **Files**: assert_WEB/src/pages/Records.jsx（记录列表筛选部分）
- **Verification**: 在筛选行输入条件，记录列表实时过滤，重置按钮清空条件

## [ ] Task 9: 记录列表分页
- **Priority**: high
- **Depends On**: Task 7
- **Description**:
  - 在 Records.jsx 记录列表中实现客户端分页逻辑
  - 每页默认 20 条，支持切换 10/20/50/100 条每页
  - 列表底部增加分页控件：上一页、下一页、页码输入框、总页数显示
  - 当前页码用 React state 管理
  - 筛选条件变化后自动回到第 1 页
  - 排序变化后保持在当前页（或在合理范围内调整）
  - 分页基于筛选后的记录数组进行切片
- **Files**: assert_WEB/src/pages/Records.jsx（记录列表分页部分）
- **Verification**: 记录列表底部有分页控件，切换页码正常，筛选后回到第 1 页

## [ ] Task 10: 高级列表列设置
- **Priority**: medium
- **Depends On**: Task 7
- **Description**:
  - 在记录列表右上角增加「高级列表设置」按钮（齿轮图标）
  - 点击弹出设置面板，包含：
    - 所有可选列的复选框列表（日期、账本、类型、一级分类、二级分类、金额、折合人民币、标签、备注）
    - 拖拽调整列显示顺序
    - 列宽拖拽调整（表头 resize handle）
  - 设置状态保存到 React state，刷新页面后从 state 恢复
  - 面板使用 Modal/Popover 形式，点击外部关闭
- **Files**: assert_WEB/src/pages/Records.jsx（记录列表设置面板）
- **Verification**: 点击设置按钮弹出面板，勾选/取消勾选控制列显示，拖拽调整顺序和宽度

## [ ] Task 11: 整体联调与边界处理
- **Priority**: medium
- **Depends On**: Task 1-10
- **Description**:
  - 确保所有模块联动正常（币种切换 + 列表显示 + 筛选 + 分页 + 图表）
  - 处理无数据/空状态：各模块有友好的空提示
  - 深色/浅色主题兼容性检查
  - 移动端响应式检查（筛选项换行、表格横向滚动）
  - 性能检查：大量记录（>500条）时筛选和渲染不卡顿
- **Files**: assert_WEB/src/pages/Records.jsx
- **Verification**: 各功能组合使用正常，深色模式显示正常，无数据时有空状态提示

# Task Dependencies
- Task 3 depends on Task 2
- Task 5 depends on Task 4
- Task 8 depends on Task 7
- Task 9 depends on Task 7
- Task 10 depends on Task 7
- Task 11 depends on Task 1-10
