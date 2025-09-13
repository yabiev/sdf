// Используем встроенный fetch в Node.js 18+

async function testGetTasks() {
  try {
    console.log('🔍 Тестирование GET /api/tasks...');
    
    // Сначала авторизуемся
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('✅ Авторизация:', loginData.success ? 'успешна' : 'неудачна');
    
    if (!loginData.success) {
      console.error('❌ Не удалось авторизоваться');
      return;
    }
    
    const token = loginData.token;
    
    // Теперь тестируем GET /api/tasks
    const tasksResponse = await fetch('http://localhost:3000/api/tasks?project_id=2618ddd2-9d41-4041-94e8-93ed27c6ef85', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Статус ответа GET /api/tasks:', tasksResponse.status);
    console.log('📊 Headers:', Object.fromEntries(tasksResponse.headers.entries()));
    
    const responseText = await tasksResponse.text();
    console.log('📊 Ответ (текст):', responseText);
    
    try {
      const tasksData = JSON.parse(responseText);
      console.log('📊 Ответ (JSON):', tasksData);
    } catch (e) {
      console.log('❌ Не удалось распарсить JSON:', e.message);
    }
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  }
}

testGetTasks