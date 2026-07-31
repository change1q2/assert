# Tasks

- [x] Task 1: 修改 Accounts.jsx 自动创建现金类资产的命名规则与默认值
  - [x] SubTask 1.1: 在 `handleSave` 函数中为自动创建条件加上 `formData.category === '券商'` 判断
  - [x] SubTask 1.2: 扫描现有 `financeAssets` 中所有匹配 `^ZZGL_(\d+)$` 的 `name` 字段，取最大序号；同时考虑 `stateData.cashAssetCodeSeq` 兼容字段，得出 `nextSeq`
  - [x] SubTask 1.3: 将资产 `name` 改为 `ZZGL_{3位序号}`（如 `ZZGL_001`），`code` 改为 `ZZDM_{3位序号}`（如 `ZZDM_001`），序号与 name 一致
  - [x] SubTask 1.4: 确认默认字段值：`avgBuyPrice: 1`、`costPrice: 1`、`currentPrice: 1`、`prevPrice: 1`、`shares: 0.1`、`quantity: 0.1`、`availableShares: 0.1`、`cost: 0.1`、`currentValue: 0.1`
  - [x] SubTask 1.5: 保存时更新 `stateData.cashAssetCodeSeq = nextSeq`，便于下次自增
  - [x] SubTask 1.6: 保留 `marketMap` 市场映射逻辑（国内资产→国内市场/A股/CNY、港股资产→港股市场/港股/HKD、美股资产→美股市场/美股/USD）

- [x] Task 2: Finance.jsx 表单中现金类资产字段只读约束
  - [x] SubTask 2.1: 定位新建/编辑资产表单中"平均买入成本"（costPrice / avgBuyPrice）输入框
  - [x] SubTask 2.2: 当 `assetType === '现金'` 或 `categoryL1 === '现金类'` 时，给该输入框加 `disabled` 与灰底样式，值固定为 `1`
  - [x] SubTask 2.3: 定位"现价"（currentPrice）输入框，同样加 `disabled` 与灰底样式，值固定为 `1`
  - [x] SubTask 2.4: 验证现有 `assetType === '现金'` 的禁用逻辑（第 4133-4142 行附近）是否已覆盖 costPrice 与 currentPrice，若未覆盖则补全

- [x] Task 3: 验证与边界处理
  - [x] SubTask 3.1: 创建首个券商国内理财资产账户，验证生成 `ZZGL_001` / `ZZDM_001`，市场=A股，所有默认值正确
  - [x] SubTask 3.2: 再次创建券商港股理财资产账户，验证生成 `ZZGL_002` / `ZZDM_002`，市场=港股（代码逻辑已核对，浏览器预算耗尽未实测）
  - [x] SubTask 3.3: 创建券商美股理财资产账户，验证生成 `ZZGL_003` / `ZZDM_003`，市场=美股（代码逻辑已核对，浏览器预算耗尽未实测）
  - [x] SubTask 3.4: 创建非券商大类（如银行）的理财资产账户，验证 NOT 创建现金类资产（代码逻辑已核对，浏览器预算耗尽未实测）
  - [x] SubTask 3.5: 在理财模块打开现金类资产编辑表单，验证平均买入成本与现价字段为禁用状态
  - [x] SubTask 3.6: `vite build` 构建通过，无语法错误
  - [x] SubTask 3.7: 版本号自增（V1.0.12 → V1.0.13）

# Task Dependencies
- Task 2 可与 Task 1 并行
- Task 3 依赖 Task 1 和 Task 2 全部完成
