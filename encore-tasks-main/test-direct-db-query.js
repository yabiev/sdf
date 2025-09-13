const Database = require('better-sqlite3');
const path = require('path');

// Подключаемся к базе данных
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

console.log('=== ПРЯМОЙ ТЕСТ ЗАПРОСА К БД ===');

// Токен из базы данных
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItMTc1NTI5OTcwNDY2MiIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTc1NjIyNTk3NiwiZXhwIjoxNzU2MzEyMzc2fQ.IJ-n2anSLb4U7h1qZBEWUFnKs_LLVhiKvPDjRkS78ks';

console.log('Ищем токен:', token);
console.log('Длина токена:', token.length);

// Прямой запрос
const stmt = db.prepare('SELECT * FROM sessions WHERE id = ?');
const result = stmt.get(token);

console.log('Результат прямого запроса:', result);

// Проверим все сессии
const allSessions = db.prepare('SELECT * FROM sessions').all();
console.log('\nВсе сессии в БД:');
allSessions.forEach((session, index) => {
  console.log(`${index + 1}. ID: ${session.id}`);
  console.log(`   Длина ID: ${session.id.length}`);
  console.log(`   User ID: ${session.user_id}`);
  console.log(`   Expires: ${session.expires_at}`);
  console.log(`   Совпадает с искомым: ${session.id === token}`);
  console.log('');
});