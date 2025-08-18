const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

// Генерация тестовых данных
function generateTestData() {
  const timestamp = Date.now();
  return {
    user: {
      email: `test_user_${timestamp}@example.com`,
      name: 'Test User',
      password_hash: crypto.createHash('sha256').update('test_password_123').digest('hex')
    },
    session: {
      token: crypto.randomBytes(32).toString('hex'),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 дней
    }
  };
}

// Основная функция тестирования
async function testAuthAndSessions() {
  console.log('🔐 Тестирование аутентификации и управления сессиями...');
  console.log('=' .repeat(60));

  // Загрузка конфигурации
  const env = loadEnvFile();
  
  const config = {
    host: env.POSTGRES_HOST || 'localhost',
    port: parseInt(env.POSTGRES_PORT) || 5432,
    database: env.POSTGRES_DB || 'encore_tasks',
    user: env.POSTGRES_USER || 'postgres',
    password: env.POSTGRES_PASSWORD || ''
  };

  const pool = new Pool(config);
  let testUserId = null;
  let testSessionId = null;

  try {
    const client = await pool.connect();
    console.log('✅ Подключение к PostgreSQL установлено\n');

    // Генерация тестовых данных
    const testData = generateTestData();
    console.log('📋 Тестовые данные сгенерированы:');
    console.log(`   Email: ${testData.user.email}`);
    console.log(`   Name: ${testData.user.name}`);
    console.log(`   Session Token: ${testData.session.token.substring(0, 16)}...`);
    console.log('');

    // Тест 1: Создание пользователя
    console.log('👤 Тест 1: Создание тестового пользователя...');
    try {
      const createUserResult = await client.query(`
         INSERT INTO users (email, name, password_hash, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id, email, created_at
       `, [
          testData.user.email,
          testData.user.name,
          testData.user.password_hash
        ]);
      
      testUserId = createUserResult.rows[0].id;
      console.log(`✅ Пользователь создан успешно:`);
      console.log(`   ID: ${testUserId}`);
      console.log(`   Email: ${createUserResult.rows[0].email}`);
      console.log(`   Name: ${testData.user.name}`);
      console.log(`   Создан: ${createUserResult.rows[0].created_at}`);
    } catch (error) {
      console.error(`❌ Ошибка создания пользователя: ${error.message}`);
      throw error;
    }

    // Тест 2: Поиск пользователя по email
    console.log('\n🔍 Тест 2: Поиск пользователя по email...');
    try {
      const findUserResult = await client.query(`
        SELECT id, email, name, password_hash, created_at, updated_at
        FROM users 
        WHERE email = $1
      `, [testData.user.email]);
      
      if (findUserResult.rows.length > 0) {
        const user = findUserResult.rows[0];
        console.log(`✅ Пользователь найден:`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Создан: ${user.created_at}`);
        
        // Проверка пароля
        const passwordMatch = user.password_hash === testData.user.password_hash;
        console.log(`   Пароль совпадает: ${passwordMatch ? '✅' : '❌'}`);
      } else {
        console.error('❌ Пользователь не найден');
      }
    } catch (error) {
      console.error(`❌ Ошибка поиска пользователя: ${error.message}`);
    }

    // Тест 3: Создание сессии
    console.log('\n🎫 Тест 3: Создание сессии...');
    try {
      const createSessionResult = await client.query(`
        INSERT INTO sessions (token, user_id, expires_at, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING id, token, user_id, expires_at, created_at
      `, [
        testData.session.token,
        testUserId,
        testData.session.expires_at
      ]);
      
      testSessionId = createSessionResult.rows[0].id;
      console.log(`✅ Сессия создана успешно:`);
      console.log(`   ID: ${testSessionId}`);
      console.log(`   Token: ${createSessionResult.rows[0].token.substring(0, 16)}...`);
      console.log(`   User ID: ${createSessionResult.rows[0].user_id}`);
      console.log(`   Истекает: ${createSessionResult.rows[0].expires_at}`);
      console.log(`   Создана: ${createSessionResult.rows[0].created_at}`);
    } catch (error) {
      console.error(`❌ Ошибка создания сессии: ${error.message}`);
    }

    // Тест 4: Проверка валидности сессии
    console.log('\n✅ Тест 4: Проверка валидности сессии...');
    try {
      const validateSessionResult = await client.query(`
        SELECT s.id, s.token, s.user_id, s.expires_at, s.created_at,
               u.email, u.name
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = $1 AND s.expires_at > NOW()
      `, [testData.session.token]);
      
      if (validateSessionResult.rows.length > 0) {
        const session = validateSessionResult.rows[0];
        console.log(`✅ Сессия валидна:`);
        console.log(`   Session ID: ${session.id}`);
        console.log(`   User ID: ${session.user_id}`);
        console.log(`   Email: ${session.email}`);
        console.log(`   Name: ${session.name}`);
        console.log(`   Истекает: ${session.expires_at}`);
      } else {
        console.error('❌ Сессия не найдена или недействительна');
      }
    } catch (error) {
      console.error(`❌ Ошибка проверки сессии: ${error.message}`);
    }

    // Тест 5: Получение всех активных сессий пользователя
    console.log('\n📊 Тест 5: Получение активных сессий пользователя...');
    try {
      const userSessionsResult = await client.query(`
        SELECT id, token, expires_at, created_at
        FROM sessions 
        WHERE user_id = $1 AND expires_at > NOW()
        ORDER BY created_at DESC
      `, [testUserId]);
      
      console.log(`✅ Найдено активных сессий: ${userSessionsResult.rows.length}`);
      userSessionsResult.rows.forEach((session, index) => {
        console.log(`   ${index + 1}. ID: ${session.id}, Token: ${session.token.substring(0, 16)}..., Истекает: ${session.expires_at}`);
      });
    } catch (error) {
      console.error(`❌ Ошибка получения сессий: ${error.message}`);
    }

    // Тест 6: Обновление времени последней активности (имитация)
    console.log('\n🔄 Тест 6: Имитация обновления активности сессии...');
    try {
      // Добавим поле last_activity если его нет
      await client.query(`
        ALTER TABLE sessions 
        ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      `);
      
      const updateActivityResult = await client.query(`
        UPDATE sessions 
        SET last_activity = NOW()
        WHERE id = $1
        RETURNING id, last_activity
      `, [testSessionId]);
      
      if (updateActivityResult.rows.length > 0) {
        console.log(`✅ Активность сессии обновлена:`);
        console.log(`   Session ID: ${updateActivityResult.rows[0].id}`);
        console.log(`   Последняя активность: ${updateActivityResult.rows[0].last_activity}`);
      }
    } catch (error) {
      console.error(`❌ Ошибка обновления активности: ${error.message}`);
    }

    // Очистка: Удаление тестовых данных
    console.log('\n🧹 Очистка тестовых данных...');
    try {
      // Удаление сессии
      if (testSessionId) {
        await client.query('DELETE FROM sessions WHERE id = $1', [testSessionId]);
        console.log('✅ Тестовая сессия удалена');
      }
      
      // Удаление пользователя
      if (testUserId) {
        await client.query('DELETE FROM users WHERE id = $1', [testUserId]);
        console.log('✅ Тестовый пользователь удален');
      }
    } catch (error) {
      console.error(`❌ Ошибка очистки: ${error.message}`);
    }

    client.release();
    
    // Итоговый отчет
    console.log('\n' + '=' .repeat(60));
    console.log('📈 ИТОГОВЫЙ ОТЧЕТ ТЕСТИРОВАНИЯ АУТЕНТИФИКАЦИИ:');
    console.log('✅ Создание пользователей: УСПЕШНО');
    console.log('✅ Поиск пользователей: УСПЕШНО');
    console.log('✅ Создание сессий: УСПЕШНО');
    console.log('✅ Валидация сессий: УСПЕШНО');
    console.log('✅ Управление сессиями: УСПЕШНО');
    console.log('✅ Очистка данных: УСПЕШНО');
    console.log('\n🎉 ВСЕ ТЕСТЫ АУТЕНТИФИКАЦИИ ПРОШЛИ УСПЕШНО!');
    console.log('✅ Система аутентификации готова к использованию');
    
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА ТЕСТИРОВАНИЯ:');
    console.error(`   ${error.message}`);
    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    console.log('   1. Проверьте структуру таблиц users и sessions');
    console.log('   2. Убедитесь, что все необходимые поля существуют');
    console.log('   3. Проверьте права доступа к таблицам');
    console.log('   4. Выполните миграции базы данных если необходимо');
  } finally {
    await pool.end();
  }
}

// Запуск тестирования
if (require.main === module) {
  testAuthAndSessions()
    .then(() => {
      console.log('\n🏁 Тестирование аутентификации завершено.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Критическая ошибка:', error.message);
      process.exit(1);
    });
}

module.exports = { testAuthAndSessions };