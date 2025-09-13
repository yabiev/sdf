// Тест авторизации и создания проектов
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testLoginAndCreateProject() {
  try {
    console.log('🔐 Тестирование авторизации...');
    
    // 1. Получаем CSRF токен
    console.log('📋 Получение CSRF токена...');
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const csrfData = await csrfResponse.json();
    console.log('🔑 CSRF токен:', csrfData.csrfToken);
    
    if (!csrfData.csrfToken) {
      console.error('❌ Не удалось получить CSRF токен');
      return;
    }
    
    // 2. Авторизация
    console.log('🚪 Попытка входа...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfData.csrfToken
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'test123'
      })
    });
    
    console.log('📊 Статус авторизации:', loginResponse.status);
    
    if (loginResponse.status === 200) {
      const loginData = await loginResponse.json();
      console.log('✅ Авторизация успешна!');
      console.log('👤 Данные пользователя:', loginData.user);
      
      // Получаем cookies для последующих запросов
      const cookies = loginResponse.headers.get('set-cookie');
      console.log('🍪 Cookies:', cookies);
      
      // 3. Тестируем создание проекта
      console.log('\n📁 Тестирование создания проекта...');
      
      const projectData = {
        name: 'Тестовый проект ' + Date.now(),
        description: 'Описание тестового проекта',
        color: '#3B82F6'
      };
      
      console.log('📋 Данные проекта:', projectData);
      
      const createProjectResponse = await fetch(`${BASE_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfData.csrfToken,
          'Cookie': cookies || ''
        },
        body: JSON.stringify(projectData)
      });
      
      console.log('📊 Статус создания проекта:', createProjectResponse.status);
      
      if (createProjectResponse.status === 200 || createProjectResponse.status === 201) {
        const projectResult = await createProjectResponse.json();
        console.log('✅ Проект успешно создан!');
        console.log('📁 Созданный проект:', projectResult);
        
        // 4. Проверяем список проектов
        console.log('\n📋 Получение списка проектов...');
        const projectsResponse = await fetch(`${BASE_URL}/api/projects`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookies || ''
          }
        });
        
        if (projectsResponse.status === 200) {
          const projects = await projectsResponse.json();
          console.log('📋 Список проектов:', projects);
          console.log(`✅ Всего проектов: ${projects.length}`);
        } else {
          console.error('❌ Ошибка при получении списка проектов:', projectsResponse.status);
        }
        
      } else {
        const errorText = await createProjectResponse.text();
        console.error('❌ Ошибка при создании проекта:', errorText);
      }
      
    } else {
      const errorText = await loginResponse.text();
      console.error('❌ Ошибка авторизации:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error.message);
  }
}

testLoginAndCreateProject();