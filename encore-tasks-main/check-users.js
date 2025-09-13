import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('./database.sqlite');

try {
  console.log('👥 Пользователи в базе данных:');
  const users = db.prepare('SELECT * FROM users').all();
  
  if (users.length === 0) {
    console.log('❌ Пользователи не найдены');
  } else {
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Has password: ${user.password_hash ? 'YES' : 'NO'}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('---');
    });
  }
  
  // Проверим конкретного пользователя
  const testUser = db.prepare('SELECT * FROM users WHERE email = ?').get('axelencore@mail.ru');
  if (testUser) {
    console.log('\n🔍 Найден пользователь axelencore@mail.ru:');
    console.log('Password hash:', testUser.password_hash);
    
    if (testUser.password_hash) {
      // Проверим пароль
      const isValid = await bcrypt.compare('password123', testUser.password_hash);
      console.log('Password "password123" valid:', isValid);
    }
  } else {
    console.log('\n❌ Пользователь axelencore@mail.ru не найден');
  }
  
} catch (error) {
  console.error('❌ Ошибка:', error.message);
} finally {
  db.close();
}