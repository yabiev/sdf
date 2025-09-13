// Тестовый скрипт для проверки полного workflow с SQLite
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: `sqlite-test-${Date.now()}@example.com`,
  name: 'SQLite Test User',
  password: 'testpassword123'
};

let authToken = '';
let userId = '';
let projectId = '';
let boardId = '';
let columnId = '';
let taskId = '';

// Функция для выполнения HTTP запросов
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
        ...options.headers
      },
      ...options
    });
    
    const data = await response.text();
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch {
      jsonData = { text: data };
    }
    
    return {
      status: response.status,
      data: jsonData,
      ok: response.ok
    };
  } catch (error) {
    console.error(`❌ Ошибка запроса к ${url}:`, error.message);
    return {
      status: 0,
      data: { error: error.message },
      ok: false
    };
  }
}

// Функция для логирования результатов
function logResult(step, result) {
  const status = result.ok ? '✅' : '❌';
  console.log(`${status} ${step}: ${result.status}`);
  if (!result.ok) {
    console.log('   Ошибка:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('   Успех:', JSON.stringify(result.data, null, 2));
  }
  console.log('');
}

async function testWorkflow() {
  console.log('🚀 Начинаем тестирование полного workflow с SQLite\n');
  
  // 1. Регистрация пользователя
  console.log('1️⃣ Тестируем регистрацию пользователя...');
  const registerResult = await makeRequest(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    body: JSON.stringify(TEST_USER)
  });
  logResult('Регистрация', registerResult);
  
  if (!registerResult.ok) {
    console.log('❌ Регистрация не удалась. Останавливаем тест.');
    return;
  }
  
  // 2. Логин пользователя
  console.log('2️⃣ Тестируем логин пользователя...');
  const loginResult = await makeRequest(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password
    })
  });
  logResult('Логин', loginResult);
  
  if (!loginResult.ok) {
    console.log('❌ Логин не удался. Останавливаем тест.');
    return;
  }
  
  authToken = loginResult.data.token;
  userId = loginResult.data.user.id;
  console.log(`🔑 Получен токен авторизации: ${authToken.substring(0, 20)}...`);
  console.log(`👤 ID пользователя: ${userId}\n`);
  
  // 3. Создание проекта
  console.log('3️⃣ Тестируем создание проекта...');
  const projectResult = await makeRequest(`${BASE_URL}/api/projects`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'SQLite Test Project',
      description: 'Тестовый проект для SQLite',
      member_ids: []
    })
  });
  logResult('Создание проекта', projectResult);
  
  if (!projectResult.ok) {
    console.log('❌ Создание проекта не удалось. Останавливаем тест.');
    return;
  }
  
  projectId = projectResult.data.data.id;
  console.log(`📁 ID проекта: ${projectId}\n`);
  
  // 4. Создание доски
  console.log('4️⃣ Тестируем создание доски...');
  const boardResult = await makeRequest(`${BASE_URL}/api/boards`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'SQLite Test Board',
      description: 'Тестовая доска для SQLite',
      project_id: projectId
    })
  });
  logResult('Создание доски', boardResult);
  
  if (!boardResult.ok) {
    console.log('❌ Создание доски не удалось. Останавливаем тест.');
    return;
  }
  
  boardId = boardResult.data.data.id;
  console.log(`📋 ID доски: ${boardId}\n`);
  
  // 5. Создание колонки
  console.log('5️⃣ Тестируем создание колонки...');
  const columnResult = await makeRequest(`${BASE_URL}/api/columns`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'SQLite Test Column',
      board_id: boardId,
      position: 0
    })
  });
  logResult('Создание колонки', columnResult);
  
  if (!columnResult.ok) {
    console.log('❌ Создание колонки не удалось. Останавливаем тест.');
    return;
  }
  
  columnId = columnResult.data.id;
  console.log(`📝 ID колонки: ${columnId}\n`);
  
  // 6. Создание задачи
  console.log('6️⃣ Тестируем создание задачи...');
  const taskResult = await makeRequest(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'SQLite Test Task',
      description: 'Тестовая задача для SQLite',
      column_id: columnId,
      priority: 'medium',
      assignee_ids: [userId]
    })
  });
  logResult('Создание задачи', taskResult);
  
  if (!taskResult.ok) {
    console.log('❌ Создание задачи не удалось.');
    return;
  }
  
  taskId = taskResult.data.id;
  console.log(`✅ ID задачи: ${taskId}\n`);
  
  // 7. Итоговый отчет
  console.log('🎉 ТЕСТ ЗАВЕРШЕН УСПЕШНО!');
  console.log('📊 Созданные объекты:');
  console.log(`   👤 Пользователь: ${userId}`);
  console.log(`   📁 Проект: ${projectId}`);
  console.log(`   📋 Доска: ${boardId}`);
  console.log(`   📝 Колонка: ${columnId}`);
  console.log(`   ✅ Задача: ${taskId}`);
  console.log('');
  console.log('✅ Все API endpoints работают корректно с SQLite!');
}

// Запускаем тест
testWorkflow().catch(error => {
  console.error('❌ Критическая ошибка теста:', error);
  process.exit(1);
});