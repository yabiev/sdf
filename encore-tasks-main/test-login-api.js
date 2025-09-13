const http = require('http');

function testLoginAPI() {
  const postData = JSON.stringify({
    email: 'test@example.com',
    password: 'password123'
  });

  const options = {
    hostname: 'localhost',
    port: 3002,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('🔐 Тестирование API авторизации...');
  console.log('📋 URL:', `http://${options.hostname}:${options.port}${options.path}`);
  console.log('📋 Данные:', { email: 'test@example.com', password: 'password123' });

  const req = http.request(options, (res) => {
    console.log('📊 Статус ответа:', res.statusCode);
    console.log('📊 Заголовки:', res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('📋 Тело ответа:', data);
      
      try {
        const response = JSON.parse(data);
        console.log('✅ Ответ распарсен:', response);
      } catch (error) {
        console.log('❌ Ошибка парсинга JSON:', error.message);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Ошибка запроса:', error.message);
  });

  req.write(postData);
  req.end();
}

// Запуск теста
testLoginAPI();