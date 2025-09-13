const puppeteer = require('puppeteer');

async function testProjectCreation() {
  let browser;
  
  try {
    console.log('🚀 Запуск теста создания проекта...');
    
    browser = await puppeteer.launch({
      headless: false,
      devtools: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Переходим на главную страницу
    console.log('📍 Переход на главную страницу...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
    
    console.log('\n=== ЭТАП 1: АВТОРИЗАЦИЯ ===');
    
    // Ищем кнопку "Вход"
    const loginButtonFound = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const loginBtn = buttons.find(btn => btn.textContent?.includes('Вход'));
      if (loginBtn) {
        loginBtn.click();
        return true;
      }
      return false;
    });
    
    if (!loginButtonFound) {
      console.log('❌ Кнопка "Вход" не найдена!');
      await page.screenshot({ path: 'test-error-screenshot.png' });
      return;
    }
    
    console.log('✅ Кнопка "Вход" найдена и нажата');
    
    // Ждем появления формы
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Заполняем форму авторизации
    const emailInput = await page.$('input[type="email"], input[name="email"]');
    const passwordInput = await page.$('input[type="password"], input[name="password"]');
    
    if (emailInput && passwordInput) {
      await emailInput.type('admin@example.com');
      await passwordInput.type('admin123');
      console.log('✅ Форма авторизации заполнена');
      
      // Ищем кнопку "Войти" (submit)
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        // Проверяем текст кнопки
        const buttonText = await page.evaluate(btn => btn.textContent?.trim(), submitButton);
        console.log('🔍 Найдена кнопка отправки:', buttonText);
        
        if (buttonText?.includes('Войти') || buttonText?.includes('Вход')) {
          await submitButton.click();
          console.log('✅ Кнопка "Войти" нажата');
        } else {
          // Попробуем кликнуть в любом случае
          await submitButton.click();
          console.log('✅ Кнопка отправки нажата');
        }
      } else {
        console.log('❌ Кнопка "Войти" не найдена!');
        await page.screenshot({ path: 'test-error-screenshot.png' });
        return;
      }
    } else {
      console.log('❌ Поля email или password не найдены!');
      await page.screenshot({ path: 'test-error-screenshot.png' });
      return;
    }
    
    // Ждем завершения авторизации
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n=== ЭТАП 2: ПЕРЕХОД НА СТРАНИЦУ ПРОЕКТОВ ===');
    
    // Ищем навигацию к проектам в сайдбаре или меню
    const projectsNavigation = await page.evaluate(() => {
      // Ищем ссылки или кнопки с текстом "Проекты"
      const elements = Array.from(document.querySelectorAll('a, button, [role="button"]'));
      const projectsElement = elements.find(el => {
        const text = el.textContent?.toLowerCase() || '';
        return text.includes('проект') || text.includes('project');
      });
      
      if (projectsElement) {
        return {
          found: true,
          text: projectsElement.textContent?.trim(),
          tagName: projectsElement.tagName
        };
      }
      
      return { found: false };
    });
    
    if (projectsNavigation.found) {
      console.log('✅ Найдена навигация к проектам:', projectsNavigation.text);
      
      // Кликаем на навигацию к проектам
      await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('a, button, [role="button"]'));
        const projectsElement = elements.find(el => {
          const text = el.textContent?.toLowerCase() || '';
          return text.includes('проект') || text.includes('project');
        });
        if (projectsElement) {
          projectsElement.click();
        }
      });
      
      console.log('✅ Переход на страницу проектов выполнен');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      console.log('⚠️ Навигация к проектам не найдена, попробуем найти кнопку создания проекта на текущей странице');
    }
    
    console.log('\n=== ЭТАП 3: ПОИСК КНОПКИ СОЗДАНИЯ ПРОЕКТА ===');
    
    // Анализируем текущую страницу
    const currentPageInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        bodyText: document.body.textContent?.substring(0, 500)
      };
    });
    
    console.log('📍 Текущая страница:', currentPageInfo.url);
    console.log('📋 Заголовок:', currentPageInfo.title);
    
    // Ищем кнопки создания проекта
    const createProjectButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="button"], a'));
      return buttons.map((btn, index) => {
        const text = btn.textContent?.trim().toLowerCase() || '';
        const isCreateButton = 
          text.includes('создать') ||
          text.includes('добавить') ||
          text.includes('новый') ||
          text.includes('create') ||
          text.includes('add') ||
          text.includes('new') ||
          text.includes('+') ||
          btn.className.includes('create') ||
          btn.className.includes('add');
        
        return {
          index,
          text: btn.textContent?.trim() || '',
          className: btn.className,
          tagName: btn.tagName,
          isCreateButton
        };
      }).filter(btn => btn.isCreateButton);
    });
    
    console.log('🔍 Найдено потенциальных кнопок создания:', createProjectButtons.length);
    createProjectButtons.forEach((btn, i) => {
      console.log(`   ${i + 1}. "${btn.text}" (${btn.tagName}, className: "${btn.className}")`);
    });
    
    if (createProjectButtons.length > 0) {
      // Выбираем наиболее подходящую кнопку
      const bestButton = createProjectButtons.find(btn => 
        btn.text.toLowerCase().includes('проект') || 
        btn.text.toLowerCase().includes('project')
      ) || createProjectButtons[0];
      
      console.log('✅ Выбрана кнопка:', bestButton.text);
      
      // Кликаем на кнопку создания проекта
      await page.evaluate((buttonIndex) => {
        const buttons = Array.from(document.querySelectorAll('button, [role="button"], a'));
        const createButtons = buttons.filter((btn) => {
          const text = btn.textContent?.trim().toLowerCase() || '';
          return text.includes('создать') ||
                 text.includes('добавить') ||
                 text.includes('новый') ||
                 text.includes('create') ||
                 text.includes('add') ||
                 text.includes('new') ||
                 text.includes('+') ||
                 btn.className.includes('create') ||
                 btn.className.includes('add');
        });
        
        if (createButtons[buttonIndex]) {
          createButtons[buttonIndex].click();
        }
      }, bestButton.index);
      
      console.log('✅ Кнопка создания проекта нажата');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('\n=== ЭТАП 4: ЗАПОЛНЕНИЕ ФОРМЫ СОЗДАНИЯ ПРОЕКТА ===');
      
      // Ищем поля формы создания проекта
      const formFields = await page.evaluate(() => {
        const nameInput = document.querySelector('input[name="name"], input[placeholder*="название"], input[placeholder*="имя"], input[placeholder*="name"]');
        const descInput = document.querySelector('textarea[name="description"], textarea[placeholder*="описание"], textarea[placeholder*="description"], input[name="description"]');
        
        return {
          hasNameField: !!nameInput,
          hasDescField: !!descInput,
          nameFieldType: nameInput?.tagName || 'не найдено',
          descFieldType: descInput?.tagName || 'не найдено'
        };
      });
      
      console.log('📝 Поля формы:', JSON.stringify(formFields, null, 2));
      
      if (formFields.hasNameField) {
        // Заполняем название проекта
        const nameField = await page.$('input[name="name"], input[placeholder*="название"], input[placeholder*="имя"], input[placeholder*="name"]');
        if (nameField) {
          await nameField.clear();
          await nameField.type('Тестовый проект ' + Date.now());
          console.log('✅ Название проекта заполнено');
        }
        
        // Заполняем описание (если есть)
        if (formFields.hasDescField) {
          const descField = await page.$('textarea[name="description"], textarea[placeholder*="описание"], textarea[placeholder*="description"], input[name="description"]');
          if (descField) {
            await descField.clear();
            await descField.type('Описание тестового проекта');
            console.log('✅ Описание проекта заполнено');
          }
        }
        
        // Ищем кнопку сохранения
        const saveButtons = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
          return buttons.map((btn, index) => {
            const text = btn.textContent?.trim().toLowerCase() || '';
            const isSaveButton = 
              text.includes('создать') ||
              text.includes('сохранить') ||
              text.includes('добавить') ||
              text.includes('create') ||
              text.includes('save') ||
              text.includes('add') ||
              btn.type === 'submit';
            
            return {
              index,
              text: btn.textContent?.trim() || '',
              type: btn.type || '',
              isSaveButton
            };
          }).filter(btn => btn.isSaveButton);
        });
        
        console.log('💾 Найдено кнопок сохранения:', saveButtons.length);
        saveButtons.forEach((btn, i) => {
          console.log(`   ${i + 1}. "${btn.text}" (type: ${btn.type})`);
        });
        
        if (saveButtons.length > 0) {
          // Выбираем кнопку сохранения
          const saveButton = saveButtons[0];
          
          await page.evaluate((buttonIndex) => {
            const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
            const saveButtons = buttons.filter((btn) => {
              const text = btn.textContent?.trim().toLowerCase() || '';
              return text.includes('создать') ||
                     text.includes('сохранить') ||
                     text.includes('добавить') ||
                     text.includes('create') ||
                     text.includes('save') ||
                     text.includes('add') ||
                     btn.type === 'submit';
            });
            
            if (saveButtons[buttonIndex]) {
              saveButtons[buttonIndex].click();
            }
          }, saveButton.index);
          
          console.log('✅ Кнопка сохранения нажата');
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          console.log('\n=== ЭТАП 5: ПРОВЕРКА РЕЗУЛЬТАТА ===');
          
          // Проверяем результат создания
          const finalResult = await page.evaluate(() => {
            return {
              url: window.location.href,
              title: document.title,
              hasSuccessMessage: document.body.textContent?.includes('успешно') || 
                               document.body.textContent?.includes('создан') ||
                               document.body.textContent?.includes('добавлен'),
              hasErrorMessage: document.body.textContent?.includes('ошибка') ||
                             document.body.textContent?.includes('error'),
              bodyText: document.body.textContent?.substring(0, 1000)
            };
          });
          
          console.log('🎯 Финальный результат:', JSON.stringify(finalResult, null, 2));
          
          if (finalResult.hasSuccessMessage) {
            console.log('\n🎉 УСПЕХ! Проект успешно создан!');
            await page.screenshot({ path: 'test-success-screenshot.png' });
          } else if (finalResult.hasErrorMessage) {
            console.log('\n❌ ОШИБКА при создании проекта!');
            await page.screenshot({ path: 'test-error-screenshot.png' });
          } else {
            console.log('\n⚠️ Результат неясен, проверьте скриншот');
            await page.screenshot({ path: 'test-unclear-screenshot.png' });
          }
        } else {
          console.log('❌ Кнопка сохранения не найдена!');
          await page.screenshot({ path: 'test-error-screenshot.png' });
        }
      } else {
        console.log('❌ Поле названия проекта не найдено!');
        await page.screenshot({ path: 'test-error-screenshot.png' });
      }
    } else {
      console.log('❌ Кнопка создания проекта не найдена!');
      await page.screenshot({ path: 'test-error-screenshot.png' });
    }
    
    // Держим браузер открытым для проверки
    console.log('\n⏳ Браузер остается открытым 30 секунд для проверки...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('💥 Ошибка в тесте:', error);
    if (browser) {
      const page = (await browser.pages())[0];
      if (page) {
        await page.screenshot({ path: 'test-error-screenshot.png' });
      }
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testProjectCreation();