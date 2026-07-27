import mysql from 'mysql2/promise';

async function fix() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '123456',
    database: 'asset_platform'
  });
  
  await conn.execute('DROP TABLE IF EXISTS record_tags_old');
  await conn.execute(`INSERT IGNORE INTO migrations (name) VALUES ('004_add_books_tags_tables.js')`);
  
  console.log('Database fixed!');
  await conn.end();
}

fix().catch(console.error);