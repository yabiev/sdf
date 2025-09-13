const puppeteer = require('puppeteer');

async function testUIProjectCreation() {
  let browser;
  try {
    console.log('🚀 Запуск тестирования создания проектов через UI...');
    
    browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: { width: 1280, height: 720 }
    });
    
    const page = await browser.newPage();
    
    // Переходим на главную страницу
    console.log('📱 Переход на главную страницу...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Проверяем текущую страницу
    const currentUrl = page.url();
    console.log(`📍 Текущий URL: ${currentUrl}`);
    
    // Ищем все ссылки и кнопки на странице
    console.log('🔍 Анализ доступных элементов на странице...');
    
    const allLinks = await page.$$('a');
    console.log('📋 Доступные ссылки:');
    for (const link of allLinks) {
      const text = await page.evaluate(el => el.textContent?.trim(), link);
      const href = await page.evaluate(el => el.href, link);
      if (text) {
        console.log(`  - "${text}" -> ${href}`);
      }
    }
    
    const allButtons = await page.$$('button');
    console.log('\n📋 Доступные кнопки:');
    for (const button of allButtons) {
      const text = await page.evaluate(el => el.textContent?.trim(), button);
      const className = await page.evaluate(el => el.className, button);
      if (text) {
        console.log(`  - "${text}" (class: ${className})`);
      }
    }
    
    // Ищем элементы с плюсом или создания
    const allElements = await page.$$('*');
    console.log('\n🔍 Поиск элементов создания...');
    for (const element of allElements) {
      const text = await page.evaluate(el => el.textContent?.trim(), element);
      const tagName = await page.evaluate(el => el.tagName, element);
      const className = await page.evaluate(el => el.className, element);
      
      if (text && (text.includes('+') || text.toLowerCase().includes('создать') || text.toLowerCase().includes('новый') || text.toLowerCase().includes('добавить'))) {
        console.log(`  - ${tagName}: "${text}" (class: ${className})`);
      }
    }
    
    // Попробуем перейти в раздел "Доски" где могут быть проекты
    console.log('\n🔄 Попытка перехода в раздел "Доски"...');
    const boardsLink = await page.$('a[href*="boards"], a[href*="projects"]');
    if (!boardsLink) {
      // Ищем по тексту
      const allLinks2 = await page.$$('a');
      for (const link of allLinks2) {
        const text = await page.evaluate(el => el.textContent?.trim(), link);
        if (text && (text.toLowerCase().includes('доски') || text.toLowerCase().includes('проекты'))) {
          console.log(`✅ Найдена ссылка: "${text}"`);
          await link.click();
          await new Promise(resolve => setTimeout(resolve, 3000));
          break;
        }
      }
    } else {
      await boardsLink.click();
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Проверяем новую страницу
    const newUrl = page.url();
    console.log(`📍 Новый URL: ${newUrl}`);
    
    // Снова ищем кнопки создания
    console.log('\n🔍 Поиск кнопок создания на новой странице...');
    const newButtons = await page.$$('button');
    for (const button of newButtons) {
      const text = await page.evaluate(el => el.textContent?.trim(), button);
      const className = await page.evaluate(el => el.className, button);
      if (text) {
        console.log(`  - "${text}" (class: ${className})`);
        
        if (text.includes('+') || text.toLowerCase().includes('создать') || text.toLowerCase().includes('новый') || text.toLowerCase().includes('добавить')) {
          console.log(`🎯 Потенциальная кнопка создания: "${text}"`);
          
          try {
            await button.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Проверяем, появилось ли модальное окно или форма
            const modals = await page.$$('[role="dialog"], .modal, .popup');
            const forms = await page.$$('form');
            const inputs = await page.$$('input[name="name"], input[placeholder*="название"]');
            
            if (modals.length > 0 || forms.length > 0 || inputs.length > 0) {
              console.log('✅ Модальное окно или форма создания найдены!');
              
              // Пробуем заполнить форму
              const nameInput = await page.$('input[name="name"]') || await page.$('input[placeholder*="название"]');
              if (nameInput) {
                const testProjectName = `UI Test Project ${Date.now()}`;
                await nameInput.type(testProjectName);
                console.log(`📝 Заполнено имя проекта: ${testProjectName}`);
                
                // Ищем кнопку сохранения
                const submitButtons = await page.$$('button[type="submit"], button');
                for (const submitBtn of submitButtons) {
                  const btnText = await page.evaluate(el => el.textContent?.trim(), submitBtn);
                  if (btnText && (btnText.toLowerCase().includes('создать') || btnText.toLowerCase().includes('сохранить') || btnText.toLowerCase().includes('ok'))) {
                    console.log(`💾 Нажимаем кнопку: "${btnText}"`);
                    await submitBtn.click();
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    // Проверяем результат
                    const pageText = await page.evaluate(() => document.body.textContent);
                    if (pageText.includes(testProjectName)) {
                      console.log('🎉 Проект успешно создан и найден на странице!');
                      return;
                    }
                    break;
                  }
                }
              }
            } else {
              console.log('❌ Модальное окно не появилось');
            }
          } catch (e) {
            console.log(`❌ Ошибка при клике на кнопку: ${e.message}`);
          }
        }
      }
    }
    
    console.log('\n❌ Не удалось найти рабочую кнопку создания проекта');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании UI:', error.message);
  } finally {
    if (browser) {
      // Оставляем браузер открытым для ручной проверки
      console.log('\n🔍 Браузер оставлен открытым для ручной проверки...');
      await new Promise(resolve => setTimeout(resolve, 30000)); // Ждем 30 секунд
      await browser.close();
    }
  }
}

// Запускаем тест
testUIProjectCreation().catch(console.error);