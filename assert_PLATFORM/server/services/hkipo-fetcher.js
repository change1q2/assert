import { hkIpoFetchText } from "./hkipo-utils.js";

const HKEX_LISTING_URL = "https://www2.hkexnews.hk/New-Listings/New-Listing-Information/Main-Board";
const ETNET_IPO_URL = "http://stocks.etnet.hk/www/sc/stocks/ci_ipo.php";
const AASTOCKS_IPO_URL = "https://www.aastocks.com/tc/ipo/main.aspx";

const IPO_HEADERS = [
  "代码编号", "发行价格", "1手股数", "1手入场金额", "总市值（亿）",
  "H股市值（亿）", "入通市值（亿）", "入通涨幅", "一手预计收益",
  "公开股数(万股)", "公开总手数", "实际认购倍数", "中签率", "基石占比",
  "保荐人", "绿鞋", "发行调配权", "机制", "是否AH/UH", "折价率",
  "申购时间", "资金锁定期（中签结果）", "暗盘时间", "上市日期",
  "暗盘涨幅", "首日涨幅", "累计涨跌幅", "最新价/发行价", "基本面",
  "行业", "得分（6分以上可以打）", "申购态度", "是否打", "策略",
  "甲尾乙头资金", "总结",
];

let hkIpoMarketCache = {
  expiresAt: 0,
  payload: null,
};

let hkIpoRefreshPromise = null;

function parseHkexListingPage(html) {
  const rows = [];
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return rows;

  const tbodyMatch = tableMatch[1].match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  const rowsHtml = tbodyMatch ? tbodyMatch[1] : tableMatch[1];
  
  const rowMatches = rowsHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
  
  for (let i = 1; i < rowMatches.length; i++) {
    const rowHtml = rowMatches[i];
    const cellMatches = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
    const cells = cellMatches.map(cell => {
      return cell.replace(/<[^>]*>/g, '').trim().replace(/[\r\n\t]/g, '');
    });
    
    if (cells.length >= 5) {
      const row = new Array(IPO_HEADERS.length).fill("");
      
      const codeMatch = cells[0]?.match(/(\d{5})/);
      row[0] = codeMatch ? codeMatch[1] : "";
      
      row[2] = cells[1] || "";
      row[1] = cells[2] || "";
      row[19] = cells[3] || "";
      row[14] = cells[4] || "";
      
      const dateMatch = cells[5]?.match(/(\d{4}-\d{2}-\d{2})/);
      row[23] = dateMatch ? dateMatch[1] : cells[5] || "";
      
      rows.push(row);
    }
  }
  
  return rows;
}

function parseEtnetIpoPage(html) {
  const rows = [];
  const scriptMatch = html.match(/var\s+ipoData\s*=\s*\[([\s\S]*?)\];/i);
  
  if (scriptMatch) {
    try {
      const jsonStr = `[${scriptMatch[1]}]`;
      const data = JSON.parse(jsonStr);
      
      for (const item of data) {
        const row = new Array(IPO_HEADERS.length).fill("");
        
        if (item.stock_code) row[0] = String(item.stock_code).padStart(5, '0');
        if (item.company_name) row[24] = item.company_name;
        if (item.offer_price) row[1] = item.offer_price;
        if (item.lot_size) row[2] = item.lot_size;
        if (item.entry_fee) row[3] = item.entry_fee;
        if (item.market_cap) row[4] = item.market_cap;
        if (item.sponsor) row[14] = item.sponsor;
        if (item.cornerstone) row[13] = item.cornerstone;
        if (item.greenshoe) row[15] = item.greenshoe;
        if (item.subscription_period) row[20] = item.subscription_period;
        if (item.listing_date) row[23] = item.listing_date;
        if (item.industry) row[29] = item.industry;
        if (item.over_subscription) row[11] = item.over_subscription;
        
        rows.push(row);
      }
    } catch (e) {
      console.warn("ETNET JSON parse error:", e.message);
    }
  }
  
  const tableMatch = html.match(/<div[^>]*class="ipo-table[^>]*">[\s\S]*?<\/div>/i);
  if (tableMatch) {
    const rowMatches = tableMatch[0].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    
    for (let i = 1; i < rowMatches.length; i++) {
      const rowHtml = rowMatches[i];
      const cellMatches = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
      
      if (cellMatches.length >= 8) {
        const row = new Array(IPO_HEADERS.length).fill("");
        
        const codeCell = cellMatches[0]?.replace(/<[^>]*>/g, '').trim();
        const codeMatch = codeCell?.match(/(\d{5})/);
        row[0] = codeMatch ? codeMatch[1] : "";
        
        row[24] = cellMatches[1]?.replace(/<[^>]*>/g, '').trim() || "";
        row[1] = cellMatches[2]?.replace(/<[^>]*>/g, '').trim() || "";
        row[2] = cellMatches[3]?.replace(/<[^>]*>/g, '').trim() || "";
        row[3] = cellMatches[4]?.replace(/<[^>]*>/g, '').trim() || "";
        row[14] = cellMatches[5]?.replace(/<[^>]*>/g, '').trim() || "";
        row[29] = cellMatches[6]?.replace(/<[^>]*>/g, '').trim() || "";
        
        const subTime = cellMatches[7]?.replace(/<[^>]*>/g, '').trim() || "";
        row[20] = subTime;
        
        rows.push(row);
      }
    }
  }
  
  return rows;
}

function parseAastocksIpoPage(html) {
  const rows = [];
  const cardMatches = html.match(/<div[^>]*class="ipo-card[^>]*">[\s\S]*?<\/div>/gi) || [];
  
  for (const card of cardMatches) {
    const row = new Array(IPO_HEADERS.length).fill("");
    
    const codeMatch = card.match(/<span[^>]*class="code[^>]*">(\d{5})<\/span>/i);
    if (codeMatch) row[0] = codeMatch[1];
    
    const nameMatch = card.match(/<h3[^>]*>([^<]+)<\/h3>/i);
    if (nameMatch) row[24] = nameMatch[1].trim();
    
    const priceMatch = card.match(/发行价[^<]*([\d.]+)/i);
    if (priceMatch) row[1] = priceMatch[1];
    
    const lotMatch = card.match(/每手[^<]*(\d+)/i);
    if (lotMatch) row[2] = lotMatch[1];
    
    const feeMatch = card.match(/入场费[^<]*([\d,]+)/i);
    if (feeMatch) row[3] = feeMatch[1].replace(',', '');
    
    const sponsorMatch = card.match(/保荐人[^<]*([^<]+)/i);
    if (sponsorMatch) row[14] = sponsorMatch[1].trim();
    
    const industryMatch = card.match(/行业[^<]*([^<]+)/i);
    if (industryMatch) row[29] = industryMatch[1].trim();
    
    const dateMatch = card.match(/上市日期[^<]*(\d{4}-\d{2}-\d{2})/i);
    if (dateMatch) row[23] = dateMatch[1];
    
    rows.push(row);
  }
  
  return rows;
}

function mergeIpoRows(sources) {
  const merged = new Map();
  
  for (const sourceRows of sources) {
    for (const row of sourceRows) {
      const code = String(row[0] || "").trim();
      if (!code) continue;
      
      if (!merged.has(code)) {
        merged.set(code, new Array(IPO_HEADERS.length).fill(""));
      }
      
      const existing = merged.get(code);
      for (let i = 0; i < row.length; i++) {
        if (row[i] && row[i] !== "" && row[i] !== "-" && row[i] !== "TBD") {
          existing[i] = row[i];
        }
      }
    }
  }
  
  return Array.from(merged.values());
}

function generateRecommendationRows(rows) {
  return rows.map((row, index) => {
    const code = row[0];
    const companyName = row[24] || "";
    const score = row[30] || "0";
    
    return {
      rank: index + 1,
      code,
      companyName,
      status: "招股中",
      score: Number(score) || 0,
      shouldApply: (Number(score) || 0) >= 6 ? "是" : "否",
      oneLotExpectedProfit: row[8] || 0,
      publicTotalHands: row[10] || 0,
      strategy: row[33] || "",
      reason: row[35] || "",
    };
  });
}

function generateScoreRows(rows) {
  return rows.map((row, index) => {
    return {
      id: `score-${index}`,
      code: row[0],
      companyName: row[24] || "",
      score: Number(row[30]) || 0,
      shouldApply: (Number(row[30]) || 0) >= 6 ? "是" : "否",
      attitude: row[31] || "",
      components: [
        { item: "旧股", originalScore: 0, score: 0 },
        { item: "保荐人", originalScore: 0, score: 0 },
        { item: "明星基石", originalScore: 0, score: 0 },
        { item: "IPO前投资者", originalScore: 0, score: 0 },
        { item: "行业", originalScore: 0, score: 0 },
        { item: "估值", originalScore: 0, score: 0 },
        { item: "机制", originalScore: 0, score: 0 },
        { item: "认购倍数", originalScore: row[11] ? Number(row[11]) : 0, score: 0 },
        { item: "基石份额", originalScore: 0, score: 0 },
        { item: "大V意向", originalScore: 0, score: 0 },
      ],
    };
  });
}

async function fetchHkIpoFromSources() {
  const sources = [];
  
  const hkexHtml = await hkIpoFetchText(HKEX_LISTING_URL, 10000);
  if (hkexHtml) {
    const rows = parseHkexListingPage(hkexHtml);
    if (rows.length > 0) sources.push(rows);
  }
  
  const etnetHtml = await hkIpoFetchText(ETNET_IPO_URL, 10000);
  if (etnetHtml) {
    const rows = parseEtnetIpoPage(etnetHtml);
    if (rows.length > 0) sources.push(rows);
  }
  
  const aastocksHtml = await hkIpoFetchText(AASTOCKS_IPO_URL, 10000);
  if (aastocksHtml) {
    const rows = parseAastocksIpoPage(aastocksHtml);
    if (rows.length > 0) sources.push(rows);
  }
  
  if (sources.length === 0) {
    return null;
  }
  
  const mergedRows = mergeIpoRows(sources);
  
  return {
    headers: IPO_HEADERS,
    rows: mergedRows,
    recommendations: generateRecommendationRows(mergedRows),
    scoreHeaders: ["代码", "发行价", "旧股", "保荐人", "明星基石", "IPO前投资者", "行业", "估值", "机制", "认购倍数", "基石份额", "大V意向"],
    scoreRows: generateScoreRows(mergedRows),
    ruleRows: [],
    bigVRows: [],
    validationRows: [],
    fetchedAt: new Date().toISOString(),
    source: "实时抓取",
  };
}

async function fetchHkIpoMarket(force = false) {
  const now = Date.now();
  if (!force && hkIpoMarketCache.payload && hkIpoMarketCache.expiresAt > now) {
    return { ...hkIpoMarketCache.payload, cached: true };
  }
  
  try {
    const freshData = await fetchHkIpoFromSources();
    
    if (freshData && freshData.rows.length > 0) {
      hkIpoMarketCache = {
        expiresAt: now + 3600_000,
        payload: freshData,
      };
      return { ...freshData, cached: false };
    }
    
    if (hkIpoMarketCache.payload) {
      return { ...hkIpoMarketCache.payload, cached: true, stale: true };
    }
    
    return null;
  } catch (error) {
    console.warn("HK IPO market fetch failed:", error.message);
    if (hkIpoMarketCache.payload) {
      return { ...hkIpoMarketCache.payload, cached: true, stale: true };
    }
    return null;
  }
}

function refreshHkIpoMarketInBackground() {
  if (hkIpoRefreshPromise) return hkIpoRefreshPromise;
  
  hkIpoRefreshPromise = fetchHkIpoMarket(true)
    .catch((error) => {
      console.warn("HK IPO market refresh failed:", error.message);
      return hkIpoMarketCache.payload;
    })
    .finally(() => {
      hkIpoRefreshPromise = null;
    });
  
  return hkIpoRefreshPromise;
}

function getHkIpoCache() {
  return hkIpoMarketCache;
}

export {
  fetchHkIpoMarket,
  refreshHkIpoMarketInBackground,
  getHkIpoCache,
  IPO_HEADERS,
};
