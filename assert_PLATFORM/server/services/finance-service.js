// 安全解码：按优先级尝试 GB18030 → GBK → UTF-8 → latin1
// GB18030 覆盖所有汉字（包括生僻字），GBK 为兼容旧编码
async function safeDecode(buffer) {
  const iconv = (await import("iconv-lite")).default;
  // 先尝试 GB18030（覆盖最全）
  try {
    const text = iconv.decode(buffer, "GB18030");
    if (text && !text.includes("\uFFFD") && !/^[?？]/.test(text.trim())) {
      return text;
    }
  } catch (_) {}
  // 回退 GBK
  try {
    const text = iconv.decode(buffer, "GBK");
    if (text && !text.includes("\uFFFD")) {
      return text;
    }
  } catch (_) {}
  // 回退 UTF-8
  try {
    return buffer.toString("utf-8");
  } catch (_) {}
  // 最后回退 latin1
  return buffer.toString("latin1");
}

// 清洗名称：移除东方财富等数据源附加的特殊符号
// 保留：中英文、数字、Unicode 字母组合、常见标点、空格、括号等
function cleanName(name) {
  if (!name) return '';
  return String(name)
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u2000-\u200F\u2028-\u202F\u2055-\u205F\u2060-\u206F\u3000-\u303F]/g, '')
    .replace(/[●◆◇○◎△□■▲▼◉◐◑◒◓◔◕◖◗★☆☇☈☉☊☋☌☍☎☏♠♣♥♡¤¦¨©®°±²³´µ¶·¸¹º»¼½¾¿À-ÿØ-ÿ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 同花顺代码转换：仅支持 A 股 sh/sz
function thsCodeFor(code) {
  code = String(code || "").trim().replace(/^(sh|sz)/i, "");
  if (!/^\d{6}$/.test(code)) return null;
  if (/^[013]/.test(code)) return "sz" + code;
  if (/^[569]/.test(code)) return "sh" + code;
  return null;
}

function tencentCodeFor(code, market) {
  code = String(code || "").trim();
  if (!code) return null;
  market = String(market || "").toLowerCase();
  // 先检测代码前缀模式，优先级高于市场类型判断
  if (/^hk/i.test(code) || /^\d{5}$/.test(code)) {
    return "hk" + code.replace(/^hk/i, "").padStart(5, "0");
  }
  if (/^us/i.test(code)) {
    return "us" + code.replace(/^us/i, "").toUpperCase();
  }
  if (market === "hk" || market === "港股市场" || market === "港股") {
    return "hk" + code.replace(/^hk/i, "").padStart(5, "0");
  }
  if (market === "us" || market === "美股市场" || market === "美股") {
    return "us" + code.replace(/^us/i, "").toUpperCase();
  }
  // 纯字母代码（如 QQQ、TSLA、GLD、NVDA）按美股处理
  // 国内/港股代码均为数字或 hk/sh/sz 前缀，纯字母只可能是美股代码
  // 覆盖市场字段被误填为"国内市场"的美股标的（如 QQQ/TSLA/GLD）
  if (/^[A-Za-z]{1,8}$/.test(code)) {
    return "us" + code.toUpperCase();
  }
  if (market === "domestic" || market === "国内市场" || market === "国内" || /^sh/i.test(code) || /^sz/i.test(code)) {
    const raw = code.replace(/^(sh|sz)/i, "");
    return /^[569]/.test(raw) ? "sh" + raw : "sz" + raw;
  }
  if (/^[569]/.test(code)) return "sh" + code;
  if (/^11/.test(code)) return "sh" + code;
  if (/^12/.test(code)) return "sz" + code;
  if (/^[013]/.test(code)) return "sz" + code;
  return null;
}

// 模块级缓存：记录每个 code 最后一次成功获取的非0行情数据
// 当所有数据源都取不到有效价格时，回退使用上一次保留的不为0的数据
const lastValidQuotesCache = new Map();

async function lookupSecurities(q, market) {
  const normalizedQuery = q.trim().toUpperCase();
  const normalizedMarket = String(market || '').toLowerCase();
  const isHKMarket = normalizedMarket === 'hk' || normalizedMarket === '港股市场' || normalizedMarket === '港股';
  const isUSMarket = normalizedMarket === 'us' || normalizedMarket === '美股市场' || normalizedMarket === '美股';
  const localInstruments = [
    { code: "XAU", name: "现货黄金", classify: "Commodity", typeName: "贵金属", marketType: "overseas", mktNum: "" },
    { code: "XAG", name: "现货白银", classify: "Commodity", typeName: "贵金属", marketType: "overseas", mktNum: "" },
    { code: "WTI", name: "WTI原油", classify: "Commodity", typeName: "原油", marketType: "overseas", mktNum: "" },
    { code: "BRENT", name: "布伦特原油", classify: "Commodity", typeName: "原油", marketType: "overseas", mktNum: "" },
    { code: "AU", name: "沪金", classify: "Futures", typeName: "国内期货", marketType: "domestic", mktNum: "" },
    { code: "AG", name: "沪银", classify: "Futures", typeName: "国内期货", marketType: "domestic", mktNum: "" },
    { code: "BTC", name: "比特币", classify: "Crypto", typeName: "加密货币", marketType: "overseas", mktNum: "" },
    { code: "ETH", name: "以太坊", classify: "Crypto", typeName: "加密货币", marketType: "overseas", mktNum: "" },
    { code: "USDT", name: "泰达币", classify: "Crypto", typeName: "稳定币", marketType: "overseas", mktNum: "" },
    { code: "USDC", name: "USD Coin", classify: "Crypto", typeName: "稳定币", marketType: "overseas", mktNum: "" },
  ];
  const localItems = localInstruments.filter((item) =>
    item.code.includes(normalizedQuery)
    || item.name.toUpperCase().includes(normalizedQuery));
  try {
    const searchUrl = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(q)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=10`;
    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(8000),
    });
    const searchText = await searchRes.text();
    // 东方财富接口返回可能是 JSONP 格式 (如 jQuery3510({...}))
    let searchData;
    try {
      searchData = JSON.parse(searchText);
    } catch {
      // 尝试解析 JSONP 格式
      const jsonpMatch = searchText.match(/^[^(]+\((.*)\)[^)]*$/s);
      if (jsonpMatch) {
        searchData = JSON.parse(jsonpMatch[1]);
      } else {
        throw new Error('Failed to parse search response');
      }
    }
    const rows = searchData?.QuotationCodeTable?.Data || [];
    // 根据市场类型过滤搜索结果
    let filteredClassifies = ["AStock", "OTCFUND", "ETF", "Index", "HK", "UsStock", "UsADR"];
    if (isHKMarket) {
      // 港股市场：只保留港股和美股，过滤掉A股
      filteredClassifies = ["HK", "UsStock", "UsADR", "OTCFUND", "ETF"];
    } else if (isUSMarket) {
      // 美股市场：只保留美股
      filteredClassifies = ["UsStock", "UsADR"];
    }
    const items = rows
      .filter((r) => filteredClassifies.includes(r.Classify))
      .slice(0, 8)
      .map((r) => ({
        code: r.Code,
        name: cleanName(r.Name),
        classify: r.Classify,
        typeName: r.SecurityTypeName,
        marketType: r.MarketType,
        mktNum: r.MktNum,
        jys: r.JYS || "",
      }));
    for (const item of localItems) {
      if (!items.some((entry) => entry.code === item.code && entry.classify === item.classify)) items.push(item);
    }

    // 补充：若东方财富搜索无结果/不足且输入是纯6位数字，直接查腾讯接口获取名称
    const trimmedQ = q.trim();
    if (items.length < 3 && /^\d{6}$/.test(trimmedQ) && !isHKMarket && !isUSMarket) {
      try {
        const tencentSearchCodes = [`sh${trimmedQ}`, `sz${trimmedQ}`];
        const tsUrl = `http://qt.gtimg.cn/q=${tencentSearchCodes.join(",")}`;
        const tsRes = await fetch(tsUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          signal: AbortSignal.timeout(6000),
        });
        const tsBuf = Buffer.from(await tsRes.arrayBuffer());
        const tsText = await safeDecode(tsBuf);
        const tsSegments = tsText.split(/[;\n]/).map((s) => s.trim()).filter(Boolean);
        for (const segment of tsSegments) {
          const match = segment.match(/v_(\w+)="(.*)"/);
          if (!match || !match[2]) continue;
          const fullCode = match[1];
          const parts = match[2].split("~");
          if (parts.length > 32 && parts[1]) {
            const code = fullCode.replace(/^(sh|sz)/, "");
            const prefix = fullCode.startsWith("sh") ? "sh" : "sz";
            if (!items.some((entry) => entry.code === code)) {
              items.push({
                code,
                name: cleanName(parts[1]),
                classify: "ETF",
                typeName: "ETF",
                marketType: prefix === "sh" ? "1" : "2",
                mktNum: "",
                jys: prefix === "sh" ? "SH" : "SZ",
                price: parseFloat(parts[3]) || null,
                changePct: parseFloat(parts[32]) || null,
                changeAmt: parseFloat(parts[31]) || null,
              });
            }
          }
        }
      } catch (_) { }
    }

    const tencentQueries = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      let tc = null;
      if (it.marketType === "1") {
        tc = "sh" + it.code;
      } else if (it.marketType === "2") {
        tc = "sz" + it.code;
      } else if (it.classify === "HK" || it.mktNum === "116") {
        const hkCode = it.code.padStart(5, "0");
        tc = "hk" + hkCode;
      } else if (it.classify === "UsStock" || it.classify === "UsADR" || ["105", "106", "107"].includes(it.mktNum)) {
        tc = "us" + it.code.toUpperCase();
      }
      if (tc) {
        tencentQueries.push({ tencentCode: tc, index: i });
      }
    }

    if (tencentQueries.length) {
      try {
        const queryStr = tencentQueries.map((q) => q.tencentCode).join(",");
        const priceUrl = `http://qt.gtimg.cn/q=${queryStr}`;
        const priceRes = await fetch(priceUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          signal: AbortSignal.timeout(6000),
        });
        const priceBuf = Buffer.from(await priceRes.arrayBuffer());
        const priceText = await safeDecode(priceBuf);
        const priceMap = new Map();
        const segments = priceText.split(/[;\n]/).map((s) => s.trim()).filter(Boolean);
        for (const segment of segments) {
          const match = segment.match(/v_(\w+)="(.*)"/);
          if (!match || !match[2]) continue;
          const fullCode = match[1];
          const parts = match[2].split("~");
          if (parts.length > 32) {
            const price = parseFloat(parts[3]) || null;
            const changePct = parseFloat(parts[32]) || null;
            const changeAmt = parseFloat(parts[31]) || null;
            priceMap.set(fullCode, { price, changePct, changeAmt });
          }
        }
        for (const { tencentCode, index } of tencentQueries) {
          const pm = priceMap.get(tencentCode);
          if (pm) {
            items[index].price = pm.price;
            items[index].changePct = pm.changePct;
            items[index].changeAmt = pm.changeAmt;
          }
        }
      } catch (_) { }
    }

    const sinaQueries = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].price != null) continue;
      const it = items[i];
      let sinaCode = null;
      if (it.classify === "HK" || it.mktNum === "116") {
        sinaCode = "hk" + it.code.padStart(5, "0");
      } else if (it.classify === "UsStock" || it.classify === "UsADR" || ["105", "106", "107"].includes(it.mktNum)) {
        sinaCode = "gb_" + it.code.toLowerCase();
      }
      if (sinaCode) sinaQueries.push({ sinaCode, index: i });
    }
    if (sinaQueries.length) {
      try {
        const queryStr = sinaQueries.map((q) => q.sinaCode).join(",");
        const sinaUrl = `https://hq.sinajs.cn/list=${queryStr}`;
        const sinaRes = await fetch(sinaUrl, {
          headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://finance.sina.com.cn" },
          signal: AbortSignal.timeout(5000),
        });
        const sinaBuf = Buffer.from(await sinaRes.arrayBuffer());
        const sinaText = await safeDecode(sinaBuf);
        for (const line of sinaText.split("\n")) {
          const match = line.match(/var hq_str_(\w+)="(.*)"/);
          if (!match || !match[2]) continue;
          const code = match[1];
          const fields = match[2].split(",");
          let price = null, changePct = null, changeAmt = null;
          if (code.startsWith("hk") && fields.length > 8) {
            price = parseFloat(fields[6]) || null;
            changePct = parseFloat(fields[8]) || null;
            changeAmt = parseFloat(fields[7]) || null;
          } else if (code.startsWith("gb_") && fields.length > 4) {
            price = parseFloat(fields[1]) || null;
            changePct = parseFloat(fields[2]) || null;
            changeAmt = parseFloat(fields[4]) || null;
          }
          const sq = sinaQueries.find((q) => q.sinaCode === code);
          if (sq && price != null) {
            items[sq.index].price = price;
            items[sq.index].changePct = changePct;
            items[sq.index].changeAmt = changeAmt;
          }
        }
      } catch (_) { }
    }

    // 同花顺(10jqka) fallback：当东方财富搜索结果不足且为纯6位代码时，用同花顺接口补充名称和价格
    if (items.length < 3 && /^\d{6}$/.test(trimmedQ) && !isHKMarket && !isUSMarket) {
      try {
        const thsCode = thsCodeFor(trimmedQ);
        if (thsCode) {
          const thsUrl = `http://d.10jqka.com.cn/v6/time/hs_${thsCode}/today`;
          const thsRes = await fetch(thsUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Referer": "http://stockpage.10jqka.com.cn/",
            },
            signal: AbortSignal.timeout(6000),
          });
          const thsText = await thsRes.text();
          const match = thsText.match(/quotebridge_v6_time_\w+\((.*)\)/);
          if (match && match[1]) {
            const data = JSON.parse(match[1]);
            const points = data.data ? data.data.split(";") : [];
            if (points.length) {
              const last = points[points.length - 1].split(",");
              const price = last.length >= 3 ? parseFloat(last[1]) || null : null;
              if (!items.some((entry) => entry.code === trimmedQ)) {
                items.push({
                  code: trimmedQ,
                  name: data.name || trimmedQ,
                  classify: "AStock",
                  typeName: "A股",
                  marketType: thsCode.startsWith("sh") ? "1" : "2",
                  mktNum: "",
                  jys: thsCode.startsWith("sh") ? "SH" : "SZ",
                  price,
                  changePct: data.prePrice && price ? ((price - data.prePrice) / data.prePrice * 100) : null,
                });
              }
            }
          }
        }
      } catch (_) { }
    }

    // Ashare/akshare style fallback：当东方财富搜索无结果时，尝试新浪行情接口验证 A 股代码
    if (items.length === 0 && /^\d{6}$/.test(trimmedQ) && !isHKMarket && !isUSMarket) {
      try {
        const tencentSearchCodes = [`sh${trimmedQ}`, `sz${trimmedQ}`];
        const akUrl = `http://qt.gtimg.cn/q=${tencentSearchCodes.join(",")}`;
        const akRes = await fetch(akUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          signal: AbortSignal.timeout(6000),
        });
        const akBuf = Buffer.from(await akRes.arrayBuffer());
        const akText = await safeDecode(akBuf);
        const akSegments = akText.split(/[;\n]/).map((s) => s.trim()).filter(Boolean);
        for (const segment of akSegments) {
          const match = segment.match(/v_(\w+)="(.*)"/);
          if (!match || !match[2]) continue;
          const fullCode = match[1];
          const parts = match[2].split("~");
          if (parts.length > 32 && parts[1]) {
            const code = fullCode.replace(/^(sh|sz)/, "");
            const prefix = fullCode.startsWith("sh") ? "sh" : "sz";
            items.push({
              code,
              name: parts[1],
              classify: "AStock",
              typeName: "A股",
              marketType: prefix === "sh" ? "1" : "2",
              mktNum: "",
              jys: prefix === "sh" ? "SH" : "SZ",
              price: parseFloat(parts[3]) || null,
              changePct: parseFloat(parts[32]) || null,
              changeAmt: parseFloat(parts[31]) || null,
            });
          }
        }
      } catch (_) { }
    }

    // 港股市场专用搜索：当东方财富搜索无结果且为港股市场时，尝试港股专用接口
    if (isHKMarket && items.length === 0) {
      try {
        const hkCode = String(q).trim().padStart(5, '0');
        const hkUrl = `https://push2.eastmoney.com/api/qt/stock/get?secid=116.${hkCode}&fields=f43,f44,f45,f47,f57,f58,f60,f169,f170`;
        const hkRes = await fetch(hkUrl, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(6000),
        });
        const hkData = (await hkRes.json())?.data;
        if (hkData && Number.isFinite(Number(hkData.f43))) {
          const scaled = (value) => Number.isFinite(Number(value)) ? Number(value) / 100 : null;
          items.push({
            code: String(q).trim(),
            name: hkData.f58 || String(q).trim(),
            classify: "HK",
            typeName: "港股",
            marketType: "hk",
            mktNum: "116",
            jys: "HKEX",
            price: scaled(hkData.f43),
            prevClose: scaled(hkData.f60),
            changePct: scaled(hkData.f170),
            changeAmt: scaled(hkData.f169),
          });
        }
      } catch (_) { }
    }

    return { items: items.slice(0, 10) };
  } catch (err) {
    return { items: localItems, error: err.message };
  }
}

async function getQuotes(codes) {
  const results = codes.map((item) => ({
    code: item.code,
    price: null,
    changePct: null,
    changeAmt: null,
    prevClose: null,
    high: null,
    low: null,
    volume: null,
    name: null,
    source: null,
  }));
  const queryItems = [];
  for (let i = 0; i < codes.length; i++) {
    const tc = tencentCodeFor(codes[i].code, codes[i].market);
    if (tc) queryItems.push({ tencentCode: tc, index: i, code: codes[i].code });
  }
  if (queryItems.length) {
    try {
      const queryStr = queryItems.map((q) => q.tencentCode).join(",");
      const priceUrl = `http://qt.gtimg.cn/q=${queryStr}`;
      const priceRes = await fetch(priceUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(8000),
      });
      const priceBuf = Buffer.from(await priceRes.arrayBuffer());
      const priceText = await safeDecode(priceBuf);
      const priceMap = new Map();
      const segments = priceText.split(/[;\n]/).map((s) => s.trim()).filter(Boolean);
      for (const segment of segments) {
        const match = segment.match(/v_(\w+)="(.*)"/);
        if (!match || !match[2]) continue;
        const fullCode = match[1];
        const parts = match[2].split("~");
        if (parts.length > 32) {
          const numeric = (value) => {
            const number = Number.parseFloat(value);
            return Number.isFinite(number) ? number : null;
          };
          priceMap.set(fullCode, {
            name: parts[1] || null,
            price: numeric(parts[3]),
            prevClose: numeric(parts[4]),
            changePct: numeric(parts[32]),
            changeAmt: numeric(parts[31]),
            high: numeric(parts[33]),
            low: numeric(parts[34]),
            volume: numeric(parts[36]),
          });
        }
      }
      for (const { tencentCode, index } of queryItems) {
        const pm = priceMap.get(tencentCode);
        if (pm) {
          results[index] = { ...results[index], ...pm, source: 'tencent' };
        }
      }
    } catch (_) { }
  }
  const fallbackItems = queryItems.filter(({ index }) => results[index].price == null);
  await Promise.all(fallbackItems.map(async ({ tencentCode, index }) => {
    const prefix = tencentCode.slice(0, 2);
    const suffixCode = tencentCode.slice(2);
    let secid = null;
    let scaled = (value) => Number.isFinite(Number(value)) ? Number(value) / 100 : null;
    if (["sh", "sz"].includes(prefix)) {
      secid = `${prefix === "sh" ? "1" : "0"}.${suffixCode}`;
    } else if (prefix === "hk") {
      // 港股：secid 前缀 116.xxx，缩放因子 /1000
      secid = `116.${suffixCode}`;
      scaled = (value) => Number.isFinite(Number(value)) ? Number(value) / 1000 : null;
    } else if (prefix === "us") {
      // 美股：secid 前缀 105.xxx，无缩放
      secid = `105.${suffixCode}`;
      scaled = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
    }
    if (!secid) return;
    try {
      const quoteRes = await fetch(`https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f44,f45,f47,f57,f58,f60,f169,f170`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(6000),
      });
      const data = (await quoteRes.json())?.data;
      if (!data || !Number.isFinite(Number(data.f43))) return;
      results[index] = {
        ...results[index],
        name: data.f58 || null,
        price: scaled(data.f43),
        prevClose: scaled(data.f60),
        changeAmt: scaled(data.f169),
        changePct: scaled(data.f170),
        high: scaled(data.f44),
        low: scaled(data.f45),
        volume: Number.isFinite(Number(data.f47)) ? Number(data.f47) : null,
        source: 'eastmoney',
      };
    } catch (_) { }
  }));

  // 百度股市通 API（JSON 接口，比 HTML 解析更稳定）
  const baiduApiFallbackItems = queryItems.filter(({ index }) => results[index].price == null);
  await Promise.all(baiduApiFallbackItems.map(async ({ tencentCode, index }) => {
    const prefix = tencentCode.slice(0, 2);
    if (!["sh", "sz"].includes(prefix)) return;
    const stockCode = tencentCode.slice(2);
    const marketType = prefix === "sh" ? "ab" : "ab";
    try {
      const baiduApiUrl = `https://finance.pae.baidu.com/vapi/v1/getquotation?srcid=5352&pointType=string&group=quotation_minute_abline&query=${stockCode}&code=${stockCode}&market_type=${marketType}`;
      const baiduApiRes = await fetch(baiduApiUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Referer": "https://finance.baidu.com/" },
        signal: AbortSignal.timeout(6000),
      });
      const apiData = await baiduApiRes.json();
      const result = apiData?.result;
      if (!result) return;
      const price = parseFloat(result.price || result.newprice);
      if (price == null || !Number.isFinite(price)) return;
      const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
      results[index] = {
        ...results[index],
        name: result.name || results[index].name,
        price,
        prevClose: num(result.yesterdayclose) || num(result.prevclose),
        changeAmt: num(result.change),
        changePct: num(result.percent) || num(result.changepercent),
        high: num(result.high) || num(result.max),
        low: num(result.low) || num(result.min),
        volume: num(result.volume) || num(result.turnover),
        source: 'baidu_api',
      };
    } catch (_) { }
  }));

  // 百度财经 HTML 页面（备用：API 失败时回退到 HTML 解析）
  const baiduFallbackItems = queryItems.filter(({ index }) => results[index].price == null);
  await Promise.all(baiduFallbackItems.map(async ({ tencentCode, index }) => {
    const prefix = tencentCode.slice(0, 2);
    if (!["sh", "sz"].includes(prefix)) return;
    try {
      const baiduUrl = `https://finance.baidu.com/stock/${tencentCode}.html`;
      const baiduRes = await fetch(baiduUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(8000),
      });
      const baiduText = await baiduRes.text();

      const priceMatch = baiduText.match(/最新价[\s\S]*?<span[^>]*>([\d.]+)<\/span>/);
      const changePctMatch = baiduText.match(/涨跌幅[\s\S]*?<span[^>]*>([\d.-]+)%<\/span>/);
      const prevCloseMatch = baiduText.match(/昨收[\s\S]*?<span[^>]*>([\d.]+)<\/span>/);
      const highMatch = baiduText.match(/最高[\s\S]*?<span[^>]*>([\d.]+)<\/span>/);
      const lowMatch = baiduText.match(/最低[\s\S]*?<span[^>]*>([\d.]+)<\/span>/);
      const nameMatch = baiduText.match(/<title>([^<]+?)_百度财经<\/title>/);

      const price = priceMatch ? parseFloat(priceMatch[1]) : null;
      if (price != null) {
        results[index] = {
          ...results[index],
          name: nameMatch ? nameMatch[1] : null,
          price: price,
          prevClose: prevCloseMatch ? parseFloat(prevCloseMatch[1]) : null,
          changePct: changePctMatch ? parseFloat(changePctMatch[1]) : null,
          high: highMatch ? parseFloat(highMatch[1]) : null,
          low: lowMatch ? parseFloat(lowMatch[1]) : null,
          source: 'baidu_html',
        };
      }
    } catch (_) { }
  }));

  // 同花顺(10jqka) fallback - A股实时行情
  const thsFallbackItems = queryItems.filter(({ index }) => results[index].price == null);
  await Promise.all(thsFallbackItems.map(async ({ tencentCode, index }) => {
    const prefix = tencentCode.slice(0, 2);
    if (!["sh", "sz"].includes(prefix)) return;
    try {
      const thsUrl = `http://d.10jqka.com.cn/v6/time/hs_${tencentCode}/today`;
      const thsRes = await fetch(thsUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "http://stockpage.10jqka.com.cn/",
        },
        signal: AbortSignal.timeout(6000),
      });
      const thsText = await thsRes.text();
      const match = thsText.match(/quotebridge_v6_time_\w+\((.*)\)/);
      if (!match || !match[1]) return;
      const data = JSON.parse(match[1]);
      const points = data.data ? data.data.split(";") : [];
      if (!points.length) return;
      const last = points[points.length - 1].split(",");
      if (last.length < 3) return;
      const price = parseFloat(last[1]) || null;
      const prevClose = parseFloat(data.prePrice) || null;
      if (price != null) {
        results[index] = {
          ...results[index],
          price,
          prevClose,
          changePct: prevClose ? ((price - prevClose) / prevClose * 100) : null,
          name: data.name || results[index].name,
          source: 'ths',
        };
      }
    } catch (_) { }
  }));

  // Ashare/akshare style fallback - 东方财富行情接口（更完整字段）
  const akshareFallbackItems = queryItems.filter(({ index }) => results[index].price == null);
  await Promise.all(akshareFallbackItems.map(async ({ tencentCode, index }) => {
    const prefix = tencentCode.slice(0, 2);
    if (!["sh", "sz"].includes(prefix)) return;
    const secid = `${prefix === "sh" ? "1" : "0"}.${tencentCode.slice(2)}`;
    try {
      const emUrl = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f44,f45,f46,f47,f48,f57,f58,f60,f169,f170`;
      const emRes = await fetch(emUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(6000),
      });
      const data = (await emRes.json())?.data;
      if (!data || !Number.isFinite(Number(data.f43))) return;
      const scaled = (value) => Number.isFinite(Number(value)) ? Number(value) / 100 : null;
      results[index] = {
        ...results[index],
        name: data.f58 || results[index].name,
        price: scaled(data.f43),
        prevClose: scaled(data.f60),
        changeAmt: scaled(data.f169),
        changePct: scaled(data.f170),
        high: scaled(data.f44),
        low: scaled(data.f45),
        volume: Number.isFinite(Number(data.f47)) ? Number(data.f47) : null,
        source: 'eastmoney_full',
      };
    } catch (_) { }
  }));

  // 东方财富港股行情接口（港股数据源）
  const hkFallbackItems = queryItems.filter(({ index }) => results[index].price == null);
  await Promise.all(hkFallbackItems.map(async ({ tencentCode, index }) => {
    const prefix = tencentCode.slice(0, 2);
    if (prefix !== "hk") return;
    const hkCode = tencentCode.slice(2).padStart(5, "0");
    const secid = `116.${hkCode}`;
    try {
      const emUrl = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f44,f45,f46,f47,f48,f57,f58,f60,f169,f170`;
      const emRes = await fetch(emUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(6000),
      });
      const data = (await emRes.json())?.data;
      if (!data || !Number.isFinite(Number(data.f43))) return;
      const scaled = (value) => Number.isFinite(Number(value)) ? Number(value) / 100 : null;
      results[index] = {
        ...results[index],
        name: data.f58 || results[index].name,
        price: scaled(data.f43),
        prevClose: scaled(data.f60),
        changeAmt: scaled(data.f169),
        changePct: scaled(data.f170),
        high: scaled(data.f44),
        low: scaled(data.f45),
        volume: Number.isFinite(Number(data.f47)) ? Number(data.f47) : null,
        source: 'eastmoney_hk',
      };
    } catch (_) { }
  }));

  // 新浪财经港股行情（第三备用源）
  const hkSinaFallbackItems = queryItems.filter(({ index }) => results[index].price == null);
  await Promise.all(hkSinaFallbackItems.map(async ({ tencentCode, index }) => {
    const prefix = tencentCode.slice(0, 2);
    if (prefix !== "hk") return;
    const hkCode = tencentCode.slice(2).padStart(5, "0");
    try {
      const sinaUrl = `https://hq.sinajs.cn/list=hk${hkCode}`;
      const sinaRes = await fetch(sinaUrl, {
        headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://finance.sina.com.cn" },
        signal: AbortSignal.timeout(5000),
      });
      const buf = Buffer.from(await sinaRes.arrayBuffer());
      const sinaText = await safeDecode(buf);
      const match = sinaText.match(/var hq_str_hk\d+="(.*)"/);
      if (!match || !match[1]) return;
      const fields = match[1].split(",");
      if (fields.length < 9) return;
      const price = parseFloat(fields[6]) || null;
      if (price === null) return;
      results[index] = {
        ...results[index],
        name: fields[1] || fields[0] || results[index].name,
        price,
        prevClose: parseFloat(fields[3]) || null,
        changeAmt: parseFloat(fields[7]) || null,
        changePct: parseFloat(fields[8]) || null,
        high: parseFloat(fields[4]) || null,
        low: parseFloat(fields[5]) || null,
        source: 'sina_hk',
      };
    } catch (_) { }
  }));

  // 新浪财经美股行情（美股数据源）
  const usFallbackItems = queryItems.filter(({ index }) => results[index].price == null);
  await Promise.all(usFallbackItems.map(async ({ tencentCode, index }) => {
    const prefix = tencentCode.slice(0, 2);
    if (prefix !== "us") return;
    const usCode = tencentCode.slice(2).toLowerCase();
    try {
      const sinaUrl = `https://hq.sinajs.cn/list=gb_${usCode}`;
      const sinaRes = await fetch(sinaUrl, {
        headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://finance.sina.com.cn" },
        signal: AbortSignal.timeout(5000),
      });
      const buf = Buffer.from(await sinaRes.arrayBuffer());
      const sinaText = await safeDecode(buf);
      const match = sinaText.match(/var hq_str_gb_\w+="(.*)"/);
      if (!match || !match[1]) return;
      const fields = match[1].split(",");
      if (fields.length < 5) return;
      const price = parseFloat(fields[1]) || null;
      if (price === null) return;
      results[index] = {
        ...results[index],
        name: fields[0] || results[index].name,
        price,
        changePct: parseFloat(fields[2]) || null,
        changeAmt: parseFloat(fields[4]) || null,
        prevClose: parseFloat(fields[3]) || null,
        high: parseFloat(fields[6]) || null,
        low: parseFloat(fields[7]) || null,
        source: 'sina_us',
      };
    } catch (_) { }
  }));

  // 东方财富美股行情接口（美股备用源）
  const usEmFallbackItems = queryItems.filter(({ index }) => results[index].price == null);
  await Promise.all(usEmFallbackItems.map(async ({ tencentCode, index }) => {
    const prefix = tencentCode.slice(0, 2);
    if (prefix !== "us") return;
    const usSymbol = tencentCode.slice(2).toUpperCase();
    // 尝试 NASDAQ (105) 和 NYSE (106)
    for (const marketCode of ['105', '106']) {
      const secid = `${marketCode}.${usSymbol}`;
      try {
        const emUrl = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f44,f45,f46,f47,f48,f57,f58,f60,f169,f170`;
        const emRes = await fetch(emUrl, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(6000),
        });
        const data = (await emRes.json())?.data;
        if (!data || !Number.isFinite(Number(data.f43))) continue;
        const scaled = (value) => Number.isFinite(Number(value)) ? Number(value) / 100 : null;
        results[index] = {
          ...results[index],
          name: data.f58 || results[index].name,
          price: scaled(data.f43),
          prevClose: scaled(data.f60),
          changeAmt: scaled(data.f169),
          changePct: scaled(data.f170),
          high: scaled(data.f44),
          low: scaled(data.f45),
          volume: Number.isFinite(Number(data.f47)) ? Number(data.f47) : null,
          source: 'eastmoney_us',
        };
        break; // 成功获取后跳出循环
      } catch (_) { }
    }
  }));

  // 网易财经（最后备用源，覆盖 A股/港股/美股）
  // 代码规则：A股 SH→1+code，SZ→0+code；港股→1+5位code；美股→US.CODE
  const neteaseFallbackItems = queryItems.filter(({ index }) => results[index].price == null);
  await Promise.all(neteaseFallbackItems.map(async ({ tencentCode, index }) => {
    const prefix = tencentCode.slice(0, 2);
    let neteaseCode = null;
    if (prefix === "sh") {
      neteaseCode = "1" + tencentCode.slice(2);
    } else if (prefix === "sz") {
      neteaseCode = "0" + tencentCode.slice(2);
    } else if (prefix === "hk") {
      neteaseCode = "1" + tencentCode.slice(2).padStart(5, "0");
    } else if (prefix === "us") {
      neteaseCode = "US." + tencentCode.slice(2).toUpperCase();
    }
    if (!neteaseCode) return;
    try {
      const neteaseUrl = `http://api.money.126.net/data/feed/${neteaseCode}?callback=a`;
      const neteaseRes = await fetch(neteaseUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(5000),
      });
      const text = await neteaseRes.text();
      // 解析 JSONP: a({...});
      const jsonMatch = text.match(/^a\((.*)\);?\s*$/s);
      if (!jsonMatch || !jsonMatch[1]) return;
      const data = JSON.parse(jsonMatch[1]);
      const quote = data[neteaseCode];
      if (!quote || quote.price == null) return;
      const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
      results[index] = {
        ...results[index],
        name: quote.name || results[index].name,
        price: num(quote.price),
        prevClose: num(quote.yesterdayclose),
        changeAmt: num(quote.change),
        changePct: num(quote.percent),
        high: num(quote.high),
        low: num(quote.low),
        volume: num(quote.volume),
        source: 'netease',
      };
    } catch (_) { }
  }));

  // 基金净值兜底：当所有股票行情源都取不到时，用天天基金网净值接口获取基金净值
  // 覆盖 ETF/LOF/场外基金等代码（如 050025、008701、160140 等）
  // 同时覆盖 tencentCodeFor 返回 null 的纯基金代码，以及股票源返回 0 的情况
  const fundNavFallbackItems = [];
  for (let i = 0; i < results.length; i++) {
    const code = String(results[i].code || '').trim();
    if (!/^\d{6}$/.test(code)) continue;
    const price = results[i].price;
    if (price == null || price === 0) {
      fundNavFallbackItems.push({ index: i, code });
    }
  }
  if (fundNavFallbackItems.length > 0) {
    const batchCodes = fundNavFallbackItems.map(x => x.code);
    try {
      // 批量获取基金净值（天天基金 lsjz 接口，主源）
      const navUrl = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${batchCodes.join(',')}&pageIndex=1&pageSize=3`;
      const navRes = await fetch(navUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "https://fund.eastmoney.com/",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (navRes.ok) {
        const navData = await navRes.json();
        // 东方财富批量接口返回格式可能不同，这里逐码获取
      }
    } catch (_) {}

    // 逐码获取（更可靠，支持单个失败不影响其他）
    await Promise.all(fundNavFallbackItems.map(async ({ index, code }) => {
      const rawCode = String(code).trim();
      if (!/^\d{6}$/.test(rawCode)) return;
      let fundName = null;
      let navResult = null;

      // 获取基金名称：pingzhongdata 接口
      try {
        const nameUrl = `http://fund.eastmoney.com/pingzhongdata/${rawCode}.js`;
        const nameRes = await fetch(nameUrl, {
          headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://fund.eastmoney.com/" },
          signal: AbortSignal.timeout(5000),
        });
        if (nameRes.ok) {
          const nameText = await nameRes.text();
          const nameMatch = nameText.match(/fS_name\s*=\s*"([^"]+)"/);
          if (nameMatch) fundName = nameMatch[1];
        }
      } catch (_) {}

      // 先尝试 fundgz 实时估值接口（有实时估值）
      try {
        const gzUrl = `https://fundgz.1234567.com.cn/js/${rawCode}.js?rt=${Date.now()}`;
        const gzRes = await fetch(gzUrl, {
          headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://fund.eastmoney.com/" },
          signal: AbortSignal.timeout(5000),
        });
        if (gzRes.ok) {
          const gzText = await gzRes.text();
          const gzMatch = gzText.match(/jsonpgz\((.*)\);?/);
          if (gzMatch && gzMatch[1]) {
            const gzData = JSON.parse(gzMatch[1]);
            fundName = fundName || gzData.name || null;
            const gsz = Number.parseFloat(gzData.gsz);
            const gszzl = Number.parseFloat(gzData.gszzl);
            const dwjz = Number.parseFloat(gzData.dwjz);
            const jzrq = gzData.jzrq || null;
            if (Number.isFinite(gsz) && gsz > 0) {
              navResult = {
                price: gsz,
                prevClose: Number.isFinite(dwjz) ? dwjz : null,
                changePct: Number.isFinite(gszzl) ? gszzl : null,
                changeAmt: null,
                source: 'fund_gz',
                navDate: jzrq,
              };
            } else if (Number.isFinite(dwjz) && dwjz > 0) {
              navResult = {
                price: dwjz,
                prevClose: null,
                changePct: null,
                changeAmt: null,
                source: 'fund_gz',
                navDate: jzrq,
              };
            }
          }
        }
      } catch (_) {}

      // 如果 fundgz 没拿到价格，回退到 lsjz 净值接口
      if (!navResult) {
        try {
          const navUrl = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${rawCode}&pageIndex=1&pageSize=5&startDate=&endDate=`;
          const navRes = await fetch(navUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Referer": "https://fund.eastmoney.com/",
            },
            signal: AbortSignal.timeout(8000),
          });
          if (navRes.ok) {
            const navData = await navRes.json();
            const list = navData?.Data?.LSJZList || [];
            if (list.length > 0) {
              const latest = list[0];
              const prev = list.length > 1 ? list[1] : null;
              const nav = Number.parseFloat(latest.DWJZ);
              if (Number.isFinite(nav) && nav > 0) {
                const prevNav = prev ? Number.parseFloat(prev.DWJZ) : null;
                const pct = Number.parseFloat(latest.JZZZL);
                const changeAmt = Number.isFinite(nav) && Number.isFinite(prevNav) ? (nav - prevNav) : null;
                navResult = {
                  price: nav,
                  prevClose: Number.isFinite(prevNav) ? prevNav : null,
                  changePct: Number.isFinite(pct) ? pct : null,
                  changeAmt,
                  source: 'fund_nav',
                  navDate: latest.FSRQ || null,
                  prevNavDate: prev?.FSRQ || null,
                };
              }
            }
          }
        } catch (_) {}
      }

      if (navResult) {
        results[index] = {
          ...results[index],
          ...navResult,
          name: fundName || results[index].name || null,
          high: null,
          low: null,
          volume: null,
        };
      }
    }));
  }

  // 当现价取不到最新值或为0时，使用上一次保留不为0的数据
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.price != null && r.price !== 0) {
      // 有效数据，更新缓存
      lastValidQuotesCache.set(r.code, { ...r });
    } else {
      // 无效数据，尝试从缓存恢复上一次保留的不为0的数据
      const cached = lastValidQuotesCache.get(r.code);
      if (cached) {
        results[i] = {
          ...r,
          price: cached.price,
          prevClose: r.prevClose ?? cached.prevClose,
          changePct: r.changePct ?? cached.changePct,
          changeAmt: r.changeAmt ?? cached.changeAmt,
          high: r.high ?? cached.high,
          low: r.low ?? cached.low,
          volume: r.volume ?? cached.volume,
          name: r.name || cached.name,
          source: (r.source ? r.source + '+' : '') + 'cache',
        };
      }
    }
  }

  return { quotes: results };
}

// 天天基金网基金净值查询（场外基金）
async function getFundNav(codes) {
  const results = codes.map((item) => ({
    code: item.code,
    name: null,
    nav: null,
    prevNav: null,
    accumulatedNav: null,
    dailyChangePct: null,
    dailyChangeAmt: null,
    navDate: null,
  }));
  await Promise.all(codes.map(async (item, index) => {
    const code = String(item.code || '').trim();
    if (!/^\d{6}$/.test(code)) return;
    let nav = null;
    let prevNav = null;
    let accumulatedNav = null;
    let dailyChangePct = null;
    let navDate = null;

    // 主数据源：Eastmoney API（增大 pageSize 确保获取前一日净值）
    try {
      const navUrl = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=1&pageSize=5&startDate=&endDate=`;
      const navRes = await fetch(navUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "https://fund.eastmoney.com/",
        },
        signal: AbortSignal.timeout(8000),
      });
      const navData = await navRes.json();
      const list = navData?.Data?.LSJZList || [];
      console.log(`[DEBUG] Fund ${code} Eastmoney API response:`, JSON.stringify({
        listLength: list.length,
        firstItem: list[0] ? { DWJZ: list[0].DWJZ, JZZZL: list[0].JZZZL, FSRQ: list[0].FSRQ } : null,
        secondItem: list[1] ? { DWJZ: list[1].DWJZ, FSRQ: list[1].FSRQ } : null,
      }));
      if (list && list.length >= 1) {
        const latest = list[0];
        const prev = list.length > 1 ? list[1] : null;
        nav = Number.parseFloat(latest.DWJZ);
        prevNav = prev ? Number.parseFloat(prev.DWJZ) : null;
        accumulatedNav = latest.LJJZ ? Number.parseFloat(latest.LJJZ) : null;
        dailyChangePct = Number.parseFloat(latest.JZZZL);
        navDate = latest.FSRQ || null;
      }
    } catch (e) {
      console.error(`[DEBUG] Fund ${code} Eastmoney API error:`, e.message);
    }

    // 备用数据源：如果主数据源未获取到 prevNav 或 dailyChangePct，尝试 Eastmoney F10DataApi
    if (!Number.isFinite(prevNav) || !Number.isFinite(dailyChangePct)) {
      try {
        const historyUrl = `https://fund.eastmoney.com/f10/F10DataApi.aspx?type=lsjz&code=${code}&page=1&per=5`;
        const historyResp = await fetch(historyUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          signal: AbortSignal.timeout(8000),
        });
        const historyText = await historyResp.text();
        const startIdx = historyText.indexOf("var apidata=");
        if (startIdx !== -1) {
          const endIdx = historyText.lastIndexOf("};");
          if (endIdx !== -1) {
            const jsonStr = historyText.substring(startIdx + 12, endIdx + 1);
            const data = new Function(`return ${jsonStr}`)();
            const content = data.content || "";
            const rows = [];
            const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gi;
            let rowMatch;
            while ((rowMatch = rowRegex.exec(content)) !== null) {
              const cellRegex = /<td[^>]*>(.*?)<\/td>/gi;
              const cells = [];
              let cellMatch;
              while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
                cells.push(cellMatch[1].replace(/<[^>]*>/g, "").trim());
              }
              if (cells.length >= 4) {
                rows.push({ date: cells[0], nav: parseFloat(cells[1]) || null });
              }
            }
            console.log(`[DEBUG] Fund ${code} F10DataApi rows:`, rows.length);
            if (rows.length >= 1 && !Number.isFinite(nav)) {
              nav = rows[0].nav;
              navDate = rows[0].date;
            }
            if (rows.length >= 2 && !Number.isFinite(prevNav)) {
              prevNav = rows[1].nav;
            }
            if (Number.isFinite(nav) && Number.isFinite(prevNav) && !Number.isFinite(dailyChangePct)) {
              dailyChangePct = ((nav - prevNav) / prevNav * 100);
            }
          }
        }
      } catch (e) {
        console.error(`[DEBUG] Fund ${code} F10DataApi error:`, e.message);
      }
    }

    // 第二数据源：fundgz API - 天天基金网估值API，提供最新的已确认净值
    // 重要：fundgz.dwjz 是经过基金确认的最新净值（可能比 eastmoney LSJZ 数据更新更快）
    // 如果 fundgz 提供的净值日期比 eastmoney 晚，则使用 fundgz 的数据
    try {
      const gzUrl = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`;
      const gzRes = await fetch(gzUrl, {
        headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://fund.eastmoney.com/" },
        signal: AbortSignal.timeout(5000),
      });
      const gzText = await gzRes.text();
      const gzMatch = gzText.match(/jsonpgz\((.*)\);?/);
      if (gzMatch && gzMatch[1]) {
        const gzData = JSON.parse(gzMatch[1]);
        console.log(`[DEBUG] Fund ${code} fundgz data:`, {
          dwjz: gzData.dwjz,
          jzrq: gzData.jzrq,
          gszzl: gzData.gszzl,
          gzTime: gzData.gztime,
        });
        // fundgz 的 dwjz 是经过确认的最新净值，覆盖 eastmoney LSJZ（因为 LSJZ 经常滞后一天）
        if (gzData.dwjz) {
          const gzNav = Number.parseFloat(gzData.dwjz);
          const gzDate = gzData.jzrq;
          // 比较日期：如果 fundgz 的日期 >= 当前已知的净值日期，则使用 fundgz 的数据
          if (Number.isFinite(gzNav)) {
            if (!Number.isFinite(nav) || (gzDate && navDate && gzDate > navDate)) {
              nav = gzNav;
              if (gzDate) navDate = gzDate;
            }
          }
        }
        // gszzl 是今日估值涨跌幅，不应该作为 dailyChangePct（日涨幅基于昨日）
        // 但是可以尝试计算 prevNav：如果已知今日净值，prevNav = nav / (1 + gszzl/100)
        if (Number.isFinite(nav) && !Number.isFinite(prevNav) && gzData.gszzl) {
          const changeRate = Number.parseFloat(gzData.gszzl);
          if (Number.isFinite(changeRate)) {
            prevNav = nav / (1 + changeRate / 100);
          }
        }
      }
    } catch (e) {
      console.error(`[DEBUG] Fund ${code} fundgz error:`, e.message);
    }

    // 第三数据源：pingzhongdata API - 天天基金网历史数据，用于计算昨日收益
    // 当 fundgz 和 eastmoney 都没法计算 dailyChangePct 时，从历史数据中拿最近两天的净值
    if (!Number.isFinite(dailyChangePct) && Number.isFinite(nav)) {
      try {
        const pzUrl = `https://fund.eastmoney.com/pingzhongdata/${code}.js?rt=${Date.now()}`;
        const pzRes = await fetch(pzUrl, {
          headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://fund.eastmoney.com/" },
          signal: AbortSignal.timeout(8000),
        });
        const pzBuffer = Buffer.from(await pzRes.arrayBuffer());
        // pingzhongdata 是 GBK 编码，需要用 iconv-lite 解码
        const iconv = (await import("iconv-lite")).default;
        const pzText = iconv.decode(pzBuffer, "GBK");
        // 提取 Data_netWorthTrend 数组
        const pzMatch = pzText.match(/Data_netWorthTrend\s*=\s*(\[[\s\S]*?\]);/);
        if (pzMatch && pzMatch[1]) {
          const items = JSON.parse(pzMatch[1]);
          if (items.length >= 2) {
            // items 是按时间正序排列的
            // 找到与当前 navDate 匹配的那条
            let latestIdx = -1;
            if (navDate) {
              for (let i = items.length - 1; i >= 0; i--) {
                const itemDate = new Date(items[i].x).toISOString().substring(0, 10);
                if (itemDate === navDate) {
                  latestIdx = i;
                  break;
                }
                if (itemDate < navDate) {
                  latestIdx = i + 1;
                  break;
                }
              }
              if (latestIdx < 0) latestIdx = items.length - 1;
            } else {
              latestIdx = items.length - 1;
            }
            const latest = items[latestIdx];
            const prev = latestIdx > 0 ? items[latestIdx - 1] : null;
            if (latest) {
              // 如果 pingzhongdata 有比当前更晚的日期
              const pzLatestDate = new Date(latest.x).toISOString().substring(0, 10);
              if (pzLatestDate > (navDate || "")) {
                nav = latest.y;
                navDate = pzLatestDate;
              }
              if (prev) {
                const pzPrevNav = prev.y;
                prevNav = pzPrevNav;
                if (Number.isFinite(nav) && Number.isFinite(prevNav)) {
                  dailyChangePct = ((nav - prevNav) / prevNav) * 100;
                }
              }
            }
            console.log(`[DEBUG] Fund ${code} pingzhongdata: latest=${latest?.y} prev=${prev?.y} dailyChangePct=${dailyChangePct}`);
          }
        }
      } catch (e) {
        console.error(`[DEBUG] Fund ${code} pingzhongdata error:`, e.message);
      }
    }

    console.log(`[DEBUG] Fund ${code} final result:`, {
      nav,
      prevNav,
      dailyChangePct,
      navDate,
    });

    results[index] = {
      code: code,
      name: null,
      nav: Number.isFinite(nav) ? nav : null,
      prevNav: Number.isFinite(prevNav) ? prevNav : null,
      accumulatedNav: Number.isFinite(accumulatedNav) ? accumulatedNav : null,
      dailyChangePct: Number.isFinite(dailyChangePct) ? dailyChangePct : null,
      dailyChangeAmt: Number.isFinite(nav) && Number.isFinite(prevNav) ? (nav - prevNav) : null,
      navDate: navDate,
    };

    // 获取基金名称
    try {
      const gzUrl = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`;
      const gzRes = await fetch(gzUrl, {
        headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://fund.eastmoney.com/" },
        signal: AbortSignal.timeout(5000),
      });
      const gzText = await gzRes.text();
      const gzMatch = gzText.match(/jsonpgz\((.*)\);?/);
      if (gzMatch && gzMatch[1]) {
        const gzData = JSON.parse(gzMatch[1]);
        results[index].name = gzData.name || null;
      }
    } catch (_) { }
  }));
  return { funds: results };
}

async function getKline(code, market, start, end, count) {
  const tc = tencentCodeFor(code, market);
  if (!tc) {
    throw new Error("unsupported code");
  }
  const upstream = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${tc},day,${start},${end},${count},qfq`;
  const resp = await fetch(upstream, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    signal: AbortSignal.timeout(10000),
  });
  const data = await resp.json();
  const stockData = data?.data?.[tc];
  const kline = stockData?.qfqday || stockData?.day || [];
  return { kline, code: tc };
}

async function getFundNavDetail(code) {
  code = String(code || "").trim();
  if (!/^\d{6}$/.test(code)) {
    throw new Error("invalid fund code");
  }

  let fundName = null;
  let unitNav = null;
  let navDate = null;
  let prevNav = null;
  let prevNavDate = null;
  let changePct = null;
  let estimatedNav = null;
  let estimatedChangePct = null;
  let estimateTime = null;

  let historyData = null;
  try {
    const historyUrl = `https://fund.eastmoney.com/f10/F10DataApi.aspx?type=lsjz&code=${code}&page=1&per=5`;
    const historyResp = await fetch(historyUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(10000),
    });
    const historyText = await historyResp.text();
    const historyStartIdx = historyText.indexOf("var apidata=");
    if (historyStartIdx !== -1) {
      const historyEndIdx = historyText.lastIndexOf("};");
      if (historyEndIdx !== -1) {
        const historyJsonStr = historyText.substring(historyStartIdx + 12, historyEndIdx + 1);
        historyData = new Function(`return ${historyJsonStr}`)();
      }
    }
  } catch (_) {
  }

  if (historyData && historyData.content) {
    const historyContent = historyData.content;
    const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gi;
    let rowMatch;
    let rowCount = 0;
    while ((rowMatch = rowRegex.exec(historyContent)) !== null && rowCount < 3) {
      const rowContent = rowMatch[1];
      const cellRegex = /<td[^>]*>(.*?)<\/td>/gi;
      const cells = [];
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        cells.push(cellMatch[1].replace(/<[^>]*>/g, "").trim());
      }
      if (cells.length >= 4) {
        if (rowCount === 0) {
          navDate = cells[0];
          unitNav = parseFloat(cells[1]) || null;
          changePct = cells[3] !== '-' ? parseFloat(cells[3]) : null;
        } else if (rowCount === 1) {
          prevNavDate = cells[0];
          prevNav = parseFloat(cells[1]) || null;
        }
        rowCount++;
      }
    }
  }

  try {
    const url = `https://fundgz.1234567.com.cn/js/${code}.js`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(10000),
    });
    const text = await resp.text();
    const match = text.match(/jsonpgz\(({.*?})\)/);
    if (match) {
      const data = JSON.parse(match[1]);
      fundName = data.name || null;
      estimatedNav = parseFloat(data.gsz) || null;
      estimatedChangePct = parseFloat(data.gszzl) || null;
      estimateTime = data.gztime || null;
      if (unitNav === null) {
        unitNav = parseFloat(data.dwjz) || null;
      }
      if (navDate === null) {
        navDate = data.jzrq || null;
      }
    }
  } catch (_) {
  }

  if (changePct === null && prevNav != null && unitNav != null && prevNav !== 0) {
    changePct = ((unitNav - prevNav) / prevNav * 100).toFixed(2);
  }

  return {
    code,
    name: fundName,
    unitNav,
    navDate,
    prevNav,
    prevNavDate,
    changePct,
    estimatedNav,
    estimatedChangePct,
    estimateTime,
  };
}

async function getFundNavHistory(code, page = 1, perPage = 20) {
  code = String(code || "").trim();
  if (!/^\d{6}$/.test(code)) {
    throw new Error("invalid fund code");
  }
  const url = `https://fund.eastmoney.com/f10/F10DataApi.aspx?type=lsjz&code=${code}&page=${page}&per=${perPage}`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    signal: AbortSignal.timeout(10000),
  });
  const text = await resp.text();
  const startIdx = text.indexOf("var apidata=");
  if (startIdx === -1) {
    throw new Error("fund nav history data not found");
  }
  const endIdx = text.lastIndexOf("};");
  if (endIdx === -1) {
    throw new Error("fund nav history data not found");
  }
  const jsonStr = text.substring(startIdx + 12, endIdx + 1);
  const data = new Function(`return ${jsonStr}`)();
  const content = data.content || "";
  const rows = [];
  const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(content)) !== null) {
    const rowContent = rowMatch[1];
    const cellRegex = /<td[^>]*>(.*?)<\/td>/gi;
    const cells = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]*>/g, "").trim());
    }
    if (cells.length >= 4) {
      rows.push({
        date: cells[0],
        unitNav: parseFloat(cells[1]) || null,
        accumNav: parseFloat(cells[2]) || null,
        dailyGrowth: parseFloat(cells[3]) || null,
      });
    }
  }
  return {
    code,
    rows,
    records: data.records || rows.length,
    pages: data.pages || 1,
    curpage: data.curpage || page,
  };
}

async function getUSIndex(code) {
  code = String(code || "").trim().toUpperCase();
  const indexMap = {
    "IXIC": { name: "纳斯达克综合指数", baiduCode: "us-IXIC", tencentCode: "usIXIC" },
    "SPX": { name: "标普500指数", baiduCode: "us-INX", tencentCode: "usINX" },
  };
  if (!indexMap[code]) {
    throw new Error("unsupported US index code");
  }
  // 优先：腾讯理财通实时指数接口
  try {
    const url = `http://qt.gtimg.cn/q=${indexMap[code].tencentCode}`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(8000),
    });
    const buf = Buffer.from(await resp.arrayBuffer());
    const text = await safeDecode(buf);
    const match = text.match(/v_(\w+)="(.*)"/);
    if (match && match[2]) {
      const parts = match[2].split("~");
      if (parts.length > 32) {
        const numeric = (v) => {
          const n = parseFloat(v);
          return Number.isFinite(n) ? n : null;
        };
        return {
          code,
          name: parts[1] || indexMap[code].name,
          price: numeric(parts[3]),
          change: numeric(parts[31]),
          changeRate: numeric(parts[32]),
        };
      }
    }
  } catch (_) {}
  // 备用：百度财经
  const baiduCode = indexMap[code].baiduCode;
  try {
    const url = `https://finance.baidu.com/index/${baiduCode}`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(10000),
    });
    const text = await resp.text();
    const priceMatch = text.match(/<div class="price">([^<]+)<\/div>/);
    const changeMatch = text.match(/<div class="change">([^<]+)<\/div>/);
    const changePctMatch = text.match(/<div class="changePercent">([^<]+)<\/div>/);
    return {
      code,
      name: indexMap[code].name,
      price: priceMatch ? parseFloat(priceMatch[1].replace(/,/g, "")) || null : null,
      change: changeMatch ? parseFloat(changeMatch[1].replace(/,/g, "")) || null : null,
      changeRate: changePctMatch ? parseFloat(changePctMatch[1].replace(/%/g, "")) || null : null,
    };
  } catch (err) {
    throw new Error("failed to fetch US index data");
  }
}

async function getCSIndex(code) {
  let normalized = String(code || "").trim().toLowerCase();
  // 处理东方财富 secid 格式：1B0300 -> sh000300, 0B03906 -> sz399006
  if (/^\d[bB]/.test(normalized)) {
    const marketId = normalized.charAt(0);
    const realCode = normalized.substring(2);
    normalized = (marketId === "1" ? "sh" : "sz") + realCode;
  }
  const tcCode = normalized.startsWith("sh") || normalized.startsWith("sz") ? normalized : "sh" + normalized;
  // 优先：腾讯理财通实时指数接口（支持任意 sh/sz 代码，便于自定义指数）
  try {
    const url = `http://qt.gtimg.cn/q=${tcCode}`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(8000),
    });
    const buf = Buffer.from(await resp.arrayBuffer());
    const text = await safeDecode(buf);
    const match = text.match(/v_(\w+)="(.*)"/);
    if (match && match[2]) {
      const parts = match[2].split("~");
      if (parts.length > 32) {
        const numeric = (v) => {
          const n = parseFloat(v);
          return Number.isFinite(n) ? n : null;
        };
        return {
          code,
          name: parts[1] || "",
          price: numeric(parts[3]),
          change: numeric(parts[31]),
          changeRate: numeric(parts[32]),
        };
      }
    }
  } catch (_) {}
  // 备用：百度财经
  const baiduCode = tcCode;
  try {
    const url = `https://finance.baidu.com/action/IndexHistoryAction?type=last&code=${baiduCode}&t=${Date.now()}`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(10000),
    });
    const text = await resp.text();
    const dataMatch = text.match(/\{[\s\S]*\}/);
    if (dataMatch) {
      const data = JSON.parse(dataMatch[0]);
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        const latest = data.data[0];
        return {
          code,
          name: data.name || "",
          price: parseFloat(latest.close || latest[2]) || null,
          change: parseFloat(latest.change || latest[3]) || null,
          changeRate: parseFloat(latest.changePercent || latest[4]) || null,
        };
      }
    }
  } catch (_) {}
  try {
    const url = `https://finance.baidu.com/stock/${baiduCode}.html`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(10000),
    });
    const text = await resp.text();
    const nameMatch = text.match(/<title>([^<]+?)_百度财经<\/title>/);
    const priceMatch = text.match(/最新价[\s\S]*?<span[^>]*>([\d.]+)<\/span>/);
    const changeMatch = text.match(/涨跌[\s\S]*?<span[^>]*>([\d.-]+)<\/span>/);
    const changePctMatch = text.match(/涨跌幅[\s\S]*?<span[^>]*>([\d.-]+)%<\/span>/);
    return {
      code,
      name: nameMatch ? nameMatch[1] : "",
      price: priceMatch ? parseFloat(priceMatch[1]) || null : null,
      change: changeMatch ? parseFloat(changeMatch[1]) || null : null,
      changeRate: changePctMatch ? parseFloat(changePctMatch[1]) || null : null,
    };
  } catch (err) {
    throw new Error("failed to fetch CS index data");
  }
}

async function getIndexHistory(code, count = 120) {
  code = String(code || "").trim().toUpperCase();
  if (code === "IXIC" || code === "SPX") {
    return getUSIndexHistory(code, count);
  }
  return getCSIndexHistory(code, count);
}

async function getCSIndexHistory(code, count = 120) {
  // 规范化：统一小写处理（getIndexHistory 可能传入大写代码）
  let normalized = String(code || "").trim().toLowerCase();
  // 处理东方财富 secid 格式：1B0300 -> sh000300, 0B03906 -> sz399006
  if (/^\d[bB]/.test(normalized)) {
    const marketId = normalized.charAt(0);
    const realCode = normalized.substring(2);
    normalized = (marketId === "1" ? "sh" : "sz") + realCode;
  }
  // 优先：腾讯理财通K线接口（支持任意 sh/sz 代码，便于自定义指数）
  try {
    const tc = normalized.startsWith("sh") || normalized.startsWith("sz") ? normalized : "sh" + normalized;
    const upstream = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${tc},day,,,${count},qfq`;
    const resp = await fetch(upstream, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(10000),
    });
    const data = await resp.json();
    const stockData = data?.data?.[tc];
    const kline = stockData?.qfqday || stockData?.day || [];
    if (kline.length > 0) {
      return {
        code,
        history: kline.map(item => ({
          date: item[0],
          open: parseFloat(item[1]) || null,
          close: parseFloat(item[2]) || null,
          high: parseFloat(item[4]) || null,
          low: parseFloat(item[5]) || null,
          volume: parseFloat(item[6]) || null,
        })),
      };
    }
  } catch (_) {}
  // 备用：百度财经指数历史
  try {
    const baiduCode = normalized.startsWith("sh") || normalized.startsWith("sz") ? normalized : "sh" + normalized;
    const url = `https://finance.baidu.com/action/IndexHistoryAction?type=last&code=${baiduCode}&t=${Date.now()}`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(10000),
    });
    const text = await resp.text();
    const dataMatch = text.match(/\{[\s\S]*\}/);
    if (dataMatch) {
      const data = JSON.parse(dataMatch[0]);
      const history = [];
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach(item => {
          history.push({
            date: item.date || item[0],
            open: parseFloat(item.open || item[1]) || null,
            close: parseFloat(item.close || item[2]) || null,
            high: parseFloat(item.high || item[3]) || null,
            low: parseFloat(item.low || item[4]) || null,
          });
        });
      }
      if (history.length > 0) {
        return { code, history };
      }
    }
  } catch (_) {}
  return { code, history: [] };
}

async function getUSIndexHistory(code, count = 120) {
  try {
    const url = `https://finance.baidu.com/action/IndexHistoryAction?type=last&code=${code === "IXIC" ? "IXIC" : "INX"}&t=${Date.now()}`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(10000),
    });
    const text = await resp.text();
    const dataMatch = text.match(/\{.*\}/);
    if (dataMatch) {
      const data = JSON.parse(dataMatch[0]);
      const history = [];
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach(item => {
          history.push({
            date: item.date || item[0],
            open: parseFloat(item.open || item[1]) || null,
            close: parseFloat(item.close || item[2]) || null,
            high: parseFloat(item.high || item[3]) || null,
            low: parseFloat(item.low || item[4]) || null,
          });
        });
      }
      return { code, history };
    }
  } catch (_) {
  }
  return { code, history: [] };
}

async function getCpiData(year) {
  const cpiCache = new Map();
  
  if (cpiCache.has(year)) {
    return cpiCache.get(year);
  }

  try {
    const url = `https://data.stats.gov.cn/easyquery.htm?m=QueryData&dbcode=hgjd&rowcode=zb&colcode=sj&wds=[{%22wdcode%22:%22zb%22,%22valuecode%22:%22A0101%22}]&dfwds=[{%22wdcode%22:%22sj%22,%22valuecode%22:%22${year}%22}]&k1=${Date.now()}`;
    
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://data.stats.gov.cn/",
        "Accept": "application/json, text/plain, */*",
      },
      signal: AbortSignal.timeout(15000),
    });

    const data = await resp.json();
    const retData = data?.returndata?.datanodes || [];
    
    const monthlyData = [];
    for (let month = 1; month <= 12; month++) {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const node = retData.find(n => n.wds.some(w => w.valuecode === monthStr));
      if (node && node.data && node.data.hasOwnProperty('data')) {
        const value = parseFloat(node.data.data);
        if (Number.isFinite(value)) {
          monthlyData.push({ month: monthStr, value: value });
        }
      }
    }

    const cumulativeSum = monthlyData.reduce((sum, item) => sum + item.value, 0);
    
    const result = {
      year,
      monthly: monthlyData,
      cumulative: cumulativeSum,
    };

    cpiCache.set(year, result);
    return result;
  } catch (err) {
    throw new Error(`Failed to fetch CPI data: ${err.message}`);
  }
}

// 货币基金数据获取：7日年化、万份收益等
async function getMoneyFundData(codes) {
  const results = Array.isArray(codes) ? codes.map(c => ({
    code: typeof c === 'string' ? c : (c.code || ''),
    name: null,
    annualizedRate7d: null,
    perTenThousandIncome: null,
    totalIncome: null,
    nav: null,
    navDate: null,
  })) : [];

  await Promise.all(results.map(async (item) => {
    const code = String(item.code || '').trim();
    if (!/^\d{6}$/.test(code)) return;

    // 方法1：从天天基金网基金详情页面解析数据
    try {
      const url = `https://fund.eastmoney.com/${code}.html`;
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "https://fund.eastmoney.com/",
        },
        signal: AbortSignal.timeout(10000),
      });
      const text = await resp.text();
      
      // 检查是否为货币基金页面
      if (text.includes('货币') || text.includes(' Money') || text.includes('money')) {
        // 解析基金名称
        const titleMatch = text.match(/<title>([^<]+)<\/title>/);
        if (titleMatch) {
          item.name = titleMatch[1].replace(/\(.*?\)/g, '').replace(/行情走势.*$/, '').replace(/—.*$/, '').trim();
        }
        
        // 解析7日年化 - 尝试多种模式
        const annualRatePatterns = [
          /7日年化<\/a><\/span>\s*<\/span>[^<]*<\/p><\/dt><dd[^>]*><span[^>]*>([0-9]+\.[0-9]+)/,
          /7日年化[^0-9<]*([0-9]+\.[0-9]+)/,
          /年化收益[^0-9]*([0-9]+\.[0-9]+)/,
          /annualRate[^0-9]*([0-9]+\.[0-9]+)/,
        ];
        for (const pattern of annualRatePatterns) {
          const match = text.match(pattern);
          if (match) {
            item.annualizedRate7d = Number.parseFloat(match[1]);
            break;
          }
        }
        
        // 解析万份收益 - 尝试多种模式
        const wanFenPatterns = [
          /每万份收益<\/a><\/span><span[^>]*>[^<]*<\/span><span[^>]*>([0-9]+\.[0-9]+)/,
          /万份收益[^0-9<]*([0-9]+\.[0-9]+)/,
          /每万份收益[^0-9<]*([0-9]+\.[0-9]+)/,
          /perTenThousand[^0-9]*([0-9]+\.[0-9]+)/,
        ];
        for (const pattern of wanFenPatterns) {
          const match = text.match(pattern);
          if (match) {
            item.perTenThousandIncome = Number.parseFloat(match[1]);
            break;
          }
        }
        
        // 货币基金净值固定为1
        item.nav = 1;
        
        // 解析净值日期
        const dateMatch = text.match(/净值日期[^0-9]*([0-9]{4}[-/][0-9]{2}[-/][0-9]{2})/);
        if (dateMatch) {
          item.navDate = dateMatch[1];
        }
      }
    } catch (e) {
      console.error(`[getMoneyFundData] Fund ${code} page parsing error:`, e.message);
    }

    // 方法2：如果页面解析失败，尝试备用接口
    if (item.annualizedRate7d == null) {
      try {
        // 尝试天天基金网的另一个API接口
        const apiUrl = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`;
        const apiResp = await fetch(apiUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Referer": "https://fund.eastmoney.com/",
          },
          signal: AbortSignal.timeout(5000),
        });
        const apiText = await apiResp.text();
        const match = apiText.match(/jsonpgz\((.*)\);?/);
        if (match && match[1]) {
          const data = JSON.parse(match[1]);
          item.name = data.name || item.name;
          item.annualizedRate7d = data.gszzl ? Number.parseFloat(data.gszzl) : null;
          item.perTenThousandIncome = data.gsz ? Number.parseFloat(data.gsz) : null;
          item.nav = data.dwjz ? Number.parseFloat(data.dwjz) : 1;
          item.navDate = data.jzrq || null;
        }
      } catch (e) {
        console.error(`[getMoneyFundData] Fund ${code} API fallback error:`, e.message);
      }
    }
  }));

  return results;
}

export { tencentCodeFor, lookupSecurities, getQuotes, getKline, getFundNav, getFundNavDetail, getFundNavHistory, getUSIndex, getCSIndex, getIndexHistory, getCpiData, getMoneyFundData };
