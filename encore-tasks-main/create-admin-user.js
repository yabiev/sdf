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

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    const passwordHash = await bcrypt.hash('Ad580dc6axelencore', 12);
    
    // Check if admin user already exists
    const existingUser = await pool.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      ['axelencore@mail.ru']
    );
    
    if (existingUser.rows.length > 0) {
      console.log('Admin user already exists:', existingUser.rows[0]);
      
      // Update existing user
      await pool.query(`
        UPDATE users SET
          password_hash = $1,
          role = $2,
          name = $3
        WHERE email = $4
      `, [passwordHash, 'admin', 'Admin User', 'axelencore@mail.ru']);
      
      console.log('✓ Admin user updated successfully');
    } else {
      // Create new user
      await pool.query(`
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
      `, ['Admin User', 'axelencore@mail.ru', passwordHash, 'admin']);
      
      console.log('✓ Admin user created successfully');
    }
    
    // Show admin user info
    const adminUser = await pool.query(
      'SELECT id, email, name, role FROM users WHERE email = $1',
      ['axelencore@mail.ru']
    );
    
    console.log('\nAdmin user info:', adminUser.rows[0]);
    
    // Test login credentials
    const user = adminUser.rows[0];
    const isPasswordValid = await bcrypt.compare('Ad580dc6axelencore', passwordHash);
    console.log('Password validation test:', isPasswordValid ? '✓ PASS' : '✗ FAIL');
    
  } catch (error) {
    console.error('✗ Error creating admin user:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

createAdminUser();