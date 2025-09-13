require('dotenv').config();
const { Pool } = require('pg');

async function debugUserLookup() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'encore_tasks',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true'
  });

  try {
    console.log('🔍 Debugging user lookup...');
    
    const email = 'axelencore@mail.ru';
    
    console.log('📧 Looking up user with email:', email);
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    console.log('👤 User lookup result:');
    console.log('- Rows found:', result.rows.length);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('- User object keys:', Object.keys(user));
      console.log('- User object:', JSON.stringify(user, null, 2));
      console.log('- user.id:', user.id, 'type:', typeof user.id);
      console.log('- user.email:', user.email);
      console.log('- user.name:', user.name);
    } else {
      console.log('❌ No user found');
    }
    
  } catch (error) {
    console.error('❌ Error during user lookup:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

debugUserLookup();