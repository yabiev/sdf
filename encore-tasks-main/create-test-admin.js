const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'encore_tasks',
  password: 'postgres',
  port: 5432,
});

async function createTestAdmin() {
  try {
    console.log('Creating test admin user...');
    
    const passwordHash = await bcrypt.hash('admin123', 12);
    
    // Check if test admin user already exists
    const existingUser = await pool.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      ['admin@example.com']
    );
    
    if (existingUser.rows.length > 0) {
      console.log('Test admin user already exists:', existingUser.rows[0]);
      
      // Update existing user
      await pool.query(`
        UPDATE users SET
          password_hash = $1,
          role = $2,
          name = $3
        WHERE email = $4
      `, [passwordHash, 'admin', 'Test Admin', 'admin@example.com']);
      
      console.log('✓ Test admin user updated successfully');
    } else {
      // Create new user
      await pool.query(`
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
      `, ['Test Admin', 'admin@example.com', passwordHash, 'admin']);
      
      console.log('✓ Test admin user created successfully');
    }
    
    // Show test admin user info
    const testAdmin = await pool.query(
      'SELECT id, email, name, role FROM users WHERE email = $1',
      ['admin@example.com']
    );
    
    console.log('\nTest admin user info:', testAdmin.rows[0]);
    
    // Test login credentials
    const user = testAdmin.rows[0];
    const isPasswordValid = await bcrypt.compare('admin123', passwordHash);
    console.log('Password validation test:', isPasswordValid ? '✓ PASS' : '✗ FAIL');
    
  } catch (error) {
    console.error('✗ Error creating test admin user:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

createTestAdmin();