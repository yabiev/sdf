const { Pool } = require('pg');

async function checkTasksTable() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'encore_tasks',
    user: 'postgres',
    password: 'newpassword123'
  });

  try {
    console.log('🔍 Checking tasks table structure...');
    
    // Получаем структуру таблицы tasks
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'tasks' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Tasks table columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Проверим также есть ли данные в таблице
    const countResult = await pool.query('SELECT COUNT(*) as count FROM tasks');
    console.log(`\n📊 Total tasks in table: ${countResult.rows[0].count}`);
    
    // Покажем первые несколько записей если есть
    if (countResult.rows[0].count > 0) {
      const sampleResult = await pool.query('SELECT * FROM tasks LIMIT 3');
      console.log('\n📝 Sample tasks:');
      sampleResult.rows.forEach((task, index) => {
        console.log(`Task ${index + 1}:`, task);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking tasks table:', error.message);
  } finally {
    await pool.end();
  }
}

checkTasksTable();