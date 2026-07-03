# 个人中心功能 - 实现计划

## [ ] Task 1: 创建个人中心页面组件（基础）
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 assert_WEB/src/pages/ 目录下创建 UserProfile.jsx 文件
  - 设计个人中心页面布局，包含用户头像、基本信息、登录账号信息和版本号
  - 使用 TailwindCSS 进行样式设计，保持与现有系统风格一致
- **Acceptance Criteria Addressed**: AC-3, AC-4, AC-5, AC-6
- **Test Requirements**:
  - `human-judgement` TR-1.1: 页面显示用户头像区域（圆形，显示首字母）
  - `human-judgement` TR-1.2: 页面显示用户基本信息卡片（姓名、手机号、邮箱）
  - `human-judgement` TR-1.3: 页面显示登录账号信息
  - `human-judgement` TR-1.4: 页面显示系统版本号（V1.0.1）
- **Notes**: 用户数据从 localStorage 的 state 中获取，如果没有则使用默认值

## [ ] Task 2: 在 App.jsx 中添加用户图标按钮
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 在 App.jsx 的 main 区域右上角添加一个圆形用户图标按钮
  - 使用 lucide-react 的 User 图标
  - 点击按钮时切换到个人中心页面
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `human-judgement` TR-2.1: 在页面右上角看到圆形用户图标按钮
  - `human-judgement` TR-2.2: 点击图标后页面切换到个人中心
- **Notes**: 图标按钮需要固定定位在右上角

## [ ] Task 3: 在 App.jsx 中注册个人中心页面路由
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 在 App.jsx 中导入 UserProfile 组件
  - 在 renderContent 函数中添加 'profile' 路由
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement` TR-3.1: 点击用户图标后成功显示个人中心页面
- **Notes**: 确保路由切换正常

## [ ] Task 4: 更新 mock 数据添加用户信息
- **Priority**: medium
- **Depends On**: Task 1
- **Description**: 
  - 在 Login.jsx 的 mock 数据中添加用户信息字段
  - 添加用户基本信息（姓名、手机号、邮箱）
- **Acceptance Criteria Addressed**: AC-4, AC-5
- **Test Requirements**:
  - `human-judgement` TR-4.1: 使用默认账号登录后，个人中心显示用户信息
- **Notes**: 用户信息需要包含在 state.user 对象中

## [ ] Task 5: 实现用户头像上传功能
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 在个人中心页面添加头像上传区域
  - 实现图片选择和预览功能
  - 将头像保存到 localStorage（base64格式）
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `human-judgement` TR-5.1: 点击头像区域可以选择图片文件
  - `human-judgement` TR-5.2: 图片上传后正确显示预览
  - `human-judgement` TR-5.3: 刷新页面后头像仍然保持
- **Notes**: 头像大小限制在2MB以内，支持JPG、PNG格式

## [ ] Task 6: 实现个人信息编辑功能
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 在个人中心页面添加编辑按钮
  - 实现信息编辑表单（姓名、手机号、邮箱）
  - 实现保存功能，将数据保存到 localStorage
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `human-judgement` TR-6.1: 点击编辑按钮后表单变为可编辑状态
  - `human-judgement` TR-6.2: 修改信息后点击保存成功更新
  - `human-judgement` TR-6.3: 刷新页面后修改的信息仍然保持
- **Notes**: 编辑完成后显示保存成功提示

## [ ] Task 7: 实现密码修改功能
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 在个人中心页面添加密码修改表单
  - 包含旧密码、新密码、确认密码字段
  - 实现密码验证和保存功能
- **Acceptance Criteria Addressed**: AC-9
- **Test Requirements**:
  - `human-judgement` TR-7.1: 密码修改表单显示正确
  - `human-judgement` TR-7.2: 输入正确旧密码和新密码后修改成功
  - `human-judgement` TR-7.3: 密码不一致时显示错误提示
- **Notes**: 密码修改仅在前端验证，不与后端同步（mock模式）

## [ ] Task 8: 实现多语言支持功能
- **Priority**: medium
- **Depends On**: Task 1
- **Description**: 
  - 创建语言配置文件（中文/英文）
  - 在个人中心页面添加语言选择器
  - 实现语言切换功能，使用 React Context 管理语言状态
- **Acceptance Criteria Addressed**: AC-10
- **Test Requirements**:
  - `human-judgement` TR-8.1: 语言选择器显示中文和英文选项
  - `human-judgement` TR-8.2: 选择英文后界面切换为英文显示
  - `human-judgement` TR-8.3: 刷新页面后语言设置仍然保持
- **Notes**: 至少翻译主要页面的标题和菜单

## [ ] Task 9: 实现主题切换功能
- **Priority**: medium
- **Depends On**: Task 1
- **Description**: 
  - 在个人中心页面添加主题切换开关
  - 实现深色/浅色主题切换功能
  - 使用 localStorage 保存主题偏好
- **Acceptance Criteria Addressed**: AC-11
- **Test Requirements**:
  - `human-judgement` TR-9.1: 主题切换开关显示正确
  - `human-judgement` TR-9.2: 点击开关后主题切换成功
  - `human-judgement` TR-9.3: 刷新页面后主题设置仍然保持
- **Notes**: 使用 TailwindCSS 的 dark: 类实现主题切换
