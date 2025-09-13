const Database = require('better-sqlite3');
const path = require('path');

try {
  const dbPath = path.join(__dirname, 'database.db');
  const db = new Database(dbPath);
  
  console.log('🔍 Тестирование getUserByEmail...');
  
  // Прямой SQL запрос
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  const user = stmt.get('test@example.com');
  
  console.log('👤 Результат прямого SQL запроса:');
  console.log(user);
  
  if (user) {
    console.log('\n✅ Пользователь найден!');
    console.log('📋 Детали:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Name:', user.name);
    console.log('  Password hash:', user.password_hash ? 'есть' : 'отсутствует');
    console.log('  Role:', user.role);
    
    // Тест пароля
    if (user.password_hash) {
      const bcrypt = require('bcryptjs');
      const isValid = bcrypt.compareSync('password123', user.password_hash);
      console.log('  Пароль password123 валиден:', isValid);
    }
  } else {
    console.log('❌ Пользователь не найден!');
  }
  
  db.close();
  
} catch (error) {
  console.error('❌ Ошибка:', error.message);
}