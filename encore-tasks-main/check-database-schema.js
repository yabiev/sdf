const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'database.sqlite');
console.log('Подключение к базе данных:', dbPath);

const db = new Database(dbPath);

try {
  // Проверяем схему таблицы tasks
  console.log('\n=== СХЕМА ТАБЛИЦЫ TASKS ===');
  const tasksSchema = db.prepare("PRAGMA table_info(tasks)").all();
  console.log('Колонки таблицы tasks:');
  tasksSchema.forEach(col => {
    console.log(`- ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
  });
  
  // Проверяем схему таблицы boards
  console.log('\n=== СХЕМА ТАБЛИЦЫ BOARDS ===');
  const boardsSchema = db.prepare("PRAGMA table_info(boards)").all();
  console.log('Колонки таблицы boards:');
  boardsSchema.forEach(col => {
    console.log(`- ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
  });
  
  // Проверяем схему таблицы projects
  console.log('\n=== СХЕМА ТАБЛИЦЫ PROJECTS ===');
  const projectsSchema = db.prepare("PRAGMA table_info(projects)").all();
  console.log('Колонки таблицы projects:');
  projectsSchema.forEach(col => {
    console.log(`- ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
  });
  
  // Проверяем все таблицы в базе
  console.log('\n=== ВСЕ ТАБЛИЦЫ В БАЗЕ ===');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Доступные таблицы:', tables.map(t => t.name));
  
} catch (error) {
  console.error('Ошибка при проверке схемы:', error);
} finally {
  db.close();
}