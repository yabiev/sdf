const http = require('http');

// Функция для выполнения HTTP запросов
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonBody, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testUserRegistration() {
  console.log('🧪 Тестирование регистрации пользователя через API...');
  
  const timestamp = Date.now();
  const testUser = {
    email: `test-api-${timestamp}@example.com`,
    password: 'testpassword123',
    name: 'Test API User'
  };
  
  try {
    // Тест регистрации
    console.log('📝 Регистрация пользователя:', testUser.email);
    
    const registerOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const registerResponse = await makeRequest(registerOptions, testUser);
    console.log('📊 Ответ регистрации:', {
      status: registerResponse.status,
      data: registerResponse.data
    });
    
    if (registerResponse.status === 201) {
      console.log('✅ Регистрация успешна!');
      
      // Тест входа
      console.log('🔐 Тестирование входа...');
      
      const loginOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      const loginData = {
        email: testUser.email,
        password: testUser.password
      };
      
      const loginResponse = await makeRequest(loginOptions, loginData);
      console.log('📊 Ответ входа:', {
        status: loginResponse.status,
        data: loginResponse.data
      });
      
      if (loginResponse.status === 200) {
        console.log('✅ Вход успешен!');
        console.log('🎉 Все API тесты прошли успешно!');
      } else {
        console.log('❌ Ошибка входа');
      }
    } else {
      console.log('❌ Ошибка регистрации');
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

// Запуск тестов
testUserRegistration();