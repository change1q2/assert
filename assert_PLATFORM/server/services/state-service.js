import { pool } from "../db/index.js";
import { sqlRun, sqlAll, sqlGet, maybeParseJson } from "../utils/db.js";
import { text, number, numericIfPossible } from "../utils/validators.js";
import { profileForUser } from "./user-service.js";

// 乱码匹配正则 - 覆盖菱形符、星号符、几何符号、货币符号及扩展拉丁补充区
const GARBLED_PATTERN = /[◇◆◇◈✦✧★☆●○□■△▽◎¤¦¨©®°±²³´µ¶·¸¹º»¼½¾¿À-ÿØ-ÿ\u25C0-\u25FF\u2600-\u26FF\u2700-\u27BF]/;
const VALID_MARKETS = ['国内市场', '港股市场', '美股市场', '其他市场'];
// 账户名清理：去除乱码字符，保留中文、英文、数字、连字符、下划线
const sanitizeAccountName = (val) => {
  if (val == null) return '';
  const str = String(val).trim();
  if (!str) return '';
  let cleaned = str.replace(GARBLED_PATTERN, '');
  cleaned = cleaned.replace(/[◇◆◇◈✦✧★☆●○□■△▽◎¤¦]+/g, '');
  cleaned = cleaned.replace(/\s*-+\s*-+\s*/g, ' - ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
};
const sanitizeStr = (val, fallback = '', isMarket = false) => {
  if (val == null) return fallback;
  const str = String(val).trim();
  if (!str) return fallback;
  if (GARBLED_PATTERN.test(str)) return fallback;
  if (isMarket && VALID_MARKETS.indexOf(str) === -1) return fallback;
  return val;
};

async function safeSqlAll(pool, sql, params = [], fallback = []) {
  try {
    return await sqlAll(pool, sql, params);
  } catch (e) {
    console.warn(`[state-service] Query failed (${sql.slice(0, 80)}...): ${e.message}`);
    return fallback;
  }
}

async function safeSqlGet(pool, sql, params = [], fallback = null) {
  try {
    return await sqlGet(pool, sql, params);
  } catch (e) {
    console.warn(`[state-service] Query failed (${sql.slice(0, 80)}...): ${e.message}`);
    return fallback;
  }
}

async function loadUserState(userId) {
  let profile;
  try {
    profile = await profileForUser(userId);
  } catch (e) {
    console.warn(`[state-service] profileForUser failed for user ${userId}: ${e.message}`);
    profile = null;
  }
  const rates = Object.fromEntries(
    (await safeSqlAll(pool, "SELECT currency, rate FROM exchange_rates WHERE user_id = ?", [userId]))
      .map((row) => [row.currency, row.rate])
  );
  const accounts = (await safeSqlAll(pool, "SELECT id, name, owner, owners_json, ownership_type, currency, type, balance, liability, enabled, is_default, sort_order, category, sub_category FROM accounts WHERE user_id = ? ORDER BY sort_order", [userId]))
    .map((row) => ({
      id: row.id, name: sanitizeAccountName(row.name), owner: row.owner,
      owners: maybeParseJson(row.owners_json, null),
      ownershipType: row.ownership_type || 'personal',
      currency: row.currency, type: row.type,
      balance: row.balance, liability: row.liability, enabled: Boolean(row.enabled), default: Boolean(row.is_default),
      category: row.category || '', subCategory: row.sub_category || '',
    }));
  const assetClasses = (await safeSqlAll(pool, "SELECT * FROM asset_classes WHERE user_id = ? ORDER BY sort_order", [userId])).map((row) => ({
    id: row.id, name: row.name, children: maybeParseJson(row.children_json), visible: Boolean(row.visible),
    value: row.value, openingValue: row.opening_value, targetValue: row.target_value,
    income: row.income, expense: row.expense, laborIncome: row.labor_income, color: row.color,
    expectedReturn: row.expected_return,
  }));
  const records = (await safeSqlAll(pool, "SELECT * FROM records WHERE user_id = ? ORDER BY record_date DESC, sort_order DESC", [userId])).map((row) => ({
    id: numericIfPossible(row.id), type: row.type, category: row.category, sub: row.subcategory,
    tag: row.tag, bookId: row.book_id || '', amount: row.amount, currency: row.currency, accountId: row.account_id,
    date: row.record_date, recorder: row.recorder, note: row.note, createdAt: row.created_at,
  }));
  const budgets = (await safeSqlAll(pool, "SELECT * FROM budgets WHERE user_id = ? ORDER BY sort_order", [userId])).map((row) => ({
    id: numericIfPossible(row.id), name: row.name, category: row.category, amount: row.amount, used: row.used,
  }));
  const indoorTransactionRows = await safeSqlAll(pool, "SELECT * FROM finance_asset_indoor_transactions WHERE user_id = ? ORDER BY sort_order", [userId]);
  const outdoorTransactionRows = await safeSqlAll(pool, "SELECT * FROM finance_asset_outdoor_transactions WHERE user_id = ? ORDER BY sort_order", [userId]);
  const legacyTransactionRows = await safeSqlAll(pool, "SELECT * FROM finance_asset_transactions WHERE user_id = ? ORDER BY sort_order", [userId]);

  const transactionsByAsset = new Map();

  const addTransaction = (row, isOutdoor = false) => {
    const rows = transactionsByAsset.get(String(row.asset_id)) || [];
    const [date, time] = (row.transaction_date || '').split(' ');
    rows.push({
      id: numericIfPossible(row.id),
      direction: row.direction,
      transaction_date: row.transaction_date,
      date: date || '',
      time: time || '',
      shares: isOutdoor ? row.shares : (row.shares || row.quantity),
      quantity: isOutdoor ? row.shares : (row.shares || row.quantity),
      price: isOutdoor ? row.net_value : row.price,
      net_value: isOutdoor ? row.net_value : row.price,
      amount: row.amount,
      commission: row.commission,
      fee: row.commission,
      stamp_duty: row.stamp_duty || 0,
      transfer_fee: row.transfer_fee || 0,
      transaction_type: isOutdoor ? 'outdoor' : 'indoor',
      cashAccountId: row.cash_account_id || '',
    });
    transactionsByAsset.set(String(row.asset_id), rows);
  };

  indoorTransactionRows.forEach(row => addTransaction(row, false));
  outdoorTransactionRows.forEach(row => addTransaction(row, true));
  legacyTransactionRows.forEach(row => addTransaction(row, false));

  const accountLookup = new Map();
  for (const acc of accounts) {
    accountLookup.set(String(acc.id), acc.name);
    accountLookup.set(String(acc.name), acc.name);
  }

  const financeAssets = (await safeSqlAll(pool, "SELECT id, kind, asset_kind, account_id, category, subcategory, tertiary_category, market, currency, name, code, position_group, position_category, cost_price, shares, quantity, available_shares, current_price, pnl, pnl_percent, cumulative_return, holding_pnl, holding_pnl_rate, cumulative_return_rate, price_manual_edit, force_binding, mf_historical_base, avg_buy_price, holding_days, position_weight, total_fees, today_pnl, today_pnl_percent, prev_price, price_date, tags, status, archive_date, sort_order FROM finance_assets WHERE user_id = ? ORDER BY sort_order", [userId])).map((row) => ({
    id: numericIfPossible(row.id), kind: row.kind, assetKind: row.asset_kind || '', accountId: row.account_id,
    account: accountLookup.get(String(row.account_id)) || row.account_id || '',
    category: row.category,
    subcategory: row.subcategory, tertiaryCategory: row.tertiary_category, market: row.market,
    currency: row.currency, name: row.name, code: row.code, positionGroup: row.position_group,
    positionCategory: row.position_category, positionType: row.position_category, costPrice: row.cost_price, shares: row.shares,
    quantity: row.quantity ?? row.shares, availableShares: row.available_shares, currentPrice: row.current_price, pnl: row.pnl,
    pnlPercent: row.pnl_percent, avgBuyPrice: row.avg_buy_price, holdingDays: row.holding_days,
    positionWeight: row.position_weight, totalFees: row.total_fees, todayPnl: row.today_pnl,
    todayPnlPercent: row.today_pnl_percent, prevPrice: row.prev_price, priceDate: row.price_date,
    cumulativeReturn: row.cumulative_return != null ? row.cumulative_return : null,
    cumulativePnl: row.cumulative_return != null ? row.cumulative_return : null,
    holdingPnl: row.holding_pnl != null ? row.holding_pnl : null,
    holdingPnlRate: row.holding_pnl_rate != null ? row.holding_pnl_rate : null,
    cumulativeReturnRate: row.cumulative_return_rate != null ? row.cumulative_return_rate : null,
    priceManualEdit: row.price_manual_edit === 1 || row.price_manual_edit === true,
    forceBinding: row.force_binding === 1 || row.force_binding === true,
    _mfHistoricalBase: row.mf_historical_base != null ? row.mf_historical_base : null,
    tags: row.tags || '', status: row.status || 'active', archiveDate: row.archive_date || '',
    transactions: transactionsByAsset.get(String(row.id)) || [],
  }));
  const financeAssetArchives = (await safeSqlAll(pool, "SELECT * FROM finance_asset_archives WHERE user_id = ? ORDER BY archive_date DESC", [userId])).map((row) => ({
    id: numericIfPossible(row.id), originalAssetId: row.original_asset_id, name: row.name, code: row.code,
    market: row.market, currency: row.currency, kind: row.kind, category: row.category,
    subcategory: row.subcategory, tertiaryCategory: row.tertiary_category,
    accountId: row.account_id,
    account: accountLookup.get(String(row.account_id)) || row.account_id || '',
    costPrice: row.cost_price, shares: row.shares,
    finalPnl: row.final_pnl, finalPnlPercent: row.final_pnl_percent,
    archiveDate: row.archive_date, status: row.status,
  }));
  const customRecords = { income: [], expense: [], transfer: [] };
  (await safeSqlAll(pool, "SELECT record_type, name, icon FROM custom_record_categories WHERE user_id = ? ORDER BY sort_order", [userId]))
    .forEach((row) => (customRecords[row.record_type] ||= []).push({ name: row.name, icon: row.icon || '' }));
  const tertiaryByScope = {};
  (await safeSqlAll(pool, "SELECT scope, name FROM finance_tertiary_categories WHERE user_id = ? ORDER BY sort_order", [userId]))
    .forEach((row) => (tertiaryByScope[row.scope] ||= []).push(row.name));
  const books = (await safeSqlAll(pool, "SELECT * FROM books WHERE user_id = ? ORDER BY sort_order", [userId])).map((row) => ({
    id: row.id, name: row.name, icon: row.icon, color: row.color, tags: maybeParseJson(row.tags_json) || [], createdAt: row.created_at,
  }));
  const tags = (await safeSqlAll(pool, "SELECT * FROM tags WHERE user_id = ? ORDER BY sort_order", [userId])).map((row) => ({
    id: row.id, name: row.name, color: row.color, createdAt: row.created_at,
  }));
  const recordTagList = (await safeSqlAll(pool, "SELECT record_id, tag_id FROM record_tags WHERE user_id = ?", [userId])).map((row) => ({
    recordId: row.record_id, tagId: row.tag_id,
  }));
  const oldRecordTags = { tagsByCategory: {}, lastByCategory: {} };
  try {
    (await sqlAll(pool, "SELECT category, tag, is_last FROM record_tags_old WHERE user_id = ? ORDER BY sort_order", [userId])).forEach((row) => {
      (oldRecordTags.tagsByCategory[row.category] ||= []).push(row.tag);
      if (row.is_last) oldRecordTags.lastByCategory[row.category] = row.tag;
    });
  } catch (e) {
    // record_tags_old 表可能不存在，忽略
  }
  const recorders = (await safeSqlAll(pool, "SELECT name FROM recorders WHERE user_id = ? ORDER BY sort_order", [userId])).map((row) => row.name);
  const reminders = (await safeSqlAll(pool, "SELECT * FROM reminders WHERE user_id = ? ORDER BY reminder_date", [userId])).map((row) => ({
    id: row.id, date: row.reminder_date, title: row.title, type: row.type,
  }));
  const debts = (await safeSqlAll(pool, "SELECT * FROM debts WHERE user_id = ? ORDER BY sort_order", [userId])).map(async (row) => {
    let payments = {};
    try {
      payments = Object.fromEntries(
        (await sqlAll(pool, "SELECT period, status FROM debt_payments WHERE user_id = ? AND debt_id = ?", [userId, row.id]))
          .map((payment) => [payment.period, payment.status === 1 || payment.status === true || payment.status === 'true' ? true : false])
      );
    } catch (e) {
      console.warn(`[state-service] debt_payments query failed for debt ${row.id}: ${e.message}`);
    }
    return {
      id: numericIfPossible(row.id), category: row.category, type: row.type, debtCategory: row.debt_category, name: row.name,
      creditor: row.creditor_name, debtor: row.debtor_name, creditorName: row.creditor_name, debtorName: row.debtor_name,
      account: row.account || '',
      principal: row.principal,
      annualRate: row.annual_rate, amount: row.amount, currency: row.currency || 'CNY', paidAmount: row.paid_amount,
      note: row.note, attachment: row.attachment, startDate: row.start_date, dueDate: row.due_date,
      repaymentMethod: row.repayment_method, payments,
      penaltyInterest: row.penalty_interest || 0,
      status: row.status || 'normal',
      investmentDays: row.investment_days || 365,
      periodPenalties: maybeParseJson(row.period_penalties_json) || {},
    };
  });
  const resolvedDebts = await Promise.all(debts);
  const debtCategories = (await safeSqlAll(pool, "SELECT * FROM debt_categories WHERE user_id = ? ORDER BY sort_order", [userId])).map((row) => ({
    id: row.id, name: row.name, sortOrder: row.sort_order,
  }));
  const settings = await safeSqlGet(pool, "SELECT finance_asset_draft_json, fee_config_json, overview_goals_json, hk_ipo_rules_json, independent_assets_json, account_categories_json, strategies_json FROM user_settings WHERE user_id = ?", [userId]);
  
  // 优先从 strategies_json 读取新格式，否则从旧 strategies 表迁移
  let strategies;
  if (settings?.strategies_json) {
    strategies = maybeParseJson(settings.strategies_json);
  } else {
    const oldStrategies = (await safeSqlAll(pool, "SELECT * FROM strategies WHERE user_id = ? ORDER BY id", [userId])).map((row) => ({
      id: row.id, name: row.name, active: Boolean(row.active), target: row.target,
      allocation: maybeParseJson(row.allocation_json), debtLimit: row.debt_limit,
      annualReturn: row.annual_return, risk: row.risk,
    }));
    // 转换旧格式为新格式
    if (oldStrategies.length > 0) {
      strategies = {
        list: oldStrategies.map(s => ({
          id: String(s.id),
          title: s.name,
          description: s.target || '',
          icon: 'Lightbulb',
          color: 'gray',
          preset: false,
          philosophies: [],
        })),
        pools: {},
      };
    } else {
      strategies = { list: [], pools: {} };
    }
  }
  const yearlyRecords = (await safeSqlAll(pool, "SELECT year, opening_asset, closing_asset, target_profit, actual_profit FROM yearly_records WHERE user_id = ? ORDER BY year", [userId])).map((row) => ({
    year: row.year,
    openingAsset: row.opening_asset,
    closingAsset: row.closing_asset,
    targetProfit: row.target_profit,
    actualProfit: row.actual_profit,
  }));
  const survivalFunds = (await safeSqlAll(pool, "SELECT id, name, type, currency, amount, account_id, cost_basis, sort_order, metadata_json FROM survival_funds WHERE user_id = ? ORDER BY sort_order", [userId])).map((row) => ({
    id: numericIfPossible(row.id),
    name: row.name,
    type: row.type,
    currency: row.currency || 'CNY',
    amount: Number(row.amount) || 0,
    accountId: row.account_id || null,
    costBasis: Number(row.cost_basis) || 0,
    metadata: maybeParseJson(row.metadata_json) || null,
  }));
  const freedomBudgets = (await safeSqlAll(pool, "SELECT id, name, category, period_type, budget_amount, actual_amount, sort_order, metadata_json FROM freedom_budgets WHERE user_id = ? ORDER BY sort_order", [userId])).map((row) => ({
    id: numericIfPossible(row.id),
    name: row.name,
    category: row.category,
    periodType: row.period_type || 'monthly',
    budgetAmount: Number(row.budget_amount) || 0,
    actualAmount: Number(row.actual_amount) || 0,
    metadata: maybeParseJson(row.metadata_json) || null,
  }));
  const result = {
    user: profile,
    rates,
    accounts,
    assetClasses,
    records,
    budgets,
    financeAssets,
    financeAssetArchives,
    customCategories: { records: customRecords, finance: { tertiaryByScope } },
    recordTags: oldRecordTags,
    books,
    tags,
    recordTagList,
    recorders,
    reminders,
    debts: resolvedDebts,
    debtCategories,
    strategies,
    financeAssetDraft: settings ? maybeParseJson(settings.finance_asset_draft_json) : {},
    feeConfig: settings ? maybeParseJson(settings.fee_config_json) : undefined,
    overviewGoals: settings ? maybeParseJson(settings.overview_goals_json) : undefined,
    hkIpoRules: settings ? maybeParseJson(settings.hk_ipo_rules_json) : undefined,
    independentAssets: settings ? maybeParseJson(settings.independent_assets_json) || {} : {},
    yearlyRecords,
    accountCategories: settings ? maybeParseJson(settings.account_categories_json) || {} : {},
    survivalFunds,
    freedomBudgets,
  };

  // 清理 financeAssets 中的乱码字段（sanitizeStr 已移至模块作用域）
  if (result.financeAssets && result.financeAssets.length > 0) {
    result.financeAssets = result.financeAssets.map(a => {
      const sanitizedName = sanitizeStr(a.name);
      const sanitizedMarket = sanitizeStr(a.market, '国内市场', true);
      const sanitizedAssetKind = sanitizeStr(a.assetKind);
      const sanitizedCategory = sanitizeStr(a.category);
      const sanitizedSubcategory = sanitizeStr(a.subcategory);
      const sanitizedTertiary = sanitizeStr(a.tertiaryCategory);
      // 如果乱码清理后名称为空，用 code 兜底；最后仍为空则保留原始值（避免整行名称被清空导致列表"看起来没数据"）
      const finalName = sanitizedName || (a.code ? `(代码 ${a.code})` : a.name);
      if (!sanitizedName) {
        console.warn(`[state-service] financeAsset id=${a.id} name sanitized empty, fallback finalName=`, finalName, `raw=`, String(a.name||'').slice(0,80));
      }
      return {
        ...a,
        name: finalName,
        market: sanitizedMarket,
        assetKind: sanitizedAssetKind,
        category: sanitizedCategory,
        subcategory: sanitizedSubcategory,
        tertiaryCategory: sanitizedTertiary,
      };
    });
  }

  return result;
}

async function saveUserState(conn, userId, state) {
  const user = state.user || {};

  // 安全检查：防止数据被意外清空
  // 场景1: 如果 state 基本为空（无任何实质数据），且数据库有数据，拒绝保存
  const coreTables = ['accounts', 'records', 'finance_assets', 'debts', 'asset_classes'];
  const stateCounts = {
    accounts: (state.accounts || []).length,
    records: (state.records || []).length,
    financeAssets: (state.financeAssets || []).length,
    debts: (state.debts || []).length,
    assetClasses: (state.assetClasses || []).length,
    independentAssets: state.independentAssets ? Object.values(state.independentAssets).flat().length : 0,
  };
  const totalStateItems = Object.values(stateCounts).reduce((a, b) => a + b, 0);

  const hasAnyCoreData = totalStateItems > 0;
  const hasCriticalData = stateCounts.records > 0 || stateCounts.financeAssets > 0 || stateCounts.debts > 0 || stateCounts.independentAssets > 0;

  // 检查数据库中现有的数据量
  let existingCounts = null;
  try {
    const countRows = {};
    for (const table of coreTables) {
      const [rows] = await conn.execute(`SELECT COUNT(*) as cnt FROM ${table} WHERE user_id = ?`, [userId]);
      countRows[table] = rows[0].cnt;
    }
    const totalExisting = Object.values(countRows).reduce((a, b) => a + b, 0);

    // 如果数据库有大量数据，但提交的状态几乎没有数据，可能是加载出了问题
    if (totalExisting > 0 && totalStateItems === 0) {
      console.warn(`[state-service] 用户 ${userId} 保存的状态完全为空但数据库有 ${totalExisting} 条数据，跳过保存`);
      throw new Error('DATA_LOSS_PREVENTION: state is empty but database has data');
    }

    // 如果数据库有记录/资产/债务数据，但提交的状态中这些都为空，且缺少关键模块数据，则拒绝保存
    const hasExistingCritical = countRows.records > 0 || countRows.finance_assets > 0 || countRows.debts > 0;
    if (hasExistingCritical && !hasCriticalData && stateCounts.accounts === 0) {
      console.warn(`[state-service] 用户 ${userId} 保存的状态中关键数据(records/assets/debts)为空但数据库有数据，跳过保存以防止数据丢失`);
      throw new Error('DATA_LOSS_PREVENTION: critical data missing from state but exists in database');
    }
  } catch (e) {
    if (e.message && e.message.startsWith('DATA_LOSS_PREVENTION')) {
      throw e;
    }
    console.warn(`[state-service] 无法检查现有数据量: ${e.message}`);
  }

  const previousSettings = await sqlGet(conn, "SELECT hk_ipo_rules_json, independent_assets_json, finance_asset_draft_json, fee_config_json, overview_goals_json, account_categories_json, strategies_json FROM user_settings WHERE user_id = ?", [userId]);
  await sqlRun(conn, `
    UPDATE user_profiles SET name=?, phone=?, email=?, currency=?, theme=?, avatar=?, birthday=?, city=?,
    occupation=?, risk_level=?, privacy_lock=?, data_mask=?, device_name=? WHERE user_id=?
  `, [text(user.name), text(user.phone), text(user.email), text(user.currency || "CNY"), text(user.theme || "light"),
    text(user.avatar), text(user.birthday), text(user.city), text(user.occupation), text(user.riskLevel || "稳健型"),
    text(user.privacyLock || "已开启"), text(user.dataMask || "已开启"), text(user.deviceName), userId]);

  const tables = [
    "exchange_rates", "accounts", "asset_classes", "records", "budgets", "finance_asset_transactions", "finance_asset_indoor_transactions", "finance_asset_outdoor_transactions", "finance_assets", "finance_asset_archives",
    "custom_record_categories", "finance_tertiary_categories", "record_tags", "recorders",
    "reminders", "debt_payments", "debts", "debt_categories", "strategies", "user_settings", "books", "tags", "yearly_records",
    "survival_funds", "freedom_budgets",
  ];

  // Map tables to their corresponding state keys
  const tableStateMap = {
    "exchange_rates": "rates",
    "accounts": "accounts",
    "asset_classes": "assetClasses",
    "records": "records",
    "budgets": "budgets",
    "finance_asset_transactions": "financeAssetTransactions",
    "finance_asset_indoor_transactions": "financeAssetIndoorTransactions",
    "finance_asset_outdoor_transactions": "financeAssetOutdoorTransactions",
    "finance_assets": "financeAssets",
    "finance_asset_archives": "financeAssetArchives",
    "custom_record_categories": "customRecordCategories",
    "finance_tertiary_categories": "financeTertiaryCategories",
    "record_tags": "recordTags",
    "recorders": "recorders",
    "reminders": "reminders",
    "debt_payments": "debtPayments",
    "debts": "debts",
    "debt_categories": "debtCategories",
    "strategies": "strategies",
    "user_settings": "__always_delete__", // Always delete user_settings (handled specially)
    "books": "books",
    "tags": "tags",
    "yearly_records": "yearlyRecords",
    "survival_funds": "survivalFunds",
    "freedom_budgets": "freedomBudgets",
  };

  // Force delete transaction tables and child tables that are embedded in parent records
  const forceDeleteTables = ["finance_asset_indoor_transactions", "finance_asset_outdoor_transactions", "finance_asset_archives", "debt_payments"];
  for (const table of forceDeleteTables) {
    await sqlRun(conn, `DELETE FROM ${table} WHERE user_id = ?`, [userId]);
  }

  for (const table of tables) {
    const stateKey = tableStateMap[table];
    // Only delete if the state has explicit data for this table, or it's user_settings
    if (stateKey === "__always_delete__" || state[stateKey] !== undefined) {
      await sqlRun(conn, `DELETE FROM ${table} WHERE user_id = ?`, [userId]);
    }
  }

  for (const [currency, rate] of Object.entries(state.rates || {})) {
    await sqlRun(conn, "INSERT INTO exchange_rates (user_id, currency, rate) VALUES (?, ?, ?)", [userId, currency, number(rate)]);
  }

  for (const row of (state.accounts || [])) {
    const cleanedName = sanitizeAccountName(row.name);
    await sqlRun(conn, `INSERT INTO accounts (user_id, id, name, owner, owners_json, ownership_type, currency, type, balance, liability, enabled, is_default, sort_order, category, sub_category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, text(row.id), text(cleanedName || row.name), text(row.owner),
       row.owners ? JSON.stringify(row.owners) : null,
       text(row.ownershipType || 'personal'),
       text(row.currency), text(row.type),
       number(row.balance), number(row.liability), row.enabled === false ? 0 : 1, row.default ? 1 : 0,
       (state.accounts || []).indexOf(row), text(row.category), text(row.subCategory)]);
  }

  for (const [index, row] of (state.assetClasses || []).entries()) {
    await sqlRun(conn, `INSERT INTO asset_classes
      (user_id, id, name, children_json, visible, value, opening_value, target_value, income, expense, labor_income, color, expected_return, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, text(row.id), text(row.name), JSON.stringify(row.children || []),
       row.visible === false ? 0 : 1, number(row.value), number(row.openingValue),
       number(row.targetValue), number(row.income), number(row.expense),
       number(row.laborIncome), text(row.color || "#539f8d"), number(row.expectedReturn), index]);
  }

  for (const [index, row] of (state.records || []).entries()) {
    await sqlRun(conn, `INSERT INTO records
      (user_id, id, type, category, subcategory, tag, book_id, amount, currency, account_id, record_date, recorder, note, created_at, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, text(row.id), text(row.type), text(row.category), text(row.sub), text(row.tag),
       text(row.bookId || ''), number(row.amount), text(row.currency), text(row.accountId), text(row.date),
       text(row.recorder), text(row.note), text(row.createdAt), index]);
  }

  for (const [index, row] of (state.budgets || []).entries()) {
    await sqlRun(conn, `INSERT INTO budgets (user_id, id, name, category, amount, used, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, text(row.id), text(row.name), text(row.category), number(row.amount), number(row.used), index]);
  }

  for (const [index, row] of (state.financeAssets || []).entries()) {
    await sqlRun(conn, `INSERT INTO finance_assets
      (user_id, id, kind, asset_kind, account_id, category, subcategory, tertiary_category, market, currency, name, code, position_group, position_category, cost_price, shares, quantity, available_shares, current_price, pnl, pnl_percent, cumulative_return, holding_pnl, holding_pnl_rate, cumulative_return_rate, price_manual_edit, force_binding, mf_historical_base, avg_buy_price, holding_days, position_weight, total_fees, today_pnl, today_pnl_percent, prev_price, price_date, tags, status, archive_date, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, text(row.id), text(row.kind), text(row.assetKind), text(row.accountId), text(row.category),
       text(row.subcategory), text(row.tertiaryCategory), text(row.market), text(row.currency),
       text(row.name), text(row.code), text(row.positionGroup), text(row.positionType || row.positionCategory),
       number(row.costPrice), number(row.shares), number(row.quantity ?? row.shares), number(row.availableShares), number(row.currentPrice),
       number(row.pnl), number(row.pnlPercent),
       row.cumulativeReturn != null ? number(row.cumulativeReturn) : null,
       row.holdingPnl != null ? number(row.holdingPnl) : null,
       row.holdingPnlRate != null ? number(row.holdingPnlRate) : null,
       row.cumulativeReturnRate != null ? number(row.cumulativeReturnRate) : null,
       (row.priceManualEdit === true || row.priceManualEdit === 'true') ? 1 : 0,
       (row.forceBinding === true || row.forceBinding === 'true') ? 1 : 0,
       row._mfHistoricalBase != null ? number(row._mfHistoricalBase) : null,
       number(row.avgBuyPrice), number(row.holdingDays),
       number(row.positionWeight), number(row.totalFees), number(row.todayPnl), number(row.todayPnlPercent),
       number(row.prevPrice), text(row.priceDate), text(row.tags), text(row.status || 'active'), text(row.archiveDate || ''), index]);

    const _positionCategory = row.positionType || row.positionCategory || '';
    const isOutdoor = (row.market === '国内市场') && (row.tertiaryCategory === '场外' || row.categoryL3 === '场外' || _positionCategory === '货币基金');

    for (const [transactionIndex, transaction] of (row.transactions || []).entries()) {
      if (isOutdoor) {
        await sqlRun(conn, `INSERT INTO finance_asset_outdoor_transactions
          (user_id, asset_id, id, direction, transaction_date, net_value, shares, amount, commission, cash_account_id, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, text(row.id), text(transaction.id || `${row.id}-${transactionIndex}`), text(transaction.direction),
           text(transaction.transaction_date), number(transaction.net_value || transaction.price),
           number(transaction.shares || transaction.quantity), number(transaction.amount),
           number(transaction.commission), text(transaction.cashAccountId || ''), transactionIndex]);
      } else {
        await sqlRun(conn, `INSERT INTO finance_asset_indoor_transactions
          (user_id, asset_id, id, direction, transaction_date, price, quantity, amount, commission, stamp_duty, transfer_fee, cash_account_id, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, text(row.id), text(transaction.id || `${row.id}-${transactionIndex}`), text(transaction.direction),
           text(transaction.transaction_date), number(transaction.price),
           number(transaction.quantity || transaction.shares), number(transaction.amount),
           number(transaction.commission), number(transaction.stampDuty), number(transaction.transferFee),
           text(transaction.cashAccountId || ''), transactionIndex]);
      }
    }
  }

  for (const [index, row] of (state.financeAssetArchives || []).entries()) {
    await sqlRun(conn, `INSERT INTO finance_asset_archives
      (user_id, original_asset_id, name, code, market, currency, kind, category, subcategory, tertiary_category,
       account_id, cost_price, shares, final_pnl, final_pnl_percent, archive_date, status, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, text(row.originalAssetId), text(row.name), text(row.code), text(row.market), text(row.currency),
       text(row.kind), text(row.category), text(row.subcategory), text(row.tertiaryCategory),
       text(row.accountId), number(row.costPrice), number(row.shares), number(row.finalPnl),
       number(row.finalPnlPercent), text(row.archiveDate), text(row.status), index]);
  }

  let catOrder = 0;
  for (const [type, items] of Object.entries(state.customCategories?.records || {})) {
    for (const item of (items || [])) {
      const name = typeof item === 'string' ? item : item.name;
      const icon = typeof item === 'string' ? '' : (item.icon || '');
      await sqlRun(conn, "INSERT INTO custom_record_categories (user_id, record_type, name, icon, sort_order) VALUES (?, ?, ?, ?, ?)",
        [userId, type, text(name), text(icon), catOrder++]);
    }
  }
  let tertOrder = 0;
  for (const [scope, names] of Object.entries(state.customCategories?.finance?.tertiaryByScope || {})) {
    for (const name of (names || [])) {
      await sqlRun(conn, "INSERT INTO finance_tertiary_categories (user_id, scope, name, sort_order) VALUES (?, ?, ?, ?)",
        [userId, scope, text(name), tertOrder++]);
    }
  }

  for (const [index, row] of (state.books || []).entries()) {
    await sqlRun(conn, `INSERT INTO books (user_id, id, name, icon, color, tags_json, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, text(row.id), text(row.name), text(row.icon || ''), text(row.color || ''), JSON.stringify(row.tags || []), index]);
  }

  for (const [index, row] of (state.tags || []).entries()) {
    await sqlRun(conn, `INSERT INTO tags (user_id, id, name, color, sort_order)
      VALUES (?, ?, ?, ?, ?)`,
      [userId, text(row.id), text(row.name), text(row.color || ''), index]);
  }

  for (const row of (state.recordTagList || [])) {
    await sqlRun(conn, "INSERT INTO record_tags (user_id, record_id, tag_id) VALUES (?, ?, ?)",
      [userId, text(row.recordId), Number(row.tagId)]);
  }
  for (const [index, name] of (state.recorders || []).entries()) {
    await sqlRun(conn, "INSERT INTO recorders (user_id, name, sort_order) VALUES (?, ?, ?)", [userId, text(name), index]);
  }

  for (const [index, row] of (state.reminders || []).entries()) {
    await sqlRun(conn, "INSERT INTO reminders (user_id, id, reminder_date, title, type) VALUES (?, ?, ?, ?, ?)",
      [userId, Number(row.id) || index + 1, text(row.date), text(row.title), text(row.type)]);
  }

  let debtOrder = 0;
  for (const row of (state.debts || [])) {
    const debtId = text(row.id);
    const creditor = row.creditor || row.creditorName || '';
    const debtor = row.debtor || row.debtorName || '';
    const name = row.name || creditor || '';
    await sqlRun(conn, `INSERT INTO debts
      (user_id, id, category, type, debt_category, name, creditor_name, debtor_name, account, principal, annual_rate, amount, currency, paid_amount, note, attachment, start_date, due_date, repayment_method, penalty_interest, status, investment_days, period_penalties_json, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, debtId, text(row.category), text(row.type), text(row.debtCategory || ''), text(name), text(creditor),
       text(debtor), text(row.account || ''),
       number(row.principal), number(row.annualRate), number(row.amount),
       text(row.currency || 'CNY'),
       number(row.paidAmount), text(row.note), text(row.attachment), text(row.startDate),
       text(row.dueDate), text(row.repaymentMethod), number(row.penaltyInterest || 0),
       text(row.status || 'normal'), number(row.investmentDays || 365), JSON.stringify(row.periodPenalties || {}),
       debtOrder++]);
    for (const [period, status] of Object.entries(row.payments || {})) {
      await sqlRun(conn, "INSERT INTO debt_payments (user_id, debt_id, period, status) VALUES (?, ?, ?, ?)",
        [userId, debtId, Number(period), status === true || status === 'true' ? 1 : 0]);
    }
  }

  for (const [index, cat] of ((state.debtCategories || [])).entries()) {
    await sqlRun(conn, "INSERT INTO debt_categories (user_id, id, name, sort_order) VALUES (?, ?, ?, ?)",
      [userId, text(cat.id), text(cat.name), index]);
  }

  // survival_funds
  let sfOrder = 0;
  for (const row of (state.survivalFunds || [])) {
    await sqlRun(conn, `INSERT INTO survival_funds
      (user_id, id, name, type, currency, amount, account_id, cost_basis, sort_order, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, Number(row.id) || (sfOrder + 1), text(row.name), text(row.type || ''),
       text(row.currency || 'CNY'), number(row.amount),
       text(row.accountId || null), number(row.costBasis || 0),
       sfOrder++, JSON.stringify(row.metadata || null)]);
  }

  // freedom_budgets
  let fbOrder = 0;
  for (const row of (state.freedomBudgets || [])) {
    await sqlRun(conn, `INSERT INTO freedom_budgets
      (user_id, id, name, category, period_type, budget_amount, actual_amount, sort_order, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, Number(row.id) || (fbOrder + 1), text(row.name), text(row.category || ''),
       text(row.periodType || 'monthly'),
       number(row.budgetAmount), number(row.actualAmount),
       fbOrder++, JSON.stringify(row.metadata || null)]);
  }

  // strategies 改为保存到 user_settings 的 strategies_json 字段
  const incomingStrategies = state.strategies;
  const effectiveStrategies = (incomingStrategies && typeof incomingStrategies === 'object')
    ? incomingStrategies
    : { list: [], pools: {} };

  // Preserve existing settings for fields not provided in state
  const prevFinAssetDraft = previousSettings ? previousSettings.finance_asset_draft_json : null;
  const prevFeeConfig = previousSettings ? previousSettings.fee_config_json : null;
  const prevOverviewGoals = previousSettings ? previousSettings.overview_goals_json : null;
  const prevAccountCategories = previousSettings ? previousSettings.account_categories_json : null;
  const prevStrategies = previousSettings ? previousSettings.strategies_json : null;

  const effectiveFinAssetDraft = state.financeAssetDraft !== undefined
    ? JSON.stringify(state.financeAssetDraft || {})
    : (prevFinAssetDraft || '{}');
  const effectiveFeeConfig = state.feeConfig !== undefined
    ? JSON.stringify(state.feeConfig || {})
    : (prevFeeConfig || '{}');
  const effectiveOverviewGoals = state.overviewGoals !== undefined
    ? JSON.stringify(state.overviewGoals || {})
    : (prevOverviewGoals || '{}');
  const effectiveAccountCategories = state.accountCategories !== undefined
    ? JSON.stringify(state.accountCategories || {})
    : (prevAccountCategories || '{}');
  const effectiveStrategiesJson = (incomingStrategies !== undefined)
    ? JSON.stringify(effectiveStrategies)
    : (prevStrategies || '{}');

  // Preserve existing independentAssets if not provided in state
  const incomingIndependentAssets = state.independentAssets;
  const effectiveIndependentAssets = (incomingIndependentAssets && typeof incomingIndependentAssets === 'object')
    ? incomingIndependentAssets
    : (previousSettings ? maybeParseJson(previousSettings.independent_assets_json, {}) : {});

  await sqlRun(conn, "INSERT INTO user_settings (user_id, finance_asset_draft_json, fee_config_json, overview_goals_json, hk_ipo_rules_json, independent_assets_json, account_categories_json, strategies_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [userId, effectiveFinAssetDraft, effectiveFeeConfig, effectiveOverviewGoals,
     previousSettings?.hk_ipo_rules_json || null,
     JSON.stringify(effectiveIndependentAssets), effectiveAccountCategories,
     effectiveStrategiesJson]);

  for (const row of (state.yearlyRecords || [])) {
    await sqlRun(conn, `INSERT INTO yearly_records (user_id, year, opening_asset, closing_asset, target_profit, actual_profit)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, Number(row.year), number(row.openingAsset), number(row.closingAsset),
       number(row.targetProfit), number(row.actualProfit)]);
  }
}

export { loadUserState, saveUserState };
