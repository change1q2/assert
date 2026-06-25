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
  }));
  const assetClasses = (await sqlAll(pool, "SELECT * FROM asset_classes WHERE user_id = ? ORDER BY sort_order", [userId])).map((row) => ({
    id: row.id, name: row.name, children: maybeParseJson(row.children_json), visible: Boolean(row.visible),
    value: row.value, openingValue: row.opening_value, targetValue: row.target_value,
    income: row.income, expense: row.expense, laborIncome: row.labor_income, color: row.color,
    expectedReturn: row.expected_return,
  }));
  const records = (await sqlAll(pool, "SELECT * FROM records WHERE user_id = ? ORDER BY record_date DESC, sort_order DESC", [userId])).map((row) => ({
    id: numericIfPossible(row.id), type: row.type, category: row.category, sub: row.subcategory,
    tag: row.tag, amount: row.amount, currency: row.currency, accountId: row.account_id,
    date: row.record_date, recorder: row.recorder, note: row.note, createdAt: row.created_at,
  }));
  const budgets = (await sqlAll(pool, "SELECT * FROM budgets WHERE user_id = ? ORDER BY sort_order", [userId])).map((row) => ({
    id: numericIfPossible(row.id), name: row.name, category: row.category, amount: row.amount, used: row.used,
  }));
  const transactionRows = await sqlAll(pool, "SELECT * FROM finance_asset_transactions WHERE user_id = ? ORDER BY sort_order", [userId]);
  const transactionsByAsset = new Map();
  transactionRows.forEach((row) => {
    const rows = transactionsByAsset.get(String(row.asset_id)) || [];
    rows.push({
      id: numericIfPossible(row.id),
      direction: row.direction,
      date: row.transaction_date,
      shares: row.shares,
      price: row.price,
      amount: row.amount,
      commission: row.commission,
      stampDuty: row.stamp_duty,
      transferFee: row.transfer_fee,
    });
    transactionsByAsset.set(String(row.asset_id), rows);
  });
  const financeAssets = (await sqlAll(pool, "SELECT * FROM finance_assets WHERE user_id = ? ORDER BY sort_order", [userId])).map((row) => ({
    id: numericIfPossible(row.id), kind: row.kind, accountId: row.account_id, category: row.category,
    subcategory: row.subcategory, tertiaryCategory: row.tertiary_category, market: row.market,
    currency: row.currency, name: row.name, code: row.code, positionGroup: row.position_group,
    positionCategory: row.position_category, costPrice: row.cost_price, shares: row.shares,
    availableShares: row.available_shares, currentPrice: row.current_price, pnl: row.pnl,
    pnlPercent: row.pnl_percent, avgBuyPrice: row.avg_buy_price, holdingDays: row.holding_days,
    positionWeight: row.position_weight, totalFees: row.total_fees, todayPnl: row.today_pnl,
    todayPnlPercent: row.today_pnl_percent,
    transactions: transactionsByAsset.get(String(row.id)) || [],
  }));
  const customRecords = { income: [], expense: [], transfer: [] };
  (await sqlAll(pool, "SELECT record_type, name FROM custom_record_categories WHERE user_id = ? ORDER BY sort_order", [userId]))
    .forEach((row) => (customRecords[row.record_type] ||= []).push(row.name));
  const tertiaryByScope = {};
  (await sqlAll(pool, "SELECT scope, name FROM finance_tertiary_categories WHERE user_id = ? ORDER BY sort_order", [userId]))
    .forEach((row) => (tertiaryByScope[row.scope] ||= []).push(row.name));
  const recordTags = { tagsByCategory: {}, lastByCategory: {} };
  (await sqlAll(pool, "SELECT category, tag, is_last FROM record_tags WHERE user_id = ? ORDER BY sort_order", [userId])).forEach((row) => {
    (recordTags.tagsByCategory[row.category] ||= []).push(row.tag);
    if (row.is_last) recordTags.lastByCategory[row.category] = row.tag;
  });
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
      id: numericIfPossible(row.id), category: row.category, type: row.type, name: row.name,
      creditorName: row.creditor_name, debtorName: row.debtor_name, principal: row.principal,
      annualRate: row.annual_rate, amount: row.amount, paidAmount: row.paid_amount,
      note: row.note, attachment: row.attachment, startDate: row.start_date, dueDate: row.due_date,
      repaymentMethod: row.repayment_method, payments,
    };
  });
  const resolvedDebts = await Promise.all(debts);
  const strategies = (await sqlAll(pool, "SELECT * FROM strategies WHERE user_id = ? ORDER BY id", [userId])).map((row) => ({
    id: row.id, name: row.name, active: Boolean(row.active), target: row.target,
    allocation: maybeParseJson(row.allocation_json), debtLimit: row.debt_limit,
    annualReturn: row.annual_return, risk: row.risk,
  }));
  const settings = await sqlGet(pool, "SELECT finance_asset_draft_json, fee_config_json, overview_goals_json, hk_ipo_rules_json FROM user_settings WHERE user_id = ?", [userId]);
  return {
    user: profile,
    rates,
    accounts,
    assetClasses,
    records,
    budgets,
    financeAssets,
    customCategories: { records: customRecords, finance: { tertiaryByScope } },
    recordTags,
    recorders,
    reminders,
    debts: resolvedDebts,
    strategies,
    financeAssetDraft: settings ? maybeParseJson(settings.finance_asset_draft_json) : {},
    feeConfig: settings ? maybeParseJson(settings.fee_config_json) : undefined,
    overviewGoals: settings ? maybeParseJson(settings.overview_goals_json) : undefined,
    hkIpoRules: settings ? maybeParseJson(settings.hk_ipo_rules_json) : undefined,
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
    "exchange_rates", "accounts", "asset_classes", "records", "budgets", "finance_asset_transactions", "finance_assets",
    "custom_record_categories", "finance_tertiary_categories", "record_tags", "recorders",
    "reminders", "debt_payments", "debts", "strategies", "user_settings",
  ];
  for (const table of tables) {
    await sqlRun(conn, `DELETE FROM ${table} WHERE user_id = ?`, [userId]);
  }

  for (const [currency, rate] of Object.entries(state.rates || {})) {
    await sqlRun(conn, "INSERT INTO exchange_rates (user_id, currency, rate) VALUES (?, ?, ?)", [userId, currency, number(rate)]);
  }

  for (const row of (state.accounts || [])) {
    await sqlRun(conn, `INSERT INTO accounts (user_id, id, name, owner, currency, type, balance, liability, enabled, is_default, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, text(row.id), text(row.name), text(row.owner), text(row.currency), text(row.type),
       number(row.balance), number(row.liability), row.enabled === false ? 0 : 1, row.default ? 1 : 0,
       (state.accounts || []).indexOf(row)]);
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
      (user_id, id, type, category, subcategory, tag, amount, currency, account_id, record_date, recorder, note, created_at, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, text(row.id), text(row.type), text(row.category), text(row.sub), text(row.tag),
       number(row.amount), text(row.currency), text(row.accountId), text(row.date),
       text(row.recorder), text(row.note), text(row.createdAt), index]);
  }

  for (const [index, row] of (state.budgets || []).entries()) {
    await sqlRun(conn, `INSERT INTO budgets (user_id, id, name, category, amount, used, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, text(row.id), text(row.name), text(row.category), number(row.amount), number(row.used), index]);
  }

  for (const [index, row] of (state.financeAssets || []).entries()) {
    await sqlRun(conn, `INSERT INTO finance_assets
      (user_id, id, kind, account_id, category, subcategory, tertiary_category, market, currency, name, code, position_group, position_category, cost_price, shares, available_shares, current_price, pnl, pnl_percent, avg_buy_price, holding_days, position_weight, total_fees, today_pnl, today_pnl_percent, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, text(row.id), text(row.kind), text(row.accountId), text(row.category),
       text(row.subcategory), text(row.tertiaryCategory), text(row.market), text(row.currency),
       text(row.name), text(row.code), text(row.positionGroup), text(row.positionCategory),
       number(row.costPrice), number(row.shares), number(row.availableShares), number(row.currentPrice),
       number(row.pnl), number(row.pnlPercent), number(row.avgBuyPrice), number(row.holdingDays),
       number(row.positionWeight), number(row.totalFees), number(row.todayPnl), number(row.todayPnlPercent), index]);
    for (const [transactionIndex, transaction] of (row.transactions || []).entries()) {
      await sqlRun(conn, `INSERT INTO finance_asset_transactions
        (user_id, asset_id, id, direction, transaction_date, shares, price, amount, commission, stamp_duty, transfer_fee, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, text(row.id), text(transaction.id || `${row.id}-${transactionIndex}`), text(transaction.direction),
         text(transaction.date), number(transaction.shares), number(transaction.price), number(transaction.amount),
         number(transaction.commission), number(transaction.stampDuty), number(transaction.transferFee), transactionIndex]);
    }
  }

  let catOrder = 0;
  for (const [type, names] of Object.entries(state.customCategories?.records || {})) {
    for (const name of (names || [])) {
      await sqlRun(conn, "INSERT INTO custom_record_categories (user_id, record_type, name, sort_order) VALUES (?, ?, ?, ?)",
        [userId, type, text(name), catOrder++]);
    }
  }
  let tertOrder = 0;
  for (const [scope, names] of Object.entries(state.customCategories?.finance?.tertiaryByScope || {})) {
    for (const name of (names || [])) {
      await sqlRun(conn, "INSERT INTO finance_tertiary_categories (user_id, scope, name, sort_order) VALUES (?, ?, ?, ?)",
        [userId, scope, text(name), tertOrder++]);
    }
  }

  let tagOrder = 0;
  for (const [category, tags] of Object.entries(state.recordTags?.tagsByCategory || {})) {
    for (const tag of (tags || [])) {
      await sqlRun(conn, "INSERT INTO record_tags (user_id, category, tag, is_last, sort_order) VALUES (?, ?, ?, ?, ?)",
        [userId, category, text(tag), state.recordTags?.lastByCategory?.[category] === tag ? 1 : 0, tagOrder++]);
    }
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
    await sqlRun(conn, `INSERT INTO debts
      (user_id, id, category, type, name, creditor_name, debtor_name, principal, annual_rate, amount, paid_amount, note, attachment, start_date, due_date, repayment_method, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, debtId, text(row.category), text(row.type), text(row.name), text(row.creditorName),
       text(row.debtorName), number(row.principal), number(row.annualRate), number(row.amount),
       number(row.paidAmount), text(row.note), text(row.attachment), text(row.startDate),
       text(row.dueDate), text(row.repaymentMethod), debtOrder++]);
    for (const [period, status] of Object.entries(row.payments || {})) {
      await sqlRun(conn, "INSERT INTO debt_payments (user_id, debt_id, period, status) VALUES (?, ?, ?, ?)",
        [userId, debtId, Number(period), text(status)]);
    }
  }

  for (const row of (state.strategies || [])) {
    await sqlRun(conn, "INSERT INTO strategies (user_id, id, name, active, target, allocation_json, debt_limit, annual_return, risk) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, Number(row.id), text(row.name), row.active ? 1 : 0, text(row.target),
       JSON.stringify(row.allocation || []), number(row.debtLimit), number(row.annualReturn), text(row.risk)]);
  }
  await sqlRun(conn, "INSERT INTO user_settings (user_id, finance_asset_draft_json, fee_config_json, overview_goals_json, hk_ipo_rules_json) VALUES (?, ?, ?, ?, ?)",
    [userId, JSON.stringify(state.financeAssetDraft || {}), JSON.stringify(state.feeConfig || {}),
     JSON.stringify(state.overviewGoals || {}), previousSettings?.hk_ipo_rules_json || null]);
}

export { loadUserState, saveUserState };
