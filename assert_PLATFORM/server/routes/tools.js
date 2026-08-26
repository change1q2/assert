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
import { getExchangeRates, getCache as getExchangeRateCache, getHkConnectRate, getHkConnectCache } from "../services/exchange-rate-service.js";
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
    const shouldRefresh = force || now - cache.cachedAt > 60 * 1000;
    
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

  // 动量排名代理：抓取 zhibeiquant.com 页面，注入CSS隐藏"实盘更新"板块
  if (req.method === "GET" && pathname === "/api/tools/momentum-ranking") {
    try {
      const upstream = await fetch("https://zhibeiquant.com/", {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      });
      let html = await upstream.text();
      const inject = `<base href="https://zhibeiquant.com/"><style>
        /* 隐藏"实盘更新"板块 */
        .bg-gradient-to-br.from-blue-900.to-slate-800.rounded-lg.border-blue-800 { display: none !important; }
      </style>
      <script>
        // 覆盖 fetch：将 zhibeiquant.com 的 API 请求代理到后端，避免 CORS
        (function(){
          var ORIGIN_HOST = 'https://zhibeiquant.com';
          var PROXY_PREFIX = location.origin + '/api/tools/momentum-proxy?path=';
          function rewriteUrl(url){
            if (typeof url !== 'string' || !url) return url;
            try {
              var abs = new URL(url, document.baseURI).href;
              if (abs.indexOf(ORIGIN_HOST) === 0){
                var rel = abs.slice(ORIGIN_HOST.length);
                return PROXY_PREFIX + encodeURIComponent(rel);
              }
            } catch(e) {}
            return url;
          }
          var origFetch = window.fetch;
          window.fetch = function(input, init){
            try {
              if (typeof input === 'string'){
                input = rewriteUrl(input);
              } else if (input && typeof input.url === 'string'){
                var rewritten = rewriteUrl(input.url);
                if (rewritten !== input.url){
                  input = rewritten;
                }
              }
            } catch(e) {}
            return origFetch.call(window, input, init);
          };
          var OrigXHR = window.XMLHttpRequest;
          function PatchedXHR(){
            var xhr = new OrigXHR();
            var origOpen = xhr.open;
            xhr.open = function(method, url){
              var args = Array.prototype.slice.call(arguments);
              if (typeof url === 'string'){
                args[1] = rewriteUrl(url);
              }
              return origOpen.apply(xhr, args);
            };
            return xhr;
          }
          PatchedXHR.prototype = OrigXHR.prototype;
          window.XMLHttpRequest = PatchedXHR;
        })();
        // 隐藏"实盘更新"板块
        (function(){
          function hideLiveUpdate(){
            var h3s = document.querySelectorAll('h3');
            for (var i=0;i<h3s.length;i++){
              if (h3s[i].textContent.indexOf('实盘更新')>=0){
                var p = h3s[i].parentElement;
                while(p && p !== document.body){
                  if (p.tagName === 'DIV' && p.parentElement === document.querySelector('main')){
                    p.style.display = 'none';
                    return;
                  }
                  p = p.parentElement;
                }
                h3s[i].parentElement.style.display = 'none';
                return;
              }
            }
          }
          if (document.readyState === 'loading'){
            document.addEventListener('DOMContentLoaded', hideLiveUpdate);
          } else {
            hideLiveUpdate();
          }
          setTimeout(hideLiveUpdate, 1000);
        })();
      </script>`;
      if (html.includes("</head>")) {
        html = html.replace("</head>", `${inject}</head>`);
      } else {
        html = inject + html;
      }
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
        ...(allowedOrigins.has(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
      });
      res.end(html);
      return;
    } catch (e) {
      json(res, 200, { success: false, error: String(e.message || e) }, origin);
      return;
    }
  }

  // 动量排名 API 代理：转发到 zhibeiquant.com 的 API，绕过 CORS
  if (req.method === "GET" && pathname === "/api/tools/momentum-proxy") {
    try {
      const targetPath = url.searchParams.get("path") || "/";
      const targetUrl = "https://zhibeiquant.com" + targetPath;
      const upstream = await fetch(targetUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept": "application/json" },
      });
      const body = await upstream.text();
      const ct = upstream.headers.get("content-type") || "application/json; charset=utf-8";
      res.writeHead(200, {
        "Content-Type": ct,
        "Cache-Control": "no-cache",
        ...(allowedOrigins.has(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
      });
      res.end(body);
      return;
    } catch (e) {
      json(res, 200, { success: false, error: String(e.message || e) }, origin);
      return;
    }
  }

  // 港股通参考汇率接口
  if (req.method === "GET" && pathname === "/api/tools/hk-connect-rate") {
    const force = url.searchParams.get("refresh") === "1";
    const cache = getHkConnectCache();
    const now = Date.now();
    const shouldRefresh = force || !cache || now - (cache.cachedAt || 0) > 10 * 60 * 1000;
    
    if (!shouldRefresh && cache) {
      json(res, 200, {
        ...cache,
        cached: true,
      }, origin);
      return;
    }
    
    const result = await getHkConnectRate(force);
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
