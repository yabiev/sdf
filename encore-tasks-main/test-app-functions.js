const fetch = require('node-fetch');

let authToken = null;
let userId = null;
let projectId = null;
let boardId = null;

async function makeRequest(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  return response;
}

async function testLogin() {
  console.log('\n🔐 Тестирование авторизации...');
  
  try {
    const response = await makeRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'axelencore@mail.ru',
        password: 'Ad580dc6axelencore'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      authToken = data.token;
      userId = data.user.id;
      console.log('✅ Авторизация успешна!');
      console.log('   Пользователь:', data.user.name, '(' + data.user.email + ')');
      console.log('   Роль:', data.user.role);
      return true;
    } else {
      console.log('❌ Ошибка авторизации:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка при авторизации:', error.message);
    return false;
  }
}

async function testCreateProject() {
  console.log('\n📁 Тестирование создания проекта...');
  
  try {
    const response = await makeRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Тестовый проект ' + Date.now(),
        description: 'Проект для тестирования функциональности'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      const data = result.success ? result.data : result;
      projectId = data.id;
      console.log('✅ Проект создан успешно!');
      console.log('   ID проекта:', projectId);
      console.log('   Название:', data.name);
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ Ошибка создания проекта:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка при создании проекта:', error.message);
    return false;
  }
}

async function testCreateBoard() {
  console.log('\n📋 Тестирование создания доски...');
  
  if (!projectId) {
    console.log('❌ Нет ID проекта для создания доски');
    return false;
  }
  
  try {
    const response = await makeRequest('http://localhost:3000/api/boards', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Тестовая доска ' + Date.now(),
        description: 'Доска для тестирования',
        project_id: projectId
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      const data = result.success ? result.data : result;
      boardId = data.id;
      console.log('✅ Доска создана успешно!');
      console.log('   ID доски:', boardId);
      console.log('   Название:', data.name);
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ Ошибка создания доски:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка при создании доски:', error.message);
    return false;
  }
}

async function testGetProjects() {
  console.log('\n📂 Тестирование получения списка проектов...');
  
  try {
    const response = await makeRequest('http://localhost:3000/api/projects');
    
    if (response.ok) {
      const result = await response.json();
      const data = result.success ? result.data.projects : result;
      console.log('✅ Список проектов получен!');
      console.log('   Количество проектов:', data.length);
      if (data.length > 0) {
        console.log('   Первый проект:', data[0].name);
      }
      return true;
    } else {
      console.log('❌ Ошибка получения проектов:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка при получении проектов:', error.message);
    return false;
  }
}

async function testGetBoards() {
  console.log('\n📋 Тестирование получения списка досок...');
  
  if (!projectId) {
    console.log('❌ Нет ID проекта для получения досок');
    return false;
  }
  
  try {
    const response = await makeRequest(`http://localhost:3000/api/boards?projectId=${projectId}`);
    
    if (response.ok) {
      const result = await response.json();
      const data = result.success ? result.data.boards || result.data : result;
      console.log('✅ Список досок получен!');
      console.log('   Количество досок:', data.length);
      if (data.length > 0) {
        console.log('   Первая доска:', data[0].name);
      }
      return true;
    } else {
      console.log('❌ Ошибка получения досок:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка при получении досок:', error.message);
    return false;
  }
}

async function testCreateTask() {
  console.log('\n✅ Тестирование создания задачи...');
  
  if (!boardId) {
    console.log('❌ Нет ID доски для создания задачи');
    return false;
  }
  
  try {
    // Сначала получаем колонки доски
    const columnsResponse = await makeRequest(`http://localhost:3000/api/boards/${boardId}/columns`);
    let columnId = null;
    
    if (columnsResponse.ok) {
      const columnsResult = await columnsResponse.json();
      const columns = columnsResult.success ? columnsResult.data : columnsResult;
      if (columns && columns.length > 0) {
        columnId = columns[0].id; // Берем первую колонку
        console.log('   Используем колонку:', columns[0].name, 'ID:', columnId);
      }
    }
    
    if (!columnId) {
      console.log('❌ Не удалось получить ID колонки');
      return false;
    }
    
    const response = await makeRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Тестовая задача ' + Date.now(),
        description: 'Описание тестовой задачи',
        column_id: columnId,
        priority: 'medium'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      const data = result.success ? result.data : result;
      console.log('✅ Задача создана успешно!');
      console.log('   ID задачи:', data.id);
      console.log('   Название:', data.title);
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ Ошибка создания задачи:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка при создании задачи:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Запуск комплексного тестирования приложения Encore Tasks\n');
  
  const results = {
    login: false,
    createProject: false,
    createBoard: false,
    getProjects: false,
    getBoards: false,
    createTask: false
  };
  
  // Тестируем авторизацию
  results.login = await testLogin();
  
  if (results.login) {
    // Тестируем создание проекта
    results.createProject = await testCreateProject();
    
    // Тестируем получение проектов
    results.getProjects = await testGetProjects();
    
    if (results.createProject) {
      // Тестируем создание доски
      results.createBoard = await testCreateBoard();
      
      // Тестируем получение досок
      results.getBoards = await testGetBoards();
      
      if (results.createBoard) {
        // Тестируем создание задачи
        results.createTask = await testCreateTask();
      }
    }
  }
  
  // Выводим итоговый отчет
  console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ ТЕСТИРОВАНИЯ:');
  console.log('================================');
  
  const tests = [
    { name: 'Авторизация', result: results.login },
    { name: 'Создание проекта', result: results.createProject },
    { name: 'Получение проектов', result: results.getProjects },
    { name: 'Создание доски', result: results.createBoard },
    { name: 'Получение досок', result: results.getBoards },
    { name: 'Создание задачи', result: results.createTask }
  ];
  
  let passedTests = 0;
  tests.forEach(test => {
    const status = test.result ? '✅ ПРОЙДЕН' : '❌ ПРОВАЛЕН';
    console.log(`${test.name}: ${status}`);
    if (test.result) passedTests++;
  });
  
  console.log('\n================================');
  console.log(`Пройдено тестов: ${passedTests}/${tests.length}`);
  
  if (passedTests === tests.length) {
    console.log('🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Приложение работает корректно.');
  } else {
    console.log('⚠️  Некоторые тесты провалены. Требуется дополнительная диагностика.');
  }
}

runAllTests();