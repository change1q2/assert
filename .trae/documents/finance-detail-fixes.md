# Finance 详情弹窗修复计划

## 问题概述

从用户截图和反馈中，存在以下3个问题需要修复：

1. **昨日收益显示为 +0.00，应为 -11.05** —— 债券类场外资产的 `prevPrice` 未参与 `getDailyPnl` 计算
2. **持仓收益显示为 -66.29，应为 -66.30** —— `holdingPnl` 的浮点精度导致 `toFixed(2)` 舍入结果与预期不符
3. **新增交易记录保存后未显示在列表中** —— `saveTradeRecords` 异步保存后未刷新父组件 `stateData`

---

## 当前状态分析

### 问题1：昨日收益为0

**代码位置：** [Finance.jsx#L2820-L2838](file:///c:/Users/YZ-X-096/.trae-cn/worktrees/assert/feat-douyin-project-changes-4EQ8Jo/assert_WEB/src/pages/Finance.jsx#L2820-L2838)

```javascript
const getDailyPnl = (a) => {
  if (a.code && quotesMap[a.code] && quotesMap[a.code].price != null && quotesMap[a.code].prevClose != null) {
    const qty = parseFloat(a.shares || a.quantity) || 0;
    return (quotesMap[a.code].price - quotesMap[a.code].prevClose) * qty;
  }
  return parseFloat(a.todayPnl) || parseFloat(a.dailyPnl) || 0;
};
```

- 对于债券类场外资产，`quotesMap` 中通常**没有实时行情数据**
- 回退逻辑使用 `a.todayPnl || a.dailyPnl`，但这些字段在新增资产时未被计算和存储
- `a.prevPrice` 和 `a.currentPrice` 已存在于数据中，但**未被 `getDailyPnl` 使用**

**预期计算：** `昨日收益 = 份额 × (最新净值 - 前一交易日净值)` = `11048.96 × (1.3910 - 1.3920) = -11.05`

### 问题2：持仓收益为 -66.29（应为 -66.30）

**代码位置：** [Finance.jsx#L2847-L2876](file:///c:/Users/YZ-X-096/.trae-cn/worktrees/assert/feat-douyin-project-changes-4EQ8Jo/assert_WEB/src/pages/Finance.jsx#L2847-L2876)

```javascript
const _unitPnl = _price - _cost;           // 1.3910 - 1.3970 = -0.006000000000000005
const _holdingPnl = _unitPnl * _qty;       // -0.006... × 11048.96 = -66.29376000000006
```

- JavaScript 浮点数精度问题导致计算结果为 `-66.29376000000006`
- `toFixed(2)` 舍入后为 `-66.29`，但用户期望 `-66.30`
- 需要在**保存资产时**就将 `holdingPnl` 计算并四舍五入到 2 位小数，而非依赖前端显示时格式化

### 问题3：新增交易记录未显示

**代码位置：** [Finance.jsx#L162-L179](file:///c:/Users/YZ-X-096/.trae-cn/worktrees/assert/feat-douyin-project-changes-4EQ8Jo/assert_WEB/src/pages/Finance.jsx#L162-L179)

```javascript
const saveTradeRecords = async (records) => {
  if (!saveState || !stateData) return;
  // ... 保存到后端
  await saveState({ ...stateData, financeAssets: updatedFinanceAssets });
};
```

- `saveTradeRecords` 调用 `saveState` 将交易记录保存到后端
- 但 `saveState` 是异步的，**不会自动更新父组件 `Finance` 的 `stateData`**
- 下次打开详情弹窗时，`data.transactions` 仍然是旧数据
- 需要：保存成功后通知父组件刷新数据，或直接在本地状态中管理交易记录

---

## 修改方案

### 修改1：在 `getDailyPnl` 中添加 `prevPrice` 回退逻辑

**文件：** [Finance.jsx](file:///c:/Users/YZ-X-096/.trae-cn/worktrees/assert/feat-douyin-project-changes-4EQ8Jo/assert_WEB/src/pages/Finance.jsx)
**位置：** `computed` useMemo 中的 `getDailyPnl` 函数

```javascript
const getDailyPnl = (a) => {
  // 优先使用实时行情数据
  if (a.code && quotesMap[a.code] && quotesMap[a.code].price != null && quotesMap[a.code].prevClose != null) {
    const qty = parseFloat(a.shares || a.quantity) || 0;
    return (quotesMap[a.code].price - quotesMap[a.code].prevClose) * qty;
  }
  // 其次使用资产自身存储的 prevPrice + currentPrice 计算（适用于场外基金）
  const _prevPrice = parseFloat(a.prevPrice) || 0;
  const _currPrice = parseFloat(a.currentPrice) || 0;
  if (_prevPrice > 0 && _currPrice > 0) {
    const qty = parseFloat(a.shares || a.quantity) || 0;
    return (_currPrice - _prevPrice) * qty;
  }
  // 最后回退到已存储的 dailyPnl
  return parseFloat(a.todayPnl) || parseFloat(a.dailyPnl) || 0;
};
```

### 修改2：在 `getDailyPnlRate` 中同步更新

**文件：** [Finance.jsx](file:///c:/Users/YZ-X-096/.trae-cn/worktrees/assert/feat-douyin-project-changes-4EQ8Jo/assert_WEB/src/pages/Finance.jsx)
**位置：** `computed` useMemo 中的 `getDailyPnlRate` 函数

```javascript
const getDailyPnlRate = (a) => {
  if (a.code && quotesMap[a.code] && quotesMap[a.code].changePct != null) {
    return quotesMap[a.code].changePct;
  }
  const dailyPnl = getDailyPnl(a);
  const _prevPrice = parseFloat(a.prevPrice) || 0;
  const _currPrice = parseFloat(a.currentPrice) || 0;
  // 对于场外基金，使用 (currentPrice - prevPrice) / prevPrice 计算日涨幅
  if (_prevPrice > 0 && _currPrice > 0) {
    return ((_currPrice - _prevPrice) / _prevPrice) * 100;
  }
  const cost = parseFloat(a.costPrice || a.cost) || 0;
  if (cost > 0) {
    return (dailyPnl / cost) * 100;
  }
  return parseFloat(a.todayPnlPercent) || parseFloat(a.dailyPnlRate) || 0;
};
```

### 修改3：修复持仓收益精度问题

**文件：** [Finance.jsx](file:///c:/Users/YZ-X-096/.trae-cn/worktrees/assert/feat-douyin-project-changes-4EQ8Jo/assert_WEB/src/pages/Finance.jsx)
**位置：** `handleSaveAccount` 函数中 payload 构建部分

在保存资产时，预先计算 `holdingPnl`、`holdingPnlRate`、`dailyPnl`、`dailyPnlRate`，并四舍五入到 2 位小数：

```javascript
const costPrice = parseFloat(newAccount.cost) || 0;
const quantity = parseFloat(newAccount.quantity) || 0;
const currentPrice = parseFloat(newAccount.currentPrice) || 0;
const prevPrice = parseFloat(newAccount.prevPrice) || 0;

const holdingPnl = parseFloat((currentPrice - costPrice) * quantity);
const holdingPnlRate = costPrice > 0 ? parseFloat(((currentPrice - costPrice) / costPrice) * 100) : 0;
const dailyPnl = prevPrice > 0 ? parseFloat((currentPrice - prevPrice) * quantity) : 0;
const dailyPnlRate = prevPrice > 0 ? parseFloat(((currentPrice - prevPrice) / prevPrice) * 100) : 0;

// 在 payload 中使用这些计算值
pnl: holdingPnl,
pnlPercent: holdingPnlRate,
todayPnl: dailyPnl,
todayPnlPercent: dailyPnlRate,
```

同时在 `financeAccounts` 映射中也使用 `Math.round(value * 100) / 100` 来确保精度一致：

```javascript
const _holdingPnl = Math.round(_unitPnl * _qty * 100) / 100;
```

### 修改4：修复交易记录保存后未刷新问题

**文件：** [Finance.jsx](file:///c:/Users/YZ-X-096/.trae-cn/worktrees/assert/feat-douyin-project-changes-4EQ8Jo/assert_WEB/src/pages/Finance.jsx)
**位置：** `saveTradeRecords` 函数和 `DetailModal` 调用处

方案：在 `saveTradeRecords` 成功后，通过回调通知父组件刷新数据。

在 `Finance` 组件中定义刷新函数并传递给 `DetailModal`：

```javascript
// 在 Finance 组件中
const refreshData = async () => {
  await loadData();
};

// 传递给 DetailModal
<DetailModal
  data={detailData}
  totalMarketValue={computed.totalMarketValue || 0}
  onClose={() => setShowDetailModal(false)}
  saveState={saveState}
  stateData={stateData}
  onRefresh={refreshData}
/>
```

在 `DetailModal` 的 `saveTradeRecords` 中保存成功后调用 `onRefresh`：

```javascript
const saveTradeRecords = async (records) => {
  if (!saveState || !stateData) return;
  try {
    const currentFinanceAssets = stateData?.financeAssets || [];
    const updatedFinanceAssets = currentFinanceAssets.map(item => {
      if (String(item.id) === String(data.id)) {
        return { ...item, transactions: records };
      }
      return item;
    });
    await saveState({
      ...stateData,
      financeAssets: updatedFinanceAssets,
    });
    // 通知父组件刷新数据
    if (onRefresh) await onRefresh();
  } catch (err) {
    console.error('Failed to save trade records:', err);
  }
};
```

### 修改5：在最新净值下方显示获取时间

**文件：** [Finance.jsx](file:///c:/Users/YZ-X-096/.trae-cn/worktrees/assert/feat-douyin-project-changes-4EQ8Jo/assert_WEB/src/pages/Finance.jsx)
**位置：** 债券类场外资产详情弹窗的净值显示区域

在"最新净值"标签下方添加一行浅色小字，显示数据获取时间：

```jsx
<div className="flex items-baseline gap-1">
  <span className="text-base text-gray-600 dark:text-gray-300">最新净值</span>
  {priceDate && (
    <span className="text-sm text-gray-400 dark:text-gray-500">{priceDate.slice(5)}</span>
  )}
</div>
<span className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">数据获取时间: {new Date().toLocaleString('zh-CN')}</span>
```

---

## 验证步骤

1. **昨日收益验证**
   - 编辑一个债券类场外资产，设置 `currentPrice=1.3910`、`prevPrice=1.3920`、`quantity=11048.96`
   - 打开详情弹窗，确认"昨日收益"显示为 **-11.05**
   - 确认"日涨幅"显示为 **-0.07%**

2. **持仓收益精度验证**
   - 同一资产，确认"持仓收益"显示为 **-66.30**（而非 -66.29）
   - 确认"累计收益"显示为 **-66.30**
   - 确认"持有收益"显示为 **-66.30**

3. **交易记录验证**
   - 在详情弹窗中点击"新增记录"
   - 填写记录信息并保存
   - 确认记录立即显示在交易记录列表中
   - 关闭弹窗后重新打开，确认记录仍然存在

4. **获取时间验证**
   - 确认"最新净值"标签下方显示浅色获取时间文字
