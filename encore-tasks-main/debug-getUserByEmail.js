require('dotenv').config();
const { Pool } = require('pg');

async function debugGetUserByEmail() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'encore_tasks',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  });

  try {
    console.log('🔍 Testing getUserByEmail method simulation...');
    
    // Симулируем точно тот же запрос, что делает getUserByEmail
    const email = 'axelencore@mail.ru';
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    console.log('📊 Raw query result:');
    console.log('- rowCount:', result.rowCount);
    console.log('- rows length:', result.rows.length);
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      console.log('\n📋 Raw row data:');
      console.log(JSON.stringify(row, null, 2));
      
      console.log('\n🔍 Field analysis:');
      console.log('- row.id:', row.id, 'type:', typeof row.id);
      console.log('- row.name:', row.name, 'type:', typeof row.name);
      console.log('- row.email:', row.email, 'type:', typeof row.email);
      
      // Симулируем маппинг как в getUserByEmail
      const mappedUser = {
        id: row.id,
        userId: row.id, // Добавляем userId для совместимости
        name: row.name,
        email: row.email,
        role: row.role,
        status: row.is_active ? 'active' : 'inactive',
        approval_status: row.approval_status,
        avatar: row.avatar,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastLoginAt: row.last_login_at,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
        last_login_at: row.last_login_at,
        password_hash: row.password_hash
      };
      
      console.log('\n🎯 Mapped user object:');
      console.log(JSON.stringify(mappedUser, null, 2));
      
      console.log('\n✅ Final checks:');
      console.log('- mappedUser.id:', mappedUser.id, 'type:', typeof mappedUser.id);
      console.log('- mappedUser.id.toString():', mappedUser.id ? mappedUser.id.toString() : 'UNDEFINED');
      console.log('- parseInt(mappedUser.id.toString()):', mappedUser.id ? parseInt(mappedUser.id.toString()) : 'UNDEFINED');
    } else {
      console.log('❌ No user found with email:', email);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugGetUserByEmail();