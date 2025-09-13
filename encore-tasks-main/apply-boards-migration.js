const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
console.log('🔧 Применяю миграцию для таблицы boards...');
console.log('🗄️ База данных:', dbPath);

try {
  const db = new Database(dbPath);
  
  // Проверяем, есть ли уже колонка description
  const columns = db.prepare("PRAGMA table_info(boards)").all();
  const hasDescription = columns.some(col => col.name === 'description');
  
  if (hasDescription) {
    console.log('✅ Колонка description уже существует в таблице boards');
  } else {
    console.log('➕ Добавляю колонку description в таблицу boards...');
    
    // Добавляем колонку description
    db.exec('ALTER TABLE boards ADD COLUMN description TEXT');
    
    console.log('✅ Колонка description успешно добавлена!');
  }
  
  // Проверяем результат
  const updatedColumns = db.prepare("PRAGMA table_info(boards)").all();
  console.log('\n📊 Обновленные колонки таблицы boards:');
  updatedColumns.forEach(col => {
    console.log(`- ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
  });
  
  db.close();
  console.log('\n🎉 Миграция завершена успешно!');
} catch (error) {
  console.error('❌ Ошибка применения миграции:', error.message);
  process.exit(1);
}