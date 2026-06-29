# 收支分析功能增强 - 实施计划 (Decomposed and Prioritized Task List)

## [x] Task 1: 后端数据库表结构改造与迁移
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 新增 `books` 表：账本表（id, name, user_id, icon, color, sort_order, created_at）
  - 新增 `tags` 表：标签表（id, name, color, user_id, sort_order, created_at）
  - 新增 `record_tags` 表：记录-标签关联表（record_id, tag_id, user_id）
  - `records` 表增加 `book_id` 字段
  - `custom_record_categories` 表增加 `icon` 字段
  - `exchange_rates` 表扩展为完整汇率表
  - 编写数据迁移脚本，确保现有数据平滑升级
  - 更新 state-service.js 的 loadUserState 和 saveUserState 支持新表
- **Acceptance Criteria Addressed**: AC-11
- **Test Requirements**:
  - `programmatic` TR-1.1: 新增表结构正确创建
  - `programmatic` TR-1.2: 现有数据迁移后不丢失
  - `programmatic` TR-1.3: loadUserState 返回新字段正确读取
  - `programmatic` TR-1.4: saveUserState 正确保存新字段
- **Notes**: 先做后端，再做前端

## [x] Task 2: 修复账本显示问题
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 检查并修复账本新增后收支分析页面不显示的问题
  - 确保账本下拉选择器与后端数据同步
  - 账本切换后数据正确过滤
  - 新增账本管理弹窗
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-2.1: 新增账本后，收支分析页面的账本下拉列表中能立即看到新账本
  - `programmatic` TR-2.2: 切换账本后，记录列表和统计数据只显示该账本的数据
  - `programmatic` TR-2.3: 刷新页面后账本数据保持不变
  - `programmatic` TR-2.4: 选择"全部账本"时显示所有记录
- **Notes**: 问题可能出在 Records.jsx 中 books 状态初始化

## [x] Task 3: 引入 recharts 图表库
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 安装 recharts 依赖
  - 封装柱状图组件（支持多系列、堆叠）
  - 封装折线面积图组件
  - 封装饼图/环形图组件
  - 确保深色/浅色主题兼容
  - 图表支持响应式布局
- **Acceptance Criteria Addressed**: AC-12
- **Test Requirements**:
  - `human-judgement` TR-3.1: 柱状图正常渲染，hover 显示提示
  - `human-judgement` TR-3.2: 折线面积图正常渲染
  - `human-judgement` TR-3.3: 饼图/环形图正常渲染，支持交互高亮
  - `human-judgement` TR-3.4: 深色模式下图表颜色适配
- **Notes**: 使用 recharts，React 生态友好

## [x] Task 4: 重构时间筛选与统计数据层
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 抽离统计计算逻辑为独立的工具函数
  - 实现日统计、月统计、年统计的数据计算函数
  - 实现按时间段筛选记录的通用函数
  - 支持年份切换、月份快捷选择
  - 实现多币种换算逻辑
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-14
- **Test Requirements**:
  - `programmatic` TR-4.1: 月统计能正确计算指定月份的总支出、总收入、总结余
  - `programmatic` TR-4.2: 年统计能正确计算指定年份的总支出、总收入、总结余
  - `programmatic` TR-4.3: 日均数据计算正确（总金额 / 当月天数）
  - `programmatic` TR-4.4: 各月份数据数组正确返回，用于图表渲染
  - `programmatic` TR-4.5: 多币种换算逻辑正确
- **Notes**: 将计算逻辑从组件中抽离，便于复用和测试

## [x] Task 5: 实现月统计页面 UI
- **Priority**: high
- **Depends On**: Task 3, Task 4
- **Description**:
  - 参考图片样式实现月统计顶部 Tab 栏（日常/月统计/年统计/自定义）
  - 实现年份选择 + 月份快捷按钮行
  - 实现月统计蓝色大卡片：月支出/月收入/月结余 + 日均数据
  - 实现转账、还款、收款等特殊类型统计行
  - 实现应付/借入、应收/借出、手续费等统计行
  - 实现报销相关统计行
  - 实现退款相关统计行
  - 实现优惠相关统计行
  - 使用 recharts 实现收支趋势柱状图
  - 使用 recharts 实现资产走势折线面积图
  - 使用 recharts 实现支出/收入占比环形图
- **Acceptance Criteria Addressed**: AC-2, AC-10, AC-12
- **Test Requirements**:
  - `human-judgement` TR-5.1: 月统计页面整体布局与参考图一致
  - `programmatic` TR-5.2: 月支出、月收入、月结余数据正确
  - `programmatic` TR-5.3: 日均数据计算正确
  - `human-judgement` TR-5.4: 蓝色卡片视觉效果美观，渐变背景与参考图相似
  - `human-judgement` TR-5.5: 图表使用 recharts 渲染，交互流畅
- **Notes**: 样式参考用户提供的参考图片

## [x] Task 6: 实现分类排行与报表统计
- **Priority**: medium
- **Depends On**: Task 5
- **Description**:
  - 实现支出数据分类排行列表（带笔数、金额、环比同比）
  - 实现报表统计表格（日期、收入、支出、结余）
  - 分类排行支持一级/二级分类切换
  - 排行数据与时间筛选联动
  - 分类显示图标
- **Acceptance Criteria Addressed**: AC-2, AC-7, AC-10
- **Test Requirements**:
  - `programmatic` TR-6.1: 分类排行数据计算正确，按金额降序排列
  - `programmatic` TR-6.2: 报表统计表格数据正确
  - `human-judgement` TR-6.3: 排行列表样式美观，与参考图一致
  - `human-judgement` TR-6.4: 分类图标正确显示
- **Notes**: 环比同比数据可先显示上月同期对比

## [x] Task 7: 实现年统计页面
- **Priority**: medium
- **Depends On**: Task 5
- **Description**:
  - 实现年统计 Tab 内容
  - 年度总支出/总收入/总结余卡片
  - 各月份收支柱状对比图（recharts）
  - 年度收支趋势折线图（recharts）
  - 年度分类占比饼图（recharts）
  - 年度报表统计
- **Acceptance Criteria Addressed**: AC-3, AC-10, AC-12
- **Test Requirements**:
  - `programmatic` TR-7.1: 年度汇总数据计算正确
  - `programmatic` TR-7.2: 各月份数据数组正确
  - `human-judgement` TR-7.3: 年统计页面布局美观
- **Notes**: 复用月统计的图表组件

## [x] Task 8: 自定义标签功能 - 前端与后端
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - 后端：标签 CRUD API 接口
  - 前端：标签管理弹窗（创建、编辑、删除标签）
  - 新增记录弹窗中增加标签选择器（多选）
  - 记录数据结构增加 tags 字段
  - 记录列表中显示标签
  - 收支分析页面增加标签筛选器
  - 按标签筛选记录和统计数据
- **Acceptance Criteria Addressed**: AC-4, AC-5, AC-6, AC-9
- **Test Requirements**:
  - `programmatic` TR-8.1: 可以创建新标签（名称+颜色）
  - `programmatic` TR-8.2: 可以编辑标签名称和颜色
  - `programmatic` TR-8.3: 可以删除标签
  - `programmatic` TR-8.4: 新增记录时可以选择多个标签
  - `programmatic` TR-8.5: 记录列表中正确显示标签
  - `programmatic` TR-8.6: 按标签筛选后只显示包含该标签的记录
  - `programmatic` TR-8.7: 刷新页面后标签数据保持不变
- **Notes**: 标签选择器使用 tag 样式的多选组件

## [x] Task 9: 分类图标功能 - 前后端
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - 后端：custom_record_categories 表增加 icon 字段
  - 为每个默认分类配置默认图标（使用 lucide-react）
  - 分类管理弹窗中增加图标选择按钮
  - 实现图标选择器弹窗（网格展示可选图标，支持搜索）
  - 分类选择器中显示图标
  - 统计图表中显示图标
  - 记录列表中显示分类图标
  - 图标设置持久化
- **Acceptance Criteria Addressed**: AC-7, AC-8, AC-9
- **Test Requirements**:
  - `programmatic` TR-9.1: 每个默认一级分类都有默认图标
  - `programmatic` TR-9.2: 每个默认二级分类都有默认图标
  - `human-judgement` TR-9.3: 分类选择器中每个分类都显示图标
  - `human-judgement` TR-9.4: 统计图表中显示分类图标
  - `programmatic` TR-9.5: 可以在分类管理中更换图标
  - `programmatic` TR-9.6: 更换图标后所有显示位置同步更新
  - `programmatic` TR-9.7: 刷新页面后图标设置保持不变
- **Notes**: 从 lucide-react 中选择与分类语义匹配的图标

## [x] Task 10: 多币种统计功能
- **Priority**: medium
- **Depends On**: Task 4, Task 5
- **Description**:
  - 新增记录时支持选择币种
  - 汇率设置界面
  - 统计页面支持切换显示币种（各币种独立显示 / 基准币种换算显示）
  - 多币种汇总显示（按基准币种换算）
  - 汇率数据持久化
- **Acceptance Criteria Addressed**: AC-13, AC-14
- **Test Requirements**:
  - `programmatic` TR-10.1: 新增记录时可以选择币种
  - `programmatic` TR-10.2: 记录列表中显示币种符号
  - `programmatic` TR-10.3: 可以设置汇率
  - `programmatic` TR-10.4: 统计数据支持按基准币种换算
  - `programmatic` TR-10.5: 支持分币种查看统计
  - `programmatic` TR-10.6: 汇率数据持久化，刷新不丢失
- **Notes**: 基准币种默认为 CNY

## [x] Task 11: 整体联调与优化
- **Priority**: medium
- **Depends On**: Task 6, Task 7, Task 8, Task 9, Task 10
- **Description**:
  - 确保所有模块之间数据联动正确
  - 优化性能，减少不必要的重渲染
  - 深色/浅色主题兼容检查
  - 边界情况处理（无数据、单条数据等）
  - 代码整理与注释
- **Acceptance Criteria Addressed**: AC-9, AC-10
- **Test Requirements**:
  - `programmatic` TR-11.1: 所有筛选条件组合使用时数据正确
  - `human-judgement` TR-11.2: 深色模式下所有组件显示正常
  - `human-judgement` TR-11.3: 无数据时空状态提示友好
  - `programmatic` TR-11.4: 刷新页面后所有设置保持不变
- **Notes**: 最终整合测试
