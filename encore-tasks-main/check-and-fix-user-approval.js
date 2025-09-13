const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

// Конфигурация подключения к PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'encore_tasks',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function checkAndFixUserApproval() {
  console.log('🔍 Проверка структуры таблицы users...');
  
  try {
    // Проверяем структуру таблицы users
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Текущие колонки в таблице users:');
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
    });
    
    // Проверяем наличие поля approval_status или is_approved
    const hasApprovalStatus = columnsResult.rows.some(col => col.column_name === 'approval_status');
    const hasIsApproved = columnsResult.rows.some(col => col.column_name === 'is_approved');
    
    console.log(`\n🔍 Поле approval_status: ${hasApprovalStatus ? '✅ найдено' : '❌ отсутствует'}`);
    console.log(`🔍 Поле is_approved: ${hasIsApproved ? '✅ найдено' : '❌ отсутствует'}`);
    
    // Если нет ни одного поля, добавляем approval_status
    if (!hasApprovalStatus && !hasIsApproved) {
      console.log('\n🔧 Добавляем поле approval_status...');
      
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN approval_status VARCHAR(20) NOT NULL DEFAULT 'approved' 
        CHECK (approval_status IN ('pending', 'approved', 'rejected'));
      `);
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status);
      `);
      
      console.log('✅ Поле approval_status добавлено успешно!');
    }
    
    // Проверяем текущих пользователей
    console.log('\n👥 Проверка пользователей...');
    let usersQuery;
    if (hasApprovalStatus) {
      usersQuery = 'SELECT id, name, email, role, approval_status FROM users ORDER BY created_at DESC';
    } else if (hasIsApproved) {
      usersQuery = 'SELECT id, name, email, role, is_approved as approval_status FROM users ORDER BY created_at DESC';
    } else {
      usersQuery = "SELECT id, name, email, role, 'approved' as approval_status FROM users ORDER BY created_at DESC";
    }
    const usersResult = await pool.query(usersQuery);
    
    console.log(`\n📊 Найдено пользователей: ${usersResult.rows.length}`);
    usersResult.rows.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - роль: ${user.role}, статус: ${user.approval_status}`);
    });
    
    // Ищем администраторов с неодобренным статусом
    const unapprovedAdmins = usersResult.rows.filter(user => 
      user.role === 'admin' && 
      (user.approval_status === 'pending' || user.approval_status === false)
    );
    
    if (unapprovedAdmins.length > 0) {
      console.log('\n⚠️ Найдены администраторы с неодобренным статусом:');
      unapprovedAdmins.forEach(admin => {
        console.log(`  - ${admin.name} (${admin.email}) - статус: ${admin.approval_status}`);
      });
      
      console.log('\n🔧 Одобряем всех администраторов...');
      
      const approvalField = hasApprovalStatus ? 'approval_status' : 'is_approved';
      const approvalValue = hasApprovalStatus ? 'approved' : true;
      
      const updateResult = await pool.query(`
        UPDATE users 
        SET ${approvalField} = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE role = 'admin' 
        RETURNING id, name, email, ${approvalField};
      `, [approvalValue]);
      
      console.log('✅ Администраторы одобрены:');
      updateResult.rows.forEach(admin => {
        console.log(`  - ${admin.name} (${admin.email}) - новый статус: ${admin[approvalField]}`);
      });
    } else {
      console.log('\n✅ Все администраторы уже одобрены!');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Запуск скрипта
checkAndFixUserApproval().catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});