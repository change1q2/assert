# 理财模块表单联动与自动计算优化 - 任务列表

## [x] Task 1: 资产分类一级下拉选项从资产分类模块动态获取
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改 Finance.jsx，将 `categoryL1Options` 的来源从 `DEFAULT_CATEGORY_L1_OPTIONS` / `localStorage` 改为从 `stateData.assetClasses` 动态获取
  - 当 `assetClasses` 数据变化时，同步更新 categoryL1Options
  - 保留 localStorage 作为降级方案（当 assetClasses 为空时）
- **Acceptance Criteria Addressed**: 分类一级动态来源
- **Test Requirements**:
  - `human-judgement` TR-1.1: 新增资产弹窗中，资产分类一级下拉显示 assetClasses 中的所有分类名称
  - `human-judgement` TR-1.2: 在资产分类模块添加新分类后，Finance 模块的一级分类下拉自动包含新分类

## [x] Task 2: 当前市值改为自动计算且不可手动填写
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改 Finance.jsx 新增/编辑表单中的当前市值输入框，设为 `disabled` 或 `readOnly`
  - 添加 `useEffect` 监听 `currentPrice` 和 `quantity` 变化，自动计算 `currentValue = currentPrice × quantity`
  - 当 `currentPrice` 或 `quantity` 任一为空时，`currentValue` 显示为空字符串
  - 保存数据时确保 `currentValue` 字段正确写入
- **Acceptance Criteria Addressed**: 当前市值自动计算
- **Test Requirements**:
  - `human-judgement` TR-2.1: 当前市值输入框不可手动编辑
  - `human-judgement` TR-2.2: 输入当前价和数量后，当前市值自动显示乘积结果
  - `human-judgement` TR-2.3: 修改当前价或数量后，当前市值实时更新

## [x] Task 3: 资产分类模块支持编辑分类名称
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - 修改 AssetClasses.jsx，在编辑分类弹窗中添加分类名称输入框
  - 支持修改已有分类的名称并保存到 stateData
  - 保存后同步更新所有引用该分类名称的数据（如 financeAssets 中的 categoryL1）
- **Acceptance Criteria Addressed**: 资产分类模块编辑与删除
- **Test Requirements**:
  - `human-judgement` TR-3.1: 资产分类模块中点击编辑按钮，弹窗显示可修改的分类名称
  - `human-judgement` TR-3.2: 修改名称后保存，列表中显示新名称

## [x] Task 4: 资产分类模块支持删除二级分类
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - 修改 AssetClasses.jsx，在每个二级分类（children）项旁添加删除按钮
  - 点击删除后弹出确认对话框
  - 确认后从分类的 children 数组中移除该二级分类并保存
- **Acceptance Criteria Addressed**: 资产分类模块编辑与删除
- **Test Requirements**:
  - `human-judgement` TR-4.1: 二级分类列表中每个子项旁显示删除按钮
  - `human-judgement` TR-4.2: 点击删除后弹出确认对话框，确认后该二级分类被移除

## [x] Task 5: 构建验证
- **Priority**: medium
- **Depends On**: Task 1, 2, 3, 4
- **Description**: 
  - 运行 `cd assert_WEB && npm run build` 验证构建成功
- **Test Requirements**:
  - `programmatic` TR-5.1: 构建成功，exit code 为 0
- **Status**: Completed - 构建成功，npm run build 执行完成，exit code 0
