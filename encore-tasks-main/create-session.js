const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);

console.log('=== СОЗДАНИЕ СЕССИИ ===');

try {
  // Получаем существующего пользователя
  const user = db.prepare('SELECT * FROM users LIMIT 1').get();
  console.log('Найденный пользователь:', user);
  
  if (!user) {
    throw new Error('Пользователь не найден в базе данных');
  }
  
  // Генерируем токен сессии
  const JWT_SECRET = 'your-super-secret-jwt-key-here-change-in-production';
  const sessionToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  console.log('Сгенерированный токен сессии:', sessionToken);
  
  // Создаем сессию в базе данных
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа
  
  const insertSession = db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at, created_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `);
  
  const result = insertSession.run(sessionToken, user.id, expiresAt.toISOString());
  
  console.log('Сессия создана:', result);
  
  // Проверяем созданную сессию
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionToken);
  console.log('Созданная сессия:', session);
  
} catch (error) {
  console.error('Ошибка при создании сессии:', error);
} finally {
  db.close();
}