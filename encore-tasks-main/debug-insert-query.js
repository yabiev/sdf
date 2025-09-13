const Database = require('better-sqlite3');
const path = require('path');

// Подключаемся к базе данных
const dbPath = path.join(process.cwd(), 'database.sqlite');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

try {
  // Проверяем схему таблицы tasks
  console.log('\nСхема таблицы tasks:');
  const schema = db.prepare("PRAGMA table_info(tasks)").all();
  schema.forEach(col => {
    console.log(`${col.cid}: ${col.name} (${col.type}) - ${col.notnull ? 'NOT NULL' : 'NULL'}`);
  });
  
  // Тестируем INSERT запрос
  console.log('\nТестируем INSERT запрос...');
  
  const insertSQL = `INSERT INTO tasks (
    title, description, column_id, board_id, priority, status, 
    due_date, estimated_hours, parent_task_id, position, settings, created_by
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  console.log('SQL:', insertSQL);
  
  const params = [
    'Test Task',                                    // title
    'Test Description',                             // description
    'b9ddb7e0-cca9-440c-a590-aec137130ba3',        // column_id
    'test-board-id',                                // board_id
    'medium',                                       // priority
    'todo',                                         // status
    null,                                           // due_date
    null,                                           // estimated_hours
    null,                                           // parent_task_id
    1,                                              // position
    '{}',                                           // settings
    'a7395264-ae97-466d-8dd3-65410a7266aa'         // created_by
  ];
  
  console.log('Реальное количество параметров:', params.length);
  
  console.log('Параметры:', params);
  console.log('Количество параметров:', params.length);
  
  // Подсчитываем количество ? в SQL
  const placeholderCount = (insertSQL.match(/\?/g) || []).length;
  console.log('Количество плейсхолдеров в SQL:', placeholderCount);
  
  if (params.length !== placeholderCount) {
    console.log('❌ НЕСООТВЕТСТВИЕ: количество параметров не равно количеству плейсхолдеров!');
  } else {
    console.log('✅ Количество параметров соответствует количеству плейсхолдеров');
  }
  
  // Пробуем выполнить запрос
  try {
    const stmt = db.prepare(insertSQL);
    console.log('\nПодготовка запроса прошла успешно');
    
    // Пробуем выполнить
    const result = stmt.run(...params);
    console.log('✅ Запрос выполнен успешно!');
    console.log('Результат:', result);
    
    // Получаем созданную запись
    const createdTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
    console.log('Созданная задача:', createdTask);
    
  } catch (runError) {
    console.log('❌ Ошибка выполнения запроса:', runError.message);
  }
  
} catch (error) {
  console.error('❌ Ошибка:', error.message);
} finally {
  db.close();
}