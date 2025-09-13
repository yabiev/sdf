const http = require('http');

// Функция для выполнения HTTP запросов
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
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

async function testFullWorkflow() {
  console.log('🧪 Тестирование полного рабочего процесса...');
  
  const timestamp = Date.now();
  const testEmail = `test-workflow-${timestamp}@example.com`;
  const testPassword = 'testpassword123';
  
  try {
    // 1. Регистрация пользователя
    console.log('\n📝 1. Регистрация пользователя...');
    const registerResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      name: 'Test Workflow User',
      email: testEmail,
      password: testPassword
    });
    
    console.log('📊 Ответ регистрации:', registerResponse.status);
    if (registerResponse.status !== 201) {
      console.log('❌ Ошибка регистрации:', registerResponse.data);
      return;
    }
    console.log('✅ Регистрация успешна!');
    
    // 2. Вход в систему
    console.log('\n🔐 2. Вход в систему...');
    const loginResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: testEmail,
      password: testPassword
    });
    
    console.log('📊 Ответ входа:', loginResponse.status);
    if (loginResponse.status !== 200) {
      console.log('❌ Ошибка входа:', loginResponse.data);
      return;
    }
    
    const authToken = loginResponse.data.token;
    const userId = loginResponse.data.user.id;
    console.log('✅ Вход успешен! Token получен.');
    
    // 3. Создание проекта
    console.log('\n📁 3. Создание проекта...');
    const projectResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/projects',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    }, {
      name: 'Test Project',
      description: 'Тестовый проект для проверки функциональности'
    });
    
    console.log('📊 Ответ создания проекта:', projectResponse.status);
    if (projectResponse.status !== 201) {
      console.log('❌ Ошибка создания проекта:', projectResponse.data);
      return;
    }
    
    const projectId = projectResponse.data.data.id;
    console.log('✅ Проект создан! ID:', projectId);
    
    // 4. Создание доски
    console.log('\n📋 4. Создание доски...');
    const boardResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/boards',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    }, {
      name: 'Test Board',
      description: 'Тестовая доска',
      project_id: projectId
    });
    
    console.log('📊 Ответ создания доски:', boardResponse.status);
    if (boardResponse.status !== 201) {
      console.log('❌ Ошибка создания доски:', boardResponse.data);
      return;
    }
    
    const boardId = boardResponse.data.data.id;
    console.log('✅ Доска создана! ID:', boardId);
    
    // 5. Создание колонки
    console.log('\n📊 5. Создание колонки...');
    const columnResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/columns',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    }, {
      title: 'В работе',
      board_id: boardId,
      position: 1
    });
    
    console.log('📊 Ответ создания колонки:', columnResponse.status);
    if (columnResponse.status !== 201) {
      console.log('❌ Ошибка создания колонки:', columnResponse.data);
      return;
    }
    
    const columnId = columnResponse.data.data.id;
    console.log('✅ Колонка создана! ID:', columnId);
    
    // 6. Создание задачи
    console.log('\n✅ 6. Создание задачи...');
    const taskResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/tasks',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    }, {
      title: 'Test Task',
      description: 'Тестовая задача для проверки функциональности',
      column_id: columnId,
      priority: 'medium',
      assignees: [userId]
    });
    
    console.log('📊 Ответ создания задачи:', taskResponse.status);
    if (taskResponse.status !== 201) {
      console.log('❌ Ошибка создания задачи:', taskResponse.data);
      return;
    }
    
    const taskId = taskResponse.data.data.id;
    console.log('✅ Задача создана! ID:', taskId);
    
    console.log('\n🎉 Полный рабочий процесс завершен успешно!');
    console.log('📋 Созданные объекты:');
    console.log(`   👤 Пользователь: ${userId}`);
    console.log(`   📁 Проект: ${projectId}`);
    console.log(`   📋 Доска: ${boardId}`);
    console.log(`   📊 Колонка: ${columnId}`);
    console.log(`   ✅ Задача: ${taskId}`);
    
  } catch (error) {
    console.error('❌ Ошибка в тестировании:', error);
  }
}

testFullWorkflow();