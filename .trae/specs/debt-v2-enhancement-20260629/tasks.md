# 债务模块 V2 优化 - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 0: 后端数据表结构升级
- **Priority**: high
- **Depends On**: None
- **Description**:
  - schema.sql 新增 debt_categories 表（id, user_id, name, sort_order）
  - schema.sql 的 debts 表新增 debt_category 字段
  - state-service.js loadUserState 加载 debtCategories 和债务类别字段
  - state-service.js saveUserState 保存 debtCategories 和债务类别字段
- **Acceptance Criteria Addressed**: FR-11, FR-12, FR-13
- **Test Requirements**:
  - `programmatic` TR-0.1: schema.sql 中有 debt_categories 表定义
  - `programmatic` TR-0.2: debts 表有 debt_category 字段
  - `programmatic` TR-0.3: loadUserState 返回 debtCategories 数组和每条 debt 的 debtCategory
  - `programmatic` TR-0.4: saveUserState 正确写入 debt_categories 表和 debts.debt_category 字段

## [x] Task 1: 弹窗总金额自动计算（可手动覆盖）+ 移除整行时间筛选 + 版本号更新
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 将弹窗"金额"字段改为"总金额"，默认自动计算 = 本金 + 利息，支持用户手动覆盖
  - 移除整行时间筛选Tab（日常/月统计/年统计/自定义全部移除）
  - 版本号 V1.0.0 → V1.0.2
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-9
- **Test Requirements**:
  - `programmatic` TR-1.1: 弹窗中"总金额"字段标签已更新，默认值 = 本金 + 利息
  - `programmatic` TR-1.2: 顶部没有任何时间筛选Tab行
  - `programmatic` TR-1.3: 左上角版本号显示为 V1.0.2
  - `human-judgement` TR-1.4: 总金额默认自动计算，用户可以手动修改覆盖

## [x] Task 2: 筛选 + 翻页功能
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在列表上方添加搜索筛选框，支持按名称/债权人/备注关键词过滤
  - 实现列表翻页功能，每页固定20条，参考 Finance.jsx 模式
  - 新增数据后自动刷新并定位到对应页
  - 数据从后端 fetchState 获取，前端负责展示和交互
- **Acceptance Criteria Addressed**: AC-3, AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-2.1: 搜索框输入关键词后列表实时过滤
  - `programmatic` TR-2.2: 数据超过20条时显示翻页控件，可前后翻页
  - `programmatic` TR-2.3: 新增债务后列表自动刷新，新数据可见
  - `human-judgement` TR-2.4: 翻页交互流畅，当前页/总页数显示准确

## [ ] Task 3: 3个新增统计卡片
- **Priority**: high
- **Depends On**: Task 0
- **Description**:
  - 新增"总欠款"卡片：显示欠款本金 + 欠款利息
  - 新增"本年待还"卡片：显示当年内到期的待还本金 + 待还利息
  - 新增"本月待还"卡片：显示当月内到期的待还本金 + 待还利息
  - 卡片数据基于后端返回的 debts 数组前端计算
  - 卡片布局与现有统计卡片风格一致
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `programmatic` TR-3.1: 总欠款卡片正确计算所有应付债务的本金和利息合计
  - `programmatic` TR-3.2: 本年待还卡片正确计算当年到期的待还本金和利息
  - `programmatic` TR-3.3: 本月待还卡片正确计算当月到期的待还本金和利息
  - `human-judgement` TR-3.4: 卡片样式美观，与现有卡片风格统一

## [ ] Task 4: 类别字段 + 类别管理（前后端联调）
- **Priority**: high
- **Depends On**: Task 0
- **Description**:
  - 弹窗新增"类别"选择字段，下拉选择（选项来自 state.debtCategories）
  - 类别旁添加设置按钮，点击弹出类别管理弹窗
  - 支持新增/编辑/删除类别，默认类别：信用卡、房贷、车贷、消费贷、亲友借款、其他
  - 类别修改后通过 saveState 持久化到后端 debt_categories 表
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `programmatic` TR-4.1: 弹窗中有类别下拉框和设置按钮
  - `programmatic` TR-4.2: 类别管理弹窗支持新增/编辑/删除
  - `programmatic` TR-4.3: 新增类别后下拉框即时更新，刷新页面后仍存在（后端持久化）
  - `human-judgement` TR-4.4: 类别管理交互符合 Records.jsx 分类管理风格

## [x] Task 5: 列表卡片化（按类别分组，支持展开/收起）
- **Priority**: high
- **Depends On**: Task 2, Task 4
- **Description**:
  - 将应付/借入和应收/借出两个分区的列表改为卡片形式
  - 每个类别一张卡片，卡片标题显示类别名称 + 笔数 + 汇总金额
  - 卡片支持展开/收起，默认展开状态
  - 展开时卡片内显示该类别下所有债务明细（表格形式）
  - 每个分区内支持翻页（按类别卡片整体翻页或列表内翻页）
  - 数据基于后端返回的 debts 数组前端分组
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `programmatic` TR-5.1: 列表按类别分组，每个类别一张卡片
  - `programmatic` TR-5.2: 卡片显示类别名称、笔数、汇总金额
  - `programmatic` TR-5.3: 卡片支持展开/收起切换
  - `programmatic` TR-5.4: 展开时卡片内表格显示该类别所有债务明细
  - `human-judgement` TR-5.5: 卡片布局美观，信息层级清晰

## [x] Task 6: 构建验证 + 功能测试
- **Priority**: high
- **Depends On**: Task 0, 1, 2, 3, 4, 5
- **Description**:
  - 前端 npm run build 验证构建成功
  - 后端服务正常启动，API 正常返回
  - 在浏览器中打开债务模块，逐一验证所有功能
- **Acceptance Criteria Addressed**: AC-1 ~ AC-9
- **Test Requirements**:
  - `programmatic` TR-6.1: 前端 npm run build 构建成功无错误
  - `programmatic` TR-6.2: 后端 state-service 能正确读写 debt_categories 和 debts.debt_category
  - `human-judgement` TR-6.3: 所有功能点手动验证通过

# Task Dependencies
- Task 3, 4, 5 依赖 Task 0（后端表结构）
- Task 5 依赖 Task 2 和 Task 4
- Task 6 依赖所有前置任务
