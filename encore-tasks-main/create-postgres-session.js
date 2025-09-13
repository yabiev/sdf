const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

console.log('=== СОЗДАНИЕ СЕССИИ В POSTGRESQL ===');

// Настройки подключения к PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'encore_tasks',
  password: 'postgres',
  port: 5432,
});

// JWT Secret
const JWT_SECRET = 'your-super-secret-jwt-key-here-change-in-production';

async function createSession() {
  try {
    // Найдем пользователя с нужным ID
    const targetUserId = '3a028dd5-5327-457a-b8d4-11c7e2c706ce';
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [targetUserId]);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Пользователь с ID', targetUserId, 'не найден');
      // Попробуем найти любого пользователя
      const anyUserResult = await pool.query('SELECT * FROM users LIMIT 1');
      if (anyUserResult.rows.length === 0) {
        console.log('❌ Пользователи вообще не найдены');
        process.exit(1);
      }
      user = anyUserResult.rows[0];
      console.log('📋 Найден другой пользователь:', user.id, user.email);
    } else {
      user = userResult.rows[0];
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
    const deleteResult = await pool.query('DELETE FROM sessions WHERE user_id = $1', [user.id]);
    console.log('🗑️ Удалено старых сессий:', deleteResult.rowCount);
    
    // Создаем новую сессию
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа
    const createdAt = new Date();
    
    const insertResult = await pool.query(
      'INSERT INTO sessions (session_token, user_id, expires_at, created_at) VALUES ($1, $2, $3, $4) RETURNING *',
      [jwtToken, user.id, expiresAt, createdAt]
    );
    
    console.log('✅ Сессия создана успешно');
    
    // Проверяем созданную сессию
    const checkResult = await pool.query('SELECT * FROM sessions WHERE session_token = $1', [jwtToken]);
    
    if (checkResult.rows.length > 0) {
      const session = checkResult.rows[0];
      console.log('✅ Сессия найдена в БД:', {
        session_token: session.session_token.substring(0, 50) + '...',
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
    await pool.end();
  }
}

createSession();