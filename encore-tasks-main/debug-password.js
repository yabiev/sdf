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

async function debugPassword() {
  try {
    console.log('🔍 Отладка пароля...');
    
    const client = await pool.connect();
    
    // Получаем текущий хеш из базы данных
    const result = await client.query('SELECT password_hash FROM users WHERE email = $1', [testUser.email]);
    
    if (result.rows.length > 0) {
      const currentHash = result.rows[0].password_hash;
      console.log('📋 Текущий хеш в БД:', currentHash);
      console.log('📋 Длина хеша:', currentHash.length);
      console.log('📋 Начинается с $2:', currentHash.startsWith('$2'));
      
      // Проверяем текущий пароль
      console.log('\n🔐 Проверяем пароль "admin123"...');
      const isValid1 = await bcrypt.compare('admin123', currentHash);
      console.log('✅ admin123 валиден:', isValid1);
      
      // Проверяем другие возможные пароли
      console.log('\n🔐 Проверяем другие пароли...');
      const passwords = ['password', 'admin', '123456', 'test123', 'password123'];
      
      for (const pwd of passwords) {
        const isValid = await bcrypt.compare(pwd, currentHash);
        console.log(`✅ ${pwd} валиден:`, isValid);
        if (isValid) {
          console.log(`🎉 НАЙДЕН ПРАВИЛЬНЫЙ ПАРОЛЬ: ${pwd}`);
          break;
        }
      }
      
      // Создаем новый хеш для admin123
      console.log('\n🔧 Создаем новый хеш для admin123...');
      const newHash = await bcrypt.hash('admin123', 10);
      console.log('📋 Новый хеш:', newHash);
      
      // Проверяем новый хеш
      const newHashValid = await bcrypt.compare('admin123', newHash);
      console.log('✅ Новый хеш валиден:', newHashValid);
      
      // Обновляем пароль в базе данных
      console.log('\n💾 Обновляем пароль в БД...');
      await client.query('UPDATE users SET password_hash = $1 WHERE email = $2', [newHash, testUser.email]);
      console.log('✅ Пароль обновлен в БД');
      
      // Финальная проверка
      const finalResult = await client.query('SELECT password_hash FROM users WHERE email = $1', [testUser.email]);
      const finalHash = finalResult.rows[0].password_hash;
      const finalValid = await bcrypt.compare('admin123', finalHash);
      console.log('\n🎯 Финальная проверка admin123:', finalValid);
      
    } else {
      console.log('❌ Пользователь не найден');
    }
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Ошибка при отладке пароля:', error.message);
    await pool.end();
  }
}

debugPassword();