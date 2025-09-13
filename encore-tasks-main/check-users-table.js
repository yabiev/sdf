const Database = require('better-sqlite3');
const path = require('path');

// Путь к базе данных
const dbPath = path.join(__dirname, 'database.sqlite');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

try {
  // Проверяем структуру таблицы users
  const userColumns = db.prepare('PRAGMA table_info(users)').all();
  
  console.log('\nСтруктура таблицы users:');
  userColumns.forEach((col, index) => {
    console.log(`${index}: ${col.name} (${col.type}) - ${col.notnull ? 'NOT NULL' : 'NULL'}`);
  });

  // Проверяем есть ли колонка username
  const hasUsername = userColumns.some(col => col.name === 'username');
  console.log(`\nКолонка username существует: ${hasUsername}`);
  
  if (!hasUsername) {
    console.log('\nДобавляем колонку username...');
    db.exec('ALTER TABLE users ADD COLUMN username TEXT');
    
    // Заполняем username на основе name или email
    db.exec(`
      UPDATE users 
      SET username = COALESCE(name, SUBSTR(email, 1, INSTR(email, '@') - 1))
      WHERE username IS NULL
    `);
    
    console.log('✅ Колонка username добавлена и заполнена');
  }
  
  // Проверяем финальную структуру
  const finalColumns = db.prepare('PRAGMA table_info(users)').all();
  
  console.log('\nФинальная структура таблицы users:');
  finalColumns.forEach((col, index) => {
    console.log(`${index}: ${col.name} (${col.type}) - ${col.notnull ? 'NOT NULL' : 'NULL'}`);
  });
  
  // Показываем пример данных
  const sampleUsers = db.prepare('SELECT id, email, name, username FROM users LIMIT 3').all();
  console.log('\nПример данных пользователей:');
  sampleUsers.forEach(user => {
    console.log(`- ID: ${user.id}, Email: ${user.email}, Name: ${user.name}, Username: ${user.username}`);
  });

} catch (error) {
  console.error('Ошибка:', error);
} finally {
  db.close();
}