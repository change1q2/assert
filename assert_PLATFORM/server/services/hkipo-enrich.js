import { text } from "../utils/validators.js";
import * as utils from "./hkipo-utils.js";

function normalizeHkIpoBigVRows(rawRows = []) {
  return rawRows.slice(1).map((row, index) => {
    const sampleCount = utils.hkIpoNum(row[2]);
    const positiveCount = utils.hkIpoNum(row[3]);
    const ratio = sampleCount ? positiveCount / sampleCount : 0;
    const opinion = utils.hkIpoBigVOpinion(sampleCount, positiveCount);
    const score = utils.hkIpoBigVScore(sampleCount, positiveCount);
    return {
      id: `bigv-${index}`,
      code: text(row[0]),
      companyName: text(row[1]),
      bigV: sampleCount ? `${positiveCount}/${sampleCount}` : "0/0",
      bigVName: utils.hkIpoExtractBigVNames(row[7]),
      intention: sampleCount ? `${Number((ratio * 100).toFixed(1))}%` : "未获取",
      reason: opinion,
      score,
      confidence: text(row[6]),
      sampleCount,
      positiveCount,
      note: text(row[7]),
    };
  }).sort((a, b) => utils.hkIpoNum(b.score) - utils.hkIpoNum(a.score) || utils.hkIpoNum(b.positiveCount) - utils.hkIpoNum(a.positiveCount));
}

async function hkIpoFetchTradeGoBasics(companyName, code) {
  const query = `${companyName} ${code} 捷利交易宝 新股IPO简况 认购倍数 超购倍数 保荐人 基石占比 认购总占比 绿鞋 发行调配权 ${utils.hkIpoSourceSearchTerms()}`;
  const url = `https://r.jina.ai/http://www.bing.com/search?q=${encodeURIComponent(query)}`;
  const content = await utils.hkIpoFetchText(url, 4500);
  return utils.hkIpoExtractTradeGoBasicsFromText(content);
}

async function enrichHkIpoSponsorsFromTradeGo(payload) {
  const rows = await Promise.all(payload.rows.map(async (row) => {
    const basics = await hkIpoFetchTradeGoBasics(row.companyName, row.code);
    const oldMultiple = utils.hkIpoNum(row.actualMultiple);
    const newMultiple = Number.isFinite(Number(basics.actualMultiple)) ? Number(basics.actualMultiple) : null;
    return {
      ...row,
      sponsor: basics.sponsor || row.sponsor,
      cornerstoneShare: basics.cornerstoneShare || utils.normalizeHkIpoCornerstoneShare(row.cornerstoneShare),
      greenshoe: basics.greenshoe || utils.normalizeHkIpoYesNo(row.greenshoe),
      allocationOption: basics.allocationOption || utils.normalizeHkIpoYesNo(row.allocationOption),
      actualMultiple: newMultiple !== null ? newMultiple : row.actualMultiple,
      actualMultipleIncreased: newMultiple !== null && newMultiple > oldMultiple,
      actualMultipleSource: newMultiple !== null ? "捷利交易宝新股IPO简况" : row.actualMultipleSource,
      tradeGoSource: Object.values(basics).some(Boolean) ? "捷利交易宝新股IPO简况" : row.tradeGoSource,
    };
  }));
  const recommendations = payload.recommendations.map((row) => {
    const matched = rows.find((item) => item.code === row.code && item.companyName === row.companyName);
    return matched ? { ...row, sponsor: matched.sponsor, cornerstoneShare: matched.cornerstoneShare, greenshoe: matched.greenshoe, allocationOption: matched.allocationOption, actualMultiple: matched.actualMultiple } : row;
  });
  const scoreRows = payload.scoreRows.map((row) => {
    const matched = rows.find((item) => item.code === row.code && item.companyName === row.companyName);
    return matched ? { ...row, sponsor: matched.sponsor, cornerstoneShare: matched.cornerstoneShare, greenshoe: matched.greenshoe, allocationOption: matched.allocationOption } : row;
  });
  return { ...payload, rows, recommendations, scoreRows };
}

async function enrichHkIpoBigVRowsFromNetwork(payload) {
  const codes = payload.rows.map((row) => row.code).join("|");
  const cacheKey = `${codes}:${payload.fetchedAt || ""}`;
  const now = Date.now();
  if (utils.hkIpoBigVNetworkCache.key === cacheKey && now - utils.hkIpoBigVNetworkCache.fetchedAt < 60 * 60 * 1000) {
    return { ...payload, bigVRows: utils.hkIpoBigVNetworkCache.rows };
  }
  const platformSources = [
    { platform: "全网搜索", kind: "web" },
    { platform: "雪球公开", kind: "web", site: "xueqiu.com" },
    { platform: "富途公开", kind: "web", site: "futunn.com" },
    { platform: "老虎公开", kind: "web", site: "laohu8.com" },
    { platform: "B站", kind: "bilibili" },
  ];
  const unavailablePlatforms = ["Twitter/X", "小红书", "Reddit", "雪球登录态"];
  const rows = await Promise.all(payload.rows.map(async (row) => {
    const results = await Promise.all(platformSources.map((source) => utils.hkIpoSearchPublicSource(row.companyName, row.code, source)));
    const positiveCount = results.reduce((sum, item) => sum + item.signals.positive + item.signals.cautious, 0);
    const negativeCount = results.reduce((sum, item) => sum + item.signals.negative, 0);
    const sampleCount = positiveCount + negativeCount;
    const score = utils.hkIpoBigVScore(sampleCount, positiveCount);
    const sources = results.filter((item) => item.ok).map((item) => item.platform);
    return {
      id: `bigv-net-${row.code}`,
      code: row.code,
      companyName: row.companyName,
      bigV: sampleCount ? `${positiveCount}/${sampleCount}` : "0/0",
      bigVName: sources.length ? sources.join("、") : "未获取",
      intention: sampleCount ? `${Number(((positiveCount / sampleCount) * 100).toFixed(1))}%` : "未获取",
      reason: utils.hkIpoBigVOpinion(sampleCount, positiveCount),
      score,
      confidence: sampleCount >= 4 ? "中" : sampleCount > 0 ? "低" : "未获取",
      sampleCount,
      positiveCount,
      note: [
        `公开渠道：${sources.length ? sources.join("、") : "未检索到有效信号"}`,
        `未接入：${unavailablePlatforms.join("、")}`,
        `正向/谨慎信号${positiveCount}，负向信号${negativeCount}`,
      ].join("；"),
    };
  }));
  const sortedRows = rows.sort((a, b) => utils.hkIpoNum(b.score) - utils.hkIpoNum(a.score) || utils.hkIpoNum(b.positiveCount) - utils.hkIpoNum(a.positiveCount));
  utils.hkIpoBigVNetworkCache = { key: cacheKey, fetchedAt: now, rows: sortedRows };
  return { ...payload, bigVRows: sortedRows };
}

export {
  normalizeHkIpoBigVRows,
  hkIpoFetchTradeGoBasics,
  enrichHkIpoSponsorsFromTradeGo,
  enrichHkIpoBigVRowsFromNetwork,
};
