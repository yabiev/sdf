const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

async function updateAdminPassword() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'encore_tasks',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true'
  });

  try {
    console.log('🔐 Обновление пароля административного пользователя...');
    
    // Правильный пароль
    const correctPassword = 'Ad580dc6axelencore';
    const saltRounds = 10;
    
    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(correctPassword, saltRounds);
    console.log('🔐 Новый хеш пароля:', hashedPassword);
    
    // Обновляем пароль в базе данных
    const updateQuery = 'UPDATE users SET password_hash = $1 WHERE email = $2';
    const result = await pool.query(updateQuery, [hashedPassword, 'axelencore@mail.ru']);
    
    console.log('✅ Пароль обновлен. Затронуто строк:', result.rowCount);
    
    // Проверяем обновление
    const checkQuery = 'SELECT email, password_hash FROM users WHERE email = $1';
    const checkResult = await pool.query(checkQuery, ['axelencore@mail.ru']);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Пользователь найден:', checkResult.rows[0].email);
      console.log('✅ Хеш пароля обновлен:', checkResult.rows[0].password_hash.substring(0, 20) + '...');
      
      // Тестируем новый пароль
      const isValid = await bcrypt.compare(correctPassword, checkResult.rows[0].password_hash);
      console.log('✅ Проверка нового пароля:', isValid ? 'УСПЕШНО' : 'ОШИБКА');
    } else {
      console.log('❌ Пользователь не найден');
    }
    
  } catch (error) {
    console.error('❌ Ошибка обновления пароля:', error);
  } finally {
    await pool.end();
  }
}

updateAdminPassword();