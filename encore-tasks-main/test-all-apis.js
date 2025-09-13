const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

// Тестовые данные
const testUser = {
  email: 'test@example.com',
  password: 'password123'
};

let authToken = '';

// Цвета для вывода
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Функция для выполнения HTTP запросов
async function makeRequest(method, endpoint, data = null, useAuth = true) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (useAuth && authToken) {
    options.headers['Authorization'] = `Bearer ${authToken}`;
  }

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const responseData = await response.text();
    
    let parsedData;
    try {
      parsedData = JSON.parse(responseData);
    } catch {
      parsedData = responseData;
    }

    return {
      status: response.status,
      data: parsedData,
      ok: response.ok
    };
  } catch (error) {
    return {
      status: 0,
      data: { error: error.message },
      ok: false
    };
  }
}

// Основная функция тестирования
async function runTests() {
  log('🚀 Быстрое тестирование API endpoints', 'bold');
  
  try {
    // 1. Тест аутентификации
    logInfo('1. Тестирование аутентификации...');
    const loginResponse = await makeRequest('POST', '/api/auth/login', testUser, false);
    
    if (loginResponse.ok && loginResponse.data.token) {
      logSuccess(`Логин успешен (${loginResponse.status})`);
      authToken = loginResponse.data.token;
    } else {
      logError(`Ошибка логина (${loginResponse.status}): ${JSON.stringify(loginResponse.data)}`);
      return;
    }
    
    // 2. Тест получения проектов
    logInfo('2. Тестирование GET /api/projects...');
    const getProjectsResponse = await makeRequest('GET', '/api/projects');
    if (getProjectsResponse.ok) {
      logSuccess(`GET проекты (${getProjectsResponse.status}) - найдено: ${getProjectsResponse.data.length}`);
    } else {
      logError(`GET проекты (${getProjectsResponse.status}): ${JSON.stringify(getProjectsResponse.data)}`);
    }
    
    // 3. Тест создания проекта
    logInfo('3. Тестирование POST /api/projects...');
    const createProjectData = {
      name: 'Test Project Quick',
      description: 'Быстрый тест проекта'
    };
    
    const createProjectResponse = await makeRequest('POST', '/api/projects', createProjectData);
    if (createProjectResponse.ok) {
      logSuccess(`POST проект создан (${createProjectResponse.status}) - ID: ${createProjectResponse.data.id}`);
      
      const projectId = createProjectResponse.data.id;
      
      // 4. Тест создания доски
      logInfo('4. Тестирование POST /api/boards...');
      const createBoardData = {
        name: 'Test Board Quick',
        description: 'Быстрый тест доски',
        projectId: projectId
      };
      
      const createBoardResponse = await makeRequest('POST', '/api/boards', createBoardData);
      if (createBoardResponse.ok) {
        logSuccess(`POST доска создана (${createBoardResponse.status}) - ID: ${createBoardResponse.data.id}`);
        
        const boardId = createBoardResponse.data.id;
        
        // 5. Тест создания колонки
        logInfo('5. Тестирование POST /api/columns...');
        const createColumnData = {
          name: 'Test Column Quick',
          boardId: boardId,
          position: 1
        };
        
        const createColumnResponse = await makeRequest('POST', '/api/columns', createColumnData);
        if (createColumnResponse.ok) {
          logSuccess(`POST колонка создана (${createColumnResponse.status}) - ID: ${createColumnResponse.data.id}`);
        } else {
          logError(`POST колонка (${createColumnResponse.status}): ${JSON.stringify(createColumnResponse.data)}`);
        }
        
      } else {
        logError(`POST доска (${createBoardResponse.status}): ${JSON.stringify(createBoardResponse.data)}`);
      }
      
    } else {
      logError(`POST проект (${createProjectResponse.status}): ${JSON.stringify(createProjectResponse.data)}`);
    }
    
    log('\n🎉 Быстрое тестирование завершено!', 'bold');
    
  } catch (error) {
    logError(`Критическая ошибка: ${error.message}`);
    console.error(error);
  }
}

// Запуск тестов
runTests();