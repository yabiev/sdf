require('dotenv').config();
const { Pool } = require('pg');

// Конфигурация базы данных
const config = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_HOST && process.env.DB_HOST.includes('supabase.co') ? {
    rejectUnauthorized: false
  } : false
};

console.log('Подключение к базе данных:', {
  host: config.host,
  port: config.port,
  database: config.database,
  user: config.user,
  ssl: config.ssl
});

async function createUsersTable() {
  const pool = new Pool(config);
  
  try {
    // Проверяем подключение
    const client = await pool.connect();
    console.log('✅ Подключение к базе данных установлено');
    
    // Создаем таблицу users
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
        approval_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
        avatar TEXT,
        telegram_chat_id BIGINT,
        telegram_username VARCHAR(255),
        notification_settings JSONB DEFAULT '{
          "email": true,
          "telegram": false,
          "browser": true,
          "taskAssigned": true,
          "taskCompleted": true,
          "projectUpdates": true
        }',
        last_login_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE
      );
    `;
    
    await client.query(createTableSQL);
    console.log('✅ Таблица users создана успешно!');
    
    // Создаем индексы
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);',
      'CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status);',
      'CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);'
    ];
    
    for (const indexSQL of indexes) {
      await client.query(indexSQL);
    }
    console.log('✅ Индексы созданы успешно!');
    
    // Проверяем, существует ли пользователь axelencore@mail.ru
    const checkUserSQL = 'SELECT * FROM users WHERE email = $1';
    const userResult = await client.query(checkUserSQL, ['axelencore@mail.ru']);
    
    if (userResult.rows.length === 0) {
      console.log('Создание административного пользователя...');
      
      // Создаем хеш пароля (простой для демонстрации)
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash('Ad580dc6axelencore', 10);
      
      const insertUserSQL = `
        INSERT INTO users (name, email, password_hash, role, approval_status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
      
      const newUserResult = await client.query(insertUserSQL, [
        'Administrator',
        'axelencore@mail.ru',
        passwordHash,
        'admin',
        'approved'
      ]);
      
      console.log('✅ Административный пользователь создан:', newUserResult.rows[0]);
    } else {
      console.log('✅ Административный пользователь уже существует:', userResult.rows[0]);
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await pool.end();
  }
}

createUsersTable();