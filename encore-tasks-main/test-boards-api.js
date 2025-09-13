const http = require('http');

async function testBoardsAPI() {
  console.log('🧪 Тестирование API досок...');
  
  // Сначала авторизуемся
  console.log('\n🔐 Авторизация...');
  const loginData = JSON.stringify({
    email: 'test@example.com',
    password: 'password123'
  });
  
  const loginOptions = {
    hostname: 'localhost',
    port: 3002,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  };
  
  try {
    const loginResponse = await makeRequest(loginOptions, loginData);
    console.log('✅ Авторизация успешна');
    
    const authData = JSON.parse(loginResponse.body);
    const token = authData.token;
    console.log('🎫 Получен токен:', token.substring(0, 20) + '...');
    
    // Теперь тестируем API досок
    console.log('\n📋 Тестирование GET /api/boards...');
    const boardsOptions = {
      hostname: 'localhost',
      port: 3002,
      path: '/api/boards',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    const boardsResponse = await makeRequest(boardsOptions);
    console.log('📊 Статус ответа:', boardsResponse.statusCode);
    console.log('📋 Тело ответа:', boardsResponse.body);
    
    if (boardsResponse.statusCode === 200) {
      const boards = JSON.parse(boardsResponse.body);
      console.log('✅ API досок работает! Найдено досок:', boards.length);
    } else {
      console.log('❌ API досок вернул ошибку:', boardsResponse.statusCode);
    }
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  }
}

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

testBoardsAPI();