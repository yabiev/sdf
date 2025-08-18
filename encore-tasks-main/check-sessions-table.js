const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Загрузка переменных окружения из .env файла
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
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  });
  
  return env;
}

// Проверка структуры таблицы sessions
async function checkSessionsTable() {
  console.log('🔍 Проверка структуры таблицы sessions...');
  console.log('=' .repeat(50));

  // Загрузка конфигурации
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
    console.log('✅ Подключение к PostgreSQL установлено\n');

    // Получение структуры таблицы sessions
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'sessions' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Структура таблицы sessions:');
    if (result.rows.length === 0) {
      console.log('❌ Таблица sessions не найдена!');
    } else {
      result.rows.forEach(row => {
        console.log(`   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}) default: ${row.column_default || 'none'}`);
      });
    }

    client.release();
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await pool.end();
  }
}

// Запуск проверки
if (require.main === module) {
  checkSessionsTable()
    .then(() => {
      console.log('\n🏁 Проверка структуры завершена.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Критическая ошибка:', error.message);
      process.exit(1);
    });
}

module.exports = { checkSessionsTable };