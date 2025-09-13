require('dotenv').config();

async function createUsersTable() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Отсутствуют переменные окружения');
    return;
  }
  
  console.log('Создание таблицы users через Supabase REST API...');
  
  try {
    // Создаем таблицу users через SQL запрос
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
      
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status);
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
    `;
    
    // Выполняем SQL через REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({
        sql: createTableSQL
      })
    });
    
    if (!response.ok) {
      console.error('❌ Ошибка при создании таблицы:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Детали ошибки:', errorText);
      return;
    }
    
    console.log('✅ Таблица users создана успешно!');
    
    // Проверяем, существует ли пользователь
    const checkResponse = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.axelencore@mail.ru`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      }
    });
    
    if (checkResponse.ok) {
      const users = await checkResponse.json();
      
      if (users.length === 0) {
        console.log('Создание административного пользователя...');
        
        // Создаем пользователя
        const createUserResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            name: 'Administrator',
            email: 'axelencore@mail.ru',
            password_hash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
            role: 'admin',
            approval_status: 'approved'
          })
        });
        
        if (createUserResponse.ok) {
          const newUser = await createUserResponse.json();
          console.log('✅ Административный пользователь создан:', newUser);
        } else {
          console.error('❌ Ошибка при создании пользователя:', createUserResponse.status);
          const errorText = await createUserResponse.text();
          console.error('Детали ошибки:', errorText);
        }
      } else {
        console.log('✅ Административный пользователь уже существует:', users[0]);
      }
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

createUsersTable();