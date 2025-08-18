const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Конфигурация подключения к PostgreSQL
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'encore_tasks',
  user: 'postgres',
  password: 'encore_password_2024',
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Подключение к PostgreSQL...');
    
    // Проверяем существование таблицы columns
    const checkTable = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'columns' AND table_schema = 'public'
    `);
    
    console.log('📋 Существующие колонки в таблице columns:', checkTable.rows.map(r => r.column_name));
    
    // Выполняем миграцию
    const migrationPath = path.join(__dirname, 'database', 'migrations', '006_update_columns_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Выполняем миграцию...');
    await client.query(migrationSQL);
    
    // Проверяем результат
    const checkAfter = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'columns' AND table_schema = 'public'
    `);
    
    console.log('✅ Колонки после миграции:', checkAfter.rows.map(r => r.column_name));
    console.log('✅ Миграция выполнена успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка миграции:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();