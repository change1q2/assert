# 负债资产显示 + 生存资金独立化 - 独立审查

- [x] CP-R1: 负债账户在账户列表中正确显示关联债务的数据
  - **类型**: `rule`
  - **覆盖**: AC-1, TR-1.1~TR-1.3
  - **证据**: 
    - debts SELECT `account: row.account || ''`：[state-service.js L172](file:///f:/code_x/assert/assert_PLATFORM/server/services/state-service.js#L172)
    - INSERT INTO debts account 列/值：[state-service.js L568-L571](file:///f:/code_x/assert/assert_PLATFORM/server/services/state-service.js#L568)
    - 聚合 marketValue = amount - paidAmount：[Accounts.jsx L587-L592](file:///f:/code_x/assert/assert_WEB/src/pages/Accounts.jsx#L587)
    - 迁移 ALTER TABLE debts ADD account：[026_migration L18](file:///f:/code_x/assert/assert_PLATFORM/server/db/migrations/026_add_debt_account_and_survival_funds.js#L18)

- [x] CP-R2: 负债账户详情页显示关联债务明细表格
  - **类型**: `rule`
  - **覆盖**: AC-2, TR-2.1, TR-2.2
  - **证据**: 
    - isLiability 条件块 + filter 逻辑：[Accounts.jsx L2272-L2275](file:///f:/code_x/assert/assert_WEB/src/pages/Accounts.jsx#L2272)
    - 9 列 thead + tfoot 合计行：[Accounts.jsx L2292-L2385](file:///f:/code_x/assert/assert_WEB/src/pages/Accounts.jsx#L2292)

- [x] CP-R3: 侧边栏存在「生存资金」入口，位于理财模块上方
  - **类型**: `rule`
  - **覆盖**: AC-3, TR-4.1
  - **证据**: 
    - menuItems 顺序：index 2 survival-funds < index 3 finance：[App.jsx L47-L59](file:///f:/code_x/assert/assert_WEB/src/App.jsx#L47)
    - PiggyBank + SurvivalFunds import：[App.jsx L16](file:///f:/code_x/assert/assert_WEB/src/App.jsx#L16) / [L43](file:///f:/code_x/assert/assert_WEB/src/App.jsx#L43)
    - buildPageForMenu case：[App.jsx L209](file:///f:/code_x/assert/assert_WEB/src/App.jsx#L209)

- [x] CP-R4: 生存资金页面存在 4 大块结构
  - **类型**: `rule`
  - **覆盖**: AC-4, AC-5, AC-6, AC-7, AC-8
  - **证据**:
    - 块1 4色总览卡：[SurvivalFunds.jsx L146-L197](file:///f:/code_x/assert/assert_WEB/src/pages/SurvivalFunds.jsx#L146)
    - 块2 4自由度卡 + 自由现金流表(+合计行)：[L237-L324](file:///f:/code_x/assert/assert_WEB/src/pages/SurvivalFunds.jsx#L237)
    - 块3 账户本网格 + 汇总：[L329-L423](file:///f:/code_x/assert/assert_WEB/src/pages/SurvivalFunds.jsx#L329)
    - 块4 生存资金列表 + 合计行：[L426-L517](file:///f:/code_x/assert/assert_WEB/src/pages/SurvivalFunds.jsx#L426)

- [x] CP-R5: 独立资产 tabs 中不再包含「生存资金」
  - **类型**: `rule`
  - **覆盖**: AC-9, TR-9.1
  - **证据**:
    - ASSET_TABS 6 项无 survivalfund：[IndependentAssets.jsx L145-L152](file:///f:/code_x/assert/assert_WEB/src/pages/IndependentAssets.jsx#L145)
    - renderContent switch 无 case survivalfund：[IndependentAssets.jsx L7261-L7273](file:///f:/code_x/assert/assert_WEB/src/pages/IndependentAssets.jsx#L7261)
    - getFormContent switch 无 case survivalfund：[IndependentAssets.jsx L4690-L4702](file:///f:/code_x/assert/assert_WEB/src/pages/IndependentAssets.jsx#L4690)
    - 兼容函数（renderSurvivalFundTable/Form）保留而不调用 ✔

- [x] CP-R6: 生存资金和自由现金流数据持久化
  - **类型**: `rule`
  - **覆盖**: AC-10, TR-3.1~TR-3.4
  - **证据**:
    - tables/tableStateMap 映射：[state-service.js L356/L405-L406](file:///f:/code_x/assert/assert_PLATFORM/server/services/state-service.js#L356)
    - SELECT survival_funds：[L224](file:///f:/code_x/assert/assert_PLATFORM/server/services/state-service.js#L224)；SELECT freedom_budgets：[L234](file:///f:/code_x/assert/assert_PLATFORM/server/services/state-service.js#L234)
    - INSERT survival_funds：[L589-L599](file:///f:/code_x/assert/assert_PLATFORM/server/services/state-service.js#L589)；INSERT freedom_budgets：[L601-L611](file:///f:/code_x/assert/assert_PLATFORM/server/services/state-service.js#L601)
    - 迁移 CREATE 两张表：[026_migration L25-L61](file:///f:/code_x/assert/assert_PLATFORM/server/db/migrations/026_add_debt_account_and_survival_funds.js#L25)

- [x] CP-R7: 前端构建无错误
  - **类型**: `rule`
  - **覆盖**: TR-10.1
  - **证据**: 2026-08-20 构建日志: vite ✓ built in 8.53s，exit code 0（chunk size 警告不影响）

- [x] CP-U1: 页面视觉一致性与交互流畅度
  - **类型**: `rubric`
  - **覆盖**: AC-11, TR-5.3, TR-6.4
  - **规模**: 1-5
  - **锚点**: 1=样式混乱/响应式失败；3=基本可用，风格大致匹配；5=完美匹配独立资产
  - **通过阈值**: >= 4
  - **证据**:
    - 修复后 SurvivalFunds.jsx 圆角全部 rounded-2xl（与 IndependentAssets 一致）
    - 节级阴影 shadow-soft（与 Accounts 详情页 shadow-soft 对齐）
    - 4色渐变卡 blue/orange/purple/emerald：一致 ✓
    - 表格 thead bg-gray-50 + tbody divide-y：一致 ✓
    - 合计行 bg-indigo-50 font-semibold：一致 ✓
    - 评分：**5 / 5**

## 审查历史

### 审查 R1（2026-08-20）
- **结果**: `pass with minor findings`
- **发现 Issue-I1**: SurvivalFunds.jsx 圆角 rounded-xl / 阴影 shadow-sm 未对齐 IndependentAssets 的 rounded-2xl + shadow-soft
- **发现 Issue-I2**: CP-R7 缺少构建日志证据
- **Remediation**: 修复 Issue-I1 并补构建验证 → 进入 R2

### 审查 R2（2026-08-20 修复后）
- **结果**: `pass`
- **证据**:
  - Issue-I1 修复：全局搜索 SurvivalFunds.jsx 已无 rounded-xl / shadow-sm
  - Issue-I2 修复：`npm run build` exit code 0，built in 8.53s
  - CP-U1 评分由 3/5 提升到 5/5
- **所有 checkpoint 通过**：CP-R1 ~ CP-R7 全部 pass，CP-U1 得分 5/5 ≥ 4
- **无任何 actionable finding**
