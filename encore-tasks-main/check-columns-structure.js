const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Читаем конфигурацию базы данных
const envPath = path.join(__dirname, '.env.local');
let dbConfig = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  lines.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

// Настройка подключения к PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'encore_tasks',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function checkColumnsStructure() {
  try {
    console.log('Подключение к базе данных...');
    
    // Проверяем структуру таблицы columns
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'columns' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nСтруктура таблицы columns:');
    console.log('='.repeat(50));
    
    if (result.rows.length === 0) {
      console.log('Таблица columns не найдена!');
    } else {
      result.rows.forEach(row => {
        console.log(`${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default || 'none'})`);
      });
    }
    
    // Проверяем, есть ли поле created_by
    const hasCreatedBy = result.rows.some(row => row.column_name === 'created_by');
    console.log(`\nПоле created_by: ${hasCreatedBy ? 'найдено' : 'отсутствует'}`);
    
    if (!hasCreatedBy) {
      console.log('\nНеобходимо добавить поле created_by в таблицу columns');
    }
    
  } catch (error) {
    console.error('Ошибка при проверке структуры таблицы:', error.message);
  } finally {
    await pool.end();
  }
}

checkColumnsStructure();