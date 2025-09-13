const puppeteer = require('puppeteer');

async function testAuth() {
  let browser;
  
  try {
    console.log('🚀 Запуск теста авторизации...');
    
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    // Переход на главную страницу
    console.log('📱 Переход на localhost:3001...');
    await page.goto('http://localhost:3001', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    // Скриншот главной страницы
    await page.screenshot({ path: 'homepage.png', fullPage: true });
    console.log('📸 Скриншот главной страницы сохранен');
    
    // Проверка наличия формы входа
    const emailField = await page.$('input[type="email"]');
    const passwordField = await page.$('input[type="password"]');
    const loginButton = await page.$('button[type="submit"]');
    
    if (!emailField || !passwordField || !loginButton) {
      console.log('❌ Форма входа не найдена');
      return;
    }
    
    console.log('✅ Форма входа найдена');
    
    // Заполнение формы
    await emailField.type('admin@example.com');
    await passwordField.type('admin123');
    
    console.log('📝 Форма заполнена');
    
    // Клик по кнопке входа
    await loginButton.click();
    
    // Ожидание перенаправления
    await page.waitForNavigation({ 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    
    console.log('🔐 Вход выполнен');
    
    // Скриншот после входа
    await page.screenshot({ path: 'after-login-simple.png', fullPage: true });
    console.log('📸 Скриншот после входа сохранен');
    
    // Проверка URL
    const currentUrl = page.url();
    console.log('🌐 Текущий URL:', currentUrl);
    
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/boards')) {
      console.log('✅ Успешный вход в систему');
    } else {
      console.log('❌ Возможные проблемы с входом');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    
    if (browser) {
      try {
        const page = await browser.newPage();
        await page.screenshot({ path: 'error-simple.png', fullPage: true });
        console.log('📸 Скриншот ошибки сохранен');
      } catch (screenshotError) {
        console.log('Не удалось сделать скриншот ошибки');
      }
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testAuth()