import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import { __dirname } from "../config/index.js";

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "123456",
  database: process.env.MYSQL_DATABASE || "asset_platform",
  waitForConnections: true,
  connectionLimit: 10,
  multipleStatements: true,
  dateStrings: true,
});

const schemaSql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
const initDb = pool.query(schemaSql).then(async () => {
  try {
    await pool.query("ALTER TABLE user_settings ADD COLUMN fee_config_json JSON AFTER finance_asset_draft_json");
    console.log("Added fee_config_json column to user_settings");
  } catch (_) { }
  try {
    await pool.query("ALTER TABLE user_settings ADD COLUMN overview_goals_json JSON AFTER fee_config_json");
    console.log("Added overview_goals_json column to user_settings");
  } catch (_) { }
  try {
    await pool.query("ALTER TABLE user_settings ADD COLUMN hk_ipo_rules_json JSON AFTER overview_goals_json");
    console.log("Added hk_ipo_rules_json column to user_settings");
  } catch (_) { }
  try {
    await pool.query("ALTER TABLE feedback ADD COLUMN attachments_json JSON AFTER content");
    console.log("Added attachments_json column to feedback");
  } catch (_) { }
  const financeAssetColumns = [
    ["available_shares", "DOUBLE NOT NULL DEFAULT 0 AFTER shares"],
    ["current_price", "DOUBLE NOT NULL DEFAULT 0 AFTER available_shares"],
    ["pnl_percent", "DOUBLE NOT NULL DEFAULT 0 AFTER pnl"],
    ["avg_buy_price", "DOUBLE NOT NULL DEFAULT 0 AFTER pnl_percent"],
    ["holding_days", "DOUBLE NOT NULL DEFAULT 0 AFTER avg_buy_price"],
    ["position_weight", "DOUBLE NOT NULL DEFAULT 0 AFTER holding_days"],
    ["total_fees", "DOUBLE NOT NULL DEFAULT 0 AFTER position_weight"],
    ["today_pnl", "DOUBLE NOT NULL DEFAULT 0 AFTER total_fees"],
    ["today_pnl_percent", "DOUBLE NOT NULL DEFAULT 0 AFTER today_pnl"],
  ];
  for (const [column, definition] of financeAssetColumns) {
    try {
      await pool.query(`ALTER TABLE finance_assets ADD COLUMN ${column} ${definition}`);
      console.log(`Added ${column} column to finance_assets`);
    } catch (_) { }
  }
  const syncColumns = [
    ["accounts", "sync_version", "BIGINT NOT NULL DEFAULT 0"],
    ["accounts", "deleted_at", "DATETIME NULL DEFAULT NULL"],
    ["accounts", "origin_device_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["accounts", "client_op_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["asset_classes", "sync_version", "BIGINT NOT NULL DEFAULT 0"],
    ["asset_classes", "deleted_at", "DATETIME NULL DEFAULT NULL"],
    ["asset_classes", "origin_device_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["asset_classes", "client_op_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["records", "sync_version", "BIGINT NOT NULL DEFAULT 0"],
    ["records", "deleted_at", "DATETIME NULL DEFAULT NULL"],
    ["records", "origin_device_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["records", "client_op_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["finance_assets", "sync_version", "BIGINT NOT NULL DEFAULT 0"],
    ["finance_assets", "deleted_at", "DATETIME NULL DEFAULT NULL"],
    ["finance_assets", "origin_device_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["finance_assets", "client_op_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["finance_asset_transactions", "sync_version", "BIGINT NOT NULL DEFAULT 0"],
    ["finance_asset_transactions", "deleted_at", "DATETIME NULL DEFAULT NULL"],
    ["finance_asset_transactions", "origin_device_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["finance_asset_transactions", "client_op_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["debts", "sync_version", "BIGINT NOT NULL DEFAULT 0"],
    ["debts", "deleted_at", "DATETIME NULL DEFAULT NULL"],
    ["debts", "origin_device_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["debts", "client_op_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["debt_payments", "sync_version", "BIGINT NOT NULL DEFAULT 0"],
    ["debt_payments", "deleted_at", "DATETIME NULL DEFAULT NULL"],
    ["debt_payments", "origin_device_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["debt_payments", "client_op_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["feedback", "sync_version", "BIGINT NOT NULL DEFAULT 0"],
    ["feedback", "deleted_at", "DATETIME NULL DEFAULT NULL"],
    ["feedback", "origin_device_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
    ["feedback", "client_op_id", "VARCHAR(255) NOT NULL DEFAULT ''"],
  ];
  for (const [table, column, definition] of syncColumns) {
    try {
      await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      console.log(`Added ${column} column to ${table}`);
    } catch (_) { }
  }
  console.log("MySQL schema initialized");
}).catch((err) => {
  console.error("Failed to initialize MySQL schema:", err.message);
  process.exit(1);
});

export { pool, initDb };
