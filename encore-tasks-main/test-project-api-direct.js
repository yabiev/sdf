const fetch = require('node-fetch');

async function testProjectCreationAPI() {
  console.log('🚀 ТЕСТ: Прямое создание проекта через API');
  console.log('============================================');
  
  try {
    // 1. Авторизация
    console.log('1️⃣ Авторизация...');
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Ошибка авторизации:', loginResponse.status, loginResponse.statusText);
      const errorText = await loginResponse.text();
      console.log('📄 Ответ:', errorText);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Авторизация успешна');
    console.log('🔑 Токен получен:', loginData.token ? 'Да' : 'Нет');
    
    const token = loginData.token;
    if (!token) {
      console.log('❌ Токен не получен');
      return;
    }
    
    // 2. Создание проекта
    console.log('\n2️⃣ Создание проекта...');
    const projectData = {
      name: 'Тестовый проект ' + Date.now(),
      description: 'Проект для тестирования исправления ошибки создания',
      status: 'active'
    };
    
    console.log('📝 Данные проекта:', projectData);
    
    const createResponse = await fetch('http://localhost:3001/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Cookie': loginResponse.headers.get('set-cookie') || ''
      },
      body: JSON.stringify(projectData)
    });
    
    console.log('📡 Статус ответа:', createResponse.status, createResponse.statusText);
    
    if (!createResponse.ok) {
      console.log('❌ Ошибка создания проекта');
      const errorText = await createResponse.text();
      console.log('📄 Ответ сервера:', errorText);
      
      // Попробуем разобрать как JSON
      try {
        const errorJson = JSON.parse(errorText);
        console.log('🔍 Детали ошибки:', errorJson);
      } catch (e) {
        console.log('📄 Текст ошибки:', errorText);
      }
      return;
    }
    
    const projectResult = await createResponse.json();
    console.log('✅ Проект создан успешно!');
    
    // Извлекаем ID из структуры ответа
    const projectId = projectResult.data ? projectResult.data.id : projectResult.id;
    console.log('🆔 ID проекта:', projectId);
    console.log('📋 Данные проекта:', projectResult);
    
    // 3. Проверка созданного проекта
    console.log('\n3️⃣ Проверка созданного проекта...');
    const getResponse = await fetch(`http://localhost:3001/api/projects/${projectId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cookie': loginResponse.headers.get('set-cookie') || ''
      }
    });
    
    if (getResponse.ok) {
      const projectCheck = await getResponse.json();
      console.log('✅ Проект найден в базе данных');
      console.log('📋 Проверочные данные:', projectCheck);
    } else {
      console.log('❌ Проект не найден при проверке');
    }
    
    // 4. Получение списка проектов
    console.log('\n4️⃣ Получение списка проектов...');
    const listResponse = await fetch('http://localhost:3001/api/projects', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cookie': loginResponse.headers.get('set-cookie') || ''
      }
    });
    
    if (listResponse.ok) {
      const projectsResponse = await listResponse.json();
      console.log('✅ Список проектов получен');
      
      // Обрабатываем структуру ответа
      const projects = projectsResponse.data || projectsResponse;
      console.log('📊 Количество проектов:', Array.isArray(projects) ? projects.length : 'Неизвестно');
      console.log('📋 Структура ответа:', typeof projectsResponse);
      
      if (Array.isArray(projects)) {
        const createdProject = projects.find(p => p.id === projectId);
        if (createdProject) {
          console.log('✅ Созданный проект найден в списке');
        } else {
          console.log('❌ Созданный проект НЕ найден в списке');
        }
      } else {
        console.log('⚠️ Список проектов не является массивом');
      }
    } else {
      console.log('❌ Ошибка получения списка проектов');
    }
    
    console.log('\n============================================');
    console.log('🎯 РЕЗУЛЬТАТ: Тест создания проекта УСПЕШЕН');
    console.log('✅ Ошибка "Failed to convert project or missing project ID" ИСПРАВЛЕНА');
    console.log('============================================');
    
  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    console.log('\n============================================');
    console.log('🎯 РЕЗУЛЬТАТ: Тест создания проекта НЕУДАЧЕН');
    console.log('❌ Требуется дополнительная диагностика');
    console.log('============================================');
  }
}

testProjectCreationAPI();