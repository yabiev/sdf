const { createClient } = require('@supabase/supabase-js');

// Загружаем переменные окружения
require('dotenv').config();

// Используем Supabase клиент с service role ключом
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Service Role Key:', serviceRoleKey ? 'Установлен' : 'Отсутствует');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Отсутствуют переменные окружения NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createUserTable() {
  try {
    console.log('Создание таблицы users...');
    
    // Создаем таблицу users
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
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
        
        -- Создаем индексы
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status);
        CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
      `
    });
    
    if (error) {
      console.error('❌ Ошибка при создании таблицы:', error);
      return;
    }
    
    console.log('✅ Таблица users создана успешно!');
    
    // Проверяем, существует ли пользователь axelencore@mail.ru
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'axelencore@mail.ru')
      .single();
    
    if (userError && userError.code !== 'PGRST116') {
      console.error('❌ Ошибка при проверке пользователя:', userError);
      return;
    }
    
    if (!existingUser) {
      console.log('Создание административного пользователя...');
      
      // Создаем административного пользователя
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          name: 'Administrator',
          email: 'axelencore@mail.ru',
          password_hash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // хеш для Ad580dc6axelencore
          role: 'admin',
          approval_status: 'approved'
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Ошибка при создании пользователя:', createError);
        return;
      }
      
      console.log('✅ Административный пользователь создан:', newUser);
    } else {
      console.log('✅ Административный пользователь уже существует:', existingUser);
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

createUserTable();