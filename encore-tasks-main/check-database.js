// Скрипт для проверки текущей базы данных
const path = require('path');
const fs = require('fs');

// Простая проверка через переменные окружения и файлы конфигурации
async function checkDatabase() {
  try {
    console.log('🔍 Проверяем текущую базу данных...');
    
    // Проверяем переменные окружения
    const envPath = path.join(__dirname, '.env.local');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      console.log('📄 Найден .env.local файл');
    } else {
      console.log('⚠️ .env.local файл не найден');
    }
    
    // Проверяем наличие PostgreSQL переменных
    const hasPostgres = envContent.includes('DATABASE_URL') || 
                       envContent.includes('POSTGRES') ||
                       process.env.DATABASE_URL ||
                       process.env.POSTGRES_URL;
    
    // Проверяем наличие SQLite файлов
    const sqliteFiles = [
      path.join(__dirname, 'database.sqlite'),
      path.join(__dirname, 'database', 'database.sqlite'),
      path.join(__dirname, 'src', 'database.sqlite')
    ];
    
    const hasSqlite = sqliteFiles.some(file => fs.existsSync(file));
    
    console.log('📊 Анализ базы данных:');
    console.log('  PostgreSQL переменные:', hasPostgres ? '✅ Найдены' : '❌ Не найдены');
    console.log('  SQLite файлы:', hasSqlite ? '✅ Найдены' : '❌ Не найдены');
    
    if (hasPostgres) {
      console.log('🎯 Вероятно используется: PostgreSQL');
    } else if (hasSqlite) {
      console.log('🎯 Вероятно используется: SQLite');
      console.log('⚠️ Нужно проверить схему таблицы users в SQLite');
    } else {
      console.log('❓ Не удалось определить тип базы данных');
    }
    
    // Проверяем содержимое .env.local
    if (envContent) {
      console.log('\n📋 Переменные окружения:');
      const lines = envContent.split('\n').filter(line => 
        line.trim() && !line.startsWith('#') && 
        (line.includes('DATABASE') || line.includes('POSTGRES') || line.includes('SQLITE'))
      );
      lines.forEach(line => {
        const [key] = line.split('=');
        console.log(`  ${key}=***`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка при проверке базы данных:', error);
  }
}

checkDatabase();