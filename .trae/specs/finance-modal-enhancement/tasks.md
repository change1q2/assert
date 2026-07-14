# 理财模块新增弹窗增强 - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: 所属账户从账户管理获取并移除设置按钮
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改新增弹窗"所属账户"下拉选项数据源，从 `state.accounts` 读取账户列表
  - 移除"所属账户"旁边的 Settings 按钮及相关弹窗逻辑
  - 确保账户名称显示正确，保存时保持与现有数据兼容
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `human-judgement` TR-1.1: 打开新增弹窗，所属账户下拉显示账户管理模块的所有账户名称
  - `human-judgement` TR-1.2: 所属账户下拉旁边没有设置/齿轮按钮
  - `human-judgement` TR-1.3: 选择账户后保存，数据正确持久化
- **Notes**: 现有代码从 financeAssets 收集唯一账户名，改为从 state.accounts 读取；保存字段保持 account 不变以兼容历史数据

## [x] Task 2: 资产分类二级与资产类型联动（股票/基金特殊处理）
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 资产类型为"股票"时，二级分类固定为：A股、港股、美股、其他
  - 资产类型为"基金"时，二级分类固定为：混合型、指数型、货币型、债券型、行业主题型
  - 资产类型为"基金"时，三级分类固定为：场外、场内
  - 其他资产类型时，二级/三级仍从 assetClasses 正常联动
  - 切换资产类型时自动重置二级/三级分类选择
- **Acceptance Criteria Addressed**: AC-3, AC-4, AC-5, AC-6
- **Test Requirements**:
  - `human-judgement` TR-2.1: 选择资产类型"股票"，二级分类下拉显示 A股、港股、美股、其他
  - `human-judgement` TR-2.2: 选择资产类型"基金"，二级分类显示 混合型、指数型、货币型、债券型、行业主题型
  - `human-judgement` TR-2.3: 选择资产类型"基金"，三级分类显示 场外、场内
  - `human-judgement` TR-2.4: 选择其他资产类型（如债券），二级/三级从 assetClasses 正常联动
  - `human-judgement` TR-2.5: 切换资产类型时，已选的二级/三级分类被清空
- **Notes**: 修改 categoryL2Options 和 categoryL3Options 的 useMemo 逻辑，增加 assetType 判断分支

## [x] Task 3: 现价实时获取优化
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 确保选择代码/名称搜索结果后自动获取并填充现价
  - 现价变化时自动更新当前价值、持仓盈亏、盈亏率
  - 处理获取失败的降级（保留用户输入或显示空值）
- **Acceptance Criteria Addressed**: AC-7, AC-8
- **Test Requirements**:
  - `human-judgement` TR-3.1: 输入代码/名称并选择搜索结果后，现价字段自动填充
  - `human-judgement` TR-3.2: 现价填充后，当前价值、持仓盈亏、盈亏率自动重新计算
  - `human-judgement` TR-3.3: 网络异常时，现价字段允许手动输入，不阻塞操作
- **Notes**: 现有 handleSelectLookup 已有基础逻辑，重点验证稳定性和用户体验

## [x] Task 4: 数据获取统一从后端验证
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 验证所有列表/筛选/下拉数据均从 fetchState 获取，与数据库同步
  - 确保本地 mock 数据仅作为降级 fallback
- **Acceptance Criteria Addressed**: AC-9
- **Test Requirements**:
  - `programmatic` TR-4.1: 浏览器 Network 面板验证数据请求来自 /api/state 接口
  - `human-judgement` TR-4.2: 数据库中新增/修改数据后，前端刷新页面显示最新数据
- **Notes**: 现有代码已通过 fetchState 获取数据，此项以验证为主

## [x] Task 5: 构建与功能验证
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3, Task 4
- **Description**: 
  - 运行 `npm run build` 确保无构建错误
  - 浏览器端到端验证新增弹窗各项功能
- **Acceptance Criteria Addressed**: AC-10
- **Test Requirements**:
  - `programmatic` TR-5.1: npm run build 构建成功，exit code 为 0
  - `human-judgement` TR-5.2: 浏览器手动验证所有 AC 检查点通过
- **Notes**: 构建验证是发布前的必要检查
