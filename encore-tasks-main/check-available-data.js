const http = require('http');

// Конфигурация
const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123'
};

let authToken = '';

// Функция для выполнения HTTP запросов
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(result);
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Функция для логина
async function login() {
  console.log('🔐 Выполняем вход...');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  try {
    const response = await makeRequest(options, TEST_USER);
    
    if (response.statusCode === 200 && response.body.token) {
      authToken = response.body.token;
      console.log('✅ Вход выполнен успешно');
      return true;
    } else {
      console.log('❌ Ошибка входа');
      return false;
    }
  } catch (error) {
    console.log('❌ Ошибка при входе:', error.message);
    return false;
  }
}

// Функция для получения проектов
async function getProjects() {
  console.log('📋 Получаем список проектов...');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/projects',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  };
  
  try {
    const response = await makeRequest(options);
    
    console.log('Статус ответа проектов:', response.statusCode);
    console.log('Проекты:', JSON.stringify(response.body, null, 2));
    
    return response.body;
  } catch (error) {
    console.log('❌ Ошибка при получении проектов:', error.message);
    return null;
  }
}

// Функция для получения досок
async function getBoards(projectId = null) {
  console.log('📋 Получаем список досок...');
  
  const path = projectId ? `/api/boards?project_id=${projectId}` : '/api/boards';
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: path,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  };
  
  try {
    const response = await makeRequest(options);
    
    console.log('Статус ответа досок:', response.statusCode);
    console.log('Доски:', JSON.stringify(response.body, null, 2));
    
    return response.body;
  } catch (error) {
    console.log('❌ Ошибка при получении досок:', error.message);
    return null;
  }
}

// Функция для получения колонок
async function getColumns(boardId = null) {
  console.log('📋 Получаем список колонок...');
  
  const path = boardId ? `/api/columns?board_id=${boardId}` : '/api/columns';
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: path,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  };
  
  try {
    const response = await makeRequest(options);
    
    console.log('Статус ответа колонок:', response.statusCode);
    console.log('Колонки:', JSON.stringify(response.body, null, 2));
    
    return response.body;
  } catch (error) {
    console.log('❌ Ошибка при получении колонок:', error.message);
    return null;
  }
}

// Основная функция
async function checkAvailableData() {
  console.log('🚀 Проверяем доступные данные\n');
  
  try {
    const loginSuccess = await login();
    if (!loginSuccess) return;
    
    console.log('\n--- Проекты ---');
    const projects = await getProjects();
    
    console.log('\n--- Доски ---');
    const boards = await getBoards();
    
    console.log('\n--- Колонки ---');
    const columns = await getColumns();
    
    console.log('\n🎉 Проверка завершена!');
    
  } catch (error) {
    console.log('❌ Критическая ошибка:', error.message);
    console.log('Стек ошибки:', error.stack);
  }
}

// Запускаем проверку
checkAvailableData().then(() => {
  console.log('\n✅ Скрипт завершен');
}).catch((error) => {
  console.log('\n❌ Необработанная ошибка:', error.message);
  console.log('Стек ошибки:', error.stack);
});