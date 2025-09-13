const BASE_URL = 'http://localhost:3000';

async function testProjectCreation() {
  console.log('🧪 Тестирование создания проекта...');
  
  try {
    // Сначала проверим CSRF токен
    console.log('\n1. Получение CSRF токена...');
    const csrfResponse = await fetch(`${BASE_URL}/api/csrf`, {
      credentials: 'include'
    });
    
    console.log('CSRF Response status:', csrfResponse.status);
    const csrfData = await csrfResponse.json();
    console.log('CSRF Data:', csrfData);
    
    // Теперь попробуем создать проект
    console.log('\n2. Создание проекта...');
    const projectData = {
      name: 'Test Project ' + Date.now(),
      description: 'Тестовый проект для отладки',
      color: '#6366f1'
    };
    
    console.log('Отправляемые данные:', projectData);
    
    const headers = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };
    
    if (csrfData.csrfToken) {
      headers['X-CSRF-Token'] = csrfData.csrfToken;
    }
    
    const response = await fetch(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(projectData)
    });
    
    console.log('\n3. Результат создания проекта:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const responseData = await response.json();
    console.log('Response Data:', JSON.stringify(responseData, null, 2));
    
    if (response.ok) {
      console.log('✅ Проект создан успешно!');
      
      // Проверим, что проект появился в списке
      console.log('\n4. Проверка списка проектов...');
      const projectsResponse = await fetch(`${BASE_URL}/api/projects`, {
        credentials: 'include',
        headers: {
          'Authorization': headers['Authorization'] || ''
        }
      });
      
      const projectsData = await projectsResponse.json();
      console.log('Projects list:', JSON.stringify(projectsData, null, 2));
      
    } else {
      console.log('❌ Ошибка при создании проекта');
    }
    
  } catch (error) {
    console.error('💥 Ошибка:', error);
  }
}

// Запускаем тест
testProjectCreation();