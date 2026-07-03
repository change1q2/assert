# 外部工具组管理 - 实施计划

## [x] Task 1: 定义分组数据结构和默认分组
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改数据结构，添加groups数组和tool的groupId字段
  - 定义默认分组：名人追踪、AI追踪、其他工具（默认组）
  - 为现有工具分配默认分组ID
- **Acceptance Criteria Addressed**: [AC-1, AC-5, AC-6]
- **Test Requirements**:
  - `human-judgement` TR-1.1: 默认分组正确显示，现有工具分配到正确分组
  - `human-judgement` TR-1.2: 数据保存后刷新页面分组结构保持不变

## [x] Task 2: 修改配置模态框 - 添加分组管理区域
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 在配置模态框中添加分组管理区域
  - 实现添加新分组功能
  - 实现编辑分组名称和描述功能
  - 实现删除分组功能（非默认组）
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3, AC-4]
- **Test Requirements**:
  - `human-judgement` TR-2.1: 分组管理界面布局合理，操作直观
  - `human-judgement` TR-2.2: 添加分组后立即显示在列表中
  - `human-judgement` TR-2.3: 编辑分组后名称和描述更新
  - `human-judgement` TR-2.4: 删除分组有确认提示，删除后工具移到默认组

## [x] Task 3: 修改配置模态框 - 添加工具时选择分组
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 在添加工具表单中添加分组选择下拉框
  - 默认选中第一个分组
  - 添加工具时将groupId保存到工具对象
- **Acceptance Criteria Addressed**: [AC-5]
- **Test Requirements**:
  - `human-judgement` TR-3.1: 添加工具表单中有分组选择下拉框
  - `human-judgement` TR-3.2: 选择分组后工具正确归类到该组

## [x] Task 4: 修改工具列表渲染逻辑
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 移除硬编码的分组filter逻辑
  - 改为按groups数组动态渲染分组和工具
  - 保持内置工具不可修改
- **Acceptance Criteria Addressed**: [AC-1, AC-6]
- **Test Requirements**:
  - `human-judgement` TR-4.1: 分组按配置动态显示，顺序正确
  - `human-judgement` TR-4.2: 每个分组下显示正确的工具
  - `human-judgement` TR-4.3: 内置工具组保持不变

## [x] Task 5: 测试验证
- **Priority**: high
- **Depends On**: Task 1-4
- **Description**: 
  - 测试创建、编辑、删除分组
  - 测试添加工具选择分组
  - 测试数据持久化
  - 测试删除分组时工具迁移
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3, AC-4, AC-5, AC-6]
- **Test Requirements**:
  - `human-judgement` TR-5.1: 所有功能正常工作
  - `human-judgement` TR-5.2: 刷新页面后数据保持
  - `human-judgement` TR-5.3: 删除分组后工具正确迁移到默认组