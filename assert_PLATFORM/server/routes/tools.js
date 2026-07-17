import crypto from "node:crypto";
import { json, readBody } from "../utils/http.js";
import { text } from "../utils/validators.js";
import { fetchPremiumMarket, refreshPremiumMarketInBackground, getPremiumCache } from "../services/premium-service.js";
import {
  buildHkIpoPayload,
  filterHkIpoPayload,
  loadHkIpoRulesConfig,
  saveHkIpoRulesConfig,
  hkIpoStats,
  enrichHkIpoSponsorsFromTradeGo,
  enrichHkIpoBigVRowsFromNetwork,
  hkIpoRebuildDerivedPayload,
  exportHkIpoToExcel,
} from "../services/hkipo-service.js";
import { refreshHkIpoMarketInBackground, getHkIpoCache } from "../services/hkipo-fetcher.js";
import { getExchangeRates, getCache as getExchangeRateCache } from "../services/exchange-rate-service.js";
import { allowedOrigins, HK_IPO_DEFAULT_THRESHOLD } from "../config/index.js";

async function handler(req, res, body, origin, pathname, url) {
  const user = res.locals?.user;

  if (req.method === "GET" && pathname === "/api/tools/premium") {
    const force = url.searchParams.get("refresh") === "1";
    const cache = getPremiumCache();
    if (cache.payload) {
      const shouldRefresh = force || cache.expiresAt <= Date.now();
      if (shouldRefresh) void refreshPremiumMarketInBackground();
      json(res, 200, {
        ...cache.payload,
        cached: true,
        refreshing: shouldRefresh,
      }, origin);
      return;
    }
    json(res, 200, await fetchPremiumMarket(), origin);
    return;
  }

  if (req.method === "GET" && pathname === "/api/tools/exchange-rates") {
    const force = url.searchParams.get("refresh") === "1";
    const cache = getExchangeRateCache();
    const now = Date.now();
    const shouldRefresh = force || now - cache.cachedAt > 30 * 60 * 1000;
    
    if (!shouldRefresh && cache.rates) {
      json(res, 200, {
        rates: cache.rates,
        cached: true,
        cachedAt: cache.cachedAt,
      }, origin);
      return;
    }
    
    const result = await getExchangeRates();
    json(res, 200, result, origin);
    return;
  }

  if (!user) return;

  if (req.method === "GET" && pathname === "/api/tools/hk-ipo/rules") {
    const saved = await loadHkIpoRulesConfig(user.id);
    const payload = buildHkIpoPayload(saved || {});
    json(res, 200, {
      rules: payload.rules,
      threshold: payload.threshold,
      updatedAt: saved?.updatedAt || "",
    }, origin);
    return;
  }

  if (req.method === "PUT" && pathname === "/api/tools/hk-ipo/rules") {
    if (body.reset) {
      await saveHkIpoRulesConfig(user.id, null);
      const payload = buildHkIpoPayload({});
      json(res, 200, {
        ok: true,
        rules: payload.rules,
        threshold: payload.threshold,
        stats: hkIpoStats(payload.rows),
      }, origin);
      return;
    }
    const rules = Array.isArray(body.rules) ? body.rules.map((rule) => {
      const score = Number.isFinite(Number(rule.score)) ? Number(rule.score) : 0;
      const defaultScore = Number.isFinite(Number(rule.defaultScore)) ? Number(rule.defaultScore) : score;
      return {
        id: text(rule.id) || crypto.randomUUID(),
        category: text(rule.category),
        item: text(rule.item),
        condition: text(rule.condition),
        score,
        defaultScore,
        system: true,
        custom: false,
        deleted: Boolean(rule.deleted),
      };
    }) : [];
    const threshold = Number(body.threshold) || HK_IPO_DEFAULT_THRESHOLD;
    const config = { rules, threshold, updatedAt: new Date().toISOString() };
    await saveHkIpoRulesConfig(user.id, config);
    const payload = buildHkIpoPayload(config);
    json(res, 200, {
      ok: true,
      rules: payload.rules,
      threshold: payload.threshold,
      stats: hkIpoStats(payload.rows),
      updatedAt: config.updatedAt,
    }, origin);
    return;
  }

  if (req.method === "GET" && pathname === "/api/tools/hk-ipo/export") {
    const saved = await loadHkIpoRulesConfig(user.id);
    const payload = filterHkIpoPayload(buildHkIpoPayload(saved || {}), {
      status: url.searchParams.get("status") || "all",
      query: url.searchParams.get("query") || "",
      startDate: url.searchParams.get("startDate") || "",
      endDate: url.searchParams.get("endDate") || "",
    });
    const { buffer, fileName } = exportHkIpoToExcel(payload);
    if (allowedOrigins.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.writeHead(200, {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-cache",
    });
    res.end(buffer);
    return;
  }

  if (req.method === "GET" && pathname === "/api/tools/hk-ipo") {
    const saved = await loadHkIpoRulesConfig(user.id);
    const forceRefresh = url.searchParams.get("refresh") === "1";
    const useLiveData = url.searchParams.get("live") === "1";
    
    const cache = getHkIpoCache();
    if (cache.payload && cache.expiresAt > Date.now() && !forceRefresh && !useLiveData) {
      void refreshHkIpoMarketInBackground();
    }
    
    const rawPayload = await buildHkIpoPayload(saved || {}, useLiveData || forceRefresh);
    let payload = filterHkIpoPayload(rawPayload, {
      status: url.searchParams.get("status") || "all",
      query: url.searchParams.get("query") || "",
      startDate: url.searchParams.get("startDate") || "",
      endDate: url.searchParams.get("endDate") || "",
    });
    
    if (forceRefresh) {
      payload = await enrichHkIpoSponsorsFromTradeGo(payload);
      payload = await enrichHkIpoBigVRowsFromNetwork(payload);
      payload = hkIpoRebuildDerivedPayload(payload);
    }
    
    json(res, 200, {
      ...payload,
      cached: !forceRefresh && !useLiveData && cache.payload && cache.expiresAt > Date.now(),
      refreshing: forceRefresh,
      expiresAt: cache.expiresAt,
    }, origin);
    return;
  }
}

export { handler };
