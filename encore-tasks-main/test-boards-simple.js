// Простой тест для проверки API boards
const https = require('https');
const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const protocol = options.port === 443 ? https : http;
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: data
        });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testBoards() {
  try {
    console.log('Тестирование API boards...');
    
    // Сначала логинимся
    const loginOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const loginData = JSON.stringify({
      email: 'test@example.com',
      password: 'password123'
    });
    
    console.log('Выполняем логин...');
    const loginResponse = await makeRequest(loginOptions, loginData);
    console.log('Login status:', loginResponse.statusCode);
    
    if (loginResponse.statusCode !== 200) {
      console.log('Login response:', loginResponse.data);
      return;
    }
    
    const loginResult = JSON.parse(loginResponse.data);
    const token = loginResult.token;
    console.log('Токен получен:', token ? 'да' : 'нет');
    
    // Теперь проверяем boards
    const boardsOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/boards',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    console.log('Получаем список boards...');
    const boardsResponse = await makeRequest(boardsOptions);
    console.log('Boards status:', boardsResponse.statusCode);
    console.log('Boards data:', boardsResponse.data);
    
  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

testBoards();