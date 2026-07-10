# 收支分析预算功能优化 - 实施计划

## [ ] Task 1: 收支分析页面添加预算卡片
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在收支分析页面的卡片区域添加预算卡片
  - 显示总预算金额、已使用金额、进度条
  - 点击卡片跳转到预算管理页面
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `human-judgement` TR-1.1: 预算卡片显示在收支分析页面
  - `human-judgement` TR-1.2: 点击卡片跳转到预算管理页面
- **Notes**: 放在收入、支出、结余卡片旁边或下方

## [ ] Task 2: 预算管理页面添加分类下拉框优化
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 将添加分类弹窗的分类名称文本框改为类别和二级分类两个下拉框
  - 类别为必填项，二级分类为非必填项
  - 选择类别后，二级分类下拉框显示对应类别的子分类
- **Acceptance Criteria Addressed**: AC-3, AC-4
- **Test Requirements**:
  - `human-judgement` TR-2.1: 添加分类弹窗显示两个下拉框
  - `human-judgement` TR-2.2: 选择类别后二级分类联动更新
  - `human-judgement` TR-2.3: 类别为空时不能添加

## [ ] Task 3: 修复预算趋势图数据显示
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 确保预算趋势图中支出和剩余都正确显示数值
  - 修复Tooltip中数据格式
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgement` TR-3.1: 预算趋势图显示两条线
  - `human-judgement` TR-3.2: Tooltip中显示正确的金额数值

## [ ] Task 4: 修复添加分类后数据不显示问题
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 修复添加分类后列表不刷新的问题
  - 使用setState正确更新budgets数组
  - 确保总预算金额同步更新
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `human-judgement` TR-4.1: 添加分类后列表立即显示新数据
  - `human-judgement` TR-4.2: 总预算金额正确更新

## [ ] Task 5: 构建验证与浏览器测试
- **Priority**: high
- **Depends On**: Task 1, 2, 3, 4
- **Description**: 
  - 运行 npm run build 确保无构建错误
  - 在浏览器中测试所有功能
- **Acceptance Criteria Addressed**: AC-1 到 AC-6
- **Test Requirements**:
  - `programmatic` TR-5.1: 构建成功退出码为0
  - `human-judgement` TR-5.2: 所有功能在浏览器中验证通过
