import jwt from 'jsonwebtoken';
import { dbAdapter as databaseAdapter } from './src/lib/database-adapter.js';

const API_BASE = 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Функция для создания тестового пользователя напрямую в БД
async function createTestUserDirectly() {
  console.log('\n=== Создание тестового пользователя напрямую в БД ===');
  
  try {
    await databaseAdapter.initialize();
    
    // Генерируем уникальные данные
    const timestamp = Date.now();
    const testUser = {
      email: `test-user-${timestamp}@example.com`,
      password_hash: 'test-hash-123',
      name: `Test User ${timestamp}`,
      username: `testuser${timestamp}`,
      role: 'user',
      isApproved: true // Сразу одобряем пользователя
    };
    
    console.log('Создаем пользователя:', testUser.email);
    
    // Создаем пользователя напрямую в БД
    const user = await databaseAdapter.createUser(testUser);
    console.log('Пользователь создан:', user);
    
    // Создаем JWT токен
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Создаем сессию в БД
    const sessionToken = token;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа
    
    await databaseAdapter.query(
      'INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)',
      [sessionToken, user.id, expiresAt]
    );
    
    console.log('Сессия создана');
    console.log('Токен:', token.substring(0, 20) + '...');
    
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    };
    
  } catch (error) {
    console.error('Ошибка создания пользователя:', error);
    throw error;
  }
}

// Функция для создания тестовых данных
async function createTestData(userId) {
  console.log('\n=== Создание тестовых данных в БД ===');
  
  try {
    await databaseAdapter.initialize();
    
    // Создаем проект
    const projectResult = await databaseAdapter.query(
      'INSERT INTO projects (name, description, created_by) VALUES ($1, $2, $3) RETURNING *',
      [`Test Project ${Date.now()}`, 'Тестовый проект', userId]
    );
    const project = projectResult.rows[0];
    console.log('Проект создан:', project.id);
    
    // Добавляем пользователя как участника проекта
    await databaseAdapter.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
      [project.id, userId, 'owner']
    );
    console.log('Пользователь добавлен как участник проекта');
    
    // Создаем доску
    const boardResult = await databaseAdapter.query(
      'INSERT INTO boards (name, description, project_id, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [`Test Board ${Date.now()}`, 'Тестовая доска', project.id, userId]
    );
    const board = boardResult.rows[0];
    console.log('Доска создана:', board.id);
    
    // Создаем колонку
    const columnResult = await databaseAdapter.query(
      'INSERT INTO columns (name, board_id, position, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [`Test Column ${Date.now()}`, board.id, 1, userId]
    );
    const column = columnResult.rows[0];
    console.log('Колонка создана:', column.id);
    
    return {
      projectId: project.id,
      boardId: board.id,
      columnId: column.id
    };
    
  } catch (error) {
    console.error('Ошибка создания тестовых данных:', error);
    throw error;
  }
}

// Тест GET /api/tasks
async function testGetTasks(authToken) {
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

// Функция очистки тестовых данных
async function cleanupTestData(userId, testData) {
  console.log('\n=== Очистка тестовых данных ===');
  
  try {
    await databaseAdapter.initialize();
    
    // Удаляем задачи
    await databaseAdapter.query(
      'DELETE FROM tasks WHERE project_id = $1',
      [testData.projectId]
    );
    
    // Удаляем колонки
    await databaseAdapter.query(
      'DELETE FROM columns WHERE board_id = $1',
      [testData.boardId]
    );
    
    // Удаляем доски
    await databaseAdapter.query(
      'DELETE FROM boards WHERE project_id = $1',
      [testData.projectId]
    );
    
    // Удаляем участников проекта
    await databaseAdapter.query(
      'DELETE FROM project_members WHERE project_id = $1',
      [testData.projectId]
    );
    
    // Удаляем проект
    await databaseAdapter.query(
      'DELETE FROM projects WHERE id = $1',
      [testData.projectId]
    );
    
    // Удаляем сессии пользователя
    await databaseAdapter.query(
      'DELETE FROM sessions WHERE user_id = $1',
      [userId]
    );
    
    // Удаляем пользователя
    await databaseAdapter.query(
      'DELETE FROM users WHERE id = $1',
      [userId]
    );
    
    console.log('Тестовые данные очищены');
    
  } catch (error) {
    console.error('Ошибка очистки:', error);
  }
}

// Основная функция тестирования
async function runTasksApiTests() {
  console.log('🚀 Запуск упрощенного тестирования Tasks API');
  console.log('=' .repeat(50));
  
  let testUser = null;
  let testData = null;
  let createdTask = null;
  
  try {
    // Создание тестового пользователя
    testUser = await createTestUserDirectly();
    
    // Создание тестовых данных
    testData = await createTestData(testUser.user.id);
    
    // Тестирование API
    const results = {
      getTasks: false,
      createTask: false,
      updateTask: false,
      deleteTask: false
    };
    
    // 1. Тест GET /api/tasks
    results.getTasks = await testGetTasks(testUser.token);
    
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
    
    // Очистка тестовых данных
    if (testUser && testData) {
      await cleanupTestData(testUser.user.id, testData);
    }
    
  } catch (error) {
    console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА:', error);
    
    // Попытка очистки даже при ошибке
    if (testUser && testData) {
      try {
        await cleanupTestData(testUser.user.id, testData);
      } catch (cleanupError) {
        console.error('Ошибка очистки:', cleanupError);
      }
    }
  }
  
  console.log('\n🏁 Тестирование завершено');
}

// Запуск тестов
runTasksApiTests().catch(console.error);