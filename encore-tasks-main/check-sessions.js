const Database = require('better-sqlite3');
const path = require('path');

async function checkSessions() {
  try {
    console.log('🔍 Проверяем таблицу sessions...');
    
    const dbPath = path.join(__dirname, 'database.sqlite');
    const db = new Database(dbPath);
    
    // Проверяем, существует ли таблица sessions
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'").all();
    
    if (tables.length === 0) {
      console.log('❌ Таблица sessions не существует!');
      db.close();
      return;
    }
    
    console.log('✅ Таблица sessions существует');
    
    // Получаем структуру таблицы
    const schema = db.prepare('PRAGMA table_info(sessions)').all();
    console.log('\n📋 Структура таблицы sessions:');
    schema.forEach(col => {
      console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // Получаем все сессии
    const sessions = db.prepare('SELECT * FROM sessions ORDER BY created_at DESC LIMIT 10').all();
    
    console.log(`\n📊 Найдено сессий: ${sessions.length}`);
    
    if (sessions.length > 0) {
      console.log('\n🔍 Последние сессии:');
      sessions.forEach((session, index) => {
        console.log(`\n${index + 1}. ID: ${session.id}`);
        console.log(`   User ID: ${session.user_id}`);
        console.log(`   Token: ${session.token ? session.token.substring(0, 50) + '...' : 'null'}`);
        console.log(`   Created: ${session.created_at}`);
        console.log(`   Expires: ${session.expires_at}`);
      });
    } else {
      console.log('\n❌ В таблице sessions нет записей!');
    }
    
    db.close();
    
  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    console.error('Полная ошибка:', error);
  }
}

// Запускаем проверку
checkSessions();