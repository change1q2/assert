/**
 * 溢价查询工具模块
 */

// ============ Row Color Class ============

function getPremiumRowColorClass(amount, ratio) {
  if (amount === '' || amount === undefined || amount === null) {
    return ''; // White/default for empty/cleared position
  }
  
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) return '';
  
  if (numAmount > 0) {
    return 'premium-row-increased'; // Red for holding or adding position
  } else if (numAmount < 0) {
    return 'premium-row-decreased'; // Green for reducing position
  } else if (numAmount === 0 && ratio !== '' && ratio !== undefined) {
    return 'premium-row-unchanged'; // Yellow for unchanged/watching (position cleared but still watching)
  }
  
  return ''; // White for cleared position with no ratio
}

function premiumRowHasHolding(row) {
  const holdingsData = premiumHoldingsMap[row.code] || {};
  const amount = Number(holdingsData.amount);
  const ratio = Number(holdingsData.ratio);
  return Number.isFinite(amount) && Number.isFinite(ratio) && amount !== 0 && ratio !== 0;
}

function hasActivePremiumFilters() {
  return premiumQuickFilter !== "all"
    || premiumType1Filter !== "all"
    || premiumDataType2Filter !== "all"
    || premiumArbitrageFilter !== "all"
    || premiumTransferFilter !== "all"
    || premiumStatusFilter !== "all"
    || Boolean(premiumQuery.trim());
}

// ============ Code Normalization ============

function normalizePremiumHoldingCode(value = "") {
  return normalizeFinanceOcrCode(value)
    .replace(/\.(SH|SZ)$/i, "")
    .replace(/^SH|^SZ/i, "");
}

// ============ Holdings Sync ============

function syncHoldingsFromFinance() {
  const financeAssets = state.financeAssets || [];
  
  premiumRows.forEach((row) => {
    const normalizedRowCode = normalizePremiumHoldingCode(row.code);
    const currentHolding = premiumHoldingsMap[row.code] || {};
    const matchingAssets = financeAssets.filter((asset) =>
      normalizePremiumHoldingCode(asset.code) === normalizedRowCode
    );

    if (!matchingAssets.length) {
      if (currentHolding.autoSynced) {
        delete currentHolding.amount;
        delete currentHolding.ratio;
        delete currentHolding.autoSynced;
        delete currentHolding.timestamp;
        if (Object.keys(currentHolding).length) premiumHoldingsMap[row.code] = currentHolding;
        else delete premiumHoldingsMap[row.code];
      }
      return;
    }

    if (!premiumHoldingsMap[row.code]) {
      premiumHoldingsMap[row.code] = {};
    }

    const shouldSyncAmount = currentHolding.amount === undefined || currentHolding.autoSynced === true;
    if (shouldSyncAmount) {
      const marketValue = matchingAssets.reduce((sum, asset) => sum + financeAssetMarketValue(asset), 0);
      premiumHoldingsMap[row.code].amount = parseFloat(marketValue.toFixed(2));
      premiumHoldingsMap[row.code].autoSynced = true;
      premiumHoldingsMap[row.code].timestamp = Date.now();
    }
  });
  
  // Auto-calculate ratios after syncing amounts
  recalculateAllRatios();
  savePremiumHoldingsData();
}

// ============ Ratio Calculation ============

function recalculateAllRatios() {
  const filteredRows = getFilteredPremiumRows();
  const totalAmount = filteredRows.reduce((sum, row) => {
    const rowHoldings = premiumHoldingsMap[row.code];
    return sum + (rowHoldings && rowHoldings.amount ? rowHoldings.amount : 0);
  }, 0);
  
  if (totalAmount > 0) {
    filteredRows.forEach((row) => {
      const rowHoldings = premiumHoldingsMap[row.code];
      if (rowHoldings && rowHoldings.amount && rowHoldings.amount > 0) {
        rowHoldings.ratio = parseFloat(((rowHoldings.amount / totalAmount) * 100).toFixed(2));
      }
    });
  }
}

// ============ Filtered Rows ============

function getFilteredPremiumRows() {
  const query = premiumQuery.trim().toLowerCase();
  return premiumRows.filter((row) => {
    const dataType2 = premiumDataType2Map[row.code] || row.dataType2 || '其他国家标的';
    
    let matchesType1 = premiumType1Filter === "all" || row.type === premiumType1Filter;
    let matchesDataType2 = premiumDataType2Filter === "all" || dataType2 === premiumDataType2Filter;
    
    let matchesArbitrage = true;
    if (premiumArbitrageFilter === "yes") {
      matchesArbitrage = row.canArbitrage === true;
    } else if (premiumArbitrageFilter === "no") {
      matchesArbitrage = row.canArbitrage === false;
    }
    
    let matchesTransfer = true;
    if (premiumTransferFilter !== "all") {
      matchesTransfer = row.transferRecommend && row.transferRecommend.level === premiumTransferFilter;
    }
    
    let matchesStatus = true;
    if (premiumStatusFilter === "premium") {
      matchesStatus = row.status === "premium";
    } else if (premiumStatusFilter === "discount") {
      matchesStatus = row.status === "discount";
    }
    
    const matchesQuery = !query || 
      `${row.code} ${row.name} ${row.direction || ""} ${row.type} ${dataType2}`.toLowerCase().includes(query);
    
    return matchesType1 && matchesDataType2 && matchesArbitrage && matchesTransfer && matchesStatus && matchesQuery;
  });
}

// ============ Row Rendering ============

function premiumRow(row, index) {
  const tone = row.status === "premium" ? "positive" : row.status === "discount" ? "negative" : "";
  // Use custom dataType2 if set, otherwise use the default from backend
  const dataType2 = premiumDataType2Map[row.code] || row.dataType2 || '其他国家标的';
  
  // Get holdings data
  const holdingsData = premiumHoldingsMap[row.code] || {};
  const holdingAmount = holdingsData.amount !== undefined ? holdingsData.amount : '';
  const holdingRatio = holdingsData.ratio !== undefined ? holdingsData.ratio : '';
  
  // Determine row color class
  const rowColorClass = getPremiumRowColorClass(holdingAmount, holdingRatio);
  
  return `<tr data-code="${escapeAttr(row.code)}" class="${rowColorClass}">
    <td style="text-align: center; color: var(--muted); font-weight: 500;">${index}</td>
    <td><div class="premium-symbol"><strong>${escapeHtml(row.code)}</strong></div></td>
    <td><span class="premium-type">${escapeHtml(row.direction || "--")}</span></td>
    <td><div class="premium-symbol"><strong>${escapeHtml(row.name)}</strong></div></td>
    <td><span class="premium-type">${escapeHtml(row.type)}</span></td>
    <td>
      <select class="premium-datatype-select" data-code="${escapeAttr(row.code)}" onchange="updateDataType2('${escapeAttr(row.code)}', this.value)">
        <option value="美国标的" ${dataType2 === '美国标的' ? 'selected' : ''}>美国标的</option>
        <option value="其他国家标的" ${dataType2 === '其他国家标的' ? 'selected' : ''}>其他国家标的</option>
        <optgroup label="商品">
          <option value="原油" ${dataType2 === '原油' ? 'selected' : ''}>  原油</option>
          <option value="黄金" ${dataType2 === '黄金' ? 'selected' : ''}>  黄金</option>
          <option value="白银" ${dataType2 === '白银' ? 'selected' : ''}>  白银</option>
          <option value="其他商品" ${dataType2 === '其他商品' ? 'selected' : ''}>  其他商品</option>
        </optgroup>
      </select>
    </td>
    <td>${row.applyLimit !== undefined && row.applyLimit !== 0 ? Number(row.applyLimit).toLocaleString() : "--"}</td>
    <td>${row.t0Nav !== undefined && row.t0Nav !== 0 ? Number(row.t0Nav).toFixed(4) : "--"}</td>
    <td>${Number(row.price).toFixed(3)}</td>
    <td><strong class="premium-rate ${tone}">${formatPremiumRate(row.premiumRate)}</strong></td>
    <td>${row.canArbitrage ? '<span class="premium-arbitrage-tag">✓ 可套利</span>' : '<span class="premium-no-arbitrage">✗</span>'}</td>
    <td>${renderTransferRecommend(row.transferRecommend)}</td>
    <td><input type="number" class="premium-holding-amount" data-code="${escapeAttr(row.code)}" value="${holdingAmount}" placeholder="输入金额" onchange="updatePremiumHolding('${escapeAttr(row.code)}', 'amount', this.value)" /></td>
    <td><input type="number" class="premium-holding-ratio" data-code="${escapeAttr(row.code)}" value="${holdingRatio}" placeholder="自动计算" step="0.01" min="0" max="100" onchange="updatePremiumHolding('${escapeAttr(row.code)}', 'ratio', this.value)" />%</td>
  </tr>`;
}

function formatPremiumRate(value) {
  const number = Number(value) || 0;
  return `${number > 0 ? "+" : ""}${number.toFixed(2)}%`;
}

function renderTransferRecommend(recommend) {
  if (!recommend) return '<span class="transfer-none">--</span>';
  
  const colorClass = `transfer-${recommend.color}`;
  return `<span class="transfer-tag ${colorClass}" title="${escapeHtml(recommend.text)}">${escapeHtml(recommend.text)}</span>`;
}

// ============ Data Loading ============

async function loadPremiumMarket(force = false) {
  if (premiumLoading) return;
  premiumLoading = true;
  premiumError = "";
  if (currentModule === "premiumTool") render();
  try {
    const payload = await apiRequest(`/tools/premium${force ? "?refresh=1" : ""}`);
    premiumRows = Array.isArray(payload.rows) ? payload.rows : [];
    premiumFetchedAt = payload.fetchedAt || new Date().toISOString();
    premiumSource = payload.source || "公开基金行情聚合";
    premiumLoadedAt = Date.now();
    if (payload.stale) premiumError = "行情源暂时不可用，当前显示最近一次缓存数据。";
    if (payload.failedSources) premiumError = `部分行情源暂时不可用，已展示其余 ${payload.sourceCount || 0} 个来源的数据。`;
    
    // Auto-sync holdings data from finance assets
    syncHoldingsFromFinance();
  } catch (error) {
    premiumError = error.message || "行情获取失败，请稍后重试。";
  } finally {
    premiumLoading = false;
    if (currentModule === "premiumTool") render();
  }
}

function resetPremiumFilters({ refresh = false } = {}) {
  premiumType1Filter = "all";
  premiumDataType2Filter = "all";
  premiumArbitrageFilter = "all";
  premiumTransferFilter = "all";
  premiumStatusFilter = "all";
  premiumQuickFilter = "all";
  premiumQuery = "";
  premiumSortField = "premiumRate";
  premiumSortOrder = "desc";
  premiumCurrentPage = 1;
  premiumError = "";
  if (refresh) {
    void loadPremiumMarket(true);
    return;
  }
  render();
}

// ============ Auto Refresh ============

function syncPremiumAutoRefresh() {
  if (currentModule !== "premiumTool") {
    if (premiumRefreshTimer) window.clearInterval(premiumRefreshTimer);
    premiumRefreshTimer = null;
    return;
  }
  if (premiumRefreshTimer) return;
  premiumRefreshTimer = window.setInterval(() => {
    if (currentModule === "premiumTool" && document.visibilityState === "visible" && !premiumLoading) {
      void loadPremiumMarket(true);
    }
  }, 300_000); // 5 minutes = 5 * 60 * 1000 = 300000ms
}

function syncHkIpoAutoRefresh() {
  if (currentModule !== "hkIpoTool") {
    if (hkIpoRefreshTimer) window.clearInterval(hkIpoRefreshTimer);
    hkIpoRefreshTimer = null;
    return;
  }
  if (hkIpoRefreshTimer) return;
  hkIpoRefreshTimer = window.setInterval(() => {
    if (currentModule === "hkIpoTool" && document.visibilityState === "visible" && !hkIpoLoading) {
      hkIpoLoadedAt = "";
      void loadHkIpo(true);
    }
  }, 3_600_000);
}

// ============ Main Render Function ============

function premiumTool() {
  syncHoldingsFromFinance();
  const query = premiumQuery.trim().toLowerCase();
  let rows = premiumRows.filter((row) => {
    // Use custom dataType2 if set, otherwise use default from backend
    const dataType2 = premiumDataType2Map[row.code] || row.dataType2 || '权益基金';
    
    // Filter by type1 (ETF/LOF)
    let matchesType1 = premiumType1Filter === "all" || row.type === premiumType1Filter;
    
    // Filter by dataType2 (权益基金/商品)
    let matchesDataType2 = premiumDataType2Filter === "all" || dataType2 === premiumDataType2Filter;
    
    // Filter by arbitrage
    let matchesArbitrage = true;
    if (premiumArbitrageFilter === "yes") {
      matchesArbitrage = row.canArbitrage === true;
    } else if (premiumArbitrageFilter === "no") {
      matchesArbitrage = row.canArbitrage === false;
    }
    
    // Filter by transfer recommendation
    let matchesTransfer = true;
    if (premiumTransferFilter !== "all") {
      matchesTransfer = row.transferRecommend && row.transferRecommend.level === premiumTransferFilter;
    }
    
    // Filter by status (premium/discount)
    let matchesStatus = true;
    if (premiumStatusFilter === "premium") {
      matchesStatus = row.status === "premium";
    } else if (premiumStatusFilter === "discount") {
      matchesStatus = row.status === "discount";
    }
    
    const matchesQuery = !query || 
      `${row.code} ${row.name} ${row.direction || ""} ${row.type} ${dataType2}`.toLowerCase().includes(query);
    
    // Apply quick filter
    let matchesQuickFilter = true;
    if (premiumQuickFilter === 'premium') {
      matchesQuickFilter = row.status === "premium";
    } else if (premiumQuickFilter === 'arbitrage') {
      matchesQuickFilter = row.canArbitrage === true;
    } else if (premiumQuickFilter === 'transfer') {
      const rec = row.transferRecommend;
      matchesQuickFilter = rec && (rec.level === 'must-sell' || rec.level === 'suggest-sell' || rec.level === 'can-sell');
    } else if (premiumQuickFilter === 'buy') {
      matchesQuickFilter = row.premiumRate < 2;
    } else if (premiumQuickFilter === 'holding') {
      matchesQuickFilter = premiumRowHasHolding(row);
    }
    
    return matchesType1 && matchesDataType2 && matchesArbitrage && matchesTransfer && matchesStatus && matchesQuery && matchesQuickFilter;
  });
  
  // Sort rows based on sort field and order
  rows.sort((a, b) => {
    let valueA = a[premiumSortField];
    let valueB = b[premiumSortField];
    
    // Handle null/undefined values
    if (valueA === null || valueA === undefined) valueA = -Infinity;
    if (valueB === null || valueB === undefined) valueB = -Infinity;
    
    // Convert to numbers for comparison
    valueA = Number(valueA);
    valueB = Number(valueB);
    
    if (premiumSortOrder === 'asc') {
      return valueA - valueB;
    } else {
      return valueB - valueA;
    }
  });
  
  // Calculate pagination
  const totalRows = rows.length;
  const totalPages = Math.ceil(totalRows / premiumPageSize);
  // Ensure current page is valid
  if (premiumCurrentPage > totalPages && totalPages > 0) {
    premiumCurrentPage = totalPages;
  }
  if (premiumCurrentPage < 1) {
    premiumCurrentPage = 1;
  }
  // Get paginated rows
  const startIndex = (premiumCurrentPage - 1) * premiumPageSize;
  const endIndex = startIndex + premiumPageSize;
  const paginatedRows = rows.slice(startIndex, endIndex);
  
  const premiumTargets = premiumRows.filter((row) => row.status === "premium");
  const arbitrageTargets = premiumRows.filter((row) => row.canArbitrage);
  // Transfer targets: premiumRate > 6%
  const transferTargets = premiumRows.filter((row) => {
    const rec = row.transferRecommend;
    return rec && (rec.level === 'must-sell' || rec.level === 'suggest-sell' || rec.level === 'can-sell');
  });
  // Buy targets: premiumRate < 2% (including negative)
  const buyTargets = premiumRows.filter((row) => row.premiumRate < 2);
  const holdingTargets = premiumRows.filter((row) => premiumRowHasHolding(row));
  const highest = premiumTargets[0] || premiumRows[0];
  const fetchedTime = premiumFetchedAt
    ? new Date(premiumFetchedAt).toLocaleString("zh-CN", { hour12: false })
    : "尚未获取";
  return `<section class="premium-page">
    <div class="premium-toolbar">
      <div class="premium-title">
        <button class="icon-button premium-back" data-action="back-tools" title="返回辅助工具" aria-label="返回辅助工具">‹</button>
        <div>
          <p class="eyebrow">辅助工具 / 行情</p>
          <h2>溢价查询</h2>
        </div>
      </div>
      <div class="premium-refresh-group">
        <span class="premium-live"><i></i>每 5 分钟自动刷新</span>
        <button class="primary premium-refresh" data-action="refresh-premium" ${premiumLoading ? "disabled" : ""}>
          ${premiumLoading ? "正在刷新..." : "刷新行情"}
        </button>
      </div>
    </div>

    <div class="premium-summary">
      <article class="summary-card-clickable" data-quick-filter="all" title="点击显示全部数据">
        <span>覆盖标的</span>
        <strong>${premiumRows.length}</strong>
        <small>ETF / LOF</small>
      </article>
      <article class="summary-card-clickable ${premiumQuickFilter === 'premium' ? 'active-filter' : ''}" data-quick-filter="premium" title="点击筛选溢价标的">
        <span>溢价标的</span>
        <strong>${premiumTargets.length}</strong>
        <small>溢价率高于 0.50%</small>
      </article>
      <article class="summary-card-clickable ${premiumQuickFilter === 'arbitrage' ? 'active-filter' : ''}" data-quick-filter="arbitrage" title="点击筛选可套利标的">
        <span>可套利标的</span>
        <strong class="positive">${arbitrageTargets.length}</strong>
        <small>溢价>4%且申购上限≠0</small>
      </article>
      <article class="summary-card-clickable ${premiumQuickFilter === 'transfer' ? 'active-filter' : ''}" data-quick-filter="transfer" title="点击筛选建议转仓标的">
        <span>建议转仓标的</span>
        <strong class="transfer-count">${transferTargets.length}</strong>
        <small>溢价率>6%</small>
      </article>
      <article class="summary-card-clickable ${premiumQuickFilter === 'buy' ? 'active-filter' : ''}" data-quick-filter="buy" title="点击筛选建议转入标的">
        <span>建议转入标的</span>
        <strong class="buy-count">${buyTargets.length}</strong>
        <small>溢价率<2%</small>
      </article>
      <article class="summary-card-clickable ${premiumQuickFilter === 'holding' ? 'active-filter' : ''}" data-quick-filter="holding" title="点击筛选持有标的">
        <span>持有标的</span>
        <strong>${holdingTargets.length}</strong>
        <small>持有金额和比例均不为 0</small>
      </article>
      <article><span>最高参考溢价</span><strong class="${highest?.premiumRate >= 0 ? "positive" : "negative"}">${highest ? formatPremiumRate(highest.premiumRate) : "--"}</strong><small>${highest ? `${escapeHtml(highest.code)} ${escapeHtml(highest.name)}` : "等待行情"}</small></article>
      <article>
        <span>行情时间</span>
        <strong class="premium-time">${fetchedTime}</strong>
        <small>${escapeHtml(premiumSource || "Sea叔")}</small>
      </article>
    </div>

    <div class="premium-holdings-legend">
      <div class="legend-title">持有颜色说明：</div>
      <div class="legend-items">
        <span class="legend-item"><span class="legend-color legend-red"></span>红色 = 有持仓或加仓（金额 &gt; 0）</span>
        <span class="legend-item"><span class="legend-color legend-green"></span>绿色 = 减仓操作（金额 &lt; 0）</span>
        <span class="legend-item"><span class="legend-color legend-yellow"></span>黄色 = 持仓不变/关注中（金额 = 0，有比例）</span>
        <span class="legend-item"><span class="legend-color legend-white"></span>白色 = 无数据或已清仓（默认）</span>
      </div>
    </div>

    <div class="premium-controls">
      <div class="premium-filters-row">
        <label class="premium-filter-label">
          类型一
          <select id="premiumType1Filter" class="premium-filter-select" onchange="updatePremiumFilter('type1', this.value)">
            <option value="all" ${premiumType1Filter === 'all' ? 'selected' : ''}>全部</option>
            <option value="ETF" ${premiumType1Filter === 'ETF' ? 'selected' : ''}>ETF</option>
            <option value="LOF" ${premiumType1Filter === 'LOF' ? 'selected' : ''}>LOF</option>
          </select>
        </label>
        <label class="premium-filter-label">
          数据类型二
          <div class="premium-datatype2-wrapper">
            <select id="premiumDataType2Filter" class="premium-filter-select" onchange="updatePremiumFilter('dataType2', this.value)">
              <option value="all" ${premiumDataType2Filter === 'all' ? 'selected' : ''}>全部</option>
              <option value="美国标的" ${premiumDataType2Filter === '美国标的' ? 'selected' : ''}>美国标的</option>
              <option value="其他国家标的" ${premiumDataType2Filter === '其他国家标的' ? 'selected' : ''}>其他国家标的</option>
              <optgroup label="商品">
                <option value="原油" ${premiumDataType2Filter === '原油' ? 'selected' : ''}>  原油</option>
                <option value="黄金" ${premiumDataType2Filter === '黄金' ? 'selected' : ''}>  黄金</option>
                <option value="白银" ${premiumDataType2Filter === '白银' ? 'selected' : ''}>  白银</option>
                <option value="其他商品" ${premiumDataType2Filter === '其他商品' ? 'selected' : ''}>  其他商品</option>
              </optgroup>
            </select>
          </div>
        </label>
        <label class="premium-filter-label">
          可套利
          <select id="premiumArbitrageFilter" class="premium-filter-select" onchange="updatePremiumFilter('arbitrage', this.value)">
            <option value="all" ${premiumArbitrageFilter === 'all' ? 'selected' : ''}>全部</option>
            <option value="yes" ${premiumArbitrageFilter === 'yes' ? 'selected' : ''}>可套利</option>
            <option value="no" ${premiumArbitrageFilter === 'no' ? 'selected' : ''}>不可套利</option>
          </select>
        </label>
        <label class="premium-filter-label">
          转仓推荐
          <select id="premiumTransferFilter" class="premium-filter-select" onchange="updatePremiumFilter('transfer', this.value)">
            <option value="all" ${premiumTransferFilter === 'all' ? 'selected' : ''}>全部</option>
            <option value="must-sell" ${premiumTransferFilter === 'must-sell' ? 'selected' : ''}>必须转出</option>
            <option value="suggest-sell" ${premiumTransferFilter === 'suggest-sell' ? 'selected' : ''}>建议转出</option>
            <option value="can-sell" ${premiumTransferFilter === 'can-sell' ? 'selected' : ''}>可以转出</option>
            <option value="suggest-buy" ${premiumTransferFilter === 'suggest-buy' ? 'selected' : ''}>建议转入</option>
            <option value="strong-buy" ${premiumTransferFilter === 'strong-buy' ? 'selected' : ''}>强烈转入</option>
          </select>
        </label>
        <label class="premium-filter-label">
          溢价状态
          <div style="display: flex; gap: 8px; align-items: center;">
            <select id="premiumStatusFilter" class="premium-filter-select" onchange="updatePremiumFilter('status', this.value)">
              <option value="all" ${premiumStatusFilter === 'all' ? 'selected' : ''}>全部</option>
              <option value="premium" ${premiumStatusFilter === 'premium' ? 'selected' : ''}>溢价</option>
              <option value="discount" ${premiumStatusFilter === 'discount' ? 'selected' : ''}>折价</option>
            </select>
            ${hasActivePremiumFilters() ? '<button class="premium-reset-btn-inline" data-action="reset-premium-filter" title="还原全部数据">↺ 还原</button>' : ''}
          </div>
        </label>
      </div>
      <form id="premiumSearchForm" class="premium-search">
        <input name="query" value="${escapeAttr(premiumQuery)}" placeholder="搜索代码、名称、方向或类型" aria-label="搜索溢价标的" />
        <button type="submit">查询</button>
      </form>
    </div>
    ${premiumError ? `<div class="premium-alert" role="alert">${escapeHtml(premiumError)}</div>` : ""}
    <div class="premium-table-wrap">
      <table class="premium-table premium-table-left">
        <thead>
          <tr>
            <th style="width: 50px;">#</th>
            <th>代码</th>
            <th>投资方向</th>
            <th>名称</th>
            <th>类型</th>
            <th>数据类型二</th>
            <th>LOF基金申购上限</th>
            <th>T0净值模拟</th>
            <th>现价</th>
            <th class="sortable-header" onclick="togglePremiumSort('premiumRate')" style="cursor: pointer;">
              实时溢价
              <span class="sort-icon ${premiumSortField === 'premiumRate' ? 'active ' + premiumSortOrder : ''}">
                ${premiumSortField === 'premiumRate' ? (premiumSortOrder === 'asc' ? '▲' : '▼') : '⇅'}
              </span>
            </th>
            <th>是否可以套利</th>
            <th>转仓推荐</th>
            <th>持有金额</th>
            <th>持有比例</th>
          </tr>
        </thead>
        <tbody>
          ${premiumLoading && !premiumRows.length
            ? `<tr><td colspan="13" class="premium-empty">正在获取实时行情...</td></tr>`
            : rows.map((row, index) => premiumRow(row, index + 1)).join("") || `<tr><td colspan="13" class="premium-empty">当前条件下暂无标的</td></tr>`}
        </tbody>
      </table>
    </div>
    <p class="premium-disclaimer">参考溢价率根据公开行情中的实时价格、IOPV、估算净值或最新净值计算，仅用于数据观察，不构成投资建议。跨境品种可能受时差、汇率及净值披露延迟影响。</p>
  </section>`;
}
