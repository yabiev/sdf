const puppeteer = require('puppeteer');

async function debugAuth() {
  let browser;
  
  try {
    console.log('🔍 Отладочный тест авторизации...');
    
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    // Мониторинг сетевых запросов
    const requests = [];
    const responses = [];
    
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      });
      console.log('📤 Запрос:', request.method(), request.url());
    });
    
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
      console.log('📥 Ответ:', response.status(), response.url());
    });
    
    // Мониторинг ошибок консоли
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Ошибка консоли:', msg.text());
      }
    });
    
    // Переход на главную страницу
    console.log('📱 Переход на localhost:3001...');
    await page.goto('http://localhost:3001', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    // Ожидание загрузки формы
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    
    // Заполнение формы
    await page.type('input[type="email"]', 'admin@example.com');
    await page.type('input[type="password"]', 'admin123');
    
    console.log('📝 Форма заполнена');
    
    // Скриншот перед отправкой
    await page.screenshot({ path: 'before-submit.png', fullPage: true });
    
    // Клик по кнопке входа с ожиданием ответа
    const [response] = await Promise.all([
      page.waitForResponse(response => 
        response.url().includes('/api/auth/login') || 
        response.url().includes('/login'), 
        { timeout: 10000 }
      ),
      page.click('button[type="submit"]')
    ]);
    
    console.log('🔐 Ответ на вход:', response.status(), response.statusText());
    
    if (response.status() === 200) {
      console.log('✅ Успешная авторизация');
      
      // Ожидание перенаправления
      try {
        await page.waitForNavigation({ 
          waitUntil: 'networkidle2',
          timeout: 5000 
        });
        console.log('🌐 Перенаправление выполнено');
      } catch (navError) {
        console.log('⚠️ Нет перенаправления, проверяем текущую страницу');
      }
      
      // Скриншот результата
      await page.screenshot({ path: 'auth-result.png', fullPage: true });
      
      // Проверка URL и содержимого
      const currentUrl = page.url();
      console.log('🌐 Текущий URL:', currentUrl);
      
      // Проверка наличия элементов после входа
      const dashboardElements = await page.$$eval('*', elements => 
        elements.filter(el => 
          el.textContent && (
            el.textContent.includes('Главная') ||
            el.textContent.includes('Доски') ||
            el.textContent.includes('Проекты') ||
            el.textContent.includes('Dashboard')
          )
        ).map(el => el.textContent.trim())
      );
      
      console.log('🎯 Найденные элементы:', dashboardElements);
      
    } else {
      console.log('❌ Ошибка авторизации:', response.status());
      const responseText = await response.text();
      console.log('📄 Ответ сервера:', responseText);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    
    if (browser) {
      try {
        const pages = await browser.pages();
        if (pages.length > 0) {
          await pages[0].screenshot({ path: 'debug-error.png', fullPage: true });
          console.log('📸 Скриншот ошибки сохранен');
        }
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

debugAuth();