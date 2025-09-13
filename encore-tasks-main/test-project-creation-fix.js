const fetch = require('node-fetch');

async function testProjectCreation() {
  try {
    console.log('🧪 Тестирование создания проекта после исправления...');
    
    // Тест создания проекта
    const projectData = {
      name: 'Тестовый проект после исправления',
      color: '#ff6b6b'
    };
    
    console.log('📤 Отправляем запрос на создание проекта:', projectData);
    
    const response = await fetch('http://localhost:3001/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'auth-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzYTAyOGRkNS01MzI3LTQ1N2EtYjhkNC0xMWM3ZTJjNzA2Y2UiLCJlbWFpbCI6ImF4ZWxlbmNvcmVAbWFpbC5ydSIsInRpbWVzdGFtcCI6MTc1NzI2OTc3OTI1MywicmFuZG9tIjoiNG4yeWxkaXFyZyIsImlhdCI6MTc1NzI2OTc3OSwiZXhwIjoxNzU3ODc0NTc5fQ.fF3pbUPG-b1apBIKkHmTdpnZZIreWXI7_4d5Z4riyB0'
      },
      body: JSON.stringify(projectData)
    });
    
    const result = await response.json();
    console.log('📥 Ответ API:', JSON.stringify(result, null, 2));
    
    if (result.success && result.data && result.data.id) {
      console.log('✅ Проект успешно создан!');
      console.log('🆔 ID проекта:', result.data.id);
      console.log('📝 Название:', result.data.name);
      console.log('🎨 Цвет:', result.data.color);
      
      // Проверим что проект появился в списке
      console.log('\n🔍 Проверяем список проектов...');
      const listResponse = await fetch('http://localhost:3001/api/projects', {
        headers: {
          'Cookie': 'auth-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzYTAyOGRkNS01MzI3LTQ1N2EtYjhkNC0xMWM3ZTJjNzA2Y2UiLCJlbWFpbCI6ImF4ZWxlbmNvcmVAbWFpbC5ydSIsInRpbWVzdGFtcCI6MTc1NzI2OTc3OTI1MywicmFuZG9tIjoiNG4yeWxkaXFyZyIsImlhdCI6MTc1NzI2OTc3OSwiZXhwIjoxNzU3ODc0NTc5fQ.fF3pbUPG-b1apBIKkHmTdpnZZIreWXI7_4d5Z4riyB0'
        }
      });
      
      const listResult = await listResponse.json();
      console.log('📋 Список проектов:', JSON.stringify(listResult, null, 2));
      
      const createdProject = listResult.data?.projects?.find(p => p.id === result.data.id);
      if (createdProject) {
        console.log('✅ Проект найден в списке!');
        console.log('🎯 Тест прошел успешно - ошибка исправлена!');
      } else {
        console.log('❌ Проект не найден в списке');
      }
    } else {
      console.log('❌ Ошибка создания проекта:', result);
    }
    
  } catch (error) {
    console.error('💥 Ошибка теста:', error);
  }
}

testProjectCreation().catch(console.error);