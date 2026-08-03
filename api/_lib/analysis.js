/**
 * Analysis and scoring logic — ported from python-server/app.py.
 *
 * Public API:
 *   generateAnalysis(market, symbol, data)              -> markdown string
 *   calculateScores(market, symbol, data)               -> scores object
 *   generateDeepReport(market, symbol, data, scores,
 *                      analysis, strategyRecommendations) -> markdown string
 *
 * `data` is the unified stock-data object produced by stock-data.js.
 */

// --- helpers ----------------------------------------------------------------
function safeFloat(val, def = 0) {
  if (val === null || val === undefined || val === '' || val === '-') return def;
  const n = Number(val);
  return Number.isFinite(n) ? n : def;
}

function safeStr(val, def = 'N/A') {
  if (val === null || val === undefined || val === '' || val === '-') return def;
  return String(val);
}

function isNumLike(v) {
  if (v === null || v === undefined || v === '' || v === '-') return false;
  return Number.isFinite(Number(v));
}

function fmtMoney(v) {
  try {
    const n = Number(v);
    if (!Number.isFinite(n)) return 'N/A';
    if (n >= 1e8) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e4) return `$${(n / 1e4).toFixed(2)}万`;
    return `$${n.toFixed(2)}`;
  } catch (_) {
    return 'N/A';
  }
}

function fmtVolume(v) {
  try {
    const n = Number(v);
    if (!Number.isFinite(n)) return 'N/A';
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
    return `${n.toFixed(0)}`;
  } catch (_) {
    return 'N/A';
  }
}

function nowTimestamp() {
  const d = new Date();
  const beijing = new Date(d.getTime() + (d.getTimezoneOffset() + 8 * 60) * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    beijing.getUTCFullYear() +
    '-' +
    pad(beijing.getUTCMonth() + 1) +
    '-' +
    pad(beijing.getUTCDate()) +
    ' ' +
    pad(beijing.getUTCHours()) +
    ':' +
    pad(beijing.getUTCMinutes()) +
    ':' +
    pad(beijing.getUTCSeconds())
  );
}

function nowIso() {
  return new Date().toISOString();
}

// --- generateAnalysis -------------------------------------------------------
export function generateAnalysis(market, symbol, data) {
  // `data` matches the unified stock-data shape. The original Python code
  // expects data.quotes[0]; we accept either { quotes:[...] } or a flat quote.
  const q = Array.isArray(data?.quotes) && data.quotes.length > 0
    ? data.quotes[0]
    : data;
  if (!q) return '## 错误\n\n未获取到实时行情数据';

  const price = safeFloat(q.price, 0);
  const chgPct = safeFloat(q.chg_pct, 0);
  const peRaw = safeStr(q.pe, 'N/A');
  let pe = peRaw;
  if (isNumLike(peRaw)) {
    pe = Number(peRaw).toFixed(2);
  }
  const marketCap = q.market_cap ?? '-';
  const volume = q.volume ?? '-';

  const high52wRaw = safeStr(q.high_52w, 'N/A');
  const low52wRaw = safeStr(q.low_52w, 'N/A');
  let high52w = high52wRaw;
  if (isNumLike(high52wRaw)) high52w = Number(high52wRaw).toFixed(2);
  let low52w = low52wRaw;
  if (isNumLike(low52wRaw)) low52w = Number(low52wRaw).toFixed(2);

  const openP = safeFloat(q.open, 0);
  const highP = safeFloat(q.high, 0);
  const lowP = safeFloat(q.low, 0);
  const chgAmt = safeFloat(q.chg_amt, 0);

  // Drawdown from 52w high
  let drawdownText = 'N/A';
  if (isNumLike(high52w) && Number(high52w) > 0) {
    const drawdown = ((price / Number(high52w)) - 1) * 100;
    drawdownText = `${drawdown.toFixed(1)}%`;
  }

  // Upside from 52w low
  let upsideText = 'N/A';
  if (isNumLike(low52w) && Number(low52w) > 0) {
    const upside = ((price / Number(low52w)) - 1) * 100;
    upsideText = `${upside.toFixed(1)}%`;
  }

  // Formatted market cap
  let mcText;
  if (isNumLike(marketCap)) {
    mcText = fmtMoney(Number(marketCap));
  } else {
    mcText = marketCap && marketCap !== '' ? String(marketCap) : 'N/A';
  }

  // Formatted volume
  let volText;
  if (isNumLike(volume)) {
    volText = fmtVolume(Number(volume));
  } else {
    volText = volume && volume !== '' ? String(volume) : 'N/A';
  }

  const timestamp = safeStr(q.datetime, nowTimestamp());
  const name = safeStr(q.name, String(symbol).toUpperCase());
  const openText = openP ? `$${openP.toFixed(2)}` : 'N/A';
  const highText = highP ? `$${highP.toFixed(2)}` : 'N/A';
  const lowText = lowP ? `$${lowP.toFixed(2)}` : 'N/A';
  const chgAmtText = chgAmt ? `${chgAmt >= 0 ? '+' : ''}${chgAmt.toFixed(2)}` : 'N/A';

  // PE evaluation for Buffett block
  let peJudge;
  if (pe !== 'N/A' && pe !== '-' && isNumLike(pe)) {
    peJudge = Number(pe) < 20 ? '偏低估值，需看利润质量' : '偏高估值，需警惕';
  } else {
    peJudge = '暂无数据';
  }

  // Drawdown evaluation for Buffett block
  let drawdownJudge;
  if (drawdownText !== 'N/A') {
    const dd = Number(drawdownText.replace('%', ''));
    drawdownJudge = dd < -30 ? '已大幅回调，可能有吸引力' : '回调不充分';
  } else {
    drawdownJudge = '暂无数据';
  }

  // Market cap evaluation for Buffett block
  let mcJudge;
  if (mcText !== 'N/A' && mcText !== '-' && mcText.includes('B')) {
    const v = Number(mcText.replace('$', '').replace('B', ''));
    mcJudge = v > 100 ? '大盘股，抗风险能力强' : '中小盘股，波动较大';
  } else {
    mcJudge = '暂无数据';
  }

  // Risk checklist for Li Lu block
  let expectationStatus;
  if (chgPct > 5) expectationStatus = '需检查市场预期是否过高';
  else if (Math.abs(chgPct) < 3) expectationStatus = '情绪相对中性';
  else expectationStatus = '可能有恐慌性抛售';

  let cycleStatus;
  if (chgPct > 3 && drawdownText !== 'N/A' && Number(drawdownText.replace('%', '')) > -20) {
    cycleStatus = '处于高位，需警惕';
  } else {
    cycleStatus = '相对合理';
  }

  const analysis = `## 📊 ${name} (${String(symbol).toUpperCase()}) 投资分析报告

> **分析时间**：${nowTimestamp()}
> **数据来源**：AkShare 新浪实时行情
> **数据时间戳**：${timestamp}

---

### 一、实时行情快照

| 指标 | 数值 |
|------|------|
| **最新价** | $${price.toFixed(2)} |
| **涨跌幅** | ${chgPct >= 0 ? '+' : ''}${chgPct.toFixed(2)}% |
| **涨跌额** | ${chgAmtText} |
| **今开** | ${openText} |
| **最高** | ${highText} |
| **最低** | ${lowText} |
| **52周高/低** | ${high52w} / ${low52w} |
| **距52周高点** | ${drawdownText} |
| **距52周低点** | ${upsideText} |
| **成交量** | ${volText} |
| **市值** | ${mcText} |
| **PE** | ${pe} |

---

### 二、段永平视角：生意本质

**能不能看懂？**

这门生意的核心模式需要判断：
- 是否有**定价权**？产品是否有差异化？
- 是**好生意**还是**烂生意**？
- 能否估算未来10年的自由现金流？

**关键问题**：这家公司的竞争优势是什么？是品牌、技术、网络效应、还是成本优势？

---

### 三、巴菲特视角：财务质量

**赚的是真钱还是假钱？**

| 财务质量指标 | 判断方向 |
|-------------|---------|
| PE ${pe} | ${peJudge} |
| 距52周高点 ${drawdownText} | ${drawdownJudge} |
| 市值 ${mcText} | ${mcJudge} |

**巴菲特的判断**：核心看利润质量——利润是来自客户付费的真钱，还是来自会计调整的假钱？

---

### 四、芒格视角：竞争格局

**反过来想**：

1. 这个行业的竞争格局是改善还是恶化？
2. 未来5-10年，这家公司的竞争地位会变强还是变弱？
3. 有没有潜在的disruptor（新技术、新玩家）？

**关键判断**：竞争护城河的宽度和深度是什么？品牌？技术壁垒？客户锁定？成本优势？

---

### 五、李录视角：风险管理

**风险检查清单**：

| 风险类型 | 当前状态 |
|---------|---------|
| 预期是否已透支？ | ${expectationStatus} |
| 是不是周期顶部？ | ${cycleStatus} |
| 管理层是否可信？ | 需进一步调研 |
| 行业是否有结构性威胁？ | 需分析行业趋势 |

**李录的建议**：最好的买入时机是所有人都不看好的时候。

---

### 六、综合判断

**核心原则**：价格是你付出的，价值是你得到的。

当前价位是否值得买入，取决于：
1. 这家公司的**生意模式**是否好？
2. 财务质量是否**经得起审计**？
3. 竞争格局是否**可持续**？
4. 当前价格是否**足够便宜**？

> ⚠️ 本报告基于实时行情数据自动生成，仅供参考，不构成投资建议。
> 完整分析需要结合公司财报、行业研报、管理层访谈等多维度信息。
`;

  return analysis;
}

// --- calculateScores -------------------------------------------------------
export function calculateScores(market, symbol, q) {
  const price = safeFloat(q?.price, 0);
  const chgPct = safeFloat(q?.chg_pct, 0);
  const peRaw = q?.pe ?? '-';
  let pe = null;
  if (isNumLike(peRaw)) pe = Number(peRaw);

  const marketCapRaw = q?.market_cap ?? '-';
  const volumeRaw = q?.volume ?? '-';
  const turnoverRaw = q?.turnover ?? '-';

  let high52w = 0;
  if (isNumLike(q?.high_52w)) high52w = Number(q.high_52w);
  let low52w = 0;
  if (isNumLike(q?.low_52w)) low52w = Number(q.low_52w);

  let drawdownFromHigh = null;
  if (high52w > 0) drawdownFromHigh = ((price / high52w) - 1) * 100;

  let upsideFromLow = null;
  if (low52w > 0) upsideFromLow = ((price / low52w) - 1) * 100;

  let marketCapVal = null;
  if (isNumLike(marketCapRaw)) marketCapVal = Number(marketCapRaw);
  let volumeVal = null;
  if (isNumLike(volumeRaw)) volumeVal = Number(volumeRaw);
  let turnoverVal = null;
  if (isNumLike(turnoverRaw)) turnoverVal = Number(turnoverRaw);

  const hasPeData = pe !== null;
  const hasMcData = marketCapVal !== null;
  const has52wData = drawdownFromHigh !== null;

  const dataQuality =
    hasPeData && hasMcData ? '完整' : hasPeData || hasMcData ? '部分' : '有限';

  // 1. 生意模式评分 (30分) - 段永平视角
  let businessScore = 0;
  const businessDetails = {};

  // 差异化程度 (10分)
  let diffScore = 5;
  if (marketCapVal !== null) {
    if (marketCapVal > 5e11) diffScore = 9;
    else if (marketCapVal > 1e11) diffScore = 8;
    else if (marketCapVal > 5e10) diffScore = 7;
    else if (marketCapVal > 1e10) diffScore = 5;
    else if (marketCapVal > 1e9) diffScore = 4;
    else diffScore = 3;
  }
  if (pe !== null && pe > 30) diffScore = Math.min(10, diffScore + 2);
  else if (pe !== null && pe > 15) diffScore = Math.min(10, diffScore + 1);
  businessDetails['差异化程度'] = {
    score: diffScore,
    max: 10,
    reason: `市值和PE${hasMcData && hasPeData ? '数据充足' : '数据有限，给予中性评分'}`,
  };
  businessScore += diffScore;

  // 定价权 (10分)
  let pricingScore = 5;
  if (pe !== null) {
    if (pe > 40) pricingScore = 9;
    else if (pe > 25) pricingScore = 7;
    else if (pe > 15) pricingScore = 5;
    else if (pe > 0) pricingScore = 3;
  } else {
    if (chgPct > 3) pricingScore = 6;
    else if (chgPct > 0) pricingScore = 5;
    else if (chgPct < -3) pricingScore = 3;
  }
  businessDetails['定价权'] = {
    score: pricingScore,
    max: 10,
    reason: `基于${hasPeData ? 'PE' : '股价表现'}推断`,
  };
  businessScore += pricingScore;

  // 护城河宽度 (10分)
  let moatScore = 5;
  if (marketCapVal !== null) {
    if (marketCapVal > 5e11) moatScore = 9;
    else if (marketCapVal > 1e11) moatScore = 7;
    else if (marketCapVal > 5e10) moatScore = 6;
    else if (marketCapVal > 1e10) moatScore = 5;
    else if (marketCapVal > 1e9) moatScore = 4;
    else moatScore = 3;
  }
  if (drawdownFromHigh !== null && drawdownFromHigh > -20) {
    moatScore = Math.min(10, moatScore + 1);
  } else if (drawdownFromHigh !== null && drawdownFromHigh < -40) {
    moatScore = Math.max(0, moatScore - 2);
  }
  businessDetails['护城河宽度'] = {
    score: moatScore,
    max: 10,
    reason: `${hasMcData ? '市值和股价稳定性' : '市值'}推断`,
  };
  businessScore += moatScore;

  // 2. 财务质量评分 (25分) - 巴菲特视角
  let financialScore = 0;
  const financialDetails = {};

  // ROE (5分)
  let roeScore = 3;
  if (pe !== null && pe > 0) {
    if (pe < 15) roeScore = 5;
    else if (pe < 25) roeScore = 4;
    else if (pe < 40) roeScore = 3;
    else if (pe < 60) roeScore = 2;
    else roeScore = 1;
  } else if (chgPct > 2 && pe === null) {
    roeScore = 4;
  }
  financialDetails['ROE水平'] = {
    score: roeScore,
    max: 5,
    reason: `基于${hasPeData ? 'PE' : '股价表现'}推断`,
  };
  financialScore += roeScore;

  // 现金流质量 (5分)
  let cashflowScore = 3;
  if (chgPct > 2) cashflowScore = 4;
  else if (chgPct < -5) cashflowScore = 2;
  if (turnoverVal !== null && turnoverVal > 1e9) {
    cashflowScore = Math.min(5, cashflowScore + 1);
  }
  financialDetails['现金流质量'] = {
    score: cashflowScore,
    max: 5,
    reason: '基于股价表现和成交额推断',
  };
  financialScore += cashflowScore;

  // 毛利率稳定性 (5分)
  let grossMarginScore = 3;
  if (marketCapVal !== null && marketCapVal > 1e11) grossMarginScore = 4;
  else if (chgPct > 0) grossMarginScore = 3;
  financialDetails['毛利率稳定性'] = {
    score: grossMarginScore,
    max: 5,
    reason: '基于市值和股价稳定性推断',
  };
  financialScore += grossMarginScore;

  // 负债水平 (5分)
  const debtScore = 3;
  financialDetails['负债水平'] = {
    score: debtScore,
    max: 5,
    reason: '暂无数据，给予中性评分',
  };
  financialScore += debtScore;

  // 自由现金流 (5分)
  let fcfScore = 3;
  if (chgPct > 1) fcfScore = 4;
  else if (chgPct < -3) fcfScore = 2;
  financialDetails['自由现金流'] = {
    score: fcfScore,
    max: 5,
    reason: '基于股价表现推断',
  };
  financialScore += fcfScore;

  // 3. 竞争格局评分 (25分) - 芒格视角
  let competitionScore = 0;
  const competitionDetails = {};

  // 行业地位 (8分)
  let positionScore = 4;
  if (marketCapVal !== null) {
    if (marketCapVal > 1e12) positionScore = 8;
    else if (marketCapVal > 5e11) positionScore = 7;
    else if (marketCapVal > 1e11) positionScore = 6;
    else if (marketCapVal > 5e10) positionScore = 5;
    else if (marketCapVal > 1e10) positionScore = 4;
    else if (marketCapVal > 1e9) positionScore = 3;
    else positionScore = 2;
  } else if (volumeVal !== null && volumeVal > 1e7) {
    positionScore = 5;
  }
  competitionDetails['行业地位'] = {
    score: positionScore,
    max: 8,
    reason: `基于${hasMcData ? '市值' : '成交量'}推断`,
  };
  competitionScore += positionScore;

  // 技术颠覆风险 (8分)
  let disruptionScore = 5;
  if (drawdownFromHigh !== null) {
    if (drawdownFromHigh < -50) disruptionScore = 2;
    else if (drawdownFromHigh < -30) disruptionScore = 4;
    else if (drawdownFromHigh < -10) disruptionScore = 6;
    else disruptionScore = 7;
  }
  if (chgPct > 5) disruptionScore = Math.min(8, disruptionScore + 1);
  competitionDetails['技术颠覆风险低'] = {
    score: disruptionScore,
    max: 8,
    reason: `基于${has52wData ? '股价回撤' : '近期表现'}推断`,
  };
  competitionScore += disruptionScore;

  // 新玩家威胁 (9分)
  let threatScore = 4;
  if (marketCapVal !== null) {
    if (marketCapVal > 1e12) threatScore = 9;
    else if (marketCapVal > 5e11) threatScore = 8;
    else if (marketCapVal > 1e11) threatScore = 7;
    else if (marketCapVal > 5e10) threatScore = 6;
    else if (marketCapVal > 1e10) threatScore = 5;
    else if (marketCapVal > 1e9) threatScore = 3;
    else threatScore = 2;
  }
  competitionDetails['新玩家进入威胁低'] = {
    score: threatScore,
    max: 9,
    reason: `基于${hasMcData ? '市值' : '行业常识'}推断`,
  };
  competitionScore += threatScore;

  // 4. 风险管理评分 (20分) - 李录视角
  let riskScore = 0;
  const riskDetails = {};

  // 安全边际 (8分)
  let marginScore = 3;
  if (drawdownFromHigh !== null) {
    if (drawdownFromHigh < -50) marginScore = 8;
    else if (drawdownFromHigh < -30) marginScore = 6;
    else if (drawdownFromHigh < -10) marginScore = 4;
    else marginScore = 2;
  } else if (pe !== null && pe > 0) {
    if (pe < 15) marginScore = 6;
    else if (pe < 25) marginScore = 4;
    else if (pe < 40) marginScore = 3;
    else marginScore = 2;
  } else {
    if (chgPct < -3) marginScore = 5;
    else if (chgPct > 5) marginScore = 2;
  }
  riskDetails['安全边际'] = {
    score: marginScore,
    max: 8,
    reason: `基于${has52wData || hasPeData ? '回撤幅度或PE' : '近期涨跌'}推断`,
  };
  riskScore += marginScore;

  // 周期位置 (6分)
  let cycleScore = 3;
  if (chgPct < -5) cycleScore = 5;
  else if (chgPct < -2) cycleScore = 4;
  else if (chgPct > 3) cycleScore = 1;
  else if (chgPct > 0) cycleScore = 3;
  riskDetails['周期位置'] = {
    score: cycleScore,
    max: 6,
    reason: '基于近期涨跌幅推断',
  };
  riskScore += cycleScore;

  // 下行风险 (6分)
  let downsideScore = 3;
  if (drawdownFromHigh !== null && drawdownFromHigh < -30) downsideScore = 5;
  else if (chgPct > 5) downsideScore = 2;
  else if (chgPct < -3) downsideScore = 4;
  riskDetails['下行风险可控'] = {
    score: downsideScore,
    max: 6,
    reason: `基于${has52wData ? '回撤幅度' : '近期表现'}推断`,
  };
  riskScore += downsideScore;

  // 总分
  const totalScore = businessScore + financialScore + competitionScore + riskScore;

  // 评级
  let grade;
  let recommendation;
  if (totalScore >= 85) {
    grade = 'A+';
    recommendation = '极度优秀，可重仓';
  } else if (totalScore >= 70) {
    grade = 'A';
    recommendation = '优秀，可配置';
  } else if (totalScore >= 55) {
    grade = 'B';
    recommendation = '一般，小仓位或观望';
  } else if (totalScore >= 40) {
    grade = 'C';
    recommendation = '较差，不建议';
  } else {
    grade = 'D';
    recommendation = '极差，远离';
  }

  return {
    total_score: totalScore,
    max_score: 100,
    grade,
    recommendation,
    data_quality: dataQuality,
    dimensions: {
      business: { score: businessScore, max: 30, weight: '30%', details: businessDetails },
      financial: { score: financialScore, max: 25, weight: '25%', details: financialDetails },
      competition: { score: competitionScore, max: 25, weight: '25%', details: competitionDetails },
      risk: { score: riskScore, max: 20, weight: '20%', details: riskDetails },
    },
  };
}

// --- generateDeepReport ----------------------------------------------------
function stars(score, max) {
  const pct = score / max;
  if (pct >= 0.83) return '★★★★★';
  if (pct >= 0.6) return '★★★★';
  if (pct >= 0.4) return '★★★';
  return '★★';
}

function detailsToList(details) {
  let out = '';
  for (const [k, v] of Object.entries(details)) {
    out += `- **${k}**: ${v.score}/${v.max} — ${v.reason}\n`;
  }
  return out;
}

export function generateDeepReport(market, symbol, data, scores, analysis, strategyRecommendations) {
  const symUpper = String(symbol).toUpperCase();
  const name = data?.name ?? symUpper;
  const priceVal = safeFloat(data?.price, 0);
  const high52wVal = data?.high_52w ?? '-';
  const low52wVal = data?.low_52w ?? '-';

  let h52 = null;
  let l52 = null;
  let priceRange = null;
  if (isNumLike(high52wVal)) h52 = Number(high52wVal);
  if (isNumLike(low52wVal)) l52 = Number(low52wVal);
  if (h52 !== null && l52 !== null) priceRange = h52 - l52;

  const dims = scores.dimensions;

  let report = `# 📚 ${name} (${symUpper}) 深度研究报告

> **报告类型**：价值投资深度研究
> **分析框架**：四大师视角评分体系
> **生成时间**：${nowTimestamp()}
> **数据来源**：AkShare 新浪实时行情

---

## 一、总体评分：${scores.grade} (${scores.total_score}/100)

**投资建议**：${scores.recommendation}

### 评分雷达图

| 维度 | 得分 | 满分 | 权重 | 评级 |
|------|------|------|------|------|
| 🏢 生意模式 | ${dims.business.score} | 30 | 30% | ${stars(dims.business.score, 30)} |
| 💰 财务质量 | ${dims.financial.score} | 25 | 25% | ${stars(dims.financial.score, 25)} |
| ⚔️ 竞争格局 | ${dims.competition.score} | 25 | 25% | ${stars(dims.competition.score, 25)} |
| 🛡️ 风险管理 | ${dims.risk.score} | 20 | 20% | ${stars(dims.risk.score, 20)} |
| **总分** | **${scores.total_score}** | **100** | **100%** | **${scores.grade}** |

---

## 二、实时行情数据

| 指标 | 数值 |
|------|------|
| 最新价 | $${safeFloat(data?.price, 0).toFixed(2)} |
| 涨跌幅 | ${safeFloat(data?.chg_pct, 0) >= 0 ? '+' : ''}${safeFloat(data?.chg_pct, 0).toFixed(2)}% |
| 52周高/低 | ${safeStr(data?.high_52w, 'N/A')} / ${safeStr(data?.low_52w, 'N/A')} |
| PE | ${safeStr(data?.pe, 'N/A')} |
| 市值 | ${safeStr(data?.market_cap, 'N/A')} |
| 成交量 | ${safeStr(data?.volume, 'N/A')} |

---

## 三、分维度详细评估

### 3.1 生意模式（段永平视角）：${dims.business.score}/30

${detailsToList(dims.business.details)}
### 3.2 财务质量（巴菲特视角）：${dims.financial.score}/25

${detailsToList(dims.financial.details)}
### 3.3 竞争格局（芒格视角）：${dims.competition.score}/25

${detailsToList(dims.competition.details)}
### 3.4 风险管理（李录视角）：${dims.risk.score}/20

${detailsToList(dims.risk.details)}
---

## 四、原始分析报告

${analysis}

---

## 五、大师视角总结

**段永平**（生意模式）：得分 ${dims.business.score}/30
- ${dims.business.score >= 20 ? '生意模式优秀，值得深入研究' : dims.business.score >= 12 ? '生意模式一般，需谨慎' : '生意模式较差，不建议投资'}

**巴菲特**（财务质量）：得分 ${dims.financial.score}/25
- ${dims.financial.score >= 18 ? '财务质量良好，数据可信' : dims.financial.score >= 10 ? '财务质量一般，需进一步审计' : '财务质量存疑，需警惕'}

**芒格**（竞争格局）：得分 ${dims.competition.score}/25
- ${dims.competition.score >= 18 ? '竞争地位稳固，护城河宽阔' : dims.competition.score >= 10 ? '竞争地位尚可，需关注变化' : '竞争地位堪忧，风险较高'}

**李录**（风险管理）：得分 ${dims.risk.score}/20
- ${dims.risk.score >= 14 ? '安全边际充足，下行风险可控' : dims.risk.score >= 8 ? '安全边际一般，需控制仓位' : '安全边际不足，风险较高'}

---

## 六、最终建议

**综合评级**：${scores.grade} — ${scores.recommendation}

**操作建议**：
`;

  if (scores.total_score >= 85) {
    report += '- ✅ 可以作为核心持仓配置\n- ✅ 建议仓位：15%-20%\n- ✅ 可分批建仓\n';
  } else if (scores.total_score >= 70) {
    report += '- ✅ 可以纳入观察池\n- ⚠️ 建议仓位：5%-10%\n- ⚠️ 等回调时建仓\n';
  } else if (scores.total_score >= 55) {
    report += '- ⚠️ 暂时观望\n- ⚠️ 建议仓位：<5%\n- ❌ 等待更好的价格或基本面改善\n';
  } else {
    report += '- ❌ 不建议投资\n- ❌ 建议回避\n- ❌ 等待基本面改善\n';
  }

  report += `
---

## 七、策略提升建议

> 💡 以下建议基于您的评分结果，结合价值投资完整策略框架给出：

**🏢 生意模式（段永平）**：${strategyRecommendations?.business ?? '无'}

**💰 财务质量（巴菲特）**：${strategyRecommendations?.financial ?? '无'}

**⚔️ 竞争格局（芒格）**：${strategyRecommendations?.competition ?? '无'}

**🛡️ 风险管理（李录）**：${strategyRecommendations?.risk ?? '无'}

---

## 八、建仓策略

> 📌 基于当前评分与价格位置，给出分批建仓的具体方案

`;

  if (scores.total_score >= 85) {
    report += '**评级：核心持仓型（A+/A）**\n\n';
    report += '| 批次 | 买入条件 | 建议仓位 | 说明 |\n';
    report += '|------|---------|---------|------|\n';
    report += '| 第一批 | 现价直接建仓 | 5%-8% | 评分优秀，安全边际充足，先建立底仓 |\n';
    if (priceRange !== null && priceVal > l52 + priceRange * 0.3) {
      report += `| 第二批 | 回调至 $${(l52 + priceRange * 0.3).toFixed(2)} 附近（30%分位） | 5%-7% | 逢低加仓，摊薄成本 |\n`;
    } else {
      report += '| 第二批 | 回调5%-8%时 | 5%-7% | 逢低加仓，摊薄成本 |\n';
    }
    report += '| 第三批 | 重大市场恐慌/黑天鹅事件 | 3%-5% | 极端情绪下满仓，需预留现金 |\n';
    report += '\n**总仓位建议**：15%-20%\n';
    report += '**持有周期**：3-5年以上\n';
  } else if (scores.total_score >= 70) {
    report += '**评级：观察配置型（B+）**\n\n';
    report += '| 批次 | 买入条件 | 建议仓位 | 说明 |\n';
    report += '|------|---------|---------|------|\n';
    if (priceRange !== null && priceVal > l52 + priceRange * 0.5) {
      report += '| 第一批 | 等待回调至中位价以下 | 3%-5% | 当前价格偏中等，不追高 |\n';
      report += `| 第二批 | 回调至 $${(l52 + priceRange * 0.3).toFixed(2)} 附近（30%分位） | 3%-5% | 更好的安全边际时加仓 |\n`;
    } else {
      report += '| 第一批 | 现价轻仓试探 | 3%-5% | 价格处于相对低位，可先试探 |\n';
      report += '| 第二批 | 回调10%或基本面确认改善 | 3%-5% | 确认趋势后加仓 |\n';
    }
    report += '\n**总仓位建议**：5%-10%\n';
    report += '**持有周期**：2-3年\n';
  } else if (scores.total_score >= 55) {
    report += '**评级：观望试探型（B/C）**\n\n';
    report += '| 批次 | 买入条件 | 建议仓位 | 说明 |\n';
    report += '|------|---------|---------|------|\n';
    if (priceRange !== null) {
      report += `| 第一批 | 价格跌至 $${(l52 + priceRange * 0.2).toFixed(2)} 以下（20%分位） | 1%-2% | 极低价小仓位试探 |\n`;
    } else {
      report += '| 第一批 | 深度回调20%以上 | 1%-2% | 极低价小仓位试探 |\n';
    }
    report += '| 第二批 | 基本面出现明显改善信号 | 1%-2% | 右侧确认后再加仓 |\n';
    report += '| 第三批 | 评分提升至B+以上 | 可加至5% | 基本面转好后再考虑 |\n';
    report += '\n**总仓位建议**：<5%（观察仓）\n';
    report += '**持有周期**：1-2年，随时准备止损\n';
  } else {
    report += '**评级：回避型（D）**\n\n';
    report += '- ❌ 当前不建议任何建仓操作\n';
    report += '- ❌ 即使价格大跌也不建议抄底\n';
    report += '- ✅ 建议持续跟踪，等待评分回升至B以上再考虑\n';
    report += '\n**总仓位建议**：0%\n';
    report += '**替代方案**：寻找同行业中评分更高的标的\n';
  }

  report += `

### 当前价格参考

| 指标 | 数值 |
|------|------|
| 当前价格 | $${priceVal.toFixed(2)} |
`;
  if (h52 !== null && l52 !== null) {
    report += `| 52周最高 | $${h52.toFixed(2)} |\n`;
    report += `| 52周最低 | $${l52.toFixed(2)} |\n`;
    if (priceRange > 0) {
      const pos = ((priceVal - l52) / priceRange) * 100;
      report += `| 价格分位 | ${pos.toFixed(1)}%（0%=最低，100%=最高） |\n`;
    }
  } else {
    report += '| 52周高低 | 暂无数据 |\n';
  }

  report += `
### 建仓纪律

1. **分批原则**：绝不一次性满仓，至少分3批建仓
2. **止损纪律**：单只个股浮亏超过20%且基本面恶化，坚决止损
3. **仓位上限**：单只个股不超过总资产的20%
4. **情绪管理**：市场恐慌时敢于买入，市场狂热时敢于减仓
5. **定期复盘**：每季度重新评分，评分下降两级以上考虑减仓

---

> ⚠️ **免责声明**：本报告基于实时行情数据和公开信息自动生成，评分逻辑基于简化的量化推断，仅供学习参考，不构成投资建议。投资有风险，入市需谨慎。
> 
> 完整的价值投资分析需要深入研究公司财报、行业格局、管理层、竞争对手等多方面信息。
`;

  return report;
}

export { nowTimestamp, nowIso };
