const Database = require('better-sqlite3');
const path = require('path');

try {
  const dbPath = path.join(__dirname, 'database.db');
  console.log('📁 Путь к базе данных:', dbPath);
  
  const db = new Database(dbPath);
  
  // Проверяем существование таблицы users
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").all();
  console.log('📋 Таблица users существует:', tables.length > 0);
  
  if (tables.length > 0) {
    // Получаем схему таблицы users
    const schema = db.prepare("PRAGMA table_info(users)").all();
    console.log('🏗️ Схема таблицы users:');
    schema.forEach(col => {
      console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // Проверяем количество пользователей
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    console.log('👥 Количество пользователей:', userCount.count);
    
    // Показываем первых 3 пользователей
    const users = db.prepare('SELECT id, email, name, role FROM users LIMIT 3').all();
    console.log('👤 Первые пользователи:');
    users.forEach(user => {
      console.log(`  - ID: ${user.id}, Email: ${user.email}, Name: ${user.name}, Role: ${user.role}`);
    });
  }
  
  db.close();
} catch (error) {
  console.error('❌ Ошибка при работе с базой данных:', error.message);
}