const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3001';

async function testAuthAndProjectCreation() {
  let browser;
  
  try {
    console.log('🚀 Запуск браузера для тестирования авторизации и создания проектов...');
    browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Включаем логирование консоли
    page.on('console', msg => {
      console.log('🖥️  BROWSER:', msg.text());
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`📡 API Response: ${response.status()} ${response.url()}`);
      }
    });
    
    // Переходим на главную страницу
    console.log('📄 Переход на главную страницу...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    
    // Ждем загрузки страницы
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🔐 Проверяем текущее состояние страницы...');
    
    // Проверяем URL и заголовок страницы
    const currentUrl = page.url();
    const title = await page.title();
    console.log('📍 Текущий URL:', currentUrl);
    console.log('📋 Заголовок страницы:', title);
    
    // Проверяем, есть ли уже токен авторизации
    const existingAuth = await page.evaluate(() => {
      return {
        localStorage: Object.keys(localStorage).map(key => ({ key, value: localStorage.getItem(key) })),
        cookies: document.cookie,
        sessionStorage: Object.keys(sessionStorage).map(key => ({ key, value: sessionStorage.getItem(key) }))
      };
    });
    
    console.log('🔐 Существующая авторизация:', JSON.stringify(existingAuth, null, 2));
    
    // Проверяем, есть ли форма входа
    const loginForm = await page.$('form, [class*="auth"], [class*="login"]');
    const emailInput = await page.$('input[type="email"]');
    
    if (loginForm || emailInput) {
      console.log('🔑 Найдена форма входа, выполняем авторизацию...');
      
      // Ждем загрузки формы входа
      await page.waitForSelector('input[type="email"]', { timeout: 5000 });
      await page.waitForSelector('input[type="password"]', { timeout: 5000 });
      
      // Очищаем поля и вводим данные
      console.log('📝 Ввод email...');
      await page.click('input[type="email"]');
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.type('input[type="email"]', 'axelencore@mail.ru');
      
      console.log('📝 Ввод пароля...');
      await page.click('input[type="password"]');
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.type('input[type="password"]', 'Ad580dc6axelencore');
      
      // Ждем немного
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Ищем и нажимаем кнопку входа
      console.log('🔍 Поиск кнопки входа...');
      const loginButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
        for (const btn of buttons) {
          const text = btn.textContent?.toLowerCase() || btn.value?.toLowerCase() || '';
          if (text.includes('войти') || text.includes('вход') || text.includes('login') || text.includes('sign in')) {
            return buttons.indexOf(btn);
          }
        }
        return -1;
      });
      
      if (loginButton >= 0) {
        console.log('👆 Клик по кнопке входа...');
        await page.click(`button:nth-of-type(${loginButton + 1}), input[type="submit"]:nth-of-type(${loginButton + 1})`);
        
        // Ждем ответа от сервера
        console.log('⏳ Ожидание ответа от сервера...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Проверяем результат авторизации
        const newUrl = page.url();
        const newAuth = await page.evaluate(() => {
          return {
            localStorage: Object.keys(localStorage).map(key => ({ key, value: localStorage.getItem(key) })),
            cookies: document.cookie,
            sessionStorage: Object.keys(sessionStorage).map(key => ({ key, value: sessionStorage.getItem(key) }))
          };
        });
        
        console.log('📍 URL после входа:', newUrl);
        console.log('🔐 Авторизация после входа:', JSON.stringify(newAuth, null, 2));
        
        // Проверяем, изменилась ли страница
        const hasAuthToken = newAuth.localStorage.some(item => 
          item.key.includes('token') || item.key.includes('auth') || item.key.includes('session')
        ) || newAuth.cookies.includes('token') || newAuth.cookies.includes('session');
        
        if (hasAuthToken || newUrl !== currentUrl) {
          console.log('✅ Авторизация успешна!');
        } else {
          console.log('❌ Авторизация не удалась!');
          
          // Проверяем ошибки на странице
          const errors = await page.$$eval('[class*="error"], .alert-danger, [role="alert"]', elements => 
            elements.map(el => el.textContent?.trim()).filter(text => text)
          );
          
          if (errors.length > 0) {
            console.log('🚨 Ошибки на странице:', errors);
          }
          
          return;
        }
      } else {
        console.log('❌ Кнопка входа не найдена!');
        return;
      }
    } else {
      console.log('✅ Пользователь уже авторизован или форма входа не требуется');
    }
    
    // Ждем загрузки интерфейса после входа
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Теперь ищем кнопку создания проекта
    console.log('🔍 Поиск кнопки создания проекта...');
    
    // Сначала проверим, на какой странице мы находимся
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        bodyText: document.body.textContent?.substring(0, 500),
        buttons: Array.from(document.querySelectorAll('button')).map(btn => ({
          text: btn.textContent?.trim(),
          className: btn.className,
          disabled: btn.disabled
        })).filter(btn => btn.text)
      };
    });
    
    console.log('📄 Содержимое страницы:', JSON.stringify(pageContent, null, 2));
    
    // Ищем кнопку создания проекта
    const createProjectButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i];
        const text = btn.textContent?.toLowerCase() || '';
        if (text.includes('new project') || text.includes('create project') || 
            text.includes('создать проект') || text.includes('новый проект') ||
            text.includes('add project') || text.includes('добавить проект') ||
            (text.includes('create') && btn.className.includes('primary')) ||
            (text.includes('создать') && btn.className.includes('primary'))) {
          return i;
        }
      }
      return -1;
    });
    
    if (createProjectButton >= 0) {
      console.log('✅ Кнопка создания проекта найдена!');
      
      // Кликаем по кнопке
      console.log('👆 Клик по кнопке создания проекта...');
      await page.click(`button:nth-of-type(${createProjectButton + 1})`);
      
      // Ждем появления модального окна или формы
      console.log('⏳ Ожидание появления формы создания проекта...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Ищем поле ввода названия проекта
      const nameInput = await page.$('input[name="name"], input[placeholder*="name"], input[placeholder*="название"]');
      
      if (nameInput) {
        console.log('✅ Поле ввода названия найдено!');
        
        // Вводим название проекта
        const projectName = `Тестовый проект ${Date.now()}`;
        console.log(`📝 Ввод названия проекта: "${projectName}"...`);
        await nameInput.click();
        await nameInput.clear();
        await nameInput.type(projectName);
        
        // Ждем немного
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Ищем кнопку сохранения
        const saveButton = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          for (let i = 0; i < buttons.length; i++) {
            const btn = buttons[i];
            const text = btn.textContent?.toLowerCase() || '';
            if (text.includes('create') || text.includes('save') || 
                text.includes('создать') || text.includes('сохранить')) {
              return i;
            }
          }
          return -1;
        });
        
        if (saveButton >= 0) {
          console.log('💾 Клик по кнопке создания...');
          await page.click(`button:nth-of-type(${saveButton + 1})`);
          
          // Ждем создания проекта
          console.log('⏳ Ожидание создания проекта...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Проверяем результат
          const finalState = await page.evaluate(() => {
            return {
              url: window.location.href,
              title: document.title,
              projectCards: document.querySelectorAll('[class*="project"], [class*="card"]').length,
              bodyText: document.body.textContent?.substring(0, 500)
            };
          });
          
          console.log('🎯 Финальное состояние:', JSON.stringify(finalState, null, 2));
          
          if (finalState.projectCards > 0) {
            console.log('🎉 УСПЕХ! Проект создан успешно!');
          } else {
            console.log('❌ Проект не найден в списке');
          }
        } else {
          console.log('❌ Кнопка сохранения не найдена!');
        }
      } else {
        console.log('❌ Поле ввода названия проекта не найдено!');
      }
    } else {
      console.log('❌ Кнопка создания проекта не найдена!');
      console.log('💡 Возможно, нужно перейти на страницу проектов...');
      
      // Попробуем найти ссылку на проекты
      const projectsLink = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a, button'));
        for (const link of links) {
          const text = link.textContent?.toLowerCase() || '';
          if (text.includes('project') || text.includes('проект') || 
              text.includes('dashboard') || text.includes('панель')) {
            return link.href || link.onclick || true;
          }
        }
        return null;
      });
      
      if (projectsLink) {
        console.log('🔗 Найдена ссылка на проекты, переходим...');
        if (typeof projectsLink === 'string') {
          await page.goto(projectsLink);
        } else {
          await page.click('a[href*="project"], button[onclick*="project"]');
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Повторяем поиск кнопки создания проекта
        const createProjectButton2 = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          for (let i = 0; i < buttons.length; i++) {
            const btn = buttons[i];
            const text = btn.textContent?.toLowerCase() || '';
            if (text.includes('new project') || text.includes('create project') || 
                text.includes('создать проект') || text.includes('новый проект')) {
              return i;
            }
          }
          return -1;
        });
        
        if (createProjectButton2 >= 0) {
          console.log('✅ Кнопка создания проекта найдена на странице проектов!');
        } else {
          console.log('❌ Кнопка создания проекта все еще не найдена');
        }
      }
    }
    
    console.log('🌐 Браузер остается открытым для проверки результата...');
    
    // Оставляем браузер открытым на 30 секунд для проверки
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('❌ Ошибка во время тестирования:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Запускаем тест
testAuthAndProjectCreation().catch(console.error);