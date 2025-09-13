const http = require('http');

// Конфигурация
const BASE_URL = 'http://localhost:3002';
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123'
};

let authToken = null;
let validBoardId = null;
let validColumnId = null;
let validTaskId = null;

// Статистика
const stats = {
  total: 0,
  success: 0,
  failed: 0,
  errors: [],
  timings: {}
};

// HTTP запрос с измерением времени
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: parsedData,
            responseTime: responseTime,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: responseData,
            responseTime: responseTime,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', (err) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      reject({
        error: err.message,
        responseTime: responseTime
      });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Логирование результата теста
function logTestResult(testName, method, endpoint, result, expectedStatus = 200) {
  stats.total++;
  
  const timing = result.responseTime || 0;
  stats.timings[`${method} ${endpoint}`] = timing;
  
  if (result.error) {
    stats.failed++;
    stats.errors.push(`${testName}: ${result.error}`);
    console.log(`   ❌ ${method} ${endpoint} - ОШИБКА: ${result.error} (${timing}ms)`);
    return false;
  }
  
  const isSuccess = result.status >= 200 && result.status < 300;
  const isExpected = result.status === expectedStatus;
  
  if (isSuccess && isExpected) {
    stats.success++;
    console.log(`   ✅ ${method} ${endpoint} - OK (${result.status}, ${timing}ms)`);
    return true;
  } else if (result.status === 400) {
    stats.failed++;
    stats.errors.push(`${testName}: Ошибка 400 - ${JSON.stringify(result.data)}`);
    console.log(`   ❌ ${method} ${endpoint} - ОШИБКА 400 (${timing}ms)`);
    console.log(`      📄 Ответ: ${JSON.stringify(result.data).substring(0, 100)}...`);
    return false;
  } else if (result.status === 500) {
    stats.failed++;
    stats.errors.push(`${testName}: Ошибка 500 - ${JSON.stringify(result.data)}`);
    console.log(`   ❌ ${method} ${endpoint} - ОШИБКА 500 (${timing}ms)`);
    console.log(`      📄 Ответ: ${JSON.stringify(result.data).substring(0, 100)}...`);
    return false;
  } else {
    stats.failed++;
    stats.errors.push(`${testName}: Неожиданный статус ${result.status}`);
    console.log(`   ❌ ${method} ${endpoint} - Статус ${result.status} (${timing}ms)`);
    return false;
  }
}

// Основная функция тестирования
async function runFinalCheck() {
  console.log('🚀 ФИНАЛЬНАЯ ПРОВЕРКА ВСЕХ API ENDPOINTS');
  console.log('==================================================\n');
  
  try {
    // 1. AUTH API
    console.log('🔐 1. Тестирую AUTH API...');
    
    const loginResult = await makeRequest('POST', '/api/auth/login', TEST_USER);
    if (logTestResult('AUTH LOGIN', 'POST', '/api/auth/login', loginResult)) {
      if (loginResult.data && loginResult.data.token) {
        authToken = loginResult.data.token;
        console.log('   🔑 Токен авторизации получен');
      }
    }
    
    // 2. PROJECTS API
    console.log('\n📁 2. Тестирую PROJECTS API...');
    
    const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
    
    const projectsGetResult = await makeRequest('GET', '/api/projects', null, headers);
    logTestResult('PROJECTS GET', 'GET', '/api/projects', projectsGetResult);
    
    // 3. BOARDS API
    console.log('\n📋 3. Тестирую BOARDS API...');
    
    const boardsGetResult = await makeRequest('GET', '/api/boards', null, headers);
    if (logTestResult('BOARDS GET', 'GET', '/api/boards', boardsGetResult)) {
      // Найдем первую доступную доску
      if (boardsGetResult.data && boardsGetResult.data.data && boardsGetResult.data.data.boards && boardsGetResult.data.data.boards.length > 0) {
        validBoardId = boardsGetResult.data.data.boards[0].id;
        console.log(`   📌 Найдена доска с ID: ${validBoardId}`);
      }
    }
    
    // 4. COLUMNS API
    console.log('\n📂 4. Тестирую COLUMNS API...');
    
    if (validBoardId) {
      const columnsGetResult = await makeRequest('GET', `/api/columns?board_id=${validBoardId}`, null, headers);
      logTestResult('COLUMNS GET', 'GET', '/api/columns', columnsGetResult);
      
      // Создание колонки
      const newColumn = {
        title: 'Test Column Final Check',
        board_id: validBoardId,
        position: 0
      };
      
      const columnsPostResult = await makeRequest('POST', '/api/columns', newColumn, headers);
      if (logTestResult('COLUMNS POST', 'POST', '/api/columns', columnsPostResult, 201)) {
        if (columnsPostResult.data && columnsPostResult.data.data && columnsPostResult.data.data.id) {
          validColumnId = columnsPostResult.data.data.id;
          console.log(`   📌 Создана колонка с ID: ${validColumnId}`);
        }
      }
      
      // Удаление колонки (если создана)
      if (validColumnId) {
        const columnsDeleteResult = await makeRequest('DELETE', `/api/columns/${validColumnId}`, null, headers);
        logTestResult('COLUMNS DELETE', 'DELETE', `/api/columns/${validColumnId}`, columnsDeleteResult);
      }
    } else {
      console.log('   ⚠️  Пропускаю тесты COLUMNS - нет доступных досок');
    }
    
    // 5. TASKS API
    console.log('\n📝 5. Тестирую TASKS API...');
    
    if (validBoardId) {
      const tasksGetResult = await makeRequest('GET', `/api/tasks?board_id=${validBoardId}`, null, headers);
      logTestResult('TASKS GET', 'GET', '/api/tasks', tasksGetResult);
      
      // Создание задачи (если есть колонка)
      if (validColumnId) {
        const newTask = {
          title: 'Test Task Final Check',
          description: 'Test task for final API check',
          column_id: validColumnId,
          position: 0
        };
        
        const tasksPostResult = await makeRequest('POST', '/api/tasks', newTask, headers);
        if (logTestResult('TASKS POST', 'POST', '/api/tasks', tasksPostResult, 201)) {
          if (tasksPostResult.data && tasksPostResult.data.data && tasksPostResult.data.data.id) {
            validTaskId = tasksPostResult.data.data.id;
            console.log(`   📌 Создана задача с ID: ${validTaskId}`);
          }
        }
        
        // Удаление задачи (если создана)
        if (validTaskId) {
          const tasksDeleteResult = await makeRequest('DELETE', `/api/tasks/${validTaskId}`, null, headers);
          logTestResult('TASKS DELETE', 'DELETE', `/api/tasks/${validTaskId}`, tasksDeleteResult);
        }
      }
    } else {
      console.log('   ⚠️  Пропускаю тесты TASKS - нет доступных досок');
    }
    
  } catch (error) {
    console.log(`❌ Критическая ошибка: ${error.message}`);
    stats.failed++;
    stats.errors.push(`Критическая ошибка: ${error.message}`);
  }
  
  // Финальный отчет
  console.log('\n==================================================');
  console.log('📊 ДЕТАЛЬНЫЙ ОТЧЕТ О СТАТУСЕ КАЖДОГО ENDPOINT:');
  console.log('==================================================');
  
  console.log('\n⏱️  ВРЕМЯ ОТВЕТА КАЖДОГО API:');
  Object.entries(stats.timings).forEach(([endpoint, time]) => {
    const status = time < 100 ? '🟢' : time < 500 ? '🟡' : '🔴';
    console.log(`   ${status} ${endpoint}: ${time}ms`);
  });
  
  console.log('\n📈 ОБЩАЯ СТАТИСТИКА:');
  console.log(`   ✅ Успешных запросов: ${stats.success}`);
  console.log(`   ❌ Неуспешных запросов: ${stats.failed}`);
  console.log(`   📊 Всего запросов: ${stats.total}`);
  console.log(`   📈 Процент успеха: ${Math.round((stats.success / stats.total) * 100)}%`);
  
  if (stats.errors.length > 0) {
    console.log('\n🚨 ОБНАРУЖЕННЫЕ ОШИБКИ:');
    stats.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  
  // Проверка на отсутствие ошибок 400 и 500
  const has400Errors = stats.errors.some(error => error.includes('400'));
  const has500Errors = stats.errors.some(error => error.includes('500'));
  
  console.log('\n🔍 ПРОВЕРКА НА КРИТИЧЕСКИЕ ОШИБКИ:');
  console.log(`   ${has400Errors ? '❌' : '✅'} Ошибки 400 (Bad Request): ${has400Errors ? 'ОБНАРУЖЕНЫ' : 'НЕТ'}`);
  console.log(`   ${has500Errors ? '❌' : '✅'} Ошибки 500 (Server Error): ${has500Errors ? 'ОБНАРУЖЕНЫ' : 'НЕТ'}`);
  
  // Итоговый статус
  console.log('\n==================================================');
  if (stats.failed === 0) {
    console.log('🎉 ВСЕ API ENDPOINTS РАБОТАЮТ КОРРЕКТНО!');
  } else if (stats.success > stats.failed) {
    console.log('⚠️  БОЛЬШИНСТВО API РАБОТАЕТ, НО ЕСТЬ ПРОБЛЕМЫ');
  } else {
    console.log('🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ С API!');
  }
  
  console.log('\n🏁 Финальная проверка завершена!');
}

runFinalCheck().catch(console.error);