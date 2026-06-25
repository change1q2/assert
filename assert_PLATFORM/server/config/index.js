import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(path.dirname(__filename));

const publicRoot = path.resolve(__dirname, "..", "..", "assert_WEB");
const releasesRoot = process.env.RELEASES_ROOT
  ? path.resolve(process.env.RELEASES_ROOT)
  : path.resolve(__dirname, "..", "releases");

const releasePlatforms = [
  ["web", "Web"],
  ["pc", "PC（Windows）"],
  ["android", "Android"],
  ["ios", "iOS"],
  ["harmony", "HarmonyOS"],
];

const PORT = Number(process.env.API_PORT || 3000);
const TOKEN_TTL_DAYS = 30;
const SMS_CODE_TTL_MINUTES = 5;
const SMS_RESEND_SECONDS = 60;

const allowedOrigins = new Set([
  "http://127.0.0.1:4173",
  "http://localhost:4173",
  "http://119.28.189.98",
  ...(process.env.EXTRA_ORIGINS ? process.env.EXTRA_ORIGINS.split(",") : []),
]);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".exe": "application/vnd.microsoft.portable-executable",
  ".zip": "application/zip",
  ".apk": "application/vnd.android.package-archive",
  ".aab": "application/octet-stream",
  ".ipa": "application/octet-stream",
  ".hap": "application/octet-stream",
};

const PREMIUM_API_URL = "http://8.220.240.126:8787/api/latest-lite";

const HK_IPO_DATA_SOURCES = [
  {
    name: "港交所披露易 HKEXnews",
    tier: "官方权威",
    access: "公开网页",
    url: "https://www.hkexnews.hk",
    fields: "招股书、申请版本、聆讯后资料集、招股章程、公告",
    usage: "原文核验，以公告和招股书为最终依据",
    autoCheck: "部分字段可公开搜索校验",
  },
  {
    name: "港交所新上市资料页",
    tier: "官方权威",
    access: "公开网页",
    url: "https://www2.hkexnews.hk/New-Listings/New-Listing-Information/Main-Board",
    fields: "递表、聆讯、招股、上市资料",
    usage: "状态、上市流程和原始文件校验",
    autoCheck: "部分字段可公开搜索校验",
  },
  {
    name: "港交所新上市证券一览",
    tier: "官方权威",
    access: "公开网页",
    url: "https://www.hkex.com.hk/Services/Trading/Securities/Trading-News/Newly-Listed-Securities",
    fields: "代码、买卖单位、上市日期",
    usage: "代码、上市日期、买卖单位校验",
    autoCheck: "部分字段可公开搜索校验",
  },
  {
    name: "SFC 公众纪录册",
    tier: "官方权威",
    access: "公开网页",
    url: "https://www.sfc.hk/TC/Regulatory-functions/Intermediaries/Licensing/Register-of-licensed-persons-and-registered-institutions",
    fields: "保荐人、中介机构持牌状态",
    usage: "保荐人和中介机构资质校验",
    autoCheck: "需按机构名称人工/半自动核验",
  },
  {
    name: "富途牛牛新股中心",
    tier: "券商/App",
    access: "App/登录",
    url: "App 内：市场 -> 港股 -> 新股中心",
    fields: "招股列表、孖展、暗盘、中签查询、预测一手中签率",
    usage: "打新操作和券商侧预测数据参考",
    autoCheck: "需登录或 App 环境，暂不自动抓取",
  },
  {
    name: "老虎证券新股申购",
    tier: "券商/App",
    access: "App/登录",
    url: "App 内：发现 -> 新股申购",
    fields: "申购、杠杆、暗盘、截止时间",
    usage: "券商申购条件和截止时间参考",
    autoCheck: "需登录或 App 环境，暂不自动抓取",
  },
  {
    name: "盈透证券 IPO 日历",
    tier: "券商/App",
    access: "网页/登录",
    url: "https://www.interactivebrokers.com",
    fields: "IPO 日历、保证金购买力",
    usage: "国际券商侧日历和账户能力参考",
    autoCheck: "需登录，暂不自动抓取",
  },
  {
    name: "经济通 ETNet IPO",
    tier: "第三方聚合",
    access: "公开网页",
    url: "http://stocks.etnet.hk/www/sc/stocks/ci_ipo.php",
    fields: "发行价、入场费、超购倍数、基石投资者、行业对比",
    usage: "快速对比和字段交叉校验",
    autoCheck: "刷新时纳入公开搜索校验",
  },
  {
    name: "阿斯达克 AASTOCKS",
    tier: "第三方聚合",
    access: "公开网页",
    url: "https://aastocks.com/",
    fields: "保荐人历史战绩、首日涨幅、破发率、护盘能力",
    usage: "保荐人和上市表现辅助评分",
    autoCheck: "刷新时纳入公开搜索校验",
  },
  {
    name: "智通财经新股专题",
    tier: "第三方聚合",
    access: "公开网页",
    url: "https://www.zhitongcaijing.com/shares.html",
    fields: "递表、聆讯、招股、暗盘、上市新闻",
    usage: "状态和新闻时效校验",
    autoCheck: "刷新时纳入公开搜索校验",
  },
  {
    name: "捷利交易宝",
    tier: "第三方聚合",
    access: "公开网页/App",
    url: "https://www.tradegomart.com/tradeGodownload",
    fields: "孖展倍数、暗盘行情、配售结果、基石、绿鞋、保荐人",
    usage: "基石占比、绿鞋、配售和暗盘数据重点校验",
    autoCheck: "刷新时纳入公开搜索校验",
  },
  {
    name: "AiPO 数据网",
    tier: "第三方聚合",
    access: "公开网页",
    url: "https://aipo.myiqdii.com/",
    fields: "孖展资金分布、券商息率、杠杆策略",
    usage: "孖展和资金效率策略校验",
    autoCheck: "刷新时纳入公开搜索校验",
  },
  {
    name: "广发香港新股日历",
    tier: "人工资料",
    access: "公众号",
    url: "公众号：广发香港财富管理",
    fields: "招股中、通过聆讯、近期上市表现",
    usage: "月度人工复核",
    autoCheck: "公众号内容不自动抓取",
  },
];

const HK_IPO_SOURCE_FILE = process.env.HK_IPO_SOURCE_FILE
  ? path.resolve(process.env.HK_IPO_SOURCE_FILE)
  : "C:/Users/YZ-X-096/Documents/港股分析/tools/build_hk_ipo_current_20260623.mjs";
const HK_IPO_CONNECT_MARKET_CAP = 103.19;
const HK_IPO_DEFAULT_YEAR = 2026;
const HK_IPO_DEFAULT_THRESHOLD = 6;

export {
  __dirname,
  publicRoot,
  releasesRoot,
  releasePlatforms,
  PORT,
  TOKEN_TTL_DAYS,
  SMS_CODE_TTL_MINUTES,
  SMS_RESEND_SECONDS,
  allowedOrigins,
  mimeTypes,
  PREMIUM_API_URL,
  HK_IPO_DATA_SOURCES,
  HK_IPO_SOURCE_FILE,
  HK_IPO_CONNECT_MARKET_CAP,
  HK_IPO_DEFAULT_YEAR,
  HK_IPO_DEFAULT_THRESHOLD,
};
