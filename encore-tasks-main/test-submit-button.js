const puppeteer = require('puppeteer');

(async () => {
  console.log('Тест поиска кнопки отправки формы...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  try {
    const page = await browser.newPage();
    
    console.log('1. Переход на главную страницу...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
    
    console.log('2. Вход в систему...');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', 'admin@example.com');
    await page.type('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('3. Открытие формы создания задачи...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const taskBtn = buttons.find(btn => btn.textContent && btn.textContent.includes('Задача'));
      if (taskBtn) taskBtn.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('4. Заполнение формы...');
    const nameField = await page.$('#title');
    if (nameField) {
      await nameField.type('Тестовый проект ' + Date.now());
    }
    
    const descField = await page.$('#description');
    if (descField) {
      await descField.type('Описание тестового проекта');
    }
    
    console.log('5. Поиск всех кнопок в модальном окне...');
    
    const allButtons = await page.evaluate(() => {
      const modal = document.querySelector('.modal, [role="dialog"], .dialog, .popup') || document.body;
      const buttons = Array.from(modal.querySelectorAll('button'));
      return buttons.map(btn => ({
        text: btn.textContent?.trim() || '',
        type: btn.type,
        className: btn.className,
        id: btn.id,
        disabled: btn.disabled,
        visible: btn.offsetParent !== null
      })).filter(btn => btn.visible);
    });
    
    console.log('\n=== Все видимые кнопки в форме ===');
    allButtons.forEach((btn, index) => {
      console.log(`${index + 1}. "${btn.text}" (type: ${btn.type}, disabled: ${btn.disabled}, class: ${btn.className})`);
    });
    
    // Ищем кнопку по разным критериям
    const submitButton = allButtons.find(btn => 
      btn.text.includes('Создать') || 
      btn.text.includes('Сохранить') ||
      btn.text.includes('Добавить') ||
      btn.text.includes('Отправить') ||
      btn.type === 'submit' ||
      btn.className.includes('submit') ||
      btn.className.includes('primary')
    );
    
    if (submitButton) {
      console.log(`\n6. Найдена кнопка отправки: "${submitButton.text}"`);
      
      // Кликаем по кнопке
      await page.evaluate((buttonText) => {
        const modal = document.querySelector('.modal, [role="dialog"], .dialog, .popup') || document.body;
        const buttons = Array.from(modal.querySelectorAll('button'));
        const submitBtn = buttons.find(btn => btn.textContent?.trim() === buttonText);
        if (submitBtn) {
          console.log('Кликаем по кнопке:', buttonText);
          submitBtn.click();
        }
      }, submitButton.text);
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('7. Проверка результата...');
      
      // Проверяем, закрылось ли модальное окно
      const modalClosed = await page.evaluate(() => {
        const modal = document.querySelector('.modal, [role="dialog"], .dialog, .popup');
        return !modal || modal.style.display === 'none' || !modal.offsetParent;
      });
      
      console.log(`Модальное окно закрыто: ${modalClosed}`);
      
      // Проверяем наличие новых элементов
      const taskElements = await page.evaluate(() => {
        const tasks = Array.from(document.querySelectorAll('.task, .card, .item, [data-testid*="task"], [data-testid*="card"]'));
        return tasks.map(task => task.textContent?.substring(0, 50) || '');
      });
      
      console.log('\n=== Найденные задачи/карточки ===');
      taskElements.forEach((task, index) => {
        console.log(`${index + 1}. ${task}`);
      });
      
      await page.screenshot({ path: 'final-result.png', fullPage: true });
      console.log('\nСкриншот результата сохранен: final-result.png');
      
      if (modalClosed && taskElements.length > 0) {
        console.log('\n✅ Тест создания проекта/задачи завершен УСПЕШНО!');
      } else {
        console.log('\n⚠️ Тест завершен, но результат неясен');
      }
      
    } else {
      console.log('\n❌ Кнопка отправки не найдена среди доступных кнопок');
      
      // Попробуем найти форму и отправить её
      const formExists = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        return forms.length > 0;
      });
      
      if (formExists) {
        console.log('Найдена форма, пытаемся отправить через Enter...');
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      await page.screenshot({ path: 'no-submit-found.png', fullPage: true });
    }
    
  } catch (error) {
    console.error('❌ Ошибка в тесте:', error);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();