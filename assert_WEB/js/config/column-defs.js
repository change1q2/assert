/**
 * 表格列配置
 */

// 股票列表列配置
export const STOCK_COLUMN_DEFS = [
  { key: "name", label: "名称/市值", sortable: true, defaultVisible: true },
  { key: "code", label: "代码", sortable: true, defaultVisible: true },
  { key: "shares", label: "持仓/可用", sortable: true, defaultVisible: true },
  { key: "price", label: "现价/成本", sortable: true, defaultVisible: true },
  { key: "pnl", label: "持仓盈亏", sortable: true, defaultVisible: true },
  { key: "todayPnl", label: "当日盈亏", sortable: true, defaultVisible: true },
  { key: "positionWeight", label: "仓位", sortable: true, defaultVisible: true },
  { key: "category", label: "资产分类", sortable: true, defaultVisible: false },
  { key: "subcategory", label: "二级分类", sortable: true, defaultVisible: false },
  { key: "tertiaryCategory", label: "三级分类", sortable: true, defaultVisible: false },
  { key: "market", label: "市场", sortable: true, defaultVisible: false },
  { key: "currency", label: "货币", sortable: true, defaultVisible: false },
  { key: "account", label: "所属账户", sortable: true, defaultVisible: false },
  { key: "costPrice", label: "买入均价", sortable: true, defaultVisible: false },
  { key: "marketValue", label: "当前价值", sortable: true, defaultVisible: false },
  { key: "rmbValue", label: "折合RMB", sortable: true, defaultVisible: false },
  { key: "actions", label: "操作", sortable: false, defaultVisible: true },
];

// 港股打新表格列配置
export const hkIpoAllCols = [
  ["code", "代码"], ["companyName", "公司名称"], ["status", "状态"],
  ["boardLot", "1手股数"], ["entryAmount", "1手入场金额"], ["totalMarketCap", "总市值"],
  ["hMarketCap", "H股市值"], ["connectRise", "入通涨幅"], ["oneLotExpectedProfit", "一手预计收益"],
  ["publicTotalHands", "公开总手数"], ["actualMultiple", "实际认购倍数"], ["sponsor", "保荐人"], ["cornerstoneShare", "基石占比"],
  ["greenshoe", "绿鞋"], ["allocationOption", "发行调配权"],
  ["subscriptionTime", "申购时间"], ["resultDate", "资金锁定期"], ["greyDate", "暗盘时间"],
  ["listingDate", "上市日期"], ["fundamentals", "基本面"], ["industry", "行业"],
  ["score", "得分"], ["attitude", "申购态度"], ["shouldApply", "是否打"], ["strategy", "策略"],
  ["tailFunds", "建议甲组乙组"], ["summary", "总结"], ["firstDayChange", "首日涨幅"],
  ["cumulativeChange", "累计涨跌幅"], ["latestVsOffer", "最新价"], ["offerPrice", "发行价"],
];

// 港股打新锁定列（不可编辑）
export const hkIpoLockedCols = new Set(["code", "companyName"]);

// 港股打新高级筛选字段
export const hkIpoFilterFields = [
  { key: "hMarketCap", label: "H股市值", type: "range" },
  { key: "connectRise", label: "入通涨幅", type: "text" },
  { key: "oneLotExpectedProfit", label: "一手预计收益", type: "range" },
  { key: "publicTotalHands", label: "公开总手数", type: "range" },
  { key: "actualMultiple", label: "实际认购倍数", type: "range" },
  { key: "sponsor", label: "保荐人", type: "text" },
  { key: "cornerstoneShare", label: "基石占比", type: "text" },
  { key: "greenshoe", label: "绿鞋", type: "text" },
];
