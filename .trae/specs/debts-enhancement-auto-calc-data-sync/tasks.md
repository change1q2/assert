# 债务模块增强 - 实现计划

## [x] Task 1: 修复自动计算总金额填入金额字段
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 Debts.jsx 中的 useEffect 或表单处理逻辑，当 repaymentPlan 计算完成且用户未手动覆盖金额时，自动将计算结果填入金额字段
  - 当前代码在输入本金和利率时有尝试更新金额，但逻辑有问题（在 onChange 中使用了还未更新的 repaymentPlan）
  - 需要使用 useEffect 监听 repaymentPlan 变化，当变化时自动更新金额字段
- **Acceptance Criteria Addressed**: [AC-1, AC-2]
- **Test Requirements**:
  - `human-judgment` TR-1.1: 打开新增债务弹窗，输入本金、利率、日期和还款方式，确认金额字段自动填入计算结果
  - `human-judgment` TR-1.2: 金额字段下方显示自动计算结果，包含本金和利息明细

## [x] Task 2: 修复前后端数据结构不一致问题
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 分析前端保存的数据字段与后端期望的字段映射关系
  - 前端 handleSave 发送的数据：category, type, debtCategory, creditor, debtor, principal, annualRate, amount, paidAmount, remainingAmount, id, startDate, dueDate, repaymentMethod, attachment, note
  - 后端 loadUserState 返回的数据：id, category, type, debtCategory, name, creditor, debtor, creditorName, debtorName, principal, annualRate, amount, paidAmount, note, attachment, startDate, dueDate, repaymentMethod, payments
  - 需要确保前端保存的数据字段与后端保存逻辑一致，后端返回的数据字段与前端渲染逻辑一致
- **Acceptance Criteria Addressed**: [AC-3, AC-4]
- **Test Requirements**:
  - `human-judgment` TR-2.1: 新增一条债务记录并保存，刷新页面后确认记录正确显示
  - `human-judgment` TR-2.2: 编辑一条债务记录并保存，刷新页面后确认修改正确显示

## [ ] Task 3: 验证整体功能
- **Priority**: medium
- **Depends On**: Task 1, Task 2
- **Description**: 
  - 端到端测试债务模块的新增、编辑、删除功能
  - 确保自动计算功能正常工作
  - 确保数据保存和加载正确
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3, AC-4]
- **Test Requirements**:
  - `human-judgment` TR-3.1: 完整测试新增债务流程（输入数据，确认自动计算，保存）
  - `human-judgment` TR-3.2: 测试刷新后数据一致性

