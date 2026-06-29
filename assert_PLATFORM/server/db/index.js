import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import { __dirname } from "../config/index.js";
import { runMigrations } from "./migrate.js";

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "asset_platform",
  waitForConnections: true,
  connectionLimit: 10,
  multipleStatements: true,
  dateStrings: true,
});

const schemaSql = fs.readFileSync(path.resolve(__dirname, "..", "schema.sql"), "utf8");
const initDb = pool.query(schemaSql).then(async () => {
  await runMigrations(pool);
  console.log("MySQL schema initialized");
}).catch((err) => {
  console.error("Failed to initialize MySQL schema:", err.message);
  process.exit(1);
});

export { pool, initDb };
