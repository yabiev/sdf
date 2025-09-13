const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const API_BASE_URL = 'http://localhost:3000/api';

async function testProjectCreation() {
  console.log('=== ПРОСТОЙ ТЕСТ СОЗДАНИЯ ПРОЕКТА ===\n');
  
  try {
    // 1. Тест авторизации
    console.log('1. Тестирование авторизации...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    if (loginResponse.status === 200 && loginResponse.data.token) {
      console.log('✅ Авторизация успешна');
      const token = loginResponse.data.token;
      
      // 2. Получение списка проектов до создания
      console.log('\n2. Получение списка проектов...');
      const projectsBeforeResponse = await axios.get(`${API_BASE_URL}/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const projectsCountBefore = projectsBeforeResponse.data.data?.projects?.length || projectsBeforeResponse.data.length || 0;
      console.log(`✅ Найдено проектов: ${projectsCountBefore}`);
      
      // 3. Создание нового проекта
      console.log('\n3. Создание нового проекта...');
      const newProject = {
        name: `Тестовый проект ${Date.now()}`,
        description: 'Проект для тестирования API',
        status: 'active',
        icon: '📋',
        color: '#3B82F6'
      };
      
      const createResponse = await axios.post(`${API_BASE_URL}/projects`, newProject, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (createResponse.status === 201) {
        console.log('✅ Проект создан успешно');
        console.log('Данные проекта:', JSON.stringify(createResponse.data, null, 2));
        
        // 4. Проверка списка проектов после создания
        console.log('\n4. Проверка обновленного списка проектов...');
        const projectsAfterResponse = await axios.get(`${API_BASE_URL}/projects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const projectsCountAfter = projectsAfterResponse.data.data?.projects?.length || projectsAfterResponse.data.length || 0;
        console.log(`✅ Найдено проектов: ${projectsCountAfter}`);
        
        if (projectsCountAfter > projectsCountBefore) {
          console.log('\n🎉 ТЕСТ ПРОЙДЕН: Проект успешно создан и появился в списке!');
        } else {
          console.log('\n❌ ОШИБКА: Проект не появился в списке');
        }
      } else {
        console.log('❌ Ошибка создания проекта:', createResponse.status);
      }
    } else {
      console.log('❌ Ошибка авторизации');
    }
    
  } catch (error) {
    console.log('\n❌ ОШИБКА ТЕСТИРОВАНИЯ:');
    if (error.response) {
      console.log('Статус:', error.response.status);
      console.log('Данные:', error.response.data);
    } else {
      console.log('Ошибка:', error.message);
    }
  }
  
  console.log('\n==================================================');
}

testProjectCreation();