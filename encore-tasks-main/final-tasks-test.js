const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

// Тестовые данные
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User'
};

let authToken = '';
let projectId = '';
let boardId = '';
let columnId = '';
let taskId = '';

// Функция для HTTP запросов
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
    
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    console.error('Request error:', error.message);
    return { status: 500, data: { error: error.message } };
  }
}

// Регистрация пользователя
async function registerUser() {
  console.log('\n🔐 Регистрация пользователя...');
  const result = await makeRequest(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    body: JSON.stringify(testUser)
  });
  
  if (result.status === 201) {
    console.log('✅ Пользователь зарегистрирован');
    return true;
  } else if (result.status === 409) {
    console.log('ℹ️ Пользователь уже существует');
    return true;
  } else {
    console.error('❌ Ошибка регистрации:', result.data);
    return false;
  }
}

// Авторизация
async function loginUser() {
  console.log('\n🔑 Авторизация...');
  const result = await makeRequest(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: testUser.email,
      password: testUser.password
    })
  });
  
  if (result.status === 200 && result.data.token) {
    authToken = result.data.token;
    console.log('✅ Авторизация успешна');
    return true;
  } else {
    console.error('❌ Ошибка авторизации:', result.data);
    return false;
  }
}

// Создание проекта
async function createProject() {
  console.log('\n📁 Создание проекта...');
  const result = await makeRequest(`${BASE_URL}/api/projects`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test Project',
      description: 'Test project for API testing'
    })
  });
  
  console.log('🔍 Project creation result:', JSON.stringify(result, null, 2));
  
  if (result.status === 201) {
    projectId = result.data.data.id;
    console.log('✅ Проект создан:', projectId);
    return true;
  } else {
    console.error('❌ Ошибка создания проекта:', result.data);
    return false;
  }
}

// Создание доски
async function createBoard() {
  console.log('\n📋 Создание доски...');
  const result = await makeRequest(`${BASE_URL}/api/boards`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test Board',
      description: 'Test board for API testing',
      project_id: projectId
    })
  });
  
  if (result.status === 201) {
    boardId = result.data.data.id;
    console.log('✅ Доска создана:', boardId);
    return true;
  } else {
    console.error('❌ Ошибка создания доски:', result.data);
    return false;
  }
}

// Создание колонки
async function createColumn() {
  console.log('\n📊 Создание колонки...');
  const result = await makeRequest(`${BASE_URL}/api/columns`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'To Do',
      board_id: boardId,
      position: 0
    })
  });
  
  if (result.status === 201) {
    columnId = result.data.data.id;
    console.log('✅ Колонка создана:', columnId);
    return true;
  } else {
    console.error('❌ Ошибка создания колонки:', result.data);
    return false;
  }
}

// Тест GET /api/tasks
async function testGetTasks() {
  console.log('\n📝 Тест GET /api/tasks...');
  const result = await makeRequest(`${BASE_URL}/api/tasks?project_id=${projectId}`);
  
  if (result.status === 200) {
    console.log('✅ GET /api/tasks успешен. Задач найдено:', result.data.tasks?.length || 0);
    return true;
  } else {
    console.error('❌ Ошибка GET /api/tasks:', result.data);
    return false;
  }
}

// Тест POST /api/tasks
async function testCreateTask() {
  console.log('\n➕ Тест POST /api/tasks...');
  const taskData = {
    title: 'Test Task',
    description: 'Test task description',
    column_id: columnId,
    priority: 'medium',
    status: 'todo'
  };
  
  const result = await makeRequest(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    body: JSON.stringify(taskData)
  });
  
  if (result.status === 201) {
    taskId = result.data.data.id;
    console.log('✅ POST /api/tasks успешен. Задача создана:', taskId);
    return true;
  } else {
    console.error('❌ Ошибка POST /api/tasks:', result.data);
    return false;
  }
}

// Тест PUT /api/tasks
async function testUpdateTask() {
  console.log('\n✏️ Тест PUT /api/tasks...');
  const updateData = {
    title: 'Updated Test Task',
    description: 'Updated description',
    priority: 'high'
  };
  
  const result = await makeRequest(`${BASE_URL}/api/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(updateData)
  });
  
  if (result.status === 200) {
    console.log('✅ PUT /api/tasks успешен');
    return true;
  } else {
    console.error('❌ Ошибка PUT /api/tasks:', result.data);
    return false;
  }
}

// Тест DELETE /api/tasks
async function testDeleteTask() {
  console.log('\n🗑️ Тест DELETE /api/tasks...');
  const result = await makeRequest(`${BASE_URL}/api/tasks/${taskId}`, {
    method: 'DELETE'
  });
  
  if (result.status === 200) {
    console.log('✅ DELETE /api/tasks успешен');
    return true;
  } else {
    console.error('❌ Ошибка DELETE /api/tasks:', result.data);
    return false;
  }
}

// Основная функция тестирования
async function runTests() {
  console.log('🚀 Запуск полного теста Tasks API\n');
  
  const tests = [
    { name: 'Регистрация пользователя', fn: registerUser },
    { name: 'Авторизация', fn: loginUser },
    { name: 'Создание проекта', fn: createProject },
    { name: 'Создание доски', fn: createBoard },
    { name: 'Создание колонки', fn: createColumn },
    { name: 'GET Tasks', fn: testGetTasks },
    { name: 'POST Tasks (создание)', fn: testCreateTask },
    { name: 'PUT Tasks (обновление)', fn: testUpdateTask },
    { name: 'DELETE Tasks (удаление)', fn: testDeleteTask }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const success = await test.fn();
      if (success) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ Ошибка в тесте "${test.name}":`, error.message);
      failed++;
    }
    
    // Небольшая пауза между тестами
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:');
  console.log(`✅ Пройдено: ${passed}`);
  console.log(`❌ Провалено: ${failed}`);
  console.log(`📈 Успешность: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
  } else {
    console.log('\n⚠️ Некоторые тесты провалились. Проверьте логи выше.');
  }
}

// Запуск тестов
runTests().catch(console.error);