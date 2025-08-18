const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('🔍 Диагностика PostgreSQL базы данных и таблицы user_sessions...');

// Загружаем переменные окружения из .env файла
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim().replace(/["']/g, '');
      }
    });
    
    console.log('📄 Загружены переменные из .env:');
    console.log(`  - DB_HOST: ${envVars.DB_HOST}`);
    console.log(`  - DB_PORT: ${envVars.DB_PORT}`);
    console.log(`  - DB_NAME: ${envVars.DB_NAME}`);
    console.log(`  - DB_USER: ${envVars.DB_USER}`);
    console.log(`  - DB_PASSWORD: ${envVars.DB_PASSWORD ? '[СКРЫТ]' : 'НЕ УСТАНОВЛЕН'}`);
    
    return envVars;
  } else {
    console.log('❌ Файл .env не найден');
    return {};
  }
}

// Создаем подключение к PostgreSQL
function createPool(envVars) {
  const config = {
    host: envVars.DB_HOST || 'localhost',
    port: parseInt(envVars.DB_PORT || '5432'),
    database: envVars.DB_NAME || 'encore_tasks',
    user: envVars.DB_USER || 'postgres',
    password: envVars.DB_PASSWORD || 'password',
    // Дополнительные настройки для отладки
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    max: 1
  };
  
  console.log('\n🔗 Конфигурация подключения:');
  console.log(`  - Хост: ${config.host}:${config.port}`);
  console.log(`  - База данных: ${config.database}`);
  console.log(`  - Пользователь: ${config.user}`);
  
  return new Pool(config);
}

// Основная функция диагностики
async function diagnosePgSessions() {
  const envVars = loadEnvFile();
  const pool = createPool(envVars);
  
  try {
    console.log('\n1. 🔄 Тестирование подключения к PostgreSQL...');
    
    // Тестируем подключение
    const client = await pool.connect();
    console.log('✅ Подключение к PostgreSQL успешно!');
    
    // Получаем версию PostgreSQL
    const versionResult = await client.query('SELECT version()');
    console.log(`📊 Версия PostgreSQL: ${versionResult.rows[0].version}`);
    
    console.log('\n2. 🗃️ Проверка существования таблиц...');
    
    // Проверяем существование таблиц
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'user_sessions', 'sessions')
      ORDER BY table_name
    `;
    
    const tablesResult = await client.query(tablesQuery);
    const existingTables = tablesResult.rows.map(row => row.table_name);
    
    console.log('📋 Существующие таблицы:');
    ['users', 'user_sessions', 'sessions'].forEach(tableName => {
      const exists = existingTables.includes(tableName);
      console.log(`  - ${tableName}: ${exists ? '✅ существует' : '❌ не существует'}`);
    });
    
    console.log('\n3. 📊 Анализ структуры таблицы user_sessions...');
    
    if (existingTables.includes('user_sessions')) {
      // Получаем структуру таблицы user_sessions
      const structureQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_sessions'
        ORDER BY ordinal_position
      `;
      
      const structureResult = await client.query(structureQuery);
      
      console.log('🏗️ Структура таблицы user_sessions:');
      structureResult.rows.forEach(column => {
        console.log(`  - ${column.column_name}: ${column.data_type} ${column.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${column.column_default ? `DEFAULT ${column.column_default}` : ''}`);
      });
      
      // Проверяем наличие session_token
      const hasSessionToken = structureResult.rows.some(col => col.column_name === 'session_token');
      console.log(`\n🔑 Поле session_token: ${hasSessionToken ? '✅ присутствует' : '❌ отсутствует'}`);
      
      console.log('\n4. 📈 Анализ данных в таблице user_sessions...');
      
      // Получаем количество записей
      const countResult = await client.query('SELECT COUNT(*) as count FROM user_sessions');
      console.log(`📊 Количество записей в user_sessions: ${countResult.rows[0].count}`);
      
      // Показываем последние записи
      const dataQuery = `
        SELECT 
          id,
          user_id,
          session_token,
          expires_at,
          created_at
        FROM user_sessions 
        ORDER BY created_at DESC 
        LIMIT 5
      `;
      
      const dataResult = await client.query(dataQuery);
      
      if (dataResult.rows.length > 0) {
        console.log('\n📋 Последние записи в user_sessions:');
        dataResult.rows.forEach((session, index) => {
          console.log(`  ${index + 1}. ID: ${session.id}, User: ${session.user_id}, Token: ${session.session_token?.substring(0, 20)}..., Expires: ${session.expires_at}`);
        });
      } else {
        console.log('\n📋 Таблица user_sessions пуста');
      }
      
      console.log('\n5. 🧪 Тестирование создания и поиска сессий...');
      
      // Проверяем пользователей
      const usersResult = await client.query('SELECT id, email FROM users LIMIT 1');
      
      if (usersResult.rows.length > 0) {
        const testUser = usersResult.rows[0];
        console.log(`👤 Тестовый пользователь: ${testUser.email} (ID: ${testUser.id})`);
        
        // Создаем тестовую сессию
        const testToken = 'test_session_' + Date.now();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа
        
        const insertSessionQuery = `
          INSERT INTO user_sessions (user_id, session_token, expires_at, created_at)
          VALUES ($1, $2, $3, NOW())
          RETURNING id, session_token
        `;
        
        const insertResult = await client.query(insertSessionQuery, [testUser.id, testToken, expiresAt]);
        console.log(`✅ Создана тестовая сессия: ID ${insertResult.rows[0].id}`);
        
        // Ищем созданную сессию
        const findSessionQuery = `
          SELECT 
            us.id,
            us.user_id,
            us.session_token,
            us.expires_at,
            u.email
          FROM user_sessions us
          JOIN users u ON us.user_id = u.id
          WHERE us.session_token = $1
          AND us.expires_at > NOW()
        `;
        
        const findResult = await client.query(findSessionQuery, [testToken]);
        
        if (findResult.rows.length > 0) {
          const foundSession = findResult.rows[0];
          console.log(`✅ Сессия найдена: User ${foundSession.email}, Expires: ${foundSession.expires_at}`);
        } else {
          console.log('❌ Сессия не найдена или истекла');
        }
        
        // Удаляем тестовую сессию
        await client.query('DELETE FROM user_sessions WHERE session_token = $1', [testToken]);
        console.log('🗑️ Тестовая сессия удалена');
        
      } else {
        console.log('❌ Пользователи не найдены для тестирования');
      }
      
    } else {
      console.log('❌ Таблица user_sessions не существует!');
      
      console.log('\n💡 Рекомендации:');
      console.log('1. Создайте таблицу user_sessions с помощью миграции');
      console.log('2. Убедитесь, что таблица содержит поля: id, user_id, session_token, expires_at, created_at');
    }
    
    console.log('\n6. 🔍 Проверка таблицы sessions (если существует)...');
    
    if (existingTables.includes('sessions')) {
      const sessionsStructureQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sessions'
        ORDER BY ordinal_position
      `;
      
      const sessionsStructureResult = await client.query(sessionsStructureQuery);
      
      console.log('🏗️ Структура таблицы sessions:');
      sessionsStructureResult.rows.forEach(column => {
        console.log(`  - ${column.column_name}: ${column.data_type} ${column.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
      
      const sessionsCountResult = await client.query('SELECT COUNT(*) as count FROM sessions');
      console.log(`📊 Количество записей в sessions: ${sessionsCountResult.rows[0].count}`);
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Ошибка при диагностике PostgreSQL:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Возможные причины:');
      console.log('1. PostgreSQL сервер не запущен');
      console.log('2. Неверные настройки подключения в .env');
      console.log('3. Проблемы с сетевым доступом');
    } else if (error.code === '28P01') {
      console.log('\n💡 Ошибка аутентификации:');
      console.log('1. Проверьте правильность пароля в .env');
      console.log('2. Убедитесь, что пользователь существует в PostgreSQL');
    } else if (error.code === '3D000') {
      console.log('\n💡 База данных не существует:');
      console.log('1. Создайте базу данных с именем из .env');
      console.log('2. Проверьте правильность имени базы данных');
    }
    
  } finally {
    await pool.end();
  }
}

// Запуск диагностики
diagnosePgSessions().catch(error => {
  console.error('❌ Критическая ошибка:', error);
});