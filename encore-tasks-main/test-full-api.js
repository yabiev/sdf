const http = require('http');

async function testFullAPI() {
  console.log('🧪 Полное тестирование API...');
  
  // Сначала авторизуемся
  console.log('\n🔐 Авторизация...');
  const loginData = JSON.stringify({
    email: 'test@example.com',
    password: 'password123'
  });
  
  const loginOptions = {
    hostname: 'localhost',
    port: 3002,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  };
  
  try {
    const loginResponse = await makeRequest(loginOptions, loginData);
    console.log('✅ Авторизация успешна');
    
    const authData = JSON.parse(loginResponse.body);
    const token = authData.token;
    console.log('🎫 Получен токен:', token.substring(0, 20) + '...');
    
    // Создаем проект
    console.log('\n📁 Создание тестового проекта...');
    const projectData = JSON.stringify({
      name: 'Test Project',
      description: 'Тестовый проект для API'
    });
    
    const projectOptions = {
      hostname: 'localhost',
      port: 3002,
      path: '/api/projects',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(projectData)
      }
    };
    
    const projectResponse = await makeRequest(projectOptions, projectData);
    console.log('📊 Статус создания проекта:', projectResponse.statusCode);
    console.log('📋 Ответ:', projectResponse.body);
    
    if (projectResponse.statusCode !== 201) {
      console.log('❌ Не удалось создать проект');
      return;
    }
    
    const projectResult = JSON.parse(projectResponse.body);
    const projectId = projectResult.data.id;
    console.log('✅ Проект создан с ID:', projectId);
    
    // Создаем доску
    console.log('\n📋 Создание тестовой доски...');
    const boardData = JSON.stringify({
      name: 'Test Board',
      description: 'Тестовая доска для API',
      project_id: projectId
    });
    
    const boardOptions = {
      hostname: 'localhost',
      port: 3002,
      path: '/api/boards',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(boardData)
      }
    };
    
    const boardResponse = await makeRequest(boardOptions, boardData);
    console.log('📊 Статус создания доски:', boardResponse.statusCode);
    console.log('📋 Ответ:', boardResponse.body);
    
    if (boardResponse.statusCode !== 201) {
      console.log('❌ Не удалось создать доску');
      return;
    }
    
    const boardResult = JSON.parse(boardResponse.body);
    const boardId = boardResult.data.id;
    console.log('✅ Доска создана с ID:', boardId);
    
    // Теперь тестируем API колонок с board_id
    console.log('\n📋 Тестирование GET /api/columns с board_id...');
    const columnsOptions = {
      hostname: 'localhost',
      port: 3002,
      path: `/api/columns?board_id=${boardId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    const columnsResponse = await makeRequest(columnsOptions);
    console.log('📊 Статус ответа колонок:', columnsResponse.statusCode);
    console.log('📋 Тело ответа:', columnsResponse.body);
    
    if (columnsResponse.statusCode === 200) {
      console.log('✅ API колонок работает!');
    } else {
      console.log('❌ API колонок вернул ошибку:', columnsResponse.statusCode);
    }
    
    // Создаем колонку
    console.log('\n📋 Создание тестовой колонки...');
    const columnData = JSON.stringify({
      name: 'Test Column',
      board_id: boardId,
      position: 1
    });
    
    const createColumnOptions = {
      hostname: 'localhost',
      port: 3002,
      path: '/api/columns',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(columnData)
      }
    };
    
    const createColumnResponse = await makeRequest(createColumnOptions, columnData);
    console.log('📊 Статус создания колонки:', createColumnResponse.statusCode);
    console.log('📋 Ответ:', createColumnResponse.body);
    
    if (createColumnResponse.statusCode === 201) {
      console.log('✅ Колонка создана успешно!');
    } else {
      console.log('❌ Не удалось создать колонку');
    }
    
    console.log('\n🎉 Тестирование завершено!');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  }
}

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

testFullAPI();