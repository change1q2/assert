# 债务模块增强功能 - 实现计划

## [ ] Task 1: 移除债务模块版本号
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 删除债务模块页面顶部标题旁的版本号显示（V1.0.2）
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `human-judgment` TR-1.1: 页面顶部标题区域只显示"债务模块"，无版本号
- **Notes**: 修改 Debts.jsx 文件中的标题区域

## [ ] Task 2: 调整罚息显示位置到状态后面
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在债务卡片详细信息区域，将罚息字段移动到状态字段后面
  - 字段顺序调整为：债务人、还款方式、状态、罚息、借入日期、还款日期
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `human-judgment` TR-2.1: 债务卡片详细信息字段顺序正确，罚息在状态后面
- **Notes**: 修改 Debts.jsx 文件中的 renderDebtCard 组件

## [ ] Task 3: 状态支持点击切换逾期还款
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 将债务卡片中的状态标签改为可点击按钮
  - 点击后切换状态（正常↔逾期未还）
  - 切换后自动保存数据到后端
- **Acceptance Criteria Addressed**: [AC-3]
- **Test Requirements**:
  - `human-judgment` TR-3.1: 点击"正常"状态标签，状态变为"逾期未还"并显示红色
  - `human-judgment` TR-3.2: 点击"逾期未还"状态标签，状态变为"正常"并显示黑色
  - `human-judgment` TR-3.3: 刷新页面后，状态保持切换后的值
- **Notes**: 修改 Debts.jsx 文件中的 renderDebtCard 组件，添加状态切换函数

## [ ] Task 4: 还款计划支持左右拉伸
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 给还款计划表格容器添加横向滚动功能
  - 设置表格为最小宽度，支持左右滑动查看所有列
- **Acceptance Criteria Addressed**: [AC-4]
- **Test Requirements**:
  - `human-judgment` TR-4.1: 还款计划表格列较多时，可左右滚动查看完整内容
- **Notes**: 修改 Debts.jsx 文件中的还款计划表格容器样式

## [ ] Task 5: 还款计划分页显示及自动定位
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 当还款期数超过12期时，显示分页控件
  - 每页显示12期
  - 添加分页状态管理（当前页码）
  - 打开还款计划时自动定位到第一个未还期数所在页面
- **Acceptance Criteria Addressed**: [AC-5]
- **Test Requirements**:
  - `human-judgment` TR-5.1: 372期还款计划只显示12期，底部有分页控件
  - `human-judgment` TR-5.2: 点击"下一页"按钮，显示第2页（13-24期）
  - `human-judgment` TR-5.3: 打开还款计划时，自动定位到第一个未还期数
- **Notes**: 修改 Debts.jsx 文件中的 renderDebtCard 组件，添加分页逻辑