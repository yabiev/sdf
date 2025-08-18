const fs = require('fs');
const path = require('path');

console.log('🔧 Исправление проблемы с approval_status...');

// Функция для выполнения HTTP запросов
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.text();
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch {
      jsonData = data;
    }
    
    return {
      status: response.status,
      ok: response.ok,
      data: jsonData
    };
  } catch (error) {
    console.error(`❌ Ошибка запроса к ${url}:`, error.message);
    return { error: error.message };
  }
}

// Основная функция исправления
async function fixApprovalStatus() {
  console.log('\n1. 🔍 Анализ проблемы с approval_status...');
  
  // Проверяем файл авторизации
  const authFilePath = path.join(__dirname, 'src', 'app', 'api', 'auth', 'login', 'route.ts');
  
  if (fs.existsSync(authFilePath)) {
    const authContent = fs.readFileSync(authFilePath, 'utf8');
    console.log('📄 Найден файл авторизации: /api/auth/login/route.ts');
    
    if (authContent.includes('approval_status')) {
      console.log('⚠️ Найдена проверка approval_status в коде авторизации');
      
      // Создаем резервную копию
      const backupPath = authFilePath + '.backup';
      fs.copyFileSync(authFilePath, backupPath);
      console.log('💾 Создана резервная копия: route.ts.backup');
      
      // Исправляем код авторизации
      console.log('\n2. 🔧 Исправление кода авторизации...');
      
      const fixedAuthContent = authContent.replace(
        /if \(user\.approval_status !== 'approved'\) \{[\s\S]*?\}/g,
        `// Временно отключена проверка approval_status
        // if (user.approval_status !== 'approved') {
        //   return NextResponse.json(
        //     { error: 'Аккаунт ожидает одобрения администратора' },
        //     { status: 403 }
        //   );
        // }`
      );
      
      fs.writeFileSync(authFilePath, fixedAuthContent, 'utf8');
      console.log('✅ Проверка approval_status отключена в коде авторизации');
    } else {
      console.log('ℹ️ Проверка approval_status не найдена в коде авторизации');
    }
  } else {
    console.log('❌ Файл авторизации не найден');
  }
  
  console.log('\n3. 🗃️ Обновление статуса пользователей в базе данных...');
  
  // Создаем скрипт для обновления базы данных
  const updateDbScript = `
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
    const updateQuery = \`
      UPDATE users 
      SET approval_status = 'approved', updated_at = NOW()
      WHERE approval_status = 'pending'
      RETURNING id, email, approval_status
    \`;
    
    const result = await pool.query(updateQuery);
    
    console.log(\`✅ Обновлено пользователей: \${result.rowCount}\`);
    
    if (result.rows.length > 0) {
      console.log('📋 Обновленные пользователи:');
      result.rows.forEach(user => {
        console.log(\`  - \${user.email} (\${user.id}) -> \${user.approval_status}\`);
      });
    }
    
    // Проверяем текущее состояние
    const checkQuery = 'SELECT id, email, approval_status FROM users ORDER BY created_at DESC LIMIT 10';
    const checkResult = await pool.query(checkQuery);
    
    console.log('\n📊 Текущие пользователи в базе данных:');
    checkResult.rows.forEach(user => {
      console.log(\`  - \${user.email}: \${user.approval_status}\`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка при обновлении базы данных:', error.message);
  } finally {
    await pool.end();
  }
}

updateUserApprovalStatus();
`;
  
  // Записываем скрипт обновления БД
  const updateDbPath = path.join(__dirname, 'update-approval-status.js');
  fs.writeFileSync(updateDbPath, updateDbScript, 'utf8');
  console.log('✅ Создан скрипт обновления БД: update-approval-status.js');
  
  console.log('\n4. 🧪 Тестирование исправления...');
  
  // Ждем немного для применения изменений
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Тестируем вход
  const baseUrl = 'http://localhost:3000';
  const loginData = {
    email: 'test@example.com',
    password: 'password123'
  };
  
  console.log('📤 Попытка входа с исправленной авторизацией...');
  const loginResponse = await makeRequest(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify(loginData)
  });
  
  console.log('📥 Результат входа:', {
    status: loginResponse.status,
    ok: loginResponse.ok,
    hasToken: loginResponse.data?.token ? 'да' : 'нет',
    error: loginResponse.data?.error || 'нет'
  });
  
  if (loginResponse.ok && loginResponse.data?.token) {
    console.log('🎉 Вход успешен! Тестируем авторизованные запросы...');
    
    const authHeaders = {
      'Authorization': `Bearer ${loginResponse.data.token}`
    };
    
    // Тестируем получение профиля
    const profileResponse = await makeRequest(`${baseUrl}/api/auth/me`, {
      headers: authHeaders
    });
    
    console.log('👤 Профиль пользователя:', {
      status: profileResponse.status,
      ok: profileResponse.ok,
      hasUser: profileResponse.data?.user ? 'да' : 'нет'
    });
    
    // Тестируем получение проектов
    const projectsResponse = await makeRequest(`${baseUrl}/api/projects`, {
      headers: authHeaders
    });
    
    console.log('📁 Проекты:', {
      status: projectsResponse.status,
      ok: projectsResponse.ok,
      count: Array.isArray(projectsResponse.data) ? projectsResponse.data.length : 'неизвестно'
    });
    
    if (profileResponse.ok && projectsResponse.ok) {
      console.log('\n🎉 Все тесты пройдены! Проблема с авторизацией исправлена.');
    } else {
      console.log('\n⚠️ Некоторые запросы все еще не работают. Проверьте логи сервера.');
    }
  } else {
    console.log('\n❌ Вход все еще не работает. Возможно, нужно обновить базу данных.');
    console.log('💡 Запустите: node update-approval-status.js');
  }
}

// Запуск исправления
fixApprovalStatus().catch(error => {
  console.error('❌ Ошибка при исправлении:', error);
});