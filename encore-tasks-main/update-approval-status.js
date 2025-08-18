
const { Pool } = require('pg');

// Конфигурация PostgreSQL из .env
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'encore_tasks',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
});

async function updateUserApprovalStatus() {
  try {
    console.log('🔄 Подключение к PostgreSQL...');
    
    // Обновляем всех пользователей со статусом 'pending' на 'approved'
    const updateQuery = `
      UPDATE users 
      SET approval_status = 'approved', updated_at = NOW()
      WHERE approval_status = 'pending'
      RETURNING id, email, approval_status
    `;
    
    const result = await pool.query(updateQuery);
    
    console.log(`✅ Обновлено пользователей: ${result.rowCount}`);
    
    if (result.rows.length > 0) {
      console.log('📋 Обновленные пользователи:');
      result.rows.forEach(user => {
        console.log(`  - ${user.email} (${user.id}) -> ${user.approval_status}`);
      });
    }
    
    // Проверяем текущее состояние
    const checkQuery = 'SELECT id, email, approval_status FROM users ORDER BY created_at DESC LIMIT 10';
    const checkResult = await pool.query(checkQuery);
    
    console.log('\n📊 Текущие пользователи в базе данных:');
    checkResult.rows.forEach(user => {
      console.log(`  - ${user.email}: ${user.approval_status}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка при обновлении базы данных:', error.message);
  } finally {
    await pool.end();
  }
}

updateUserApprovalStatus();
