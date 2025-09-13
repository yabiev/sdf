const http = require('http');
const https = require('https');
const querystring = require('querystring');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.port === 443 ? https : http;
    
    const req = protocol.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: responseData,
          cookies: res.headers['set-cookie'] || []
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

async function testProjectCreationWithHttp() {
  console.log('🚀 Тестирование создания проекта через HTTP API...');
  
  let authCookies = '';
  
  try {
    // 1. Проверяем, что сервер работает
    console.log('\n1️⃣ Проверка работы сервера...');
    const serverCheck = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/',
      method: 'GET'
    });
    
    console.log(`Статус сервера: ${serverCheck.statusCode}`);
    
    if (serverCheck.statusCode !== 200) {
      throw new Error(`Сервер не отвечает корректно. Статус: ${serverCheck.statusCode}`);
    }
    
    console.log('✅ Сервер работает!');
    
    // 2. Регистрируем пользователя
    console.log('\n2️⃣ Регистрация пользователя...');
    const registerData = JSON.stringify({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    });
    
    const registerResult = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(registerData)
      }
    }, registerData);
    
    console.log(`Статус регистрации: ${registerResult.statusCode}`);
    console.log('Ответ регистрации:', registerResult.data);
    
    // 3. Авторизуемся
    console.log('\n3️⃣ Авторизация пользователя...');
    const loginData = JSON.stringify({
      email: 'test@example.com',
      password: 'password123'
    });
    
    const loginResult = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    }, loginData);
    
    console.log(`Статус авторизации: ${loginResult.statusCode}`);
    console.log('Ответ авторизации:', loginResult.data);
    
    // Извлекаем токен и cookies
    let authToken = null;
    if (loginResult.cookies.length > 0) {
      authCookies = loginResult.cookies.join('; ');
      console.log('Cookies получены:', authCookies.substring(0, 100) + '...');
    }
    
    try {
      const loginResponse = JSON.parse(loginResult.data);
      authToken = loginResponse.token;
      console.log('Токен получен:', authToken ? 'Да' : 'Нет');
    } catch (e) {
      console.log('Ошибка парсинга ответа авторизации:', e.message);
    }
    
    // 4. Создаем проект
    console.log('\n4️⃣ Создание проекта...');
    const projectData = JSON.stringify({
      name: 'Test Project ' + Date.now(),
      description: 'Тестовый проект для проверки функциональности'
    });
    
    const projectHeaders = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(projectData)
    };
    
    if (authToken) {
      projectHeaders['Authorization'] = `Bearer ${authToken}`;
    }
    if (authCookies) {
      projectHeaders['Cookie'] = authCookies;
    }
    
    const createResult = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/projects',
      method: 'POST',
      headers: projectHeaders
    }, projectData);
    
    console.log(`Статус создания проекта: ${createResult.statusCode}`);
    console.log('Ответ создания проекта:', createResult.data);
    
    // 5. Проверяем список проектов
    console.log('\n5️⃣ Получение списка проектов...');
    const getHeaders = {};
    
    if (authToken) {
      getHeaders['Authorization'] = `Bearer ${authToken}`;
    }
    if (authCookies) {
      getHeaders['Cookie'] = authCookies;
    }
    
    const projectsResult = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/projects',
      method: 'GET',
      headers: getHeaders
    });
    
    console.log(`Статус получения проектов: ${projectsResult.statusCode}`);
    console.log('Список проектов:', projectsResult.data);
    
    // Анализируем результат
    try {
      const projects = JSON.parse(projectsResult.data);
      if (Array.isArray(projects) && projects.length > 0) {
        console.log('\n✅ УСПЕХ! Проект успешно создан и отображается в списке');
        console.log(`Найдено проектов: ${projects.length}`);
        projects.forEach((project, index) => {
          console.log(`  ${index + 1}. ${project.name} (ID: ${project.id})`);
        });
        return true;
      } else {
        console.log('\n❌ Проект не найден в списке');
        return false;
      }
    } catch (e) {
      console.log('\n❌ Ошибка парсинга списка проектов:', e.message);
      console.log('Сырой ответ:', projectsResult.data);
      return false;
    }
    
  } catch (error) {
    console.error('\n💥 Ошибка во время тестирования:', error.message);
    return false;
  }
}

testProjectCreationWithHttp().then(success => {
  if (success) {
    console.log('\n🎉 Тест завершен успешно!');
    process.exit(0);
  } else {
    console.log('\n❌ Тест завершен с ошибками');
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});