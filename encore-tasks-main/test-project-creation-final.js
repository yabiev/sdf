const puppeteer = require('puppeteer');
const path = require('path');

async function testProjectCreation() {
  console.log('🚀 Запуск финального теста создания проекта...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Переходим на главную страницу
    console.log('📱 Переход на localhost:3001...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    
    // Ждем загрузки страницы
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🔐 Начинаем процесс авторизации...');
    
    // Ищем поле email и вводим данные
    const emailSelector = 'input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="почта" i]';
    await page.waitForSelector(emailSelector, { timeout: 10000 });
    await page.type(emailSelector, 'test@example.com');
    console.log('✅ Email введен');
    
    // Ищем поле пароля и вводим данные
    const passwordSelector = 'input[type="password"], input[name="password"], input[placeholder*="password" i], input[placeholder*="пароль" i]';
    await page.waitForSelector(passwordSelector, { timeout: 5000 });
    await page.type(passwordSelector, 'password123');
    console.log('✅ Пароль введен');
    
    // Ищем кнопку входа и нажимаем
    const loginButtonSelector = 'button[type="submit"], button:has-text("Войти"), button:has-text("Login"), input[type="submit"]';
    await page.click(loginButtonSelector);
    console.log('✅ Кнопка входа нажата');
    
    // Ждем перенаправления после авторизации
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const currentUrl = page.url();
    console.log('📍 Текущий URL после авторизации:', currentUrl);
    
    // Проверяем, что мы авторизованы (ищем элементы проектов)
    console.log('🔍 Поиск элементов интерфейса проектов...');
    
    // Ищем кнопку создания проекта
    const createProjectSelectors = [
      'button:has-text("Создать проект")',
      'button:has-text("Create Project")',
      'button:has-text("Новый проект")',
      'button:has-text("+")',
      'a[href*="create"]',
      'button[data-testid="create-project"]',
      '.create-project-btn',
      '[data-cy="create-project"]'
    ];
    
    let createButton = null;
    for (const selector of createProjectSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        createButton = await page.$(selector);
        if (createButton) {
          console.log('✅ Найдена кнопка создания проекта:', selector);
          break;
        }
      } catch (e) {
        // Продолжаем поиск
      }
    }
    
    if (!createButton) {
      // Если не нашли кнопку, попробуем найти любые кнопки на странице
      console.log('🔍 Анализ всех кнопок на странице...');
      const allButtons = await page.$$('button');
      
      for (let i = 0; i < allButtons.length; i++) {
        const buttonText = await page.evaluate(el => el.textContent?.trim(), allButtons[i]);
        console.log(`Кнопка ${i + 1}: "${buttonText}"`);
        
        if (buttonText && (buttonText.includes('Создать') || buttonText.includes('Create') || buttonText.includes('Новый') || buttonText.includes('+'))) {
          createButton = allButtons[i];
          console.log('✅ Выбрана кнопка для создания:', buttonText);
          break;
        }
      }
    }
    
    if (!createButton) {
      console.log('❌ Кнопка создания проекта не найдена');
      
      // Сохраняем скриншот для анализа
      await page.screenshot({ path: 'debug-no-create-button.png', fullPage: true });
      console.log('📸 Скриншот сохранен: debug-no-create-button.png');
      
      // Анализируем содержимое страницы
      const pageContent = await page.content();
      console.log('📄 Заголовок страницы:', await page.title());
      
      // Ищем любые ссылки или элементы, которые могут вести к созданию проекта
      const links = await page.$$eval('a', links => 
        links.map(link => ({ href: link.href, text: link.textContent?.trim() }))
          .filter(link => link.text && link.text.length > 0)
      );
      
      console.log('🔗 Найденные ссылки:');
      links.forEach((link, i) => {
        if (i < 10) { // Показываем только первые 10
          console.log(`  ${link.text} -> ${link.href}`);
        }
      });
      
      console.log('⏳ Оставляем браузер открытым для ручной проверки (60 секунд)...');
      await new Promise(resolve => setTimeout(resolve, 60000));
      return;
    }
    
    // Нажимаем кнопку создания проекта
    console.log('🖱️ Нажимаем кнопку создания проекта...');
    await createButton.click();
    
    // Ждем появления формы создания проекта
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('📝 Поиск формы создания проекта...');
    
    // Ищем поле названия проекта
    const nameFieldSelectors = [
      'input[name="name"]',
      'input[placeholder*="название" i]',
      'input[placeholder*="name" i]',
      'input[type="text"]:first-of-type',
      '#project-name',
      '.project-name-input'
    ];
    
    let nameField = null;
    for (const selector of nameFieldSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        nameField = await page.$(selector);
        if (nameField) {
          console.log('✅ Найдено поле названия проекта:', selector);
          break;
        }
      } catch (e) {
        // Продолжаем поиск
      }
    }
    
    if (!nameField) {
      console.log('❌ Поле названия проекта не найдено');
      
      // Анализируем все input поля
      const allInputs = await page.$$('input');
      console.log(`🔍 Найдено ${allInputs.length} полей ввода:`);
      
      for (let i = 0; i < allInputs.length; i++) {
        const inputInfo = await page.evaluate(el => ({
          type: el.type,
          name: el.name,
          placeholder: el.placeholder,
          id: el.id,
          className: el.className
        }), allInputs[i]);
        console.log(`  Поле ${i + 1}:`, inputInfo);
      }
      
      await page.screenshot({ path: 'debug-no-name-field.png', fullPage: true });
      console.log('📸 Скриншот сохранен: debug-no-name-field.png');
      
      console.log('⏳ Оставляем браузер открытым для ручной проверки (60 секунд)...');
      await page.waitForTimeout(60000);
      return;
    }
    
    // Вводим название проекта
    const projectName = 'Тестовый проект ' + Date.now();
    await nameField.click();
    await nameField.clear();
    await nameField.type(projectName);
    console.log('✅ Название проекта введено:', projectName);
    
    // Ищем поле описания (опционально)
    const descriptionSelectors = [
      'textarea[name="description"]',
      'textarea[placeholder*="описание" i]',
      'textarea[placeholder*="description" i]',
      'textarea:first-of-type',
      '#project-description'
    ];
    
    for (const selector of descriptionSelectors) {
      try {
        const descField = await page.$(selector);
        if (descField) {
          await descField.type('Описание тестового проекта');
          console.log('✅ Описание проекта введено');
          break;
        }
      } catch (e) {
        // Поле описания опционально
      }
    }
    
    // Ищем кнопку сохранения/создания
    const saveButtonSelectors = [
      'button[type="submit"]',
      'button:has-text("Создать")',
      'button:has-text("Create")',
      'button:has-text("Сохранить")',
      'button:has-text("Save")',
      '.submit-btn',
      '.create-btn'
    ];
    
    let saveButton = null;
    for (const selector of saveButtonSelectors) {
      try {
        saveButton = await page.$(selector);
        if (saveButton) {
          console.log('✅ Найдена кнопка сохранения:', selector);
          break;
        }
      } catch (e) {
        // Продолжаем поиск
      }
    }
    
    if (!saveButton) {
      console.log('❌ Кнопка сохранения не найдена');
      
      // Анализируем все кнопки в форме
      const formButtons = await page.$$('form button, .modal button, .dialog button');
      console.log(`🔍 Найдено ${formButtons.length} кнопок в форме:`);
      
      for (let i = 0; i < formButtons.length; i++) {
        const buttonText = await page.evaluate(el => el.textContent?.trim(), formButtons[i]);
        console.log(`  Кнопка ${i + 1}: "${buttonText}"`);
      }
      
      await page.screenshot({ path: 'debug-no-save-button.png', fullPage: true });
      console.log('📸 Скриншот сохранен: debug-no-save-button.png');
      
      console.log('⏳ Оставляем браузер открытым для ручной проверки (60 секунд)...');
      await page.waitForTimeout(60000);
      return;
    }
    
    // Нажимаем кнопку создания
    console.log('🖱️ Нажимаем кнопку создания проекта...');
    await saveButton.click();
    
    // Ждем создания проекта
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Проверяем результат
    const finalUrl = page.url();
    console.log('📍 Финальный URL:', finalUrl);
    
    // Проверяем, что проект создан (ищем название проекта на странице)
    const pageText = await page.evaluate(() => document.body.textContent);
    
    if (pageText.includes(projectName) || finalUrl.includes('project')) {
      console.log('🎉 УСПЕХ! Проект создан и открыт!');
      console.log('✅ Название проекта найдено на странице или URL изменился');
      
      await page.screenshot({ path: 'success-project-created.png', fullPage: true });
      console.log('📸 Скриншот успеха сохранен: success-project-created.png');
      
      console.log('⏳ Оставляем браузер открытым для проверки (30 секунд)...');
      await page.waitForTimeout(30000);
      
    } else {
      console.log('❌ Проект не создан или не отображается');
      console.log('📄 Содержимое страницы не содержит название проекта');
      
      await page.screenshot({ path: 'debug-project-not-created.png', fullPage: true });
      console.log('📸 Скриншот ошибки сохранен: debug-project-not-created.png');
      
      console.log('⏳ Оставляем браузер открытым для анализа (60 секунд)...');
      await page.waitForTimeout(60000);
    }
    
  } catch (error) {
    console.log('❌ Ошибка во время теста:', error.message);
    console.log('📋 Полная ошибка:', error);
    await page.screenshot({ path: 'debug-test-error.png' });
    console.log('📸 Скриншот ошибки сохранен: debug-test-error.png');
    
    if (browser) {
      console.log('⏳ Оставляем браузер открытым для анализа (60 секунд)...');
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
  } finally {
    console.log('🔚 Тест завершен');
    if (browser) {
      await browser.close();
    }
  }
}

testProjectCreation().catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});