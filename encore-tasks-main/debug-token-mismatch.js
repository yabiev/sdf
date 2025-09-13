const Database = require('better-sqlite3');
const path = require('path');

async function debugTokenMismatch() {
  try {
    console.log('🔍 Отладка несоответствия токенов...');
    
    // Токен из test-board-creation.js
    const expectedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkMDEyYjA3OS01Nzk4LTQ5ZDUtOGNmZi0wZTFkYmVhNTgyMmUiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwidGltZXN0YW1wIjoxNzU2MjM0NjkzNzQwLCJyYW5kb20iOiIxY2RheHBtcGkwdCIsImlhdCI6MTc1NjIzNDY5MywiZXhwIjoxNzU2ODM5NDkzfQ.H_rjpq61Mld2b7LaUxcVQl9Rf6qQgwBcmtPDByQNylo';
    
    console.log('\n📋 Ожидаемый токен:');
    console.log('Длина:', expectedToken.length);
    console.log('Первые 50 символов:', expectedToken.substring(0, 50));
    console.log('Последние 50 символов:', expectedToken.substring(expectedToken.length - 50));
    
    // Подключаемся к базе данных
    const dbPath = path.join(__dirname, 'database.sqlite');
    const db = new Database(dbPath);
    
    // Получаем последние 3 сессии
    const sessions = db.prepare(`
      SELECT id, user_id, token, created_at, expires_at 
      FROM sessions 
      ORDER BY created_at DESC 
      LIMIT 3
    `).all();
    
    console.log('\n📊 Последние 3 сессии в БД:');
    sessions.forEach((session, index) => {
      console.log(`\n${index + 1}. Сессия ID: ${session.id}`);
      console.log(`   User ID: ${session.user_id}`);
      console.log(`   Создана: ${session.created_at}`);
      console.log(`   Истекает: ${session.expires_at}`);
      
      if (session.token) {
        console.log(`   Токен длина: ${session.token.length}`);
        console.log(`   Токен первые 50: ${session.token.substring(0, 50)}`);
        console.log(`   Токен последние 50: ${session.token.substring(session.token.length - 50)}`);
        
        const matches = session.token === expectedToken;
        console.log(`   ✅ Совпадает с ожидаемым: ${matches ? 'ДА' : 'НЕТ'}`);
        
        if (!matches) {
          console.log(`   🔍 Различия найдены на позициях:`);
          for (let i = 0; i < Math.max(session.token.length, expectedToken.length); i++) {
            if (session.token[i] !== expectedToken[i]) {
              console.log(`      Позиция ${i}: БД='${session.token[i] || 'undefined'}' vs Ожидаемый='${expectedToken[i] || 'undefined'}'`);
              if (i > 5) break; // Показываем только первые несколько различий
            }
          }
        }
      } else {
        console.log(`   ❌ Токен отсутствует (null)`);
      }
    });
    
    // Попробуем найти точное совпадение
    const exactMatch = db.prepare('SELECT * FROM sessions WHERE token = ?