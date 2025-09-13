const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';
let authToken = '';
let projectId = '';
let boardId = '';

async function login() {
  console.log('🔐 Авторизация...');
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'password123'
    })
  });
  
  const data = await response.json();
  if (data.success) {
    authToken = data.token;
    console.log('✅ Авторизация успешна');
    return true;
  } else {
    console.log('❌ Ошибка авторизации:', data);
    return false;
  }
}

async function createProject() {
  console.log('📁 Создание проекта...');
  const response = await fetch(`${BASE_URL}/api/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      name: 'Test Project for Columns',
      description: 'Test project'
    })
  });
  
  const data = await response.json();
  if (data.success) {
    projectId = data.project.id;
    console.log('✅ Проект создан:', projectId);
    return true;
  } else {
    console.log('❌ Ошибка создания проекта:', data);
    return false;
  }
}

async function createBoard() {
  console.log('📋 Создание доски...');
  const response = await fetch(`${BASE_URL}/api/boards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      name: 'Test Board for Columns',
      description: 'Test board',
      project_id: projectId
    })
  });
  
  const data = await response.json();
  console.log('📋 Ответ создания доски:', JSON.stringify(data, null, 2));
  
  if (data.success) {
    boardId = data.board.id;
    console.log('✅ Доска создана:', boardId);
    return true;
  } else {
    console.log('❌ Ошибка создания доски:', data);
    return false;
  }
}

async function createColumn() {
  console.log('📊 Создание колонки...');
  console.log('📊 Board ID:', boardId);
  
  const response = await fetch(`${BASE_URL}/api/columns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      name: 'Test Column',
      board_id: boardId,
      position: 1
    })
  });
  
  console.log('📊 Статус ответа:', response.status);
  console.log('📊 Заголовки ответа:', Object.fromEntries(response.headers.entries()));
  
  const text = await response.text();
  console.log('📊 Сырой ответ:', text);
  
  try {
    const data = JSON.parse(text);
    console.log('📊 Парсированный ответ:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ Колонка создана:', data.column.id);
      return true;
    } else {
      console.log('❌ Ошибка создания колонки:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ Ошибка парсинга JSON:', error.message);
    return false;
  }
}

async function runTest() {
  console.log('🧪 Запуск теста API колонок\n');
  
  if (!await login()) return;
  if (!await createProject()) return;
  if (!await createBoard()) return;
  await createColumn();
  
  console.log('\n🏁 Тест завершен');
}

runTest().catch(console.error);