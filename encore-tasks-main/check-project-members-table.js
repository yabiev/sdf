const { Pool } = require('pg');

// Настройки подключения к базе данных
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'encore_tasks',
  password: 'postgres',
  port: 5432,
});

async function checkProjectMembersTable() {
  try {
    console.log('Checking project_members table structure...');
    
    // Получаем структуру таблицы project_members
    const tableStructureQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'project_members' 
      ORDER BY ordinal_position;
    `;
    
    const structureResult = await pool.query(tableStructureQuery);
    console.log('\nProject_members table columns:');
    structureResult.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Получаем несколько записей из таблицы project_members
    const dataQuery = 'SELECT * FROM project_members LIMIT 3';
    const dataResult = await pool.query(dataQuery);
    console.log('\nSample project_members data:');
    console.log(dataResult.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

checkProjectMembersTable();