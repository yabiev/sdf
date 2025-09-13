// Используем встроенный fetch в Node.js 22+
// Простая реализация для сохранения cookies
let cookies = '';

const fetchWithCookies = async (url, options = {}) => {
  const headers = { ...options.headers };
  
  // Добавляем сохраненные cookies
  if (cookies) {
    headers['Cookie'] = cookies;
  }
  
  const response = await fetch(url, { ...options, headers });
  
  // Сохраняем новые cookies
  const setCookieHeader = response.headers.get('set-cookie');
  if (setCookieHeader) {
    cookies = setCookieHeader;
  }
  
  return response;
};

const BASE_URL = 'http://localhost:3000';

async function testProjectCreationInBrowser() {
  console.log('🧪 Тестирование создания проекта в браузере...');
  
  try {
    // 1. Проверяем доступность главной страницы
    console.log('\n1. Проверяем доступность главной страницы...');
    const homeResponse = await fetchWithCookies(`${BASE_URL}/`);
    console.log('Статус главной страницы:', homeResponse.status);
    
    if (!homeResponse.ok) {
      throw new Error(`Главная страница недоступна: ${homeResponse.status}`);
    }
    
    // Получаем HTML для поиска CSRF токена
    const homeHtml = await homeResponse.text();
    console.log('HTML получен, размер:', homeHtml.length);
    
    // 2. Ищем CSRF токен в HTML
    console.log('\n2. Поиск CSRF токена...');
    const csrfMatch = homeHtml.match(/name="csrf-token"\s+content="([^"]+)"/i) || 
                     homeHtml.match(/"csrfToken"\s*:\s*"([^"]+)"/i);
    
    let csrfToken = null;
    if (csrfMatch) {
      csrfToken = csrfMatch[1];
      console.log('CSRF токен найден:', csrfToken.substring(0, 20) + '...');
    } else {
      console.log('CSRF токен не найден в HTML');
    }
    
    // 3. Проверяем cookies
    console.log('\n3. Проверяем cookies...');
    console.log('Сохраненные cookies:', cookies || 'нет cookies');
    
    // 4. Пытаемся получить CSRF токен через API
    console.log('\n4. Получение CSRF токена через API...');
    try {
      const csrfResponse = await fetchWithCookies(`${BASE_URL}/api/csrf`);
      if (csrfResponse.ok) {
        const csrfData = await csrfResponse.json();
        console.log('CSRF токен через API:', csrfData);
        if (csrfData.csrfToken) {
          csrfToken = csrfData.csrfToken;
        }
      } else {
        console.log('API CSRF недоступен:', csrfResponse.status);
      }
    } catch (error) {
      console.log('Ошибка получения CSRF через API:', error.message);
    }
    
    // 5. Проверяем аутентификацию
    console.log('\n5. Проверяем аутентификацию...');
    const authResponse = await fetchWithCookies(`${BASE_URL}/api/auth/me`);
    console.log('Статус аутентификации:', authResponse.status);
    
    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log('Пользователь аутентифицирован:', authData.user?.email || 'неизвестно');
    } else {
      console.log('Пользователь не аутентифицирован');
      
      // Пытаемся войти как admin
      console.log('\n5.1. Попытка входа как admin...');
      const loginData = {
        email: 'admin@example.com',
        password: 'admin123'
      };
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
      
      const loginResponse = await fetchWithCookies(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers,
        body: JSON.stringify(loginData)
      });
      
      console.log('Статус входа:', loginResponse.status);
      
      if (loginResponse.ok) {
        const loginResult = await loginResponse.json();
        console.log('Вход успешен:', loginResult);
      } else {
        const loginError = await loginResponse.text();
        console.log('Ошибка входа:', loginError);
      }
    }
    
    // 6. Создаем проект
    console.log('\n6. Создание проекта...');
    const projectData = {
      name: 'Тестовый проект браузер',
      description: 'Проект для тестирования создания через браузер',
      color: '#3B82F6',
      icon: 'folder',
      members: [],
      telegram_chat_id: null,
      telegram_topic_id: null
    };
    
    const projectHeaders = {
      'Content-Type': 'application/json'
    };
    
    if (csrfToken) {
      projectHeaders['X-CSRF-Token'] = csrfToken;
    }
    
    console.log('Данные проекта:', JSON.stringify(projectData, null, 2));
    console.log('Заголовки запроса:', JSON.stringify(projectHeaders, null, 2));
    
    const projectResponse = await fetchWithCookies(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: projectHeaders,
      body: JSON.stringify(projectData)
    });
    
    console.log('Статус создания проекта:', projectResponse.status);
    console.log('Заголовки ответа:', Object.fromEntries(projectResponse.headers.entries()));
    
    if (projectResponse.ok) {
      const projectResult = await projectResponse.json();
      console.log('✅ Проект создан успешно:', projectResult);
    } else {
      const errorText = await projectResponse.text();
      console.log('❌ Ошибка создания проекта:', errorText);
      
      // Пытаемся парсить как JSON
      try {
        const errorJson = JSON.parse(errorText);
        console.log('Детали ошибки:', errorJson);
      } catch (e) {
        console.log('Ошибка не в формате JSON');
      }
    }
    
    // 7. Проверяем финальное состояние cookies
    console.log('\n7. Финальное состояние cookies...');
    console.log('Финальные cookies:', cookies || 'нет cookies');
    
  } catch (error) {
    console.error('❌ Критическая ошибка тестирования:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Запускаем тест
testProjectCreationInBrowser().then(() => {
  console.log('\n🏁 Тестирование завершено');
}).catch(error => {
  console.error('❌ Фатальная ошибка:', error);
  process.exit(1);
});