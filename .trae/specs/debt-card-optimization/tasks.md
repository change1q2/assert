# 债务模块卡片样式优化 - 实现计划

## [ ] Task 1: 扩展分期还款计算函数
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 `calculateRepayment` 函数，使其返回每期还款明细数组
  - 支持四种还款方式：等额本息、等额本金、先息后本、到期一次性
  - 每期明细包含：期数、还款日期、本金、利息、总还款额
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-1.1: 等额本息方式计算的每期还款总额等于总金额
  - `programmatic` TR-1.2: 等额本金方式每期本金递减，利息递减
  - `human-judgement` TR-1.3: 计算结果与手动计算一致
- **Notes**: 需要处理日期计算，确保每期还款日期正确递增

## [ ] Task 2: 创建债务详情卡片组件
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 创建新的债务详情卡片组件，展示所有字段信息
  - 卡片布局：顶部显示基本信息（债权人、债务人、金额等），中部显示还款计划，底部显示操作按钮
  - 使用 TailwindCSS 样式，支持深色/浅色主题
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-2.1: 卡片显示所有字段，布局清晰
  - `human-judgement` TR-2.2: 深色/浅色主题样式正确
  - `human-judgement` TR-2.3: 卡片视觉效果美观
- **Notes**: 需要设计合理的卡片布局，确保信息层次分明

## [ ] Task 3: 实现还款状态标记功能
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 在分期还款明细中添加已还/未还状态标记
  - 实现点击切换状态功能
  - 更新已还金额和剩余金额
- **Acceptance Criteria Addressed**: AC-3, AC-4
- **Test Requirements**:
  - `human-judgement` TR-3.1: 点击还款项状态能正确切换
  - `programmatic` TR-3.2: 标记已还后已还金额正确累加
  - `programmatic` TR-3.3: 剩余金额正确计算（总金额 - 已还金额）
- **Notes**: 需要考虑部分还款的情况

## [ ] Task 4: 集成新卡片组件到债务列表
- **Priority**: medium
- **Depends On**: Task 2
- **Description**: 
  - 修改债务列表渲染逻辑，使用新的债务详情卡片组件
  - 保持按分类分组的结构，但每个债务显示为独立卡片
  - 移除旧的表格展示方式
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-4.1: 债务列表显示为独立卡片形式
  - `human-judgement` TR-4.2: 分类分组结构保持不变
- **Notes**: 需要确保新旧样式兼容

## [ ] Task 5: 实现还款状态持久化
- **Priority**: medium
- **Depends On**: Task 3
- **Description**: 
  - 修改 `handleSave` 函数，保存还款状态到后端
  - 确保 `payments` 字段包含每期还款状态
  - 后端加载时正确恢复还款状态
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-5.1: 标记还款状态后刷新页面，状态保持不变
  - `programmatic` TR-5.2: 后端数据库正确存储还款状态
- **Notes**: 现有 `payments` 字段为空对象，需要填充每期还款状态