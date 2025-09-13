const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'encore_tasks',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true'
});

async function checkSessionsTable() {
  try {
    console.log('🔍 Проверяем структуру таблицы sessions...');
    
    // Получаем информацию о столбцах таблицы sessions
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'sessions' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Таблица sessions не найдена');
    } else {
      console.log('✅ Структура таблицы sessions:');
      result.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    }
    
    // Также проверим, существует ли таблица вообще
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'sessions'
      );
    `);
    
    console.log('\n📋 Таблица sessions существует:', tableExists.rows[0].exists);
    
  } catch (error) {
    console.error('❌ Ошибка при проверке таблицы sessions:', error.message);
  } finally {
    await pool.end();
  }
}

checkSessionsTable();