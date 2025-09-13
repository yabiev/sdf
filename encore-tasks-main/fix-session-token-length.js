const { Pool } = require('pg');
require('dotenv').config();

async function fixSessionTokenLength() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  try {
    console.log('🔧 Увеличение размера поля session_token...');
    
    // Увеличиваем размер поля session_token до 500 символов
    const alterQuery = `
      ALTER TABLE sessions 
      ALTER COLUMN session_token TYPE VARCHAR(500);
    `;
    
    await pool.query(alterQuery);
    
    console.log('✅ Размер поля session_token увеличен до 500 символов');
    
    // Проверяем изменения
    const checkQuery = `
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'sessions'
        AND column_name = 'session_token';
    `;
    
    const result = await pool.query(checkQuery);
    
    console.log('\n📋 Обновленная структура поля session_token:');
    console.log('============================================');
    result.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}(${row.character_maximum_length})`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка при изменении размера поля session_token:', error.message);
  } finally {
    await pool.end();
  }
}

fixSessionTokenLength();