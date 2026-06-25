function loadState() {
  const saved = localStorage.getItem("asset-platform-v18");
  return normalizeLoadedState(saved ? JSON.parse(saved) : structuredClone(seed));
}

function normalizeLoadedState(source) {
  const loaded = source || structuredClone(seed);
  loaded.user = { ...seed.user, ...loaded.user };
  loaded.assetClasses = normalizeAssetClasses(loaded.assetClasses);
  loaded.debts = loaded.debts || structuredClone(seed.debts);
  loaded.financeAssets = normalizeFinanceAssets(Array.isArray(loaded.financeAssets) ? loaded.financeAssets : structuredClone(seed.financeAssets), loaded.assetClasses);
  loaded.financeAssetDrafts = loaded.financeAssetDrafts || {};
  // 兼容旧版单草稿迁移
  if (loaded.financeAssetDraft && Object.keys(loaded.financeAssetDraft).length) {
    const oldKind = loaded.financeAssetDraft.kind || "stock";
    loaded.financeAssetDrafts[oldKind] = loaded.financeAssetDraft;
    delete loaded.financeAssetDraft;
  }
  loaded.feeConfig = { ...seed.feeConfig, ...(loaded.feeConfig || {}) };
  loaded.overviewGoals = { ...seed.overviewGoals, ...(loaded.overviewGoals || {}) };
  loaded.customCategories = normalizeCustomCategories(loaded.customCategories);
  loaded.recordTags = {
    tagsByCategory: { ...seed.recordTags.tagsByCategory, ...(loaded.recordTags?.tagsByCategory || {}) },
    lastByCategory: { ...seed.recordTags.lastByCategory, ...(loaded.recordTags?.lastByCategory || {}) },
  };
  loaded.recorders = Array.isArray(loaded.recorders) ? loaded.recorders : [];
  return loaded;
}

function normalizeCustomCategories(categories = {}) {
  const savedRecords = categories.records;
  const records = Array.isArray(savedRecords)
    ? { income: [], expense: savedRecords, transfer: [] }
    : { ...seed.customCategories.records, ...(savedRecords || {}) };
  const savedFinance = categories.finance;
  const finance = Array.isArray(savedFinance)
    ? { tertiaryByScope: {} }
    : { tertiaryByScope: {}, ...(savedFinance || {}) };
  finance.tertiaryByScope = finance.tertiaryByScope || {};
  return { ...seed.customCategories, ...categories, records, finance };
}

function normalizeAssetClasses(classes = []) {
  const baseById = new Map(seed.assetClasses.map((item) => [item.id, item]));
  const normalized = classes.map((item) => ({
    ...(baseById.get(item.id) || {}),
    ...item,
    name: fixedAssetClassNames[item.id] || item.name,
    expectedReturn: Number(item.expectedReturn) || 0,
  }));
  seed.assetClasses.forEach((item) => {
    if (!normalized.some((saved) => saved.id === item.id)) {
      normalized.push({ ...item, name: fixedAssetClassNames[item.id] || item.name, expectedReturn: 0 });
    }
  });
  return normalized;
}

function normalizeFinanceAssets(assets = [], classes = []) {
  const classNames = new Set(classes.map((item) => item.name));
  return assets.map((item) => {
    const kind = normalizeFinanceKind(item.kind);
    const market = item.market === "overseas" || ["HK", "US"].includes(item.market) ? "overseas" : "domestic";
    const currency = normalizeFinanceCurrency(item.currency, market);
    const category = classNames.has(item.category) ? item.category : inferFinanceAssetClass(kind);
    const subcategoryOptions = financeSubcategoryOptions(kind);
    const subcategory = subcategoryOptions.includes(item.subcategory) ? item.subcategory : subcategoryOptions[0];
    const positionGroup = normalizeFinancePositionGroup(item.positionGroup, kind);
    const positionOptions = financePositionCategoryOptions(kind, positionGroup);
    const savedPositionCategory = item.positionCategory === "持续股票" ? "吃息股票" : item.positionCategory;
    const positionCategory = positionOptions.includes(savedPositionCategory) ? savedPositionCategory : positionOptions[0];
    return { ...item, kind, market, currency, category, subcategory, tertiaryCategory: item.tertiaryCategory || "未分类", positionGroup, positionCategory, transactions: Array.isArray(item.transactions) ? item.transactions : [] };
  });
}

function normalizeFinanceKind(kind) {
  return ["stock", "fund", "commodity", "futures", "options", "crypto", "cashflow", "custom"].includes(kind) ? kind : "custom";
}

function inferFinanceAssetClass(kind) {
  return ({ stock: "权益类", fund: "权益类", commodity: "商品类", futures: "商品类", options: "权益类", crypto: "加密类", cashflow: "现金类", custom: "现金类" })[kind] || "现金类";
}

function saveState() {
  localStorage.setItem("asset-platform-v18", JSON.stringify(state));
  if (!isAuthenticated()) return;
  clearTimeout(stateSaveTimer);
  stateSaveTimer = setTimeout(() => {
    const snapshot = structuredClone(state);
    stateSaveInFlight = stateSaveInFlight
      .then(() => apiRequest("/state", { method: "PUT", body: { state: snapshot } }))
      .catch((error) => {
        console.error("数据库保存失败", error);
        showSyncStatus("数据暂未同步到服务器");
      });
  }, 180);
}

function financeAssetClassValue(className) {
  return (state.financeAssets || [])
    .filter((asset) => asset.category === className)
    .reduce((sum, asset) => sum + financeAssetValueRmb(asset), 0);
}

function syncAssetClassValuesFromFinance() {
  state.assetClasses.forEach((item) => {
    item.value = financeAssetClassValue(item.name);
  });
}
