const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'encore_tasks',
  user: 'postgres',
  password: 'postgres'
});

async function checkProjectsTable() {
  try {
    console.log('📋 Checking projects table structure...');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'projects' 
      ORDER BY ordinal_position
    `);
    
    console.log('Projects table columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    console.log('\n📊 Sample projects data:');
    const projectsResult = await pool.query('SELECT * FROM projects LIMIT 3');
    console.log(`Found ${projectsResult.rows.length} projects`);
    projectsResult.rows.forEach((project, index) => {
      console.log(`Project ${index + 1}:`, project);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkProjectsTable();