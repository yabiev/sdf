const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3001';
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123'
};

async function testLogin() {
  console.log('🚀 Запуск теста авторизации...');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Включаем логирование консоли браузера
  page.on('console', msg => {
    console.log('🖥️  BROWSER:', msg.text());
  });
  
  try {
    console.log('📍 Переход на главную страницу...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    
    console.log('⏳ Ожидание загрузки страницы...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🔍 Поиск кнопки входа...');
    
    // Ищем кнопку входа по различным селекторам
    const loginSelectors = [
      'button:contains("Вход")',
      'button:contains("Войти")',
      'button:contains("Login")',
      '[data-testid="login-button"]',
      '.login-button',
      'button[type="submit"]'
    ];
    
    let loginButton = null;
    for (const selector of loginSelectors) {
      try {
        if (selector.includes(':contains')) {
          // Для селекторов с :contains используем XPath
          const text = selector.match(/"([^"]+)"/)[1];
          const xpath = `//button[contains(text(), "${text}")]`;
          const elements = await page.$x(xpath);
          if (elements.length > 0) {
            loginButton = elements[0];
            console.log(`✅ Найдена кнопка входа по тексту: "${text}"`);
            break;
          }
        } else {
          loginButton = await page.$(selector);
          if (loginButton) {
            console.log(`✅ Найдена кнопка входа по селектору: ${selector}`);
            break;
          }
        }
      } catch (e) {
        // Продолжаем поиск
      }
    }
    
    if (!loginButton) {
      console.log('❌ Кнопка входа не найдена. Проверяем доступные кнопки...');
      const buttons = await page.$$eval('button', buttons => 
        buttons.map(btn => ({ text: btn.textContent?.trim(), className: btn.className }))
      );
      console.log('📋 Доступные кнопки:', buttons);
      return;
    }
    
    console.log('👆 Клик по кнопке входа...');
    await loginButton.click();
    
    console.log('⏳ Ожидание появления формы входа...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🔍 Поиск полей формы входа...');
    
    // Ищем поле email
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email"]',
      'input[placeholder*="Email"]',
      '#email'
    ];
    
    let emailInput = null;
    for (const selector of emailSelectors) {
      emailInput = await page.$(selector);
      if (emailInput) {
        console.log(`✅ Найдено поле email: ${selector}`);
        break;
      }
    }
    
    if (!emailInput) {
      console.log('❌ Поле email не найдено');
      return;
    }
    
    // Ищем поле пароля
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      '#password'
    ];
    
    let passwordInput = null;
    for (const selector of passwordSelectors) {
      passwordInput = await page.$(selector);
      if (passwordInput) {
        console.log(`✅ Найдено поле пароля: ${selector}`);
        break;
      }
    }
    
    if (!passwordInput) {
      console.log('❌ Поле пароля не найдено');
      return;
    }
    
    console.log('📝 Заполнение формы входа...');
    await emailInput.type(TEST_USER.email);
    await passwordInput.type(TEST_USER.password);
    
    console.log('🔍 Поиск кнопки отправки формы...');
    const submitSelectors = [
      'button[type="submit"]',
      'button:contains("Войти")',
      'button:contains("Вход")',
      'button:contains("Login")',
      '.submit-button'
    ];
    
    let submitButton = null;
    for (const selector of submitSelectors) {
      try {
        if (selector.includes(':contains')) {
          const text = selector.match(/"([^"]+)"/)[1];
          const xpath = `//button[contains(text(), "${text}")]`;
          const elements = await page.$x(xpath);
          if (elements.length > 0) {
            submitButton = elements[0];
            console.log(`✅ Найдена кнопка отправки по тексту: "${text}"`);
            break;
          }
        } else {
          submitButton = await page.$(selector);
          if (submitButton) {
            console.log(`✅ Найдена кнопка отправки: ${selector}`);
            break;
          }
        }
      } catch (e) {
        // Продолжаем поиск
      }
    }
    
    if (!submitButton) {
      console.log('❌ Кнопка отправки не найдена');
      return;
    }
    
    console.log('👆 Отправка формы...');
    await submitButton.click();
    
    console.log('⏳ Ожидание ответа сервера...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Проверяем результат авторизации
    const currentUrl = page.url();
    console.log('📍 URL после авторизации:', currentUrl);
    
    // Проверяем cookies
    const cookies = await page.cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));
    console.log('🍪 Auth cookie:', authCookie ? 'найден' : 'не найден');
    
    // Проверяем localStorage
    const localStorage = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) items[key] = window.localStorage.getItem(key);
      }
      return items;
    });
    console.log('💾 LocalStorage:', localStorage);
    
    // Ищем элементы, которые появляются после успешной авторизации
    console.log('🔍 Поиск элементов авторизованного пользователя...');
    
    const authElements = [
      'button:contains("Создать проект")',
      'button:contains("New Project")',
      'button:contains("Выход")',
      'button:contains("Logout")',
      '.user-menu',
      '.project-create-button'
    ];
    
    let foundAuthElement = false;
    for (const selector of authElements) {
      try {
        if (selector.includes(':contains')) {
          const text = selector.match(/"([^"]+)"/)[1];
          const xpath = `//button[contains(text(), "${text}")]`;
          const elements = await page.$x(xpath);
          if (elements.length > 0) {
            console.log(`✅ Найден элемент авторизованного пользователя: "${text}"`);
            foundAuthElement = true;
            break;
          }
        } else {
          const element = await page.$(selector);
          if (element) {
            console.log(`✅ Найден элемент авторизованного пользователя: ${selector}`);
            foundAuthElement = true;
            break;
          }
        }
      } catch (e) {
        // Продолжаем поиск
      }
    }
    
    if (foundAuthElement) {
      console.log('🎉 АВТОРИЗАЦИЯ УСПЕШНА!');
    } else {
      console.log('❌ Авторизация не удалась или элементы не найдены');
    }
    
    console.log('⏳ Оставляем браузер открытым для проверки...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('❌ Ошибка теста:', error);
  } finally {
    await browser.close();
  }
}

testLogin().catch(console.error);