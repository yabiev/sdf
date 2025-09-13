const fetch = require('node-fetch');

async function debugProjectAPI() {
  console.log('🔍 Отладка API создания проекта...');
  
  // Сначала авторизуемся
  const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'axelencore@mail.ru',
      password: 'Ad580dc6axelencore'
    })
  });
  
  const loginData = await loginResponse.json();
  const token = loginData.token;
  
  console.log('✅ Авторизация выполнена');
  
  // Создаем проект
  console.log('\n📁 Создание проекта...');
  const createResponse = await fetch('http://localhost:3000/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Debug Project ' + Date.now(),
      description: 'Проект для отладки API'
    })
  });
  
  console.log('Статус создания:', createResponse.status);
  console.log('Заголовки ответа:', Object.fromEntries(createResponse.headers.entries()));
  
  const createText = await createResponse.text();
  console.log('Сырой ответ:', createText);
  
  try {
    const createData = JSON.parse(createText);
    console.log('Парсированные данные:', createData);
    console.log('ID проекта:', createData.id);
    console.log('Название:', createData.name);
  } catch (e) {
    console.log('Ошибка парсинга JSON:', e.message);
  }
  
  // Получаем список проектов
  console.log('\n📂 Получение списка проектов...');
  const listResponse = await fetch('http://localhost:3000/api/projects', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  console.log('Статус получения:', listResponse.status);
  const listText = await listResponse.text();
  console.log('Сырой ответ списка:', listText.substring(0, 500) + '...');
  
  try {
    const listData = JSON.parse(listText);
    console.log('Количество проектов:', listData.length);
    if (listData.length > 0) {
      console.log('Первый проект:', listData[0]);
    }
  } catch (e) {
    console.log('Ошибка парсинга списка:', e.message);
  }
}

debugProjectAPI();