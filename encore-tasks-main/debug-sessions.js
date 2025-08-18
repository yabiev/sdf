const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const path = require('path');

// Конфигурация
const DB_PATH = path.join(__dirname, 'database.db');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

console.log('🔍 Диагностика проблемы с сессиями...');
console.log('📁 Путь к базе данных:', DB_PATH);

try {
    // Подключение к базе данных
    const db = new Database(DB_PATH);
    console.log('✅ Подключение к SQLite успешно');
    
    // Проверка структуры таблицы user_sessions
    console.log('\n📋 Структура таблицы user_sessions:');
    const tableInfo = db.prepare("PRAGMA table_info(user_sessions)").all();
    console.table(tableInfo);
    
    // Проверка всех записей в таблице user_sessions
    console.log('\n📊 Все записи в таблице user_sessions:');
    const allSessions = db.prepare('SELECT * FROM user_sessions').all();
    console.log('Количество сессий:', allSessions.length);
    
    if (allSessions.length > 0) {
        console.table(allSessions);
        
        // Проверим последнюю сессию
        const lastSession = allSessions[allSessions.length - 1];
        console.log('\n🔍 Анализ последней сессии:');
        console.log('ID сессии:', lastSession.id);
        console.log('Токен сессии:', lastSession.session_token ? lastSession.session_token.substring(0, 50) + '...' : 'НЕТ');
        console.log('ID пользователя:', lastSession.user_id);
        console.log('Время создания:', lastSession.created_at);
        console.log('Время истечения:', lastSession.expires_at);
        
        // Проверим, не истекла ли сессия
        const now = new Date();
        const expiresAt = new Date(lastSession.expires_at);
        console.log('Текущее время:', now.toISOString());
        console.log('Сессия истекла?', now > expiresAt ? 'ДА' : 'НЕТ');
        
        // Попробуем найти сессию по токену
        if (lastSession.session_token) {
            console.log('\n🔍 Тестирование поиска сессии по токену...');
            const foundSession = db.prepare('SELECT * FROM user_sessions WHERE session_token = ?').get(lastSession.session_token);
            console.log('Сессия найдена по токену?', foundSession ? 'ДА' : 'НЕТ');
            
            if (foundSession) {
                console.log('Найденная сессия:', foundSession);
            }
        }
    } else {
        console.log('❌ Таблица user_sessions пуста');
    }
    
    // Проверка таблицы users
    console.log('\n👥 Проверка таблицы users:');
    const users = db.prepare('SELECT id, email, created_at FROM users LIMIT 5').all();
    console.log('Количество пользователей:', users.length);
    if (users.length > 0) {
        console.table(users);
    }
    
    // Тест создания новой сессии
    console.log('\n🧪 Тестирование создания новой сессии...');
    const testUserId = users.length > 0 ? users[0].id : 'test-user-id';
    const testToken = 'test-session-token-' + Date.now();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа
    
    try {
        const insertResult = db.prepare(`
            INSERT INTO user_sessions (session_token, user_id, expires_at, created_at)
            VALUES (?, ?, ?, ?)
        `).run(testToken, testUserId, expiresAt.toISOString(), new Date().toISOString());
        
        console.log('✅ Тестовая сессия создана:', insertResult);
        
        // Попробуем найти созданную сессию
        const foundTestSession = db.prepare('SELECT * FROM user_sessions WHERE session_token = ?').get(testToken);
        console.log('Тестовая сессия найдена?', foundTestSession ? 'ДА' : 'НЕТ');
        
        if (foundTestSession) {
            console.log('Найденная тестовая сессия:', foundTestSession);
            
            // Удаляем тестовую сессию
            db.prepare('DELETE FROM user_sessions WHERE session_token = ?').run(testToken);
            console.log('🗑️ Тестовая сессия удалена');
        }
    } catch (error) {
        console.error('❌ Ошибка при создании тестовой сессии:', error.message);
    }
    
    db.close();
    console.log('\n✅ Диагностика завершена');
    
} catch (error) {
    console.error('❌ Ошибка при диагностике:', error.message);
    console.error('Стек ошибки:', error.stack);
}