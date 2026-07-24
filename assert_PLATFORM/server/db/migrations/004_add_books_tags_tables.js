/**
 * Migration 004: 新增 books、tags、record_tags 表，新增 records.book_id 和 custom_record_categories.icon 字段
 */

async function tryAddColumn(pool, table, column, definition) {
  try {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`  [004] Added ${table}.${column}`);
  } catch (err) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }
}

async function tryCreateTable(pool, tableName, createSql) {
  try {
    await pool.query(createSql);
    console.log(`  [004] Created table ${tableName}`);
  } catch (err) {
    if (err.code !== "ER_TABLE_EXISTS_ERROR") throw err;
  }
}

export async function up(pool) {
  await tryCreateTable(pool, "books", `
    CREATE TABLE books (
      id VARCHAR(255) NOT NULL,
      user_id INTEGER NOT NULL,
      name VARCHAR(255) NOT NULL,
      icon VARCHAR(100) NOT NULL DEFAULT '',
      color VARCHAR(50) NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_books_user (user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await tryCreateTable(pool, "tags", `
    CREATE TABLE tags (
      id INTEGER NOT NULL AUTO_INCREMENT,
      user_id INTEGER NOT NULL,
      name VARCHAR(100) NOT NULL,
      color VARCHAR(50) NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_tags_user (user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [tables] = await pool.query("SHOW TABLES LIKE 'record_tags'");
  if (tables.length > 0) {
    const [columns] = await pool.query("SHOW COLUMNS FROM record_tags LIKE 'category'");
    if (columns.length > 0) {
      const [oldTables] = await pool.query("SHOW TABLES LIKE 'record_tags_old'");
      if (oldTables.length === 0) {
        await pool.query("RENAME TABLE record_tags TO record_tags_old");
        console.log("  [004] Renamed old record_tags to record_tags_old");
      } else {
        console.log("  [004] record_tags_old already exists, skipping rename");
      }
    }
  }
  await tryCreateTable(pool, "record_tags", `
    CREATE TABLE record_tags (
      record_id VARCHAR(255) NOT NULL,
      tag_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      PRIMARY KEY (record_id, tag_id, user_id),
      INDEX idx_record_tags_user (user_id),
      INDEX idx_record_tags_tag (tag_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await tryAddColumn(pool, "records", "book_id", "VARCHAR(255) NOT NULL DEFAULT '' AFTER tag");
  await tryAddColumn(pool, "custom_record_categories", "icon", "VARCHAR(100) NOT NULL DEFAULT '' AFTER name");
}
