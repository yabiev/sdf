const fetch = require('node-fetch');

async function testColumnCreation() {
  console.log('🧪 Тестирование создания колонки');
  
  try {
    // 1. Логин
    console.log('1. Аутентификация...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${await loginResponse.text()}`);
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Аутентификация успешна');
    
    // 2. Получение проектов
    console.log('2. Получение проектов...');
    const projectsResponse = await fetch('http://localhost:3000/api/projects', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!projectsResponse.ok) {
      throw new Error(`Get projects failed: ${projectsResponse.status} ${await projectsResponse.text()}`);
    }
    
    const projectsData = await projectsResponse.json();
    console.log('✅ Проекты получены:', projectsData.projects?.length || 0);
    
    if (!projectsData.projects || projectsData.projects.length === 0) {
      console.log('❌ Нет доступных проектов');
      return;
    }
    
    const project = projectsData.projects[0];
    console.log('📁 Используем проект:', project.name);
    
    // 3. Получение досок проекта
    console.log('3. Получение досок...');
    const boardsResponse = await fetch(`http://localhost:3000/api/boards?project_id=${project.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!boardsResponse.ok) {
      throw new Error(`Get boards failed: ${boardsResponse.status} ${await boardsResponse.text()}`);
    }
    
    const boardsData = await boardsResponse.json();
    console.log('✅ Доски получены:', boardsData.boards?.length || 0);
    
    if (!boardsData.boards || boardsData.boards.length === 0) {
      console.log('❌ Нет доступных досок');
      return;
    }
    
    const board = boardsData.boards[0];
    console.log('📋 Используем доску:', board.name);
    
    // 4. Создание колонки
    console.log('4. Создание колонки...');
    const columnData = {
      title: 'Test Column ' + Date.now(),
      board_id: board.id,
      position: 0
    };
    
    console.log('📝 Данные колонки:', JSON.stringify(columnData, null, 2));
    
    const createColumnResponse = await fetch('http://localhost:3000/api/columns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(columnData)
    });
    
    console.log('📊 Статус ответа:', createColumnResponse.status);
    const responseText = await createColumnResponse.text();
    console.log('📄 Ответ сервера:', responseText);
    
    if (!createColumnResponse.ok) {
      throw new Error(`Create column failed: ${createColumnResponse.status} ${responseText}`);
    }
    
    const columnResult = JSON.parse(responseText);
    console.log('✅ Колонка создана успешно:', columnResult.column?.title);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error('Stack:', error.stack);
  }
}

testColumnCreation();