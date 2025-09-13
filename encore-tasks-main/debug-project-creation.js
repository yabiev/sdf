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

async function debugProjectCreation() {
  console.log('🔍 Отладка создания проекта...');
  
  const timestamp = Date.now();
  const testEmail = `debug-${timestamp}@example.com`;
  const testPassword = 'testpassword123';
  
  try {
    // 1. Регистрация и вход
    console.log('\n📝 Регистрация пользователя...');
    const registerResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      name: 'Debug User',
      email: testEmail,
      password: testPassword
    });
    
    if (registerResponse.status !== 201) {
      console.log('❌ Ошибка регистрации:', registerResponse.data);
      return;
    }
    
    console.log('🔐 Вход в систему...');
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
    
    if (loginResponse.status !== 200) {
      console.log('❌ Ошибка входа:', loginResponse.data);
      return;
    }
    
    const authToken = loginResponse.data.token;
    console.log('✅ Токен получен');
    
    // 2. Создание проекта с детальным логированием
    console.log('\n📁 Создание проекта...');
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
      name: 'Debug Project',
      description: 'Проект для отладки'
    });
    
    console.log('📊 Статус ответа:', projectResponse.status);
    console.log('📊 Полный ответ:', JSON.stringify(projectResponse.data, null, 2));
    
    if (projectResponse.status === 201) {
      console.log('✅ Проект создан успешно!');
      if (projectResponse.data && projectResponse.data.project) {
        console.log('📁 ID проекта:', projectResponse.data.project.id);
      } else {
        console.log('⚠️ Структура ответа не содержит project.id');
        console.log('🔍 Доступные ключи:', Object.keys(projectResponse.data || {}));
      }
    } else {
      console.log('❌ Ошибка создания проекта');
    }
    
  } catch (error) {
    console.error('❌ Ошибка в отладке:', error);
  }
}

debugProjectCreation();