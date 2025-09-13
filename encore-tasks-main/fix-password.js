// Нужно использовать прямой доступ к базе данных
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

function fixPassword() {
  console.log('🔧 Исправление пароля для пользователя test@example.com...');
  
  const dbPath = path.join(__dirname, 'database.sqlite');
  const db = new Database(dbPath);
  
  try {
    // Проверяем текущий хеш пароля
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get('test@example.com');
    if (!user) {
      console.log('❌ Пользователь не найден');
      return;
    }
    
    console.log('👤 Пользователь найден:', user.email);
    console.log('🔐 Текущий хеш пароля:', user.password_hash?.substring(0, 20) + '...');
    
    // Создаем новый хеш для пароля 'password123'
    const newPasswordHash = bcrypt.hashSync('password123', 12);
    console.log('🔑 Новый хеш пароля:', newPasswordHash.substring(0, 20) + '...');
    
    // Обновляем пароль в базе данных
    const updateStmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    updateStmt.run(newPasswordHash, user.id);
    console.log('✅ Пароль успешно обновлен');
    
    // Проверяем, что пароль теперь работает
    const isValid = bcrypt.compareSync('password123', newPasswordHash);
    console.log('🔍 Проверка нового пароля:', isValid ? '✅ Валиден' : '❌ Не валиден');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    db.close();
  }
}

try {
  fixPassword();
  console.log('🏁 Завершено');
} catch (error) {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
}