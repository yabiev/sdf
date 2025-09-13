// Тест для проверки сохранения проектов в базе данных
// Using built-in fetch from Node.js 18+

// Конфигурация
const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'admin@encore-tasks.com',
  password: 'admin123'
};

async function testProjectPersistence() {
  console.log('🧪 Тестирование сохранения проектов...');
  
  try {
    // 1. Авторизация
    console.log('\n1. Авторизация...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_USER)
    });
    
    const loginData = await loginResponse.json();
    console.log('Результат авторизации:', loginData.message);
    console.log('Данные пользователя:', loginData.data?.user);
    
    if (!loginData.token) {
      throw new Error('Не удалось получить токен авторизации');
    }
    
    const token = loginData.token;
    const userId = loginData.data?.user?.id;
    console.log('User ID:', userId, 'Type:', typeof userId);
    
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    // 2. Получение списка проектов ДО создания
    console.log('\n2. Получение списка проектов ДО создания...');
    const projectsBeforeResponse = await fetch(`${BASE_URL}/api/projects`, {
      headers: authHeaders
    });
    const projectsBeforeData = await projectsBeforeResponse.json();
    console.log('Проекты ДО создания:', projectsBeforeData.projects?.length || 0);
    
    // 3. Создание тестового проекта
    console.log('\n3. Создание тестового проекта...');
    const testProjectName = `Тест проект ${Date.now()}`;
    const createResponse = await fetch(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: testProjectName,
        color: '#ff6b6b'
      })
    });
    
    const createData = await createResponse.json();
    console.log('Результат создания:', createData);
    
    if (!createData.success) {
      throw new Error('Не удалось создать проект');
    }
    
    const createdProjectId = createData.data.id;
    console.log('ID созданного проекта:', createdProjectId);
    
    // 4. Получение списка проектов ПОСЛЕ создания
    console.log('\n4. Получение списка проектов ПОСЛЕ создания...');
    const projectsAfterResponse = await fetch(`${BASE_URL}/api/projects`, {
      headers: authHeaders
    });
    const projectsAfterData = await projectsAfterResponse.json();
    console.log('Проекты ПОСЛЕ создания:', projectsAfterData.projects?.length || 0);
    
    // 5. Проверка, что созданный проект есть в списке
    const createdProject = projectsAfterData.projects?.find(p => p.id === createdProjectId);
    if (createdProject) {
      console.log('✅ Созданный проект найден в списке:', createdProject.name);
    } else {
      console.log('❌ Созданный проект НЕ найден в списке!');
    }
    
    // 6. Симуляция "перезагрузки" - повторный запрос списка проектов
    console.log('\n5. Симуляция перезагрузки - повторный запрос списка...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Пауза 1 сек
    
    const projectsReloadResponse = await fetch(`${BASE_URL}/api/projects`, {
      headers: authHeaders
    });
    const projectsReloadData = await projectsReloadResponse.json();
    console.log('Проекты после "перезагрузки":', projectsReloadData.projects?.length || 0);
    
    // 7. Проверка, что проект все еще существует
    const persistedProject = projectsReloadData.projects?.find(p => p.id === createdProjectId);
    if (persistedProject) {
      console.log('✅ Проект сохранился после перезагрузки:', persistedProject.name);
      console.log('   - ID:', persistedProject.id);
      console.log('   - Название:', persistedProject.name);
      console.log('   - Цвет:', persistedProject.color);
      console.log('   - Создан:', persistedProject.created_at);
      console.log('   - Автор:', persistedProject.created_by);
    } else {
      console.log('❌ Проект НЕ сохранился после перезагрузки!');
    }
    
    console.log('\n🎯 Тест завершен');
    
  } catch (error) {
    console.error('❌ Ошибка в тесте:', error.message);
  }
}

// Запуск теста
testProjectPersistence();