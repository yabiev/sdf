const { Pool } = require('pg');
require('dotenv').config();

// Database configuration from .env
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'encore_tasks',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function addMissingColumns() {
  const client = await pool.connect();
  
  try {
    console.log('Подключение к базе данных...');
    
    // Check if settings column exists
    const settingsColumnExists = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'columns' AND column_name = 'settings'
    `);
    
    if (settingsColumnExists.rows.length === 0) {
      console.log('Добавление колонки settings...');
      await client.query(`
        ALTER TABLE columns 
        ADD COLUMN settings JSONB DEFAULT '{}'
      `);
      console.log('Колонка settings добавлена успешно');
    } else {
      console.log('Колонка settings уже существует');
    }
    
    // Check if created_by column exists
    const createdByColumnExists = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'columns' AND column_name = 'created_by'
    `);
    
    if (createdByColumnExists.rows.length === 0) {
      console.log('Добавление колонки created_by...');
      await client.query(`
        ALTER TABLE columns 
        ADD COLUMN created_by UUID REFERENCES users(id)
      `);
      console.log('Колонка created_by добавлена успешно');
    } else {
      console.log('Колонка created_by уже существует');
    }
    
    console.log('Все изменения применены успешно!');
    
  } catch (error) {
    console.error('Ошибка при обновлении схемы:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addMissingColumns();