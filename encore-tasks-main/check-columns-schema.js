const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
console.log('📊 Проверяю схему таблицы columns...');
console.log('🗄️ База данных:', dbPath);

try {
  const db = new Database(dbPath);
  
  // Получаем схему таблицы columns
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='columns'").get();
  
  if (schema) {
    console.log('\n📋 Схема таблицы columns:');
    console.log(schema.sql);
  } else {
    console.log('❌ Таблица columns не найдена!');
  }
  
  // Получаем информацию о колонках
  try {
    const columns = db.prepare("PRAGMA table_info(columns)").all();
    console.log('\n📊 Колонки таблицы columns:');
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