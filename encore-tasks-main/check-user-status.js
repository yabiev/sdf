const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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

async function checkUserStatus() {
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
    
    console.log('🔍 Проверка состояния пользователя axelencore@mail.ru...');
    
    // Проверяем существование пользователя
    const userResult = await client.query(
      'SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = $1',
      ['axelencore@mail.ru']
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ Пользователь axelencore@mail.ru не найден в базе данных!');
    } else {
      const user = userResult.rows[0];
      console.log('✅ Пользователь найден:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password Hash: ${user.password_hash}`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Updated: ${user.updated_at}`);
      
      // Проверяем длину хеша пароля
      if (user.password_hash) {
        console.log(`   Hash Length: ${user.password_hash.length} символов`);
        console.log(`   Hash starts with: ${user.password_hash.substring(0, 10)}...`);
      } else {
        console.log('❌ Password hash пустой!');
      }
    }
    
    // Проверяем общее количество пользователей
    const countResult = await client.query('SELECT COUNT(*) as total FROM users');
    console.log(`\n📊 Всего пользователей в базе: ${countResult.rows[0].total}`);
    
    client.release();
  } catch (error) {
    console.error('❌ Ошибка при проверке пользователя:', error.message);
  } finally {
    await pool.end();
  }
}

checkUserStatus().catch(console.error);