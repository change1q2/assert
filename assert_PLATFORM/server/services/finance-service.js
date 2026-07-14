function tencentCodeFor(code, market) {
  code = String(code || "").trim();
  if (!code) return null;
  market = String(market || "").toLowerCase();
  if (market === "domestic" || /^sh/i.test(code)) {
    const raw = code.replace(/^(sh|sz)/i, "");
    return (raw.startsWith("6") || raw.startsWith("9")) ? "sh" + raw : "sz" + raw;
  }
  if (market === "hk" || /^hk/i.test(code) || /^0[0-9]{4}$/.test(code)) {
    return "hk" + code.replace(/^hk/i, "").padStart(5, "0");
  }
  if (market === "us" || /^us/i.test(code)) {
    return "us" + code.replace(/^us/i, "").toUpperCase();
  }
  if (/^[569]/.test(code)) return "sh" + code;
  if (/^[013]/.test(code)) return "sz" + code;
  return null;
}

async function lookupSecurities(q) {
  const normalizedQuery = q.trim().toUpperCase();
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
    const searchData = await searchRes.json();
    const rows = searchData?.QuotationCodeTable?.Data || [];
    const items = rows
      .filter((r) => ["AStock", "OTCFUND", "ETF", "Index", "HK", "UsStock", "UsADR"].includes(r.Classify))
      .slice(0, 8)
      .map((r) => ({
        code: r.Code,
        name: r.Name,
        classify: r.Classify,
        typeName: r.SecurityTypeName,
        marketType: r.MarketType,
        mktNum: r.MktNum,
        jys: r.JYS || "",
      }));
    for (const item of localItems) {
      if (!items.some((entry) => entry.code === item.code && entry.classify === item.classify)) items.push(item);
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
        const priceText = new TextDecoder("gbk").decode(priceBuf);
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
        const sinaText = new TextDecoder("gbk").decode(sinaBuf);
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
      const priceText = new TextDecoder("gbk").decode(priceBuf);
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
          results[index] = { ...results[index], ...pm };
        }
      }
    } catch (_) { }
  }
  const fallbackItems = queryItems.filter(({ index }) => results[index].price == null);
  await Promise.all(fallbackItems.map(async ({ tencentCode, index }) => {
    const prefix = tencentCode.slice(0, 2);
    if (!["sh", "sz"].includes(prefix)) return;
    const secid = `${prefix === "sh" ? "1" : "0"}.${tencentCode.slice(2)}`;
    try {
      const quoteRes = await fetch(`https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f44,f45,f47,f57,f58,f60,f169,f170`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(6000),
      });
      const data = (await quoteRes.json())?.data;
      if (!data || !Number.isFinite(Number(data.f43))) return;
      const scaled = (value) => Number.isFinite(Number(value)) ? Number(value) / 100 : null;
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
      };
    } catch (_) { }
  }));
  return { quotes: results };
}

// 天天基金网基金净值查询（场外基金）
async function getFundNav(codes) {
  const results = codes.map((item) => ({
    code: item.code,
    name: null,
    nav: null,
    prevNav: null,
    dailyChangePct: null,
    dailyChangeAmt: null,
    navDate: null,
  }));
  await Promise.all(codes.map(async (item, index) => {
    const code = String(item.code || '').trim();
    if (!/^\d{6}$/.test(code)) return;
    try {
      const navUrl = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=1&pageSize=2&startDate=&endDate=`;
      const navRes = await fetch(navUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "https://fund.eastmoney.com/",
        },
        signal: AbortSignal.timeout(8000),
      });
      const navData = await navRes.json();
      const list = navData?.Data?.LSJZList || [];
      if (!list || list.length < 1) return;
      const latest = list[0];
      const prev = list.length > 1 ? list[1] : null;
      const nav = Number.parseFloat(latest.DWJZ);
      const prevNav = prev ? Number.parseFloat(prev.DWJZ) : null;
      const dailyChangePct = Number.parseFloat(latest.JZZZL);
      const navDate = latest.FSRQ || null;
      results[index] = {
        code: code,
        name: null,
        nav: Number.isFinite(nav) ? nav : null,
        prevNav: Number.isFinite(prevNav) ? prevNav : null,
        dailyChangePct: Number.isFinite(dailyChangePct) ? dailyChangePct : null,
        dailyChangeAmt: Number.isFinite(nav) && Number.isFinite(prevNav) ? (nav - prevNav) : null,
        navDate: navDate,
      };
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

export { tencentCodeFor, lookupSecurities, getQuotes, getKline, getFundNav };
