# 个人中心与管理后台增强 - 实现计划

## [x] Task 1: 修复手机号编辑同步到后端
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 UserProfile.jsx 中的 handleSave 函数，调用 PUT /api/state 将用户信息同步到后端
  - 确保编辑后的手机号通过 API 保存到数据库
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: 编辑手机号后调用 PUT /api/state，返回 200 OK
  - `human-judgment` TR-1.2: 管理后台用户列表显示最新手机号

## [x] Task 2: 删除主题颜色模块，添加问题反馈模块
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 删除 UserProfile.jsx 中的主题颜色切换模块（包含 Moon/Sun 图标和主题切换按钮）
  - 添加问题反馈模块，包含问题标题输入框、问题详情文本域、附件上传（支持图片和视频）
  - 调用 POST /api/feedback 提交反馈
- **Acceptance Criteria Addressed**: AC-2, AC-3
- **Test Requirements**:
  - `human-judgment` TR-2.1: 个人中心页面主题模块已删除，显示问题反馈模块
  - `programmatic` TR-2.2: 提交反馈后调用 POST /api/feedback，返回 201 Created
  - `programmatic` TR-2.3: 反馈数据保存在数据库 feedback 表中，status 为 pending

## [x] Task 3: 隐藏登录页面测试账号信息
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 删除 Login.jsx 中显示测试账号和密码的代码块（第200-206行）
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgment` TR-3.1: 登录页面底部没有显示测试账号和密码信息

## [x] Task 4: 更新管理员默认账号密码
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 user-service.js 中的 ensureDefaultAdmin 函数，将默认管理员账号改为 SuperAdmin，密码改为 Super12345
  - 确保数据库中管理员账号被正确创建或更新
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-4.1: 系统启动后 admin_users 表中存在 username 为 SuperAdmin 的记录
  - `programmatic` TR-4.2: 使用 SuperAdmin/Super12345 登录管理后台成功

## [x] Task 5: 管理后台用户列表增加筛选条件
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 修改 AdminDashboard.jsx，添加账号、昵称、手机号、邮箱筛选输入框
  - 修改后端 admin.js 的 /api/admin/users 接口，支持查询参数筛选
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `human-judgment` TR-5.1: 管理后台用户列表页显示筛选输入框
  - `programmatic` TR-5.2: 输入筛选条件后，后端接口返回过滤后的用户列表

## [x] Task 6: 管理后台用户列表增加分页逻辑
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 修改 AdminDashboard.jsx，添加分页组件（每页10条）
  - 修改后端 admin.js 的 /api/admin/users 接口，支持 page 和 pageSize 参数
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `human-judgment` TR-6.1: 用户列表分页显示，每页10条
  - `programmatic` TR-6.2: 后端接口支持 page 和 pageSize 参数，返回分页数据和总数

## [x] Task 7: 管理后台用户列表增加操作列
- **Priority**: high
- **Depends On**: Task 5, Task 6
- **Description**: 
  - 修改 AdminDashboard.jsx，添加操作列（编辑、删除按钮）
  - 实现编辑用户信息模态框
  - 实现删除用户功能，调用后端接口
  - 修改后端 admin.js，添加编辑用户和删除用户接口
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `human-judgment` TR-7.1: 用户列表显示操作列，包含编辑和删除按钮
  - `programmatic` TR-7.2: 点击编辑按钮弹出编辑模态框
  - `programmatic` TR-7.3: 点击删除按钮并确认后，调用删除接口返回 200 OK，用户从列表消失