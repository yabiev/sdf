const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const path = require('path');

console.log('=== СОЗДАНИЕ JWT СЕССИИ ===');

// Путь к базе данных SQLite
const dbPath = path.join(__dirname, 'database.sqlite');
console.log('📁 Путь к БД:', dbPath);

// Подключение к базе данных
const db = new Database(dbPath);

// JWT Secret
const JWT_SECRET = 'your-super-secret-jwt-key-here-change-in-production';

async function createSession() {
  try {
    // Найдем пользователя с нужным ID
    const targetUserId = '3a028dd5-5327-457a-b8d4-11c7e2c706ce';
    
    let user = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId);
    
    if (!user) {
      console.log('❌ Пользователь с ID', targetUserId, 'не найден');
      // Попробуем найти любого пользователя
      user = db.prepare('SELECT * FROM users LIMIT 1').get();
      if (!user) {
        console.log('❌ Пользователи вообще не найдены');
        process.exit(1);
      }
      console.log('📋 Найден другой пользователь:', user.id, user.email);
    }
    
    console.log('👤 Найден пользователь:', user.id, user.email);
    
    // Создаем JWT токен
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role || 'user',
      name: user.name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 часа
    };
    
    const jwtToken = jwt.sign(payload, JWT_SECRET);
    console.log('🔑 Создан JWT токен:', jwtToken);
    
    // Удаляем старые сессии для этого пользователя
    const deleteStmt = db.prepare('DELETE FROM sessions WHERE user_id = ?');
    const deleteResult = deleteStmt.run(user.id);
    console.log('🗑️ Удалено старых сессий:', deleteResult.changes);
    
    // Создаем новую сессию
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа
    const createdAt = new Date();
    
    const insertStmt = db.prepare(`
      INSERT INTO sessions (token, user_id, expires_at, created_at) 
      VALUES (?, ?, ?, ?)
    `);
    
    const insertResult = insertStmt.run(
      jwtToken,
      user.id,
      expiresAt.toISOString(),
      createdAt.toISOString()
    );
    
    console.log('✅ Сессия создана успешно, ID:', insertResult.lastInsertRowid);
    
    // Проверяем созданную сессию
    const checkStmt = db.prepare('SELECT * FROM sessions WHERE token = ?');
    const session = checkStmt.get(jwtToken);
    
    if (session) {
      console.log('✅ Сессия найдена в БД:', {
        token: session.token.substring(0, 50) + '...',
        user_id: session.user_id,
        expires_at: session.expires_at
      });
    } else {
      console.log('❌ Сессия не найдена после создания');
    }
    
    console.log('\n🎯 Используйте этот токен для тестирования:');
    console.log(jwtToken);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    db.close();
  }
}

createSession();