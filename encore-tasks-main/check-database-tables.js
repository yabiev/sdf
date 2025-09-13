const { Pool } = require('pg');
require('dotenv').config();

async function checkDatabaseTables() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'encore_tasks',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true'
  });

  try {
    console.log('🔍 Проверка таблиц в базе данных...');
    
    // Получаем список всех таблиц
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    const result = await pool.query(tablesQuery);
    
    console.log('📋 Найденные таблицы:');
    if (result.rows.length === 0) {
      console.log('❌ Таблицы не найдены');
    } else {
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.table_name}`);
      });
    }
    
    // Проверяем конкретные таблицы, которые нужны для приложения
    const requiredTables = ['users', 'user_sessions', 'projects', 'tasks', 'comments', 'tags'];
    
    console.log('\n🔍 Проверка обязательных таблиц:');
    for (const tableName of requiredTables) {
      const checkQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `;
      
      const checkResult = await pool.query(checkQuery, [tableName]);
      const exists = checkResult.rows[0].exists;
      
      console.log(`${exists ? '✅' : '❌'} ${tableName}: ${exists ? 'существует' : 'отсутствует'}`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки таблиц:', error);
  } finally {
    await pool.end();
  }
}

checkDatabaseTables();