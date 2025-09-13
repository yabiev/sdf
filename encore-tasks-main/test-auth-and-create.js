const puppeteer = require('puppeteer');

async function testAuthAndProjectCreation() {
  let browser;
  
  try {
    console.log('🚀 Запуск теста авторизации и создания проекта...');
    
    browser = await puppeteer.launch({ 
      headless: false, 
      defaultViewport: null,
      args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    // Слушаем ошибки консоли
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Ошибка в консоли:', msg.text());
      }
    });
    
    page.on('pageerror', error => {
      console.log('❌ Ошибка JavaScript:', error.message);
    });
    
    // Переход на страницу
    console.log('📄 Переход на страницу...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Попробуем авторизоваться
    console.log('🔐 Попытка авторизации...');
    
    // Найдем поля email и password
    const emailInput = await page.$('input[type="email"], input[name="email"]');
    const passwordInput = await page.$('input[type="password"], input[name="password"]');
    
    if (emailInput && passwordInput) {
      console.log('✅ Найдены поля для ввода логина и пароля');
      
      // Заполним форму
      await emailInput.click();
      await emailInput.type('test@example.com');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await passwordInput.click();
      await passwordInput.type('password123');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Найдем кнопку "Войти" (последнюю кнопку с таким текстом)
      const loginButtons = await page.$$('button');
      let loginButton = null;
      
      for (let button of loginButtons) {
        const text = await page.evaluate(btn => btn.textContent.trim(), button);
        if (text === 'Войти') {
          loginButton = button;
        }
      }
      
      if (loginButton) {
        console.log('🔑 Нажимаем кнопку "Войти"');
        await loginButton.click();
        await new Promise(resolve => setTimeout(resolve, 5000)); // Ждем дольше
        
        // Проверим URL после входа
        const newUrl = page.url();
        console.log('URL после входа:', newUrl);
        
        // Проверим содержимое страницы
        const pageContent = await page.evaluate(() => document.body.textContent);
        console.log('Содержимое после входа (первые 300 символов):', pageContent.substring(0, 300));
        
      } else {
        console.log('❌ Кнопка "Войти" не найдена');
      }
    } else {
      console.log('❌ Не найдены поля для авторизации');
    }
    
    // Сделаем скриншот после авторизации
    await page.screenshot({ path: 'after-login-attempt.png', fullPage: true });
    console.log('Скриншот после попытки входа сохранен');
    
    // Попробуем найти элементы для создания проекта
    console.log('🔍 Поиск элементов для создания проекта...');
    
    const allButtons = await page.$$eval('button', buttons => 
      buttons.map(btn => ({
        text: btn.textContent.trim(),
        visible: btn.offsetParent !== null,
        disabled: btn.disabled,
        className: btn.className
      }))
    );
    
    console.log('Все кнопки на странице:', allButtons);
    
    // Попробуем найти любые ссылки или элементы навигации
    const allLinks = await page.$$eval('a', links => 
      links.map(link => ({
        text: link.textContent.trim(),
        href: link.href,
        visible: link.offsetParent !== null
      }))
    );
    
    console.log('Все ссылки на странице:', allLinks);
    
    // Попробуем найти элементы с текстом "проект"
    const projectElements = await page.$$eval('*', elements => 
      elements
        .filter(el => el.textContent && el.textContent.toLowerCase().includes('проект'))
        .map(el => ({
          tagName: el.tagName,
          text: el.textContent.trim().substring(0, 100),
          className: el.className
        }))
        .slice(0, 10) // Ограничим количество
    );
    
    console.log('Элементы со словом "проект":', projectElements);
    
    // Попробуем найти кнопки с символом "+"
    const plusButtons = await page.$$eval('button', buttons => 
      buttons
        .filter(btn => btn.textContent.includes('+') || btn.innerHTML.includes('+'))
        .map(btn => ({
          text: btn.textContent.trim(),
          innerHTML: btn.innerHTML.substring(0, 100),
          visible: btn.offsetParent !== null
        }))
    );
    
    console.log('Кнопки с символом "+":', plusButtons);
    
    console.log('\n📊 АНАЛИЗ ЗАВЕРШЕН');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  } finally {
    if (browser) {
      console.log('🔚 Закрытие браузера через 10 секунд...');
      await new Promise(resolve => setTimeout(resolve, 10000)); // Подождем, чтобы увидеть результат
      await browser.close();
    }
  }
}

// Запуск теста
testAuthAndProjectCreation();