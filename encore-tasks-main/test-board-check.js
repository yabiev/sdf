const fetch = require('node-fetch');

// Проверка существования board с ID '1'
async function testBoardExists() {
  try {
    console.log('Проверка существования board с ID "1"...');
    
    // Получаем JWT токен
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);
    
    if (!loginData.token) {
      throw new Error('Не удалось получить токен');
    }
    
    // Проверяем все boards
    const boardsResponse = await fetch('http://localhost:3000/api/boards', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Boards response status:', boardsResponse.status);
    const boardsData = await boardsResponse.json();
    console.log('Boards data:', JSON.stringify(boardsData, null, 2));
    
    // Проверяем конкретный board с ID '1'
    const boardResponse = await fetch('http://localhost:3000/api/boards/1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Board 1 response status:', boardResponse.status);
    const boardData = await boardResponse.json();
    console.log('Board 1 data:', JSON.stringify(boardData, null, 2));
    
  } catch (error) {
    console.error('Ошибка при проверке board:', error.message);
  }
}

testBoardExists();