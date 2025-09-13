const puppeteer = require('puppeteer');

async function testProjectCreation() {
  let browser;
  
  try {
    console.log('🚀 Запуск браузера...');
    browser = await puppeteer.launch({ 
      headless: false, 
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('📱 Переход на страницу приложения...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    // Ждем загрузки страницы
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🔐 Поиск формы авторизации...');
    
    // Ждем появления полей авторизации
    await page.waitForSelector('input[type="email"], input[placeholder*="email"], input[placeholder*="Email"]', { timeout: 10000 });
    
    console.log('✍️ Заполнение формы авторизации...');
    
    // Заполняем email
    const emailInput = await page.$('input[type="email"], input[placeholder*="email"], input[placeholder*="Email"]');
    if (emailInput) {
      await emailInput.click();
      await emailInput.type('test@example.com');
    }
    
    // Заполняем пароль
    const passwordInput = await page.$('input[type="password"], input[placeholder*="пароль"], input[placeholder*="password"]');
    if (passwordInput) {
      await passwordInput.click();
      await passwordInput.type('test123');
    }
    
    // Нажимаем кнопку входа
    const loginButton = await page.$('button[type="submit"], button:contains("Войти"), button:contains("Login")');
    if (loginButton) {
      await loginButton.click();
    } else {
      // Альтернативный поиск кнопки
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await page.evaluate(el => el.textContent, button);
        if (text && (text.includes('Войти') || text.includes('Login') || text.includes('Вход'))) {
          await button.click();
          break;
        }
      }
    }
    
    console.log('⏳ Ожидание авторизации...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🔍 Поиск кнопки создания проекта в боковой панели...');
    
    // Ищем кнопку Plus в секции "Проекты"
    const createProjectButton = await page.$('button[title="Создать проект"]');
    
    if (createProjectButton) {
      console.log('✅ Найдена кнопка создания проекта!');
      await createProjectButton.click();
      
      console.log('⏳ Ожидание открытия модального окна...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Ищем поля формы создания проекта
      const nameInput = await page.$('input[placeholder*="название"], input[placeholder*="имя"], input[name="name"]');
      if (nameInput) {
        console.log('📝 Заполнение формы создания проекта...');
        await nameInput.click();
        await nameInput.type('Тестовый проект ' + Date.now());
        
        // Ищем кнопку сохранения
        const saveButton = await page.$('button:contains("Создать"), button:contains("Сохранить"), button[type="submit"]');
        if (saveButton) {
          await saveButton.click();
          console.log('✅ Проект создан!');
        } else {
          // Альтернативный поиск кнопки сохранения
          const buttons = await page.$$('button');
          for (const button of buttons) {
            const text = await page.evaluate(el => el.textContent, button);
            if (text && (text.includes('Создать') || text.includes('Сохранить') || text.includes('Save'))) {
              await button.click();
              console.log('✅ Проект создан!');
              break;
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log('❌ Не найдено поле для ввода названия проекта');
      }
    } else {
      console.log('❌ Не найдена кнопка создания проекта');
      
      // Попробуем найти альтернативные варианты
      console.log('🔍 Поиск альтернативных кнопок...');
      
      // Ищем любые кнопки с Plus иконкой
      const plusButtons = await page.$$('button');
      for (const button of plusButtons) {
        const hasPlus = await page.evaluate(el => {
          const svg = el.querySelector('svg');
          return svg && (svg.innerHTML.includes('plus') || svg.innerHTML.includes('M12 5v14m-7-7h14'));
        }, button);
        
        if (hasPlus) {
          console.log('✅ Найдена кнопка с Plus иконкой!');
          await button.click();
          await new Promise(resolve => setTimeout(resolve, 1000));
          break;
        }
      }
    }
    
    console.log('📊 Проверка текущего состояния страницы...');
    
    // Проверяем, что на странице есть проекты
    const projectElements = await page.$$('[data-oid*="project"], .project, [class*="project"]');
    console.log(`Найдено элементов проектов: ${projectElements.length}`);
    
    // Выводим текущий URL
    const currentUrl = page.url();
    console.log(`Текущий URL: ${currentUrl}`);
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  } finally {
    console.log('🏁 Завершение тестирования...');
    if (browser) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      await browser.close();
    }
  }
}

testProjectCreation();