const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'encore_tasks',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

console.log('Конфигурация подключения:', {
  ...config,
  password: '***'
});

const pool = new Pool(config);

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Подключение к PostgreSQL успешно!');
    
    // Проверим пользователей
    const usersResult = await client.query('SELECT id, email, name FROM users LIMIT 5');
    console.log('\n👥 Пользователи в базе данных:');
    console.log(usersResult.rows);
    
    client.release();
  } catch (error) {
    console.error('❌ Ошибка подключения к PostgreSQL:', error.message);
  } finally {
    await pool.end();
  }
}

testConnection();