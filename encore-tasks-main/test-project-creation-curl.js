const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function testProjectCreationWithCurl() {
  console.log('🚀 Тестирование создания проекта через curl...');
  
  try {
    // 1. Проверяем, что сервер работает
    console.log('\n1️⃣ Проверка работы сервера...');
    const serverCheck = await execAsync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/');
    console.log(`Статус сервера: ${serverCheck.stdout}`);
    
    if (serverCheck.stdout !== '200') {
      throw new Error('Сервер не отвечает на порту 3001');
    }
    
    // 2. Регистрируем пользователя
    console.log('\n2️⃣ Регистрация пользователя...');
    const registerData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    };
    
    const registerCmd = `curl -s -X POST http://localhost:3001/api/auth/register -H "Content-Type: application/json" -d '${JSON.stringify(registerData)}'`;
    const registerResult = await execAsync(registerCmd);
    console.log('Результат регистрации:', registerResult.stdout);
    
    // 3. Авторизуемся
    console.log('\n3️⃣ Авторизация пользователя...');
    const loginData = {
      email: 'test@example.com',
      password: 'password123'
    };
    
    const loginCmd = `curl -s -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '${JSON.stringify(loginData)}' -c cookies.txt`;
    const loginResult = await execAsync(loginCmd);
    console.log('Результат авторизации:', loginResult.stdout);
    
    let authToken = null;
    try {
      const loginResponse = JSON.parse(loginResult.stdout);
      authToken = loginResponse.token;
      console.log('Токен получен:', authToken ? 'Да' : 'Нет');
    } catch (e) {
      console.log('Ошибка парсинга ответа авторизации:', e.message);
    }
    
    // 4. Создаем проект
    console.log('\n4️⃣ Создание проекта...');
    const projectData = {
      name: 'Test Project ' + Date.now(),
      description: 'Тестовый проект для проверки функциональности'
    };
    
    let createProjectCmd;
    if (authToken) {
      createProjectCmd = `curl -s -X POST http://localhost:3001/api/projects -H "Content-Type: application/json" -H "Authorization: Bearer ${authToken}" -d '${JSON.stringify(projectData)}'`;
    } else {
      createProjectCmd = `curl -s -X POST http://localhost:3001/api/projects -H "Content-Type: application/json" -b cookies.txt -d '${JSON.stringify(projectData)}'`;
    }
    
    const createResult = await execAsync(createProjectCmd);
    console.log('Результат создания проекта:', createResult.stdout);
    
    // 5. Проверяем список проектов
    console.log('\n5️⃣ Получение списка проектов...');
    let getProjectsCmd;
    if (authToken) {
      getProjectsCmd = `curl -s http://localhost:3001/api/projects -H "Authorization: Bearer ${authToken}"`;
    } else {
      getProjectsCmd = `curl -s http://localhost:3001/api/projects -b cookies.txt`;
    }
    
    const projectsResult = await execAsync(getProjectsCmd);
    console.log('Список проектов:', projectsResult.stdout);
    
    // Анализируем результат
    try {
      const projects = JSON.parse(projectsResult.stdout);
      if (Array.isArray(projects) && projects.length > 0) {
        console.log('\n✅ УСПЕХ! Проект успешно создан и отображается в списке');
        console.log(`Найдено проектов: ${projects.length}`);
        projects.forEach((project, index) => {
          console.log(`  ${index + 1}. ${project.name} (ID: ${project.id})`);
        });
      } else {
        console.log('\n❌ Проект не найден в списке');
      }
    } catch (e) {
      console.log('\n❌ Ошибка парсинга списка проектов:', e.message);
      console.log('Сырой ответ:', projectsResult.stdout);
    }
    
  } catch (error) {
    console.error('\n💥 Ошибка во время тестирования:', error.message);
    if (error.stderr) {
      console.error('Stderr:', error.stderr);
    }
  } finally {
    // Очищаем файл cookies
    try {
      await execAsync('del cookies.txt 2>nul || rm -f cookies.txt 2>/dev/null || true');
    } catch (e) {
      // Игнорируем ошибки удаления файла
    }
  }
}

testProjectCreationWithCurl();