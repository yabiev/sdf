const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Тест полного процесса создания проекта...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('📱 Переход на localhost:3001...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    
    // Проверяем, есть ли форма входа
    const loginForm = await page.$('form');
    if (loginForm) {
      console.log('🔐 Выполняем вход в систему...');
      await page.type('input[type="email"]', 'admin@example.com');
      await page.type('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('📍 Текущий URL после входа:', page.url());
    
    // Проверяем различные возможные пути к созданию проекта
    console.log('🔍 Поиск способов создания проекта...');
    
    // 1. Проверяем прямой переход к странице проектов
    const projectUrls = [
      'http://localhost:3001/projects',
      'http://localhost:3001/dashboard',
      'http://localhost:3001/admin',
      'http://localhost:3001/create-project'
    ];
    
    for (const url of projectUrls) {
      console.log(`🌐 Проверяем URL: ${url}`);
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 5000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const currentUrl = page.url();
        console.log(`📍 Результат: ${currentUrl}`);
        
        // Проверяем наличие элементов создания проекта
        const createElements = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
          const createButtons = buttons.filter(btn => {
            const text = btn.textContent.toLowerCase();
            return text.includes('создать') || text.includes('create') || 
                   text.includes('новый') || text.includes('new') || 
                   text.includes('+') || text.includes('добавить') || text.includes('add');
          });
          
          return createButtons.map(btn => ({
            tag: btn.tagName,
            text: btn.textContent.trim(),
            className: btn.className,
            href: btn.href || ''
          }));
        });
        
        if (createElements.length > 0) {
          console.log('✅ Найдены элементы создания проекта:');
          createElements.forEach((el, index) => {
            console.log(`  ${index + 1}. ${el.tag}: "${el.text}" (class: ${el.className})`);
          });
          
          // Пытаемся кликнуть на первый найденный элемент
          console.log('🖱️ Пытаемся кликнуть на элемент создания...');
          const firstButton = createElements[0];
          
          if (firstButton.tag === 'A' && firstButton.href) {
            await page.goto(firstButton.href);
          } else {
            await page.evaluate((buttonText) => {
              const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
              const targetButton = buttons.find(btn => btn.textContent.trim() === buttonText);
              if (targetButton) {
                targetButton.click();
              }
            }, firstButton.text);
          }
          
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Проверяем, появилась ли форма создания проекта
          const projectForm = await page.evaluate(() => {
            const forms = Array.from(document.querySelectorAll('form'));
            const inputs = Array.from(document.querySelectorAll('input[type="text"], input[name*="name"], input[name*="title"], textarea'));
            
            return {
              formsCount: forms.length,
              inputsCount: inputs.length,
              inputs: inputs.map(input => ({
                type: input.type,
                name: input.name,
                placeholder: input.placeholder
              }))
            };
          });
          
          console.log('📝 Информация о формах:', projectForm);
          
          if (projectForm.inputsCount > 0) {
            console.log('✅ Найдена форма создания проекта!');
            
            // Заполняем форму
            console.log('📝 Заполняем форму создания проекта...');
            
            const nameInput = await page.$('input[name*="name"], input[name*="title"], input[type="text"]');
            if (nameInput) {
              await nameInput.type('Тестовый проект ' + Date.now());
              console.log('✅ Название проекта введено');
            }
            
            const descInput = await page.$('textarea, input[name*="desc"], input[name*="description"]');
            if (descInput) {
              await descInput.type('Описание тестового проекта');
              console.log('✅ Описание проекта введено');
            }
            
            // Ищем кнопку сохранения
            const saveButton = await page.evaluate(() => {
              const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
              const saveBtn = buttons.find(btn => {
                const text = btn.textContent.toLowerCase();
                return text.includes('создать') || text.includes('create') || 
                       text.includes('сохранить') || text.includes('save') ||
                       text.includes('добавить') || text.includes('add');
              });
              return saveBtn ? saveBtn.textContent.trim() : null;
            });
            
            if (saveButton) {
              console.log(`🖱️ Нажимаем кнопку: ${saveButton}`);
              await page.evaluate((buttonText) => {
                const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
                const targetButton = buttons.find(btn => btn.textContent.trim() === buttonText);
                if (targetButton) {
                  targetButton.click();
                }
              }, saveButton);
              
              await new Promise(resolve => setTimeout(resolve, 5000));
              
              console.log('📍 URL после создания:', page.url());
              
              // Проверяем результат
              const result = await page.evaluate(() => {
                const successMessages = Array.from(document.querySelectorAll('*')).filter(el => {
                  const text = el.textContent.toLowerCase();
                  return text.includes('успешно') || text.includes('создан') || 
                         text.includes('success') || text.includes('created');
                });
                
                return {
                  successCount: successMessages.length,
                  messages: successMessages.map(el => el.textContent.trim()).slice(0, 3)
                };
              });
              
              if (result.successCount > 0) {
                console.log('🎉 УСПЕХ! Проект создан успешно!');
                console.log('📋 Сообщения об успехе:', result.messages);
                
                // Делаем скриншот успеха
                await page.screenshot({ path: 'project-created-success.png', fullPage: true });
                console.log('📸 Скриншот сохранен: project-created-success.png');
                
                console.log('⏳ Ожидание 10 секунд для просмотра результата...');
                await new Promise(resolve => setTimeout(resolve, 10000));
                
                await browser.close();
                return;
              } else {
                console.log('⚠️ Сообщения об успехе не найдены, проверяем ошибки...');
              }
            } else {
              console.log('❌ Кнопка сохранения не найдена');
            }
          } else {
            console.log('❌ Форма создания проекта не найдена');
          }
          
          break; // Выходим из цикла, если нашли элементы создания
        } else {
          console.log('❌ Элементы создания проекта не найдены');
        }
      } catch (error) {
        console.log(`❌ Ошибка при переходе к ${url}:`, error.message);
      }
    }
    
    console.log('⏳ Ожидание 15 секунд для ручного анализа...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error.message);
  } finally {
    console.log('🔒 Браузер закрыт');
    await browser.close();
  }
})();