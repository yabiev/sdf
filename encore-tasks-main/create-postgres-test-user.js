const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Конфигурация PostgreSQL из .env.local
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'encore_tasks',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function createTestUser() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Подключение к PostgreSQL...');
    
    // Проверяем существующих пользователей
    const usersResult = await client.query('SELECT id, email, name, role FROM users');
    console.log('👥 Всего пользователей в PostgreSQL:', usersResult.rows.length);
    console.log('👥 Список пользователей:');
    usersResult.rows.forEach(user => {
      console.log(`  - ${user.email} (${user.role})`);
    });
    
    // Проверяем наличие тестового пользователя
    const testUserResult = await client.query('SELECT * FROM users WHERE email = $1', ['test@example.com']);
    
    if (testUserResult.rows.length > 0) {
      const testUser = testUserResult.rows[0];
      console.log('✅ Тестовый пользователь найден:', testUser.email);
      console.log('🔍 Проверяю хеш пароля:', testUser.password_hash.substring(0, 20) + '...');
      
      // Проверяем, правильно ли захеширован пароль
      const isValidHash = testUser.password_hash.startsWith('$2a$') || testUser.password_hash.startsWith('$2b$');
      if (!isValidHash) {
        console.log('❌ Пароль не захеширован! Обновляю...');
        const hashedPassword = await bcrypt.hash('testpassword123', 12);
        await client.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hashedPassword, 'test@example.com']);
        console.log('✅ Пароль успешно захеширован!');
      } else {
        console.log('✅ Пароль правильно захеширован');
      }
      
      // Проверяем статус одобрения
      console.log('🔍 Статус одобрения:', testUser.approval_status);
      if (testUser.approval_status !== 'approved') {
        console.log('❌ Пользователь не одобрен! Обновляю статус...');
        await client.query('UPDATE users SET approval_status = $1 WHERE email = $2', ['approved', 'test@example.com']);
        console.log('✅ Статус одобрения обновлен!');
      } else {
        console.log('✅ Пользователь одобрен');
      }
    } else {
      console.log('❌ Тестовый пользователь не найден. Создаю...');
      
      // Создаем тестового пользователя
      const hashedPassword = await bcrypt.hash('testpassword123', 12);
      const userId = uuidv4();
      const now = new Date().toISOString();
      
      await client.query(`
        INSERT INTO users (id, email, name, password_hash, role, approval_status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        userId,
        'test@example.com',
        'Test User',
        hashedPassword,
        'user',
        true, // approved
        now,
        now
      ]);
      
      console.log('✅ Тестовый пользователь создан успешно!');
      console.log('📧 Email: test@example.com');
      console.log('🔑 Пароль: testpassword123');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    client.release();
    await pool.end();
    console.log('✅ Подключение закрыто.');
  }
}

createTestUser();