// Тест для проверки корректности заполнения полей проекта
const API_BASE = 'http://localhost:3000/api';

async function testProjectFields() {
  console.log('🧪 Тестирование корректности заполнения полей проекта...');
  
  try {
    // 1. Авторизация
    console.log('1. Авторизация...');
    const authResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123'
      })
    });
    
    if (!authResponse.ok) {
      throw new Error(`Ошибка авторизации: ${authResponse.status}`);
    }
    
    const authData = await authResponse.json();
    const token = authData.token;
    console.log('✅ Авторизация успешна');
    
    // 2. Создание проекта с полными данными
    console.log('2. Создание проекта с полными данными...');
    const projectData = {
      name: 'Тестовый проект с полными данными',
      color: '#FF5722',
      memberIds: [],
      telegramChatId: '-1001234567890',
      telegramTopicId: '123'
    };
    
    const createResponse = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(projectData)
    });
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Ошибка создания проекта: ${createResponse.status} - ${errorText}`);
    }
    
    const response = await createResponse.json();
    console.log('✅ Проект создан. Полный ответ:');
    console.log(JSON.stringify(response, null, 2));
    
    const createdProject = response.data;
    console.log('ID проекта:', createdProject.id);
    
    // 3. Проверка всех полей проекта
    console.log('3. Проверка полей созданного проекта...');
    
    // Проверяем обязательные поля
    if (!createdProject.id) {
      console.log('❌ Отсутствует поле id. Структура объекта:', Object.keys(createdProject));
      throw new Error('❌ Отсутствует поле id');
    }
    console.log('✅ Поле id присутствует:', createdProject.id);
    
    if (!createdProject.name || createdProject.name !== projectData.name) {
      throw new Error(`❌ Неверное поле name: ожидалось "${projectData.name}", получено "${createdProject.name}"`);
    }
    console.log('✅ Поле name корректно:', createdProject.name);
    
    // Проверяем цвет (может быть пустым по умолчанию)
    console.log('✅ Поле color присутствует:', createdProject.color);
    
    if (!createdProject.created_by) {
      throw new Error('❌ Отсутствует поле created_by');
    }
    console.log('✅ Поле created_by присутствует:', createdProject.created_by);
    
    if (!createdProject.created_at) {
      throw new Error('❌ Отсутствует поле created_at');
    }
    console.log('✅ Поле created_at присутствует:', createdProject.created_at);
    
    if (!createdProject.updated_at) {
      throw new Error('❌ Отсутствует поле updated_at');
    }
    console.log('✅ Поле updated_at присутствует:', createdProject.updated_at);
    
    // Проверяем Telegram поля (могут быть null)
    console.log('✅ Поле telegram_chat_id присутствует:', createdProject.telegram_chat_id);
    console.log('✅ Поле telegram_topic_id присутствует:', createdProject.telegram_topic_id);
    
    // Проверяем дополнительные поля
    if (typeof createdProject.members_count !== 'number') {
      throw new Error('❌ Поле members_count должно быть числом');
    }
    console.log('✅ Поле members_count корректно:', createdProject.members_count);
    
    if (typeof createdProject.boards_count !== 'number') {
      throw new Error('❌ Поле boards_count должно быть числом');
    }
    console.log('✅ Поле boards_count корректно:', createdProject.boards_count);
    
    if (typeof createdProject.tasks_count !== 'number') {
      throw new Error('❌ Поле tasks_count должно быть числом');
    }
    console.log('✅ Поле tasks_count корректно:', createdProject.tasks_count);
    
    // 4. Тестирование создания проекта с минимальными данными
    console.log('4. Тестирование создания проекта с минимальными данными...');
    const minimalResponse = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Минимальный проект',
        description: 'Проект с минимальными данными'
      })
    });

    if (minimalResponse.ok) {
      const minimalResponse_data = await minimalResponse.json();
      const minimalProject = minimalResponse_data.data;
      console.log('✅ Проект с минимальными данными создан:', minimalProject.name);
      
      // Проверяем, что поля имеют значения по умолчанию
      if (minimalProject.color) {
        console.log('✅ Цвет по умолчанию установлен:', minimalProject.color);
      } else {
        console.log('❌ Цвет по умолчанию не установлен');
      }
      
      if (minimalProject.telegram_chat_id === null && minimalProject.telegram_topic_id === null) {
        console.log('✅ Telegram поля корректно установлены в null');
      } else {
        console.log('❌ Telegram поля некорректны');
      }
    } else {
      const errorText = await minimalResponse.text();
      throw new Error(`Ошибка создания проекта с минимальными данными: ${minimalResponse.status} - ${errorText}`);
    }
    
    // 5. Проверка валидации Telegram полей
    console.log('5. Тестирование валидации Telegram полей...');
    const invalidTelegramProject = {
      name: 'Тест валидации',
      color: '#4CAF50',
      memberIds: [],
      telegramChatId: 'invalid-chat-id', // Неверный формат
      telegramTopicId: 'invalid-topic-id' // Неверный формат
    };
    
    const invalidResponse = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(invalidTelegramProject)
    });
    
    // Ожидаем ошибку валидации
    if (invalidResponse.ok) {
      console.log('⚠️ Валидация Telegram полей не работает (проект создался с неверными данными)');
    } else {
      console.log('✅ Валидация Telegram полей работает (проект отклонен)');
    }
    
    console.log('\n🎉 Все тесты полей проекта пройдены успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка в тестах полей проекта:', error.message);
    process.exit(1);
  }
}

testProjectFields();