const Database = require('better-sqlite3');
const path = require('path');

try {
  const dbPath = path.join(__dirname, 'database.db');
  const db = new Database(dbPath);
  
  // Получаем полную схему таблицы users
  const schema = db.prepare("PRAGMA table_info(users)").all();
  console.log('🏗️ Полная схема таблицы users:');
  schema.forEach(col => {
    console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
  });
  
  // Проверяем наличие поля password_hash
  const hasPasswordHash = schema.some(col => col.name === 'password_hash');
  console.log('🔐 Поле password_hash существует:', hasPasswordHash);
  
  // Получаем данные пользователя
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get('test@example.com');
  console.log('👤 Данные пользователя test@example.com:');
  console.log(user);
  
  db.close();
} catch (error) {
  console.error('❌ Ошибка:', error.message);
}