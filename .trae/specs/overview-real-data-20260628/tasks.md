# Tasks - 资产总览页面数据真实性改造

## 任务清单

- [x] Task 1: 前端API层扩展（使用现有API）
  - [x] SubTask 1.1: 新增 `fetchState()` 函数 - 获取完整用户状态
  - [x] SubTask 1.2: 新增 `saveState(state)` 函数 - 保存用户状态（用于goals保存）
  - [x] SubTask 1.3: 确保 `fetchAssets()` 和 `fetchOverview()` 正常工作

- [x] Task 2: 前端Overview页面改造
  - [x] SubTask 2.1: 移除所有假数据变量 (mockLiabilities, mockGoals, mockLiquidity, mockIncomeExpense, mockGrowth)
  - [x] SubTask 2.2: 新增状态管理 (debts, records, accounts, goals, loadingGoals, savingGoals)
  - [x] SubTask 2.3: 实现时间筛选与数据联动 (timePeriod, selectedMonth状态驱动数据加载)
  - [x] SubTask 2.4: 实现从records计算收入支出数据
  - [x] SubTask 2.5: 实现从debts计算负债数据
  - [x] SubTask 2.6: 实现从accounts和records计算流动性指标
  - [x] SubTask 2.7: 实现刷新按钮功能 (重新加载所有数据)
  - [x] SubTask 2.8: 实现编辑目标弹窗 (显示/关闭/保存逻辑)
  - [x] SubTask 2.9: 添加错误处理和加载状态

- [x] Task 3: 后端接口验证
  - [x] SubTask 3.1: 验证 `/api/state` GET 返回完整数据（debts, records, accounts, overviewGoals）
  - [x] SubTask 3.2: 验证 `/api/state` PUT 可保存 overviewGoals

- [x] Task 4: 测试验证
  - [x] SubTask 4.1: 前端构建验证
  - [ ] SubTask 4.2: 页面功能测试 (数据展示/刷新/编辑)
  - [ ] SubTask 4.3: 时间筛选功能测试
  - [ ] SubTask 4.4: 响应式布局测试

## 任务依赖关系

```
Task 1 (前端API层) ─> Task 2 (Overview页面) ─> Task 4 (测试验证)
       │
       v
Task 3 (后端接口验证)
```

## 技术方案

### 前端API层
- `fetchState()` - GET /api/state 获取完整用户状态
- `saveState(state)` - PUT /api/state 保存用户状态

### 数据计算函数
- `computeLiabilities(debts)` - 从debts数组计算负债汇总
- `computeIncomeExpense(records, timeFilter)` - 从records计算收入支出
- `computeLiquidity(accounts, records)` - 从accounts和records计算流动性
- `computeGoals(overviewGoals, assets)` - 计算目标进度

### 时间筛选
- `filterByTime(records)` - 根据timePeriod和selectedMonth筛选records
