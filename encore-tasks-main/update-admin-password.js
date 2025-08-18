const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

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

async function checkAndUpdateAdmin() {
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
    
    console.log('🔍 Проверка текущего пользователя axelencore@mail.ru...');
    const userResult = await client.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      ['axelencore@mail.ru']
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ Пользователь не найден!');
    } else {
      const user = userResult.rows[0];
      console.log('✅ Пользователь найден:');
      console.log('   ID:', user.id);
      console.log('   Email:', user.email);
      console.log('   Текущий хеш пароля:', user.password_hash);
      
      console.log('\n🔄 Обновление пароля на Ad580dc6axelencore...');
      const newPasswordHash = await bcrypt.hash('Ad580dc6axelencore', 10);
      
      await client.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        [newPasswordHash, 'axelencore@mail.ru']
      );
      
      console.log('✅ Пароль успешно обновлен!');
      console.log('   Новый хеш:', newPasswordHash);
      
      console.log('\n🧪 Тестирование входа...');
      const testPassword = 'Ad580dc6axelencore';
      const isValid = await bcrypt.compare(testPassword, newPasswordHash);
      console.log('   Результат проверки пароля:', isValid ? '✅ УСПЕШНО' : '❌ ОШИБКА');
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await pool.end();
  }
}

checkAndUpdateAdmin().catch(console.error);