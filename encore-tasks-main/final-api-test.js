const http = require('http');

const BASE_URL = 'http://localhost:3001';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInRpbWVzdGFtcCI6MTc1NzE1NDg3NTM1MCwicmFuZG9tIjoiandoYm1jdG81MiIsImlhdCI6MTc1NzE1NDg3NSwiZXhwIjoxNzU3NzU5Njc1fQ.EiOIYsAqC82DundGe4rMtKM37sBUplv2gS6NbLFv9m8';

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonBody, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runFinalAPITest() {
  console.log('🚀 ФИНАЛЬНАЯ ПРОВЕРКА API ENDPOINTS');
  console.log('=' .repeat(50));
  
  const results = {
    successful: 0,
    failed: 0,
    errors: []
  };

  // 1. AUTH API Test
  console.log('\n🔐 1. Тестирую AUTH API...');
  try {
    const authData = {
      email: 'test@example.com',
      password: 'password123'
    };
    const authResult = await makeRequest('/api/auth/login', 'POST', authData);
    if (authResult.status === 200) {
      console.log('   ✅ POST /api/auth/login - OK');
      results.successful++;
    } else {
      console.log(`   ❌ POST /api/auth/login - Статус ${authResult.status}`);
      results.failed++;
      results.errors.push(`AUTH: ${authResult.status}`);
    }
  } catch (error) {
    console.log(`   💥 POST /api/auth/login - Ошибка: ${error.message}`);
    results.failed++;
    results.errors.push(`AUTH: ${error.message}`);
  }

  // 2. PROJECTS API Test
  console.log('\n📁 2. Тестирую PROJECTS API...');
  try {
    const projectsResult = await makeRequest('/api/projects');
    if (projectsResult.status === 200) {
      console.log('   ✅ GET /api/projects - OK');
      results.successful++;
    } else {
      console.log(`   ❌ GET /api/projects - Статус ${projectsResult.status}`);
      results.failed++;
      results.errors.push(`PROJECTS: ${projectsResult.status}`);
    }
  } catch (error) {
    console.log(`   💥 GET /api/projects - Ошибка: ${error.message}`);
    results.failed++;
    results.errors.push(`PROJECTS: ${error.message}`);
  }

  // 3. BOARDS API Test
  console.log('\n📋 3. Тестирую BOARDS API...');
  let validBoardId = null;
  try {
    const boardsResult = await makeRequest('/api/boards');
    if (boardsResult.status === 200) {
      console.log('   ✅ GET /api/boards - OK');
      results.successful++;
      
      // Найдем первую доступную доску
      if (boardsResult.data && boardsResult.data.data && boardsResult.data.data.boards && boardsResult.data.data.boards.length > 0) {
        validBoardId = boardsResult.data.data.boards[0].id;
        console.log(`   📌 Найдена доска с ID: ${validBoardId}`);
        console.log(`   📊 Всего досок: ${boardsResult.data.data.boards.length}`);
      }
    } else {
      console.log(`   ❌ GET /api/boards - Статус ${boardsResult.status}`);
      results.failed++;
      results.errors.push(`BOARDS: ${boardsResult.status}`);
    }
  } catch (error) {
    console.log(`   💥 GET /api/boards - Ошибка: ${error.message}`);
    results.failed++;
    results.errors.push(`BOARDS: ${error.message}`);
  }

  // 4. COLUMNS API Test (используем найденный board_id)
  console.log('\n📂 4. Тестирую COLUMNS API...');
  if (validBoardId) {
    try {
      const columnsResult = await makeRequest(`/api/columns?board_id=${validBoardId}`);
      if (columnsResult.status === 200) {
        console.log('   ✅ GET /api/columns - OK');
        results.successful++;
      } else {
        console.log(`   ❌ GET /api/columns - Статус ${columnsResult.status}`);
        results.failed++;
        results.errors.push(`COLUMNS GET: ${columnsResult.status}`);
      }
    } catch (error) {
      console.log(`   💥 GET /api/columns - Ошибка: ${error.message}`);
      results.failed++;
      results.errors.push(`COLUMNS GET: ${error.message}`);
    }

    // Тест создания колонки
    try {
      const newColumn = {
        title: 'Test Column ' + Date.now(),
        board_id: validBoardId,
        position: 0
      };
      const createColumnResult = await makeRequest('/api/columns', 'POST', newColumn);
      if (createColumnResult.status === 200 || createColumnResult.status === 201) {
        console.log('   ✅ POST /api/columns - OK');
        results.successful++;
      } else {
        console.log(`   ❌ POST /api/columns - Статус ${createColumnResult.status}`);
        results.failed++;
        results.errors.push(`COLUMNS POST: ${createColumnResult.status}`);
      }
    } catch (error) {
      console.log(`   💥 POST /api/columns - Ошибка: ${error.message}`);
      results.failed++;
      results.errors.push(`COLUMNS POST: ${error.message}`);
    }
  } else {
    console.log('   ⚠️  Пропускаю тест COLUMNS - нет доступных досок');
    results.failed += 2;
    results.errors.push('COLUMNS: No valid board_id');
  }

  // 5. TASKS API Test
  console.log('\n📝 5. Тестирую TASKS API...');
  if (validBoardId) {
    try {
      const tasksResult = await makeRequest(`/api/tasks?board_id=${validBoardId}`);
      if (tasksResult.status === 200) {
        console.log('   ✅ GET /api/tasks - OK');
        results.successful++;
      } else {
        console.log(`   ❌ GET /api/tasks - Статус ${tasksResult.status}`);
        console.log(`   📄 Ответ: ${JSON.stringify(tasksResult.data).substring(0, 200)}...`);
        results.failed++;
        results.errors.push(`TASKS GET: ${tasksResult.status}`);
      }
    } catch (error) {
      console.log(`   💥 GET /api/tasks - Ошибка: ${error.message}`);
      results.failed++;
      results.errors.push(`TASKS GET: ${error.message}`);
    }
  } else {
    console.log('   ⚠️  Пропускаю тест TASKS - нет доступных досок');
    results.failed++;
    results.errors.push('TASKS: No valid board_id');
  }

  // Финальный отчет
  console.log('\n' + '='.repeat(50));
  console.log('📊 ФИНАЛЬНЫЙ ОТЧЕТ:');
  console.log(`✅ Успешных тестов: ${results.successful}`);
  console.log(`❌ Неуспешных тестов: ${results.failed}`);
  console.log(`📈 Процент успеха: ${Math.round((results.successful / (results.successful + results.failed)) * 100)}%`);
  
  if (results.errors.length > 0) {
    console.log('\n🚨 ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ:');
    results.errors.forEach((error, i) => {
      console.log(`   ${i + 1}. ${error}`);
    });
  }
  
  if (results.failed === 0) {
    console.log('\n🎉 ВСЕ API ENDPOINTS РАБОТАЮТ КОРРЕКТНО!');
  } else if (results.successful > results.failed) {
    console.log('\n⚠️  БОЛЬШИНСТВО API РАБОТАЕТ, НО ЕСТЬ ПРОБЛЕМЫ');
  } else {
    console.log('\n🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ С API!');
  }
  
  console.log('\n🏁 Финальная проверка завершена!');
}

runFinalAPITest().catch(console.error);