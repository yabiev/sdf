const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function fixPostgresPassword() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'encore_tasks',
    user: 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres'
  });

  try {
    console.log('🔌 Подключение к PostgreSQL...');
    await client.connect();
    console.log('✅ Подключение установлено');

    // Проверяем текущего пользователя
    console.log('\n🔍 Проверка текущего пользователя...');
    const userResult = await client.query('SELECT id, email, password_hash FROM users WHERE email = $1', ['test@example.com']);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Пользователь test@example.com не найден');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('👤 Найден пользователь:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Текущий hash:', user.password_hash ? user.password_hash.substring(0, 20) + '...' : 'отсутствует');
    
    // Создаем новый хеш пароля
    console.log('\n🔐 Создание нового хеша пароля...');
    const newPassword = 'password123';
    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    console.log('✅ Новый хеш создан:', newPasswordHash.substring(0, 20) + '...');
    
    // Обновляем пароль
    console.log('\n💾 Обновление пароля в базе данных...');
    const updateResult = await client.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2',
      [newPasswordHash, 'test@example.com']
    );
    
    console.log('✅ Пароль обновлен. Затронуто строк:', updateResult.rowCount);
    
    // Проверяем результат
    console.log('\n🔍 Проверка обновленного пользователя...');
    const updatedUserResult = await client.query('SELECT id, email, password_hash FROM users WHERE email = $1', ['test@example.com']);
    const updatedUser = updatedUserResult.rows[0];
    
    console.log('👤 Обновленный пользователь:');
    console.log('  ID:', updatedUser.id);
    console.log('  Email:', updatedUser.email);
    console.log('  Новый hash:', updatedUser.password_hash.substring(0, 20) + '...');
    
    // Тестируем пароль
    console.log('\n🧪 Тестирование пароля...');
    const isValid = await bcrypt.compare(newPassword, updatedUser.password_hash);
    console.log('✅ Пароль "password123" валиден:', isValid);
    
    console.log('\n🎉 Исправление завершено!');
    console.log('📝 Теперь можно войти с:');
    console.log('   Email: test@example.com');
    console.log('   Password: password123');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    if (error.code) {
      console.error('❌ Код ошибки:', error.code);
    }
  } finally {
    await client.end();
    console.log('🔌 Соединение закрыто');
  }
}

fixPostgresPassword();