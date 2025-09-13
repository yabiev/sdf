// Тест database adapter
const path = require('path');

// Имитируем Next.js окружение
process.env.NODE_ENV = 'development';
process.env.DATABASE_TYPE = 'sqlite';
process.env.DATABASE_URL = path.join(__dirname, 'database.db');

async function testDatabaseAdapter() {
  try {
    console.log('🔧 Тестирование Database Adapter...');
    
    // Динамический импорт для ESM модуля
    const { dbAdapter } = await import('./src/lib/database-adapter.js');
    
    console.log('📋 Database Adapter загружен успешно');
    
    // Тест getUserByEmail
    console.log('\n🔍 Тестирование getUserByEmail...');
    
    const user = await dbAdapter.getUserByEmail('test@example.com');
    
    console.log('✅ getUserByEmail выполнен успешно');
    console.log('👤 Результат:', user);
    
    if (user) {
      console.log('📋 Детали пользователя:');
      console.log('  ID:', user.id);
      console.log('  Email:', user.email);
      console.log('  Name:', user.name);
      console.log('  Password hash:', user.password_hash ? 'есть' : 'отсутствует');
      console.log('  Role:', user.role);
      
      // Тест пароля
      if (user.password_hash) {
        const bcrypt = require('bcryptjs');
        const isValid = await bcrypt.compare('password123', user.password_hash);
        console.log('  Пароль password123 валиден:', isValid);
      }
    } else {
      console.log('❌ Пользователь не найден');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error('❌ Stack trace:', error.stack);
  }
}

testDatabaseAdapter();