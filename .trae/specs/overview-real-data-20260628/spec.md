# 资产总览页面数据真实性改造 Spec

## Why
当前资产总览页面存在大量假数据（mockLiabilities、mockGoals、mockLiquidity、mockIncomeExpense、mockGrowth），以及假按钮（刷新、编辑）无实际功能。需要将这些数据替换为真实数据，并实现按钮的实际功能。数据应从后端现有的收支分析、理财模块、债务模块获取并计算。

## What Changes
- 将负债数据替换为真实后端数据（从 `/api/state` 的 `debts` 数组计算）
- 将进度目标数据替换为真实数据（从 `/api/state` 的 `overviewGoals` 获取）
- 将流动性指标替换为真实数据（从 `accounts` 和 `records` 计算）
- 将收入支出数据替换为真实数据（从 `/api/state` 的 `records` 数组按类型分组计算）
- 将资产增长趋势替换为真实数据（从资产历史记录或records计算）
- 实现刷新数据按钮功能（重新加载所有数据）
- 实现编辑进度目标功能（弹窗编辑后保存到 `overviewGoals`）
- 确保页面在WEB端（桌面/平板/移动）完美适配

## Impact
- Affected specs: 资产总览页面
- Affected code:
  - 前端: `Overview.jsx`, `api/index.js`
  - 后端: 使用现有 `/api/state` 接口获取数据

## 数据来源映射

### 后端数据源
| 页面数据 | 后端数据源 | 计算方式 |
|---------|-----------|---------|
| 负债数据 | `debts` 数组 | 按category分组，计算total、dueIn30Days |
| 进度目标 | `overviewGoals` (user_settings) | 直接读取/保存 |
| 流动性指标 | `accounts` + `records` | 流动资产=账户余额，收入支出从records计算 |
| 收入支出 | `records` 数组 | 按type(income/expense)分组统计 |
| 资产增长 | `assetClasses` 或 `records` | 从资产分类值或收支记录推导 |

### 现有API接口
- `GET /api/state` - 返回包含 `debts`, `records`, `accounts`, `assetClasses`, `overviewGoals` 的完整用户状态

## ADDED Requirements

### Requirement: 真实负债数据展示
页面应从后端获取真实负债数据，从 `/api/state` 的 `debts` 数组计算负债汇总。

#### Scenario: 负债数据加载成功
- **WHEN** 页面加载或刷新时
- **THEN** 从 `/api/state` 获取 `debts` 数据并按类别汇总展示

#### Scenario: 负债数据计算逻辑
- **总负债** = 所有债务的 `amount` 之和
- **30天待还** = 信用卡、消费贷等短期债务中即将到期的金额
- **负债明细** = 按 `category` 分组展示

### Requirement: 真实进度目标展示
页面应从后端获取用户的进度目标数据，从 `overviewGoals` 读取。

#### Scenario: 进度目标数据加载
- **WHEN** 页面加载时
- **THEN** 从 `/api/state` 获取 `overviewGoals` 数据

#### Scenario: 编辑保存进度目标
- **WHEN** 用户编辑目标并保存
- **THEN** 调用 `/api/state` PUT 接口保存 `overviewGoals`

### Requirement: 真实流动性指标展示
页面应从后端获取真实的流动性指标数据。

#### Scenario: 流动性指标计算
- **应急月数** = 流动资产 / 月均支出
- **流动资产** = 所有账户的 `balance` 之和（排除负债账户）
- **月均支出** = 从 `records` 中支出记录计算月均

### Requirement: 真实收入支出数据展示
页面应从后端获取真实的收入支出分类数据，从 `records` 数组按类型分组。

#### Scenario: 收入支出数据加载
- **WHEN** 页面加载时
- **THEN** 从 `/api/state` 获取 `records`，筛选 type='income' 和 type='expense' 分组统计

### Requirement: 真实资产增长趋势展示
页面应根据历史数据展示资产增长趋势。

#### Scenario: 资产增长趋势数据
- **WHEN** 页面加载时
- **THEN** 从 `assetClasses` 的历史值或 `records` 推导月度变化

### Requirement: 时间范围筛选
页面顶部的时间筛选器应支持切换不同时间范围，并根据选择的时间范围筛选数据。

#### Scenario: 切换时间范围
- **WHEN** 用户点击"日常"、"月统计"、"年统计"或"自定义"标签
- **THEN** 切换当前时间类型，筛选 `records` 中对应时间段的数据

#### Scenario: 选择具体月份
- **WHEN** 用户点击月份按钮（如"本月"、"上月"、"4月"等）
- **THEN** 筛选对应月份的数据，更新所有卡片数据

#### Scenario: 时间筛选与数据联动
- **WHEN** 用户切换时间范围或月份
- **THEN** 所有数据（收入/支出/负债/流动性）按筛选条件重新计算

### Requirement: 刷新数据按钮
用户点击"刷新数据"按钮时应重新加载所有数据。

#### Scenario: 点击刷新按钮
- **WHEN** 用户点击"刷新数据"按钮
- **THEN** 重新调用 `/api/state` 获取最新数据，显示加载状态

### Requirement: 编辑进度目标
用户点击"编辑"按钮时应打开编辑弹窗，修改后可保存。

#### Scenario: 编辑进度目标
- **WHEN** 用户点击进度目标的"编辑"按钮
- **THEN** 打开编辑弹窗，显示当前目标值
- **AND** 用户修改后点击"保存"
- **THEN** 调用 `/api/state` PUT 保存 `overviewGoals`

### Requirement: WEB端响应式适配
页面应完美适配桌面端、平板端和移动端。

#### Scenario: 响应式布局
- **WHEN** 页面在不同尺寸设备上显示
- **THEN** 布局自动调整，确保内容可读性和易用性

## MODIFIED Requirements

### Requirement: 现有真实数据保持
资产列表（总资产、总成本、总盈亏、收益率、分类统计）已从真实API获取，应保持不变。

## REMOVED Requirements

### Requirement: 假数据移除
移除以下假数据变量及其使用：
- mockLiabilities
- mockGoals
- mockLiquidity
- mockIncomeExpense
- mockGrowth（改为从真实历史数据计算）

## 技术方案

### 前端数据计算
```javascript
// 负债数据计算
const liabilities = debts.reduce((acc, debt) => {
  acc.total += debt.amount;
  if (debt.dueIn30Days) acc.dueIn30Days += debt.dueIn30Days;
  // 按category分组
  const key = debt.category || '其他';
  if (!acc.items[key]) acc.items[key] = { name: key, amount: 0 };
  acc.items[key].amount += debt.amount;
  return acc;
}, { total: 0, dueIn30Days: 0, items: [] });

// 收入支出计算
const incomeRecords = records.filter(r => r.type === 'income');
const expenseRecords = records.filter(r => r.type === 'expense');
const incomeByCategory = incomeRecords.reduce((acc, r) => {
  acc[r.category] = (acc[r.category] || 0) + r.amount;
  return acc;
}, {});
const expenseByCategory = expenseRecords.reduce((acc, r) => {
  acc[r.category] = (acc[r.category] || 0) + r.amount;
  return acc;
}, {});

// 流动性计算
const liquidAssets = accounts
  .filter(a => !a.liability)
  .reduce((sum, a) => sum + a.balance, 0);
const monthlyExpense = expenseRecords
  .filter(r => isInMonth(r.date, selectedMonth))
  .reduce((sum, r) => sum + r.amount, 0);
const emergencyMonths = monthlyExpense > 0 ? liquidAssets / monthlyExpense : 999;
```

### 时间筛选参数
```javascript
const getTimeFilter = (timePeriod, selectedMonth) => {
  const now = new Date();
  switch (timePeriod) {
    case '日常': return { start: startOfDay, end: endOfDay };
    case '月统计': return { start: startOfMonth, end: endOfMonth };
    case '年统计': return { start: startOfYear, end: endOfYear };
    case '自定义': return getCustomRange(selectedMonth);
  }
};
```

### 后端API（使用现有接口）
- `GET /api/state` - 获取完整用户状态（包含debts, records, accounts, assetClasses, overviewGoals）
- `PUT /api/state` - 保存用户状态（包含overviewGoals）
