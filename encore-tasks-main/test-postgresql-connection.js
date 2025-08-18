const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Загрузка переменных окружения из .env файла
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Файл .env не найден!');
    return {};
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  });
  
  return env;
}

// Основная функция тестирования
async function testPostgreSQLConnection() {
  console.log('🔍 Тестирование подключения к PostgreSQL...');
  console.log('=' .repeat(50));

  // Загрузка конфигурации
  const env = loadEnvFile();
  
  const config = {
    host: env.POSTGRES_HOST || 'localhost',
    port: parseInt(env.POSTGRES_PORT) || 5432,
    database: env.POSTGRES_DB || 'encore_tasks',
    user: env.POSTGRES_USER || 'postgres',
    password: env.POSTGRES_PASSWORD || ''
  };

  console.log('📋 Конфигурация подключения:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Database: ${config.database}`);
  console.log(`   User: ${config.user}`);
  console.log(`   Password: ${config.password ? '***' : 'НЕ УСТАНОВЛЕН'}`);
  console.log('');

  // Проверка обязательных параметров
  if (!config.password) {
    console.error('❌ ОШИБКА: Пароль PostgreSQL не установлен в .env файле!');
    console.log('💡 Рекомендация: Добавьте POSTGRES_PASSWORD в .env файл');
    return;
  }

  const pool = new Pool(config);

  try {
    // Тест 1: Базовое подключение
    console.log('🔗 Тест 1: Проверка подключения...');
    const client = await pool.connect();
    console.log('✅ Подключение к PostgreSQL успешно установлено!');
    
    // Тест 2: Выполнение базового запроса
    console.log('\n⏰ Тест 2: Выполнение базового запроса...');
    const timeResult = await client.query('SELECT NOW() as current_time');
    console.log(`✅ Текущее время сервера: ${timeResult.rows[0].current_time}`);
    
    // Тест 3: Проверка версии PostgreSQL
    console.log('\n🔢 Тест 3: Проверка версии PostgreSQL...');
    const versionResult = await client.query('SELECT version()');
    console.log(`✅ Версия PostgreSQL: ${versionResult.rows[0].version}`);
    
    // Тест 4: Проверка существования основных таблиц
    console.log('\n📊 Тест 4: Проверка существования таблиц...');
    const tables = ['users', 'projects', 'boards', 'tasks', 'sessions'];
    const tableResults = {};
    
    for (const table of tables) {
      try {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `, [table]);
        
        tableResults[table] = result.rows[0].exists;
        const status = result.rows[0].exists ? '✅' : '❌';
        console.log(`   ${status} Таблица '${table}': ${result.rows[0].exists ? 'существует' : 'НЕ НАЙДЕНА'}`);
      } catch (error) {
        tableResults[table] = false;
        console.log(`   ❌ Ошибка при проверке таблицы '${table}': ${error.message}`);
      }
    }
    
    // Тест 5: Проверка структуры таблиц (если они существуют)
    console.log('\n🏗️ Тест 5: Проверка структуры таблиц...');
    for (const table of tables) {
      if (tableResults[table]) {
        try {
          const columnsResult = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
          `, [table]);
          
          console.log(`   📋 Таблица '${table}' (${columnsResult.rows.length} колонок):`);
          columnsResult.rows.forEach(col => {
            console.log(`      - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
          });
        } catch (error) {
          console.log(`   ❌ Ошибка при получении структуры таблицы '${table}': ${error.message}`);
        }
      }
    }
    
    client.release();
    
    // Итоговый отчет
    console.log('\n' + '=' .repeat(50));
    console.log('📈 ИТОГОВЫЙ ОТЧЕТ:');
    console.log('✅ Подключение к PostgreSQL: УСПЕШНО');
    console.log('✅ Выполнение запросов: УСПЕШНО');
    
    const existingTables = Object.values(tableResults).filter(Boolean).length;
    const totalTables = tables.length;
    console.log(`📊 Таблицы: ${existingTables}/${totalTables} найдено`);
    
    if (existingTables === 0) {
      console.log('\n⚠️ ВНИМАНИЕ: Ни одна из основных таблиц не найдена!');
      console.log('💡 Рекомендации:');
      console.log('   1. Выполните миграции базы данных');
      console.log('   2. Проверьте файлы в папке supabase/migrations/');
      console.log('   3. Убедитесь, что схема базы данных создана правильно');
    } else if (existingTables < totalTables) {
      console.log('\n⚠️ ВНИМАНИЕ: Некоторые таблицы отсутствуют!');
      console.log('💡 Рекомендация: Проверьте и выполните недостающие миграции');
    } else {
      console.log('\n🎉 ВСЕ ОСНОВНЫЕ ТАБЛИЦЫ НАЙДЕНЫ!');
      console.log('✅ База данных готова к использованию');
    }
    
  } catch (error) {
    console.error('\n❌ ОШИБКА ПОДКЛЮЧЕНИЯ К POSTGRESQL:');
    console.error(`   ${error.message}`);
    console.log('\n💡 РЕКОМЕНДАЦИИ ПО УСТРАНЕНИЮ:');
    
    if (error.code === 'ECONNREFUSED') {
      console.log('   1. Убедитесь, что PostgreSQL сервер запущен');
      console.log('   2. Проверьте правильность хоста и порта');
      console.log('   3. Проверьте настройки файрвола');
    } else if (error.code === 'ENOTFOUND') {
      console.log('   1. Проверьте правильность хоста в .env файле');
      console.log('   2. Убедитесь в доступности сервера PostgreSQL');
    } else if (error.message.includes('password authentication failed')) {
      console.log('   1. Проверьте правильность пароля в .env файле');
      console.log('   2. Убедитесь, что пользователь существует в PostgreSQL');
      console.log('   3. Проверьте права доступа пользователя');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.log('   1. Создайте базу данных в PostgreSQL');
      console.log('   2. Проверьте правильность имени базы данных в .env');
    } else {
      console.log('   1. Проверьте все параметры подключения в .env файле');
      console.log('   2. Убедитесь, что PostgreSQL сервер доступен');
      console.log('   3. Проверьте логи PostgreSQL для дополнительной информации');
    }
  } finally {
    await pool.end();
  }
}

// Запуск тестирования
if (require.main === module) {
  testPostgreSQLConnection()
    .then(() => {
      console.log('\n🏁 Тестирование завершено.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Критическая ошибка:', error.message);
      process.exit(1);
    });
}

module.exports = { testPostgreSQLConnection };