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

  const baiduFallbackItems = queryItems.filter(({ index }) => results[index].price == null);
  await Promise.all(baiduFallbackItems.map(async ({ tencentCode, index }) => {
    const prefix = tencentCode.slice(0, 2);
    if (!["sh", "sz"].includes(prefix)) return;
    const stockCode = tencentCode.slice(2);
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
        };
      }
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
    "IXIC": { name: "纳斯达克综合指数", baiduCode: "us-IXIC" },
    "SPX": { name: "标普500指数", baiduCode: "us-INX" },
  };
  if (!indexMap[code]) {
    throw new Error("unsupported US index code");
  }
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
  code = String(code || "").trim().toLowerCase();
  const baiduCode = code.startsWith("sh") || code.startsWith("sz") ? code : "sh" + code;
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
  try {
    const baiduCode = code.startsWith("sh") || code.startsWith("sz") ? code : "sh" + code;
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
  } catch (_) {
  }
  try {
    const tc = code.startsWith("sh") ? code : "sh" + code;
    const upstream = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${tc},day,,,${count},qfq`;
    const resp = await fetch(upstream, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(10000),
    });
    const data = await resp.json();
    const stockData = data?.data?.[tc];
    const kline = stockData?.qfqday || stockData?.day || [];
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
  } catch (err) {
    throw new Error("failed to fetch index history");
  }
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

export { tencentCodeFor, lookupSecurities, getQuotes, getKline, getFundNav, getFundNavDetail, getFundNavHistory, getUSIndex, getCSIndex, getIndexHistory };
