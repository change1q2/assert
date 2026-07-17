# 分页样式改造与场外基金数据修复 - 实施计划

## [x] Task 1: 改造交易记录分页组件
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 将 `recordPageSize` 从硬编码常量改为 state（支持切换）
  - 在分页区域左侧添加"共X条记录"文字（X = sortedRecords.length）
  - 添加每页条数下拉选择（5/10/20/50），切换时重置到第1页
  - 保持现有"上一页/第X/X页/下一页"按钮功能
  - 参考 CategoryTable 分页的样式实现
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `human-judgment` TR-1.1: 打开明细弹窗，确认分页左侧显示正确的记录总数
  - `human-judgment` TR-1.2: 切换每页条数，确认列表和分页正确更新
  - `programmatic` TR-1.3: 构建成功无错误

## [x] Task 2: 改造持仓明细（CategoryTable）分页组件
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 Pagination 组件左侧添加"共X条记录"文字（X = filtered.length）
  - 保持现有每页条数下拉和页码输入功能
  - 整体布局左对齐记录数，右对齐分页控件
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgment` TR-2.1: 理财页面持仓表格底部分页显示"共X条记录"
  - `programmatic` TR-2.2: 构建成功无错误

## [x] Task 3: 修复后端基金净值 API 获取 prevNav
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 检查 `getFundNav` 中 `pageSize=2` 的返回数据
  - 如果返回不足2条，增大 pageSize 到 5 或 10 以确保能获取前一日净值
  - 如果 API 返回的 `prevNav` 仍为 null，增加备用数据源（如天天基金网估算接口）
  - 确保 `prevNav` 和 `nav` 都能正确返回给前端
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-3.1: 后端接口 `/api/finance/fund-nav` 返回的数据包含非 null 的 `prevNav`
  - `programmatic` TR-3.2: 前端 `fetchFundNav` 调用后，`funds` 数组中的 `prevNav` 字段非空

## [x] Task 4: 修复前端 loadFundNav 数据保存逻辑
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 确认 `loadFundNav` 正确将 `prevPrice` 保存到 `stateData.financeAssets`
  - 确认 `financeAccounts` computed 值能正确读取 `prevPrice`
  - 检查 DetailModal 中 `latestData.prevPrice` 是否能正确获取
  - 确保 `getDailyPnl` 函数在场外基金场景下使用 `a.prevPrice` 计算
- **Acceptance Criteria Addressed**: AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-4.1: 页面加载后，场外基金资产的 `stateData.financeAssets[i].prevPrice` > 0
  - `human-judgment` TR-4.2: 打开场外基金明细弹窗，昨日收益显示非0值

## [x] Task 5: 验证数据获取时间显示
- **Priority**: medium
- **Depends On**: Task 4
- **Description**: 
  - 确认 DetailModal 中净值区域的"数据获取时间"文字正确显示
  - 确认 `priceDate` 格式正确（YYYY-MM-DD），slice 截取月日无误
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `human-judgment` TR-5.1: 明细弹窗中"最新净值"下方显示"同步天天基金网 07月14日"

## [x] Task 6: 构建测试与验证
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 4, Task 5
- **Description**: 
  - 前端执行 `npm run build` 确认构建成功
  - 检查所有修改的组件无编译错误
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `programmatic` TR-6.1: `npm run build` 退出码为 0

# Task Dependencies
- Task 4 depends on Task 3
- Task 5 depends on Task 4
- Task 6 depends on Task 1, Task 2, Task 4, Task 5
