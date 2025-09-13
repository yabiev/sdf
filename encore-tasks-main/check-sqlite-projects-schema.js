const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
console.log('📁 Путь к базе данных:', dbPath);

try {
  const db = new Database(dbPath);
  
  console.log('\n🔍 Проверка таблицы projects...');
  
  // Проверяем существование таблицы
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='projects'
  `).get();
  
  if (tableExists) {
    console.log('✅ Таблица projects существует');
    
    // Получаем информацию о колонках
    const columns = db.prepare('PRAGMA table_info(projects)').all();
    console.log('\n📋 Колонки таблицы projects:');
    columns.forEach(col => {
      console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // Проверяем наличие колонки created_by
    const hasCreatedBy = columns.some(col => col.name === 'created_by');
    console.log(`\n🔍 Колонка created_by: ${hasCreatedBy ? '✅ Существует' : '❌ Отсутствует'}`);
    
    // Показываем CREATE TABLE statement
    const createStatement = db.prepare(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='projects'
    `).get();
    
    console.log('\n📄 CREATE TABLE statement:');
    console.log(createStatement.sql);
    
  } else {
    console.log('❌ Таблица projects не существует');
  }
  
  db.close();
  
} catch (error) {
  console.error('❌ Ошибка при проверке схемы:', error.message);
}