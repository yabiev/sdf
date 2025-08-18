const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Настройки подключения к базе данных
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'encore_tasks_db',
  password: 'postgres',
  port: 5432,
});

async function runMigration() {
  try {
    console.log('Подключение к базе данных...');
    
    // Читаем файл миграции
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '005_increase_session_token_length.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Выполнение миграции...');
    console.log('SQL:', migrationSQL);
    
    // Выполняем миграцию
    await pool.query(migrationSQL);
    
    console.log('Миграция успешно выполнена!');
    
    // Проверяем результат
    const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'user_sessions' 
      AND column_name IN ('session_token', 'refresh_token')
    `);
    
    console.log('Обновленная структура полей:');
    result.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}${row.character_maximum_length ? `(${row.character_maximum_length})` : ''}`);
    });
    
  } catch (error) {
    console.error('Ошибка при выполнении миграции:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();