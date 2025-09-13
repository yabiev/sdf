const https = require('https');
const http = require('http');

// Данные для создания доски
const boardData = {
  name: 'Тестовая доска',
  project_id: 'beb732e3-fa7d-47b5-ac2c-a5f56df601ee', // Реальный ID проекта
  description: 'Доска для тестирования создания задач'
};

// Новый токен из API авторизации
const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkMDEyYjA3OS01Nzk4LTQ5ZDUtOGNmZi0wZTFkYmVhNTgyMmUiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwidGltZXN0YW1wIjoxNzU2MjE5MzY4NTQxLCJyYW5kb20iOiJvYmx5cTVoMmljaiIsImlhdCI6MTc1NjIxOTM2OCwiZXhwIjoxNzU2ODI0MTY4fQ.6o_04ENkDiz1xNhXKu5XwxmxdFxUifz4ye3EcmqHJ60';

const postData = JSON.stringify(boardData);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/boards',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Отправляем запрос на создание доски...');
console.log('URL:', `http://${options.hostname}:${options.port}${options.path}`);
console.log('Данные:', boardData);

const req = http.request(options, (res) => {
  console.log('Статус ответа:', res.statusCode);
  console.log('Заголовки ответа:', res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Ответ сервера:', data);
    
    try {
      const response = JSON.parse(data);
      console.log('Распарсенный ответ:', JSON.stringify(response, null, 2));
      
      // Показываем детали ошибки валидации, если они есть
      if (response.details) {
        console.log('Детали ошибки валидации:', JSON.stringify(response.details, null, 2));
      }
      
      if (response.success && response.data) {
        console.log('\n=== ДОСКА СОЗДАНА УСПЕШНО ===');
        console.log('ID доски:', response.data.id);
        console.log('Название:', response.data.name);
        console.log('Проект:', response.data.project_name);
      }
    } catch (parseError) {
      console.log('Ошибка парсинга JSON:', parseError.message);
    }
  });
});

req.on('error', (error) => {
  console.error('Ошибка запроса:', error);
});

req.write(postData);
req.end();