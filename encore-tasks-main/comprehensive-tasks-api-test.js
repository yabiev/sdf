import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const API_BASE = 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Функция для создания тестового пользователя и получения токена
async function setupTestUser() {
  console.log('\n=== Настройка тестового пользователя ===');
  
  // Генерируем уникальные данные для тестового пользователя
  const timestamp = Date.now();
  const testUser = {
    email: `test-user-${timestamp}@example.com`,
    password: 'test-password-123',
    name: `Test User ${timestamp}`,
    username: `testuser${timestamp}`
  };
  
  console.log('Создаем тестового пользователя:', testUser.email);
  
  try {
    // Регистрируем пользователя
    const registerResponse = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    });
    
    console.log('Статус регистрации:', registerResponse.status);
    const registerResult = await registerResponse.json();
    console.log('Результат регистрации:', registerResult);
    
    if (!registerResponse.ok) {
      throw new Error(`Ошибка регистрации: ${registerResult.error}`);
    }
    
    // Логинимся для получения токена
    console.log('\nВыполняем вход...');
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    
    console.log('Статус входа:', loginResponse.status);
    const loginResult = await loginResponse.json();
    console.log('Результат входа:', loginResult);
    
    if (!loginResponse.ok) {
      throw new Error(`Ошибка входа: ${loginResult.error}`);
    }
    
    // Извлекаем токен из cookies или из ответа
    let authToken = null;
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    if (setCookieHeader) {
      const tokenMatch = setCookieHeader.match(/auth-token=([^;]+)/);
      if (tokenMatch) {
        authToken = tokenMatch[1];
      }
    }
    
    // Если токен не найден в cookies, попробуем из тела ответа
    if (!authToken && loginResult.token) {
      authToken = loginResult.token;
    }
    
    if (!authToken) {
      throw new Error('Токен аутентификации не найден');
    }
    
    console.log('Токен получен:', authToken.substring(0, 20) + '...');
    
    return {
      user: loginResult.user || { id: registerResult.user?.id, email: testUser.email },
      token: authToken
    };
    
  } catch (error) {
    console.error('Ошибка настройки пользователя:', error);
    throw error;
  }
}

// Функция для создания тестовых данных (проект, доска, колонка)
async function setupTestData(authToken) {
  console.log('\n=== Создание тестовых данных ===');
  
  try {
    // Создаем проект
    console.log('Создаем тестовый проект...');
    const projectResponse = await fetch(`${API_BASE}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Cookie': `auth-token=${authToken}`
      },
      body: JSON.stringify({
        name: `Test Project ${Date.now()}`,
        description: 'Тестовый проект для проверки API задач'
      })
    });
    
    console.log('Статус создания проекта:', projectResponse.status);
    const projectResult = await projectResponse.json();
    console.log('Результат создания проекта:', projectResult);
    
    if (!projectResponse.ok) {
      throw new Error(`Ошибка создания проекта: ${projectResult.error}`);
    }
    
    const projectId = projectResult.data.id;
    
    // Создаем доску
    console.log('\nСоздаем тестовую доску...');
    const boardResponse = await fetch(`${API_BASE}/api/boards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Cookie': `auth-token=${authToken}`
      },
      body: JSON.stringify({
        name: `Test Board ${Date.now()}`,
        description: 'Тестовая доска для проверки API задач',
        project_id: projectId
      })
    });
    
    console.log('Статус создания доски:', boardResponse.status);
    const boardResult = await boardResponse.json();
    console.log('Результат создания доски:', boardResult);
    
    if (!boardResponse.ok) {
      throw new Error(`Ошибка создания доски: ${boardResult.error}`);
    }
    
    const boardId = boardResult.data.id;
    
    // Создаем колонку
    console.log('\nСоздаем тестовую колонку...');
    const columnResponse = await fetch(`${API_BASE}/api/columns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Cookie': `auth-token=${authToken}`
      },
      body: JSON.stringify({
        name: `Test Column ${Date.now()}`,
        board_id: boardId,
        position: 1
      })
    });
    
    console.log('Статус создания колонки:', columnResponse.status);
    const columnResult = await columnResponse.json();
    console.log('Результат создания колонки:', columnResult);
    
    if (!columnResponse.ok) {
      throw new Error(`Ошибка создания колонки: ${columnResult.error}`);
    }
    
    const columnId = columnResult.data.id;
    
    return {
      projectId,
      boardId,
      columnId
    };
    
  } catch (error) {
    console.error('Ошибка создания тестовых данных:', error);
    throw error;
  }
}

// Тест GET /api/tasks
async function testGetTasks(authToken, testData) {
  console.log('\n=== Тест GET /api/tasks ===');
  
  try {
    const response = await fetch(`${API_BASE}/api/tasks`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Cookie': `auth-token=${authToken}`
      }
    });
    
    console.log('Статус:', response.status);
    const result = await response.json();
    console.log('Результат:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ GET /api/tasks - УСПЕШНО');
      return true;
    } else {
      console.log('❌ GET /api/tasks - ОШИБКА:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ GET /api/tasks - ИСКЛЮЧЕНИЕ:', error);
    return false;
  }
}

// Тест POST /api/tasks
async function testCreateTask(authToken, testData) {
  console.log('\n=== Тест POST /api/tasks ===');
  
  const taskData = {
    title: `Test Task ${Date.now()}`,
    description: 'Тестовая задача для проверки API',
    column_id: testData.columnId,
    priority: 'medium',
    status: 'todo'
  };
  
  console.log('Данные задачи:', taskData);
  
  try {
    const response = await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Cookie': `auth-token=${authToken}`
      },
      body: JSON.stringify(taskData)
    });
    
    console.log('Статус:', response.status);
    const result = await response.json();
    console.log('Результат:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ POST /api/tasks - УСПЕШНО');
      return result.data;
    } else {
      console.log('❌ POST /api/tasks - ОШИБКА:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ POST /api/tasks - ИСКЛЮЧЕНИЕ:', error);
    return null;
  }
}

// Тест PUT /api/tasks/[id]
async function testUpdateTask(authToken, taskId) {
  console.log('\n=== Тест PUT /api/tasks/[id] ===');
  
  const updateData = {
    title: `Updated Task ${Date.now()}`,
    description: 'Обновленное описание задачи',
    priority: 'high',
    status: 'in_progress'
  };
  
  console.log('Данные для обновления:', updateData);
  console.log('ID задачи:', taskId);
  
  try {
    const response = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Cookie': `auth-token=${authToken}`
      },
      body: JSON.stringify(updateData)
    });
    
    console.log('Статус:', response.status);
    const result = await response.json();
    console.log('Результат:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ PUT /api/tasks/[id] - УСПЕШНО');
      return true;
    } else {
      console.log('❌ PUT /api/tasks/[id] - ОШИБКА:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ PUT /api/tasks/[id] - ИСКЛЮЧЕНИЕ:', error);
    return false;
  }
}

// Тест DELETE /api/tasks/[id]
async function testDeleteTask(authToken, taskId) {
  console.log('\n=== Тест DELETE /api/tasks/[id] ===');
  
  console.log('ID задачи для удаления:', taskId);
  
  try {
    const response = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Cookie': `auth-token=${authToken}`
      }
    });
    
    console.log('Статус:', response.status);
    const result = await response.json();
    console.log('Результат:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ DELETE /api/tasks/[id] - УСПЕШНО');
      return true;
    } else {
      console.log('❌ DELETE /api/tasks/[id] - ОШИБКА:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ DELETE /api/tasks/[id] - ИСКЛЮЧЕНИЕ:', error);
    return false;
  }
}

// Основная функция тестирования
async function runTasksApiTests() {
  console.log('🚀 Запуск комплексного тестирования Tasks API');
  console.log('=' .repeat(50));
  
  let testUser = null;
  let testData = null;
  let createdTask = null;
  
  try {
    // Настройка тестового пользователя
    testUser = await setupTestUser();
    
    // Создание тестовых данных
    testData = await setupTestData(testUser.token);
    
    // Тестирование API
    const results = {
      getTasks: false,
      createTask: false,
      updateTask: false,
      deleteTask: false
    };
    
    // 1. Тест GET /api/tasks
    results.getTasks = await testGetTasks(testUser.token, testData);
    
    // 2. Тест POST /api/tasks
    createdTask = await testCreateTask(testUser.token, testData);
    results.createTask = !!createdTask;
    
    // 3. Тест PUT /api/tasks/[id] (только если задача создана)
    if (createdTask) {
      results.updateTask = await testUpdateTask(testUser.token, createdTask.id);
      
      // 4. Тест DELETE /api/tasks/[id]
      results.deleteTask = await testDeleteTask(testUser.token, createdTask.id);
    }
    
    // Итоговый отчет
    console.log('\n' + '=' .repeat(50));
    console.log('📊 ИТОГОВЫЙ ОТЧЕТ');
    console.log('=' .repeat(50));
    
    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(Boolean).length;
    
    console.log(`Всего тестов: ${totalTests}`);
    console.log(`Пройдено: ${passedTests}`);
    console.log(`Провалено: ${totalTests - passedTests}`);
    console.log('');
    
    Object.entries(results).forEach(([test, passed]) => {
      const status = passed ? '✅ ПРОЙДЕН' : '❌ ПРОВАЛЕН';
      console.log(`${test}: ${status}`);
    });
    
    if (passedTests === totalTests) {
      console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
    } else {
      console.log('\n⚠️  НЕКОТОРЫЕ ТЕСТЫ ПРОВАЛЕНЫ');
    }
    
  } catch (error) {
    console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА:', error);
  }
  
  console.log('\n🏁 Тестирование завершено');
}

// Запуск тестов
runTasksApiTests().catch(console.error);