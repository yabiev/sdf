const https = require('https');
const http = require('http');

function testAuth() {
  const postData = JSON.stringify({
    email: 'admin@example.com',
    password: 'admin123'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('Тестирую авторизацию...');
  console.log('URL:', `http://localhost:3000${options.path}`);
  console.log('Данные:', postData);

  const req = http.request(options, (res) => {
    console.log(`Статус: ${res.statusCode}`);
    console.log(`Заголовки:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Ответ:', data);
      if (res.statusCode === 200) {
        console.log('✅ Авторизация успешна!');
      } else {
        console.log('❌ Ошибка авторизации');
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Ошибка запроса: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

testAuth();