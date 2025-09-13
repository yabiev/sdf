const http = require('http');

// Тестовые данные
const testData = {
  title: 'Test Column',
  board_id: '1',
  position: 0
};

// JWT токен (валидный)
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInRpbWVzdGFtcCI6MTc1NzE1NDg3NTM1MCwicmFuZG9tIjoiandoYm1jdG81MiIsImlhdCI6MTc1NzE1NDg3NSwiZXhwIjoxNzU3NzU5Njc1fQ.EiOIYsAqC82DundGe4rMtKM37sBUplv2gS6NbLFv9m8';

console.log('Тестирование API создания колонки...');
console.log('Данные:', JSON.stringify(testData, null, 2));
console.log('Токен (первые 20 символов):', token.substring(0, 20));

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/columns',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'Authorization': `Bearer ${token}`
  }
};

const req = http.request(options, (res) => {
  console.log(`Статус: ${res.statusCode}`);
  console.log(`Заголовки:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Ответ сервера:');
    try {
      const response = JSON.parse(data);
      console.log(JSON.stringify(response, null, 2));
    } catch (e) {
      console.log('Сырой ответ:', data);
    }
    
    if (res.statusCode === 201) {
      console.log('✅ Колонка успешно создана!');
    } else {
      console.log('❌ Ошибка при создании колонки');
    }
  });
});

req.on('error', (e) => {
  console.error(`Ошибка запроса: ${e.message}`);
});

req.write(postData);
req.end();