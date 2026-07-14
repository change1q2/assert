# 理财模块列名调整、批量编辑与分页优化 - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: 将"当前价值"列名改为"当前市值"
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 DEFAULT_COLUMNS 中 currentValue 的 label 从"当前价值"改为"当前市值"
  - 修改列设置弹窗中的 label（如果有）
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `human-judgement` TR-1.1: 列表表头显示"当前市值"而非"当前价值"
  - `human-judgement` TR-1.2: 列设置弹窗中对应字段显示"当前市值"

## [x] Task 2: 优化列设置浮窗显示位置
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改列设置浮窗的定位逻辑，检测剩余空间，优先向下展开，空间不足时向上展开
  - 确保浮窗不被表格内容遮挡
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `human-judgement` TR-2.1: 列设置浮窗完整显示，不被表格遮挡
  - `human-judgement` TR-2.2: 窗口较小时浮窗自动向上展开

## [x] Task 3: 新增批量编辑按钮和模式切换
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在"新增"按钮左侧添加"批量编辑"按钮
  - 添加 showBatchEdit 状态，控制勾选框显示/隐藏
  - 批量编辑模式下显示"编辑选中"按钮
- **Acceptance Criteria Addressed**: [AC-3, AC-4]
- **Test Requirements**:
  - `human-judgement` TR-3.1: 列表右上角显示"批量编辑"按钮
  - `human-judgement` TR-3.2: 点击"批量编辑"后列表显示勾选框
  - `human-judgement` TR-3.3: 再次点击"批量编辑"隐藏勾选框
  - `human-judgement` TR-3.4: 勾选记录后显示"编辑选中"按钮

## [/] Task 4: 实现批量编辑弹窗
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 创建批量编辑弹窗组件，包含以下字段：市场、货币单位、资产类型、所属账户、资产分类（一/二/三级）、持仓分组、持仓分类、标签
  - 实现保存逻辑：更新所有选中记录的对应字段
- **Acceptance Criteria Addressed**: [AC-5, AC-6]
- **Test Requirements**:
  - `human-judgement` TR-4.1: 批量编辑弹窗显示所有指定字段
  - `human-judgement` TR-4.2: 修改字段后点击保存，所有选中记录更新
  - `human-judgement` TR-4.3: 未勾选记录不受影响

## [x] Task 5: 分页逻辑改为收支分析模块样式
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 Pagination 组件，添加"共X条记录"显示
  - 添加页码输入框（支持键盘回车跳转）
  - 修改上一页/下一页按钮样式（使用文字而非图标）
  - 修改布局为左侧显示总记录数，右侧显示分页控件
- **Acceptance Criteria Addressed**: [AC-7, AC-8]
- **Test Requirements**:
  - `human-judgement` TR-5.1: 分页区域左侧显示"共X条记录"
  - `human-judgement` TR-5.2: 右侧显示页大小下拉、上一页按钮、页码输入框、下一页按钮
  - `human-judgement` TR-5.3: 页码输入框支持输入后回车跳转
  - `human-judgement` TR-5.4: 分页样式与收支分析模块一致

## [x] Task 6: 构建验证
- **Priority**: high
- **Depends On**: [Task 1, Task 2, Task 3, Task 4, Task 5]
- **Description**: 
  - 运行 npm run build 确保前端构建无错误
- **Acceptance Criteria Addressed**: [AC-9]
- **Test Requirements**:
  - `programmatic` TR-6.1: npm run build 退出码为 0
