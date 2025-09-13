const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Конфигурация базы данных
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'encore_tasks',
  password: 'postgres',
  port: 5432,
});

const testUser = {
  email: 'axelencore@mail.ru',
  password: 'admin123'
};

async function updateUserPassword() {
  try {
    console.log('Обновляем пароль пользователя...');
    
    const client = await pool.connect();
    
    // Генерируем новый хеш пароля
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(testUser.password, saltRounds);
    
    // Обновляем пароль в базе данных
    const result = await client.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2 RETURNING id, email',
      [hashedPassword, testUser.email]
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Пароль успешно обновлен для пользователя:', result.rows[0]);
      
      // Проверяем новый пароль
      const userResult = await client.query('SELECT password_hash FROM users WHERE email = $1', [testUser.email]);
      const passwordMatch = await bcrypt.compare(testUser.password, userResult.rows[0].password_hash);
      
      if (passwordMatch) {
        console.log('✅ Проверка: новый пароль корректный');
      } else {
        console.log('❌ Проверка: новый пароль некорректный');
      }
    } else {
      console.log('❌ Пользователь не найден');
    }
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Ошибка при обновлении пароля:', error.message);
    await pool.end();
  }
}

updateUserPassword();