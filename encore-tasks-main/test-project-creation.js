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
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  });
  
  return env;
}

async function testProjectCreation() {
  const env = loadEnvFile();
  
  const config = {
    host: env.POSTGRES_HOST || 'localhost',
    port: parseInt(env.POSTGRES_PORT) || 5432,
    database: env.POSTGRES_DB || 'encore_tasks',
    user: env.POSTGRES_USER || 'postgres',
    password: env.POSTGRES_PASSWORD || ''
  };

  console.log('🔧 Конфигурация подключения:', {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password ? '***' : 'НЕ ЗАДАН'
  });

  const pool = new Pool(config);

  try {
    console.log('🔌 Подключение к базе данных...');
    const client = await pool.connect();
    console.log('✅ Подключение успешно!');
    
    // Создаем тестового пользователя
    console.log('👤 Создание тестового пользователя...');
    const userResult = await client.query(`
      INSERT INTO users (email, name, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, email, name
    `, [
      'test_project@example.com',
      'Test User',
      'test_hash'
    ]);
    
    const userId = userResult.rows[0].id;
    console.log('✅ Пользователь создан:', userId);
    
    // Пробуем создать проект
    console.log('📁 Создание проекта...');
    try {
      const projectResult = await client.query(`
        INSERT INTO projects (name, description, owner_id)
        VALUES ($1, $2, $3)
        RETURNING id, name, description, owner_id, created_at
      `, [
        'Test Project',
        'Test Description',
        userId
      ]);
      
      console.log('✅ Проект создан успешно:', projectResult.rows[0]);
      
      // Очистка
      await client.query('DELETE FROM projects WHERE owner_id = $1', [userId]);
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
      console.log('🧹 Тестовые данные очищены');
      
    } catch (projectError) {
      console.error('❌ Ошибка создания проекта:', projectError.message);
      console.error('📋 Детали ошибки:', projectError);
      
      // Очистка пользователя в случае ошибки
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Ошибка подключения:', error.message);
    console.error('📋 Детали ошибки:', error);
  } finally {
    await pool.end();
  }
}

testProjectCreation().catch(console.error);