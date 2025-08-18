const fs = require('fs');
const path = require('path');

console.log('🧪 Тестирование исправленной системы сессий...');

// Функция для выполнения HTTP запросов
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.text();
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch {
      jsonData = data;
    }
    
    return {
      status: response.status,
      ok: response.ok,
      data: jsonData,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    console.error(`❌ Ошибка запроса к ${url}:`, error.message);
    return { error: error.message };
  }
}

// Основная функция тестирования
async function testSessionSystem() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('\n1. 🔍 Проверка доступности сервера...');
  const healthCheck = await makeRequest(`${baseUrl}/api/health`);
  if (healthCheck.error) {
    console.log('❌ Сервер недоступен. Убедитесь, что npm run dev запущен.');
    return;
  }
  console.log('✅ Сервер доступен');
  
  console.log('\n2. 🔐 Тестирование входа в систему...');
  
  // Попробуем войти с тестовыми данными
  const loginData = {
    email: 'test@example.com',
    password: 'password123'
  };
  
  console.log('📤 Отправка запроса на вход...');
  const loginResponse = await makeRequest(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify(loginData)
  });
  
  console.log('📥 Ответ на вход:', {
    status: loginResponse.status,
    ok: loginResponse.ok,
    hasToken: loginResponse.data?.token ? 'да' : 'нет'
  });
  
  if (!loginResponse.ok) {
    console.log('⚠️ Вход не удался. Данные ответа:', loginResponse.data);
    
    // Попробуем создать тестового пользователя
    console.log('\n📝 Попытка создания тестового пользователя...');
    const registerResponse = await makeRequest(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      })
    });
    
    console.log('📥 Ответ на регистрацию:', {
      status: registerResponse.status,
      ok: registerResponse.ok
    });
    
    if (registerResponse.ok) {
      console.log('✅ Пользователь создан, повторная попытка входа...');
      const retryLogin = await makeRequest(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        body: JSON.stringify(loginData)
      });
      
      if (retryLogin.ok && retryLogin.data?.token) {
        console.log('✅ Вход успешен после регистрации');
        await testAuthenticatedRequests(baseUrl, retryLogin.data.token);
      } else {
        console.log('❌ Вход не удался даже после регистрации');
      }
    }
    return;
  }
  
  if (loginResponse.data?.token) {
    console.log('✅ Получен токен авторизации');
    await testAuthenticatedRequests(baseUrl, loginResponse.data.token);
  } else {
    console.log('❌ Токен не получен');
  }
}

// Тестирование авторизованных запросов
async function testAuthenticatedRequests(baseUrl, token) {
  console.log('\n3. 🔒 Тестирование авторизованных запросов...');
  
  const authHeaders = {
    'Authorization': `Bearer ${token}`
  };
  
  // Тест 1: Проверка профиля пользователя
  console.log('\n📋 Тест 1: Получение профиля пользователя');
  const profileResponse = await makeRequest(`${baseUrl}/api/auth/me`, {
    headers: authHeaders
  });
  
  console.log('📥 Ответ профиля:', {
    status: profileResponse.status,
    ok: profileResponse.ok,
    hasUser: profileResponse.data?.user ? 'да' : 'нет'
  });
  
  // Тест 2: Получение проектов
  console.log('\n📋 Тест 2: Получение списка проектов');
  const projectsResponse = await makeRequest(`${baseUrl}/api/projects`, {
    headers: authHeaders
  });
  
  console.log('📥 Ответ проектов:', {
    status: projectsResponse.status,
    ok: projectsResponse.ok,
    projectsCount: Array.isArray(projectsResponse.data) ? projectsResponse.data.length : 'неизвестно'
  });
  
  // Тест 3: Получение пользователей
  console.log('\n📋 Тест 3: Получение списка пользователей');
  const usersResponse = await makeRequest(`${baseUrl}/api/users`, {
    headers: authHeaders
  });
  
  console.log('📥 Ответ пользователей:', {
    status: usersResponse.status,
    ok: usersResponse.ok,
    usersCount: Array.isArray(usersResponse.data) ? usersResponse.data.length : 'неизвестно'
  });
  
  // Тест 4: Получение досок (если есть проекты)
  if (projectsResponse.ok && Array.isArray(projectsResponse.data) && projectsResponse.data.length > 0) {
    const firstProject = projectsResponse.data[0];
    console.log(`\n📋 Тест 4: Получение досок проекта ${firstProject.id}`);
    
    const boardsResponse = await makeRequest(`${baseUrl}/api/projects/${firstProject.id}/boards`, {
      headers: authHeaders
    });
    
    console.log('📥 Ответ досок:', {
      status: boardsResponse.status,
      ok: boardsResponse.ok,
      boardsCount: Array.isArray(boardsResponse.data) ? boardsResponse.data.length : 'неизвестно'
    });
  }
  
  // Анализ результатов
  console.log('\n📊 Анализ результатов тестирования:');
  
  const tests = [
    { name: 'Профиль пользователя', result: profileResponse.ok },
    { name: 'Список проектов', result: projectsResponse.ok },
    { name: 'Список пользователей', result: usersResponse.ok }
  ];
  
  const passedTests = tests.filter(t => t.result).length;
  const totalTests = tests.length;
  
  console.log(`✅ Пройдено тестов: ${passedTests}/${totalTests}`);
  
  tests.forEach(test => {
    console.log(`${test.result ? '✅' : '❌'} ${test.name}`);
  });
  
  if (passedTests === totalTests) {
    console.log('\n🎉 Все тесты пройдены! Система сессий работает корректно.');
  } else {
    console.log('\n⚠️ Некоторые тесты не пройдены. Проверьте логи сервера для диагностики.');
  }
}

// Запуск тестирования
testSessionSystem().catch(error => {
  console.error('❌ Ошибка при тестировании:', error);
});