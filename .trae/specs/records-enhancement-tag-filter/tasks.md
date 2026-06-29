# 收支分析功能增强 - 实现计划

## [x] Task 1: 在新增记录弹窗中添加标签输入字段
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在新增收支记录弹窗的表单中，备注字段下方添加标签输入字段
  - 更新 newRecord 状态对象，添加 tag 字段
  - 确保标签值在保存时被正确传递
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `human-judgment` TR-1.1: 打开新增弹窗，确认标签输入框存在且可输入
  - `human-judgment` TR-1.2: 输入标签值后保存，确认记录中包含标签信息

## [x] Task 2: 调整列表筛选项布局
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 将当前位于表头下方第二行的筛选项移至日期/账本表头行上方
  - 修改表格结构，使筛选项作为独立行显示在表头上方
  - 确保筛选功能正常工作
- **Acceptance Criteria Addressed**: [AC-2, AC-4]
- **Test Requirements**:
  - `human-judgment` TR-2.1: 查看收支记录列表，确认筛选项在表头上方
  - `human-judgment` TR-2.2: 使用筛选功能，确认筛选结果正确

## [x] Task 3: 确保标签字段前后端数据同步
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 修改前端 `handleAddRecord` 函数，将标签数据正确传递
  - 确保后端 `state-service.js` 正确处理记录的标签字段
  - 验证前端从后端加载记录时正确解析标签字段
- **Acceptance Criteria Addressed**: [AC-3]
- **Test Requirements**:
  - `programmatic` TR-3.1: 新增带标签的记录后，调用 `/api/state` 验证数据包含标签
  - `human-judgment` TR-3.2: 刷新页面后，确认标签字段正确显示

## [x] Task 4: 验证整体功能
- **Priority**: medium
- **Depends On**: Task 1, Task 2, Task 3
- **Description**: 
  - 端到端测试新增记录、筛选、刷新等功能
  - 确保所有功能正常工作
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3, AC-4]
- **Test Requirements**:
  - `human-judgment` TR-4.1: 完整测试新增记录流程（输入标签并保存）
  - `human-judgment` TR-4.2: 测试筛选功能（按标签筛选）
  - `human-judgment` TR-4.3: 测试刷新后数据一致性