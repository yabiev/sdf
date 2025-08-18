const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'encore_tasks',
  password: 'postgres',
  port: 5432,
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function testLogin() {
  try {
    console.log('Testing admin login...');
    
    // Find admin user
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      ['axelencore@mail.ru']
    );
    
    if (userResult.rows.length === 0) {
      console.log('Admin user not found');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('Found user:', {
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.is_active
    });
    
    // Check password
    const password = 'Ad580dc6axelencore';
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('Password valid:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('Invalid password');
      return;
    }
    
    if (!user.is_active) {
      console.log('User not active:', user.is_active);
      return;
    }
    
    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('Generated JWT token:', token.substring(0, 50) + '...');
    
    // Create session in database
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await pool.query(
      'INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)',
      [sessionToken, user.id, expiresAt]
    );
    
    console.log('Created session:', {
      token: sessionToken.substring(0, 20) + '...',
      user_id: user.id,
      expires_at: expiresAt
    });
    
    // Test session retrieval
    const sessionResult = await pool.query(
      'SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()',
      [sessionToken]
    );
    
    if (sessionResult.rows.length > 0) {
      console.log('Session found and valid');
    } else {
      console.log('Session not found or expired');
    }
    
    // Clean up old sessions
    const cleanupResult = await pool.query(
      'DELETE FROM sessions WHERE expires_at <= NOW()'
    );
    console.log('Cleaned up expired sessions:', cleanupResult.rowCount);
    
    console.log('\nLogin test completed successfully!');
    console.log('Use these credentials in the browser:');
    console.log('Email: axelencore@mail.ru');
    console.log('Password: Ad580dc6axelencore');
    
  } catch (error) {
    console.error('Login test failed:', error);
  } finally {
    await pool.end();
  }
}

testLogin();