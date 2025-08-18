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

async function checkUsers() {
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
    
    console.log('🔍 Проверка пользователей в базе данных...');
    
    // Проверяем структуру таблицы users
    const tableStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Структура таблицы users:');
    tableStructure.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
    });
    
    // Получаем всех пользователей
    const usersResult = await client.query('SELECT id, email, password_hash, created_at FROM users ORDER BY created_at');
    
    console.log('\n👥 Найденные пользователи:');
    if (usersResult.rows.length === 0) {
      console.log('   Пользователи не найдены');
    } else {
      usersResult.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ID: ${user.id}`);
        console.log(`      Email: ${user.email}`);
        console.log(`      Password Hash: ${user.password_hash ? user.password_hash.substring(0, 20) + '...' : 'NULL'}`);
        console.log(`      Created: ${user.created_at}`);
        console.log('');
      });
    }
    
    // Ищем конкретного администратора
    const adminResult = await client.query('SELECT * FROM users WHERE email = $1', ['axelencore@mail.ru']);
    
    console.log('🔍 Поиск администратора axelencore@mail.ru:');
    if (adminResult.rows.length === 0) {
      console.log('   ❌ Администратор не найден');
    } else {
      const admin = adminResult.rows[0];
      console.log('   ✅ Администратор найден:');
      console.log(`      ID: ${admin.id}`);
      console.log(`      Email: ${admin.email}`);
      console.log(`      Password Hash: ${admin.password_hash}`);
      console.log(`      Created: ${admin.created_at}`);
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers().catch(console.error);