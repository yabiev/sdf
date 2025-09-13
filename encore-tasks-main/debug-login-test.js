const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    console.log('Запуск браузера...');
    browser = await puppeteer.launch({ 
      headless: false, 
      defaultViewport: null,
      args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    console.log('Переход на главную страницу...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    
    // Ждем загрузки React приложения
    console.log('Ожидание загрузки приложения...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Сохранить скриншот после загрузки
    await page.screenshot({ path: 'app-loaded-screenshot.png', fullPage: true });
    
    console.log('URL:', page.url());
    console.log('Заголовок:', await page.title());
    
    // Проверить наличие модального окна входа
    const authModal = await page.evaluate(() => {
      // Ищем модальное окно или форму входа
      const modal = document.querySelector('[data-oid="auth-modal"]');
      const emailInput = document.querySelector('input[type="email"]');
      const passwordInput = document.querySelector('input[type="password"]');
      const submitButton = document.querySelector('button[type="submit"]');
      
      return {
        hasModal: !!modal,
        hasEmailInput: !!emailInput,
        hasPasswordInput: !!passwordInput,
        hasSubmitButton: !!submitButton,
        modalHTML: modal ? modal.outerHTML.substring(0, 200) : null,
        bodyText: document.body.textContent.substring(0, 500)
      };
    });
    
    console.log('Состояние модального окна входа:', authModal);
    
    if (authModal.hasEmailInput && authModal.hasPasswordInput && authModal.hasSubmitButton) {
      console.log('Найдена форма входа, выполняем вход...');
      
      // Заполняем форму
      await page.type('input[type="email"]', 'admin@example.com');
      await page.type('input[type="password"]', 'admin123');
      
      // Нажимаем кнопку входа
      await page.click('button[type="submit"]');
      
      // Ждем обработки входа
      console.log('Ожидание обработки входа...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Проверяем результат входа
      const afterLogin = await page.evaluate(() => {
        const modal = document.querySelector('[data-oid="auth-modal"]');
        const sidebar = document.querySelector('[data-oid*="sidebar"]');
        const projectsButton = Array.from(document.querySelectorAll('button, a')).find(el => 
          el.textContent.toLowerCase().includes('project')
        );
        
        return {
          modalStillVisible: !!modal,
          hasSidebar: !!sidebar,
          hasProjectsButton: !!projectsButton,
          projectsButtonText: projectsButton ? projectsButton.textContent : null,
          bodyText: document.body.textContent.substring(0, 500)
        };
      });
      
      console.log('Состояние после входа:', afterLogin);
      
      await page.screenshot({ path: 'after-login-screenshot.png', fullPage: true });
      
      if (afterLogin.hasProjectsButton) {
        console.log('Найдена кнопка проектов, нажимаем...');
        
        await page.evaluate(() => {
          const projectsButton = Array.from(document.querySelectorAll('button, a')).find(el => 
            el.textContent.toLowerCase().includes('project')
          );
          if (projectsButton) {
            projectsButton.click();
          }
        });
        
        // Ждем загрузки страницы проектов
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Проверяем страницу проектов
        const projectsPage = await page.evaluate(() => {
          const createButton = Array.from(document.querySelectorAll('button')).find(btn => 
            btn.textContent.toLowerCase().includes('create') || 
            btn.textContent.toLowerCase().includes('new') ||
            btn.textContent.toLowerCase().includes('добавить')
          );
          
          return {
            hasCreateButton: !!createButton,
            createButtonText: createButton ? createButton.textContent : null,
            allButtons: Array.from(document.querySelectorAll('button')).map(btn => btn.textContent.trim()).filter(text => text),
            bodyText: document.body.textContent.substring(0, 500)
          };
        });
        
        console.log('Состояние страницы проектов:', projectsPage);
        
        await page.screenshot({ path: 'projects-page-screenshot.png', fullPage: true });
        
        if (projectsPage.hasCreateButton) {
          console.log('Найдена кнопка создания проекта, тестируем создание...');
          
          // Нажимаем кнопку создания проекта
          await page.evaluate(() => {
            const createButton = Array.from(document.querySelectorAll('button')).find(btn => 
              btn.textContent.toLowerCase().includes('create') || 
              btn.textContent.toLowerCase().includes('new') ||
              btn.textContent.toLowerCase().includes('добавить')
            );
            if (createButton) {
              createButton.click();
            }
          });
          
          // Ждем появления формы
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Проверяем форму создания проекта
          const createForm = await page.evaluate(() => {
            const nameInput = document.querySelector('input[name="name"], input[placeholder*="name"], input[placeholder*="название"]');
            const submitButton = document.querySelector('button[type="submit"]');
            
            return {
              hasNameInput: !!nameInput,
              hasSubmitButton: !!submitButton,
              nameInputHTML: nameInput ? nameInput.outerHTML.substring(0, 100) : null
            };
          });
          
          console.log('Форма создания проекта:', createForm);
          
          if (createForm.hasNameInput && createForm.hasSubmitButton) {
            console.log('Заполняем форму создания проекта...');
            
            // Заполняем название проекта
            await page.type('input[name="name"], input[placeholder*="name"], input[placeholder*="название"]', 'Тестовый проект');
            
            // Отправляем форму
            await page.click('button[type="submit"]');
            
            // Ждем обработки
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Проверяем результат
            const result = await page.evaluate(() => {
              const projectItems = document.querySelectorAll('[data-oid*="project"], .project-item, .project-card');
              const errorMessage = document.querySelector('.error, [role="alert"], .toast');
              
              return {
                projectCount: projectItems.length,
                hasError: !!errorMessage,
                errorText: errorMessage ? errorMessage.textContent : null,
                bodyText: document.body.textContent.substring(0, 500)
              };
            });
            
            console.log('Результат создания проекта:', result);
            
            await page.screenshot({ path: 'project-creation-result.png', fullPage: true });
            
            if (result.hasError) {
              console.log('ОШИБКА: Не удалось создать проект:', result.errorText);
            } else {
              console.log('УСПЕХ: Проект создан успешно!');
            }
          } else {
            console.log('ОШИБКА: Форма создания проекта не найдена');
          }
        } else {
          console.log('ОШИБКА: Кнопка создания проекта не найдена');
        }
      } else {
        console.log('ОШИБКА: Кнопка проектов не найдена после входа');
      }
    } else {
      console.log('ОШИБКА: Форма входа не найдена');
    }
    
    console.log('Тест завершен!');
    
  } catch (error) {
    console.error('Ошибка:', error);
    
    if (browser) {
      const pages = await browser.pages();
      if (pages.length > 0) {
        await pages[0].screenshot({ path: 'error-screenshot.png' });
      }
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();