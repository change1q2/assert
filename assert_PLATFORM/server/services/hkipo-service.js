import fs from "node:fs";
import crypto from "node:crypto";
import { pool } from "../db/index.js";
import { sqlRun, sqlGet, maybeParseJson } from "../utils/db.js";
import { text } from "../utils/validators.js";
import { HK_IPO_DATA_SOURCES } from "../data/hk-ipo-sources.js";
import {
  HK_IPO_SOURCE_FILE,
  HK_IPO_CONNECT_MARKET_CAP,
  HK_IPO_DEFAULT_THRESHOLD,
} from "../config/index.js";
import * as utils from "./hkipo-utils.js";
import {
  normalizeHkIpoBigVRows,
  enrichHkIpoSponsorsFromTradeGo,
  enrichHkIpoBigVRowsFromNetwork,
} from "./hkipo-enrich.js";
import {
  hkIpoSheetRows,
  hkIpoBigVSheetRows,
  exportHkIpoToExcel,
} from "./hkipo-export.js";

const { hkIpoStatus, hkIpoScoreActualMultiple } = utils;

function loadHkIpoRawDataset() {
  const stat = fs.statSync(HK_IPO_SOURCE_FILE);
  if (utils.hkIpoCache.payload && utils.hkIpoCache.sourceMtimeMs === stat.mtimeMs) return utils.hkIpoCache.payload;
  const source = fs.readFileSync(HK_IPO_SOURCE_FILE, "utf8");
  const payload = {
    headers: utils.extractConstArrayFromSource(source, "headers"),
    rows: utils.extractConstArrayFromSource(source, "rows"),
    recommendations: utils.extractConstArrayFromSource(source, "recommendation"),
    scoreHeaders: utils.extractConstArrayFromSource(source, "scoreHeaders"),
    scoreRows: utils.extractConstArrayFromSource(source, "scoreRows"),
    ruleRows: utils.extractConstArrayFromSource(source, "ruleRows"),
    bigVRows: utils.extractConstArrayFromSource(source, "bigVRows"),
    validationRows: utils.extractConstArrayFromSource(source, "validationRows"),
    fetchedAt: new Date(stat.mtimeMs).toISOString(),
    source: HK_IPO_SOURCE_FILE,
  };
  utils.hkIpoCache = { sourceMtimeMs: stat.mtimeMs, payload };
  return payload;
}

function hkIpoStats(rows) {
  const recommended = rows.filter((row) => row.shouldApply === "是");
  const recommendedCompanyCount = new Set(recommended.map((row) => row.companyName || row.code).filter(Boolean)).size;
  const bestScore = rows.reduce((best, row) => (utils.hkIpoNum(row.score) > utils.hkIpoNum(best?.score) ? row : best), null);
  const bestProfit = rows.reduce((best, row) => (utils.hkIpoNum(row.oneLotExpectedProfit) > utils.hkIpoNum(best?.oneLotExpectedProfit) ? row : best), null);
  const statusCounts = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  const avgScore = rows.length ? rows.reduce((sum, row) => sum + utils.hkIpoNum(row.score), 0) / rows.length : 0;
  return {
    total: rows.length,
    recommended: recommendedCompanyCount,
    averageScore: Number(avgScore.toFixed(3)),
    bestScoreProject: bestScore ? `${bestScore.companyName} ${bestScore.score}` : "",
    bestProfitProject: bestProfit ? `${bestProfit.companyName} ${bestProfit.oneLotExpectedProfit}` : "",
    statusCounts,
    scoreDistribution: [0, 3, 6, 9, 12].map((min, index, list) => {
      const max = list[index + 1] ?? Infinity;
      return {
        label: max === Infinity ? `${min}+` : `${min}-${max}`,
        count: rows.filter((row) => utils.hkIpoNum(row.score) >= min && utils.hkIpoNum(row.score) < max).length,
      };
    }),
    profitRanking: [...rows]
      .filter((row) => row.status === "招股中")
      .sort((a, b) => utils.hkIpoNum(b.oneLotExpectedProfit) - utils.hkIpoNum(a.oneLotExpectedProfit))
      .map((row) => ({
        code: row.code,
        companyName: row.companyName,
        value: utils.hkIpoNum(row.oneLotExpectedProfit),
        scenarioTags: Array.isArray(row.scenarioTags) ? row.scenarioTags : [],
        priceTag: (Array.isArray(row.scenarioTags) ? row.scenarioTags : []).find((tag) => ["高", "低"].includes(tag)) || "",
      })),
  };
}

function normalizeHkIpoRules(ruleRows = [], savedRules = []) {
  const savedMap = new Map((savedRules || []).map((rule) => [String(rule.id), rule]));
  const deletedIds = new Set((savedRules || []).filter((rule) => rule?.deleted).map((rule) => String(rule.id)));
  const systemRules = ruleRows.slice(1).map((row, index) => {
    const id = utils.hkIpoRuleId(row, index);
    if (deletedIds.has(id)) return null;
    const saved = savedMap.get(id);
    const defaultScore = Number(row[3]);
    const savedDefaultScore = Number(saved?.defaultScore);
    const savedScore = Number(saved?.score);
    const hasSavedField = (field) => saved && Object.prototype.hasOwnProperty.call(saved, field);
    return {
      id,
      category: hasSavedField("category") ? text(saved.category) : text(row[0]),
      item: hasSavedField("item") ? text(saved.item) : text(row[1]),
      condition: hasSavedField("condition") ? text(saved.condition) : text(row[2]),
      score: Number.isFinite(savedScore) ? savedScore : (Number.isFinite(defaultScore) ? defaultScore : 0),
      defaultScore: Number.isFinite(savedDefaultScore)
        ? savedDefaultScore
        : (Number.isFinite(defaultScore) ? defaultScore : text(row[3])),
      system: true,
      custom: false,
    };
  }).filter(Boolean);
  const customRules = (savedRules || [])
    .filter((rule) => !rule?.deleted)
    .filter((rule) => rule?.custom || !systemRules.some((item) => item.id === rule.id))
    .map((rule) => ({
      id: text(rule.id) || crypto.randomUUID(),
      category: text(rule.category || "自定义"),
      item: text(rule.item || "自定义评分项"),
      condition: text(rule.condition || ""),
      score: Number(rule.score) || 0,
      defaultScore: Number.isFinite(Number(rule.defaultScore)) ? Number(rule.defaultScore) : (Number(rule.score) || 0),
      system: Boolean(rule.system),
      custom: !rule.system,
    }));
  return [...systemRules, ...customRules];
}

function applyHkIpoScenarioTags(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const key = row.code || row.companyName;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  for (const groupRows of groups.values()) {
    if (groupRows.length <= 1) {
      groupRows[0].scenarioTags = [];
      continue;
    }
    const offerPrices = [...new Set(groupRows.map((row) => Number(row.offerPrice)).filter(Number.isFinite))].sort((a, b) => a - b);
    const publicHands = [...new Set(groupRows.map((row) => Number(row.publicTotalHands)).filter(Number.isFinite))].sort((a, b) => a - b);
    const hasPriceRange = offerPrices.length > 1;
    const hasHandsRange = publicHands.length > 1;
    groupRows.forEach((row) => {
      const tags = [];
      const offerPrice = Number(row.offerPrice);
      const hands = Number(row.publicTotalHands);
      const mechanism = text(row.mechanism).toUpperCase();
      if (hasPriceRange && Number.isFinite(offerPrice)) {
        if (offerPrice === offerPrices[0]) tags.push("低");
        if (offerPrice === offerPrices.at(-1)) tags.push("高");
      }
      if (text(row.ahType).toUpperCase() === "AH") tags.push("AH");
      if (hasHandsRange && Number.isFinite(hands)) {
        if (mechanism === "A") {
          tags.push(hands === publicHands[0] ? "A小" : "A大");
        } else if (mechanism === "18C") {
          tags.push(hands === publicHands[0] ? "18C小" : "18C大");
        }
      }
      row.scenarioTags = tags;
      row.scenarioLabel = tags.join(" / ");
    });
  }
  return rows;
}

function buildHkIpoTableRows(rawRows = []) {
  return rawRows.map((row) => {
    const isAH = row[18] === "AH";
    const hMarketCap = Number(row[6]);
    const offerPrice = Number(row[2]);
    const boardLot = Number(row[3]);
    if (isAH || !Number.isFinite(hMarketCap) || !Number.isFinite(offerPrice) || !Number.isFinite(boardLot)) {
      return [
        ...row.slice(0, 7),
        "",
        "",
        "",
        "",
        "",
        row[10],
        row[11],
        row[12],
        row[12],
        ...row.slice(13, 25),
        "TBD",
        "TBD",
        "TBD",
        "TBD",
        "TBD",
        ...row.slice(25),
      ];
    }
    const amountNeeded = HK_IPO_CONNECT_MARKET_CAP - hMarketCap;
    const requiredRise = amountNeeded / hMarketCap;
    const postConnectPrice = offerPrice * (HK_IPO_CONNECT_MARKET_CAP / hMarketCap);
    const expectedOneLotProfit = (postConnectPrice - offerPrice) * boardLot;
    return [
      ...row.slice(0, 7),
      HK_IPO_CONNECT_MARKET_CAP,
      `${(requiredRise * 100).toFixed(1)}%`,
      `${amountNeeded.toFixed(2)}亿`,
      Number(postConnectPrice.toFixed(2)),
      Number(expectedOneLotProfit.toFixed(0)),
      row[10],
      row[11],
      row[12],
      row[12],
      ...row.slice(13, 25),
      "TBD",
      "TBD",
      "TBD",
      "TBD",
      "TBD",
      ...row.slice(25),
    ];
  });
}

function normalizeHkIpoRow(headers, row, index) {
  const record = Object.fromEntries(headers.map((header, i) => [header, utils.hkIpoCell(row[i])]));
  const subscription = utils.parseHkIpoRange(record["申购时间"]);
  const resultDate = utils.parseHkIpoDate(record["资金锁定期（中签结果）"]);
  const greyDate = utils.parseHkIpoDate(record["暗盘时间"]);
  const listingDate = utils.parseHkIpoDate(record["上市日期"]) || greyDate || resultDate;
  const normalized = {
    id: `${record["代码编号"] || "ipo"}-${index}`,
    code: text(record["代码编号"]),
    companyName: text(record["公司名称"]),
    offerPrice: record["发行价格"],
    boardLot: record["1手股数"],
    entryAmount: record["1手入场金额"],
    totalMarketCap: record["总市值（亿）"],
    hMarketCap: record["H股市值（亿）"],
    connectMarketCap: record["入通市值（亿）"],
    connectRise: record["入通涨幅"],
    oneLotExpectedProfit: record["一手预计收益"],
    publicShares: record["公开股数(万股)"],
    publicTotalHands: record["公开总手数"],
    actualMultiple: record["实际认购倍数"],
    allotmentRate: record["中签率"],
    cornerstoneShare: utils.normalizeHkIpoCornerstoneShare(record["基石占比"]),
    sponsor: record["保荐人"] || record["保推人"],
    greenshoe: utils.normalizeHkIpoYesNo(record["绿鞋"]),
    allocationOption: utils.normalizeHkIpoYesNo(record["发行调配权"]),
    mechanism: record["机制"],
    ahType: record["是否AH/UH"],
    discountRate: record["折价率"],
    subscriptionTime: record["申购时间"],
    subscriptionStart: subscription.start,
    subscriptionEnd: subscription.end,
    resultDate,
    greyDate,
    listingDate,
    greyChange: record["暗盘涨幅"],
    firstDayChange: record["首日涨幅"],
    cumulativeChange: record["累计涨跌幅"],
    latestVsOffer: record["最新价/发行价"],
    fundamentals: record["基本面"],
    industry: record["行业"],
    score: utils.hkIpoNum(record["得分（6分以上可以打）"]),
    attitude: text(record["申购态度"]),
    shouldApply: text(record["是否打"]),
    strategy: text(record["策略"]),
    tailFunds: text(record["甲尾乙头资金"]),
    summary: text(record["总结"]),
    raw: record,
  };
  const withKnownFacts = utils.applyKnownHkIpoMarketFacts(normalized);
  withKnownFacts.status = hkIpoStatus(withKnownFacts);
  return withKnownFacts;
}

function hkIpoRebuildDerivedPayload(payload) {
  const rules = payload.rules || [];
  const bigVScoreByCode = new Map((payload.bigVRows || []).map((row) => [row.code, row.score]));
  const rows = (payload.rows || []).map((row) => {
    const components = (row.scoreComponents || []).map((component) => {
      if (component.item === "大V意向" && bigVScoreByCode.has(row.code)) {
        return {
          ...component,
          originalScore: Number(bigVScoreByCode.get(row.code)) || 0,
          score: Number(bigVScoreByCode.get(row.code)) || 0,
        };
      }
      if (component.item !== "认购倍数") return component;
      return {
        ...component,
        originalScore: utils.hkIpoNum(row.actualMultiple),
        score: hkIpoScoreActualMultiple(rules, row.actualMultiple, component.score),
      };
    });
    const totalScore = Number(components.reduce((sum, item) => sum + (Number(item.score) || 0), 0).toFixed(3));
    const threshold = Number(payload.threshold) || HK_IPO_DEFAULT_THRESHOLD;
    const shouldApply = totalScore >= threshold ? "是" : "否";
    const attitude = totalScore >= 8 ? "可以梭哈" : totalScore >= threshold ? "谨慎" : totalScore >= 4 ? "观察" : "不打";
    return { ...row, score: totalScore, shouldApply, attitude, scoreComponents: components };
  });
  const recommendations = [...rows]
    .sort((a, b) => {
      const applyWeight = (value) => value === "是" ? 2 : value === "可小打" ? 1 : 0;
      return applyWeight(b.shouldApply) - applyWeight(a.shouldApply)
        || utils.hkIpoNum(b.score) - utils.hkIpoNum(a.score)
        || utils.hkIpoNum(b.oneLotExpectedProfit) - utils.hkIpoNum(a.oneLotExpectedProfit)
        || utils.hkIpoNum(b.publicTotalHands) - utils.hkIpoNum(a.publicTotalHands);
    })
    .map((row, index) => ({
      rank: index + 1,
      code: row.code,
      companyName: row.companyName,
      status: row.status,
      score: row.score,
      shouldApply: row.shouldApply,
      oneLotExpectedProfit: row.oneLotExpectedProfit,
      publicTotalHands: row.publicTotalHands,
      strategy: row.strategy,
      reason: row.summary,
    }));
  const scoreRows = rows.map((row) => ({
    id: row.id,
    code: row.code,
    companyName: row.companyName,
    score: row.score,
    shouldApply: row.shouldApply,
    attitude: row.attitude,
    components: row.scoreComponents,
  }));
  return { ...payload, rows, recommendations, scoreRows, stats: hkIpoStats(rows) };
}

function buildHkIpoPayload(rulesConfig = {}) {
  const raw = loadHkIpoRawDataset();
  const rules = normalizeHkIpoRules(raw.ruleRows, Array.isArray(rulesConfig.rules) ? rulesConfig.rules : []);
  const threshold = Number(rulesConfig.threshold) || HK_IPO_DEFAULT_THRESHOLD;
  const tableRows = buildHkIpoTableRows(raw.rows);
  const rows = applyHkIpoScenarioTags(tableRows.map((row, index) => {
    const normalized = normalizeHkIpoRow(raw.headers, row, index);
    return {
      ...normalized,
      cornerstoneShare: utils.normalizeHkIpoCornerstoneShare(normalized.cornerstoneShare),
      greenshoe: utils.normalizeHkIpoYesNo(normalized.greenshoe),
      allocationOption: utils.normalizeHkIpoYesNo(normalized.allocationOption),
    };
  }));
  const bigVRows = normalizeHkIpoBigVRows(raw.bigVRows);
  const bigVScoreByCode = new Map(bigVRows.map((row) => [row.code, row.score]));
  const bigVContextByCode = new Map(bigVRows.map((row) => [row.code, `${row.bigVName} ${row.reason} ${row.intention} ${row.note}`]));
  const scoreHeader = raw.scoreHeaders || [];
  const scoreObjects = raw.scoreRows.map((row, index) => ({
    id: `${row[0] || "score"}-${index}`,
    raw: Object.fromEntries(scoreHeader.map((header, i) => [header, utils.hkIpoCell(row[i])])),
  }));
  const scoreByExactKey = new Map(scoreObjects.map((item) => [utils.hkIpoScoreKey(item.raw["代码"], item.raw["发行价"]), item.raw]));
  const scoreByCode = new Map();
  for (const item of scoreObjects) {
    const code = text(item.raw["代码"]).trim();
    if (code && !scoreByCode.has(code)) scoreByCode.set(code, item.raw);
  }
  const recalculatedRows = rows.map((row) => {
    const scoreRaw = scoreByExactKey.get(utils.hkIpoScoreKey(row.code, row.offerPrice)) || scoreByCode.get(row.code) || {};
    const components = [
      "旧股", "保荐人", "明星基石", "IPO前投资者", "行业",
      "估值", "机制", "认购倍数", "基石份额", "大V意向",
    ].map((item) => ({
      item,
      originalScore: item === "大V意向" && bigVScoreByCode.has(row.code) ? bigVScoreByCode.get(row.code) : utils.hkIpoNum(scoreRaw[item]),
      score: utils.hkIpoRuleScore(
        rules,
        item,
        item === "大V意向" && bigVScoreByCode.has(row.code) ? bigVScoreByCode.get(row.code) : utils.hkIpoNum(scoreRaw[item]),
        `${row.summary} ${row.strategy} ${row.fundamentals} ${row.industry} ${bigVContextByCode.get(row.code) || ""}`,
      ),
    }));
    for (const rule of rules.filter((rule) => rule.custom)) {
      const haystack = `${row.companyName} ${row.industry} ${row.strategy} ${row.summary} ${row.fundamentals}`;
      if (rule.condition && haystack.includes(rule.condition)) {
        components.push({ item: rule.item, originalScore: Number(rule.defaultScore) || 0, score: Number(rule.score) || 0 });
      }
    }
    const totalScore = Number(components.reduce((sum, item) => sum + (Number(item.score) || 0), 0).toFixed(3));
    const shouldApply = totalScore >= threshold ? "是" : "否";
    const attitude = totalScore >= 8 ? "可以梭哈" : totalScore >= threshold ? "谨慎" : totalScore >= 4 ? "观察" : "不打";
    return { ...row, score: totalScore, shouldApply, attitude, scoreComponents: components };
  }).sort((a, b) => {
    const dateCompare = utils.hkIpoSubscriptionSortValue(a).localeCompare(utils.hkIpoSubscriptionSortValue(b));
    if (dateCompare) return dateCompare;
    return String(a.code || "").localeCompare(String(b.code || ""));
  });
  const validationRows = raw.validationRows.slice(1).map((row, index) => ({
    id: `validation-${index}`,
    field: text(row[0]),
    issue: text(row[1]),
    level: text(row[2]),
    suggestion: text(row[3]),
  }));
  const sourceValidationRows = HK_IPO_DATA_SOURCES.map((source, index) => ({
    id: `source-${index}`,
    field: source.fields,
    issue: source.name,
    level: source.tier,
    suggestion: `${source.usage}；访问：${source.access}；自动化：${source.autoCheck}`,
    sourceName: source.name,
    sourceTier: source.tier,
    sourceAccess: source.access,
    sourceUrl: source.url,
    sourceFields: source.fields,
    sourceUsage: source.usage,
    sourceAutoCheck: source.autoCheck,
  }));
  const scoreRows = recalculatedRows.map((row) => ({
    id: row.id,
    code: row.code,
    companyName: row.companyName,
    score: row.score,
    shouldApply: row.shouldApply,
    attitude: row.attitude,
    components: row.scoreComponents,
  }));
  const recommendations = [...recalculatedRows]
    .sort((a, b) => {
      const applyWeight = (value) => value === "是" ? 2 : value === "可小打" ? 1 : 0;
      return applyWeight(b.shouldApply) - applyWeight(a.shouldApply)
        || utils.hkIpoNum(b.score) - utils.hkIpoNum(a.score)
        || utils.hkIpoNum(b.oneLotExpectedProfit) - utils.hkIpoNum(a.oneLotExpectedProfit)
        || utils.hkIpoNum(b.publicTotalHands) - utils.hkIpoNum(a.publicTotalHands);
    })
    .map((row, index) => ({
      rank: index + 1,
      code: row.code,
      companyName: row.companyName,
      status: row.status,
      score: row.score,
      shouldApply: row.shouldApply,
      oneLotExpectedProfit: row.oneLotExpectedProfit,
      publicTotalHands: row.publicTotalHands,
      strategy: row.strategy,
      reason: row.summary,
    }));
  return {
    rows: recalculatedRows,
    recommendations,
    bigVRows,
    scoreRows,
    validationRows: [...sourceValidationRows, ...validationRows],
    dataSources: HK_IPO_DATA_SOURCES,
    rules,
    threshold,
    fetchedAt: raw.fetchedAt,
    source: "C:\\Users\\YZ-X-096\\Documents\\港股分析",
  };
}

function filterHkIpoPayload(payload, params = {}) {
  const rows = payload.rows.filter((row) => utils.hkIpoMatchesFilters(row, params));
  const codeSet = new Set(rows.map((row) => row.code));
  return {
    ...payload,
    rows,
    recommendations: payload.recommendations.filter((row) => codeSet.has(row.code)),
    bigVRows: payload.bigVRows.filter((row) => !row.code || codeSet.has(row.code)),
    scoreRows: payload.scoreRows.filter((row) => codeSet.has(row.code)),
    validationRows: payload.validationRows,
    stats: hkIpoStats(rows),
  };
}

async function loadHkIpoRulesConfig(userId) {
  const row = await sqlGet(pool, "SELECT hk_ipo_rules_json FROM user_settings WHERE user_id = ?", [userId]);
  try {
    return row ? maybeParseJson(row.hk_ipo_rules_json) : null;
  } catch {
    return null;
  }
}

async function saveHkIpoRulesConfig(userId, config) {
  await sqlRun(pool, `INSERT INTO user_settings
    (user_id, finance_asset_draft_json, fee_config_json, overview_goals_json, hk_ipo_rules_json)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE hk_ipo_rules_json = VALUES(hk_ipo_rules_json)`,
    [userId, "{}", null, null, config ? JSON.stringify(config) : null]);
}

export {
  hkIpoStatus,
  hkIpoScoreActualMultiple,
  loadHkIpoRawDataset,
  normalizeHkIpoBigVRows,
  enrichHkIpoSponsorsFromTradeGo,
  enrichHkIpoBigVRowsFromNetwork,
  hkIpoStats,
  normalizeHkIpoRules,
  applyHkIpoScenarioTags,
  buildHkIpoTableRows,
  normalizeHkIpoRow,
  hkIpoRebuildDerivedPayload,
  buildHkIpoPayload,
  filterHkIpoPayload,
  loadHkIpoRulesConfig,
  saveHkIpoRulesConfig,
  hkIpoSheetRows,
  hkIpoBigVSheetRows,
  exportHkIpoToExcel,
};
