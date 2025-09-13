const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTczNzQ2NzI2MH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

async function testProjectCreation() {
  try {
    console.log('🚀 Тестирование создания проекта через локальный API...');
    
    const projectData = {
      name: 'Тестовый проект после миграции',
      description: 'Проект для проверки работы базы данных после добавления колонок',
      color: '#3B82F6',
      telegramChatId: null,
      telegramTopicId: null,
      memberIds: []
    };
    
    console.log('📤 Отправляем данные:', JSON.stringify(projectData, null, 2));
    
    const response = await fetch(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify(projectData)
    });
    
    console.log(`📊 Статус ответа: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Проект успешно создан!');
      console.log('📋 Результат:', JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Ошибка при создании проекта:');
      console.log('📋 Ответ сервера:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

testProjectCreation();