const http = require('http');

// Актуальный токен из логов сервера
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzYTAyOGRkNS01MzI3LTQ1N2EtYjhkNC0xMWM3ZTJjNzA2Y2UiLCJlbWFpbCI6ImF4ZWxlbmNvcmVAbWFpbC5ydSIsInRpbWVzdGFtcCI6MTc1NjIxNzA5MjI4MiwicmFuZG9tIjoiMGVjbXI1a3RpNnE4IiwiaWF0IjoxNzU2MjE3MDkyLCJleHAiOjE3NTY4MjE4OTJ9.1Nxz5EyRp_luEdxpZX_lEaST8kucRsA8hMA2lYtGrTs';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/projects',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

console.log('🚀 Получаю список проектов...');
console.log('🔑 Токен:', token.substring(0, 50) + '...');

const req = http.request(options, (res) => {
  console.log(`📈 Статус ответа: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 Ответ сервера:');
    try {
      const response = JSON.parse(data);
      console.log(JSON.stringify(response, null, 2));
      
      if (response.success && response.data && response.data.length > 0) {
        console.log('\n🎯 Найденные проекты:');
        response.data.forEach((project, index) => {
          console.log(`${index + 1}. ID: ${project.id}, Название: ${project.name}`);
        });
        console.log('\n✅ Используйте один из этих project_id для создания доски');
      }
    } catch (e) {
      console.log('Сырой ответ:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Ошибка запроса: ${e.message}`);
});

req.end();