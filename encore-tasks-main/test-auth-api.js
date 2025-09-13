const puppeteer = require('puppeteer');

async function testAuthAPI() {
  console.log('🔐 Тестирование API аутентификации...');
  
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Переходим на страницу приложения
    await page.goto('http://localhost:3000');
    
    // Ждем загрузки страницы
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Проверяем, есть ли форма входа
    const loginForm = await page.$('form');
    if (loginForm) {
      console.log('✅ Форма входа найдена');
      
      // Заполняем форму входа
      await page.type('input[type="email"]', 'admin@encore-tasks.com');
      await page.type('input[type="password"]', 'admin123');
      
      // Нажимаем кнопку входа
      await page.click('button[type="submit"]');
      
      // Ждем перенаправления
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('✅ Попытка входа выполнена');
    } else {
      console.log('ℹ️ Пользователь уже аутентифицирован или форма входа не найдена');
    }
    
    // Проверяем текущий URL
    const currentUrl = page.url();
    console.log('📍 Текущий URL:', currentUrl);
    
    // Проверяем наличие элементов интерфейса
    const projectElements = await page.$$('[data-testid="project-card"], .project-card, h1, h2');
    console.log('📊 Найдено элементов интерфейса:', projectElements.length);
    
    console.log('✅ Тест аутентификации завершен');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  } finally {
    await browser.close();
  }
}

testAuthAPI().catch(console.error);