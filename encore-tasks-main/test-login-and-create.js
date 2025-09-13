const puppeteer = require('puppeteer');

// Функция ожидания
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testLoginAndCreate() {
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
    
    console.log('🌐 Переход на страницу...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    await wait(2000);
    
    // Ищем кнопку входа
    console.log('🔍 Поиск кнопки входа...');
    const loginButtons = await page.$$eval('button', buttons => 
      buttons.map(btn => ({
        text: btn.textContent.trim(),
        className: btn.className
      })).filter(btn => 
        btn.text.includes('Вход') || btn.text.includes('Войти')
      )
    );
    
    console.log('🔍 Найденные кнопки входа:', loginButtons);
    
    // Кликаем на кнопку входа
    const loginButton = await page.$('button');
    if (loginButton) {
      const buttonText = await page.evaluate(btn => btn.textContent.trim(), loginButton);
      if (buttonText.includes('Вход')) {
        console.log('✅ Кликаем на кнопку входа:', buttonText);
        await loginButton.click();
        await wait(2000);
      }
    }
    
    // Заполняем форму входа с правильными данными
    console.log('📝 Заполнение формы входа...');
    console.log('📧 Используем email: axelencore@mail.ru');
    
    const emailInput = await page.$('input[type="email"], input[name="email"], input[placeholder*="email"], input[placeholder*="Email"], input[placeholder*="почт"]');
    if (emailInput) {
      console.log('✅ Найдено поле email');
      await page.evaluate((input) => input.value = '', emailInput);
      await emailInput.type('axelencore@mail.ru');
    } else {
      console.log('❌ Поле email не найдено');
    }
    
    const passwordInput = await page.$('input[type="password"], input[name="password"]');
    if (passwordInput) {
      console.log('✅ Найдено поле пароля');
      await page.evaluate((input) => input.value = '', passwordInput);
      await passwordInput.type('Ad580dc6axelencore');
    } else {
      console.log('❌ Поле пароля не найдено');
    }
    
    // Ищем кнопку отправки формы
    const submitButton = await page.$('button[type="submit"], input[type="submit"], button:not([type])');
    if (submitButton) {
      console.log('✅ Найдена кнопка отправки формы');
      await submitButton.click();
      await wait(3000);
    } else {
      console.log('❌ Кнопка отправки не найдена');
    }
    
    // Проверяем ошибки в консоли
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('❌ Ошибка в консоли:', msg.text());
      }
    });
    
    // Проверяем URL после входа
    const currentUrl = page.url();
    console.log('🌐 URL после входа:', currentUrl);
    
    await wait(2000);
    
    // Ищем элементы создания проекта
    console.log('🔍 Поиск элементов создания проекта...');
    const createElements = await page.$$eval('*', elements => 
      elements.filter(el => {
        const text = el.textContent || '';
        const className = el.className || '';
        const id = el.id || '';
        return (
          text.includes('Создать') ||
          text.includes('Новый проект') ||
          text.includes('Добавить проект') ||
          text.includes('+') ||
          className.includes('create') ||
          className.includes('add') ||
          className.includes('new') ||
          id.includes('create') ||
          id.includes('add')
        );
      }).map(el => ({
        tagName: el.tagName,
        text: el.textContent.trim().substring(0, 50),
        className: el.className,
        id: el.id
      }))
    );
    
    console.log('🎯 Найденные элементы создания проекта:', createElements);
    
    if (createElements.length === 0) {
      console.log('❌ Элементы создания проекта не найдены');
      
      // Показываем все кнопки на странице
      const allButtons = await page.$$eval('button, a, div[role="button"]', elements => 
        elements.map(el => ({
          text: el.textContent.trim().substring(0, 30),
          tagName: el.tagName,
          className: el.className.substring(0, 100)
        }))
      );
      console.log('🔍 Все кнопки на странице:', allButtons);
    } else {
      // Пытаемся кликнуть на первый найденный элемент
      console.log('🎯 Попытка клика на элемент создания проекта...');
      const createButton = await page.$('button, a, div[role="button"]');
      if (createButton) {
        const buttonText = await page.evaluate(btn => btn.textContent.trim(), createButton);
        if (buttonText.includes('Создать') || buttonText.includes('+')) {
          await createButton.click();
          await wait(2000);
          
          // Заполняем форму создания проекта
          console.log('📝 Заполнение формы создания проекта...');
          
          const nameInput = await page.$('input[name="name"], input[placeholder*="название"], input[placeholder*="имя"]');
          if (nameInput) {
            await nameInput.type('Тестовый проект');
          }
          
          const descInput = await page.$('textarea, input[name="description"], input[placeholder*="описание"]');
          if (descInput) {
            await descInput.type('Проект для тестирования');
          }
          
          const submitBtn = await page.$('button[type="submit"], button:contains("Создать"), button:contains("Сохранить")');
          if (submitBtn) {
            await submitBtn.click();
            await wait(3000);
          }
        }
      }
    }
    
    // Сохраняем скриншот
    await page.screenshot({ path: 'test-login-result.png', fullPage: true });
    console.log('📸 Скриншот сохранен: test-login-result.png');
    
    // Проверяем ошибки консоли
    if (consoleErrors.length === 0) {
      console.log('✅ Ошибок в консоли не обнаружено');
    } else {
      console.log('❌ Обнаружены ошибки в консоли:', consoleErrors);
    }
    
    console.log('✅ Тест завершен');
    
  } catch (error) {
    console.error('❌ Ошибка в тесте:', error);
    if (browser) {
      await browser.close();
    }
  }
  
  // Ждем перед закрытием браузера
  console.log('⏳ Ожидание 15 секунд перед закрытием браузера...');
  await wait(15000);
  
  if (browser) {
    await browser.close();
  }
}

testLoginAndCreate();