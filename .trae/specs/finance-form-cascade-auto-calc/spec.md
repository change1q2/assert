# 理财模块表单联动与自动计算优化

## Why
用户反馈 4 个问题：
1. 新增资产时的分类联动关系需要按图片中的表格严格执行（资产类型→一级→二级→三级→四级）
2. 资产分类一级的下拉选项应从资产分类模块动态获取，而非硬编码
3. 资产分类模块需支持自定义编辑分类名称，以及删除二级分类
4. 新增表单中的"当前市值"应不可手动填写，改为自动计算（当前价 × 数量）

## What Changes
- **Finance.jsx**：
  - 分类一级下拉选项从 `AssetClasses` 模块的 `assetClasses` 数据动态获取
  - 新增表单中 `currentValue` 字段改为 disabled/readonly，自动根据 `currentPrice × quantity` 计算
  - 当 `currentPrice` 或 `quantity` 变化时，自动更新 `currentValue`
  - 确保 `CASCADE_OPTIONS` 联动逻辑与图片表格一致
- **AssetClasses.jsx**：
  - 添加/编辑分类弹窗支持自定义编辑分类名称
  - 二级分类（children）支持删除操作

## Impact
- Affected specs: 理财模块新增/编辑资产、资产分类模块
- Affected code: Finance.jsx, AssetClasses.jsx

## ADDED Requirements

### Requirement: 分类一级动态来源
系统 SHALL 在 Finance.jsx 的新增/编辑资产表单中，将资产分类一级（categoryL1）的下拉选项来源从硬编码的 `DEFAULT_CATEGORY_L1_OPTIONS` 改为从 `AssetClasses` 模块的 `assetClasses` 数据动态获取（`assetClasses.map(c => c.name)`）。

#### Scenario: 动态获取一级分类
- **WHEN** 用户打开新增资产弹窗
- **THEN** 资产分类一级下拉选项显示资产分类模块中已有的所有分类名称

### Requirement: 当前市值自动计算
系统 SHALL 在新增/编辑资产表单中，将"当前市值"（currentValue）输入框设为不可手动编辑（disabled），并根据公式 `currentPrice × quantity` 自动计算并显示。当 `currentPrice` 或 `quantity` 任一字段变化时，`currentValue` 应实时更新。

#### Scenario: 自动计算当前市值
- **WHEN** 用户在新增表单中输入当前价和数量
- **THEN** 当前市值字段自动显示计算结果，且不可手动修改

### Requirement: 资产分类模块编辑与删除
系统 SHALL 在 AssetClasses.jsx 中支持：
1. 编辑已有分类的名称（重命名）
2. 删除分类下的二级分类（children 中的子项）

#### Scenario: 编辑分类名称
- **WHEN** 用户在资产分类模块中点击分类的编辑按钮
- **THEN** 弹窗中显示分类名称输入框，支持修改名称并保存

#### Scenario: 删除二级分类
- **WHEN** 用户在资产分类模块的某分类下查看二级分类列表
- **THEN** 每个二级分类旁显示删除按钮，点击后确认删除

## MODIFIED Requirements

### Requirement: 分类联动规则
系统 SHALL 保持现有的 `CASCADE_OPTIONS` 联动逻辑，确保与图片中的资产类型-分类对应关系一致。

## REMOVED Requirements
None
