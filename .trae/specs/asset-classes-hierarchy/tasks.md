# 资产分类模块层级结构改造 - 实现计划

## [x] Task 1: 修改数据结构支持三级分类
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 将二级分类的数据结构从简单对象扩展为支持children字段（三级分类）
  - 升级createDefaultClass函数支持新的数据结构
  - 确保现有数据兼容（自动将旧的二级分类转换为支持三级的结构）
- **Acceptance Criteria Addressed**: AC-3, AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-1.1: 现有二级分类数据能正确转换为支持三级分类的结构
  - `human-judgement` TR-1.2: 数据结构变更不影响现有功能
- **Notes**: 需要确保向后兼容性，旧数据能正常加载

## [x] Task 2: 实现一级分类数据自动汇总逻辑
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 修改computeStatsForClasses函数，一级分类的value、openingValue、income、expense等字段自动汇总所有二级分类
  - 如果二级分类有三级分类，先汇总三级再汇总到一级
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: 一级分类的value等于所有二级分类value之和
  - `programmatic` TR-2.2: 一级分类的pnl正确计算（汇总后的value - 汇总后的openingValue）
- **Notes**: 需要注意数据类型转换，确保数值正确

## [x] Task 3: 取消一级卡片直接展开二级分类
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 移除一级分类卡片上的展开/收起按钮
  - 删除一级卡片下方的二级分类列表渲染代码
  - 移除expandedClassIds相关状态和toggleExpand函数
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `human-judgment` TR-3.1: 一级分类卡片不再显示展开按钮
  - `human-judgment` TR-3.2: 一级分类卡片不再直接展示二级分类列表
- **Notes**: 确保删除的代码不会影响其他功能

## [x] Task 4: 实现一级分类卡片可点击进入详情页
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 添加selectedClassId状态，管理当前选中的一级分类
  - 给一级分类卡片添加点击事件（排除操作按钮区域）
  - 实现详情页视图，展示选中一级分类的信息和二级分类列表
- **Acceptance Criteria Addressed**: AC-1, AC-6
- **Test Requirements**:
  - `human-judgment` TR-4.1: 点击一级分类卡片（非按钮区域）进入详情页
  - `human-judgment` TR-4.2: 详情页显示返回按钮，点击可返回列表页
  - `human-judgment` TR-4.3: 详情页展示该一级分类的汇总数据
- **Notes**: 需要使用pointer-events-none处理按钮区域，避免点击冲突

## [x] Task 5: 实现二级分类展开显示三级分类
- **Priority**: high
- **Depends On**: Task 1, Task 4
- **Description**: 
  - 在详情页中，二级分类支持展开/收起，显示三级分类列表
  - 实现三级分类的添加/编辑/删除功能
  - 二级分类的数据自动汇总三级分类数据
- **Acceptance Criteria Addressed**: AC-3, AC-4, AC-5
- **Test Requirements**:
  - `human-judgment` TR-5.1: 二级分类有展开/收起按钮
  - `human-judgment` TR-5.2: 展开后显示三级分类列表
  - `human-judgment` TR-5.3: 支持添加/编辑/删除三级分类
  - `programmatic` TR-5.4: 二级分类的value等于所有三级分类value之和
- **Notes**: 三级分类的数据结构与二级分类保持一致

## [x] Task 6: 更新新增/编辑表单支持三级分类
- **Priority**: medium
- **Depends On**: Task 1
- **Description**: 
  - 更新表单中的二级分类部分，支持添加三级分类
  - 修改handleSave函数，保存三级分类数据
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgment` TR-6.1: 新增/编辑表单中二级分类支持添加三级分类
  - `human-judgment` TR-6.2: 保存后三级分类数据正确存储
- **Notes**: 需要调整表单UI，支持嵌套输入

## [x] Task 7: 构建验证和测试
- **Priority**: high
- **Depends On**: Task 1-6
- **Description**: 
  - 运行npm run build确保项目能正常构建
  - 手动测试所有功能点
- **Acceptance Criteria Addressed**: AC-1-7
- **Test Requirements**:
  - `programmatic` TR-7.1: npm run build成功，无错误
  - `human-judgment` TR-7.2: 所有功能按预期工作