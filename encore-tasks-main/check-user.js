const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Загружаем переменные окружения
require('dotenv').config();

// Конфигурация базы данных из переменных окружения (Supabase)
const config = {
  host: process.env.DB_HOST || 'db.euxwfktskphfspcaqhfz.supabase.co',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Trae2024!',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

console.log('Database config:', config);

const pool = new Pool(config);

async function checkUser() {
  try {
    // Проверяем подключение
    const client = await pool.connect();
    console.log('✅ Connected to database');
    
    // Ищем пользователя
    const result = await client.query('SELECT * FROM users WHERE email = $1', ['axelencore@mail.ru']);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('✅ User found:', {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        approval_status: user.approval_status,
        created_at: user.created_at
      });
      
      // Проверяем пароль
      const isPasswordValid = await bcrypt.compare('Ad580dc6axelencore', user.password_hash);
      console.log('Password valid:', isPasswordValid);
    } else {
      console.log('❌ User not found');
      
      // Показываем всех пользователей
      const allUsers = await client.query('SELECT email, name, role, approval_status FROM users LIMIT 10');
      console.log('All users in database:', allUsers.rows);
    }
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Database error:', error);
  }
}

checkUser();