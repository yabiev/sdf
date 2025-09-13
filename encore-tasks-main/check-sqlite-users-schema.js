// Скрипт для проверки схемы таблицы users в SQLite
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('🔍 Начинаем проверку схемы таблицы users в SQLite...');

const dbPath = path.join(__dirname, 'database.sqlite');
console.log('📁 Путь к базе данных:', dbPath);

// Проверяем существование файла
if (!fs.existsSync(dbPath)) {
  console.log('❌ Файл database.sqlite не найден');
  process.exit(1);
}

console.log('✅ Файл database.sqlite найден');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Ошибка подключения к SQLite:', err.message);
    process.exit(1);
  }
  console.log('✅ Подключение к SQLite установлено');
  
  // Получаем информацию о таблице users
  db.all("PRAGMA table_info(users)", (err, rows) => {
    if (err) {
      console.error('❌ Ошибка получения схемы таблицы users:', err.message);
      db.close();
      process.exit(1);
    }
    
    if (rows.length === 0) {
      console.log('⚠️ Таблица users не найдена');
    } else {
      console.log('\n📋 Схема таблицы users:');
      console.log('┌─────┬──────────────────┬──────────────┬─────────┬─────────────┬────────┐');
      console.log('│ cid │ name             │ type         │ notnull │ dflt_value  │ pk     │');
      console.log('├─────┼──────────────────┼──────────────┼─────────┼─────────────┼────────┤');
      
      rows.forEach(row => {
        const cid = String(row.cid).padEnd(3);
        const name = String(row.name).padEnd(16);
        const type = String(row.type).padEnd(12);
        const notnull = String(row.notnull).padEnd(7);
        const dflt_value = String(row.dflt_value || '').padEnd(11);
        const pk = String(row.pk).padEnd(6);
        
        console.log(`│ ${cid} │ ${name} │ ${type} │ ${notnull} │ ${dflt_value} │ ${pk} │`);
      });
      
      console.log('└─────┴──────────────────┴──────────────┴─────────┴─────────────┴────────┘');
      
      // Проверяем наличие колонки avatar
      const hasAvatar = rows.some(row => row.name === 'avatar');
      console.log('\n🎯 Результат проверки:');
      console.log('  Колонка avatar:', hasAvatar ? '✅ Найдена' : '❌ Отсутствует');
      
      if (!hasAvatar) {
        console.log('\n💡 Рекомендация: Нужно убрать колонку avatar из INSERT запроса в SQLite адаптере');
      }
    }
    
    db.close((err) => {
      if (err) {
        console.error('❌ Ошибка закрытия соединения:', err.message);
      } else {
        console.log('\n✅ Соединение с базой данных закрыто');
      }
    });
  });
});