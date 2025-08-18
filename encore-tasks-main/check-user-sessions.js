const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);

console.log('🔍 Проверка структуры таблицы user_sessions...');

try {
  // Проверяем существование таблицы user_sessions
  const userSessionsExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='user_sessions'
  `).get();
  
  if (userSessionsExists) {
    console.log('✅ Таблица user_sessions существует');
    
    // Получаем структуру таблицы user_sessions
    const userSessionsStructure = db.prepare('PRAGMA table_info(user_sessions)').all();
    console.log('\n📋 Структура таблицы user_sessions:');
    console.table(userSessionsStructure);
    
    // Проверяем записи в user_sessions
    const userSessionsCount = db.prepare('SELECT COUNT(*) as count FROM user_sessions').get();
    console.log(`\n📊 Количество записей в user_sessions: ${userSessionsCount.count}`);
    
    if (userSessionsCount.count > 0) {
      const userSessionsRecords = db.prepare('SELECT * FROM user_sessions LIMIT 5').all();
      console.log('\n📝 Первые 5 записей в user_sessions:');
      console.table(userSessionsRecords);
    }
  } else {
    console.log('❌ Таблица user_sessions НЕ существует');
  }
  
  // Проверяем структуру таблицы sessions для сравнения
  console.log('\n🔍 Структура таблицы sessions для сравнения:');
  const sessionsStructure = db.prepare('PRAGMA table_info(sessions)').all();
  console.table(sessionsStructure);
  
  // Проверяем записи в sessions
  const sessionsCount = db.prepare('SELECT COUNT(*) as count FROM sessions').get();
  console.log(`\n📊 Количество записей в sessions: ${sessionsCount.count}`);
  
  if (sessionsCount.count > 0) {
    const sessionsRecords = db.prepare('SELECT * FROM sessions LIMIT 5').all();
    console.log('\n📝 Первые 5 записей в sessions:');
    console.table(sessionsRecords);
  }
  
} catch (error) {
  console.error('❌ Ошибка при проверке базы данных:', error.message);
} finally {
  db.close();
  console.log('\n🔌 Соединение с базой данных закрыто');
}