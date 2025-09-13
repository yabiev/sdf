const axios = require('axios');

async function testProjectsAPI() {
  console.log('🚀 Тестирование API проектов...');
  
  try {
    // 1. Сначала авторизуемся
    console.log('🔐 Авторизация...');
    const authResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'axelencore@mail.ru',
      password: 'Ad580dc6axelencore'
    });
    
    console.log('📊 Ответ авторизации:');
    console.log('Status:', authResponse.status);
    console.log('Data:', JSON.stringify(authResponse.data, null, 2));
    
    // Проверяем наличие токена (разные форматы ответа)
    const token = authResponse.data?.data?.token || authResponse.data?.token;
    if (!token) {
      console.error('❌ Токен не найден в ответе авторизации');
      console.error('Структура ответа:', authResponse.data);
      return;
    }
    
    // Проверяем, что авторизация успешна (по наличию токена и пользователя)
    if (!authResponse.data?.user) {
      console.error('❌ Данные пользователя не найдены');
      return;
    }
    
    console.log('✅ Авторизация успешна, токен получен');
    
    // 2. Получаем список проектов
    console.log('📋 Получаем список проектов...');
    const projectsResponse = await axios.get('http://localhost:3000/api/projects', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Ответ API проектов:');
    console.log('Status:', projectsResponse.status);
    console.log('Data:', JSON.stringify(projectsResponse.data, null, 2));
    
    // Анализируем структуру ответа
    let projects = [];
    if (Array.isArray(projectsResponse.data)) {
      projects = projectsResponse.data;
    } else if (projectsResponse.data && projectsResponse.data.data) {
      if (Array.isArray(projectsResponse.data.data)) {
        projects = projectsResponse.data.data;
      } else if (projectsResponse.data.data.projects && Array.isArray(projectsResponse.data.data.projects)) {
        projects = projectsResponse.data.data.projects;
      }
    } else if (projectsResponse.data && Array.isArray(projectsResponse.data.projects)) {
      projects = projectsResponse.data.projects;
    }
    
    console.log('🔍 Структура ответа API:');
    console.log('- projectsResponse.data тип:', typeof projectsResponse.data);
    console.log('- projectsResponse.data.data тип:', typeof projectsResponse.data?.data);
    console.log('- projectsResponse.data.data.projects тип:', typeof projectsResponse.data?.data?.projects);
    if (projectsResponse.data?.data?.projects) {
      console.log('- projectsResponse.data.data.projects длина:', projectsResponse.data.data.projects.length);
    }
    
    console.log(`\n📈 Найдено проектов: ${projects.length}`);
    console.log('📊 Общее количество проектов:', projectsResponse.data.pagination?.total || 'неизвестно');
    
    if (projects.length > 0) {
      console.log('\n🎯 Список проектов:');
      projects.slice(0, 5).forEach((project, index) => {
        console.log(`  ${index + 1}. ID: ${project.id || project.project_id || 'N/A'}`);
        console.log(`     Название: ${project.name || project.title || 'N/A'}`);
        console.log(`     Описание: ${project.description || 'N/A'}`);
        console.log(`     Создан: ${project.created_at || project.createdAt || 'N/A'}`);
        console.log('');
      });
      
      if (projects.length > 5) {
        console.log(`... и еще ${projects.length - 5} проектов`);
      }
      
      // Ищем тестовый проект
      const testProject = projects.find(p => 
        (p.name && p.name.toLowerCase().includes('тестовый')) ||
        (p.title && p.title.toLowerCase().includes('тестовый')) ||
        (p.name && p.name.toLowerCase().includes('test')) ||
        (p.title && p.title.toLowerCase().includes('test'))
      );
      
      if (testProject) {
        console.log('✅ Тестовый проект найден в API!');
        console.log('📝 Данные тестового проекта:', JSON.stringify(testProject, null, 2));
      } else {
        console.log('❌ Тестовый проект не найден в API');
      }
    } else {
      console.log('❌ Проекты не найдены');
    }
    
    // 3. Создаем новый тестовый проект для проверки
    console.log('\n🆕 Создаем новый тестовый проект...');
    const newProjectResponse = await axios.post('http://localhost:3000/api/projects', {
      name: `Тестовый проект API ${new Date().toISOString()}`,
      description: 'Проект создан через API тест'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Ответ создания проекта:');
    console.log('Status:', newProjectResponse.status);
    console.log('Data:', JSON.stringify(newProjectResponse.data, null, 2));
    
    if (newProjectResponse.data.success) {
      console.log('✅ Новый проект создан успешно!');
      
      // 4. Проверяем, что проект появился в списке
      console.log('\n🔄 Повторно получаем список проектов...');
      const updatedProjectsResponse = await axios.get('http://localhost:3000/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      let updatedProjects = [];
      if (Array.isArray(updatedProjectsResponse.data)) {
        updatedProjects = updatedProjectsResponse.data;
      } else if (updatedProjectsResponse.data && updatedProjectsResponse.data.data) {
        if (Array.isArray(updatedProjectsResponse.data.data)) {
          updatedProjects = updatedProjectsResponse.data.data;
        } else if (updatedProjectsResponse.data.data.projects && Array.isArray(updatedProjectsResponse.data.data.projects)) {
          updatedProjects = updatedProjectsResponse.data.data.projects;
        }
      } else if (updatedProjectsResponse.data && Array.isArray(updatedProjectsResponse.data.projects)) {
        updatedProjects = updatedProjectsResponse.data.projects;
      }
      
      console.log(`📈 Обновленное количество проектов: ${updatedProjects.length}`);
      console.log('📊 Общее количество проектов:', updatedProjectsResponse.data.pagination?.total || 'неизвестно');
      
      if (updatedProjects.length > projects.length) {
        console.log('✅ Проект успешно добавлен в список!');
        
        // Ищем созданный проект
        const createdProject = updatedProjects.find(p => p.name && p.name.includes('Тестовый проект API'));
        
        if (createdProject) {
          console.log('📋 Детали созданного проекта:', {
            id: createdProject.id,
            name: createdProject.name,
            description: createdProject.description,
            created_at: createdProject.created_at || createdProject.createdAt
          });
        }
      } else {
        console.log('❌ Проект не появился в списке');
        console.log('🔍 Проверим последние 3 проекта:');
        updatedProjects.slice(0, 3).forEach((project, index) => {
          console.log(`${index + 1}. ${project.name || project.title} (ID: ${project.id}) - ${project.created_at || project.createdAt}`);
        });
      }
    } else {
      console.log('❌ Ошибка создания проекта:', newProjectResponse.data.error);
    }
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testProjectsAPI();