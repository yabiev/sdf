const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Полный тест создания проекта...');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized', '--no-sandbox']
    });
    
    const page = await browser.newPage();
    
    console.log('📄 Переход на localhost:3001...');
    await page.goto('http://localhost:3001', { 
      waitUntil: 'networkidle2',
      timeout: 15000
    });
    
    console.log('✅ Страница загружена');
    
    // Ждем загрузки React компонентов
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🔑 Выполняем вход в систему...');
    
    // Ищем кнопку "Вход" по тексту
    const loginButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Вход'));
    });
    
    if (loginButton) {
      console.log('📝 Нажимаем кнопку "Вход"...');
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(btn => btn.textContent.includes('Вход'));
        if (btn) btn.click();
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Заполняем форму входа
    console.log('📧 Заполняем email...');
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      await emailInput.click();
      await emailInput.type('test@example.com');
      console.log('✅ Email введен');
    }
    
    console.log('🔒 Заполняем пароль...');
    const passwordInput = await page.$('input[type="password"]');
    if (passwordInput) {
      await passwordInput.click();
      await passwordInput.type('password123');
      console.log('✅ Пароль введен');
    }
    
    // Нажимаем кнопку "Войти"
    console.log('🚪 Нажимаем кнопку "Войти"...');
    const submitClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(btn => btn.textContent.includes('Войти'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    
    if (submitClicked) {
      console.log('✅ Кнопка "Войти" нажата');
      
      // Ждем перенаправления или изменения страницы
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log('🔍 Анализируем страницу после входа...');
    
    // Получаем текущий URL
    const currentUrl = page.url();
    console.log('🌐 Текущий URL:', currentUrl);
    
    // Получаем текст страницы
    const pageText = await page.evaluate(() => {
      return document.body.textContent || '';
    });
    
    console.log('📝 Содержимое страницы (первые 800 символов):');
    console.log(pageText.substring(0, 800));
    
    // Ищем все кнопки после входа
    const allButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a[role="button"], input[type="button"], input[type="submit"]'));
      return buttons.map(btn => ({
        tag: btn.tagName,
        text: btn.textContent?.trim() || btn.value || '',
        className: btn.className || '',
        id: btn.id || '',
        href: btn.href || ''
      })).filter(btn => btn.text.length > 0);
    });
    
    console.log('\n🔘 Все кнопки после входа:');
    allButtons.forEach((btn, i) => {
      console.log(`  ${i + 1}. ${btn.tag}: "${btn.text}" (class: ${btn.className})`);
    });
    
    // Ищем элементы, связанные с проектами
    console.log('\n🔍 Поиск элементов создания проекта...');
    
    // Проверяем различные варианты кнопок создания проекта
    const createButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const createTexts = [
        'Создать проект', 'Create Project', 'Новый проект', 'New Project',
        'Добавить проект', 'Add Project', 'создать', 'create', 'новый', 'new',
        'добавить', 'add', '+'
      ];
      
      for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase() || '';
        const className = btn.className?.toLowerCase() || '';
        
        for (const createText of createTexts) {
          if (text.includes(createText.toLowerCase()) || className.includes(createText.toLowerCase())) {
            return {
              found: true,
              text: btn.textContent?.trim(),
              className: btn.className,
              tag: btn.tagName
            };
          }
        }
      }
      return { found: false };
    });
    
    if (createButton.found) {
      console.log(`✅ Найдена кнопка создания проекта: "${createButton.text}" (${createButton.tag})`);
      
      // Нажимаем кнопку создания проекта
      console.log('🎯 Нажимаем кнопку создания проекта...');
      const clicked = await page.evaluate((buttonText) => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        const btn = buttons.find(b => b.textContent?.trim() === buttonText);
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      }, createButton.text);
      
      if (clicked) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Проверяем, открылась ли форма создания проекта
        const formFound = await page.evaluate(() => {
          const forms = document.querySelectorAll('form, .modal, .dialog, [role="dialog"]');
          return forms.length > 0;
        });
        
        if (formFound) {
          console.log('✅ Форма создания проекта открыта!');
          
          // Ищем поля формы
          const nameInput = await page.$('input[name="name"], input[placeholder*="название"], input[placeholder*="name"], input[placeholder*="проект"]');
          const descInput = await page.$('textarea[name="description"], textarea[placeholder*="описание"], textarea[placeholder*="description"]');
          
          if (nameInput) {
            console.log('📝 Заполняем название проекта...');
            await nameInput.click();
            await nameInput.type('Тестовый проект ' + Date.now());
          }
          
          if (descInput) {
            console.log('📝 Заполняем описание проекта...');
            await descInput.click();
            await descInput.type('Описание тестового проекта');
          }
          
          // Ищем кнопку сохранения
          const saveButton = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
            const saveTexts = ['Создать', 'Create', 'Сохранить', 'Save'];
            
            for (const btn of buttons) {
              const text = btn.textContent?.trim() || btn.value || '';
              for (const saveText of saveTexts) {
                if (text.includes(saveText)) {
                  return {
                    found: true,
                    text: text
                  };
                }
              }
            }
            return { found: false };
          });
          
          if (saveButton.found) {
            console.log(`✅ Найдена кнопка сохранения: "${saveButton.text}"`);
            console.log('💾 Сохраняем проект...');
            
            const saved = await page.evaluate((buttonText) => {
              const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
              const btn = buttons.find(b => (b.textContent?.trim() || b.value || '').includes(buttonText));
              if (btn) {
                btn.click();
                return true;
              }
              return false;
            }, saveButton.text);
            
            if (saved) {
              await new Promise(resolve => setTimeout(resolve, 5000));
              
              // Проверяем результат
              const finalPageText = await page.evaluate(() => {
                return document.body.textContent || '';
              });
              
              if (finalPageText.includes('Тестовый проект') || finalPageText.includes('успешно') || finalPageText.includes('создан')) {
                console.log('🎉 УСПЕХ! Проект создан успешно!');
              } else {
                console.log('⚠️ Проект возможно создан, но подтверждение не найдено');
              }
              
              console.log('📄 Финальное содержимое страницы:');
              console.log(finalPageText.substring(0, 1000));
            }
          } else {
            console.log('❌ Кнопка сохранения не найдена');
          }
        } else {
          console.log('❌ Форма создания проекта не открылась');
        }
      }
    } else {
      console.log('❌ Кнопка создания проекта не найдена');
      
      // Попробуем найти навигацию или меню
      console.log('🔍 Ищем навигационные элементы...');
      const navElements = await page.evaluate(() => {
        const navs = Array.from(document.querySelectorAll('nav, .nav, .navigation, .menu, .header, .sidebar, [role="navigation"]'));
        return navs.map(nav => ({
          tag: nav.tagName,
          text: nav.textContent?.trim().substring(0, 200) || '',
          className: nav.className || ''
        }));
      });
      
      console.log('🧭 Найденные навигационные элементы:');
      navElements.forEach((nav, i) => {
        console.log(`  ${i + 1}. ${nav.tag}: "${nav.text}" (class: ${nav.className})`);
      });
    }
    
    console.log('\n⏳ Ожидание 10 секунд для ручного анализа...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Браузер закрыт');
    }
  }
})();