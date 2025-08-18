const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
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

async function testLogin() {
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
    console.log('🔍 Тестирование процесса аутентификации...');
    console.log('📧 Email: axelencore@mail.ru');
    console.log('🔑 Password: Ad50dc6axelencore');
    console.log('');
    
    const client = await pool.connect();
    
    // Шаг 1: Поиск пользователя
    console.log('1️⃣ Поиск пользователя по email...');
    const userResult = await client.query(
      'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
      ['axelencore@mail.ru']
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ Пользователь не найден!');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('✅ Пользователь найден:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Approval Status: ${user.approval_status}`);
    console.log(`   Is Active: ${user.is_active}`);
    console.log(`   Password Hash Length: ${user.password_hash ? user.password_hash.length : 'NULL'}`);
    console.log('');
    
    // Шаг 2: Проверка пароля
    console.log('2️⃣ Проверка пароля...');
    const testPassword = 'Ad50dc6axelencore';
    
    if (!user.password_hash) {
      console.log('❌ У пользователя нет хеша пароля!');
      return;
    }
    
    console.log(`   Тестируемый пароль: ${testPassword}`);
    console.log(`   Хеш в базе данных: ${user.password_hash}`);
    
    const isValidPassword = await bcrypt.compare(testPassword, user.password_hash);
    console.log(`   Результат сравнения: ${isValidPassword ? '✅ СОВПАДАЕТ' : '❌ НЕ СОВПАДАЕТ'}`);
    console.log('');
    
    // Шаг 3: Дополнительная проверка - создание нового хеша
    console.log('3️⃣ Дополнительная проверка - создание нового хеша...');
    const newHash = await bcrypt.hash(testPassword, 12);
    console.log(`   Новый хеш: ${newHash}`);
    const newHashCheck = await bcrypt.compare(testPassword, newHash);
    console.log(`   Проверка нового хеша: ${newHashCheck ? '✅ РАБОТАЕТ' : '❌ НЕ РАБОТАЕТ'}`);
    console.log('');
    
    // Шаг 4: Проверка версии bcrypt
    console.log('4️⃣ Информация о bcrypt...');
    console.log(`   Версия bcrypt: ${require('bcryptjs/package.json').version}`);
    console.log('');
    
    // Итоговый результат
    if (isValidPassword) {
      console.log('🎉 АУТЕНТИФИКАЦИЯ ДОЛЖНА ПРОЙТИ УСПЕШНО!');
    } else {
      console.log('❌ АУТЕНТИФИКАЦИЯ НЕ ПРОЙДЕТ - ПРОБЛЕМА С ПАРОЛЕМ!');
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  } finally {
    await pool.end();
  }
}

testLogin().catch(console.error);