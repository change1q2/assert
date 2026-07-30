import { pool } from "../db/index.js";
import { sqlRun, sqlAll, sqlGet, maybeParseJson } from "../utils/db.js";
import { text, number, numericIfPossible } from "../utils/validators.js";
import { profileForUser } from "./user-service.js";

async function loadUserState(userId) {
  const profile = await profileForUser(userId);
  const rates = Object.fromEntries(
    (await sqlAll(pool, "SELECT currency, rate FROM exchange_rates WHERE user_id = ?", [userId]))
      .map((row) => [row.currency, row.rate])
  );
  const accounts = (await sqlAll(pool, "SELECT * FROM accounts WHERE user_id = ? ORDER BY sort_order", [userId])).map((row) => ({
    id: row.id, name: row.name, owner: row.owner, currency: row.currency, type: row.type,
    balance: row.balance, liability: row.liability, enabled: Boolean(row.enabled), default: Boolean(row.is_default),
    category: row.category, subCategory: row.sub_category,
  }));
  const assetClasses = (await sqlAll(pool, "SELECT * FROM asset_classes WHERE user_id = ? ORDER BY sort_order", [userId])).map((row) => ({
    id: row.id, name: row.name, children: maybeParseJson(row.children_json), visible: Boolean(row.visible),
    value: row.value, openingValue: row.opening_value, targetValue: row.target_value,
    income: row.income, expense: row.expense, laborIncome: row.labor_income, color: row.color,
    expectedReturn: row.expected_return,
  }));
  const records = (await sqlAll(pool, "SELECT * FROM records WHERE user_id = ? ORDER BY record_date DESC, sort_order DESC", [userId])).map((row) => ({
    id: numericIfPossible(row.id), type: row.type, category: row.category, sub: row.subcategory,
    tag: row.tag, bookId: row.book_id || '', amount: row.amount, currency: row.currency, accountId: row.account_id,
    date: row.record_date, recorder: row.recorder, note: row.note, createdAt: row.created_at,
  }));
  const budgets = (await sqlAll(pool, "SELECT * FROM budgets WHERE user_id = ? ORDER BY sort_order", [userId])).map((row) => ({
    id: numericIfPossible(row.id), name: row.name, category: row.category, amount: row.amount, used: row.used,
  }));
  const indoorTransactionRows = await sqlAll(pool, "SELECT * FROM finance_asset_indoor_transactions WHERE user_id = ? ORDER BY sort_order", [userId]);
  const outdoorTransactionRows = await sqlAll(pool, "SELECT * FROM finance_asset_outdoor_transactions WHERE user_id = ? ORDER BY sort_order", [userId]);
  const legacyTransactionRows = await sqlAll(pool, "SELECT * FROM finance_asset_transactions WHERE user_id = ? ORDER BY sort_order", [userId]);

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
    });
    transactionsByAsset.set(String(row.asset_id), rows);
  };

  indoorTransactionRows.forEach(row => addTransaction(row, false));
  outdoorTransactionRows.forEach(row => addTransaction(row, true));
  legacyTransactionRows.forEach(row => addTransaction(row, false));
  const financeAssets = (await sqlAll(pool, "SELECT * FROM finance_assets WHERE user_id = ? ORDER BY sort_order", [userId])).map((row) => ({
    id: numericIfPossible(row.id), kind: row.kind, assetKind: row.asset_kind, accountId: row.account_id, category: row.category,
    subcategory: row.subcategory, tertiaryCategory: row.tertiary_category, market: row.market,
    currency: row.currency, name: row.name, code: row.code, positionGroup: row.position_group,
    positionCategory: row.position_category, costPrice: row.cost_price, shares: row.shares,
    availableShares: row.available_shares, currentPrice: row.current_price, pnl: row.pnl,
    pnlPercent: row.pnl_percent, avgBuyPrice: row.avg_buy_price, holdingDays: row.holding_days,
    positionWeight: row.position_weight, totalFees: row.total_fees, todayPnl: row.today_pnl,
    todayPnlPercent: row.today_pnl_percent, prevPrice: row.prev_price, priceDate: row.price_date,
    tags: row.tags,
    transactions: transactionsByAsset.get(String(row.id)) || [],
  }));
  const customRecords = { income: [], expense: [], transfer: [] };
  (await sqlAll(pool, "SELECT record_type, name, icon FROM custom_record_categories WHERE user_id = ? ORDER BY sort_order", [userId]))
    .forEach((row) => (customRecords[row.record_type] ||= []).push({ name: row.name, icon: row.icon || '' }));
  const tertiaryByScope = {};
  (await sqlAll(pool, "SELECT scope, name FROM finance_tertiary_categories WHERE user_id = ? ORDER BY sort_order", [userId]))
    .forEach((row) => (tertiaryByScope[row.scope] ||= []).push(row.name));
  const books = (await sqlAll(pool, "SELECT * FROM books WHERE user_id = ? ORDER BY sort_order", [userId])).map((row) => ({
    id: row.id, name: row.name, icon: row.icon, color: row.color, tags: maybeParseJson(row.tags_json) || [], createdAt: row.created_at,
  }));
  const tags = (await sqlAll(pool, "SELECT * FROM tags WHERE user_id = ? ORDER BY sort_order", [userId])).map((row) => ({
    id: row.id, name: row.name, color: row.color, createdAt: row.created_at,
  }));
  const recordTagList = (await sqlAll(pool, "SELECT record_id, tag_id FROM record_tags WHERE user_id = ?", [userId])).map((row) => ({
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
  const recorders = (await sqlAll(pool, "SELECT name FROM recorders WHERE user_id = ? ORDER BY sort_order", [userId])).map((row) => row.name);
  const reminders = (await sqlAll(pool, "SELECT * FROM reminders WHERE user_id = ? ORDER BY reminder_date", [userId])).map((row) => ({
    id: row.id, date: row.reminder_date, title: row.title, type: row.type,
  }));
  const debts = (await sqlAll(pool, "SELECT * FROM debts WHERE user_id = ? ORDER BY sort_order", [userId])).map(async (row) => {
    const payments = Object.fromEntries(
      (await sqlAll(pool, "SELECT period, status FROM debt_payments WHERE user_id = ? AND debt_id = ?", [userId, row.id]))
        .map((payment) => [payment.period, payment.status])
    );
    return {
      id: numericIfPossible(row.id), category: row.category, type: row.type, debtCategory: row.debt_category, name: row.name,
      creditor: row.creditor_name, debtor: row.debtor_name, creditorName: row.creditor_name, debtorName: row.debtor_name,
      principal: row.principal,
      annualRate: row.annual_rate, amount: row.amount, paidAmount: row.paid_amount,
      note: row.note, attachment: row.attachment, startDate: row.start_date, dueDate: row.due_date,
      repaymentMethod: row.repayment_method, payments,
      penaltyInterest: row.penalty_interest || 0,
      status: row.status || 'normal',
      investmentDays: row.investment_days || 365,
      periodPenalties: maybeParseJson(row.period_penalties_json) || {},
    };
  });
  const resolvedDebts = await Promise.all(debts);
  const debtCategories = (await sqlAll(pool, "SELECT * FROM debt_categories WHERE user_id = ? ORDER BY sort_order", [userId])).map((row) => ({
    id: row.id, name: row.name, sortOrder: row.sort_order,
  }));
  const strategies = (await sqlAll(pool, "SELECT * FROM strategies WHERE user_id = ? ORDER BY id", [userId])).map((row) => ({
    id: row.id, name: row.name, active: Boolean(row.active), target: row.target,
    allocation: maybeParseJson(row.allocation_json), debtLimit: row.debt_limit,
    annualReturn: row.annual_return, risk: row.risk,
  }));
  const settings = await sqlGet(pool, "SELECT finance_asset_draft_json, fee_config_json, overview_goals_json, hk_ipo_rules_json, independent_assets_json, account_categories_json FROM user_settings WHERE user_id = ?", [userId]);
  const yearlyRecords = (await sqlAll(pool, "SELECT year, opening_asset, closing_asset, target_profit, actual_profit FROM yearly_records WHERE user_id = ? ORDER BY year", [userId])).map((row) => ({
    year: row.year,
    openingAsset: row.opening_asset,
    closingAsset: row.closing_asset,
    targetProfit: row.target_profit,
    actualProfit: row.actual_profit,
  }));
  return {
    user: profile,
    rates,
    accounts,
    assetClasses,
    records,
    budgets,
    financeAssets,
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
  };
}

async function saveUserState(conn, userId, state) {
  const user = state.user || {};
  const previousSettings = await sqlGet(conn, "SELECT hk_ipo_rules_json FROM user_settings WHERE user_id = ?", [userId]);
  await sqlRun(conn, `
    UPDATE user_profiles SET name=?, phone=?, email=?, currency=?, theme=?, avatar=?, birthday=?, city=?,
    occupation=?, risk_level=?, privacy_lock=?, data_mask=?, device_name=? WHERE user_id=?
  `, [text(user.name), text(user.phone), text(user.email), text(user.currency || "CNY"), text(user.theme || "light"),
    text(user.avatar), text(user.birthday), text(user.city), text(user.occupation), text(user.riskLevel || "稳健型"),
    text(user.privacyLock || "已开启"), text(user.dataMask || "已开启"), text(user.deviceName), userId]);

  const tables = [
    "exchange_rates", "accounts", "asset_classes", "records", "budgets", "finance_asset_transactions", "finance_asset_indoor_transactions", "finance_asset_outdoor_transactions", "finance_assets",
    "custom_record_categories", "finance_tertiary_categories", "record_tags", "recorders",
    "reminders", "debt_payments", "debts", "debt_categories", "strategies", "user_settings", "books", "tags", "yearly_records",
  ];
  for (const table of tables) {
    await sqlRun(conn, `DELETE FROM ${table} WHERE user_id = ?`, [userId]);
  }

  for (const [currency, rate] of Object.entries(state.rates || {})) {
    await sqlRun(conn, "INSERT INTO exchange_rates (user_id, currency, rate) VALUES (?, ?, ?)", [userId, currency, number(rate)]);
  }

  for (const row of (state.accounts || [])) {
    await sqlRun(conn, `INSERT INTO accounts (user_id, id, name, owner, currency, type, balance, liability, enabled, is_default, sort_order, category, sub_category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, text(row.id), text(row.name), text(row.owner), text(row.currency), text(row.type),
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
      (user_id, id, kind, asset_kind, account_id, category, subcategory, tertiary_category, market, currency, name, code, position_group, position_category, cost_price, shares, available_shares, current_price, pnl, pnl_percent, avg_buy_price, holding_days, position_weight, total_fees, today_pnl, today_pnl_percent, prev_price, price_date, sort_order, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, text(row.id), text(row.kind), text(row.assetKind), text(row.accountId), text(row.category),
       text(row.subcategory), text(row.tertiaryCategory), text(row.market), text(row.currency),
       text(row.name), text(row.code), text(row.positionGroup), text(row.positionCategory),
       number(row.costPrice), number(row.shares), number(row.availableShares), number(row.currentPrice),
       number(row.pnl), number(row.pnlPercent), number(row.avgBuyPrice), number(row.holdingDays),
       number(row.positionWeight), number(row.totalFees), number(row.todayPnl), number(row.todayPnlPercent), number(row.prevPrice), text(row.priceDate), index, text(row.tags)]);

    const isOutdoor = (row.market === '国内市场') && (row.tertiaryCategory === '场外' || row.categoryL3 === '场外');

    for (const [transactionIndex, transaction] of (row.transactions || []).entries()) {
      if (isOutdoor) {
        await sqlRun(conn, `INSERT INTO finance_asset_outdoor_transactions
          (user_id, asset_id, id, direction, transaction_date, net_value, shares, amount, commission, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, text(row.id), text(transaction.id || `${row.id}-${transactionIndex}`), text(transaction.direction),
           text(transaction.transaction_date), number(transaction.net_value || transaction.price),
           number(transaction.shares || transaction.quantity), number(transaction.amount),
           number(transaction.commission), transactionIndex]);
      } else {
        await sqlRun(conn, `INSERT INTO finance_asset_indoor_transactions
          (user_id, asset_id, id, direction, transaction_date, price, quantity, amount, commission, stamp_duty, transfer_fee, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, text(row.id), text(transaction.id || `${row.id}-${transactionIndex}`), text(transaction.direction),
           text(transaction.transaction_date), number(transaction.price),
           number(transaction.quantity || transaction.shares), number(transaction.amount),
           number(transaction.commission), number(transaction.stampDuty), number(transaction.transferFee), transactionIndex]);
      }
    }
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
      (user_id, id, category, type, debt_category, name, creditor_name, debtor_name, principal, annual_rate, amount, paid_amount, note, attachment, start_date, due_date, repayment_method, penalty_interest, status, investment_days, period_penalties_json, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, debtId, text(row.category), text(row.type), text(row.debtCategory || ''), text(name), text(creditor),
       text(debtor), number(row.principal), number(row.annualRate), number(row.amount),
       number(row.paidAmount), text(row.note), text(row.attachment), text(row.startDate),
       text(row.dueDate), text(row.repaymentMethod), number(row.penaltyInterest || 0),
       text(row.status || 'normal'), number(row.investmentDays || 365), JSON.stringify(row.periodPenalties || {}),
       debtOrder++]);
    for (const [period, status] of Object.entries(row.payments || {})) {
      await sqlRun(conn, "INSERT INTO debt_payments (user_id, debt_id, period, status) VALUES (?, ?, ?, ?)",
        [userId, debtId, Number(period), text(status)]);
    }
  }

  for (const [index, cat] of ((state.debtCategories || [])).entries()) {
    await sqlRun(conn, "INSERT INTO debt_categories (user_id, id, name, sort_order) VALUES (?, ?, ?, ?)",
      [userId, text(cat.id), text(cat.name), index]);
  }

  for (const row of (state.strategies || [])) {
    await sqlRun(conn, "INSERT INTO strategies (user_id, id, name, active, target, allocation_json, debt_limit, annual_return, risk) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, Number(row.id), text(row.name), row.active ? 1 : 0, text(row.target),
       JSON.stringify(row.allocation || []), number(row.debtLimit), number(row.annualReturn), text(row.risk)]);
  }
  await sqlRun(conn, "INSERT INTO user_settings (user_id, finance_asset_draft_json, fee_config_json, overview_goals_json, hk_ipo_rules_json, independent_assets_json, account_categories_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [userId, JSON.stringify(state.financeAssetDraft || {}), JSON.stringify(state.feeConfig || {}),
     JSON.stringify(state.overviewGoals || {}), previousSettings?.hk_ipo_rules_json || null,
     JSON.stringify(state.independentAssets || {}), JSON.stringify(state.accountCategories || {})]);

  for (const row of (state.yearlyRecords || [])) {
    await sqlRun(conn, `INSERT INTO yearly_records (user_id, year, opening_asset, closing_asset, target_profit, actual_profit)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, Number(row.year), number(row.openingAsset), number(row.closingAsset),
       number(row.targetProfit), number(row.actualProfit)]);
  }
}

export { loadUserState, saveUserState };
