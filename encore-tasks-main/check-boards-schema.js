const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
console.log('📊 Проверяю схему таблицы boards...');
console.log('🗄️ База данных:', dbPath);

try {
  const db = new Database(dbPath);
  
  // Получаем схему таблицы boards
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='boards'").get();
  
  if (schema) {
    console.log('\n📋 Схема таблицы boards:');
    console.log(schema.sql);
  } else {
    console.log('❌ Таблица boards не найдена!');
  }
  
  // Получаем информацию о колонках
  try {
    const columns = db.prepare("PRAGMA table_info(boards)").all();
    console.log('\n📊 Колонки таблицы boards:');
    columns.forEach(col => {
      console.log(`- ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
  } catch (e) {
    console.log('❌ Ошибка получения информации о колонках:', e.message);
  }
  
  db.close();
} catch (error) {
  console.error('❌ Ошибка:', error.message);
}