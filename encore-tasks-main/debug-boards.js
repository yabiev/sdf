const http = require('http');

const BASE_URL = 'http://localhost:3002';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInRpbWVzdGFtcCI6MTc1NzE1NDg3NTM1MCwicmFuZG9tIjoiandoYm1jdG81MiIsImlhdCI6MTc1NzE1NDg3NSwiZXhwIjoxNzU3NzU5Njc1fQ.EiOIYsAqC82DundGe4rMtKM37sBUplv2gS6NbLFv9m8';

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    };

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

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function debugBoards() {
  console.log('🔍 Отладка структуры ответа API boards...');
  
  try {
    const boardsResult = await makeRequest('/api/boards');
    console.log(`\n📊 Статус: ${boardsResult.status}`);
    console.log('📄 Полный ответ:');
    console.log(JSON.stringify(boardsResult.data, null, 2));
    
    if (boardsResult.data) {
      console.log('\n🔍 Анализ структуры:');
      console.log(`- Тип данных: ${typeof boardsResult.data}`);
      console.log(`- Ключи объекта: ${Object.keys(boardsResult.data)}`);
      
      // Проверим разные возможные структуры
      if (boardsResult.data.boards) {
        console.log(`- boardsResult.data.boards: ${Array.isArray(boardsResult.data.boards)} (массив: ${boardsResult.data.boards.length} элементов)`);
        if (boardsResult.data.boards.length > 0) {
          console.log('- Первая доска:', JSON.stringify(boardsResult.data.boards[0], null, 2));
        }
      }
      
      if (Array.isArray(boardsResult.data)) {
        console.log(`- Прямой массив: ${boardsResult.data.length} элементов`);
        if (boardsResult.data.length > 0) {
          console.log('- Первая доска:', JSON.stringify(boardsResult.data[0], null, 2));
        }
      }
      
      if (boardsResult.data.data) {
        console.log(`- boardsResult.data.data: ${typeof boardsResult.data.data}`);
        if (Array.isArray(boardsResult.data.data)) {
          console.log(`- Массив в data: ${boardsResult.data.data.length} элементов`);
        }
      }
    }
    
  } catch (error) {
    console.log(`❌ Ошибка: ${error.message}`);
  }
}

debugBoards().catch(console.error);