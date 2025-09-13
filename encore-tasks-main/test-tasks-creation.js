const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

// Данные для тестирования
const testUser = {
  email: 'admin@example.com',
  password: 'admin123'
};

async function loginUser() {
  console.log('🔐 Вход в систему...');
  
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(testUser)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ошибка входа: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  console.log('✅ Вход успешен');
  return data.token;
}

async function createProject(token) {
  console.log('📁 Создание проекта...');
  
  const projectData = {
    name: `Test Project ${Date.now()}`,
    description: 'Тестовый проект для проверки API'
  };
  
  const response = await fetch(`${BASE_URL}/api/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(projectData)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ошибка создания проекта: ${response.status} - ${errorText}`);
  }
  
  const project = await response.json();
  console.log('✅ Проект создан:', project.data.id);
  console.log('📊 Данные проекта:', JSON.stringify(project, null, 2));
  return project.data;
}

async function createBoard(token, projectId) {
  console.log('📋 Создание доски...');
  
  const boardData = {
    name: `Test Board ${Date.now()}`,
    description: 'Тестовая доска',
    project_id: projectId
  };
  
  const response = await fetch(`${BASE_URL}/api/boards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(boardData)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ошибка создания доски: ${response.status} - ${errorText}`);
  }
  
  const board = await response.json();
  console.log('✅ Доска создана:', board.data.id);
  return board.data;
}

async function createColumn(token, boardId) {
  console.log('📝 Создание колонки...');
  
  const columnData = {
    title: 'To Do',
    board_id: boardId,
    position: 0
  };
  
  const response = await fetch(`${BASE_URL}/api/columns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(columnData)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ошибка создания колонки: ${response.status} - ${errorText}`);
  }
  
  const column = await response.json();
  console.log('✅ Колонка создана:', column.id);
  return column;
}

async function createTask(token, columnId) {
  console.log('✅ Создание задачи...');
  
  const taskData = {
    title: `Test Task ${Date.now()}`,
    description: 'Тестовая задача для проверки API',
    column_id: columnId,
    priority: 'medium',
    status: 'todo'
  };
  
  const response = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(taskData)
  });
  
  console.log('📊 Статус создания задачи:', response.status);
  const responseText = await response.text();
  console.log('📄 Ответ сервера:', responseText);
  
  if (!response.ok) {
    throw new Error(`Ошибка создания задачи: ${response.status} - ${responseText}`);
  }
  
  const task = JSON.parse(responseText);
  console.log('✅ Задача создана:', task.id);
  return task;
}

async function testTasksAPI() {
  console.log('🧪 Тестирование API создания задач...');
  
  try {
    // 1. Вход в систему
    const token = await loginUser();
    
    // 2. Создание проекта
    const project = await createProject(token);
    
    // 3. Создание доски
    const board = await createBoard(token, project.id);
    console.log('📊 Данные доски:', JSON.stringify(board, null, 2));
    
    // 4. Создание колонки
    const column = await createColumn(token, board.id);
    
    // 5. Создание задачи
    const task = await createTask(token, column.id);
    
    console.log('\n🎉 Все тесты прошли успешно!');
    console.log('📊 Результаты:');
    console.log('  - Проект:', project.name);
    console.log('  - Доска:', board.name);
    console.log('  - Колонка:', column.name);
    console.log('  - Задача:', task.title);
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
    throw error;
  }
}

// Запуск теста
testTasksAPI().then(() => {
  console.log('\n🏁 Тест завершен успешно');
}).catch(error => {
  console.error('💥 Критическая ошибка:', error.message);
  process.exit(1);
});