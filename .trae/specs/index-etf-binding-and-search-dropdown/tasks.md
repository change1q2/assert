# 指数关联ETF与自定义搜索下拉 - 任务计划

- [x] Task 1: 修改内置指数配置，添加 etfCode 字段
  - [x] 在 `AssetPenetration.jsx` 中修改 `indexOptions` 数组，为每个内置指数新增 `etfCode` 字段（上证→sh530060、深证→sz159943、创业板→sz159247、上证50→sh510100、沪深300→sh510360、中证500→sh510580、纳斯达克→sz159660、标普500→sh513650）
  - [x] 新增 `selectedEtfCode` 派生值（useMemo 根据 selectedIndex 查找对应 etfCode；自定义指数则使用自身 code 作为 etfCode）
  - [x] 自定义指数 `customIndices` 数据结构保持 `{ code, name }`，添加时由搜索接口返回的中文名称填充 name

- [x] Task 2: 修改指数数据获取逻辑使用 etfCode
  - [x] 修改 `fetchIndexData` useEffect：调用 `/api/finance/index?code=${etfCode}` 而非 `selectedIndex`
  - [x] 修改 `fetchAllIndexData` useEffect：遍历 `allIndexOptions` 时使用每个 option 的 etfCode（自定义指数的 etfCode 等于其 code）
  - [x] 修改 `fetchIndexHistory` useEffect：依赖项改为 `selectedEtfCode`（而非 `selectedIndex`），调用接口时使用 etfCode
  - [x] allIndexData 的 key 仍用 selectedIndex 作为唯一标识，value 中存储 etfCode 对应的实时数据

- [x] Task 3: 实现自定义输入搜索下拉选择
  - [x] 新增状态 `searchQuery`（输入文本）、`searchResults`（候选列表）、`showSearchDropdown`（下拉显隐）、`searchLoading`（搜索中）
  - [x] 实现 `handleSearchInput` 函数：输入变化时防抖（300ms）调用 `/api/finance/lookup?q=${value}` 获取候选列表
  - [x] 渲染下拉候选列表：每项显示 `${item.name} (${item.code})`，点击后调用 `addCustomIndex(item.code, item.name)` 添加
  - [x] 修改 `addCustomIndex` 函数签名：接收 (code, name)，自动补全 sh/sz 前缀，避免重复，写入 localStorage，自动选中
  - [x] 输入框失焦或按 Esc 关闭下拉；输入框为空时清空候选项
  - [x] 保留原"添加"按钮作为快捷方式：若输入框有内容且无候选，仍允许直接添加（按代码）

- [x] Task 4: 修复切换指数时曲线图不刷新的 bug
  - [x] 检查 `fetchIndexHistory` useEffect 依赖数组：包含 `selectedEtfCode` 和 `timeRange`
  - [x] 确保获取新数据后调用 `setIndexHistoryData(result)` 触发重渲染
  - [x] 验证 SVG 曲线图渲染逻辑正确依赖 `indexHistoryData`，无缓存或闭包旧值
  - [x] 验证切换指数时清除旧数据（先 setIndexHistoryData(null) 再获取，避免短暂显示旧数据）

- [x] Task 5: 同步图例与"指数对比"卡片显示
  - [x] 收益率曲线图例右侧指数名称使用 `getIndexName(selectedIndex)`（已实现，无需改动，验证即可）
  - [x] "指数对比"卡片列表中每个指数显示的数据来自 `allIndexData[option.code]`，确认 allIndexData 使用 etfCode 获取后正确存储
  - [x] "指数对比"卡片本月跑赢/跑输的指数名称使用 `getIndexName(selectedIndex)`

- [x] Task 6: 构建验证与浏览器测试
  - [x] npm run build 成功无报错
  - [x] 浏览器测试：切换内置指数（上证/沪深300/纳斯达克），曲线图实时刷新
  - [x] 浏览器测试：自定义输入"159"或"创业板"，下拉显示候选，点击选择后添加显示中文名称
  - [x] 浏览器测试：切换时间区间（本月/近三月），曲线图使用当前标的重新获取数据
  - [x] 浏览器测试：自定义指数 X 删除按钮，删除后从列表移除
  - [x] 验证 allIndexData 中的内置指数数据来自关联 ETF 代码（如上证显示 530060 的实时价格 0.976）

# Task Dependencies
- Task 2 依赖 Task 1（需要 etfCode 字段）
- Task 3 独立可并行
- Task 4 依赖 Task 2（依赖正确的 etfCode 使用方式）
- Task 5 依赖 Task 2、Task 4
- Task 6 依赖 Task 1-5 全部完成
