const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function debugProjectsList() {
  console.log('=== ОТЛАДКА СПИСКА ПРОЕКТОВ ===\n');
  
  try {
    // Авторизация
    console.log('1. Авторизация...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Авторизация успешна');
    
    // Получение списка проектов
    console.log('\n2. Получение списка проектов...');
    const projectsResponse = await axios.get(`${API_BASE_URL}/projects`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Статус ответа:', projectsResponse.status);
    console.log('Полный ответ:', JSON.stringify(projectsResponse.data, null, 2));
    
    // Проверим структуру данных
    if (projectsResponse.data) {
      if (Array.isArray(projectsResponse.data)) {
        console.log('\n✅ Данные - это массив, длина:', projectsResponse.data.length);
      } else if (projectsResponse.data.data && Array.isArray(projectsResponse.data.data)) {
        console.log('\n✅ Данные в поле data, длина:', projectsResponse.data.data.length);
      } else if (projectsResponse.data.projects && Array.isArray(projectsResponse.data.projects)) {
        console.log('\n✅ Данные в поле projects, длина:', projectsResponse.data.projects.length);
      } else {
        console.log('\n❌ Неожиданная структура данных');
        console.log('Тип данных:', typeof projectsResponse.data);
        console.log('Ключи объекта:', Object.keys(projectsResponse.data));
      }
    }
    
  } catch (error) {
    console.log('\n❌ ОШИБКА:');
    if (error.response) {
      console.log('Статус:', error.response.status);
      console.log('Данные:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Ошибка:', error.message);
    }
  }
}

debugProjectsList();