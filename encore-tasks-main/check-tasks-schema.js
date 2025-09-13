const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);

try {
  console.log('=== СХЕМА ТАБЛИЦЫ TASKS ===');
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='tasks'").get();
  if (schema) {
    console.log(schema.sql);
  } else {
    console.log('Таблица tasks не найдена!');
  }
  
  console.log('\n=== КОЛОНКИ ТАБЛИЦЫ TASKS ===');
  const columns = db.prepare("PRAGMA table_info(tasks)").all();
  columns.forEach(col => {
    console.log(`${col.name} (${col.type}) - ${col.notnull ? 'NOT NULL' : 'NULL'} - ${col.dflt_value || 'no default'}`);
  });
  
} catch (error) {
  console.error('Ошибка:', error.message);
} finally {
  db.close();
}