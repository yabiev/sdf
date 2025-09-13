const { SQLiteAdapter } = require('./src/lib/sqlite-adapter.ts');
const path = require('path');

try {
  console.log('🔧 Тестирование SQLite Adapter...');
  
  const dbPath = path.join(__dirname, 'database.db');
  const adapter = new SQLiteAdapter(dbPath);
  
  console.log('📋 Adapter создан успешно');
  
  // Тест getUserByEmail
  console.log('\n🔍 Тестирование getUserByEmail...');
  
  adapter.getUserByEmail('test@example.com')
    .then(user => {
      console.log('✅ getUserByEmail выполнен успешно');
      console.log('👤 Результат:', user);
      
      if (user) {
        console.log('📋 Детали пользователя:');
        console.log('  ID:', user.id);
        console.log('  Email:', user.email);
        console.log('  Name:', user.name);
        console.log('  Password hash:', user.password_hash ? 'есть' : 'отсутствует');
        console.log('  Role:', user.role);
      } else {
        console.log('❌ Пользователь не найден');
      }
    })
    .catch(error => {
      console.error('❌ Ошибка getUserByEmail:', error.message);
      console.error('❌ Stack trace:', error.stack);
    });
    
} catch (error) {
  console.error('❌ Ошибка создания adapter:', error.message);
  console.error('❌ Stack trace:', error.stack);
}