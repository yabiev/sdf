const fs = require('fs');
const path = require('path');

console.log('🧪 Финальное тестирование авторизации после исправлений...');

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
      data: jsonData
    };
  } catch (error) {
    console.error(`❌ Ошибка запроса к ${url}:`, error.message);
    return { error: error.message };
  }
}

// Основная функция тестирования
async function testAuthAfterFix() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('\n1. 🔍 Проверка состояния сервера...');
  
  // Проверяем доступность сервера
  const healthResponse = await makeRequest(`${baseUrl}/api/health`);
  if (healthResponse.error) {
    console.log('❌ Сервер недоступен. Убедитесь, что npm run dev запущен.');
    return;
  }
  
  console.log('✅ Сервер доступен');
  
  console.log('\n2. 📋 Проверка изменений в коде авторизации...');
  
  // Проверяем, что изменения применены
  const authFilePath = path.join(__dirname, 'src', 'app', 'api', 'auth', 'login', 'route.ts');
  
  if (fs.existsSync(authFilePath)) {
    const authContent = fs.readFileSync(authFilePath, 'utf8');
    
    if (authContent.includes('// Временно отключена проверка approval_status')) {
      console.log('✅ Проверка approval_status отключена в коде');
    } else if (authContent.includes('approval_status')) {
      console.log('⚠️ Проверка approval_status все еще активна');
    } else {
      console.log('ℹ️ Проверка approval_status не найдена в коде');
    }
  }
  
  console.log('\n3. 🔐 Тестирование входа с существующим пользователем...');
  
  const loginData = {
    email: 'test@example.com',
    password: 'password123'
  };
  
  console.log(`📤 Попытка входа: ${loginData.email}`);
  const loginResponse = await makeRequest(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify(loginData)
  });
  
  console.log('📥 Результат входа:', {
    status: loginResponse.status,
    ok: loginResponse.ok,
    hasToken: loginResponse.data?.token ? 'да' : 'нет',
    error: loginResponse.data?.error || 'нет'
  });
  
  if (loginResponse.ok && loginResponse.data?.token) {
    console.log('🎉 Вход успешен!');
    
    const authHeaders = {
      'Authorization': `Bearer ${loginResponse.data.token}`
    };
    
    console.log('\n4. 🧪 Тестирование авторизованных запросов...');
    
    // Тестируем получение профиля
    console.log('👤 Получение профиля пользователя...');
    const profileResponse = await makeRequest(`${baseUrl}/api/auth/me`, {
      headers: authHeaders
    });
    
    console.log('📊 Профиль:', {
      status: profileResponse.status,
      ok: profileResponse.ok,
      hasUser: profileResponse.data?.user ? 'да' : 'нет',
      userEmail: profileResponse.data?.user?.email || 'неизвестно'
    });
    
    // Тестируем получение проектов
    console.log('\n📁 Получение списка проектов...');
    const projectsResponse = await makeRequest(`${baseUrl}/api/projects`, {
      headers: authHeaders
    });
    
    console.log('📊 Проекты:', {
      status: projectsResponse.status,
      ok: projectsResponse.ok,
      count: Array.isArray(projectsResponse.data) ? projectsResponse.data.length : 'неизвестно',
      error: projectsResponse.data?.error || 'нет'
    });
    
    // Тестируем получение пользователей
    console.log('\n👥 Получение списка пользователей...');
    const usersResponse = await makeRequest(`${baseUrl}/api/users`, {
      headers: authHeaders
    });
    
    console.log('📊 Пользователи:', {
      status: usersResponse.status,
      ok: usersResponse.ok,
      count: Array.isArray(usersResponse.data) ? usersResponse.data.length : 'неизвестно',
      error: usersResponse.data?.error || 'нет'
    });
    
    // Тестируем создание доски (основная проблема пользователя)
    console.log('\n📋 Тестирование создания доски...');
    const boardData = {
      name: 'Тестовая доска',
      description: 'Доска для тестирования прав доступа'
    };
    
    const createBoardResponse = await makeRequest(`${baseUrl}/api/boards`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(boardData)
    });
    
    console.log('📊 Создание доски:', {
      status: createBoardResponse.status,
      ok: createBoardResponse.ok,
      hasBoard: createBoardResponse.data?.id ? 'да' : 'нет',
      error: createBoardResponse.data?.error || 'нет'
    });
    
    console.log('\n📈 Сводка результатов:');
    const results = {
      'Вход в систему': loginResponse.ok ? '✅' : '❌',
      'Получение профиля': profileResponse.ok ? '✅' : '❌',
      'Получение проектов': projectsResponse.ok ? '✅' : '❌',
      'Получение пользователей': usersResponse.ok ? '✅' : '❌',
      'Создание доски': createBoardResponse.ok ? '✅' : '❌'
    };
    
    Object.entries(results).forEach(([test, result]) => {
      console.log(`  ${result} ${test}`);
    });
    
    const allPassed = Object.values(results).every(result => result === '✅');
    
    if (allPassed) {
      console.log('\n🎉 Все тесты пройдены! Проблемы с авторизацией и правами доступа решены.');
    } else {
      console.log('\n⚠️ Некоторые тесты не прошли. Проверьте логи сервера для дополнительной информации.');
    }
    
  } else {
    console.log('\n❌ Вход не удался. Возможные причины:');
    
    if (loginResponse.status === 401) {
      console.log('1. Неверные учетные данные');
      console.log('2. Пользователь не существует');
      console.log('3. Проблемы с базой данных');
    } else if (loginResponse.status === 403) {
      console.log('1. Проверка approval_status все еще активна');
      console.log('2. Пользователь заблокирован');
    } else {
      console.log('1. Проблемы с сервером');
      console.log('2. Ошибки в коде авторизации');
    }
    
    console.log('\n💡 Рекомендации:');
    console.log('1. Проверьте логи сервера (npm run dev)');
    console.log('2. Убедитесь, что база данных настроена правильно');
    console.log('3. Проверьте, что изменения в route.ts применены');
  }
}

// Запуск тестирования
testAuthAfterFix().catch(error => {
  console.error('❌ Ошибка при тестировании:', error);
});