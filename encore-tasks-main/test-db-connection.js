const { Pool } = require('pg');
require('dotenv').config();

async function testConnection() {
  console.log('Testing database connection...');
  console.log('DB_HOST:', process.env.DB_HOST);
  console.log('DB_PORT:', process.env.DB_PORT);
  console.log('DB_NAME:', process.env.DB_NAME);
  console.log('DB_USER:', process.env.DB_USER);
  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true'
  });

  try {
    const client = await pool.connect();
    console.log('Connected to database successfully!');
    
    // Check projects table structure
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'projects' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nProjects table columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Test the exact query that's failing
    console.log('\nTesting the failing query...');
    try {
      const testResult = await client.query('SELECT owner_id FROM projects WHERE id = $1', ['f8fc9392-1a68-4a31-aea5-5fd2612a6d3f']);
      console.log('Query successful! Result:', testResult.rows);
    } catch (error) {
      console.error('Query failed:', error.message);
      console.error('Error details:', error);
    }
    
    client.release();
  } catch (error) {
    console.error('Database connection failed:', error.message);
    console.error('Error details:', error);
  } finally {
    await pool.end();
  }
}

testConnection();