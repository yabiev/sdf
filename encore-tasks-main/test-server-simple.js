const http = require('http');

console.log('🔍 Проверка работы сервера на localhost:3001...');

// Проверяем главную страницу
const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`✅ Сервер отвечает! Статус: ${res.statusCode}`);
  console.log(`📋 Заголовки:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`📄 Размер ответа: ${data.length} символов`);
    if (data.includes('html')) {
      console.log('✅ HTML страница загружается корректно');
    } else {
      console.log('❌ Ответ не содержит HTML');
      console.log('📋 Первые 500 символов:', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Ошибка подключения к серверу: ${e.message}`);
  console.log('💡 Убедитесь, что сервер запущен на порту 3001');
});

req.setTimeout(5000, () => {
  console.log('⏰ Таймаут подключения к серверу');
  req.destroy();
});