# 理财模块新增弹窗优化 - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: 资产三级分类支持自由增删改
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在资产三级分类下拉中添加编辑和删除按钮
  - 支持新增自定义三级分类选项
  - 支持编辑已有三级分类选项名称
  - 支持删除已有三级分类选项
  - 使用 localStorage 持久化自定义选项
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-1.1: 资产三级分类下拉支持新增、编辑、删除操作
  - `human-judgement` TR-1.2: 自定义选项在刷新后仍然保留
- **Notes**: 参考现有"自由增添"逻辑，扩展为完整的增删改功能

## [x] Task 2: 持仓分组支持自由增删改
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 将 POSITION_GROUP_OPTIONS 从常量改为可配置状态
  - 在持仓分组下拉中添加编辑和删除按钮
  - 支持新增自定义持仓分组选项
  - 支持编辑已有持仓分组选项名称
  - 支持删除已有持仓分组选项
  - 使用 localStorage 持久化自定义选项
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement` TR-2.1: 持仓分组下拉支持新增、编辑、删除操作
  - `human-judgement` TR-2.2: 自定义选项在刷新后仍然保留
- **Notes**: 需要将常量改为 useState，添加管理 UI

## [x] Task 3: 将"持位分类"改名为"持仓分类"
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改表单标签从"持位分类"改为"持仓分类"
  - 修改 DEFAULT_COLUMNS 中的 label 从"持位分类"改为"持仓分类"
  - 修改其他显示文本中"持位分类"为"持仓分类"
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgement` TR-3.1: 新增弹窗中"持位分类"显示为"持仓分类"
  - `human-judgement` TR-3.2: 列表设置中"持位分类"显示为"持仓分类"
- **Notes**: 全局搜索替换"持位分类"为"持仓分类"

## [x] Task 4: 资产代码设为必填项
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 资产代码表单字段添加 required 属性
  - 修改表单验证逻辑，确保资产代码必填
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgement` TR-4.1: 资产代码字段显示必填标记(*)
  - `human-judgement` TR-4.2: 未填写资产代码时表单提交被阻止
- **Notes**: 资产名称已为必填，只需修改资产代码

## [x] Task 5: 构建与功能验证
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3, Task 4
- **Description**: 
  - 运行 `npm run build` 确保无构建错误
  - 浏览器端到端验证各项功能
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-5.1: npm run build 构建成功，exit code 为 0
  - `human-judgement` TR-5.2: 浏览器手动验证所有 AC 检查点通过
