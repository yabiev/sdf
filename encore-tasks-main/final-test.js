const puppeteer = require('puppeteer');

(async () => {
  console.log('Запуск финального теста создания проекта...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  try {
    const page = await browser.newPage();
    
    // Логируем ошибки
    page.on('pageerror', error => {
      console.log('PAGE ERROR:', error.message);
    });
    
    console.log('1. Переход на главную страницу...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
    
    console.log('2. Ожидание загрузки формы входа...');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    console.log('3. Заполнение формы входа...');
    await page.type('input[type="email"]', 'admin@example.com');
    await page.type('input[type="password"]', 'admin123');
    
    console.log('4. Нажатие кнопки входа...');
    await page.click('button[type="submit"]');
    
    console.log('5. Ожидание загрузки главной страницы...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Сохраняем скриншот после входа
    await page.screenshot({ path: 'after-login.png', fullPage: true });
    console.log('Скриншот после входа сохранен: after-login.png');
    
    console.log('6. Поиск кнопки "Проекты" в сайдбаре...');
    
    // Ищем кнопку проектов разными способами
    let projectsButton = null;
    
    // Способ 1: по тексту
    try {
      projectsButton = await page.waitForFunction(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
        return buttons.find(btn => btn.textContent && btn.textContent.includes('Проекты'));
      }, { timeout: 5000 });
      console.log('Найдена кнопка проектов по тексту');
    } catch (e) {
      console.log('Кнопка проектов по тексту не найдена');
    }
    
    // Способ 2: по data-testid или классу
    if (!projectsButton) {
      try {
        await page.waitForSelector('[data-testid="projects-button"], .projects-button', { timeout: 5000 });
        projectsButton = true;
        console.log('Найдена кнопка проектов по селектору');
      } catch (e) {
        console.log('Кнопка проектов по селектору не найдена');
      }
    }
    
    if (projectsButton) {
      console.log('7. Клик по кнопке проектов...');
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
        const projectsBtn = buttons.find(btn => btn.textContent && btn.textContent.includes('Проекты'));
        if (projectsBtn) projectsBtn.click();
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('8. Поиск кнопки создания проекта...');
    
    // Ищем кнопку создания проекта
    let createButton = null;
    
    try {
      createButton = await page.waitForFunction(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
        return buttons.find(btn => 
          btn.textContent && 
          (btn.textContent.includes('Создать') || 
           btn.textContent.includes('Новый') || 
           btn.textContent.includes('+'))
        );
      }, { timeout: 5000 });
      console.log('Найдена кнопка создания проекта');
    } catch (e) {
      console.log('Кнопка создания проекта не найдена');
    }
    
    if (createButton) {
      console.log('9. Клик по кнопке создания проекта...');
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
        const createBtn = buttons.find(btn => 
          btn.textContent && 
          (btn.textContent.includes('Создать') || 
           btn.textContent.includes('Новый') || 
           btn.textContent.includes('+'))
        );
        if (createBtn) createBtn.click();
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('10. Поиск формы создания проекта...');
      
      try {
        await page.waitForSelector('input[name="name"], input[placeholder*="название"], input[placeholder*="имя"]', { timeout: 5000 });
        
        console.log('11. Заполнение формы создания проекта...');
        const nameInput = await page.$('input[name="name"], input[placeholder*="название"], input[placeholder*="имя"]');
        if (nameInput) {
          await nameInput.type('Тестовый проект ' + Date.now());
        }
        
        const descInput = await page.$('textarea, input[name="description"]');
        if (descInput) {
          await descInput.type('Описание тестового проекта');
        }
        
        console.log('12. Отправка формы...');
        const submitBtn = await page.$('button[type="submit"], button:contains("Создать"), button:contains("Сохранить")');
        if (submitBtn) {
          await submitBtn.click();
        } else {
          // Ищем кнопку по тексту
          await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const submitButton = buttons.find(btn => 
              btn.textContent && 
              (btn.textContent.includes('Создать') || btn.textContent.includes('Сохранить'))
            );
            if (submitButton) submitButton.click();
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('13. Проверка результата...');
        await page.screenshot({ path: 'after-project-creation.png', fullPage: true });
        console.log('Скриншот после создания проекта сохранен: after-project-creation.png');
        
        console.log('✅ Тест создания проекта завершен успешно!');
        
      } catch (e) {
        console.log('❌ Форма создания проекта не найдена:', e.message);
        await page.screenshot({ path: 'no-create-form.png', fullPage: true });
      }
    } else {
      console.log('❌ Кнопка создания проекта не найдена');
      await page.screenshot({ path: 'no-create-button.png', fullPage: true });
    }
    
  } catch (error) {
    console.error('❌ Ошибка в тесте:', error);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();