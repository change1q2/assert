import crypto from "node:crypto";
import fs from "node:fs";
import vm from "node:vm";
import { text } from "../utils/validators.js";
import {
  HK_IPO_SOURCE_FILE,
  HK_IPO_CONNECT_MARKET_CAP,
  HK_IPO_DEFAULT_YEAR,
} from "../config/index.js";

let hkIpoCache = {
  sourceMtimeMs: 0,
  payload: null,
};
let hkIpoBigVNetworkCache = {
  key: "",
  fetchedAt: 0,
  rows: [],
};

function extractConstArrayFromSource(source, name) {
  const marker = `const ${name}`;
  const start = source.indexOf(marker);
  if (start < 0) return [];
  const equals = source.indexOf("=", start);
  const open = source.indexOf("[", equals);
  if (equals < 0 || open < 0) return [];
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let i = open; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "[") depth += 1;
    if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        const literal = source.slice(open, i + 1);
        return vm.runInNewContext(literal, Object.freeze({}));
      }
    }
  }
  return [];
}

function parseHkIpoDate(value, fallbackYear = HK_IPO_DEFAULT_YEAR) {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "TBD" || raw === "-") return "";
  const dateLike = raw.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (dateLike) {
    return `${dateLike[1]}-${String(dateLike[2]).padStart(2, "0")}-${String(dateLike[3]).padStart(2, "0")}`;
  }
  const md = raw.match(/(\d{1,2})[-/](\d{1,2})/);
  if (!md) return "";
  return `${fallbackYear}-${String(md[1]).padStart(2, "0")}-${String(md[2]).padStart(2, "0")}`;
}

function parseHkIpoRange(value) {
  const raw = String(value ?? "").trim();
  const matches = [...raw.matchAll(/(\d{1,2})[-/](\d{1,2})/g)];
  if (!matches.length) return { start: "", end: "" };
  if (matches.length === 1) {
    const date = parseHkIpoDate(matches[0][0]);
    return { start: date, end: date };
  }
  return {
    start: parseHkIpoDate(matches[0][0]),
    end: parseHkIpoDate(matches.at(-1)[0]),
  };
}

function hkIpoLocalDateIso(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function hkIpoSubscriptionDeadline(endDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(endDate || ""))) return null;
  return new Date(`${endDate}T10:30:00+08:00`);
}

function hkIpoNum(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? "").replace(/[,%亿万港元元]/g, "").trim();
  if (!raw || raw === "TBD" || raw === "-") return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeHkIpoCornerstoneShare(value) {
  const raw = text(value).trim();
  if (!raw || raw === "-" || raw === "--" || raw === "TBD" || raw === "未获取") return "未获取";
  if (/无基石|没有基石|无$|^0(?:\.0+)?%?$/.test(raw)) return "无";
  const percent = raw.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percent) return `${percent[1]}%`;
  const numberValue = Number(raw);
  if (Number.isFinite(numberValue) && numberValue > 0) return `${numberValue}%`;
  if (Number.isFinite(numberValue) && numberValue === 0) return "无";
  return raw;
}

function normalizeHkIpoYesNo(value) {
  const raw = text(value).trim();
  if (!raw || raw === "-" || raw === "--" || raw === "TBD" || raw === "未获取") return "未获取";
  if (/无|没有|否|不适用|未设|没有设置/.test(raw)) return "无";
  if (/^\d+(?:\.\d+)?%?$/.test(raw)) return Number(raw.replace("%", "")) > 0 ? "有" : "无";
  if (/有|是|设有|设置|超额配售|绿鞋|发行调配权/.test(raw)) return "有";
  return "未获取";
}

function applyKnownHkIpoMarketFacts(row) {
  const key = `${row.code}|${row.companyName}`;
  const facts = {
    "06915|江西生物": {
      cornerstoneShare: "12.32%",
      greenshoe: "有",
    },
  }[key];
  if (!facts) return row;
  return {
    ...row,
    cornerstoneShare: facts.cornerstoneShare ?? row.cornerstoneShare,
    greenshoe: facts.greenshoe ?? row.greenshoe,
    allocationOption: facts.allocationOption ?? row.allocationOption,
  };
}

function hkIpoCell(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number(value.toFixed(3));
  return String(value);
}

function hkIpoRuleId(row, index) {
  return crypto.createHash("sha1").update(`${row[0] || ""}|${row[1] || ""}|${row[2] || ""}|${index}`).digest("hex").slice(0, 16);
}

function hkIpoRuleScore(rules, item, originalScore, context = "") {
  const candidates = rules.filter((rule) => rule.item === item);
  const lowerContext = String(context).toLowerCase();
  const textual = candidates.find((rule) => {
    const condition = String(rule.condition || "").trim().toLowerCase();
    return condition && lowerContext.includes(condition);
  });
  if (textual) return Number(textual.score) || 0;
  if (!Number(originalScore)) return 0;
  const exact = candidates.find((rule) => Number(rule.defaultScore) === Number(originalScore));
  if (exact) return Number(exact.score) || 0;
  return Number(originalScore) || 0;
}

function hkIpoRuleConditionMatchesNumber(condition, value) {
  const raw = text(condition);
  if (!raw || !Number.isFinite(value)) return false;
  const normalized = raw.replace(/\s/g, "");
  const range = normalized.match(/(\d+(?:\.\d+)?)[-~至到](\d+(?:\.\d+)?)/);
  if (range) return value >= Number(range[1]) && value <= Number(range[2]);
  const numberMatch = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!numberMatch) return false;
  const target = Number(numberMatch[1]);
  if (/大于等于|不低于|不少于|>=|≥/.test(normalized)) return value >= target;
  if (/大于|超过|高于|>/.test(normalized)) return value > target;
  if (/小于等于|不高于|不超过|<=|≤/.test(normalized)) return value <= target;
  if (/小于|低于|少于|</.test(normalized)) return value < target;
  return normalized.includes(String(target)) && value === target;
}

function hkIpoScoreKey(code, offerPrice = "") {
  const normalizedCode = text(code).trim();
  const priceNumber = Number(offerPrice);
  const normalizedPrice = Number.isFinite(priceNumber) ? Number(priceNumber.toFixed(3)) : text(offerPrice).trim();
  return `${normalizedCode}|${normalizedPrice}`;
}

function hkIpoSubscriptionSortValue(row) {
  const candidates = [
    row.subscriptionStart,
    row.subscriptionEnd,
    parseHkIpoDate(row.subscriptionTime),
    row.resultDate,
    row.greyDate,
    row.listingDate,
  ].filter(Boolean);
  return candidates[0] || "9999-12-31";
}

function hkIpoMatchesFilters(row, params) {
  const status = text(params.status || "all");
  if (status !== "all" && row.status !== status) return false;
  const query = text(params.query).trim().toLowerCase();
  if (query) {
    const haystack = `${row.code} ${row.companyName}`.toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  const startDate = text(params.startDate);
  const endDate = text(params.endDate);
  if (startDate || endDate) {
    const dates = [row.subscriptionStart, row.subscriptionEnd, row.resultDate, row.greyDate, row.listingDate].filter(Boolean);
    if (!dates.length) return false;
    const inRange = dates.some((date) => (!startDate || date >= startDate) && (!endDate || date <= endDate));
    if (!inRange) return false;
  }
  return true;
}

function hkIpoBigVOpinion(sampleCount, positiveCount) {
  if (!sampleCount) return "未获取";
  const ratio = positiveCount / sampleCount;
  if (ratio >= 0.8) return "梭哈";
  if (ratio >= 0.5) return "小仓位参与";
  return "放弃";
}

function hkIpoBigVScore(sampleCount, positiveCount) {
  if (!sampleCount || !positiveCount) return 0;
  const ratio = Math.max(0, Math.min(1, positiveCount / sampleCount));
  if (ratio >= 1) return 4;
  const quantityWeight = 0.75 + Math.min(sampleCount, 4) * 0.0625;
  return Number(Math.min(3.999, ratio * 4 * quantityWeight).toFixed(3));
}

function hkIpoExtractBigVNames(note) {
  const content = text(note);
  const names = [];
  const knownNames = ["小散老俞", "101可转债", "老虎社区", "Moomoo", "富途牛牛", "雪球"];
  for (const name of knownNames) {
    if (content.includes(name) && !names.includes(name)) names.push(name);
  }
  return names.length ? names.join("、") : "未获取";
}

function hkIpoCountSignals(content = "") {
  const lower = String(content).toLowerCase();
  const positiveWords = ["梭哈", "必打", "申购", "认购", "参与", "会抽", "抽一手", "打新", "正面", "关注"];
  const cautiousWords = ["小仓", "小仓位", "谨慎", "轻仓", "观察"];
  const negativeWords = ["放弃", "不打", "避开", "破发", "不建议", "风险高"];
  const count = (words) => words.reduce((sum, word) => sum + (lower.includes(word.toLowerCase()) ? 1 : 0), 0);
  return {
    positive: count(positiveWords),
    cautious: count(cautiousWords),
    negative: count(negativeWords),
  };
}

async function hkIpoFetchText(url, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 WealthOS/2.0",
        "Accept": "text/plain,application/json,text/html;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return "";
    return await response.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

async function hkIpoSearchPublicSource(companyName, code, source) {
  const keyword = `${companyName} ${code} 港股打新 申购 梭哈 小仓位 放弃 大V`;
  if (source.kind === "bilibili") {
    const url = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(keyword)}`;
    const textBody = await hkIpoFetchText(url);
    const signals = hkIpoCountSignals(textBody);
    return { ...source, ok: Boolean(textBody), signals, excerpt: textBody.slice(0, 260) };
  }
  const query = source.site
    ? `site:${source.site} ${keyword}`
    : keyword;
  const url = `https://r.jina.ai/http://www.bing.com/search?q=${encodeURIComponent(query)}`;
  const textBody = await hkIpoFetchText(url);
  const signals = hkIpoCountSignals(textBody);
  return { ...source, ok: Boolean(textBody), signals, excerpt: textBody.slice(0, 260) };
}

function hkIpoExtractSponsorFromText(content = "") {
  const normalized = String(content || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/保推人/g, "保荐人");
  const patterns = [
    /保荐人[:：\s]*([^\n；;，,。|]{2,80})/i,
    /保荐机构[:：\s]*([^\n；;，,。|]{2,80})/i,
    /Sponsor[:：\s]*([^\n；;，,。|]{2,80})/i,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      return match[1].replace(/[\[\]【】()（）]/g, "").trim();
    }
  }
  return "";
}

function hkIpoExtractTradeGoBasicsFromText(content = "") {
  const normalized = String(content || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/保推人/g, "保荐人");
  const cornerstoneMatch = normalized.match(/(?:认购总占比|基石占比|基石投资者[^%\n]{0,40})(\d+(?:\.\d+)?)\s*%/i);
  const greenshoeArea = normalized.match(/绿鞋[^。\n；;]{0,40}/i)?.[0] || "";
  const allocationArea = normalized.match(/(?:发行调配权|发售量调整权|调配权)[^。\n；;]{0,50}/i)?.[0] || "";
  const multipleMatch = normalized.match(/(?:认购倍数|超购倍数|实际认购倍数|孖展倍数)[^\d\n]{0,12}(\d+(?:\.\d+)?)/i);
  return {
    sponsor: hkIpoExtractSponsorFromText(normalized),
    cornerstoneShare: cornerstoneMatch ? normalizeHkIpoCornerstoneShare(`${cornerstoneMatch[1]}%`) : "",
    greenshoe: greenshoeArea ? normalizeHkIpoYesNo(greenshoeArea) : "",
    allocationOption: allocationArea ? normalizeHkIpoYesNo(allocationArea) : "",
    actualMultiple: multipleMatch ? Number(multipleMatch[1]) : null,
  };
}

function hkIpoSourceSearchTerms() {
  return [
    "HKEXnews 披露易 招股书 聆讯后资料集",
    "经济通 ETNet IPO 基石投资者 超购倍数",
    "AASTOCKS 新股 保荐人 首日涨幅",
    "智通财经 新股 招股 暗盘 上市",
    "捷利交易宝 新股IPO简况 保荐人 基石 绿鞋 发行调配权",
    "AiPO 孖展 资金分布 券商息率",
  ].join(" ");
}

function hkIpoStatus(row, now = new Date()) {
  const todayIso = hkIpoLocalDateIso(now);
  const subscriptionStart = row.subscriptionStart || "";
  const subscriptionEnd = row.subscriptionEnd || "";
  const subscriptionDeadline = hkIpoSubscriptionDeadline(subscriptionEnd);
  const greyDate = row.greyDate || "";
  const listingDate = row.listingDate || "";
  const hasListedData = ["firstDayChange", "cumulativeChange", "latestVsOffer"].some((key) => {
    const value = String(row[key] ?? "").trim();
    return value && value !== "TBD" && value !== "-";
  });
  if ((listingDate && todayIso >= listingDate) || hasListedData) return "已上市";
  if (greyDate && todayIso === greyDate) return "暗盘";
  if (subscriptionStart && subscriptionEnd && todayIso >= subscriptionStart && subscriptionDeadline && now < subscriptionDeadline) return "招股中";
  return "待上市";
}

function hkIpoScoreActualMultiple(rules, actualMultiple, fallbackScore = 0) {
  const value = hkIpoNum(actualMultiple);
  const candidates = (rules || []).filter((rule) => rule.item === "认购倍数");
  const matched = candidates.find((rule) => hkIpoRuleConditionMatchesNumber(rule.condition, value));
  if (matched) return Number(matched.score) || 0;
  if (!value) return Number(fallbackScore) || 0;
  if (value >= 100) return 2;
  if (value >= 50) return 1;
  if (value >= 15) return 0;
  return -1;
}

export {
  hkIpoCache,
  hkIpoBigVNetworkCache,
  extractConstArrayFromSource,
  parseHkIpoDate,
  parseHkIpoRange,
  hkIpoLocalDateIso,
  hkIpoSubscriptionDeadline,
  hkIpoNum,
  normalizeHkIpoCornerstoneShare,
  normalizeHkIpoYesNo,
  applyKnownHkIpoMarketFacts,
  hkIpoCell,
  hkIpoRuleId,
  hkIpoRuleScore,
  hkIpoRuleConditionMatchesNumber,
  hkIpoScoreKey,
  hkIpoSubscriptionSortValue,
  hkIpoMatchesFilters,
  hkIpoBigVOpinion,
  hkIpoBigVScore,
  hkIpoExtractBigVNames,
  hkIpoCountSignals,
  hkIpoFetchText,
  hkIpoSearchPublicSource,
  hkIpoExtractSponsorFromText,
  hkIpoExtractTradeGoBasicsFromText,
  hkIpoSourceSearchTerms,
  hkIpoStatus,
  hkIpoScoreActualMultiple,
};
