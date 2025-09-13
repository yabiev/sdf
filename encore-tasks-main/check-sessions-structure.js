const { Pool } = require('pg');
require('dotenv').config();

async function checkSessionsStructure() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  try {
    console.log('🔍 Проверка структуры таблицы sessions...');
    
    // Получаем структуру таблицы sessions
    const structureQuery = `
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'sessions'
      ORDER BY ordinal_position;
    `;
    
    const result = await pool.query(structureQuery);
    
    console.log('\n📋 Структура таблицы sessions:');
    console.log('================================');
    result.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}${row.character_maximum_length ? `(${row.character_maximum_length})` : ''} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });
    
    console.log('\n✅ Структура таблицы sessions получена успешно');
    
  } catch (error) {
    console.error('❌ Ошибка при проверке структуры таблицы sessions:', error.message);
  } finally {
    await pool.end();
  }
}

checkSessionsStructure();