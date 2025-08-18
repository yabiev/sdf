const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Функция для загрузки переменных окружения
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

async function testApiLogin() {
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
    
    console.log('🔍 Тестирование точно такого же процесса как в API login...');
    console.log('');
    
    const email = 'axelencore@mail.ru';
    const password = 'Ad50dc6axelencore';
    
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('');
    
    // Шаг 1: Поиск пользователя (точно как в API)
    console.log('1️⃣ Поиск пользователя по email...');
    const userResult = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ Пользователь не найден!');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('✅ Пользователь найден:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Has password hash:', !!user.password_hash);
    console.log('   Password hash length:', user.password_hash ? user.password_hash.length : 'NULL');
    console.log('   Password hash:', user.password_hash);
    console.log('');
    
    // Шаг 2: Проверка пароля (точно как в API)
    console.log('2️⃣ Проверка пароля с bcrypt.compare...');
    console.log('   Входной пароль:', password);
    console.log('   Тип входного пароля:', typeof password);
    console.log('   Длина входного пароля:', password.length);
    console.log('   Хеш из базы:', user.password_hash);
    console.log('   Тип хеша:', typeof user.password_hash);
    console.log('   Длина хеша:', user.password_hash ? user.password_hash.length : 'NULL');
    console.log('');
    
    const isValidPassword = user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
    console.log('   Результат bcrypt.compare:', isValidPassword);
    
    if (isValidPassword) {
      console.log('✅ ПАРОЛЬ ПРАВИЛЬНЫЙ!');
    } else {
      console.log('❌ ПАРОЛЬ НЕПРАВИЛЬНЫЙ!');
      
      // Дополнительная диагностика
      console.log('');
      console.log('🔍 Дополнительная диагностика...');
      
      // Проверим, может ли bcrypt вообще работать с этим хешем
      try {
        const testResult1 = await bcrypt.compare('test', user.password_hash);
        console.log('   Тест с паролем "test":', testResult1);
        
        const testResult2 = await bcrypt.compare('', user.password_hash);
        console.log('   Тест с пустым паролем:', testResult2);
        
        // Попробуем создать новый хеш и сравнить
        const newHash = await bcrypt.hash(password, 12);
        console.log('   Новый хеш для того же пароля:', newHash);
        
        const newHashTest = await bcrypt.compare(password, newHash);
        console.log('   Тест с новым хешем:', newHashTest);
        
      } catch (bcryptError) {
        console.log('   Ошибка bcrypt:', bcryptError.message);
      }
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  } finally {
    await pool.end();
  }
}

testApiLogin().catch(console.error);