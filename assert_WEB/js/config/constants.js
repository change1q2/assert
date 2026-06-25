/**
 * 应用配置与常量
 */

// 模块定义
export const modules = [
  ["overview", "资产总览", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'],
  ["records", "收支分析", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>'],
  ["finance", "理财模块", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>'],
  ["debts", "债务模块", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>'],
  ["classes", "资产分类", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>'],
  ["analysis", "统计分析", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>'],
  ["tools", "辅助工具", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'],
  ["strategies", "业务设计", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'],
  ["accounts", "账户管理", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'],
  ["downloads", "产品下载页", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'],
];

// 辅助工具配置
export const auxiliaryTools = [
  {
    id: "premium",
    mode: "internal",
    title: "溢价查询",
    description: "实时筛选 ETF、LOF、QDII 溢价标的",
    iconLabel: "％",
    action: "open-premium-tool",
  },
  {
    id: "hk-ipo",
    mode: "internal",
    title: "港股打新分析",
    description: "主表、推荐排序、大V意向、评分规则与导出分析。",
    iconLabel: "HK",
    action: "open-hk-ipo-tool",
  },
  {
    id: "serenity",
    mode: "external",
    title: "白毛股神追踪",
    description: "进入 Serenity 页面，跟踪白毛股神主题内容与人物观察。",
    category: "AIChainMap / 人物追踪",
    url: "https://aichainmap.com/serenity/",
    iconPath: "assets/tool-icons/serenity-avatar.png",
  },
  {
    id: "atlas",
    mode: "external",
    title: "产业链图谱",
    description: "打开 AI 产业链图谱，查看上下游结构与核心节点关系。",
    category: "AIChainMap / 产业链",
    url: "https://aichainmap.com/atlas",
    iconPath: "assets/tool-icons/aichainmap-network.png",
  },
  {
    id: "reports",
    mode: "external",
    title: "AI深度报告解析",
    description: "查看 AI 深度报告解析与可视化研究内容。",
    category: "AIChainMap / 研究报告",
    url: "https://aichainmap.com/reports/",
    iconPath: "assets/tool-icons/aichainmap-network.png",
  },
  {
    id: "buffett",
    mode: "external",
    title: "巴菲特知识库",
    description: "阅读巴菲特股东信，投资理念与核心案例整理。",
    category: "投资人物 / 巴菲特",
    url: "https://learnbuffett.com/",
    iconPath: "assets/tool-icons/buffett-portrait.jpg",
  },
  {
    id: "munger",
    mode: "external",
    title: "查理·芒格的思维模型",
    description: "进入芒格思维模型知识库，查看模型、学科与场景关联。",
    category: "投资人物 / 芒格",
    url: "https://mungermodels.com/",
    iconPath: "assets/tool-icons/munger-portrait.jpg",
  },
  {
    id: "ark-tracker",
    mode: "external",
    title: "木头姐ARK追踪",
    description: "查看 Cathie Wood 旗下 ARK 基金全部持仓与调仓追踪。",
    category: "投资人物 / 木头姐",
    url: "https://arktracker.com/all-ark-holdings/",
    iconLabel: "A",
  },
  {
    id: "btc-indicator",
    mode: "external",
    title: "BTC指标",
    description: "打开 CoinGlass AHR999 逃顶指标页面，查看 BTC 周期参考数据。",
    category: "加密货币 / BTC",
    url: "https://www.coinglass.com/zh/pro/i/ahr999-escape",
    iconLabel: "₿",
  },
  {
    id: "housing-trend",
    mode: "external",
    title: "房产趋势追踪",
    description: "打开房产趋势追踪页面，查看房地产市场趋势与相关数据。",
    category: "房产 / 趋势",
    url: "https://wxaurl.cn/jJh2iE8xOjt",
    iconLabel: "⌂",
    openMode: "wechat-copy",
  },
];

// 外部工具映射
export const externalToolMap = Object.fromEntries(
  auxiliaryTools
    .filter((tool) => tool.mode === "external")
    .map((tool) => [tool.id, tool]),
);

// 工具面板配置
export const toolPanels = {
  root: {
    title: "辅助工具",
    eyebrow: "行情与分析工具",
    description: "把常用的投资研究能力集中在这里，减少在多个网站之间切换。",
    items: [
      auxiliaryTools.find((tool) => tool.id === "premium"),
      auxiliaryTools.find((tool) => tool.id === "hk-ipo"),
      {
        id: "ai-tracking",
        mode: "panel",
        panelId: "ai",
        title: "AI追踪",
        description: "集中查看 AI 产业链图谱与 AI 深度报告解析。",
        category: "AI / 研究工具",
        iconLabel: "AI",
      },
      {
        id: "celebrity-tracking",
        mode: "panel",
        panelId: "celebrity",
        title: "名人追踪",
        description: "集中查看白毛股神、巴菲特、芒格与木头姐相关追踪工具。",
        category: "人物 / 投资者",
        iconLabel: "人",
      },
      auxiliaryTools.find((tool) => tool.id === "btc-indicator"),
      auxiliaryTools.find((tool) => tool.id === "housing-trend"),
    ].filter(Boolean),
  },
  ai: {
    title: "AI追踪",
    eyebrow: "AI / 研究工具",
    description: "把 AI 产业链与深度报告类工具统一放在这里，方便连续研究。",
    items: auxiliaryTools.filter((tool) => ["atlas", "reports"].includes(tool.id)),
  },
  celebrity: {
    title: "名人追踪",
    eyebrow: "人物 / 投资者",
    description: "集中查看重点投资人物与持仓风格追踪工具。",
    items: auxiliaryTools.filter((tool) => ["serenity", "buffett", "munger", "ark-tracker"].includes(tool.id)),
  },
};

// 固定资产类别名称
export const fixedAssetClassNames = {
  equity: "权益类",
  commodity: "商品类",
  debt: "债权类",
  cashClass: "现金类",
};

// API 基础路径
export const API_BASE = ["127.0.0.1", "localhost"].includes(window.location.hostname)
  ? "http://127.0.0.1:3000/api"
  : "/api";

// 当前日期
export const today = new Date().toISOString().slice(0, 10);

// 清除持久化的认证信息
export function clearPersistedAuth() {
  localStorage.removeItem("asset-platform-token");
  localStorage.removeItem("asset-platform-account");
  localStorage.removeItem("asset-platform-auth-v1");
}
