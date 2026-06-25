/**
 * 港股打新分析工具模块
 */

// ============ 数据加载与保存 ============

async function loadHkIpo(force = false) {
  if (hkIpoLoading) return;
  hkIpoLoading = true;
  hkIpoError = "";
  loadHkIpoStrategyEdits();
  loadHkIpoRowEdits();
  loadHkIpoManualBigVRows();
  if (currentModule === "hkIpoTool") render();
  try {
    const payload = await apiRequest(`/tools/hk-ipo?${hkIpoQueryString(force ? { refresh: "1" } : {})}`);
    hkIpoPayload = {
      rows: Array.isArray(payload.rows) ? payload.rows : [],
      recommendations: Array.isArray(payload.recommendations) ? payload.recommendations : [],
      bigVRows: Array.isArray(payload.bigVRows) ? payload.bigVRows : [],
      scoreRows: Array.isArray(payload.scoreRows) ? payload.scoreRows : [],
      rules: Array.isArray(payload.rules) ? payload.rules : [],
      validationRows: Array.isArray(payload.validationRows) ? payload.validationRows : [],
      dataSources: Array.isArray(payload.dataSources) ? payload.dataSources : [],
      stats: payload.stats || null,
      fetchedAt: payload.fetchedAt || "",
      source: payload.source || "",
      threshold: Number(payload.threshold) || 6,
    };
    mergeHkIpoManualBigVRows();
    applyHkIpoRowEdits();
    hkIpoLoadedAt = new Date().toISOString();
    hkIpoRulesDirty = false;
  } catch (error) {
    hkIpoError = error.message || "港股打新数据加载失败";
  } finally {
    hkIpoLoading = false;
    if (currentModule === "hkIpoTool") render();
  }
}

async function saveHkIpoRules() {
  hkIpoLoading = true;
  hkIpoError = "";
  render();
  try {
    await apiRequest("/tools/hk-ipo/rules", {
      method: "PUT",
      body: {
        rules: hkIpoPayload.rules,
        threshold: hkIpoPayload.threshold,
      },
    });
    hkIpoEditingRuleId = "";
    hkIpoLoadedAt = "";
    await loadHkIpo(true);
  } catch (error) {
    hkIpoError = error.message || "评分规则保存失败";
    hkIpoLoading = false;
    render();
  }
}

async function resetHkIpoRules() {
  if (!confirm("确认恢复默认评分规则？当前账号自定义分数会被清空。")) return;
  hkIpoLoading = true;
  hkIpoError = "";
  render();
  try {
    await apiRequest("/tools/hk-ipo/rules", { method: "PUT", body: { reset: true } });
    hkIpoLoadedAt = "";
    await loadHkIpo(true);
  } catch (error) {
    hkIpoError = error.message || "恢复默认规则失败";
    hkIpoLoading = false;
    render();
  }
}

async function exportHkIpoWorkbook() {
  const response = await fetch(`${API_BASE}/tools/hk-ipo/export?${hkIpoQueryString()}`, {
    headers: auth.token ? { Authorization: `Bearer ${auth.token}` } : {},
  });
  if (!response.ok) throw new Error("导出失败");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `港股打新分析_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ============ 工具函数 ============

function hkIpoNumber(value) {
  const parsed = Number(String(value ?? "").replace(/[,%亿万港元元]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function hkIpoStatusOptions() {
  return ["all", "招股中", "待上市", "暗盘", "已上市"]
    .map((status) => `<button type="button" data-action="hk-ipo-status" data-status="${status}" class="${hkIpoStatusFilter === status ? "active" : ""}">${status === "all" ? "全部" : status}</button>`)
    .join("");
}

function hkIpoAnalysisTimeArea() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  let periodOptionHtml = "";
  if (analysisPeriodMode === "day") {
    periodOptionHtml = `<span class="badge">${year}年${month + 1}月${now.getDate()}日</span>`;
  } else if (analysisPeriodMode === "month") {
    const options = Array.from({ length: month + 1 }, (_, index) => {
      const targetMonth = month - index;
      const value = `${year}-${String(targetMonth + 1).padStart(2, "0")}`;
      const label = index === 0 ? "本月" : index === 1 ? "上月" : `${targetMonth + 1}月`;
      return [value, label];
    });
    periodOptionHtml = `<div class="ledger-period-options">
      <span class="ledger-period-year">${year}年</span>
      ${options.map(([value, label]) => `<button type="button" data-action="analysis-period" data-period="${value}" class="${analysisPeriod === value ? "active" : ""}">${label}</button>`).join("")}
    </div>`;
  } else if (analysisPeriodMode === "year") {
    const options = [];
    for (let y = year; y >= Math.min(year, 2020); y -= 1) {
      options.push([String(y), y === year ? "今年" : y === year - 1 ? "去年" : `${y}年`]);
    }
    periodOptionHtml = `<div class="ledger-period-options">
      ${options.map(([value, label]) => `<button type="button" data-action="analysis-period" data-period="${value}" class="${analysisPeriod === value ? "active" : ""}">${label}</button>`).join("")}
    </div>`;
  } else {
    periodOptionHtml = `<div class="ledger-period-options"><span class="ledger-period-year">自定义日期范围</span></div>`;
  }
  return `<section class="analysis-filter-bar hk-ipo-time-area">
    <div class="ledger-periods ledger-mode-tabs">
      ${[
        ["day", "日常"],
        ["month", "月统计"],
        ["year", "年统计"],
        ["custom", "自定义"],
      ].map(([mode, label]) => `<button type="button" data-action="analysis-mode" data-mode="${mode}" class="${analysisPeriodMode === mode ? "active" : ""}">${label}</button>`).join("")}
    </div>
    ${periodOptionHtml}
    <div class="analysis-custom-range ${analysisPeriodMode === "custom" ? "active" : ""}">
      <input id="analysisStartDate" type="date" value="${filters.startDate}" />
      <input id="analysisEndDate" type="date" value="${filters.endDate}" />
    </div>
  </section>`;
}

function hkIpoStatCard(label, value, hint = "") {
  return `<article class="hk-ipo-stat">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(value)}</strong>
    ${hint ? `<small>${escapeHtml(hint)}</small>` : ""}
  </article>`;
}

function hkIpoViewTabs() {
  const tabs = [
    ["main", "主表", hkIpoPayload.rows.length],
    ["recommendations", "推荐排序", hkIpoPayload.recommendations.length],
    ["bigv", "大V意向", hkIpoPayload.bigVRows.length],
    ["rules", "评分规则", hkIpoPayload.rules.length],
    ["scores", "评分明细", hkIpoPayload.scoreRows.length],
    ["validation", "数据校验", hkIpoPayload.validationRows.length],
  ];
  return `<div class="hk-ipo-tabs">${tabs.map(([id, label, count]) => `<button type="button" data-action="hk-ipo-view" data-view="${id}" class="${hkIpoActiveView === id ? "active" : ""}">
    <span>${label}</span><small>${count}</small>
  </button>`).join("")}</div>`;
}

function hkIpoActiveTable() {
  if (hkIpoActiveView === "recommendations") {
    return { title: "推荐排序", badge: "动态重算", html: hkIpoRecommendationTable(hkIpoPayload.recommendations) };
  }
  if (hkIpoActiveView === "bigv") {
    return { title: "大V意向", badge: "联动筛选", html: hkIpoBigVTable(hkIpoPayload.bigVRows) };
  }
  if (hkIpoActiveView === "rules") {
    return { title: "评分规则", badge: "当前账号保存", html: hkIpoRulesTable(hkIpoPayload.rules) };
  }
  if (hkIpoActiveView === "scores") {
    return { title: "评分明细", badge: `${hkIpoPayload.scoreRows.length} 条`, html: hkIpoScoreTable(hkIpoPayload.scoreRows) };
  }
  if (hkIpoActiveView === "validation") {
    return { title: "数据校验", badge: `${hkIpoPayload.validationRows.length} 条`, html: hkIpoValidationTable(hkIpoPayload.validationRows) };
  }
  return { title: "主表", badge: `${hkIpoPayload.rows.length} 条`, html: hkIpoMainTable(hkIpoPayload.rows) };
}

function hkIpoBarChart(title, rows, valueKey = "count") {
  const max = Math.max(1, ...rows.map((row) => Number(row[valueKey]) || 0));
  return `<section class="hk-ipo-chart card">
    <div class="section-title"><h2>${escapeHtml(title)}</h2><span class="badge">${rows.length} 项</span></div>
    <div class="hk-ipo-bars">
      ${rows.map((row) => {
        const value = Number(row[valueKey]) || 0;
        const height = Math.max(6, (value / max) * 100);
        return `<div class="hk-ipo-bar-item" title="${escapeAttr(`${row.label || row.companyName || row.status}: ${value}`)}">
          <div class="hk-ipo-bar-label">${escapeHtml(row.label || row.companyName || row.status || "-")}${row.tag ? `<span class="hk-ipo-mini-tag">${escapeHtml(row.tag)}</span>` : ""}</div>
          <div class="hk-ipo-bar-track"><i style="width:${height}%"></i></div>
          <strong>${Number(value).toFixed(3).replace(/\.?0+$/, "")}</strong>
        </div>`;
      }).join("") || `<p class="muted">暂无图表数据</p>`}
    </div>
  </section>`;
}

function hkIpoStatusChart(counts = {}) {
  const rows = ["招股中", "待上市", "暗盘", "已上市"].map((status) => ({ status, count: counts[status] || 0 }));
  return hkIpoBarChart("状态占比", rows.map((row) => ({ label: row.status, count: row.count })));
}

// ============ Storage Keys ============

function hkIpoStrategyStorageKey() {
  return `hk_ipo_strategy_edits_${auth.currentUser || "guest"}`;
}

function hkIpoRowStorageKey() {
  return `hk_ipo_row_edits_${auth.currentUser || "guest"}`;
}

function hkIpoManualBigVStorageKey() {
  return `hk_ipo_manual_bigv_${auth.currentUser || "guest"}`;
}

function hkIpoBigVManualScore(total, positive) {
  const sampleCount = Math.max(0, Number(total) || 0);
  const positiveCount = Math.max(0, Number(positive) || 0);
  if (!sampleCount || !positiveCount) return 0;
  const ratio = Math.min(1, positiveCount / sampleCount);
  if (ratio >= 1) return 4;
  const quantityWeight = 0.75 + Math.min(sampleCount, 4) * 0.0625;
  return Number(Math.min(3.999, ratio * 4 * quantityWeight).toFixed(3));
}

// ============ Manual BigV Rows ============

function loadHkIpoManualBigVRows() {
  try {
    const saved = localStorage.getItem(hkIpoManualBigVStorageKey());
    hkIpoManualBigVRows = saved ? JSON.parse(saved) : [];
  } catch {
    hkIpoManualBigVRows = [];
  }
  if (!Array.isArray(hkIpoManualBigVRows)) hkIpoManualBigVRows = [];
}

function saveHkIpoManualBigVRows() {
  localStorage.setItem(hkIpoManualBigVStorageKey(), JSON.stringify(hkIpoManualBigVRows));
}

function mergeHkIpoManualBigVRows() {
  const validRows = hkIpoManualBigVRows.filter((row) => row.code || row.companyName || row.bigVName);
  const existingIds = new Set((hkIpoPayload.bigVRows || []).map((row) => row.id));
  const manualRows = validRows.map((row, index) => ({
    id: row.id || `manual-bigv-${Date.now()}-${index}`,
    code: String(row.code || "").trim(),
    companyName: String(row.companyName || "").trim(),
    bigV: `${Number(row.positiveCount) || 0}/${Number(row.sampleCount) || 0}`,
    bigVName: String(row.bigVName || "手动录入").trim(),
    intention: row.sampleCount ? `${Number(((Number(row.positiveCount) || 0) / Number(row.sampleCount) * 100).toFixed(1))}%` : "未获取",
    reason: String(row.reason || "谨慎").trim(),
    score: hkIpoBigVManualScore(row.sampleCount, row.positiveCount),
    confidence: "手动",
    sampleCount: Number(row.sampleCount) || 0,
    positiveCount: Number(row.positiveCount) || 0,
    note: String(row.note || "手动增加").trim(),
    manual: true,
  })).filter((row) => !existingIds.has(row.id));
  hkIpoPayload.bigVRows = [...(hkIpoPayload.bigVRows || []), ...manualRows]
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
}

// ============ Strategy Edits ============

function loadHkIpoStrategyEdits() {
  try {
    const saved = localStorage.getItem(hkIpoStrategyStorageKey());
    hkIpoStrategyEdits = saved ? JSON.parse(saved) : { overrides: {}, deleted: {} };
  } catch {
    hkIpoStrategyEdits = { overrides: {}, deleted: {} };
  }
  hkIpoStrategyEdits.overrides ||= {};
  hkIpoStrategyEdits.deleted ||= {};
}

function saveHkIpoStrategyEdits() {
  localStorage.setItem(hkIpoStrategyStorageKey(), JSON.stringify(hkIpoStrategyEdits));
}

// ============ Row Edits ============

function loadHkIpoRowEdits() {
  try {
    const saved = localStorage.getItem(hkIpoRowStorageKey());
    hkIpoRowEdits = saved ? JSON.parse(saved) : { overrides: {}, deleted: {} };
  } catch {
    hkIpoRowEdits = { overrides: {}, deleted: {} };
  }
  hkIpoRowEdits.overrides ||= {};
  hkIpoRowEdits.deleted ||= {};
}

function saveHkIpoRowEdits() {
  localStorage.setItem(hkIpoRowStorageKey(), JSON.stringify(hkIpoRowEdits));
}

function hkIpoRowKey(row) {
  return `${row.code || ""}|${row.offerPrice || ""}|${row.publicTotalHands || ""}|${row.companyName || ""}`;
}

function recomputeHkIpoStatsFromRows(rows) {
  const recommended = rows.filter((row) => row.shouldApply === "是");
  const recommendedCompanyCount = new Set(recommended.map((row) => row.companyName || row.code).filter(Boolean)).size;
  const bestScore = rows.reduce((best, row) => (hkIpoNumber(row.score) > hkIpoNumber(best?.score) ? row : best), null);
  const bestProfit = rows.reduce((best, row) => (hkIpoNumber(row.oneLotExpectedProfit) > hkIpoNumber(best?.oneLotExpectedProfit) ? row : best), null);
  const statusCounts = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  return {
    total: rows.length,
    recommended: recommendedCompanyCount,
    averageScore: rows.length ? Number((rows.reduce((sum, row) => sum + hkIpoNumber(row.score), 0) / rows.length).toFixed(3)) : 0,
    bestScoreProject: bestScore ? `${bestScore.companyName} ${bestScore.score}` : "",
    bestProfitProject: bestProfit ? `${bestProfit.companyName} ${bestProfit.oneLotExpectedProfit}` : "",
    statusCounts,
    profitRanking: [...rows]
      .filter((row) => row.status === "招股中")
      .sort((a, b) => hkIpoNumber(b.oneLotExpectedProfit) - hkIpoNumber(a.oneLotExpectedProfit))
      .map((row) => ({
        companyName: row.companyName,
        value: hkIpoNumber(row.oneLotExpectedProfit),
        priceTag: (Array.isArray(row.scenarioTags) ? row.scenarioTags : []).find((tag) => ["高", "低"].includes(tag)) || "",
      })),
  };
}

function applyHkIpoRowEdits() {
  const deleted = hkIpoRowEdits.deleted || {};
  const overrides = hkIpoRowEdits.overrides || {};
  hkIpoPayload.rows = (hkIpoPayload.rows || [])
    .map((row) => ({ ...row, ...(overrides[hkIpoRowKey(row)] || {}) }))
    .filter((row) => !deleted[hkIpoRowKey(row)]);
  const visibleKeys = new Set(hkIpoPayload.rows.map(hkIpoRowKey));
  const visibleCodes = new Set(hkIpoPayload.rows.map((row) => row.code));
  hkIpoPayload.recommendations = (hkIpoPayload.recommendations || []).filter((row) => visibleCodes.has(row.code));
  hkIpoPayload.scoreRows = (hkIpoPayload.scoreRows || []).filter((row) => visibleCodes.has(row.code));
  hkIpoPayload.stats = recomputeHkIpoStatsFromRows(hkIpoPayload.rows);
  return visibleKeys;
}

function hkIpoDedupByCompany(rows, sorter) {
  const sorted = [...rows].sort(sorter);
  const seen = new Set();
  return sorted.filter((row) => {
    const key = row.companyName || row.code;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hkIpoStrategyRows(type) {
  const baseRows = hkIpoStrategyShowAll
    ? hkIpoPayload.rows
    : hkIpoPayload.rows.filter((row) => row.shouldApply === "是");
  const rows = type === "score"
    ? hkIpoDedupByCompany(baseRows, (a, b) => hkIpoNumber(b.score) - hkIpoNumber(a.score) || hkIpoNumber(b.oneLotExpectedProfit) - hkIpoNumber(a.oneLotExpectedProfit))
    : hkIpoDedupByCompany(
      baseRows.filter((row) => hkIpoStrategyShowAll || hkIpoNumber(row.score) > 6),
      (a, b) => Number(hkIpoNumber(b.score) > 6) - Number(hkIpoNumber(a.score) > 6)
        || hkIpoNumber(b.publicTotalHands) - hkIpoNumber(a.publicTotalHands)
        || hkIpoNumber(b.score) - hkIpoNumber(a.score),
    );
  return rows
    .map((row, index) => {
      const key = `${type}:${row.companyName || row.code}`;
      if (hkIpoStrategyEdits.deleted[key]) return null;
      const override = hkIpoStrategyEdits.overrides[key] || {};
      return {
        key,
        rank: index + 1,
        type,
        code: row.code,
        companyName: row.companyName,
        score: row.score,
        publicTotalHands: row.publicTotalHands,
        shouldApply: row.shouldApply,
        strategy: override.strategy ?? row.strategy ?? row.summary ?? "",
      };
    })
    .filter(Boolean);
}

function hkIpoStrategyCard() {
  const scoreRows = hkIpoStrategyRows("score");
  const stockRows = hkIpoStrategyRows("stock");
  const rowMarkup = (row) => `<div class="hk-ipo-strategy-row">
    <span class="hk-ipo-strategy-rank">${row.rank}</span>
    <div class="hk-ipo-strategy-copy">
      <strong>${escapeHtml(row.companyName)}</strong>
      <small>${escapeHtml(row.code)} · 得分 ${escapeHtml(row.score)} · 手数 ${escapeHtml(row.publicTotalHands)} · ${escapeHtml(row.shouldApply)}</small>
      <p>${escapeHtml(row.strategy || "-")}</p>
    </div>
    <div class="hk-ipo-strategy-actions">
      <button type="button" data-action="hk-ipo-edit-strategy" data-key="${escapeAttr(row.key)}">编辑</button>
      <button type="button" data-action="hk-ipo-delete-strategy" data-key="${escapeAttr(row.key)}">删除</button>
    </div>
  </div>`;
  return `<section class="hk-ipo-chart card hk-ipo-strategy-card">
    <div class="section-title">
      <h2>策略排序</h2>
      <button type="button" class="hk-ipo-show-all ${hkIpoStrategyShowAll ? "active" : ""}" data-action="hk-ipo-toggle-strategy-all">${hkIpoStrategyShowAll ? "只看要打" : "全部"}</button>
    </div>
    <div class="hk-ipo-strategy-block">
      <div class="hk-ipo-strategy-head"><strong>分数排行策略</strong><span>${scoreRows.length} 项</span></div>
      ${scoreRows.map(rowMarkup).join("") || `<p class="muted">暂无满足条件的策略</p>`}
    </div>
    <div class="hk-ipo-strategy-block">
      <div class="hk-ipo-strategy-head"><strong>拿货策略</strong><span>${stockRows.length} 项</span></div>
      ${stockRows.map(rowMarkup).join("") || `<p class="muted">暂无满足条件的策略</p>`}
    </div>
  </section>`;
}

// ============ Advanced Filter ============

function hkIpoAdvFilterRows(rows) {
  const f = hkIpoAdvFilters;
  if (!f || !Object.keys(f).length) return rows;
  return rows.filter((row) => {
    for (const fd of hkIpoFilterFields) {
      const val = f[fd.key];
      if (!val) continue;
      const raw = row[fd.key];
      if (fd.type === "range") {
        const num = Number(raw) || 0;
        if (val.min !== undefined && val.min !== "" && num < Number(val.min)) return false;
        if (val.max !== undefined && val.max !== "" && num > Number(val.max)) return false;
      } else if (fd.type === "select") {
        if (val && String(raw).trim() !== val) return false;
      } else {
        const q = String(val).trim().toLowerCase();
        if (q && !String(raw || "").toLowerCase().includes(q)) return false;
      }
    }
    return true;
  });
}

// ============ Tables ============

function hkIpoMainTable(rows) {
  const filtered = hkIpoAdvFilterRows(rows);
  const cols = hkIpoAllCols.filter(([key]) => !hkIpoVisibleCols || hkIpoVisibleCols[key] !== false).concat([["actions", "操作"]]);
  const cellHtml = (row, key) => {
    if (key === "companyName") {
      const tags = Array.isArray(row.scenarioTags) ? row.scenarioTags : [];
      return `<td class="hk-ipo-company-cell">
        <div class="hk-ipo-company-line">
          <strong>${escapeHtml(row.companyName || "-")}</strong>
          ${tags.length ? `<span class="hk-ipo-scenario-tags">${tags.map((tag) => `<i>${escapeHtml(tag)}</i>`).join("")}</span>` : ""}
        </div>
      </td>`;
    }
    if (key === "actions") {
      const rowKey = hkIpoRowKey(row);
      return `<td class="hk-ipo-row-actions">
        <button type="button" data-action="hk-ipo-edit-row" data-key="${escapeAttr(rowKey)}">编辑</button>
        <button type="button" data-action="hk-ipo-delete-row" data-key="${escapeAttr(rowKey)}">删除</button>
      </td>`;
    }
    if (key === "actualMultiple") {
      return `<td class="${row.actualMultipleIncreased ? "hk-ipo-multiple-up" : ""}">
        <strong>${escapeHtml(row[key] ?? "-")}</strong>
        ${row.actualMultipleIncreased ? `<small>捷利更新 ↑</small>` : ""}
      </td>`;
    }
    return `<td>${escapeHtml(row[key] ?? "-")}</td>`;
  };
  return `<div class="hk-ipo-table-wrap"><table class="table hk-ipo-table">
    <thead><tr>${cols.map(([, label]) => `<th>${label}</th>`).join("")}</tr></thead>
    <tbody>${filtered.map((row) => `<tr>${cols.map(([key]) => cellHtml(row, key)).join("")}</tr>`).join("") || `<tr><td colspan="${cols.length}" class="muted">当前筛选条件下暂无数据</td></tr>`}</tbody>
  </table></div>`;
}

function hkIpoRecommendationTable(rows) {
  return `<div class="hk-ipo-table-wrap"><table class="table hk-ipo-table">
    <thead><tr><th>排序</th><th>代码</th><th>公司</th><th>状态</th><th>得分</th><th>是否打</th><th>一手预计收益</th><th>公开总手数</th><th>策略</th><th>理由</th></tr></thead>
    <tbody>${rows.map((row) => `<tr>
      <td>${row.rank}</td><td>${escapeHtml(row.code)}</td><td>${escapeHtml(row.companyName)}</td><td>${escapeHtml(row.status)}</td>
      <td>${escapeHtml(row.score)}</td><td>${escapeHtml(row.shouldApply)}</td><td>${escapeHtml(row.oneLotExpectedProfit)}</td><td>${escapeHtml(row.publicTotalHands)}</td>
      <td>${escapeHtml(row.strategy)}</td><td>${escapeHtml(row.reason)}</td>
    </tr>`).join("") || `<tr><td colspan="10" class="muted">暂无推荐排序</td></tr>`}</tbody>
  </table></div>`;
}

function hkIpoBigVTable(rows) {
  const scoreText = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(3).replace(/\.?0+$/, "") : String(value || 0);
  };
  return `<form id="hkIpoBigVManualForm" class="hk-ipo-bigv-form">
    <input name="code" placeholder="代码" />
    <input name="companyName" placeholder="公司名称" />
    <input name="bigVName" placeholder="大V名称" required />
    <select name="reason">
      <option value="梭哈">申购意见：梭哈</option>
      <option value="小仓位参与">申购意见：小仓位参与</option>
      <option value="谨慎">申购意见：谨慎</option>
      <option value="放弃">申购意见：放弃</option>
    </select>
    <input name="positiveCount" type="number" min="0" step="1" placeholder="支持数量" />
    <input name="sampleCount" type="number" min="0" step="1" placeholder="总数量" />
    <button type="submit">增加大V</button>
  </form>
  <div class="hk-ipo-table-wrap"><table class="table hk-ipo-table">
    <thead><tr><th>代码</th><th>公司</th><th>大V</th><th>大V名称</th><th>意向占比</th><th>申购意见</th><th>评分</th><th>置信度</th><th>样本说明</th><th>操作</th></tr></thead>
    <tbody>${rows.map((row) => `<tr>
      <td>${escapeHtml(row.code)}</td><td>${escapeHtml(row.companyName)}</td><td>${escapeHtml(row.bigV)}</td>
      <td><strong>${escapeHtml(row.bigVName)}</strong></td><td>${escapeHtml(row.intention)}</td><td>申购意见：${escapeHtml(row.reason)}</td>
      <td><strong>${escapeHtml(scoreText(row.score))}</strong></td><td>${escapeHtml(row.confidence)}</td><td>${escapeHtml(row.note)}</td>
      <td>${row.manual ? `<button type="button" class="hk-ipo-inline-btn" data-action="hk-ipo-delete-manual-bigv" data-id="${escapeAttr(row.id)}">删除</button>` : `<span class="muted">自动</span>`}</td>
    </tr>`).join("") || `<tr><td colspan="10" class="muted">暂无大V意向数据</td></tr>`}</tbody>
  </table></div>`;
}

function hkIpoRulesTable(rules) {
  const visibleRules = (rules || []).filter((rule) => !rule.deleted);
  return `<div class="hk-ipo-rules-head">
    <label>可打阈值 <input class="hk-ipo-threshold" type="number" step="0.5" value="${escapeAttr(hkIpoPayload.threshold)}" data-action="hk-ipo-threshold" /></label>
    <div class="hk-ipo-rule-buttons">
      <button type="button" data-action="hk-ipo-add-rule">新增规则</button>
      <button type="button" data-action="hk-ipo-reset-rules">重置默认</button>
      <button class="primary" type="button" data-action="hk-ipo-save-rules" ${hkIpoLoading ? "disabled" : ""}>保存并重算</button>
      ${hkIpoRulesDirty ? `<span class="badge is-warning">有未保存修改</span>` : ""}
    </div>
  </div>
  <div class="hk-ipo-table-wrap"><table class="table hk-ipo-table hk-ipo-rule-table">
    <thead><tr><th>分类</th><th>评分项</th><th>判定文本</th><th>默认分</th><th>分数</th><th>类型</th><th>操作</th></tr></thead>
    <tbody>${visibleRules.map((rule) => {
      const editing = hkIpoEditingRuleId === rule.id;
      const readonly = editing ? "" : "readonly";
      return `<tr data-rule-id="${escapeAttr(rule.id)}" class="${editing ? "is-editing" : ""}">
        <td><input data-field="category" value="${escapeAttr(rule.category)}" ${readonly} /></td>
        <td><input data-field="item" value="${escapeAttr(rule.item)}" ${readonly} /></td>
        <td><textarea class="hk-ipo-rule-condition" data-field="condition" rows="1" ${readonly}>${escapeHtml(rule.condition)}</textarea></td>
        <td>${escapeHtml(rule.defaultScore)}</td>
        <td><input data-field="score" type="number" step="0.5" value="${escapeAttr(rule.score)}" ${readonly} /></td>
        <td>${rule.custom ? "自定义" : "默认规则"}</td>
        <td class="hk-ipo-rule-actions">
          <button type="button" data-action="hk-ipo-edit-rule" data-rule-id="${escapeAttr(rule.id)}">${editing ? "完成" : "编辑"}</button>
          <button type="button" data-action="hk-ipo-insert-rule" data-rule-id="${escapeAttr(rule.id)}">插入</button>
          <button type="button" data-action="hk-ipo-delete-rule" data-rule-id="${escapeAttr(rule.id)}">删除</button>
        </td>
      </tr>`;
    }).join("") || `<tr><td colspan="7" class="muted">暂无评分规则</td></tr>`}</tbody>
  </table></div>`;
}

function hkIpoScoreTable(rows) {
  return `<div class="hk-ipo-table-wrap"><table class="table hk-ipo-table">
    <thead><tr><th>代码</th><th>公司</th><th>得分</th><th>是否打</th><th>评分明细</th></tr></thead>
    <tbody>${rows.map((row) => `<tr>
      <td>${escapeHtml(row.code)}</td><td>${escapeHtml(row.companyName)}</td><td>${escapeHtml(row.score)}</td><td>${escapeHtml(row.shouldApply)}</td>
      <td>${(row.components || []).map((item) => `<span class="hk-score-chip">${escapeHtml(item.item)} ${escapeHtml(item.score)}</span>`).join("")}</td>
    </tr>`).join("") || `<tr><td colspan="5" class="muted">暂无评分明细</td></tr>`}</tbody>
  </table></div>`;
}

function hkIpoValidationTable(rows) {
  const sourceRows = rows.filter((row) => row.sourceName || row.sourceUrl);
  const issueRows = rows.filter((row) => !row.sourceName && !row.sourceUrl);
  return `<div class="hk-ipo-table-wrap"><table class="table hk-ipo-table">
    <thead><tr><th>数据源</th><th>类型</th><th>可校验字段</th><th>用途 / 自动化状态</th><th>链接</th></tr></thead>
    <tbody>${sourceRows.map((row) => `<tr>
      <td><strong>${escapeHtml(row.sourceName || row.issue)}</strong></td>
      <td>${escapeHtml(row.sourceTier || row.level)}</td>
      <td>${escapeHtml(row.sourceFields || row.field)}</td>
      <td>${escapeHtml(`${row.sourceUsage || ""}${row.sourceAutoCheck ? `；${row.sourceAutoCheck}` : ""}`)}</td>
      <td>${row.sourceUrl && /^https?:\/\//.test(row.sourceUrl) ? `<a href="${escapeAttr(row.sourceUrl)}" target="_blank" rel="noopener">打开</a>` : escapeHtml(row.sourceUrl || row.sourceAccess || "-")}</td>
    </tr>`).join("") || `<tr><td colspan="5" class="muted">暂无数据源配置</td></tr>`}</tbody>
  </table></div>
  <div class="hk-ipo-table-wrap hk-ipo-validation-issues"><table class="table hk-ipo-table">
    <thead><tr><th>字段</th><th>问题</th><th>级别</th><th>建议</th></tr></thead>
    <tbody>${issueRows.map((row) => `<tr>
      <td>${escapeHtml(row.field)}</td><td>${escapeHtml(row.issue)}</td><td>${escapeHtml(row.level)}</td><td>${escapeHtml(row.suggestion)}</td>
    </tr>`).join("") || `<tr><td colspan="4" class="muted">暂无校验问题</td></tr>`}</tbody>
  </table></div>`;
}

function hkIpoAdvFilterPanel() {
  if (!hkIpoShowAdvFilter) return "";
  return `<div class="hk-ipo-adv-panel card">
    <div class="hk-ipo-adv-head">
      <h3>高级筛选</h3>
      <button type="button" data-action="hk-ipo-clear-adv-filter">清除筛选</button>
    </div>
    <div class="hk-ipo-adv-tabs">
      <h4>筛选条件</h4>
      <div class="hk-ipo-adv-grid">
        ${hkIpoFilterFields.map((fd) => {
          const val = hkIpoAdvFilters[fd.key] || {};
          if (fd.type === "range") {
            return `<label class="hk-ipo-adv-field"><span>${fd.label}</span>
              <div class="hk-ipo-range-inputs">
                <input type="number" step="any" placeholder="最小" data-adv-filter="${fd.key}" data-range="min" value="${val.min ?? ""}" />
                <span>~</span>
                <input type="number" step="any" placeholder="最大" data-adv-filter="${fd.key}" data-range="max" value="${val.max ?? ""}" />
              </div>
            </label>`;
          }
          if (fd.type === "select") {
            return `<label class="hk-ipo-adv-field"><span>${fd.label}</span>
              <select data-adv-filter="${fd.key}">${(fd.options || []).map((opt) => `<option value="${opt}" ${val === opt ? "selected" : ""}>${opt || "全部"}</option>`).join("")}</select>
            </label>`;
          }
          return `<label class="hk-ipo-adv-field"><span>${fd.label}</span>
            <input type="text" placeholder="包含..." data-adv-filter="${fd.key}" value="${typeof val === "string" ? escapeAttr(val) : ""}" />
          </label>`;
        }).join("")}
      </div>
    </div>
    <div class="hk-ipo-adv-tabs">
      <h4>显示列</h4>
      <div class="hk-ipo-col-grid">
        ${hkIpoAllCols.map(([key, label]) => {
          const locked = hkIpoLockedCols.has(key);
          const checked = !hkIpoVisibleCols || hkIpoVisibleCols[key] !== false;
          return `<label class="hk-ipo-col-check ${locked ? "locked" : ""}">
            <input type="checkbox" data-col-toggle="${key}" ${checked ? "checked" : ""} ${locked ? "disabled" : ""} />
            <span>${escapeHtml(label)}</span>
          </label>`;
        }).join("")}
      </div>
    </div>
  </div>`;
}

// ============ Main Render Function ============

function hkIpoTool() {
  const stats = hkIpoPayload.stats || { total: 0, recommended: 0, averageScore: 0, statusCounts: {}, scoreDistribution: [], profitRanking: [] };
  const fetched = hkIpoLoadedAt ? formatDateTime(hkIpoLoadedAt) : hkIpoPayload.fetchedAt ? formatDateTime(hkIpoPayload.fetchedAt) : "尚未加载";
  const activeTable = hkIpoActiveTable();
  return `<section class="hk-ipo-page">
    <div class="premium-toolbar hk-ipo-toolbar">
      <div class="premium-title">
        <button class="icon-button premium-back" data-action="back-tools" title="返回辅助工具" aria-label="返回辅助工具">‹</button>
        <div>
          <p class="eyebrow">辅助工具 / 港股打新</p>
          <h2>港股打新分析</h2>
          <p class="muted">更新时间：${escapeHtml(fetched)}</p>
        </div>
      </div>
      <div class="premium-refresh-group">
        <button class="primary" type="button" data-action="hk-ipo-refresh" ${hkIpoLoading ? "disabled" : ""}>${hkIpoLoading ? "加载中..." : "刷新"}</button>
      </div>
    </div>

    ${hkIpoError ? `<div class="premium-alert" role="alert">${escapeHtml(hkIpoError)}</div>` : ""}

    <div class="hk-ipo-summary">
      ${hkIpoStatCard("总项目数", String(stats.total || 0), "当前筛选结果")}
      ${hkIpoStatCard("建议打新数", String(stats.recommended || 0), "是否打 = 是")}
      ${hkIpoStatCard("平均分", String(stats.averageScore || 0), `阈值 ${hkIpoPayload.threshold}`)}
      ${hkIpoStatCard("最高分项目", stats.bestScoreProject || "-", "按重算得分")}
      ${hkIpoStatCard("最高一手预计收益", stats.bestProfitProject || "-", "按当前筛选")}
      ${hkIpoStatCard("当前状态数量", Object.entries(stats.statusCounts || {}).map(([k, v]) => `${k}${v}`).join(" / ") || "-", "招股中/待上市/暗盘/已上市")}
    </div>

    <div class="hk-ipo-chart-grid">
      ${hkIpoStrategyCard()}
      ${hkIpoBarChart("一手预计收益排行", (stats.profitRanking || []).map((row) => ({ label: row.companyName, count: row.value, tag: row.priceTag })))}
      ${hkIpoStatusChart(stats.statusCounts || {})}
    </div>

    <section class="card hk-ipo-section">
      <div class="section-title hk-ipo-table-title">
        <div class="hk-ipo-title-tabs">
          <h2>${escapeHtml(activeTable.title)}</h2>
          ${hkIpoViewTabs()}
        </div>
        <button type="button" data-action="hk-ipo-export">导出</button>
      </div>
      ${hkIpoAnalysisTimeArea()}
      <form id="hkIpoFilterForm" class="hk-ipo-filters">
        <div class="segmented">${hkIpoStatusOptions()}</div>
        <label class="hk-ipo-search">搜索 <input name="query" value="${escapeAttr(hkIpoQuery)}" placeholder="代码、公司名称" /></label>
        <button type="submit">查询</button>
        <button type="button" data-action="hk-ipo-reset-filter">还原</button>
        <button type="button" data-action="hk-ipo-toggle-adv-filter" class="${hkIpoShowAdvFilter ? "active" : ""}">高级筛选</button>
      </form>
      ${hkIpoAdvFilterPanel()}
      ${activeTable.html}
      <div class="hk-ipo-table-footer"><span>${escapeHtml(activeTable.title)}：${escapeHtml(activeTable.badge)}</span></div>
    </section>
  </section>`;
}

// ============ Event Handlers ============

function handleHkIpoDelegatedClick(event) {
  const viewButton = event.target.closest?.("[data-action='hk-ipo-view']");
  if (!viewButton) return false;
  event.preventDefault();
  event.stopPropagation();
  const nextView = viewButton.dataset.view || "main";
  if (hkIpoActiveView !== nextView) {
    hkIpoActiveView = nextView;
    render();
  }
  return true;
}

function autosizeHkIpoRuleTextareas() {
  document.querySelectorAll(".hk-ipo-rule-condition").forEach((textarea) => {
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(38, textarea.scrollHeight)}px`;
  });
}
