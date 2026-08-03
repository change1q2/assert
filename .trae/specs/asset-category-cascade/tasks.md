# 资产分类级联与校验优化 - 实施计划

## [x] 任务 1: 资产分类二级添加必填 UI 标识
- **优先级**: high
- **依赖**: 无
- **描述**:
  - 在 `Finance.jsx` 文件第 4166 行附近，将资产分类二级的 `FormField` 组件添加 `required` 属性
  - 当前代码: `<FormField label="资产分类二级">`
  - 目标代码: `<FormField label="资产分类二级" required>`
  - 确保红色星号显示在标签后，与资产分类一级和三级的样式一致
- **验收标准**: AC-1
- **测试要求**:
  - `programmatic` TR-1.1: 检查 DOM 中资产分类二级标签包含红色星号元素（`<span class="text-red-500 mr-0.5">*</span>`）
  - `human-judgement` TR-1.2: 视觉上确认红色星号与一级、三级分类的星号位置和样式一致
- **备注**: 此变更仅涉及一行代码的修改

## [x] 任务 2: 实现分类级联显示逻辑
- **优先级**: high
- **依赖**: 任务 1
- **描述**:
  - 修改 `Finance.jsx` 中资产分类二级、三级、四级的 JSX 渲染部分
  - 资产分类二级（第 4165-4186 行）: 用 `{newAccount.categoryL1 && (...)}` 包裹，仅当一级有值时渲染
  - 资产分类三级（第 4188-4214 行）: 用 `{newAccount.categoryL2 && (...)}` 包裹，仅当二级有值时渲染
  - 资产分类四级（第 4216-4233 行）: 用 `{newAccount.categoryL3 && (...)}` 包裹，仅当三级有值时渲染
  - 在 categoryL1 的 onChange 中确保清空 categoryL2、categoryL3、categoryL4（已有部分实现，需完善清空逻辑）
  - 在 categoryL2 的 onChange 中确保清空 categoryL3、categoryL4（已有部分实现）
  - 在 categoryL3 的 onChange 中确保清空 categoryL4（已有实现）
- **验收标准**: AC-2, AC-3, AC-4, AC-5
- **测试要求**:
  - `programmatic` TR-2.1: 一级分类为空时，DOM 中不存在资产分类二级的 FormField 元素
  - `programmatic` TR-2.2: 一级已选但二级为空时，DOM 中不存在资产分类三级的 FormField 元素
  - `programmatic` TR-2.3: 一级和二级已选但三级为空时，DOM 中不存在资产分类四级的 FormField 元素
  - `programmatic` TR-2.4: 清空一级分类后，categoryL2、categoryL3、categoryL4 的 state 值均为空字符串
- **备注**: 使用条件渲染（conditional rendering）而非 CSS 隐藏，确保不渲染的字段不消耗 DOM 空间

## [x] 任务 3: 实现自定义设置按钮级联禁用
- **优先级**: high
- **依赖**: 任务 2
- **描述**:
  - 修改资产分类二级的设置按钮（第 4182 行附近）: 当 `!newAccount.categoryL1` 时，添加 `disabled` 属性和 `opacity-50 cursor-not-allowed` 样式
  - 修改资产分类三级的设置按钮（第 4210 行附近）: 当 `!newAccount.categoryL2` 时，添加 `disabled` 属性和 `opacity-50 cursor-not-allowed` 样式
  - 修改资产分类四级的设置按钮（第 4229 行附近）: 当 `!newAccount.categoryL3` 时，添加 `disabled` 属性和 `opacity-50 cursor-not-allowed` 样式
  - 在按钮 onClick 事件中添加保护：当对应父级为空时，不触发打开模态框的操作
- **验收标准**: AC-6
- **测试要求**:
  - `programmatic` TR-3.1: 一级分类为空时，资产分类二级的设置按钮具有 `disabled` 属性
  - `programmatic` TR-3.2: 一级分类为空时，点击设置按钮不会触发模态框显示
  - `programmatic` TR-3.3: 一级分类已选时，资产分类二级的设置按钮可正常点击

## [x] 任务 4: 编辑模式兼容和端到端验证
- **优先级**: medium
- **依赖**: 任务 2, 任务 3
- **描述**:
  - 验证编辑模式下，已有资产数据能正确回显所有分类级别
  - 在 `handleEdit` 函数中（第 2662 行附近）确认 newAccount 初始化时包含 categoryL1、categoryL2、categoryL3 的值
  - 由于任务 2 使用条件渲染，编辑模式下有值的字段会自动显示
  - 运行前端验证确保现有测试不受影响
- **验收标准**: AC-8, AC-9
- **测试要求**:
  - `programmatic` TR-4.1: 编辑已有资产时，所有已保存的分类字段均正确显示
  - `human-judgement` TR-4.2: 视觉上确认级联显示/隐藏后表单布局整洁无错位
  - `programmatic` TR-4.3: 保存新资产（包含完整分类）后数据正确持久化

## [x] 任务 5: 构建验证和集成测试
- **优先级**: medium
- **依赖**: 任务 1, 任务 2, 任务 3, 任务 4
- **描述**:
  - 运行 `npm --prefix assert_WEB run build` 确保构建无错误
  - 启动开发服务器，手动验证所有验收标准
  - 运行现有测试套件确保无回归问题
- **验收标准**: AC-1 至 AC-9 全部
- **测试要求**:
  - `programmatic` TR-5.1: `vite build` 命令成功完成，exit code 为 0
  - `programmatic` TR-5.2: 无 ESLint 错误（如适用）
  - `human-judgement` TR-5.3: 浏览器中手动测试所有场景通过
