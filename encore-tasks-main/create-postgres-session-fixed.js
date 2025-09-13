const { Client } = require('pg');
const jwt = require('jsonwebtoken');

// Конфигурация базы данных из .env
const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'encore_tasks',
  user: 'postgres',
  password: 'postgres'
};

// JWT Secret
const JWT_SECRET = 'your-super-secret-jwt-key-here-change-in-production';

async function createPostgresSession() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Подключение к PostgreSQL установлено');
    
    // Ищем любого пользователя (в PostgreSQL id имеет тип INTEGER)
    console.log('🔍 Ищем пользователей в PostgreSQL...');
    let userQuery = 'SELECT * FROM users LIMIT 1';
    let userResult = await client.query(userQuery);
    
    if (userResult.rows.length === 0) {
      throw new Error('Нет пользователей в базе данных');
    }
    
    const user = userResult.rows[0];
    console.log('👤 Найден пользователь:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });
    
    // Создаем JWT токен
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    };
    
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
    console.log('🔑 Создан JWT токен:', token);
    
    // Удаляем старые сессии пользователя
    const deleteQuery = 'DELETE FROM sessions WHERE user_id = $1';
    const deleteResult = await client.query(deleteQuery, [user.id]);
    console.log('🗑️ Удалено старых сессий:', deleteResult.rowCount);
    
    // Создаем новую сессию с правильной колонкой session_token
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа
    const insertQuery = `
      INSERT INTO sessions (session_token, user_id, expires_at, created_at) 
      VALUES ($1, $2, $3, NOW()) 
      RETURNING id
    `;
    
    const insertResult = await client.query(insertQuery, [token, user.id, expiresAt]);
    const sessionId = insertResult.rows[0].id;
    console.log('✅ Сессия создана успешно, ID:', sessionId);
    
    // Проверяем созданную сессию
    const checkQuery = 'SELECT session_token, user_id, expires_at FROM sessions WHERE id = $1';
    const checkResult = await client.query(checkQuery, [sessionId]);
    
    if (checkResult.rows.length > 0) {
      const session = checkResult.rows[0];
      console.log('✅ Сессия найдена в PostgreSQL:', {
        session_token: session.session_token.substring(0, 50) + '...',
        user_id: session.user_id,
        expires_at: session.expires_at
      });
    }
    
    console.log('\n🎯 Используйте этот токен для тестирования:');
    console.log(token);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await client.end();
  }
}

createPostgresSession();