const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

console.log('🔍 Проверка структуры таблицы projects:');

try {
  // Получаем схему таблицы projects
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='projects'").get();
  
  if (schema) {
    console.log('📋 Схема таблицы projects:');
    console.log(schema.sql);
  } else {
    console.log('❌ Таблица projects не найдена');
  }
  
  // Получаем информацию о колонках
  const columns = db.prepare("PRAGMA table_info(projects)").all();
  
  console.log('\n📊 Колонки таблицы projects:');
  columns.forEach(col => {
    console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
  });
  
  // Проверяем данные в таблице
  const count = db.prepare("SELECT COUNT(*) as count FROM projects").get();
  console.log(`\n📈 Количество записей в projects: ${count.count}`);
  
  if (count.count > 0) {
    const sample = db.prepare("SELECT * FROM projects LIMIT 3").all();
    console.log('\n📝 Примеры записей:');
    sample.forEach((row, index) => {
      console.log(`  ${index + 1}. ID: ${row.id}, Name: ${row.name}`);
      console.log(`     Columns: ${Object.keys(row).join(', ')}`);
    });
  }
  
} catch (error) {
  console.error('❌ Ошибка:', error.message);
} finally {
  db.close();
}