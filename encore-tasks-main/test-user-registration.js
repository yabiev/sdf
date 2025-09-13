const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testUserRegistration() {
  console.log('🧪 Тестирование регистрации пользователя...');
  
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    password: 'testpassword123'
  };
  
  try {
    console.log('📝 Регистрация пользователя:', testUser.email);
    
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    });
    
    console.log('📊 Статус ответа:', response.status);
    
    const responseText = await response.text();
    console.log('📄 Ответ сервера:', responseText);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ Регистрация успешна!');
      console.log('👤 Данные пользователя:', {
        id: data.user?.id,
        email: data.user?.email,
        name: data.user?.name,
        role: data.user?.role,
        isApproved: data.user?.isApproved
      });
      
      // Тестируем вход
      console.log('\n🔐 Тестирование входа...');
      const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password
        })
      });
      
      console.log('📊 Статус входа:', loginResponse.status);
      const loginText = await loginResponse.text();
      console.log('📄 Ответ входа:', loginText);
      
      if (loginResponse.ok) {
        const loginData = JSON.parse(loginText);
        console.log('✅ Вход успешен!');
        console.log('🎫 Токен получен:', loginData.token ? 'Да' : 'Нет');
      } else {
        console.log('❌ Ошибка входа');
      }
      
    } else {
      console.log('❌ Ошибка регистрации');
      console.log('📄 Детали ошибки:', responseText);
    }
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  }
}

// Запуск теста
testUserRegistration().then(() => {
  console.log('\n🏁 Тест завершен');
}).catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});