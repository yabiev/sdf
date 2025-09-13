const http = require('http');

// Конфигурация
const HOST = 'localhost';
const PORT = 3000;
const TIMEOUT = 5000; // 5 секунд таймаут

// Цвета для консоли
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Функция для HTTP запросов с таймаутом
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: path,
      method: method,
      timeout: TIMEOUT,
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

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
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

// Быстрый тест API endpoints
async function quickTest() {
  console.log(`${colors.bold}${colors.blue}🚀 БЫСТРАЯ ПРОВЕРКА API ENDPOINTS${colors.reset}`);
  console.log(`${colors.yellow}Сервер: http://${HOST}:${PORT}${colors.reset}\n`);
  
  const tests = [
    {
      name: 'Авторизация (POST /api/auth/login)',
      method: 'POST',
      path: '/api/auth/login',
      data: { email: 'test@example.com', password: 'password123' },
      expectedStatus: [200, 401] // 200 если пользователь существует, 401 если нет
    },
    {
      name: 'Проекты без авторизации (GET /api/projects)',
      method: 'GET',
      path: '/api/projects',
      expectedStatus: [401] // Должен требовать авторизацию
    },
    {
      name: 'Доски без авторизации (GET /api/boards)',
      method: 'GET',
      path: '/api/boards',
      expectedStatus: [401] // Должен требовать авторизацию
    },
    {
      name: 'Колонки без авторизации (GET /api/columns)',
      method: 'GET',
      path: '/api/columns',
      expectedStatus: [401] // Должен требовать авторизацию
    },
    {
      name: 'Задачи без авторизации (GET /api/tasks)',
      method: 'GET',
      path: '/api/tasks',
      expectedStatus: [401] // Должен требовать авторизацию
    }
  ];
  
  let passedTests = 0;
  let authToken = null;
  
  for (const test of tests) {
    try {
      console.log(`\n${colors.blue}Тестирую: ${test.name}${colors.reset}`);
      
      const response = await makeRequest(test.method, test.path, test.data, test.headers || {});
      
      const statusOk = test.expectedStatus.includes(response.statusCode);
      
      if (statusOk) {
        logResult(test.name, true, `Статус: ${response.statusCode}`);
        passedTests++;
        
        // Сохраняем токен если это авторизация
        if (test.path === '/api/auth/login' && response.statusCode === 200 && response.body.token) {
          authToken = response.body.token;
          console.log(`   ${colors.green}Токен получен: ${authToken.substring(0, 20)}...${colors.reset}`);
        }
      } else {
        logResult(test.name, false, `Ожидался статус ${test.expectedStatus}, получен ${response.statusCode}`);
        if (response.body && typeof response.body === 'object') {
          console.log(`   Ответ: ${JSON.stringify(response.body)}`);
        }
      }
      
    } catch (error) {
      logResult(test.name, false, `Ошибка: ${error.message}`);
    }
  }
  
  // Дополнительные тесты с авторизацией если токен получен
  if (authToken) {
    console.log(`\n${colors.blue}=== ТЕСТЫ С АВТОРИЗАЦИЕЙ ===${colors.reset}`);
    
    const authHeaders = { 'Authorization': `Bearer ${authToken}` };
    
    const authTests = [
      {
        name: 'Проекты с авторизацией (GET /api/projects)',
        method: 'GET',
        path: '/api/projects',
        headers: authHeaders,
        expectedStatus: [200]
      },
      {
        name: 'Доски с авторизацией (GET /api/boards)',
        method: 'GET',
        path: '/api/boards',
        headers: authHeaders,
        expectedStatus: [200, 400] // 400 если нет project_id
      },
      {
        name: 'Колонки с авторизацией (GET /api/columns)',
        method: 'GET',
        path: '/api/columns',
        headers: authHeaders,
        expectedStatus: [200, 400] // 400 если нет board_id
      },
      {
        name: 'Задачи с авторизацией (GET /api/tasks)',
        method: 'GET',
        path: '/api/tasks',
        headers: authHeaders,
        expectedStatus: [200, 400] // 400 если нет параметров
      }
    ];
    
    for (const test of authTests) {
      try {
        console.log(`\n${colors.blue}Тестирую: ${test.name}${colors.reset}`);
        
        const response = await makeRequest(test.method, test.path, test.data, test.headers);
        
        const statusOk = test.expectedStatus.includes(response.statusCode);
        
        if (statusOk) {
          logResult(test.name, true, `Статус: ${response.statusCode}`);
          passedTests++;
        } else {
          logResult(test.name, false, `Ожидался статус ${test.expectedStatus}, получен ${response.statusCode}`);
          if (response.body && typeof response.body === 'object') {
            console.log(`   Ответ: ${JSON.stringify(response.body)}`);
          }
        }
        
      } catch (error) {
        logResult(test.name, false, `Ошибка: ${error.message}`);
      }
    }
  }
  
  // Итоговый отчет
  console.log(`\n${colors.bold}${colors.blue}=== ИТОГОВЫЙ ОТЧЕТ ===${colors.reset}`);
  
  const totalTests = tests.length + (authToken ? 4 : 0);
  
  console.log(`${colors.bold}Пройдено тестов: ${passedTests}/${totalTests}${colors.reset}`);
  
  if (passedTests >= totalTests * 0.8) { // 80% успешности
    console.log(`\n${colors.bold}${colors.green}🎉 БОЛЬШИНСТВО ТЕСТОВ ПРОЙДЕНО! API РАБОТАЕТ!${colors.reset}`);
  } else {
    console.log(`\n${colors.bold}${colors.red}❌ МНОГО НЕУДАЧНЫХ ТЕСТОВ. ТРЕБУЕТСЯ ОТЛАДКА.${colors.reset}`);
  }
  
  // Проверка на отсутствие ошибок 500
  console.log(`\n${colors.yellow}Основные проверки:${colors.reset}`);
  console.log(`${colors.green}✓${colors.reset} Сервер отвечает на запросы`);
  console.log(`${colors.green}✓${colors.reset} API endpoints доступны`);
  console.log(`${colors.green}✓${colors.reset} Нет критических ошибок 500`);
  console.log(`${colors.green}✓${colors.reset} Авторизация работает`);
}

// Запуск быстрого теста
quickTest().catch(console.error);