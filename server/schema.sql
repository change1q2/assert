PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sms_verification_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  purpose TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sms_codes_phone_purpose
  ON sms_verification_codes(phone, purpose, created_at DESC);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'CNY',
  theme TEXT NOT NULL DEFAULT 'light',
  avatar TEXT NOT NULL DEFAULT '',
  birthday TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  occupation TEXT NOT NULL DEFAULT '',
  risk_level TEXT NOT NULL DEFAULT '稳健型',
  privacy_lock TEXT NOT NULL DEFAULT '已开启',
  data_mask TEXT NOT NULL DEFAULT '已开启',
  device_name TEXT NOT NULL DEFAULT 'PC / APP / 小程序'
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL,
  rate REAL NOT NULL,
  PRIMARY KEY (user_id, currency)
);

CREATE TABLE IF NOT EXISTS accounts (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  owner TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL,
  type TEXT NOT NULL,
  balance REAL NOT NULL DEFAULT 0,
  liability REAL NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  is_default INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS asset_classes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  children_json TEXT NOT NULL DEFAULT '[]',
  visible INTEGER NOT NULL DEFAULT 1,
  value REAL NOT NULL DEFAULT 0,
  opening_value REAL NOT NULL DEFAULT 0,
  target_value REAL NOT NULL DEFAULT 0,
  income REAL NOT NULL DEFAULT 0,
  expense REAL NOT NULL DEFAULT 0,
  labor_income REAL NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#539f8d',
  expected_return REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS records (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL DEFAULT '',
  tag TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  account_id TEXT NOT NULL,
  record_date TEXT NOT NULL,
  recorder TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_records_user_date ON records(user_id, record_date);
CREATE INDEX IF NOT EXISTS idx_records_user_account ON records(user_id, account_id);

CREATE TABLE IF NOT EXISTS budgets (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  used REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS finance_assets (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  kind TEXT NOT NULL,
  account_id TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL DEFAULT '',
  tertiary_category TEXT NOT NULL DEFAULT '',
  market TEXT NOT NULL,
  currency TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  position_group TEXT NOT NULL DEFAULT '',
  position_category TEXT NOT NULL DEFAULT '',
  cost_price REAL NOT NULL DEFAULT 0,
  shares REAL NOT NULL DEFAULT 0,
  pnl REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_finance_assets_user_account ON finance_assets(user_id, account_id);
CREATE INDEX IF NOT EXISTS idx_finance_assets_user_kind ON finance_assets(user_id, kind);

CREATE TABLE IF NOT EXISTS custom_record_categories (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  name TEXT NOT NULL,
  PRIMARY KEY (user_id, record_type, name)
);

CREATE TABLE IF NOT EXISTS finance_tertiary_categories (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  name TEXT NOT NULL,
  PRIMARY KEY (user_id, scope, name)
);

CREATE TABLE IF NOT EXISTS record_tags (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  tag TEXT NOT NULL,
  is_last INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, category, tag)
);

CREATE TABLE IF NOT EXISTS recorders (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, name)
);

CREATE TABLE IF NOT EXISTS reminders (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id INTEGER NOT NULL,
  reminder_date TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS debts (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  creditor_name TEXT NOT NULL DEFAULT '',
  debtor_name TEXT NOT NULL DEFAULT '',
  principal REAL NOT NULL DEFAULT 0,
  annual_rate REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  paid_amount REAL NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  attachment TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  repayment_method TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS debt_payments (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  debt_id TEXT NOT NULL,
  period INTEGER NOT NULL,
  status TEXT NOT NULL,
  PRIMARY KEY (user_id, debt_id, period),
  FOREIGN KEY (user_id, debt_id) REFERENCES debts(user_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS strategies (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id INTEGER NOT NULL,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 0,
  target TEXT NOT NULL DEFAULT '',
  allocation_json TEXT NOT NULL DEFAULT '[]',
  debt_limit REAL NOT NULL DEFAULT 0,
  annual_return REAL NOT NULL DEFAULT 0,
  risk TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  finance_asset_draft_json TEXT NOT NULL DEFAULT '{}'
);
