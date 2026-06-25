/**
 * 金融 OCR 模块
 * 处理图片选择、OCR识别、结果解析和导入
 */

/**
 * 处理图片选择事件
 * @param {Event} event - change 事件
 */
function handleFinanceImageSelection(event) {
  const file = event.currentTarget.files?.[0];
  setFinanceOcrFile(file);
}

/**
 * 设置 OCR 文件并更新预览
 * @param {File|null} file - 图片文件
 */
function setFinanceOcrFile(file) {
  const preview = document.querySelector("#financeOcrPreview");
  const status = document.querySelector("#financeOcrStatus");
  if (!file) {
    pendingFinanceOcrFile = null;
    return;
  }
  if (!file.type.startsWith("image/")) {
    status.textContent = "请选择 PNG、JPG 或 WebP 图片。";
    status.className = "finance-ocr-status error";
    return;
  }
  pendingFinanceOcrFile = file;
  pendingFinanceOcrResult = null;
  pendingFinanceOcrConfirmed = false;
  pendingFinanceOcrTransactions = [];
  pendingFinanceOcrAssets = [];
  pendingFinanceOcrRawText = "";
  pendingFinanceOcrUnassignedTransactions = [];
  renderFinanceOcrTransactionPreview();
  if (preview.dataset.objectUrl) URL.revokeObjectURL(preview.dataset.objectUrl);
  const objectUrl = URL.createObjectURL(file);
  preview.src = objectUrl;
  preview.dataset.objectUrl = objectUrl;
  status.textContent = "已选择持仓列表图，点击"识别列表并预览"。";
  status.className = "finance-ocr-status";
}

/**
 * 从剪贴板事件中获取图片
 * @param {ClipboardEvent} event - 粘贴事件
 * @returns {File|null} 图片文件
 */
function imageFromClipboard(event) {
  return Array.from(event.clipboardData?.items || [])
    .find((item) => item.type.startsWith("image/"))
    ?.getAsFile() || null;
}

/**
 * 处理 OCR 粘贴事件
 * @param {ClipboardEvent} event - 粘贴事件
 */
function handleFinanceOcrPaste(event) {
  const file = imageFromClipboard(event);
  if (!file) return;
  event.preventDefault();
  setFinanceOcrFile(new File([file], `clipboard-list-${Date.now()}.png`, { type: file.type || "image/png" }));
}

/**
 * 处理图片识别
 * @param {Event} event - 点击事件
 */
async function handleFinanceImageRecognition(event) {
  const form = document.querySelector("#financeAssetForm");
  const listFile = pendingFinanceOcrFile || form.elements.assetImage.files?.[0];
  const button = event.currentTarget;
  const status = document.querySelector("#financeOcrStatus");
  
  const selectedPlatform = {
    region: document.querySelector("#ocrPlatformRegion")?.value || "domestic",
    type: document.querySelector("#ocrPlatformType")?.value || "broker",
    name: document.querySelector("#ocrPlatformName")?.value || "",
  };
  
  if (!listFile) {
    status.textContent = "请先上传持仓列表图。";
    status.className = "finance-ocr-status error";
    return;
  }
  if (!window.Tesseract?.recognize) {
    status.textContent = "图文识别组件加载失败，请检查网络后刷新页面重试。";
    status.className = "finance-ocr-status error";
    return;
  }
  
  button.disabled = true;
  button.textContent = "正在识别...";
  status.className = "finance-ocr-status working";
  
  try {
    const listText = await recognizeImageText(listFile, (progress) => {
      status.textContent = `正在识别列表图片 ${progress}%`;
    });
    
    let listResult;
    if (selectedPlatform.name) {
      status.textContent = `正在使用 [${selectedPlatform.name}] 规则解析...`;
      listResult = parseFinanceOcrTextWithPlatform(listText, selectedPlatform);
    } else {
      listResult = parseFinanceOcrText(listText);
    }
    
    status.textContent = "正在校验证券代码并补全标准资料...";
    const extracted = await enrichFinanceOcrResult(listResult, (current, total) => {
      status.textContent = `正在补全证券资料 ${current}/${total}`;
    });
    pendingFinanceOcrResult = extracted;
    pendingFinanceOcrConfirmed = false;
    pendingFinanceOcrAssets = extracted.assets || [];
    pendingFinanceOcrTransactions = extracted.transactions || [];
    pendingFinanceOcrRawText = extracted.rawText || listText;
    pendingFinanceOcrUnassignedTransactions = extracted.unassignedTransactions || [];
    renderFinanceOcrResultPreview();
  } catch (err) {
    console.error(err);
    status.textContent = `识别失败：${err.message}`;
    status.className = "finance-ocr-status error";
  } finally {
    button.disabled = false;
    button.textContent = "识别列表并预览";
  }
}

/**
 * 解析 OCR 文本（通用方法）
 * @param {string} rawText - 原始识别文本
 * @returns {Object} 解析结果，包含 assets, transactions 等
 */
function parseFinanceOcrText(rawText) {
  const text = String(rawText || "")
    .replace(/[，]/g, ",")
    .replace(/[：]/g, ":")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/[^\S\r\n]+/g, " ");
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const { valueAfterLabel, numberAfterLabel } = createFinanceOcrLabelReaders(lines);
  const textMatch = (options) => options.find((option) => option && text.toLowerCase().includes(String(option).toLowerCase())) || "";
  const codeLabelValue = valueAfterLabel(["资产代码", "证券代码", "股票代码", "基金代码", "产品代码", "代码"]);
  const labeledCode = normalizeFinanceOcrCode(extractFinanceCodes(codeLabelValue)[0] || "");
  const nameLabelValue = valueAfterLabel(["资产名称", "证券名称", "股票名称", "基金名称", "产品名称", "名称"]);
  const labeledName = isFinanceOcrHeaderLine(nameLabelValue)
    ? ""
    : nameLabelValue.replace(/\s{2,}.*/, "").trim();
  const globalKind = inferFinanceOcrKind(text, labeledCode);
  const globalCurrency = inferFinanceOcrCurrency(text, labeledCode, globalKind);
  const accountName = textMatch(state.accounts.map((account) => account.name));
  const accountId = state.accounts.find((account) => account.name === accountName)?.id || "";
  const brokerRows = parseBrokerHoldingRows(lines);
  const isBrokerHoldingList = brokerRows.length > 0;
  const candidates = [...brokerRows, ...(isBrokerHoldingList ? [] : parseFinanceOcrTableRows(lines))].map((candidate) => {
    const kind = inferFinanceOcrKind(candidate.source, candidate.code);
    const currency = inferFinanceOcrCurrency(candidate.source, candidate.code, kind);
    return { ...candidate, kind, currency, market: currency === "CNH" ? "domestic" : "overseas", accountId };
  });

  if (!isBrokerHoldingList && (labeledCode || labeledName)) {
    candidates.push({
      kind: globalKind,
      currency: globalCurrency,
      market: globalCurrency === "CNH" ? "domestic" : "overseas",
      accountId,
      category: valueAfterLabel(["资产分类", "一级分类"]),
      subcategory: valueAfterLabel(["资产分类二级", "二级分类"]),
      tertiaryCategory: valueAfterLabel(["资产三级分类", "三级分类"]),
      positionCategory: valueAfterLabel(["仓位分类"]),
      name: labeledName || extractOcrAssetName(text, labeledCode),
      code: labeledCode,
      costPrice: numberAfterLabel(["持仓成本", "平均成本", "成本价", "成本单价"]),
      shares: numberAfterLabel(["持仓数量", "持有数量", "持有份额", "基金份额", "股票数量", "数量", "份额"]),
      pnl: numberAfterLabel(["浮动盈亏", "持仓盈亏", "累计盈亏", "盈亏", "盈亏额"]),
      currentValue: numberAfterLabel(["当前市值", "持仓市值", "当前价值", "市值"]),
      currentPrice: numberAfterLabel(["现价", "最新价", "当前价格", "市价", "最新价格"]),
      avgBuyPrice: numberAfterLabel(["买入均价", "持仓均价", "平均买入价", "成本均价"]),
      holdingDays: numberAfterLabel(["持仓天数", "持股天数", "天数"]),
      positionWeight: numberAfterLabel(["个股仓位", "仓位占比", "仓位", "占比"]),
      totalFees: numberAfterLabel(["税费合计", "税费", "费用合计", "总费用", "手续费合计"]),
      todayPnl: numberAfterLabel(["当日盈亏", "当日参考盈亏", "今日盈亏", "当天盈亏"]),
      source: "带标签字段",
      confidence: 0.92,
    });
  }

  if (!isBrokerHoldingList) lines.forEach((line) => {
    if (/买入|卖出|申购|赎回|交易日期|成交日期/i.test(line) || isFinanceOcrHeaderLine(line)) return;
    const codes = extractFinanceCodes(line);
    codes.forEach((code) => {
      const name = extractOcrAssetName(line, code);
      if (!name && /^[A-Z]{1,6}$/.test(code) && !/(股票|基金|证券|持仓|市值|成本|数量|盈亏)/.test(line)) return;
      const numbers = inferFinanceOcrNumbers(line, code);
      const kind = inferFinanceOcrKind(line, code);
      const currency = inferFinanceOcrCurrency(line, code, kind);
      candidates.push({
        kind,
        currency,
        market: currency === "CNH" ? "domestic" : "overseas",
        accountId,
        name,
        code,
        ...numbers,
        source: line,
        confidence: name ? 0.82 : 0.62,
      });
    });
  });

  let assets = mergeFinanceOcrCandidates(candidates).map((asset) => completeFinanceOcrAssetDefaults(asset));
  const transactions = parseFinanceTransactions(lines, valueAfterLabel, numberAfterLabel);
  assets = assets.filter((asset) => asset.code || asset.name);
  const unassignedTransactions = associateFinanceOcrTransactions(assets, transactions);
  return {
    assets,
    transactions,
    unassignedTransactions,
    rawText: text,
    ...(assets[0] || {}),
  };
}

/**
 * 根据平台解析 OCR 文本
 * @param {string} rawText - 原始识别文本
 * @param {Object} platform - 平台信息 {region, type, name}
 * @returns {Object} 解析结果
 */
function parseFinanceOcrTextWithPlatform(rawText, platform) {
  if (platform.name === "同花顺") {
    return parseTonghuashunOcrText(rawText);
  }
  if (platform.name === "东方财富") {
    return parseEastmoneyOcrText(rawText);
  }
  return parseFinanceOcrText(rawText);
}

/**
 * 解析同花顺 OCR 文本
 * @param {string} rawText - 原始识别文本
 * @returns {Object} 解析结果
 */
function parseTonghuashunOcrText(rawText) {
  // 同花顺特点：两行格式（名称+数值，市值+比例）
  return parseFinanceOcrText(rawText);
}

/**
 * 解析东方财富 OCR 文本
 * @param {string} rawText - 原始识别文本
 * @returns {Object} 解析结果
 */
function parseEastmoneyOcrText(rawText) {
  // 东方财富特定解析逻辑
  return parseFinanceOcrText(rawText);
}

/**
 * 获取 OCR 结果的字段列表
 * @param {Object} result - OCR 结果对象
 * @returns {Array<Array>} [[field, label], ...]
 */
function financeOcrResultFields(result) {
  return [
    ["market", "市场"], ["currency", "货币单位"], ["kind", "资产类型"], ["accountId", "所属账户"],
    ["category", "资产分类"], ["subcategory", "二级分类"], ["tertiaryCategory", "三级分类"],
    ["positionGroup", "仓位分组"], ["positionCategory", "仓位分类"], ["name", "资产名称"],
    ["code", "资产代码"], ["costPrice", "持仓成本"], ["shares", "份额/数量"], ["pnl", "浮动盈亏"],
    ["currentPrice", "现价"], ["avgBuyPrice", "买入均价"], ["holdingDays", "持仓天数"],
    ["positionWeight", "个股仓位"], ["totalFees", "税费合计"], ["todayPnl", "当日参考盈亏"],
  ].filter(([field]) => result[field] !== "" && result[field] !== null && result[field] !== undefined);
}

/**
 * 获取 OCR 预览值的显示格式
 * @param {string} field - 字段名
 * @param {*} value - 字段值
 * @returns {*} 格式化后的值
 */
function financeOcrPreviewValue(field, value) {
  if (field === "kind") return financeKindLabel(value);
  if (field === "market") return financeMarketLabel(value);
  if (field === "positionGroup") return financePositionGroupLabel(value);
  if (field === "accountId") return state.accounts.find((account) => account.id === value)?.name || value;
  return value;
}

/**
 * 渲染资产行
 * @param {Object} asset - 资产对象
 * @param {number} index - 索引
 * @returns {string} HTML 字符串
 */
function renderFinanceOcrAssetRow(asset, index) {
  const normalized = completeFinanceOcrAssetDefaults(asset);
  pendingFinanceOcrAssets[index] = normalized;
  const errors = validateFinanceOcrAsset(normalized);
  const invalidCount = Object.keys(errors).length;
  const categories = financeCategoryOptions(normalized.kind, normalized.category);
  const subcategories = financeSubcategoryOptions(normalized.kind);
  const tertiary = financeTertiaryOptions(normalized.kind, normalized.subcategory, normalized.tertiaryCategory);
  const groups = financePositionGroupOptions(normalized.kind);
  const positions = financePositionCategoryOptions(normalized.kind, normalized.positionGroup);
  const confidence = Number.isFinite(normalized.confidence) ? `${Math.round(normalized.confidence * 100)}%` : "-";
  const hasCandidates = Array.isArray(normalized.lookupCandidates) && normalized.lookupCandidates.length > 0;
  
  return `<tr class="${invalidCount ? "has-errors" : ""}">
    <td class="ocr-select-cell"><input type="checkbox" data-ocr-index="${index}" data-field="selected" ${normalized.selected !== false ? "checked" : ""} aria-label="选择第 ${index + 1} 行" /></td>
    <td>${financeOcrInput("name", normalized.name, index, errors)}</td>
    <td>${financeOcrInput("code", normalized.code, index, errors)}</td>
    <td>${financeOcrInput("currentValue", financeOcrFixed3(financeOcrAssetCurrentValue(normalized)), index, {}, "number", 'step="0.001" min="0"')}</td>
    <td>${financeOcrInput("shares", financeOcrFixed3(normalized.shares), index, errors, "number", 'step="0.001" min="0"')}</td>
    <td>${financeOcrInput("availableShares", financeOcrFixed3(normalized.availableShares), index, {}, "number", 'step="0.001" min="0"')}</td>
    <td>${financeOcrInput("currentPrice", financeOcrFixed3(normalized.currentPrice), index, {}, "number", 'step="0.001" min="0"')}</td>
    <td>${financeOcrInput("costPrice", financeOcrFixed3(normalized.costPrice), index, errors, "number", 'step="0.001" min="0"')}</td>
    <td>${financeOcrInput("pnl", financeOcrFixed3(normalized.pnl), index, errors, "number", 'step="0.001"')}</td>
    <td>${financeOcrInput("pnlPercent", financeOcrFixed3(normalized.pnlPercent), index, {}, "number", 'step="0.001"')}</td>
    <td><select class="${errors.kind ? "is-invalid" : ""}" data-ocr-index="${index}" data-field="kind">${ocrSelectOptions(["stock", "fund", "commodity", "futures", "options", "crypto", "cashflow", "custom"], normalized.kind, financeKindLabel)}</select></td>
    <td><select class="${errors.market ? "is-invalid" : ""}" data-ocr-index="${index}" data-field="market">${ocrSelectOptions(["domestic", "overseas"], normalized.market, financeMarketLabel)}</select></td>
    <td><select class="${errors.currency ? "is-invalid" : ""}" data-ocr-index="${index}" data-field="currency">${ocrSelectOptions(["CNH", "HKD", "USD", "EUR", "JPY", "GBP", "AUD", "SGD"], normalized.currency)}</select></td>
    <td><select class="${errors.accountId ? "is-invalid" : ""}" data-ocr-index="${index}" data-field="accountId">${ocrSelectOptions(state.accounts.map((account) => account.id), normalized.accountId, (id) => state.accounts.find((account) => account.id === id)?.name || id)}</select></td>
    <td><select class="${errors.category ? "is-invalid" : ""}" data-ocr-index="${index}" data-field="category">${ocrSelectOptions(categories, normalized.category)}</select></td>
    <td><select class="${errors.subcategory ? "is-invalid" : ""}" data-ocr-index="${index}" data-field="subcategory">${ocrSelectOptions(subcategories, normalized.subcategory)}</select></td>
    <td><select data-ocr-index="${index}" data-field="tertiaryCategory">${ocrSelectOptions(tertiary, normalized.tertiaryCategory || "未分类")}</select></td>
    <td><select class="${errors.positionGroup ? "is-invalid" : ""}" data-ocr-index="${index}" data-field="positionGroup">${ocrSelectOptions(groups, normalized.positionGroup, financePositionGroupLabel)}</select></td>
    <td><select class="${errors.positionCategory ? "is-invalid" : ""}" data-ocr-index="${index}" data-field="positionCategory">${ocrSelectOptions(positions, normalized.positionCategory)}</select></td>
    <td class="ocr-source-cell"><span title="${escapeAttr(normalized.source || "")}">${escapeHtml(normalized.source || "图片综合识别")}</span><small>置信度 ${confidence} · ${normalized.transactions?.length || 0} 笔交易${hasCandidates ? ` · ${normalized.lookupCandidates.length}个候选` : ""}</small></td>
    <td style="display:flex;gap:4px;">
      ${hasCandidates ? `<button type="button" class="icon-button primary" data-action="select-security-candidate" data-index="${index}" title="从候选列表中选择正确的证券">选择</button>` : ""}
      <button type="button" class="icon-button danger" data-action="remove-finance-ocr-asset" data-index="${index}" title="删除此候选">×</button>
    </td>
  </tr>`;
}

/**
 * 渲染 OCR 结果预览
 */
function renderFinanceOcrResultPreview() {
  const container = document.querySelector("#financeOcrTransactions");
  if (!container) return;
  const assets = pendingFinanceOcrAssets || [];
  container.hidden = assets.length === 0 && pendingFinanceOcrTransactions.length === 0 && !pendingFinanceOcrRawText;
  const validSelected = assets.filter((asset) => asset.selected !== false && Object.keys(validateFinanceOcrAsset(asset)).length === 0).length;
  container.innerHTML = `
    ${assets.length ? `<div class="ocr-preview-heading">
      <strong>资产候选（${assets.length} 项）</strong>
      <span>可直接编辑。红框字段补全前不能导入。</span>
    </div>
    <div class="ocr-assets-table-wrap">
      <table class="ocr-assets-table">
        <thead><tr>
          <th>选</th><th>名称</th><th>代码</th><th>市值</th><th>持仓</th><th>可用</th>
          <th>现价</th><th>成本</th><th>持仓盈亏</th><th>盈亏率%</th>
          <th>类型</th><th>市场</th><th>币种</th><th>账户</th>
          <th>资产分类</th><th>二级分类</th><th>三级分类</th><th>仓位分组</th><th>仓位分类</th>
          <th>识别来源</th><th>操作</th>
        </tr></thead>
        <tbody>${assets.map(renderFinanceOcrAssetRow).join("")}</tbody>
      </table>
    </div>` : `<p class="ocr-empty-result">没有识别到可导入的资产行。</p>`}
    ${pendingFinanceOcrTransactions.length ? `<details class="ocr-detail-block">
      <summary>交易明细（${pendingFinanceOcrTransactions.length} 笔）</summary>
      <div class="ocr-transaction-list">${pendingFinanceOcrTransactions.map((transaction) => `
        <span>${escapeHtml(transaction.assetName || transaction.assetCode || "未关联")} · ${transaction.date} · ${transaction.direction === "buy" ? "买入" : "卖出"} · ${financeOcrFixed3(transaction.shares)} × ${financeOcrFixed3(transaction.price)} · ${financeOcrFixed3(transaction.amount)}</span>
      `).join("")}</div>
    </details>` : ""}
    ${pendingFinanceOcrUnassignedTransactions.length ? `<p class="ocr-unassigned-warning">有 ${pendingFinanceOcrUnassignedTransactions.length} 笔交易无法关联到资产，暂不会导入。</p>` : ""}
    ${pendingFinanceOcrRawText ? `<details class="ocr-detail-block"><summary>查看原始识别文本</summary><pre>${escapeHtml(pendingFinanceOcrRawText)}</pre></details>` : ""}
    <div class="ocr-preview-actions">
      <button type="button" data-action="discard-finance-ocr">清除结果</button>
      <span>可导入 ${validSelected} 项</span>
      <button type="button" class="primary" data-action="confirm-finance-ocr" ${validSelected ? "" : "disabled"}>批量导入选中资产</button>
    </div>`;
}

/**
 * 处理预览输入事件
 * @param {Event} event - input 事件
 */
function handleFinanceOcrPreviewInput(event) {
  const index = Number(event.target.dataset.ocrIndex);
  const field = event.target.dataset.field;
  if (!Number.isInteger(index) || !field || !pendingFinanceOcrAssets[index]) return;
  const asset = pendingFinanceOcrAssets[index];
  if (field === "selected") {
    asset.selected = event.target.checked;
  } else if (["costPrice", "shares", "availableShares", "currentPrice", "pnl", "pnlPercent", "currentValue"].includes(field)) {
    const value = Number(event.target.value);
    asset[field] = Number.isFinite(value) ? value : null;
    if (field === "currentValue") {
      asset.currentValueSource = "ocr";
      asset.pnl = value - (Number(asset.costPrice) || 0) * (Number(asset.shares) || 0);
      asset.currentPrice = Number(asset.shares) > 0 ? value / Number(asset.shares) : asset.currentPrice;
    } else if (field === "currentPrice" || field === "shares") {
      asset.currentValue = (Number(asset.currentPrice) || 0) * (Number(asset.shares) || 0);
      asset.pnl = asset.currentValue - (Number(asset.costPrice) || 0) * (Number(asset.shares) || 0);
      asset.pnlPercent = Number(asset.costPrice) > 0
        ? ((Number(asset.currentPrice) || 0) - Number(asset.costPrice)) / Number(asset.costPrice) * 100
        : 0;
      asset.currentValueSource = "calculated";
    } else {
      asset.currentValue = (Number(asset.costPrice) || 0) * (Number(asset.shares) || 0) + (Number(asset.pnl) || 0);
      asset.pnlPercent = Number(asset.costPrice) > 0 && Number(asset.shares) > 0
        ? Number(asset.pnl) / (Number(asset.costPrice) * Number(asset.shares)) * 100
        : 0;
      asset.currentValueSource = "calculated";
    }
  } else {
    asset[field] = event.target.value;
  }
}

/**
 * 处理预览变更事件
 * @param {Event} event - change 事件
 */
function handleFinanceOcrPreviewChange(event) {
  handleFinanceOcrPreviewInput(event);
  const field = event.target.dataset.field;
  const index = Number(event.target.dataset.ocrIndex);
  if (!Number.isInteger(index) || !pendingFinanceOcrAssets[index]) return;
  const requiresRerender = ["kind", "market", "currency", "subcategory", "positionGroup", "selected"].includes(field);
  if (requiresRerender) {
    pendingFinanceOcrAssets[index] = completeFinanceOcrAssetDefaults(pendingFinanceOcrAssets[index], {}, true);
    renderFinanceOcrResultPreviewPreservingPosition(index, field);
  }
}

/**
 * 确认并导入 OCR 结果
 */
function confirmFinanceOcrResult() {
  const selected = pendingFinanceOcrAssets.filter((asset) => asset.selected !== false);
  const invalid = selected.filter((asset) => Object.keys(validateFinanceOcrAsset(asset)).length);
  const status = document.querySelector("#financeOcrStatus");
  if (!selected.length) {
    status.textContent = "请至少勾选一项资产。";
    status.className = "finance-ocr-status error";
    return;
  }
  if (invalid.length) {
    status.textContent = `还有 ${invalid.length} 项资产存在必填字段缺失或数值无效，请先修正红框字段。`;
    status.className = "finance-ocr-status error";
    renderFinanceOcrResultPreviewPreservingPosition();
    return;
  }
  let created = 0;
  let merged = 0;
  selected.forEach((asset, index) => {
    const payload = normalizeFinanceOcrPayload(asset, Date.now() + index);
    const existingIndex = state.financeAssets.findIndex((item) =>
      String(item.accountId) === String(payload.accountId)
      && normalizeFinanceOcrCode(item.code) === payload.code);
    if (existingIndex >= 0) {
      state.financeAssets[existingIndex] = mergeFinanceOcrAsset(state.financeAssets[existingIndex], payload);
      merged += 1;
    } else {
      if (payload.transactions.length) {
        const snapshot = { shares: payload.shares, costPrice: payload.costPrice };
        recalcAssetFromTransactions(payload);
        if (!(payload.shares > 0)) Object.assign(payload, snapshot);
      }
      state.financeAssets.unshift(payload);
      created += 1;
    }
  });
  const lastAsset = selected.at(-1);
  if (lastAsset) {
    const draftKind = lastAsset.kind || "stock";
    if (!state.financeAssetDrafts) state.financeAssetDrafts = {};
    state.financeAssetDrafts[draftKind] = { ...lastAsset };
    delete state.financeAssetDrafts[draftKind].transactions;
    delete state.financeAssetDrafts[draftKind].selected;
  }
  syncAssetClassValuesFromFinance();
  saveState();
  status.textContent = `导入完成：新增 ${created} 项，合并更新 ${merged} 项。`;
  status.className = "finance-ocr-status success";
  pendingFinanceOcrResult = null;
  pendingFinanceOcrAssets = [];
  pendingFinanceOcrTransactions = [];
  pendingFinanceOcrUnassignedTransactions = [];
  pendingFinanceOcrRawText = "";
  pendingFinanceOcrConfirmed = true;
  document.querySelector("#financeAssetDialog").close();
  render();
}

/**
 * 放弃 OCR 结果
 */
function discardFinanceOcrResult() {
  pendingFinanceOcrResult = null;
  pendingFinanceOcrAssets = [];
  pendingFinanceOcrTransactions = [];
  pendingFinanceOcrUnassignedTransactions = [];
  pendingFinanceOcrRawText = "";
  pendingFinanceOcrConfirmed = false;
  renderFinanceOcrTransactionPreview();
  const status = document.querySelector("#financeOcrStatus");
  status.textContent = "识别结果已清除，可重新识别当前图片。";
  status.className = "finance-ocr-status";
}

/**
 * 应用 OCR 结果到表单
 * @param {Object} result - OCR 结果对象
 * @returns {string[]} 已填充的字段列表
 */
function applyFinanceOcrResult(result) {
  const form = document.querySelector("#financeAssetForm");
  const fields = form.elements;
  const filled = [];
  if (result.kind) {
    fields.kind.value = result.kind;
    handleFinanceKindChange();
    filled.push("资产类型");
  }
  if (result.market) {
    fields.market.value = result.market;
    updateFinanceCurrencyOptions(result.currency);
    filled.push("市场");
  }
  if (result.currency) {
    fields.currency.value = result.currency;
    fields.market.value = result.currency === "CNH" ? "domestic" : "overseas";
    updateFinanceCurrencyOptions(result.currency);
    syncFinanceSubcategoryByCurrency(result.currency);
    updateFinanceCurrencyRate();
    filled.push("货币单位");
  }
  if (result.accountId && Array.from(fields.accountId.options).some((option) => option.value === result.accountId)) {
    fields.accountId.value = result.accountId;
    filled.push("所属账户");
  }
  if (result.category && Array.from(fields.category.options).some((option) => option.value === result.category)) {
    fields.category.value = result.category;
    filled.push("资产分类");
  }
  if (result.subcategory && Array.from(fields.subcategory.options).some((option) => option.value === result.subcategory)) {
    fields.subcategory.value = result.subcategory;
    updateFinanceTertiaryCategories(result.tertiaryCategory);
    filled.push("二级分类");
  }
  if (result.tertiaryCategory) {
    updateFinanceTertiaryCategories(result.tertiaryCategory);
    filled.push("三级分类");
  }
  if (result.positionGroup && Array.from(fields.positionGroup.options).some((option) => option.value === result.positionGroup)) {
    fields.positionGroup.value = result.positionGroup;
    updateFinancePositionCategories(result.positionCategory);
    filled.push("仓位分组");
  }
  if (result.positionCategory && Array.from(fields.positionCategory.options).some((option) => option.value === result.positionCategory)) {
    fields.positionCategory.value = result.positionCategory;
    filled.push("仓位分类");
  }
  [["name", "资产名称"], ["code", "资产代码"]].forEach(([field, label]) => {
    if (!result[field]) return;
    fields[field].value = result[field];
    filled.push(label);
  });
  [["costPrice", "持仓成本"], ["shares", "份额/数量"], ["pnl", "浮动盈亏"],
   ["currentPrice", "现价"], ["avgBuyPrice", "买入均价"], ["holdingDays", "持仓天数"],
   ["positionWeight", "个股仓位"], ["totalFees", "税费合计"], ["todayPnl", "当日参考盈亏"]].forEach(([field, label]) => {
    if (result[field] === null || !Number.isFinite(result[field])) return;
    fields[field].value = result[field];
    filled.push(label);
  });
  updateFinancePnlPercents(form);
  updateFinanceAssetPreview();
  saveFinanceAssetDraftFromForm();
  return filled;
}

/**
 * 辅助函数：创建 OCR 标签读取器
 * @param {string[]} lines - 文本行数组
 * @returns {Object} 包含 valueAfterLabel 和 numberAfterLabel 函数的对象
 */
function createFinanceOcrLabelReaders(lines) {
  const valueAfterLabel = (labels, scope = lines) => {
    const labelPattern = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    for (const line of scope) {
      const match = line.match(new RegExp(`(?:${labelPattern})\\s*[:：]?\\s*([^|]+)$`, "i"));
      if (match?.[1]) return match[1].trim();
    }
    return "";
  };
  const numberAfterLabel = (labels, scope = lines) => {
    const value = valueAfterLabel(labels, scope);
    const match = value.match(/[-+]?\d[\d,]*(?:\.\d+)?/);
    return match ? Number(match[0].replaceAll(",", "")) : null;
  };
  return { valueAfterLabel, numberAfterLabel };
}

/**
 * 判断是否为 OCR 表头行
 * @param {string} line - 文本行
 * @returns {boolean}
 */
function isFinanceOcrHeaderLine(line) {
  return /^(今日|昨日|当前|合计|总计|账户|资产|证券|股票|基金|持仓|市值|成本|数量|盈亏)/.test(line);
}

/**
 * 渲染交易预览（OCR 待同步交易）
 */
function renderFinanceOcrTransactionPreview() {
  const container = document.querySelector("#financeOcrTransactions");
  if (!container) return;
  container.hidden = pendingFinanceOcrTransactions.length === 0;
  container.innerHTML = pendingFinanceOcrTransactions.length
    ? `<strong>待同步交易明细（${pendingFinanceOcrTransactions.length} 笔）</strong>
      <div class="ocr-transaction-list">${pendingFinanceOcrTransactions.map((transaction) => `
        <span>${transaction.date} · ${transaction.direction === "buy" ? "买入" : "卖出"} · ${transaction.shares} × ${transaction.price} · ${transaction.amount.toFixed(2)}</span>
      `).join("")}</div>`
    : "";
}

/**
 * 获取资产当前市值
 * @param {Object} asset - 资产对象
 * @returns {number}
 */
function financeOcrAssetCurrentValue(asset) {
  if (Number.isFinite(Number(asset.currentValue)) && asset.currentValueSource === "ocr") return Number(asset.currentValue);
  return (Number(asset.costPrice) || 0) * (Number(asset.shares) || 0) + (Number(asset.pnl) || 0);
}

/**
 * 验证 OCR 资产数据
 * @param {Object} asset - 资产对象
 * @returns {Object} 错误信息 {field: errorMessage}
 */
function validateFinanceOcrAsset(asset) {
  const errors = {};
  [
    "market", "currency", "kind", "accountId", "category", "subcategory",
    "positionGroup", "positionCategory", "name", "code",
  ].forEach((field) => {
    if (!String(asset[field] || "").trim()) errors[field] = "必填";
  });
  if (!(Number(asset.costPrice) > 0)) errors.costPrice = "必须大于 0";
  if (!(Number(asset.shares) > 0)) errors.shares = "必须大于 0";
  if (!Number.isFinite(Number(asset.pnl))) errors.pnl = "必须是有效数字";
  return errors;
}

/**
 * 生成 OCR 输入框 HTML
 * @param {string} field - 字段名
 * @param {*} value - 值
 * @param {number} index - 索引
 * @param {Object} errors - 错误信息
 * @param {string} type - input 类型
 * @param {string} attributes - 额外属性
 * @returns {string} HTML 字符串
 */
function financeOcrInput(field, value, index, errors, type = "text", attributes = "") {
  const invalid = errors[field] ? " is-invalid" : "";
  return `<input class="ocr-cell-input${invalid}" data-ocr-index="${index}" data-field="${field}" type="${type}" value="${escapeAttr(value ?? "")}" ${attributes} title="${escapeAttr(errors[field] || "")}" />`;
}

/**
 * 四舍五入到 3 位小数
 * @param {number} value - 值
 * @returns {string}
 */
function financeOcrFixed3(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(3) : "";
}

/**
 * 生成选择框选项 HTML
 * @param {Array} values - 选项值数组
 * @param {*} current - 当前值
 * @param {Function} label - 标签函数
 * @returns {string} HTML 字符串
 */
function ocrSelectOptions(values, current, label = (value) => value) {
  return values.map((value) => `<option value="${escapeAttr(value)}" ${value === current ? "selected" : ""}>${escapeHtml(label(value))}</option>`).join("");
}

/**
 * 补全资产默认值
 * @param {Object} asset - 资产对象
 * @param {Object} formDefaults - 表单默认值
 * @param {boolean} preserveSelections - 是否保留选择
 * @returns {Object}
 */
function completeFinanceOcrAssetDefaults(asset = {}, formDefaults = {}, preserveSelections = false) {
  const form = document.querySelector("#financeAssetForm");
  const fields = form?.elements;
  const source = { ...formDefaults, ...asset };
  const kind = normalizeFinanceKind(source.kind || fields?.kind?.value || "stock");
  let currency = source.currency || fields?.currency?.value || inferFinanceOcrCurrency(source.source, source.code, kind);
  let market = source.market || fields?.market?.value || (currency === "CNH" ? "domestic" : "overseas");
  if (currency === "CNH") market = "domestic";
  else market = "overseas";
  if (market === "domestic") currency = "CNH";
  const subcategories = financeSubcategoryOptions(kind);
  let subcategory = source.subcategory;
  if (!preserveSelections || !subcategories.includes(subcategory)) {
    if (kind === "stock" && currency === "HKD") subcategory = "港股";
    else if (kind === "stock" && currency === "USD") subcategory = "美股";
    else if (kind === "stock" && currency === "CNH") subcategory = "A股";
    else subcategory = subcategories.includes(subcategory) ? subcategory : subcategories[0];
  }
  const groups = financePositionGroupOptions(kind);
  const positionGroup = groups.includes(source.positionGroup) ? source.positionGroup : groups[0];
  const positionCategories = financePositionCategoryOptions(kind, positionGroup);
  const categoryOptions = financeCategoryOptions(kind, source.category);
  const inferredCategory = inferFinanceAssetClass(kind);
  const costPrice = source.costPrice === null || source.costPrice === undefined ? null : Number(source.costPrice);
  const shares = source.shares === null || source.shares === undefined ? null : Number(source.shares);
  const pnl = source.pnl === null || source.pnl === undefined ? 0 : Number(source.pnl);
  const currentValue = source.currentValue === null || source.currentValue === undefined
    ? (Number(costPrice) || 0) * (Number(shares) || 0) + (Number(pnl) || 0)
    : Number(source.currentValue);
  return {
    ...source,
    selected: source.selected !== false,
    kind,
    market,
    currency,
    accountId: source.accountId || fields?.accountId?.value || state.accounts[0]?.id || "",
    category: categoryOptions.includes(source.category)
      ? source.category
      : categoryOptions.includes(inferredCategory)
        ? inferredCategory
        : categoryOptions[0],
    subcategory,
    tertiaryCategory: source.tertiaryCategory || inferBoardFromCode(source.code) || "未分类",
    positionGroup,
    positionCategory: positionCategories.includes(source.positionCategory) ? source.positionCategory : positionCategories[0],
    name: String(source.name || "").trim(),
    code: normalizeFinanceOcrCode(source.code),
    costPrice,
    shares,
    pnl: Number.isFinite(pnl) ? pnl : 0,
    currentValue: Number.isFinite(currentValue) ? currentValue : 0,
    currentValueSource: source.currentValueSource || (source.currentValue !== null && source.currentValue !== undefined ? "ocr" : "calculated"),
    availableShares: source.availableShares === null || source.availableShares === undefined ? shares : Number(source.availableShares),
    currentPrice: source.currentPrice === null || source.currentPrice === undefined ? null : Number(source.currentPrice),
    pnlPercent: source.pnlPercent === null || source.pnlPercent === undefined
      ? (Number(costPrice) > 0 ? (Number(pnl) / (Number(costPrice) * Number(shares) || 1)) * 100 : 0)
      : Number(source.pnlPercent),
    avgBuyPrice: source.avgBuyPrice === null || source.avgBuyPrice === undefined ? null : Number(source.avgBuyPrice),
    holdingDays: source.holdingDays === null || source.holdingDays === undefined ? null : Number(source.holdingDays),
    positionWeight: source.positionWeight === null || source.positionWeight === undefined ? null : Number(source.positionWeight),
    totalFees: source.totalFees === null || source.totalFees === undefined ? 0 : Number(source.totalFees),
    todayPnl: source.todayPnl === null || source.todayPnl === undefined ? 0 : Number(source.todayPnl),
    todayPnlPercent: source.todayPnlPercent === null || source.todayPnlPercent === undefined ? 0 : Number(source.todayPnlPercent),
    transactions: Array.isArray(source.transactions) ? source.transactions : [],
  };
}

/**
 * 保留位置重新渲染预览
 * @param {number|null} index - 要聚焦的行索引
 * @param {string} field - 要聚焦的字段
 */
function renderFinanceOcrResultPreviewPreservingPosition(index = null, field = "") {
  const form = document.querySelector("#financeAssetForm");
  const tableWrap = document.querySelector(".ocr-assets-table-wrap");
  const formScrollTop = form?.scrollTop || 0;
  const tableScrollLeft = tableWrap?.scrollLeft || 0;
  const tableScrollTop = tableWrap?.scrollTop || 0;
  renderFinanceOcrResultPreview();
  if (form) form.scrollTop = formScrollTop;
  const updatedWrap = document.querySelector(".ocr-assets-table-wrap");
  if (updatedWrap) {
    updatedWrap.scrollLeft = tableScrollLeft;
    updatedWrap.scrollTop = tableScrollTop;
  }
  if (Number.isInteger(index) && field) {
    const updatedField = document.querySelector(`[data-ocr-index="${index}"][data-field="${field}"]`);
    updatedField?.focus({ preventScroll: true });
  }
}

/**
 * 解析券商持仓列表行
 * @param {string[]} lines - 文本行数组
 * @returns {Object[]} 解析出的资产数组
 */
function parseBrokerHoldingRows(lines) {
  const rows = [];
  for (let index = 0; index < lines.length - 1; index += 1) {
    const line = lines[index];
    if (/^[^\d]*$/.test(line) && /(名称|市值|持仓|可用|现价|成本|盈亏|仓位|合计|总计)/.test(line)) continue;
    
    const nameMatch = line.match(/^([A-Za-z\u3400-\u9fff]+(?:\s*\d{6})?)\s+(?=[-+]?\d)/);
    if (!nameMatch) continue;
    
    let name = nameMatch[1].trim();
    let code = "";
    const codeMatch = name.match(/(\d{6})$/);
    if (codeMatch) {
      code = codeMatch[1];
      name = name.replace(/\s*\d{6}$/, "").trim();
    }
    
    if (!name || !/[\u3400-\u9fffA-Za-z]/.test(name)) continue;
    
    const primary = financeOcrNumericTokens(line.slice(nameMatch[0].length - 1));
    const secondary = financeOcrNumericTokens(lines[index + 1]);
    
    if (primary.length < 2 || secondary.length < 3) continue;
    
    const currentValue = secondary[0].value;
    const pnl = primary[0].value;
    const shares = primary[1].value;
    const costPrice = primary.length >= 3 ? primary[2].value : secondary[2].value;
    const availableShares = secondary.length >= 3 ? secondary[2].value : shares;
    const currentPrice = secondary.length >= 4 ? secondary[3].value : secondary[1].value;
    
    const pnlPercent = shares > 0 && costPrice > 0 
      ? (pnl / (costPrice * shares)) * 100 
      : (secondary.find((item, i) => i >= 1 && item.percent)?.value || 0);
    
    if (!(shares > 0) || !(currentValue > 0)) continue;
    
    rows.push({
      name,
      code,
      kind: "stock",
      market: "domestic",
      currency: "CNH",
      currentValue,
      currentValueSource: "ocr",
      shares,
      availableShares,
      currentPrice,
      costPrice,
      pnl,
      pnlPercent,
      todayPnl: 0,
      todayPnlPercent: 0,
      source: `券商持仓列表：${line} / ${lines[index + 1]}`,
      sourceType: "broker-holding-row",
      confidence: 0.96,
    });
    index += 1;
  }
  
  const merged = [];
  rows.forEach((row) => {
    const duplicate = merged.find((item) =>
      Math.abs(Number(item.currentValue) - Number(row.currentValue)) < 0.1
      && Math.abs(Number(item.shares) - Number(row.shares)) < 0.0001
      && Math.abs(Number(item.costPrice) - Number(row.costPrice)) < 0.0001);
    if (!duplicate) {
      merged.push(row);
      return;
    }
    const chineseCount = (value) => (String(value || "").match(/[\u3400-\u9fff]/g) || []).length;
    if (chineseCount(row.name) > chineseCount(duplicate.name)) duplicate.name = row.name;
    duplicate.source = [...new Set([duplicate.source, row.source])].join(" / ");
    duplicate.confidence = Math.max(duplicate.confidence || 0, row.confidence || 0);
  });
  if (merged.length > 1) merged.forEach((row) => { row.selected = false; });
  return merged;
}

/**
 * 解析通用 OCR 表格行
 * @param {string[]} lines - 文本行数组
 * @returns {Object[]} 资产数组
 */
function parseFinanceOcrTableRows(lines) {
  // 通用表格解析逻辑
  return [];
}
