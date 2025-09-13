const Database = require('better-sqlite3');
const path = require('path');

async function checkLatestSession() {
  try {
    console.log('🔍 Проверяем самую новую сессию...');
    
    const dbPath = path.join(__dirname, 'database.sqlite');
    const db = new Database(dbPath);
    
    // Получаем самую новую сессию
    const latestSession = db.prepare('SELECT * FROM sessions ORDER BY created_at DESC LIMIT 1').get();
    
    if (latestSession) {
      console.log('\n🆕 Самая новая сессия:');
      console.log(`ID: ${latestSession.id}`);
      console.log(`User ID: ${latestSession.user_id}`);
      console.log(`Token: ${latestSession.token ? latestSession.token.substring(0, 50) + '...' : 'null'}`);
      console.log(`Created: ${latestSession.created_at}`);
      console.log(`Expires: ${latestSession.expires_at}`);
      
      // Проверим, совпадает ли токен с тем, что мы только что получили
      const expectedTokenStart = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkMDEyYjA3OS01Nzk4LTQ5ZDUtOGNmZi0wZTFkYmVhNTgyMmUiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwidGltZXN0YW1wIjoxNzU2MjMzOTA4OTUzLCJyYW5kb20iOiJiem9pbXV1OHg2YiIsImlhdCI6MTc1NjIzMzkwOCwiZXhwIjoxNzU2ODM4NzA4fQ.JDVShQyWlCNqLWz_uxz9YQudIHyC7naxMUHaGCsSIgM';
      
      if (latestSession.token === expectedTokenStart) {
        console.log('✅ Токен совпадает с только что полученным!');
      } else {
        console.log('❌ Токен НЕ совпадает с только что полученным');
        console.log('Ожидаемый токен:', expectedTokenStart.substring(0, 50) + '...');
        console.log('Токен в БД:', latestSession.token ? latestSession.token.substring(0, 50) + '...' : 'null');
      }
    } else {
      console.log('❌ Сессии не найдены!');
    }
    
    // Также проверим общее количество сессий
    const totalSessions = db.prepare('SELECT COUNT(*) as count FROM sessions').get();
    console.log(`\n📊 Общее количество сессий: ${totalSessions.count}`);
    
    db.close();
    
  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    console.error('Полная ошибка:', error);
  }
}

// Запускаем проверку
checkLatestSession();