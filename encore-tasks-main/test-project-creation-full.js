const axios = require('axios');
const { Pool } = require('pg');

// Конфигурация
const BASE_URL = 'http://localhost:3000';
const DB_CONFIG = {
  user: 'postgres',
  host: 'localhost',
  database: 'encore_tasks',
  password: 'postgres',
  port: 5432,
};

// Тестовые данные
const testUser = {
  email: 'test@example.com',
  password: 'testpassword123',
  name: 'Test User'
};

const validProjectData = {
  name: 'Тест проект',
  description: 'Описание тестового проекта'
};

const invalidProjectData = [
  { name: '', description: 'Описание' }, // пустое имя
  { name: 'a'.repeat(101), description: 'Описание' }, // слишком длинное имя
  { description: 'Описание' }, // без name
  { name: 'Тест', description: 'a'.repeat(501) }, // слишком длинное описание
  { name: 'Тест', description: 'Описание', color: 'invalid-color' } // неверный цвет
];

// Глобальные переменные для авторизации
let authToken = null;
let authCookies = null;
let pool = null;

// Результаты тестов
const testResults = {
  auth: false,
  validationCorrect: false,
  validationIncorrect: false,
  apiEndpoint: false,
  databaseSave: false,
  errorHandling: false,
  integration: false
};

// Функция авторизации
async function authenticate() {
  try {
    console.log('🔑 Выполняю авторизацию...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });

    if (response.data.token) {
      authToken = response.data.token;
      authCookies = response.headers['set-cookie'];
      console.log('✅ Авторизация успешна');
      testResults.auth = true;
      return true;
    }
    return false;
  } catch (error) {
    console.log('❌ Ошибка авторизации:', error.response?.data || error.message);
    return false;
  }
}

// Функция подключения к БД
async function connectToDatabase() {
  try {
    pool = new Pool(DB_CONFIG);
    await pool.query('SELECT NOW()');
    console.log('✅ Подключение к базе данных успешно');
    return true;
  } catch (error) {
    console.log('❌ Ошибка подключения к БД:', error.message);
    return false;
  }
}

// Тест валидации корректных данных
async function testValidProjectCreation() {
  try {
    console.log('\n📝 Тестирование создания проекта с корректными данными...');
    console.log('🔍 Токен:', authToken ? 'Есть' : 'Нет');
    console.log('🔍 Cookies:', authCookies ? 'Есть' : 'Нет');
    
    const headers = {};
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    if (authCookies) headers.Cookie = authCookies.join('; ');

    console.log('🔍 Headers:', headers);
    const config = { headers };
    
    const response = await axios.post(`${BASE_URL}/api/projects`, validProjectData, config);
    
    console.log('📡 Статус ответа:', response.status);
    console.log('📡 Ответ сервера:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 201 && response.data && response.data.success) {
      console.log('✅ Проект успешно создан с ID:', response.data.data.id);
      testResults.validationCorrect = true;
      testResults.apiEndpoint = true;
      return response.data.data.id;
    }
    return null;
  } catch (error) {
    console.log('❌ Ошибка создания проекта:', error.response?.data || error.message);
    return null;
  }
}

// Тест валидации некорректных данных
async function testInvalidProjectCreation() {
  console.log('\n🚫 Тестирование валидации некорректных данных...');
  let validationPassed = true;
  
  for (let i = 0; i < invalidProjectData.length; i++) {
    try {
      const headers = {};
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      if (authCookies) headers.Cookie = authCookies.join('; ');

      const config = { headers };
      
      const response = await axios.post(`${BASE_URL}/api/projects`, invalidProjectData[i], config);
      
      // Если запрос прошел успешно, это ошибка валидации
      if (response.status === 201) {
        console.log(`❌ Валидация не сработала для данных ${i + 1}:`, invalidProjectData[i]);
        validationPassed = false;
      }
    } catch (error) {
      // Ожидаем ошибку валидации (400)
      if (error.response?.status === 400) {
        console.log(`✅ Валидация сработала для данных ${i + 1}:`, error.response.data.error || 'Ошибка валидации');
      } else {
        console.log(`⚠️ Неожиданная ошибка для данных ${i + 1}:`, error.response?.status, error.response?.data);
        validationPassed = false;
      }
    }
  }
  
  testResults.validationIncorrect = validationPassed;
  if (validationPassed) {
    console.log('✅ Все тесты валидации некорректных данных пройдены');
  }
}

// Тест сохранения в базе данных
async function testDatabaseSave(projectId) {
  if (!pool || !projectId) {
    console.log('❌ Нет подключения к БД или ID проекта');
    return;
  }
  
  try {
    console.log('\n💾 Проверка сохранения в базе данных...');
    const result = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    
    if (result.rows.length > 0) {
      const project = result.rows[0];
      console.log('✅ Проект найден в БД:', {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status
      });
      
      // Проверяем соответствие данных
      if (project.name === validProjectData.name && 
          project.description === validProjectData.description &&
          project.status === validProjectData.status) {
        console.log('✅ Данные в БД соответствуют отправленным');
        testResults.databaseSave = true;
      } else {
        console.log('❌ Данные в БД не соответствуют отправленным');
      }
    } else {
      console.log('❌ Проект не найден в базе данных');
    }
  } catch (error) {
    console.log('❌ Ошибка проверки БД:', error.message);
  }
}

// Тест обработки ошибок авторизации
async function testAuthErrorHandling() {
  try {
    console.log('\n🔒 Тестирование обработки ошибок авторизации...');
    
    // Попытка создать проект без токена
    const response = await axios.post(`${BASE_URL}/api/projects`, validProjectData);
    
    // Если запрос прошел без авторизации, это ошибка
    console.log('❌ API позволил создать проект без авторизации');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Правильная обработка ошибки авторизации:', error.response.data.error || 'Unauthorized');
      testResults.errorHandling = true;
    } else {
      console.log('❌ Неожиданная ошибка авторизации:', error.response?.status, error.response?.data);
    }
  }
}

// Тест интеграции компонентов
async function testComponentIntegration(projectId) {
  if (!projectId) {
    console.log('❌ Нет ID проекта для тестирования интеграции');
    return;
  }
  
  try {
    console.log('\n🔗 Тестирование интеграции компонентов...');
    
    const headers = {};
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    if (authCookies) headers.Cookie = authCookies.join('; ');

    const config = { headers };
    
    // Получение списка проектов
    const response = await axios.get(`${BASE_URL}/api/projects`, config);
    
    console.log('📋 Ответ списка проектов:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success && response.data.data && response.data.data.projects) {
      const projects = response.data.data.projects;
      const createdProject = projects.find(p => p.id == projectId);
      if (createdProject) {
        console.log('✅ Созданный проект найден в списке проектов');
        testResults.integration = true;
      } else {
        console.log('❌ Созданный проект не найден в списке проектов');
      }
    } else {
      console.log('❌ Неверный формат ответа API списка проектов');
    }
  } catch (error) {
    console.log('❌ Ошибка тестирования интеграции:', error.response?.data || error.message);
  }
}

// Функция очистки тестовых данных
async function cleanup(projectId) {
  if (pool && projectId) {
    try {
      await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);
      console.log('🧹 Тестовые данные очищены');
    } catch (error) {
      console.log('⚠️ Ошибка очистки:', error.message);
    }
  }
  
  if (pool) {
    await pool.end();
  }
}

// Основная функция тестирования
async function runFullProjectCreationTests() {
  console.log('🚀 ЗАПУСК КОМПЛЕКСНОГО ТЕСТИРОВАНИЯ СОЗДАНИЯ ПРОЕКТОВ');
  console.log('=' .repeat(60));
  
  let projectId = null;
  
  try {
    // 1. Подключение к БД
    const dbConnected = await connectToDatabase();
    if (!dbConnected) {
      console.log('❌ Не удалось подключиться к базе данных. Тестирование прервано.');
      return;
    }
    
    // 2. Авторизация
    const authSuccess = await authenticate();
    if (!authSuccess) {
      console.log('❌ Авторизация не удалась. Тестирование прервано.');
      return;
    }
    
    // 3. Тестирование создания проекта с корректными данными
    projectId = await testValidProjectCreation();
    
    // 4. Тестирование валидации некорректных данных
    await testInvalidProjectCreation();
    
    // 5. Проверка сохранения в БД
    await testDatabaseSave(projectId);
    
    // 6. Тестирование обработки ошибок авторизации
    await testAuthErrorHandling();
    
    // 7. Тестирование интеграции компонентов
    await testComponentIntegration(projectId);
    
  } finally {
    // Очистка
    await cleanup(projectId);
  }
  
  // Вывод итогового отчета
  console.log('\n' + '=' .repeat(60));
  console.log('📊 ИТОГОВЫЙ ОТЧЕТ КОМПЛЕКСНОГО ТЕСТИРОВАНИЯ');
  console.log('=' .repeat(60));
  
  const tests = [
    { name: 'Авторизация', result: testResults.auth },
    { name: 'Валидация корректных данных', result: testResults.validationCorrect },
    { name: 'Валидация некорректных данных', result: testResults.validationIncorrect },
    { name: 'API эндпоинт /api/projects (POST)', result: testResults.apiEndpoint },
    { name: 'Сохранение в базе данных', result: testResults.databaseSave },
    { name: 'Обработка ошибок авторизации', result: testResults.errorHandling },
    { name: 'Интеграция компонентов', result: testResults.integration }
  ];
  
  let passedTests = 0;
  tests.forEach((test, index) => {
    const status = test.result ? '✅ ПРОЙДЕН' : '❌ ПРОВАЛЕН';
    console.log(`${index + 1}. ${status} - ${test.name}`);
    if (test.result) passedTests++;
  });
  
  console.log('\n📈 СТАТИСТИКА:');
  console.log(`   ✅ Пройдено: ${passedTests}`);
  console.log(`   ❌ Провалено: ${tests.length - passedTests}`);
  console.log(`   📊 Всего тестов: ${tests.length}`);
  console.log(`   🎯 Успешность: ${Math.round((passedTests / tests.length) * 100)}%`);
  
  if (passedTests === tests.length) {
    console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
  } else {
    console.log('\n⚠️ ОБНАРУЖЕНЫ ПРОБЛЕМЫ:');
    tests.forEach(test => {
      if (!test.result) {
        console.log(`   • ${test.name}`);
      }
    });
  }
}

// Запуск тестирования
if (require.main === module) {
  runFullProjectCreationTests().catch(console.error);
}

module.exports = {
  runFullProjectCreationTests,
  testResults
};