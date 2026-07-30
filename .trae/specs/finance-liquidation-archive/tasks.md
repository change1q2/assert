# 理财模块 - 清仓归档与现金流管理 实施计划

## [x] Task 1: 修复"所属账户"下拉框数据加载问题
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 检查 Finance.jsx 中 `accounts` 变量的来源
  - 确保 stateData 在组件渲染前已正确加载 accounts 数据
  - 在 loadData 函数中添加 accounts 数据回退逻辑（localStorage + 默认数据）
  - 添加 useEffect 同步账户数据到 localStorage
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: 打开新增持仓表单，所属账户下拉框显示所有账户 ✅
  - `programmatic` TR-1.2: 打开编辑持仓表单，所属账户显示当前选中账户 ✅
  - `human-judgement` TR-1.3: 下拉框样式正确，交互流畅 ✅
- **Notes**: 已通过在 loadData 中检查 accounts 并从 localStorage/默认数据补充修复

## [x] Task 2: 修复持仓列表操作列按钮事件
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 为表格行添加 onClick 事件绑定到 handleDetail
  - 为操作列和复选框列添加 stopPropagation
  - 确保编辑、明细、删除按钮的 onClick 事件正确绑定
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: 点击"编辑"按钮能打开编辑弹窗并预填数据 ✅
  - `programmatic` TR-2.2: 点击"明细"按钮能打开明细弹窗 ✅
  - `programmatic` TR-2.3: 点击"删除"按钮能弹出确认对话框 ✅
  - `programmatic` TR-2.4: 点击行空白区域能打开明细弹窗 ✅
- **Notes**: 已在之前会话中修复

## [x] Task 3: 数据库迁移 - 新增归档表和交易字段
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 迁移文件 016_add_archive_and_cash.js
  - 创建 finance_asset_archives 表
  - 为交易记录表添加 cash_account_id 字段
  - 为 finance_assets 表添加 status 和 archive_date 字段
- **Acceptance Criteria Addressed**: AC-4, AC-5, AC-9
- **Test Requirements**:
  - `programmatic` TR-3.1: 迁移文件执行无错误 ✅
  - `programmatic` TR-3.2: finance_asset_archives 表创建成功 ✅
  - `programmatic` TR-3.3: 交易记录表的 cash_account_id 字段添加成功 ✅
  - `programmatic` TR-3.4: finance_assets 表的 status 和 archive_date 字段添加成功 ✅

## [x] Task 4: 后端 API 扩展 - 归档数据读写
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - 在 state-service.js 中加载 finance_asset_archives 数据
  - 在保存时支持 archives 数据的写入
  - 添加交易记录的 cash_account_id 字段读写
  - 添加持仓的 status 和 archive_date 字段读写
- **Acceptance Criteria Addressed**: AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-4.1: GET /api/state 返回 archives 数据 ✅
  - `programmatic` TR-4.2: PUT /api/state 能正确保存 archives 数据 ✅
  - `programmatic` TR-4.3: finance_assets 的 status 字段正确保存 ✅

## [x] Task 5: 清仓交易类型与自动归档逻辑
- **Priority**: high
- **Depends On**: Task 3, Task 4
- **Description**:
  - 在 DetailModal 的交易记录类型选项中添加"清仓"选项
  - 修改 handleAddRecord 函数：支持显式清仓和自动清仓判断
  - 清仓判断逻辑：显式选清仓 或 卖出后份额归零
  - 归档流程：将持仓状态设为 archived，移至归档列表
  - **关键修复**：financeAccounts 映射添加 status/isArchived 字段，activeHoldings 过滤使用 isArchived
- **Acceptance Criteria Addressed**: AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-5.1: 交易记录类型下拉框包含"清仓"选项 ✅
  - `programmatic` TR-5.2: 卖出数量超过持仓时自动标记为清仓 ✅
  - `programmatic` TR-5.3: 清仓后持仓从活跃列表消失 ✅
  - `programmatic` TR-5.4: 清仓后归档列表新增对应记录 ✅
  - `human-judgement` TR-5.5: 清仓标签视觉正确 ✅

## [x] Task 6: 归档列表前端实现
- **Priority**: high
- **Depends On**: Task 4, Task 5
- **Description**:
  - 理财模块页面有"活跃持仓"和"归档持仓"标签切换
  - 归档列表展示：资产名称、代码、清仓日期、最终盈亏
  - 归档列表支持查看明细（只读）和删除
  - 归档数据从 stateData.financeAssetArchives 读取
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-6.1: 切换到归档视图能正确显示已清仓数据 ✅
  - `programmatic` TR-6.2: 归档明细弹窗能正常打开（只读模式） ✅
  - `programmatic` TR-6.3: 删除归档记录功能正常 ✅
  - `human-judgement` TR-6.4: 归档列表 UI 美观清晰 ✅

## [x] Task 7: 现金账户联动 - 买入扣减逻辑
- **Priority**: high
- **Depends On**: Task 4
- **Description**:
  - handleAddRecord 中买入/建仓交易时自动扣减现金账户
  - 自动创建现金账户：名称 "{账户名} 现金账户"，type "cash"
  - 交易记录写入 cashAccountId 和 cashAccountName
  - handleSaveAccount 中新增持仓时同步处理现金账户
- **Acceptance Criteria Addressed**: AC-6, AC-8
- **Test Requirements**:
  - `programmatic` TR-7.1: 买入交易保存后现金账户余额正确减少 ✅
  - `programmatic` TR-7.2: 无现金账户时自动创建 ✅
  - `programmatic` TR-7.3: 交易记录的 cashAccountId 字段正确写入 ✅

## [x] Task 8: 现金账户联动 - 卖出/清仓增加逻辑
- **Priority**: high
- **Depends On**: Task 4, Task 7
- **Description**:
  - handleAddRecord 中卖出/清仓交易时自动增加现金账户
  - 清仓交易同时触发归档流程
  - 交易记录写入 cashAccountId 和 cashAccountName
- **Acceptance Criteria Addressed**: AC-7, AC-8
- **Test Requirements**:
  - `programmatic` TR-8.1: 卖出交易保存后现金账户余额正确增加 ✅
  - `programmatic` TR-8.2: 清仓交易保存后现金账户余额正确增加 ✅
  - `programmatic` TR-8.3: 交易记录的 cashAccountId 字段正确写入 ✅

## [x] Task 9: 交易记录显示关联现金账户
- **Priority**: medium
- **Depends On**: Task 7, Task 8
- **Description**:
  - DetailModal 交易记录列表显示关联的现金账户名称
  - loadData 中解析 cashAccountName 从 cashAccountId
  - 老数据（无 cashAccountId）显示为空
- **Acceptance Criteria Addressed**: AC-9, AC-10
- **Test Requirements**:
  - `programmatic` TR-9.1: 新交易记录显示关联的现金账户名称 ✅
  - `programmatic` TR-9.2: 老交易记录正常显示 ✅
  - `human-judgement` TR-9.3: 交易记录列表布局合理 ✅

## [x] Task 10: 构建验证和集成测试
- **Priority**: high
- **Depends On**: Task 1-9
- **Description**:
  - 执行 npm run build 确保无编译错误 ✅
  - 手动测试完整流程：
    1. 新增持仓 → 建仓交易 → 现金账户扣减 ✅
    2. 部分卖出 → 清仓归档 ✅
    3. 全部卖出自动清仓 ✅
    4. 归档列表查看 ✅
    5. 老数据兼容性 ✅
  - 修复发现的问题（核心：financeAccounts 映射缺少 status 字段）
- **Acceptance Criteria Addressed**: AC-1 through AC-10
- **Test Requirements**:
  - `programmatic` TR-10.1: npm run build 成功无错误 ✅
  - `programmatic` TR-10.2: 全流程手动测试通过 ✅
  - `human-judgement` TR-10.3: 整体 UI/UX 符合预期 ✅

## [x] Task 11: 清仓交易自动填充数量和价格
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 DetailModal 的交易记录表单中，监听类型选择变化
  - 当用户选择"清仓"类型时：
    - 数量字段自动填充 `latestData.availableShares || latestData.shares`（剩余全部持仓）
    - 价格字段自动填充 `latestData.currentPrice`（当前价格）
  - 当用户从"清仓"切换到其他类型时，清空自动填充的值
- **Acceptance Criteria Addressed**: AC-11
- **Test Requirements**:
  - `programmatic` TR-11.1: 选择清仓类型后数量字段自动填充剩余持仓 ✅
  - `programmatic` TR-11.2: 选择清仓类型后价格字段自动填充当前价格 ✅
  - `programmatic` TR-11.3: 切换到非清仓类型时不自动填充 ✅

## [x] Task 12: 列表持仓数据以交易明细为准动态计算
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 `financeAccounts` 计算映射中，根据交易明细重新计算持仓核心字段
  - 买入/建仓交易汇总：buyTotalQty, buyTotalAmount
  - 卖出/清仓交易汇总：sellTotalQty, sellTotalAmount
  - 费用汇总：totalFees
  - 动态计算：
    - `quantity` = buyTotalQty - sellTotalQty
    - `costPrice` = buyTotalAmount / buyTotalQty（若 buyTotalQty > 0）
    - `cost` = buyTotalAmount
  - 确保买入交易保存后列表数据自动更新
- **Acceptance Criteria Addressed**: AC-12
- **Test Requirements**:
  - `programmatic` TR-12.1: 添加买入交易后列表持仓数量增加 ✅
  - `programmatic` TR-12.2: 添加卖出交易后列表持仓数量减少 ✅
  - `programmatic` TR-12.3: 清仓后列表持仓数量归零并归档 ✅
  - `programmatic` TR-12.4: 数据校验通过（明细成本 = 列表成本） ✅

## [x] Task 13: 交易表单金额自动计算与费用位置调整
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 将费用字段从表单底部移动到数量字段旁边（同一行或相邻位置）
  - 金额字段改为只读/自动计算：金额 = 价格 × 数量
  - 金额计算触发时机：价格、数量、费用都有值时才计算
  - 允许用户手动覆盖金额（但默认自动计算）
  - 清仓类型下金额自动计算并禁用编辑
- **Acceptance Criteria Addressed**: AC-13
- **Test Requirements**:
  - `programmatic` TR-13.1: 费用字段在数量旁边 ✅
  - `programmatic` TR-13.2: 价格×数量后金额自动计算 ✅
  - `programmatic` TR-13.3: 清仓时金额自动计算且不可编辑 ✅
  - `human-judgement` TR-13.4: 表单布局美观 ✅

## [x] Task 14: 归档盈亏与收益率从交易明细统计
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改 `handleLiquidateArchive` 函数中的盈亏计算逻辑
  - 从交易记录统计：
    - `buyTotalAmount` = SUM(建仓/买入的 amount)
    - `sellTotalAmount` = SUM(卖出/清仓的 amount)
    - `totalFees` = SUM(所有交易的 commission/fee)
    - `finalPnl` = sellTotalAmount - buyTotalAmount - totalFees
    - `finalPnlPercent` = buyTotalAmount > 0 ? (finalPnl / buyTotalAmount) * 100 : 0
  - 归档列表中显示最终盈亏和最终收益率
  - 归档明细弹窗中也显示正确计算的值
- **Acceptance Criteria Addressed**: AC-14
- **Test Requirements**:
  - `programmatic` TR-14.1: 归档持仓最终盈亏计算正确 ✅
  - `programmatic` TR-14.2: 归档持仓最终收益率计算正确 ✅
  - `programmatic` TR-14.3: 买入<卖出时显示正收益 ✅
  - `programmatic` TR-14.4: 买入>卖出时显示负收益 ✅

## [x] Task 15: 现金账户余额计算修正
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - 确认现金账户余额计算逻辑：
    - 买入/建仓：`balance -= amount + fee`
    - 卖出/清仓：`balance += amount - fee`
  - 确保费用每次都从现金账户中扣除
  - 修正归档持仓明细中现金账户余额显示
- **Acceptance Criteria Addressed**: AC-6, AC-7
- **Test Requirements**:
  - `programmatic` TR-15.1: 买入后现金账户正确扣减（金额+费用） ✅
  - `programmatic` TR-15.2: 卖出后现金账户正确增加（金额-费用） ✅
  - `programmatic` TR-15.3: 多次交易后余额累计正确 ✅

## [x] Task 16: 构建验证和最终集成测试
- **Priority**: high
- **Depends On**: Task 11-15
- **Description**:
  - 执行 npm run build 确保无编译错误
  - 完整流程测试：
    1. 新增持仓 → 建仓自动填充数量价格（如选清仓）
    2. 买入加仓 → 列表数量自动更新
    3. 卖出减仓 → 列表数量自动更新
    4. 清仓 → 归档 → 盈亏计算正确
    5. 检查现金账户余额
    6. 检查数据校验
  - 截图验证归档明细的最终盈亏和收益率
- **Acceptance Criteria Addressed**: AC-11 through AC-14
- **Test Requirements**:
  - `programmatic` TR-16.1: npm run build 成功 ✅
  - `programmatic` TR-16.2: 全流程手动测试通过 ✅
  - `human-judgement` TR-16.3: UI/UX 符合预期 ✅
