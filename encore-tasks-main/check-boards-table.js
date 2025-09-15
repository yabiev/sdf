const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

(async () => {
  try {
    console.log('Checking boards table structure...');
    
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'boards' 
      ORDER BY ordinal_position
    `);
    
    console.log('Boards table columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type}`);
    });
    
    // Check if there are any boards
    const boardsResult = await pool.query('SELECT * FROM boards LIMIT 3');
    console.log('\nSample boards data:');
    console.log(boardsResult.rows);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();