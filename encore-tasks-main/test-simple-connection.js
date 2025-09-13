const http = require('http');

console.log('🔍 Простая проверка подключения к серверу...');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log(`✅ Подключение успешно! Статус: ${res.statusCode}`);
  console.log('📋 Заголовки:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`📄 Размер ответа: ${data.length} символов`);
    console.log('🎯 Первые 200 символов ответа:');
    console.log(data.substring(0, 200));
    console.log('\n🎉 Тест завершен успешно!');
  });
});

req.on('error', (error) => {
  console.error('❌ Ошибка подключения:', error.message);
});

req.on('timeout', () => {
  console.error('⏰ Таймаут подключения');
  req.destroy();
});

req.setTimeout(5000);
req.end();

console.log('⏳ Отправляем запрос...');