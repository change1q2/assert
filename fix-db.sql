DROP TABLE IF EXISTS record_tags_old;
INSERT INTO migrations (name) VALUES ('004_add_books_tags_tables.js') ON DUPLICATE KEY UPDATE name=name;