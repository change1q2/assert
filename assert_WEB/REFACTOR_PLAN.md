# app.js 重构计划

> app.js 当前状态：11,000+ 行代码，450+ 函数

## 目标

将单文件 app.js 拆分为多个模块化文件，提高可维护性和加载性能。

## 拆分方案

### Phase 1: 配置与常量 (1-500行)
- `config/constants.js` - modules, auxiliaryTools, toolPanels, fixedAssetClassNames, API_BASE
- `config/demo-data.js` - seed 演示数据
- `config/column-defs.js` - STOCK_COLUMN_DEFS, hkIpoAllCols, hkIpoLockedCols, hkIpoFilterFields

### Phase 2: 工具函数 (500-1000行)
- `utils/format.js` - money, compactMoney, percent, formatDate, formatDateTime, fileSizeLabel
- `utils/date.js` - startOfWeek, presetRange, analysisPeriodRange, today
- `utils/validators.js` - 输入验证函数

### Phase 3: 状态管理 (1000-2000行)
- `state/loader.js` - loadState, normalizeLoadedState, saveState
- `state/auth.js` - loadAuth, saveAuth, isAuthenticated, syncUserFromAuth
- `state/sync.js` - syncAssetClassValuesFromFinance

### Phase 4: API 层 (2000-2500行)
- `api/request.js` - apiRequest, bootstrapSession, loadReleaseCatalog
- `api/quotes.js` - fetchRealtimeQuotes, fetchKlineData

### Phase 5: 计算与统计 (2500-3500行)
- `calc/compute.js` - compute, financeProfitAmountForYear, annualAnalysisStats
- `calc/series.js` - monthlySeries, dailyCalendarSeries
- `calc/backtest.js` - backtestModel

### Phase 6: 渲染函数 - 概览 (3500-4500行)
- `render/overview.js` - overview, overviewTotal, overviewLegend, pieSegments
- `render/overview-cards.js` - overviewPieCard, overviewDonutCard, overviewBarCard
- `render/overview-charts.js` - assetGrowthLineCard, annualAssetChangeCard

### Phase 7: 渲染函数 - 收支 (4500-5500行)
- `render/records.js` - records, ledgerKpi, ledgerDayCalendar
- `render/records-charts.js` - ledgerTrendChart, assetTrendChart, ledgerDonut

### Phase 8: 渲染函数 - 理财 (5500-7000行)
- `render/finance.js` - finance, financeAnalysis, financeAnalysisAssets
- `render/finance-charts.js` - financeComparisonChart, financeRankCard, financePnlCalendar
- `render/finance-table.js` - financeAssetTable, renderStockColumnPanel
- `render/finance-kline.js` - renderKlineChart, openKlineChart

### Phase 9: 渲染函数 - 债务与账户 (7000-8000行)
- `render/debts.js` - debts, debtGroup, debtCard, debtPlan
- `render/accounts.js` - accounts, assetClasses

### Phase 10: 渲染函数 - 分析与策略 (8000-8500行)
- `render/analysis.js` - analysis
- `render/strategies.js` - strategies, portfolioBacktestPage

### Phase 11: 渲染函数 - 其他 (8500-9000行)
- `render/auth.js` - authPage
- `render/profile.js` - profile
- `render/downloads.js` - downloads
- `render/tools.js` - tools, toolEntryMarkup, externalToolView

### Phase 12: 工具页面 (9000-10000行)
- `tools/hkipo.js` - hkIpoTool, loadHkIpo, hkIpoMainTable, hkIpoRulesTable
- `tools/premium.js` - premiumTool, loadPremiumMarket

### Phase 13: 表单与对话框 (10000-11000行)
- `dialogs/auth.js` - handleAuthSubmit, handleSendAuthCode, completeAuthentication
- `dialogs/feedback.js` - handleFeedbackSubmit, loadFeedbackList, bindFeedbackComposer
- `dialogs/profile.js` - handleProfileSubmit, handlePreferenceSubmit
- `dialogs/debt.js` - openDebtDialog, handleDebtSubmit
- `dialogs/account.js` - openAccountDialog, handleAccountSubmit
- `dialogs/holding.js` - openHoldingDetail, renderHoldingTab, renderTradeTab
- `dialogs/finance.js` - openFinanceAssetDialog, handleFinanceAssetSubmit
- `dialogs/record.js` - openRecordDialog, handleRecordSubmit
- `dialogs/class.js` - openAssetClassDialog, handleAssetClassSubmit

### Phase 14: 金融 OCR (10000-12000行)
- `ocr/finance-ocr.js` - handleFinanceImageRecognition, parseFinanceOcrText
- `ocr/ocr-parser.js` - parseBrokerPnlColumns, parseBrokerDetailTransactions
- `ocr/ocr-utils.js` - normalizeFinanceOcrCode, extractFinanceCodes

## 文件结构

```
assert_WEB/
├── js/
│   ├── app.js              # 主入口，只保留 init 和路由
│   ├── config/
│   │   ├── constants.js
│   │   ├── demo-data.js
│   │   └── column-defs.js
│   ├── utils/
│   │   ├── format.js
│   │   ├── date.js
│   │   └── validators.js
│   ├── state/
│   │   ├── loader.js
│   │   ├── auth.js
│   │   └── sync.js
│   ├── api/
│   │   ├── request.js
│   │   └── quotes.js
│   ├── calc/
│   │   ├── compute.js
│   │   ├── series.js
│   │   └── backtest.js
│   ├── render/
│   │   ├── overview.js
│   │   ├── overview-cards.js
│   │   ├── overview-charts.js
│   │   ├── records.js
│   │   ├── records-charts.js
│   │   ├── finance.js
│   │   ├── finance-charts.js
│   │   ├── finance-table.js
│   │   ├── finance-kline.js
│   │   ├── debts.js
│   │   ├── accounts.js
│   │   ├── analysis.js
│   │   ├── strategies.js
│   │   ├── auth.js
│   │   ├── profile.js
│   │   ├── downloads.js
│   │   └── tools.js
│   ├── tools/
│   │   ├── hkipo.js
│   │   └── premium.js
│   ├── dialogs/
│   │   ├── auth.js
│   │   ├── feedback.js
│   │   ├── profile.js
│   │   ├── debt.js
│   │   ├── account.js
│   │   ├── holding.js
│   │   ├── finance.js
│   │   ├── record.js
│   │   └── class.js
│   └── ocr/
│       ├── finance-ocr.js
│       ├── ocr-parser.js
│       └── ocr-utils.js
├── index.html
├── admin.html
└── styles.css
```

## 实施步骤

1. 创建目录结构
2. 按 Phase 逐步拆分，每个 Phase 完成后测试
3. 确保所有函数引用正确
4. 最终合并到 app.js

## 注意事项

- 保持函数名称不变，避免破坏外部调用
- 按需加载（使用 dynamic import）以提高初始加载速度
- 每个模块独立测试后再集成
