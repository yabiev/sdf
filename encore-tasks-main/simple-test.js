const puppeteer = require('puppeteer');

(async () => {
  console.log('Запуск простого теста...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  try {
    const page = await browser.newPage();
    
    // Перехватываем все сетевые запросы
    page.on('request', request => {
      console.log('REQUEST:', request.method(), request.url());
    });
    
    page.on('response', response => {
      console.log('RESPONSE:', response.status(), response.url());
    });
    
    page.on('console', msg => {
      console.log('CONSOLE:', msg.text());
    });
    
    page.on('pageerror', error => {
      console.log('PAGE ERROR:', error.message);
    });
    
    console.log('Переход на главную страницу...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle0', timeout: 30000 });
    
    console.log('Ожидание загрузки React...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Проверяем, что на странице есть хоть что-то
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Текст на странице:', bodyText.substring(0, 200));
    
    // Проверяем HTML структуру
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    console.log('HTML длина:', html.length);
    
    // Сохраняем скриншот
    await page.screenshot({ path: 'simple-test-screenshot.png', fullPage: true });
    console.log('Скриншот сохранен: simple-test-screenshot.png');
    
    console.log('Тест завершен!');
    
  } catch (error) {
    console.error('Ошибка в тесте:', error);
    await page.screenshot({ path: 'simple-test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();