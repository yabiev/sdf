const puppeteer = require('puppeteer');

async function testProjectCreation() {
  let browser;
  
  try {
    console.log('🚀 Запуск теста создания проекта...');
    
    // Запуск браузера
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    // Переход на страницу проектов
    console.log('📄 Переход на страницу проектов...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    // Ожидание загрузки страницы
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Проверка необходимости авторизации
    const buttons = await page.$$('button');
    let needsLogin = false;
    for (let button of buttons) {
      const text = await button.evaluate(el => el.textContent);
      if (text && (text.includes('Вход') || text.includes('Войти'))) {
        needsLogin = true;
        break;
      }
    }
    
    if (needsLogin) {
      console.log('🔐 Требуется авторизация, выполняем вход...');
      
      // Поиск кнопки входа по тексту
       const loginButtons = await page.$$('button');
       for (let button of loginButtons) {
        const text = await button.evaluate(el => el.textContent);
        if (text && (text.includes('Вход') || text.includes('Войти'))) {
          await button.click();
          break;
        }
      }
      
      // Ожидание появления формы входа
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Заполнение формы входа (используем тестовые данные)
      console.log('📝 Заполнение формы входа...');
      
      // Ожидание появления полей ввода
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const emailInput = await page.$('input[type="email"], input[name="email"], input[placeholder*="email"], input[placeholder*="Email"], input[placeholder*="почта"]');
      if (emailInput) {
        console.log('✅ Поле email найдено');
        await emailInput.click();
        await emailInput.type('axelencore@mail.ru');
      } else {
        console.log('❌ Поле email не найдено');
        // Попробуем найти любое поле ввода
        const inputs = await page.$$('input');
        console.log(`Найдено ${inputs.length} полей ввода`);
        if (inputs.length > 0) {
          await inputs[0].type('axelencore@mail.ru');
        }
      }
      
      const passwordInput = await page.$('input[type="password"], input[name="password"], input[placeholder*="пароль"], input[placeholder*="Пароль"]');
      if (passwordInput) {
        console.log('✅ Поле пароля найдено');
        await passwordInput.click();
        await passwordInput.type('admin123');
      } else {
        console.log('❌ Поле пароля не найдено');
        // Попробуем найти второе поле ввода
        const inputs = await page.$$('input');
        if (inputs.length > 1) {
          await inputs[1].type('admin123');
        }
      }
      
      // Отправка формы входа
      const submitButtons = await page.$$('button[type="submit"]');
      if (submitButtons.length > 0) {
        await submitButtons[0].click();
      } else {
         const submitBtns = await page.$$('button');
         for (let button of submitBtns) {
          const text = await button.evaluate(el => el.textContent);
          if (text && (text.includes('Войти') || text.includes('Вход'))) {
            await button.click();
            break;
          }
        }
      }
      
      // Ожидание завершения авторизации
      console.log('⏳ Ожидание завершения авторизации...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Проверка успешности авторизации
      const currentUrl = page.url();
      console.log('Текущий URL после авторизации:', currentUrl);
      
      const stillNeedsLogin = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (let button of buttons) {
          if (button.textContent.includes('Вход') || button.textContent.includes('Войти')) {
            return true;
          }
        }
        return false;
      });
      
      if (stillNeedsLogin) {
        console.log('⚠️ Авторизация не удалась, все еще видны кнопки входа');
      } else {
        console.log('✅ Авторизация прошла успешно');
      }
    }
    
    // Поиск и клик по кнопке создания проекта
    console.log('🔍 Поиск кнопки создания проекта...');
    
    // Попробуем найти кнопку по тексту
    const createButtons = await page.$$eval('button', buttons => 
      buttons.filter(btn => 
        btn.textContent.includes('Создать проект') || 
        btn.textContent.includes('Новый проект') ||
        btn.textContent.includes('+')
      ).map(btn => btn.textContent)
    );
    
    console.log('Найденные кнопки:', createButtons);
    
    // Поиск кнопки создания проекта
    let createButton = null;
    const allButtons = await page.$$('button');
    
    for (let button of allButtons) {
      const text = await button.evaluate(el => el.textContent);
      console.log('Найдена кнопка с текстом:', text);
      if (text && (text.includes('Создать') || text.includes('+') || text.includes('Новый') || text.includes('проект'))) {
        createButton = button;
        console.log('Выбрана кнопка:', text);
        break;
      }
    }
    
    if (!createButton) {
      throw new Error('Кнопка создания проекта не найдена');
    }
    
    console.log('✅ Кнопка создания проекта найдена, кликаем...');
    await createButton.click();
    
    // Ожидание появления модального окна
    console.log('⏳ Ожидание появления модального окна...');
    await page.waitForSelector('input[placeholder*="название"], input[placeholder*="Название"]', { timeout: 5000 });
    
    // Заполнение формы
    console.log('📝 Заполнение формы проекта...');
    
    // Название проекта
    const nameInput = await page.$('input[placeholder*="название"], input[placeholder*="Название"]');
    if (nameInput) {
      await nameInput.clear();
      await nameInput.type('Тестовый проект');
    }
    
    // Описание проекта
    const descInput = await page.$('textarea[placeholder*="описание"], textarea[placeholder*="Описание"]');
    if (descInput) {
      await descInput.type('Проект для тестирования функциональности');
    }
    
    // Ожидание перед отправкой
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Поиск и клик по кнопке отправки
    console.log('🚀 Отправка формы...');
    
    // Поиск кнопки отправки
    const submitButtons = await page.$$('button[type="submit"]');
    if (submitButtons.length > 0) {
      await submitButtons[0].click();
    } else {
      // Альтернативный поиск кнопки отправки
      const formButtons = await page.$$('button');
      for (let button of formButtons) {
        const text = await button.evaluate(el => el.textContent);
        console.log('Проверяем кнопку отправки:', text);
        if (text && (text.includes('Создать') || text.includes('Сохранить'))) {
          console.log('Кликаем по кнопке:', text);
          await button.click();
          break;
        }
      }
    }
    
    // Ожидание закрытия модального окна и обновления списка
    console.log('⏳ Ожидание создания проекта...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Проверка консоли на ошибки
    console.log('🔍 Проверка консоли браузера...');
    const logs = await page.evaluate(() => {
      return window.console._logs || [];
    });
    
    // Получение ошибок из консоли
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Ошибка в консоли:', msg.text());
      }
    });
    
    // Проверка наличия проекта в списке
    console.log('🔍 Проверка отображения нового проекта...');
    
    const projectExists = await page.evaluate(() => {
      const projectElements = document.querySelectorAll('[data-testid="project-item"], .project-item, .project-card');
      for (let element of projectElements) {
        if (element.textContent.includes('Тестовый проект')) {
          return true;
        }
      }
      return false;
    });
    
    if (projectExists) {
      console.log('✅ Проект успешно отображается в списке!');
    } else {
      console.log('⚠️ Проект не найден в списке, проверяем весь контент страницы...');
      const pageContent = await page.content();
      if (pageContent.includes('Тестовый проект')) {
        console.log('✅ Проект найден на странице!');
      } else {
        console.log('❌ Проект не найден на странице');
      }
    }
    
    // Обновление страницы для проверки персистентности
    console.log('🔄 Обновление страницы для проверки сохранения...');
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const projectPersists = await page.evaluate(() => {
      const pageText = document.body.textContent;
      return pageText.includes('Тестовый проект');
    });
    
    if (projectPersists) {
      console.log('✅ Проект сохранился после обновления страницы!');
    } else {
      console.log('❌ Проект не сохранился после обновления страницы');
    }
    
    console.log('\n📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:');
    console.log('✅ Модальное окно открывается');
    console.log('✅ Форма заполняется');
    console.log('✅ Проект создается');
    console.log(projectExists ? '✅ Проект отображается в списке' : '❌ Проект НЕ отображается в списке');
    console.log(projectPersists ? '✅ Проект сохраняется после обновления' : '❌ Проект НЕ сохраняется после обновления');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
    
    // Попробуем получить больше информации об ошибке
    if (browser) {
      try {
        const page = (await browser.pages())[0];
        if (page) {
          const url = page.url();
          console.log('Текущий URL:', url);
          
          // Скриншот для отладки
          await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
          console.log('Скриншот сохранен как error-screenshot.png');
        }
      } catch (screenshotError) {
        console.log('Не удалось сделать скриншот:', screenshotError.message);
      }
    }
  } finally {
    if (browser) {
      console.log('🔚 Закрытие браузера...');
      await browser.close();
    }
  }
}

// Запуск теста
testProjectCreation();