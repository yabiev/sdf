const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD
});

async function checkUsersIdType() {
  try {
    console.log('Проверка типа данных поля id в таблице users...');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id'
      ORDER BY ordinal_position
    `);
    
    if (result.rows.length > 0) {
      const column = result.rows[0];
      console.log('\nИнформация о поле id в таблице users:');
      console.log(`  Название: ${column.column_name}`);
      console.log(`  Тип данных: ${column.data_type}`);
      console.log(`  Может быть NULL: ${column.is_nullable}`);
      console.log(`  Значение по умолчанию: ${column.column_default || 'нет'}`);
    } else {
      console.log('❌ Поле id не найдено в таблице users');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при проверке типа данных:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsersIdType();