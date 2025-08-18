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

async function checkTasksConstraints() {
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
    
    console.log('🔍 Проверка ограничений таблицы tasks...');
    
    // Проверяем CHECK constraints для таблицы tasks
    const constraintsResult = await client.query(`
      SELECT 
        conname, 
        pg_get_constraintdef(oid) as definition 
      FROM pg_constraint 
      WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'tasks') 
        AND contype = 'c'
    `);
    
    console.log('📋 Найденные CHECK ограничения:');
    if (constraintsResult.rows.length === 0) {
      console.log('   ❌ CHECK ограничения не найдены');
    } else {
      constraintsResult.rows.forEach(row => {
        console.log(`   ✅ ${row.conname}: ${row.definition}`);
      });
    }
    
    // Проверяем структуру колонки status
    const columnResult = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default 
      FROM information_schema.columns 
      WHERE table_name = 'tasks' 
        AND table_schema = 'public' 
        AND column_name = 'status'
    `);
    
    console.log('\n📋 Информация о колонке status:');
    if (columnResult.rows.length === 0) {
      console.log('   ❌ Колонка status не найдена');
    } else {
      const col = columnResult.rows[0];
      console.log(`   Тип: ${col.data_type}`);
      console.log(`   Nullable: ${col.is_nullable}`);
      console.log(`   Default: ${col.column_default || 'NULL'}`);
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await pool.end();
  }
}

checkTasksConstraints().catch(console.error);