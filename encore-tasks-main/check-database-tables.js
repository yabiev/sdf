const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'encore_tasks',
  password: 'postgres',
  port: 5432,
});

async function checkDatabase() {
  try {
    console.log('Checking database tables...');
    
    // List all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('Available tables:');
    tablesResult.rows.forEach(row => {
      console.log('- ' + row.table_name);
    });
    
    if (tablesResult.rows.length === 0) {
      console.log('No tables found in the database!');
      return;
    }
    
    // Check if users table exists
    const usersTableExists = tablesResult.rows.some(row => row.table_name === 'users');
    
    if (usersTableExists) {
      console.log('\nUsers table structure:');
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);
      
      columnsResult.rows.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Count users
      const countResult = await pool.query('SELECT COUNT(*) FROM users');
      console.log(`\nTotal users: ${countResult.rows[0].count}`);
      
      // Show sample users
      const sampleResult = await pool.query('SELECT id, email, role, approval_status FROM users LIMIT 5');
      console.log('\nSample users:');
      sampleResult.rows.forEach(user => {
        console.log(`- ID: ${user.id}, Email: ${user.email}, Role: ${user.role}, Status: ${user.approval_status}`);
      });
    } else {
      console.log('\nUsers table does not exist!');
    }
    
    // Check sessions table
    const sessionsTableExists = tablesResult.rows.some(row => row.table_name === 'sessions');
    
    if (sessionsTableExists) {
      console.log('\nSessions table structure:');
      const sessionsColumnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'sessions'
        ORDER BY ordinal_position
      `);
      
      sessionsColumnsResult.rows.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Count sessions
      const sessionsCountResult = await pool.query('SELECT COUNT(*) FROM sessions');
      console.log(`\nTotal sessions: ${sessionsCountResult.rows[0].count}`);
    } else {
      console.log('\nSessions table does not exist!');
    }
    
  } catch (error) {
    console.error('Database check failed:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabase();