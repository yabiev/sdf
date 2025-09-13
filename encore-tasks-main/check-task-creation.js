const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Путь к базе данных
const dbPath = path.join(__dirname, 'database.sqlite');

// Подключаемся к базе данных
const db = new sqlite3.Database(dbPath);

console.log('Проверяем последние созданные задачи...');

// Проверяем последние задачи
db.all(`
  SELECT 
    t.id, t.title, t.description, t.column_id, t.board_id, 
    t.created_by, t.created_at, t.updated_at
  FROM tasks t 
  ORDER BY t.created_at DESC 
  LIMIT 5
`, [], (err, rows) => {
  if (err) {
    console.error('Ошибка при получении задач:', err);
  } else {
    console.log('Последние задачи:');
    console.log(rows);
  }
  
  // Проверяем структуру таблицы tasks
  db.all(`PRAGMA table_info(tasks)`, [], (err, columns) => {
    if (err) {
      console.error('Ошибка при получении структуры таблицы tasks:', err);
    } else {
      console.log('\nСтруктура таблицы tasks:');
      columns.forEach(col => {
        console.log(`${col.name}: ${col.type} (nullable: ${col.notnull === 0})`);
      });
    }
    
    db.close();
  });
});