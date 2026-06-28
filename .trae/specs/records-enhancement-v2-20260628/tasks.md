# 收支分析模块增强 v2 - 实现计划

## [x] Task 1: 修复数据持久化问题
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 createRecord 使用 saveState API 将记录追加到 state 的 records 数组中
  - 确保新增记录后调用 loadData 刷新页面
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgment` TR-1.1: 新增记录后页面自动刷新并显示新记录

## [x] Task 2: 实现账户管理功能
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在新增弹窗中添加账户管理按钮
  - 创建账户管理弹窗组件
  - 实现账户的新增、编辑、删除功能
  - 使用 saveState 保存账户数据
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgment` TR-2.1: 能打开账户管理弹窗
  - `human-judgment` TR-2.2: 能新增账户
  - `human-judgment` TR-2.3: 能编辑账户名称
  - `human-judgment` TR-2.4: 能删除账户

## [x] Task 3: 实现一级分类管理功能
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在新增弹窗中添加一级分类管理按钮
  - 创建一级分类管理弹窗组件
  - 实现一级分类的新增、编辑、删除功能
  - 使用 saveState 保存分类数据
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgment` TR-3.1: 能打开一级分类管理弹窗
  - `human-judgment` TR-3.2: 能新增一级分类
  - `human-judgment` TR-3.3: 能编辑一级分类名称
  - `human-judgment` TR-3.4: 能删除一级分类（非默认分类）

## [x] Task 4: 实现二级分类管理功能
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 在新增弹窗中添加二级分类管理按钮（选择一级分类后显示）
  - 创建二级分类管理弹窗组件
  - 实现二级分类的新增、编辑、删除功能
  - 使用 saveState 保存分类数据
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgment` TR-4.1: 选择一级分类后显示二级分类管理按钮
  - `human-judgment` TR-4.2: 能新增二级分类
  - `human-judgment` TR-4.3: 能编辑二级分类名称
  - `human-judgment` TR-4.4: 能删除二级分类

## [x] Task 5: 实现图文识别功能
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 在新增弹窗中添加图片上传区域
  - 实现图片预览功能
  - 添加 OCR 识别按钮
  - 调用 OCR API 识别图片内容并自动填充表单字段
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgment` TR-5.1: 能上传图片并预览
  - `human-judgment` TR-5.2: 点击识别后能自动填充金额、日期等字段

## [x] Task 6: 构建验证
- **Priority**: high
- **Depends On**: All tasks
- **Description**: 
  - 运行 npm run build 验证构建成功
  - 启动开发服务器验证功能正常
- **Acceptance Criteria Addressed**: All
- **Test Requirements**:
  - `programmatic` TR-6.1: npm run build 成功（退出码 0）
  - `human-judgment` TR-6.2: 开发服务器正常启动
