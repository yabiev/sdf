const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Начинаем тестирование создания проекта...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  try {
    // Переходим на главную страницу
    console.log('📱 Переходим на http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    // Ждем загрузки страницы
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Проверяем, нужна ли авторизация
    const loginButton = await page.$('button[type="submit"]');
    if (loginButton) {
      console.log('🔐 Выполняем авторизацию...');
      
      // Вводим email
      const emailInput = await page.$('input[type="email"]');
      if (emailInput) {
        await emailInput.click();
        await emailInput.type('axelencore@mail.ru');
        console.log('✉️ Email введен');
      }
      
      // Вводим пароль
      const passwordInput = await page.$('input[type="password"]');
      if (passwordInput) {
        await passwordInput.click();
        await passwordInput.type('Ad580dc6axelencore');
        console.log('🔑 Пароль введен');
      }
      
      // Нажимаем кнопку входа
      await loginButton.click();
      console.log('🚪 Кнопка входа нажата');
      
      // Ждем перенаправления
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Найти и кликнуть кнопку создания проекта
    console.log('Ищем кнопку создания проекта...');
    
    // Сначала попробуем найти кнопку с плюсом или текстом создания
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Попробуем найти кнопку по различным селекторам
    let createButton = null;
    
    // Вариант 1: поиск кнопки с текстом "Создать проект"
    createButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent && btn.textContent.includes('Создать проект'));
    });
    
    if (createButton && createButton.asElement) {
      createButton = createButton.asElement();
    } else {
      createButton = null;
    }
    
    if (!createButton) {
      // Вариант 2: кнопка с плюсом
      createButton = await page.$('button[title*="Создать"], button[aria-label*="Создать"]');
    }
    
    if (!createButton) {
      // Вариант 3: поиск по всем кнопкам
      const buttons = await page.$$('button');
      console.log(`Найдено ${buttons.length} кнопок`);
      
      for (let i = 0; i < buttons.length; i++) {
        const buttonText = await buttons[i].evaluate(el => el.textContent?.trim());
        const buttonTitle = await buttons[i].evaluate(el => el.title || el.getAttribute('aria-label') || '');
        console.log(`Кнопка ${i}: "${buttonText}" (title: "${buttonTitle}")`);
        
        if (buttonText && (buttonText.toLowerCase().includes('создать') || buttonText.toLowerCase().includes('новый') || buttonText.toLowerCase().includes('добавить'))) {
          createButton = buttons[i];
          console.log(`Найдена подходящая кнопка: "${buttonText}"`);
          break;
        }
      }
    }
    
    if (createButton) {
      await createButton.click();
      console.log('Кликнули на кнопку создания проекта');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Ищем поле ввода названия проекта
      const nameInput = await page.$('input[placeholder*="название"], input[placeholder*="name"], input[name="name"], input[id="name"]');
      
      if (nameInput) {
        console.log('📝 Вводим название проекта...');
        const projectName = `Тестовый проект ${Date.now()}`;
        await nameInput.click();
        await nameInput.type(projectName);
        
        // Ищем кнопку сохранения
        let saveButton = await page.$('button[type="submit"]');
        
        if (!saveButton) {
          // Поиск кнопки по тексту
          saveButton = await page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.find(btn => {
              const text = btn.textContent?.toLowerCase() || '';
              return text.includes('создать') || text.includes('сохранить') || text.includes('добавить');
            });
          });
          
          if (saveButton && saveButton.asElement) {
            saveButton = saveButton.asElement();
          } else {
            saveButton = null;
          }
        }
        
        if (saveButton) {
          console.log('💾 Сохраняем проект...');
          await saveButton.click();
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          console.log('✅ Проект создан успешно!');
        } else {
          console.log('❌ Не найдена кнопка сохранения');
        }
      } else {
        console.log('❌ Не найдено поле ввода названия проекта');
      }
    } else {
      console.log('❌ Кнопка создания проекта не найдена');
      
      // Выводим структуру страницы для отладки
      const pageContent = await page.content();
      console.log('📄 Содержимое страницы (первые 1000 символов):');
      console.log(pageContent.substring(0, 1000));
    }
    
    // Получаем логи консоли
    console.log('\n📋 Логи консоли браузера:');
    const logs = await page.evaluate(() => {
      return window.console._logs || [];
    });
    
    // Слушаем события консоли
    page.on('console', msg => {
      console.log(`🖥️ Console ${msg.type()}: ${msg.text()}`);
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  } finally {
    console.log('🏁 Завершение тестирования...');
    await browser.close();
  }
})();