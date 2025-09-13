const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'encore_tasks_db',
  password: 'postgres',
  port: 5432,
});

async function checkCurrentHash() {
  try {
    console.log('🔍 Проверяем текущий хеш в базе данных...');
    
    // Получаем текущий хеш
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE email = $1',
      ['axelencore@mail.ru']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Пользователь не найден');
      return;
    }
    
    const currentHash = result.rows[0].password_hash;
    console.log('📋 Текущий хеш в БД:', currentHash);
    console.log('📋 Начало хеша:', currentHash.substring(0, 20) + '...');
    
    // Проверяем пароль admin123
    const isValid = await bcrypt.compare('admin123', currentHash);
    console.log('🔐 Пароль admin123 валиден:', isValid);
    
    // Генерируем новый хеш для сравнения
    const newHash = await bcrypt.hash('admin123', 10);
    console.log('🆕 Новый хеш для admin123:', newHash);
    console.log('🆕 Начало нового хеша:', newHash.substring(0, 20) + '...');
    
    // Проверяем новый хеш
    const newHashValid = await bcrypt.compare('admin123', newHash);
    console.log('🔐 Новый хеш валиден:', newHashValid);
    
    // Обновляем хеш в базе данных
    console.log('🔄 Обновляем хеш в базе данных...');
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [newHash, 'axelencore@mail.ru']
    );
    
    // Проверяем обновление
    const updatedResult = await pool.query(
      'SELECT password_hash FROM users WHERE email = $1',
      ['axelencore@mail.ru']
    );
    
    const updatedHash = updatedResult.rows[0].password_hash;
    console.log('✅ Хеш обновлен в БД:', updatedHash.substring(0, 20) + '...');
    
    // Финальная проверка
    const finalCheck = await bcrypt.compare('admin123', updatedHash);
    console.log('🎯 Финальная проверка пароля:', finalCheck);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await pool.end();
  }
}

checkCurrentHash();