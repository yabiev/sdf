const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let authToken = null;
let authCookies = null;

// Тестовые данные
const testUser = {
  email: 'test@example.com',
  password: 'testpassword123',
  name: 'Test User'
};

async function runTests() {
    console.log('🚀 Запуск тестирования функциональности создания проектов\n');
    
    const results = {
        passed: 0,
        failed: 0,
        tests: []
    };

    // Тест 1: Авторизация
    try {
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: testUser.email,
            password: testUser.password
        });
        
        if (loginResponse.status === 200 && loginResponse.data.token) {
            authToken = loginResponse.data.token;
            authCookies = loginResponse.headers['set-cookie'];
            console.log('🔑 Токен получен:', authToken ? 'Да' : 'Нет');
            console.log('🍪 Cookies получены:', authCookies ? 'Да' : 'Нет');
            results.passed++;
            results.tests.push({ name: 'Авторизация', status: 'ПРОЙДЕН' });
        } else {
            throw new Error('Неверный ответ авторизации');
        }
    } catch (error) {
        results.failed++;
        results.tests.push({ name: 'Авторизация', status: 'ПРОВАЛЕН', error: error.message });
    }

    // Тест 2: Создание проекта с корректными данными
    try {
        const projectData = {
            name: 'Тестовый проект ' + Date.now(),
            description: 'Описание тестового проекта',
            color: '#3B82F6',
            icon: '📋'
        };

        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        const config = { headers };
        if (authCookies) {
            config.headers['Cookie'] = authCookies.join('; ');
        }

        const createResponse = await axios.post(`${BASE_URL}/api/projects`, projectData, config);

        if (createResponse.status === 201 && createResponse.data.data?.id) {
            results.passed++;
            results.tests.push({ name: 'Создание проекта', status: 'ПРОЙДЕН', projectId: createResponse.data.data.id });
        } else {
            throw new Error('Проект не создан или отсутствует ID');
        }
    } catch (error) {
        results.failed++;
        results.tests.push({ name: 'Создание проекта', status: 'ПРОВАЛЕН', error: error.message });
    }

    // Тест 3: Валидация данных (некорректные данные)
    try {
        const invalidData = {
            name: '', // пустое имя
            description: 'Описание',
            color: 'invalid-color',
            icon: '📋'
        };

        const response = await axios.post(`${BASE_URL}/api/projects`, invalidData, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        if (response.status >= 400) {
            results.passed++;
            results.tests.push({ name: 'Валидация данных', status: 'ПРОЙДЕН' });
        } else {
            throw new Error('Валидация не сработала');
        }
    } catch (error) {
        if (error.response && error.response.status >= 400) {
            results.passed++;
            results.tests.push({ name: 'Валидация данных', status: 'ПРОЙДЕН' });
        } else {
            results.failed++;
            results.tests.push({ name: 'Валидация данных', status: 'ПРОВАЛЕН', error: error.message });
        }
    }

    // Тест 4: Получение списка проектов
    try {
        const headers = {};
        
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        const config = { headers };
        if (authCookies) {
            config.headers['Cookie'] = authCookies.join('; ');
        }
        
        const listResponse = await axios.get(`${BASE_URL}/api/projects`, config);

        if (listResponse.status === 200 && Array.isArray(listResponse.data.data)) {
            results.passed++;
            results.tests.push({ name: 'Получение списка проектов', status: 'ПРОЙДЕН', count: listResponse.data.data.length });
        } else {
            throw new Error('Неверный формат списка проектов');
        }
    } catch (error) {
        results.failed++;
        results.tests.push({ name: 'Получение списка проектов', status: 'ПРОВАЛЕН', error: error.message });
    }

    // Тест 5: Авторизация с неверными данными
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'wrong@example.com',
            password: 'wrongpassword'
        });

        if (response.status >= 400) {
            results.passed++;
            results.tests.push({ name: 'Обработка ошибок авторизации', status: 'ПРОЙДЕН' });
        } else {
            throw new Error('Ошибка авторизации не обработана');
        }
    } catch (error) {
        if (error.response && error.response.status >= 400) {
            results.passed++;
            results.tests.push({ name: 'Обработка ошибок авторизации', status: 'ПРОЙДЕН' });
        } else {
            results.failed++;
            results.tests.push({ name: 'Обработка ошибок авторизации', status: 'ПРОВАЛЕН', error: error.message });
        }
    }

    // Вывод результатов
    console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ О ТЕСТИРОВАНИИ:');
    console.log('=' .repeat(50));
    
    results.tests.forEach((test, index) => {
        const status = test.status === 'ПРОЙДЕН' ? '✅' : '❌';
        console.log(`${index + 1}. ${status} ${test.name} - ${test.status}`);
        if (test.error) {
            console.log(`   Ошибка: ${test.error}`);
        }
        if (test.projectId) {
            console.log(`   ID проекта: ${test.projectId}`);
        }
        if (test.count !== undefined) {
            console.log(`   Количество проектов: ${test.count}`);
        }
    });
    
    console.log('\n' + '='.repeat(50));
    console.log(`📈 СТАТИСТИКА:`);
    console.log(`   ✅ Пройдено: ${results.passed}`);
    console.log(`   ❌ Провалено: ${results.failed}`);
    console.log(`   📊 Всего тестов: ${results.passed + results.failed}`);
    console.log(`   🎯 Успешность: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
    
    if (results.failed > 0) {
        console.log('\n🔧 РЕКОМЕНДАЦИИ:');
        console.log('   • Проверьте провалившиеся тесты');
        console.log('   • Убедитесь, что сервер запущен на порту 3000');
        console.log('   • Проверьте логи сервера для дополнительной информации');
    } else {
        console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
        console.log('   Функциональность создания проектов работает корректно.');
    }
}

runTests().catch(console.error);