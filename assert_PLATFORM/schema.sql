CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  account VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(512) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash VARCHAR(255) PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sms_verification_codes (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  phone VARCHAR(50) NOT NULL,
  purpose VARCHAR(50) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at VARCHAR(30) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sms_codes_phone_purpose (phone, purpose, created_at DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id INTEGER PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL DEFAULT '',
  email VARCHAR(255) NOT NULL DEFAULT '',
  currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
  theme VARCHAR(20) NOT NULL DEFAULT 'light',
  avatar VARCHAR(512) NOT NULL DEFAULT '',
  birthday VARCHAR(20) NOT NULL DEFAULT '',
  city VARCHAR(100) NOT NULL DEFAULT '',
  occupation VARCHAR(100) NOT NULL DEFAULT '',
  risk_level VARCHAR(50) NOT NULL DEFAULT '稳健型',
  privacy_lock VARCHAR(50) NOT NULL DEFAULT '已开启',
  data_mask VARCHAR(50) NOT NULL DEFAULT '已开启',
  device_name VARCHAR(100) NOT NULL DEFAULT 'PC / APP / 小程序',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS exchange_rates (
  user_id INTEGER NOT NULL,
  currency VARCHAR(10) NOT NULL,
  rate DOUBLE NOT NULL,
  PRIMARY KEY (user_id, currency),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS accounts (
  user_id INTEGER NOT NULL,
  id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  owner VARCHAR(255) NOT NULL DEFAULT '',
  currency VARCHAR(10) NOT NULL,
  type VARCHAR(100) NOT NULL,
  balance DOUBLE NOT NULL DEFAULT 0,
  liability DOUBLE NOT NULL DEFAULT 0,
  enabled TINYINT NOT NULL DEFAULT 1,
  is_default TINYINT NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS asset_classes (
  user_id INTEGER NOT NULL,
  id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  children_json JSON NOT NULL,
  visible TINYINT NOT NULL DEFAULT 1,
  value DOUBLE NOT NULL DEFAULT 0,
  opening_value DOUBLE NOT NULL DEFAULT 0,
  target_value DOUBLE NOT NULL DEFAULT 0,
  income DOUBLE NOT NULL DEFAULT 0,
  expense DOUBLE NOT NULL DEFAULT 0,
  labor_income DOUBLE NOT NULL DEFAULT 0,
  color VARCHAR(50) NOT NULL DEFAULT '#539f8d',
  expected_return DOUBLE NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS records (
  user_id INTEGER NOT NULL,
  id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  category VARCHAR(255) NOT NULL,
  subcategory VARCHAR(255) NOT NULL DEFAULT '',
  tag VARCHAR(255) NOT NULL DEFAULT '',
  amount DOUBLE NOT NULL,
  currency VARCHAR(10) NOT NULL,
  account_id VARCHAR(255) NOT NULL DEFAULT '',
  record_date VARCHAR(20) NOT NULL,
  recorder VARCHAR(255) NOT NULL DEFAULT '',
  note TEXT NOT NULL,
  created_at VARCHAR(50) NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  book_id VARCHAR(255) NOT NULL DEFAULT '',
  PRIMARY KEY (user_id, id),
  INDEX idx_records_user_date (user_id, record_date),
  INDEX idx_records_user_account (user_id, account_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS budgets (
  user_id INTEGER NOT NULL,
  id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL,
  amount DOUBLE NOT NULL DEFAULT 0,
  used DOUBLE NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS finance_assets (
  user_id INTEGER NOT NULL,
  id VARCHAR(255) NOT NULL,
  kind VARCHAR(100) NOT NULL,
  asset_kind VARCHAR(100) NOT NULL DEFAULT '',
  account_id VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL,
  subcategory VARCHAR(255) NOT NULL DEFAULT '',
  tertiary_category VARCHAR(255) NOT NULL DEFAULT '',
  market VARCHAR(100) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL DEFAULT '',
  position_group VARCHAR(255) NOT NULL DEFAULT '',
  position_category VARCHAR(255) NOT NULL DEFAULT '',
  cost_price DOUBLE NOT NULL DEFAULT 0,
  shares DOUBLE NOT NULL DEFAULT 0,
  quantity DOUBLE NOT NULL DEFAULT 0,
  available_shares DOUBLE NOT NULL DEFAULT 0,
  current_price DOUBLE NOT NULL DEFAULT 0,
  pnl DOUBLE NOT NULL DEFAULT 0,
  pnl_percent DOUBLE NOT NULL DEFAULT 0,
  avg_buy_price DOUBLE NOT NULL DEFAULT 0,
  holding_days DOUBLE NOT NULL DEFAULT 0,
  position_weight DOUBLE NOT NULL DEFAULT 0,
  total_fees DOUBLE NOT NULL DEFAULT 0,
  today_pnl DOUBLE NOT NULL DEFAULT 0,
  today_pnl_percent DOUBLE NOT NULL DEFAULT 0,
  prev_price DOUBLE NOT NULL DEFAULT 0,
  price_date VARCHAR(20) NOT NULL DEFAULT '',
  tags VARCHAR(500) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  archive_date VARCHAR(20) NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id),
  INDEX idx_finance_assets_user_account (user_id, account_id),
  INDEX idx_finance_assets_user_kind (user_id, kind),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS finance_asset_transactions (
  user_id INTEGER NOT NULL,
  asset_id VARCHAR(255) NOT NULL,
  id VARCHAR(255) NOT NULL,
  direction VARCHAR(20) NOT NULL,
  transaction_date VARCHAR(20) NOT NULL,
  shares DOUBLE NOT NULL DEFAULT 0,
  price DOUBLE NOT NULL DEFAULT 0,
  amount DOUBLE NOT NULL DEFAULT 0,
  commission DOUBLE NOT NULL DEFAULT 0,
  stamp_duty DOUBLE NOT NULL DEFAULT 0,
  transfer_fee DOUBLE NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, asset_id, id),
  INDEX idx_finance_transactions_user_asset (user_id, asset_id),
  FOREIGN KEY (user_id, asset_id) REFERENCES finance_assets(user_id, id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS finance_asset_indoor_transactions (
  user_id INTEGER NOT NULL,
  asset_id VARCHAR(255) NOT NULL,
  id VARCHAR(255) NOT NULL,
  direction VARCHAR(20) NOT NULL,
  transaction_date VARCHAR(20) NOT NULL,
  price DOUBLE NOT NULL DEFAULT 0,
  quantity DOUBLE NOT NULL DEFAULT 0,
  amount DOUBLE NOT NULL DEFAULT 0,
  commission DOUBLE NOT NULL DEFAULT 0,
  stamp_duty DOUBLE NOT NULL DEFAULT 0,
  transfer_fee DOUBLE NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, asset_id, id),
  INDEX idx_indoor_transactions_user_asset (user_id, asset_id),
  FOREIGN KEY (user_id, asset_id) REFERENCES finance_assets(user_id, id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS finance_asset_outdoor_transactions (
  user_id INTEGER NOT NULL,
  asset_id VARCHAR(255) NOT NULL,
  id VARCHAR(255) NOT NULL,
  direction VARCHAR(20) NOT NULL,
  transaction_date VARCHAR(20) NOT NULL,
  net_value DOUBLE NOT NULL DEFAULT 0,
  shares DOUBLE NOT NULL DEFAULT 0,
  amount DOUBLE NOT NULL DEFAULT 0,
  commission DOUBLE NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, asset_id, id),
  INDEX idx_outdoor_transactions_user_asset (user_id, asset_id),
  FOREIGN KEY (user_id, asset_id) REFERENCES finance_assets(user_id, id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS custom_record_categories (
  user_id INTEGER NOT NULL,
  record_type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(100) NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, record_type, name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS finance_tertiary_categories (
  user_id INTEGER NOT NULL,
  scope VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, scope, name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS record_tags (
  record_id VARCHAR(255) NOT NULL,
  tag_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  PRIMARY KEY (record_id, tag_id, user_id),
  INDEX idx_record_tags_user (user_id),
  INDEX idx_record_tags_tag (tag_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS recorders (
  user_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reminders (
  user_id INTEGER NOT NULL,
  id INTEGER NOT NULL,
  reminder_date VARCHAR(20) NOT NULL,
  title VARCHAR(512) NOT NULL,
  type VARCHAR(50) NOT NULL,
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS debts (
  user_id INTEGER NOT NULL,
  id VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  type VARCHAR(100) NOT NULL,
  debt_category VARCHAR(255) NOT NULL DEFAULT '',
  name VARCHAR(255) NOT NULL DEFAULT '',
  creditor_name VARCHAR(255) NOT NULL DEFAULT '',
  debtor_name VARCHAR(255) NOT NULL DEFAULT '',
  principal DOUBLE NOT NULL DEFAULT 0,
  annual_rate DOUBLE NOT NULL DEFAULT 0,
  amount DOUBLE NOT NULL DEFAULT 0,
  paid_amount DOUBLE NOT NULL DEFAULT 0,
  note TEXT NOT NULL,
  attachment TEXT NOT NULL,
  start_date VARCHAR(20) NOT NULL,
  due_date VARCHAR(20) NOT NULL,
  repayment_method VARCHAR(100) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS debt_payments (
  user_id INTEGER NOT NULL,
  debt_id VARCHAR(255) NOT NULL,
  period INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL,
  PRIMARY KEY (user_id, debt_id, period),
  FOREIGN KEY (user_id, debt_id) REFERENCES debts(user_id, id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS debt_categories (
  user_id INTEGER NOT NULL,
  id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS strategies (
  user_id INTEGER NOT NULL,
  id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  active TINYINT NOT NULL DEFAULT 0,
  target VARCHAR(512) NOT NULL DEFAULT '',
  allocation_json JSON NOT NULL,
  debt_limit DOUBLE NOT NULL DEFAULT 0,
  annual_return DOUBLE NOT NULL DEFAULT 0,
  risk VARCHAR(255) NOT NULL DEFAULT '',
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_settings (
  user_id INTEGER PRIMARY KEY,
  finance_asset_draft_json JSON NOT NULL,
  fee_config_json JSON,
  overview_goals_json JSON,
  hk_ipo_rules_json JSON,
  independent_assets_json JSON,
  account_categories_json JSON,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS yearly_records (
  user_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  opening_asset DOUBLE NOT NULL DEFAULT 0,
  closing_asset DOUBLE NOT NULL DEFAULT 0,
  target_profit DOUBLE NOT NULL DEFAULT 0,
  actual_profit DOUBLE NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, year),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  user_id INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT '问题',
  title VARCHAR(255) NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  attachments_json JSON,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  reviewed TINYINT NOT NULL DEFAULT 0,
  admin_reply VARCHAR(4096) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  replied_at DATETIME,
  INDEX idx_feedback_user (user_id),
  INDEX idx_feedback_status (status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(512) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash VARCHAR(255) PRIMARY KEY,
  admin_id INTEGER NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS devices (
  user_id INTEGER NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT '',
  platform VARCHAR(100) NOT NULL DEFAULT '',
  app_version VARCHAR(100) NOT NULL DEFAULT '',
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, device_id),
  INDEX idx_devices_platform (platform),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attachments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INTEGER NOT NULL,
  owner_type VARCHAR(100) NOT NULL,
  owner_id VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL DEFAULT '',
  file_size BIGINT NOT NULL DEFAULT 0,
  storage_path VARCHAR(512) NOT NULL,
  sha256 VARCHAR(128) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_attachments_owner (user_id, owner_type, owner_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sync_change_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INTEGER NOT NULL,
  device_id VARCHAR(255) NOT NULL DEFAULT '',
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  operation_type VARCHAR(50) NOT NULL DEFAULT 'upsert',
  payload_json JSON NOT NULL,
  client_version BIGINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sync_change_log_user (user_id, id),
  INDEX idx_sync_change_log_entity (user_id, entity_type, entity_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS release_packages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  platform VARCHAR(50) NOT NULL,
  version VARCHAR(100) NOT NULL,
  build_number VARCHAR(100) NOT NULL DEFAULT '',
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(512) NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  release_notes TEXT NOT NULL,
  is_latest TINYINT NOT NULL DEFAULT 0,
  min_system_version VARCHAR(100) NOT NULL DEFAULT '',
  sha256 VARCHAR(128) NOT NULL DEFAULT '',
  distribution VARCHAR(100) NOT NULL DEFAULT 'direct',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_release_packages_platform (platform, published_at DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS books (
  id VARCHAR(255) NOT NULL,
  user_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(100) NOT NULL DEFAULT '',
  color VARCHAR(50) NOT NULL DEFAULT '',
  tags_json JSON,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_books_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tags (
  id VARCHAR(255) NOT NULL,
  user_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(50) NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_tags_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
