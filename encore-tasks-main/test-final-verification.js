const http = require('http');

// Конфигурация
const HOST = 'localhost';
const PORT = 3000;
const BASE_URL = `http://${HOST}:${PORT}`;

// Цвета для консоли
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Глобальные переменные для тестов
let authToken = null;
let testProjectId = null;
let testBoardId = null;
let testColumnId = null;
let testTaskId = null;

// Функция для HTTP запросов
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Функция для логирования результатов
function logResult(testName, success, details = '') {
  const status = success ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
  console.log(`${status} ${testName}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

// Функция для логирования заголовков секций
function logSection(title) {
  console.log(`\n${colors.bold}${colors.blue}=== ${title} ===${colors.reset}`);
}

// Тест авторизации
async function testAuth() {
  logSection('ТЕСТИРОВАНИЕ АВТОРИЗАЦИИ');
  
  try {
    // Тест логина
    const loginData = {
      email: 'test@example.com',
      password: 'password123'
    };
    
    const response = await makeRequest('POST', '/api/auth/login', loginData);
    
    if (response.statusCode === 200 && response.body.token) {
      authToken = response.body.token;
      logResult('POST /api/auth/login', true, `Токен получен: ${authToken.substring(0, 20)}...`);
      return true;
    } else {
      logResult('POST /api/auth/login', false, `Статус: ${response.statusCode}, Ответ: ${JSON.stringify(response.body)}`);
      return false;
    }
  } catch (error) {
    logResult('POST /api/auth/login', false, `Ошибка: ${error.message}`);
    return false;
  }
}

// Тест проектов
async function testProjects() {
  logSection('ТЕСТИРОВАНИЕ API ПРОЕКТОВ');
  
  if (!authToken) {
    logResult('Проекты', false, 'Нет токена авторизации');
    return false;
  }
  
  const headers = { 'Authorization': `Bearer ${authToken}` };
  
  try {
    // Создание проекта
    const projectData = {
      name: 'Test Project Final',
      description: 'Финальный тест проекта'
    };
    
    const createResponse = await makeRequest('POST', '/api/projects', projectData, headers);
    
    if (createResponse.statusCode === 201 && createResponse.body.project) {
      testProjectId = createResponse.body.project.id;
      logResult('POST /api/projects', true, `Проект создан: ${testProjectId}`);
    } else {
      logResult('POST /api/projects', false, `Статус: ${createResponse.statusCode}, Ответ: ${JSON.stringify(createResponse.body)}`);
      return false;
    }
    
    // Получение проектов
    const getResponse = await makeRequest('GET', '/api/projects', null, headers);
    
    if (getResponse.statusCode === 200 && Array.isArray(getResponse.body.projects)) {
      logResult('GET /api/projects', true, `Найдено проектов: ${getResponse.body.projects.length}`);
    } else {
      logResult('GET /api/projects', false, `Статус: ${getResponse.statusCode}`);
    }
    
    return true;
  } catch (error) {
    logResult('Проекты', false, `Ошибка: ${error.message}`);
    return false;
  }
}

// Тест досок
async function testBoards() {
  logSection('ТЕСТИРОВАНИЕ API ДОСОК');
  
  if (!authToken || !testProjectId) {
    logResult('Доски', false, 'Нет токена или ID проекта');
    return false;
  }
  
  const headers = { 'Authorization': `Bearer ${authToken}` };
  
  try {
    // Создание доски
    const boardData = {
      name: 'Test Board Final',
      description: 'Финальный тест доски',
      project_id: testProjectId
    };
    
    const createResponse = await makeRequest('POST', '/api/boards', boardData, headers);
    
    if (createResponse.statusCode === 201 && createResponse.body.board) {
      testBoardId = createResponse.body.board.id;
      logResult('POST /api/boards', true, `Доска создана: ${testBoardId}`);
    } else {
      logResult('POST /api/boards', false, `Статус: ${createResponse.statusCode}, Ответ: ${JSON.stringify(createResponse.body)}`);
      return false;
    }
    
    // Получение досок проекта
    const getResponse = await makeRequest('GET', `/api/boards?project_id=${testProjectId}`, null, headers);
    
    if (getResponse.statusCode === 200 && Array.isArray(getResponse.body.boards)) {
      logResult('GET /api/boards', true, `Найдено досок: ${getResponse.body.boards.length}`);
    } else {
      logResult('GET /api/boards', false, `Статус: ${getResponse.statusCode}`);
    }
    
    return true;
  } catch (error) {
    logResult('Доски', false, `Ошибка: ${error.message}`);
    return false;
  }
}

// Тест колонок
async function testColumns() {
  logSection('ТЕСТИРОВАНИЕ API КОЛОНОК');
  
  if (!authToken || !testBoardId) {
    logResult('Колонки', false, 'Нет токена или ID доски');
    return false;
  }
  
  const headers = { 'Authorization': `Bearer ${authToken}` };
  
  try {
    // Создание колонки
    const columnData = {
      title: 'Test Column Final',
      board_id: testBoardId,
      position: 0
    };
    
    const createResponse = await makeRequest('POST', '/api/columns', columnData, headers);
    
    if (createResponse.statusCode === 201 && createResponse.body.column) {
      testColumnId = createResponse.body.column.id;
      logResult('POST /api/columns', true, `Колонка создана: ${testColumnId}`);
    } else {
      logResult('POST /api/columns', false, `Статус: ${createResponse.statusCode}, Ответ: ${JSON.stringify(createResponse.body)}`);
      return false;
    }
    
    // Получение колонок доски
    const getResponse = await makeRequest('GET', `/api/columns?board_id=${testBoardId}`, null, headers);
    
    if (getResponse.statusCode === 200 && Array.isArray(getResponse.body.columns)) {
      logResult('GET /api/columns', true, `Найдено колонок: ${getResponse.body.columns.length}`);
    } else {
      logResult('GET /api/columns', false, `Статус: ${getResponse.statusCode}`);
    }
    
    return true;
  } catch (error) {
    logResult('Колонки', false, `Ошибка: ${error.message}`);
    return false;
  }
}

// Тест задач
async function testTasks() {
  logSection('ТЕСТИРОВАНИЕ API ЗАДАЧ');
  
  if (!authToken || !testColumnId || !testProjectId || !testBoardId) {
    logResult('Задачи', false, 'Нет необходимых ID');
    return false;
  }
  
  const headers = { 'Authorization': `Bearer ${authToken}` };
  
  try {
    // Создание задачи
    const taskData = {
      title: 'Test Task Final',
      description: 'Финальный тест задачи',
      column_id: testColumnId,
      project_id: testProjectId,
      board_id: testBoardId,
      priority: 'medium',
      status: 'todo'
    };
    
    const createResponse = await makeRequest('POST', '/api/tasks', taskData, headers);
    
    if (createResponse.statusCode === 201 && createResponse.body.task) {
      testTaskId = createResponse.body.task.id;
      logResult('POST /api/tasks', true, `Задача создана: ${testTaskId}`);
    } else {
      logResult('POST /api/tasks', false, `Статус: ${createResponse.statusCode}, Ответ: ${JSON.stringify(createResponse.body)}`);
      return false;
    }
    
    // Получение задач колонки
    const getResponse = await makeRequest('GET', `/api/tasks?column_id=${testColumnId}`, null, headers);
    
    if (getResponse.statusCode === 200 && Array.isArray(getResponse.body.tasks)) {
      logResult('GET /api/tasks', true, `Найдено задач: ${getResponse.body.tasks.length}`);
    } else {
      logResult('GET /api/tasks', false, `Статус: ${getResponse.statusCode}`);
    }
    
    return true;
  } catch (error) {
    logResult('Задачи', false, `Ошибка: ${error.message}`);
    return false;
  }
}

// Тест удаления (очистка)
async function testCleanup() {
  logSection('ОЧИСТКА ТЕСТОВЫХ ДАННЫХ');
  
  if (!authToken) {
    logResult('Очистка', false, 'Нет токена авторизации');
    return false;
  }
  
  const headers = { 'Authorization': `Bearer ${authToken}` };
  
  try {
    // Удаление задачи
    if (testTaskId) {
      const deleteTaskResponse = await makeRequest('DELETE', `/api/tasks?id=${testTaskId}`, null, headers);
      logResult('DELETE /api/tasks', deleteTaskResponse.statusCode === 200, `Статус: ${deleteTaskResponse.statusCode}`);
    }
    
    // Удаление колонки
    if (testColumnId) {
      const deleteColumnResponse = await makeRequest('DELETE', `/api/columns?id=${testColumnId}`, null, headers);
      logResult('DELETE /api/columns', deleteColumnResponse.statusCode === 200, `Статус: ${deleteColumnResponse.statusCode}`);
    }
    
    // Удаление доски
    if (testBoardId) {
      const deleteBoardResponse = await makeRequest('DELETE', `/api/boards?id=${testBoardId}`, null, headers);
      logResult('DELETE /api/boards', deleteBoardResponse.statusCode === 200, `Статус: ${deleteBoardResponse.statusCode}`);
    }
    
    // Удаление проекта
    if (testProjectId) {
      const deleteProjectResponse = await makeRequest('DELETE', `/api/projects?id=${testProjectId}`, null, headers);
      logResult('DELETE /api/projects', deleteProjectResponse.statusCode === 200, `Статус: ${deleteProjectResponse.statusCode}`);
    }
    
    return true;
  } catch (error) {
    logResult('Очистка', false, `Ошибка: ${error.message}`);
    return false;
  }
}

// Основная функция тестирования
async function runAllTests() {
  console.log(`${colors.bold}${colors.blue}🚀 ФИНАЛЬНАЯ ПРОВЕРКА ВСЕХ API ENDPOINTS${colors.reset}`);
  console.log(`${colors.yellow}Сервер: ${BASE_URL}${colors.reset}\n`);
  
  const results = {
    auth: false,
    projects: false,
    boards: false,
    columns: false,
    tasks: false,
    cleanup: false
  };
  
  // Запуск всех тестов
  results.auth = await testAuth();
  
  if (results.auth) {
    results.projects = await testProjects();
    results.boards = await testBoards();
    results.columns = await testColumns();
    results.tasks = await testTasks();
    results.cleanup = await testCleanup();
  }
  
  // Итоговый отчет
  logSection('ИТОГОВЫЙ ОТЧЕТ');
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log(`${colors.bold}Пройдено тестов: ${passedTests}/${totalTests}${colors.reset}`);
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    console.log(`${status} ${test.toUpperCase()}`);
  });
  
  if (passedTests === totalTests) {
    console.log(`\n${colors.bold}${colors.green}🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! API РАБОТАЕТ КОРРЕКТНО!${colors.reset}`);
  } else {
    console.log(`\n${colors.bold}${colors.red}❌ НЕКОТОРЫЕ ТЕСТЫ НЕ ПРОЙДЕНЫ. ТРЕБУЕТСЯ ДОПОЛНИТЕЛЬНАЯ ОТЛАДКА.${colors.reset}`);
  }
  
  console.log(`\n${colors.yellow}Проверьте логи сервера для дополнительной информации.${colors.reset}`);
}

// Запуск тестов
runAllTests().catch(console.error);