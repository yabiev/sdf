const { Pool } = require('pg');
require('dotenv').config();

async function testPostgreSQLConnection() {
  console.log('🔍 Тестирование подключения к PostgreSQL...');
  
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'encore_tasks',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true' ? false : false
  };
  
  console.log('📋 Конфигурация подключения:', {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    ssl: config.ssl
  });
  
  const pool = new Pool(config);
  
  try {
    // Тест подключения
    console.log('\n1️⃣ Проверка подключения...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Подключение успешно:', result.rows[0].current_time);
    client.release();
    
    // Проверка существования таблиц
    console.log('\n2️⃣ Проверка существования таблиц...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log('📊 Найденные таблицы:', tables);
    
    // Проверка таблицы projects
    if (tables.includes('projects')) {
      console.log('\n3️⃣ Проверка таблицы projects...');
      const projectsCount = await pool.query('SELECT COUNT(*) as count FROM projects');
      console.log('📈 Количество проектов в БД:', projectsCount.rows[0].count);
      
      // Показать последние 5 проектов
      const recentProjects = await pool.query(`
        SELECT id, name, description, created_at 
        FROM projects 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      console.log('📋 Последние проекты:');
      recentProjects.rows.forEach((project, index) => {
        console.log(`   ${index + 1}. ${project.name} (ID: ${project.id})`);
      });
    } else {
      console.log('❌ Таблица projects не найдена!');
    }
    
  } catch (error) {
    console.error('❌ Ошибка подключения к PostgreSQL:', error.message);
    console.error('🔍 Детали ошибки:', error);
  } finally {
    await pool.end();
  }
}

testPostgreSQLConnection().catch(console.error);