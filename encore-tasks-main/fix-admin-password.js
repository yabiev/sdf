const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Загрузка переменных окружения
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Файл .env не найден!');
    return {};
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^[\"']|[\"']$/g, '');
      }
    }
  });
  
  return env;
}

async function fixAdminPassword() {
  const env = loadEnvFile();
  
  const config = {
    host: env.POSTGRES_HOST || 'localhost',
    port: parseInt(env.POSTGRES_PORT) || 5432,
    database: env.POSTGRES_DB || 'encore_tasks',
    user: env.POSTGRES_USER || 'postgres',
    password: env.POSTGRES_PASSWORD || ''
  };
  
  const pool = new Pool(config);
  
  try {
    const client = await pool.connect();
    
    console.log('🔍 Поиск администратора...');
    
    // Проверяем существующего пользователя
    const userResult = await client.query(
      'SELECT id, email, name, role, password_hash FROM users WHERE email = $1',
      ['axelencore@mail.ru']
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ Пользователь axelencore@mail.ru не найден');
      client.release();
      return;
    }
    
    const user = userResult.rows[0];
    console.log('👤 Найден пользователь:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });
    
    // Хешируем новый пароль
    const newPassword = 'Ad580dc6axelencore';
    console.log('🔐 Хеширование нового пароля...');
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Обновляем пароль
    console.log('💾 Обновление пароля в базе данных...');
    const updateResult = await client.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING id, email',
      [hashedPassword, 'axelencore@mail.ru']
    );
    
    if (updateResult.rowCount > 0) {
      console.log('✅ Пароль успешно обновлен!');
      
      // Проверяем новый пароль
      console.log('🧪 Тестирование нового пароля...');
      const testResult = await bcrypt.compare(newPassword, hashedPassword);
      console.log('🧪 Тест пароля:', testResult ? '✅ УСПЕШНО' : '❌ НЕУДАЧНО');
    } else {
      console.log('❌ Не удалось обновить пароль');
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await pool.end();
  }
}

fixAdminPassword().catch(console.error);