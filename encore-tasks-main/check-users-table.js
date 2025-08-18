const { Pool } = require('pg');

async function checkUsersTable() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'encore_tasks',
    user: 'postgres',
    password: 'postgres'
  });

  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Структура таблицы users:');
    console.log('=' .repeat(50));
    
    if (result.rows.length === 0) {
      console.log('❌ Таблица users не найдена или не содержит колонок');
    } else {
      result.rows.forEach((col, index) => {
        const nullable = col.is_nullable === 'NO' ? '(NOT NULL)' : '';
        const defaultVal = col.column_default ? `DEFAULT: ${col.column_default}` : '';
        console.log(`${index + 1}. ${col.column_name}: ${col.data_type} ${nullable} ${defaultVal}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsersTable();