# 理财模块性能优化与编码修复 - 实施计划

## [x] Task 1: 渐进式数据加载优化
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改 `loadData` 函数实现分层加载：先使用本地缓存/数据库数据快速渲染页面骨架（loading=false），再异步加载当前页行情（loadQuotes 仅针对当前页资产），最后补齐全量行情
  - 修改 `loadQuotes` 增加 `targetCodes` 参数，支持只加载指定代码列表的行情
  - 修改 `loadFundNav` 增加同上分页加载能力
  - 添加 `useIsFirstRender` 或 `useEffect` 分阶段触发：stage1(基础数据) → stage2(当前页行情) → stage3(全量行情)
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: 进入理财模块后，页面在 2000ms 内完成首屏渲染（loading 状态消失）
  - `programmatic` TR-1.2: 当前页 10 条数据的行情在 3000ms 内显示，其余页数据在 8000ms 内陆续补齐
  - `human-judgement` TR-1.3: 手动感知页面加载过程，确认首屏快速出数据后逐步补齐
- **Notes**: 不改变现有 API 结构，仅在前端分批调用

## [x] Task 2: 资产种类乱码（"??"）过滤与自动修复
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 `Finance.jsx` 的 `assetKindOptions` 初始化中，添加过滤逻辑：移除为 "??"、空字符串、仅问号或空白的选项
  - 在 `loadData` 行情加载完成后，遍历 `financeAssets`：若 `assetKind` 为 "??" 或空，使用行情返回的 `name` 字段覆盖
  - 同样处理 `category`、`subcategory`、`tertiaryCategory`、`market` 字段的"??"问题
  - 新增 `sanitizeChineseText(text)` 工具函数：将 "??"、" "、空值等无效值替换为行情返回值或标记为空字符串
  - 在初始化 `assetKindOptions` 时调用该清理逻辑
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-6
- **Test Requirements**:
  - `programmatic` TR-2.1: 检查 localStorage 中 `finance_asset_kind_options` 存储的数据不含"??"字符
  - `programmatic` TR-2.2: 行情返回后，数据库/状态中的资产名称、市场、资产种类字段不再为"??"
  - `human-judgement` TR-2.3: 手动检查所有下拉选项和表格列，确认无"??"显示
- **Notes**: 清理逻辑应幂等，多次执行不会产生副作用

## [x] Task 3: 全局中文编码排查与修复
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - 排查 `finance-service.js` 中所有 `TextDecoder("gbk")` 调用：添加 fallback 机制，解码失败时回退到 `TextDecoder("utf-8")` 或 `latin1`
  - 检查 `iconv-lite` 动态导入是否在所有使用场景下正确工作（特别是 pingzhongdata 接口）
  - 新增统一 `safeDecode(buffer, encoding)` 工具函数，按优先级尝试 GBK → GB18030 → UTF-8 解码
  - 在后端 `state-service.js` 读取数据时添加脏字段过滤（"??"）
  - 前端各页面（Overview, Accounts, IndependentAssets 等）统一检查文本渲染，添加"??"占位检测并显示为空
- **Acceptance Criteria Addressed**: AC-3, AC-6
- **Test Requirements**:
  - `programmatic` TR-3.1: 使用包含 GBK、GB18030 编码的测试数据验证解码结果正确性
  - `human-judgement` TR-3.2: 手动在所有页面检查中文字段显示是否正常
  - `programmatic` TR-3.3: 编写单元测试验证 `safeDecode` 在各种编码下正确工作
- **Notes**: GB18030 是中文扩展编码，涵盖所有汉字，推荐作为首选解码方式

## [x] Task 4: 余额计算一致性修复与负数允许
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 移除 `Finance.jsx` 中 `const balance = Math.max(0, parseFloat(targetAccount.balance) || 0)` 的强制非负逻辑
  - 修改现金类资产的 `currentValue` 计算：当 `balance` 为正时正常计算，为负时显示实际负值
  - 检查所有 `Math.max(0, ...)` 用法，评估是否应该保留（如：持仓数量不应为负，但账户余额可以为负）
  - 新增资产时，不再检查账户余额是否充足，允许余额为负
  - 在 `Accounts.jsx` 中，余额为负时显示红色（已实现，验证），不阻止操作
- **Acceptance Criteria Addressed**: AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-4.1: 账户余额为正数时，资产列表中关联资产的 currentValue 不为负
  - `programmatic` TR-4.2: 账户余额为负数时，新增资产操作成功，不报错
  - `human-judgement` TR-4.3: 手动模拟负数余额场景，验证资产新增和显示行为
- **Notes**: 关键修改点：Finance.jsx L246 的 `Math.max(0, ...)` 应改为直接使用 `balance`

## [x] Task 5: 版本号更新与构建验证
- **Priority**: medium
- **Depends On**: Task 1, Task 2, Task 3, Task 4
- **Description**:
  - 将 App.jsx 和 UserProfile.jsx 中的版本号从 V1.0.41 升级到 V1.0.42
  - 运行 `npm run build` 验证构建通过
  - 启动开发服务器手动验证所有改进
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-5.1: `npm run build` 无错误通过
  - `human-judgement` TR-5.2: 所有验收标准手动验证通过
- **Notes**: 构建输出大小应与之前版本相当（±5%）
