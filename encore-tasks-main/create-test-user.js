// Скрипт для создания тестового пользователя
const fetch = require('node-fetch');

async function createTestUser() {
  try {
    console.log('🔄 Создание тестового пользователя...');
    
    // Сначала получаем CSRF токен
    const csrfResponse = await fetch('http://localhost:3000/api/csrf');
    const csrfData = await csrfResponse.json();
    console.log('🔐 CSRF токен получен:', csrfData.token);
    
    // Регистрируем пользователя
    const registerResponse = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfData.token
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        password: 'test123'
      })
    });
    
    const registerData = await registerResponse.json();
    console.log('📝 Результат регистрации:', registerData);
    
    if (registerResponse.ok) {
      console.log('✅ Пользователь успешно зарегистрирован');
      console.log('⚠️  Пользователь требует одобрения администратора');
      console.log('📧 Email: test@example.com');
      console.log('🔑 Пароль: test123');
    } else {
      console.log('❌ Ошибка регистрации:', registerData.error);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

createTestUser();