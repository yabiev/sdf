const { Pool } = require('pg');

// Настройки подключения к базе данных
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'encore_tasks',
  password: 'postgres',
  port: 5432,
});

async function checkUsersTable() {
  try {
    console.log('Checking users table structure...');
    
    // Получаем структуру таблицы users
    const tableStructureQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `;
    
    const structureResult = await pool.query(tableStructureQuery);
    console.log('\nUsers table columns:');
    structureResult.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Получаем несколько записей из таблицы users
    const dataQuery = 'SELECT * FROM users LIMIT 3';
    const dataResult = await pool.query(dataQuery);
    console.log('\nSample users data:');
    console.log(dataResult.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

checkUsersTable();