const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

// Конфигурация базы данных
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'encore_tasks',
  user: 'postgres',
  password: 'postgres',
  ssl: false
});

// Тестовые данные
const testUser = {
  email: 'axelencore@mail.ru',
  password: 'admin123',
  name: 'Admin User'
};

const JWT_SECRET = 'your-secret-key-here';
const SESSION_SECRET = 'your-session-secret-here';
const API_BASE_URL = 'http://localhost:3000';

async function testDatabaseConnection() {
  console.log('\n🔍 1. Тестирование подключения к базе данных...');
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Подключение к базе данных успешно:', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Ошибка подключения к базе данных:', error.message);
    return false;
  }
}

async function testUserInDatabase() {
  console.log('\n🔍 2. Проверка пользователя в базе данных...');
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM users WHERE email = $1', [testUser.email]);
    
    if (result.rows.length === 0) {
      console.log('❌ Пользователь не найден в базе данных');
      client.release();
      return false;
    }
    
    const user = result.rows[0];
    console.log('✅ Пользователь найден:', {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at
    });
    
    // Проверяем пароль
    const passwordMatch = await bcrypt.compare(testUser.password, user.password_hash);
    if (passwordMatch) {
      console.log('✅ Пароль корректный');
    } else {
      console.log('❌ Пароль некорректный');
    }
    
    client.release();
    return passwordMatch;
  } catch (error) {
    console.error('❌ Ошибка при проверке пользователя:', error.message);
    return false;
  }
}

async function testSessionTable() {
  console.log('\n🔍 3. Проверка таблицы сессий...');
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_sessions' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Таблица user_sessions не найдена');
      client.release();
      return false;
    }
    
    console.log('✅ Таблица user_sessions найдена со столбцами:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Ошибка при проверке таблицы сессий:', error.message);
    return false;
  }
}

async function testJWTGeneration() {
  console.log('\n🔍 4. Тестирование генерации JWT токена...');
  try {
    const payload = {
      userId: '1',
      email: testUser.email,
      role: 'admin',
      name: testUser.name
    };
    
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
    console.log('✅ JWT токен сгенерирован:', token.substring(0, 50) + '...');
    
    // Проверяем токен
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ JWT токен валиден:', {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    });
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка при работе с JWT:', error.message);
    return false;
  }
}

async function testLoginAPI() {
  console.log('\n🔍 5. Тестирование API входа...');
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.message === 'Успешная авторизация') {
      console.log('✅ API входа работает корректно');
      console.log('✅ Получен ответ:', {
        message: data.message,
        user: data.user ? {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name
        } : null,
        token: data.token ? 'получен' : 'отсутствует'
      });
      return true;
    } else {
      console.log('❌ API входа вернул ошибку:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка при тестировании API входа:', error.message);
    return false;
  }
}

async function testCurrentUserAPI() {
  console.log('\n🔍 6. Тестирование API текущего пользователя...');
  try {
    // Сначала логинимся
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    
    const loginData = await loginResponse.json();
    if (!loginResponse.ok || loginData.message !== 'Успешная авторизация') {
      console.log('❌ Не удалось войти для тестирования текущего пользователя');
      console.log('❌ Ответ входа:', loginData);
      return false;
    }
    
    // Извлекаем cookies
    const cookies = loginResponse.headers.get('set-cookie');
    
    // Проверяем текущего пользователя
    const currentUserResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Cookie': cookies || ''
      }
    });
    
    const userData = await currentUserResponse.json();
    
    if (currentUserResponse.ok && userData.user) {
      console.log('✅ API текущего пользователя работает корректно');
      console.log('✅ Данные пользователя:', {
        id: userData.user.id,
        email: userData.user.email,
        name: userData.user.name
      });
      return true;
    } else {
      console.log('❌ API текущего пользователя вернул ошибку:', userData);
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка при тестировании API текущего пользователя:', error.message);
    return false;
  }
}

async function runFullAuthTest() {
  console.log('🚀 Запуск полного тестирования процесса авторизации\n');
  
  const tests = [
    { name: 'Подключение к БД', test: testDatabaseConnection },
    { name: 'Пользователь в БД', test: testUserInDatabase },
    { name: 'Таблица сессий', test: testSessionTable },
    { name: 'JWT токены', test: testJWTGeneration },
    { name: 'API входа', test: testLoginAPI },
    { name: 'API текущего пользователя', test: testCurrentUserAPI }
  ];
  
  let passedTests = 0;
  
  for (const { name, test } of tests) {
    try {
      const result = await test();
      if (result) {
        passedTests++;
      }
    } catch (error) {
      console.error(`❌ Тест "${name}" завершился с ошибкой:`, error.message);
    }
  }
  
  console.log(`\n📊 Результаты тестирования: ${passedTests}/${tests.length} тестов пройдено`);
  
  if (passedTests === tests.length) {
    console.log('🎉 Все тесты пройдены! Авторизация работает корректно.');
  } else {
    console.log('⚠️ Обнаружены проблемы с авторизацией. Требуется исправление.');
  }
  
  await pool.end();
}

runFullAuthTest().catch(console.error);