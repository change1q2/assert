# 资产类型与分类自定义管理 - The Implementation Plan

## [x] Task 1: 完善资产类型选项
- **Priority**: high
- **Depends On**: None
- **Description**: 更新 `ASSET_TYPE_OPTIONS` 常量，补充缺少的资产类型：现金、实体投资、黄金、白银、原油
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-1.1: 资产类型下拉列表包含股票、基金、债券、现金、期货、期权、外汇、保险、房产、实体投资、黄金、白银、原油、数字货币、银行理财、其他

## [x] Task 2: 资产类型自定义管理弹窗
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 添加资产类型管理弹窗，支持增删改，数据持久化到 localStorage
- **Acceptance Criteria Addressed**: AC-2, AC-7
- **Test Requirements**:
  - `human-judgement` TR-2.1: 资产类型选择框旁边有设置按钮
  - `human-judgement` TR-2.2: 管理弹窗支持添加、编辑、删除资产类型
  - `programmatic` TR-2.3: 自定义资产类型在刷新页面后仍然存在

## [x] Task 3: 一级分类自定义管理弹窗
- **Priority**: high
- **Depends On**: None
- **Description**: 添加一级分类管理弹窗，支持增删改，数据持久化到 localStorage
- **Acceptance Criteria Addressed**: AC-3, AC-7
- **Test Requirements**:
  - `human-judgement` TR-3.1: 一级分类选择框旁边有设置按钮
  - `human-judgement` TR-3.2: 管理弹窗支持添加、编辑、删除一级分类
  - `programmatic` TR-3.3: 自定义一级分类在刷新页面后仍然存在

## [x] Task 4: 二级分类自定义管理弹窗
- **Priority**: high
- **Depends On**: None
- **Description**: 添加二级分类管理弹窗（按一级分类分组），支持增删改，数据持久化到 localStorage
- **Acceptance Criteria Addressed**: AC-4, AC-7
- **Test Requirements**:
  - `human-judgement` TR-4.1: 二级分类选择框旁边有设置按钮
  - `human-judgement` TR-4.2: 管理弹窗支持按一级分类分组管理二级分类
  - `programmatic` TR-4.3: 自定义二级分类在刷新页面后仍然存在

## [x] Task 5: 三级分类自定义管理弹窗
- **Priority**: high
- **Depends On**: None
- **Description**: 添加三级分类管理弹窗（按一级+二级分类分组），支持增删改，数据持久化到 localStorage
- **Acceptance Criteria Addressed**: AC-5, AC-7
- **Test Requirements**:
  - `human-judgement` TR-5.1: 三级分类选择框旁边有设置按钮
  - `human-judgement` TR-5.2: 管理弹窗支持按一级+二级分类分组管理三级分类
  - `programmatic` TR-5.3: 自定义三级分类在刷新页面后仍然存在

## [x] Task 6: 修复分类联动逻辑
- **Priority**: high
- **Depends On**: Task 2, 3, 4, 5
- **Description**: 修改联动逻辑，确保修改任一分类后下级分类正确重置，且自定义分类正确显示
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `human-judgement` TR-6.1: 修改资产类型后，一级/二级/三级分类自动重置
  - `human-judgement` TR-6.2: 修改一级分类后，二级/三级分类自动重置
  - `human-judgement` TR-6.3: 修改二级分类后，三级分类自动重置
  - `human-judgement` TR-6.4: 自定义分类显示在下拉列表中

## [x] Task 7: 构建验证
- **Priority**: medium
- **Depends On**: All previous tasks
- **Description**: 运行 npm run build 确保无编译错误
- **Acceptance Criteria Addressed**: All
- **Test Requirements**:
  - `programmatic` TR-7.1: npm run build 成功，无 error
