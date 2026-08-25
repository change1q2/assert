import { json } from "../utils/http.js";
import { lookupSecurities, getQuotes, getKline, getFundNav, getFundNavDetail, getFundNavHistory, getUSIndex, getCSIndex, getIndexHistory, getMoneyFundData } from "../services/finance-service.js";

async function handler(req, res, body, origin, pathname, url) {
  if (req.method === "GET" && pathname === "/api/finance/lookup") {
    const q = (url.searchParams.get("q") || "").trim();
    const market = (url.searchParams.get("market") || "").trim();
    const excludeStock = url.searchParams.get("excludeStock") === "1";
    if (!q) {
      json(res, 200, { items: [] }, origin);
      return;
    }
    try {
      const result = await lookupSecurities(q, market, { excludeStock });
      json(res, 200, result, origin);
    } catch (err) {
      json(res, 200, { items: [], error: err.message }, origin);
    }
    return;
  }

  if (req.method === "POST" && pathname === "/api/finance/quotes") {
    const codes = Array.isArray(body.codes) ? body.codes : [];
    if (!codes.length) {
      json(res, 200, { quotes: [] }, origin);
      return;
    }
    const result = await getQuotes(codes);
    json(res, 200, result, origin);
    return;
  }

  if (req.method === "POST" && pathname === "/api/finance/fund-nav") {
    const codes = Array.isArray(body.codes) ? body.codes : [];
    if (!codes.length) {
      json(res, 200, { funds: [] }, origin);
      return;
    }
    try {
      const result = await getFundNav(codes);
      json(res, 200, result, origin);
    } catch (err) {
      json(res, 200, { funds: [], error: err.message }, origin);
    }
    return;
  }

  if (req.method === "GET" && pathname === "/api/finance/kline") {
    const code = url.searchParams.get("code") || "";
    const market = url.searchParams.get("market") || "domestic";
    const start = url.searchParams.get("start") || "";
    const end = url.searchParams.get("end") || "";
    const count = url.searchParams.get("count") || "320";
    try {
      const result = await getKline(code, market, start, end, count);
      json(res, 200, result, origin);
    } catch (err) {
      json(res, 502, { error: "K-line data unavailable", detail: err.message }, origin);
    }
    return;
  }

  if (req.method === "GET" && pathname === "/api/finance/fund-nav") {
    const code = (url.searchParams.get("code") || "").trim();
    if (!code) {
      json(res, 400, { error: "fund code required" }, origin);
      return;
    }
    try {
      const result = await getFundNavDetail(code);
      json(res, 200, result, origin);
    } catch (err) {
      json(res, 502, { error: "fund nav data unavailable", detail: err.message }, origin);
    }
    return;
  }

  if (req.method === "GET" && pathname === "/api/finance/fund-nav-history") {
    const code = (url.searchParams.get("code") || "").trim();
    if (!code) {
      json(res, 400, { error: "fund code required" }, origin);
      return;
    }
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const perPage = parseInt(url.searchParams.get("per") || "20", 10);
    try {
      const result = await getFundNavHistory(code, page, perPage);
      json(res, 200, result, origin);
    } catch (err) {
      json(res, 502, { error: "fund nav history unavailable", detail: err.message }, origin);
    }
    return;
  }

  // 货币基金数据接口：获取7日年化、万份收益等
  if (req.method === "POST" && pathname === "/api/finance/money-fund") {
    const codes = Array.isArray(body.codes) ? body.codes : [];
    if (!codes.length) {
      json(res, 200, { funds: [] }, origin);
      return;
    }
    try {
      const result = await getMoneyFundData(codes);
      json(res, 200, { funds: result }, origin);
    } catch (err) {
      json(res, 200, { funds: [], error: err.message }, origin);
    }
    return;
  }

  if (req.method === "GET" && pathname === "/api/finance/index") {
    const code = (url.searchParams.get("code") || "").trim();
    if (!code) {
      json(res, 400, { error: "index code required" }, origin);
      return;
    }
    try {
      const upperCode = code.toUpperCase();
      if (upperCode === "IXIC" || upperCode === "SPX") {
        const result = await getUSIndex(code);
        json(res, 200, result, origin);
      } else {
        const result = await getCSIndex(code);
        json(res, 200, result, origin);
      }
    } catch (err) {
      json(res, 502, { error: "index data unavailable", detail: err.message }, origin);
    }
    return;
  }

  if (req.method === "GET" && pathname === "/api/finance/index-history") {
    const code = (url.searchParams.get("code") || "").trim();
    if (!code) {
      json(res, 400, { error: "index code required" }, origin);
      return;
    }
    const count = parseInt(url.searchParams.get("count") || "120", 10);
    try {
      const result = await getIndexHistory(code, count);
      json(res, 200, result, origin);
    } catch (err) {
      json(res, 502, { error: "index history unavailable", detail: err.message }, origin);
    }
    return;
  }

  if (req.method === "GET" && pathname === "/api/finance/cpi") {
    const year = parseInt(url.searchParams.get("year") || new Date().getFullYear(), 10);
    try {
      const result = await getCpiData(year);
      json(res, 200, result, origin);
    } catch (err) {
      json(res, 502, { error: "CPI data unavailable", detail: err.message }, origin);
    }
    return;
  }
}

export { handler };
