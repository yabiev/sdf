const axios = require('axios');

// Тест создания проекта через UI
async function testProjectCreationUI() {
  const API_BASE_URL = 'http://localhost:3000/api';
  
  try {
    console.log('🔐 Авторизация...');
    const authResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = authResponse.data.token;
    console.log('✅ Авторизация успешна');
    
    // Получаем список проектов до создания
    console.log('📋 Получение списка проектов до создания...');
    const projectsBeforeResponse = await axios.get(`${API_BASE_URL}/projects`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const projectsCountBefore = projectsBeforeResponse.data.data?.projects?.length || 0;
    console.log(`📊 Количество проектов до создания: ${projectsCountBefore}`);
    
    // Создаем новый проект
    const projectName = `Тестовый проект UI ${Date.now()}`;
    console.log(`🚀 Создание проекта: ${projectName}`);
    
    const createResponse = await axios.post(`${API_BASE_URL}/projects`, {
      name: projectName,
      description: 'Тестовый проект для проверки UI',
      color: '#3b82f6',
      isPrivate: false
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Проект создан:', createResponse.data);
    const createdProject = createResponse.data.data;
    
    // Проверяем, что проект появился в списке
    console.log('🔍 Проверка обновленного списка проектов...');
    const projectsAfterResponse = await axios.get(`${API_BASE_URL}/projects`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const projectsCountAfter = projectsAfterResponse.data.data?.projects?.length || 0;
    console.log(`📊 Количество проектов после создания: ${projectsCountAfter}`);
    
    if (projectsCountAfter > projectsCountBefore) {
      console.log('✅ Тест пройден: проект успешно создан и появился в списке');
      
      // Проверяем структуру созданного проекта
      console.log('🔍 Проверка структуры проекта:');
      console.log('- ID:', createdProject.id);
      console.log('- Название:', createdProject.name);
      console.log('- Описание:', createdProject.description);
      console.log('- Цвет:', createdProject.color);
      console.log('- Приватный:', createdProject.isPrivate);
      console.log('- Создатель:', createdProject.createdBy);
      console.log('- Участники:', createdProject.members?.length || 0);
      console.log('- Доски:', createdProject.boards?.length || 0);
      
      return true;
    } else {
      console.error('❌ Тест не пройден: проект не появился в списке');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
    if (error.response) {
      console.error('Ответ сервера:', error.response.data);
    }
    return false;
  }
}

testProjectCreationUI();