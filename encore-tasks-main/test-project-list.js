const puppeteer = require('puppeteer');

async function testProjectList() {
  console.log('🚀 Начинаем проверку списка проектов...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  try {
    const page = await browser.newPage();
    
    // Переходим на страницу
    console.log('📱 Переходим на http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    // Ждем загрузки страницы
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Авторизация
    console.log('🔐 Выполняем авторизацию...');
    
    // Вводим email
    const emailInput = await page.$('input[type="email"], input[name="email"]');
    if (emailInput) {
      await emailInput.type('axelencore@mail.ru');
      console.log('✉️ Email введен');
    }
    
    // Вводим пароль
    const passwordInput = await page.$('input[type="password"], input[name="password"]');
    if (passwordInput) {
      await passwordInput.type('Ad580dc6axelencore');
      console.log('🔑 Пароль введен');
    }
    
    // Нажимаем кнопку входа
    let loginButton = await page.$('button[type="submit"]');
    
    if (!loginButton) {
      // Поиск кнопки по тексту
      loginButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => {
          const text = btn.textContent?.toLowerCase() || '';
          return text.includes('войти') || text.includes('login') || text.includes('sign in');
        });
      });
      
      if (loginButton && loginButton.asElement) {
        loginButton = loginButton.asElement();
      } else {
        loginButton = null;
      }
    }
    
    if (loginButton) {
      await loginButton.click();
      console.log('🚪 Кнопка входа нажата');
    }
    
    // Ждем загрузки после авторизации
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Проверяем список проектов
    console.log('📋 Проверяем список проектов...');
    
    // Ищем проекты в интерфейсе
    const projects = await page.evaluate(() => {
      // Ищем элементы, которые могут содержать проекты
      const projectElements = [];
      
      // Поиск по различным селекторам
      const selectors = [
        '[data-testid*="project"]',
        '.project-item',
        '.project-card',
        '[class*="project"]',
        'div:has(h1), div:has(h2), div:has(h3)' // Элементы с заголовками
      ];
      
      selectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 0 && text.length < 200) {
              projectElements.push({
                selector,
                text: text.substring(0, 100),
                className: el.className,
                tagName: el.tagName
              });
            }
          });
        } catch (e) {
          // Игнорируем ошибки селекторов
        }
      });
      
      return projectElements;
    });
    
    console.log(`📊 Найдено элементов: ${projects.length}`);
    
    if (projects.length > 0) {
      console.log('🎯 Найденные элементы:');
      projects.slice(0, 10).forEach((project, index) => {
        console.log(`  ${index + 1}. [${project.tagName}] ${project.text}`);
      });
    }
    
    // Ищем конкретно наш тестовый проект
    const testProject = projects.find(p => 
      p.text.toLowerCase().includes('тестовый проект') ||
      p.text.toLowerCase().includes('test project')
    );
    
    if (testProject) {
      console.log('✅ Тестовый проект найден в списке!');
      console.log(`📝 Текст: ${testProject.text}`);
    } else {
      console.log('❌ Тестовый проект не найден в списке');
    }
    
    // Проверяем общее количество проектов
    const projectCount = projects.filter(p => 
      p.text.length > 5 && 
      !p.text.toLowerCase().includes('loading') &&
      !p.text.toLowerCase().includes('загрузка')
    ).length;
    
    console.log(`📈 Общее количество проектов: ${projectCount}`);
    
    // Получаем логи консоли
    const logs = await page.evaluate(() => {
      return window.consoleLogs || [];
    });
    
    if (logs.length > 0) {
      console.log('\n📋 Логи консоли браузера:');
      logs.forEach(log => {
        console.log(`🖥️ Console ${log.type}: ${log.message}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка при проверке списка проектов:', error.message);
  } finally {
    await browser.close();
    console.log('🏁 Завершение проверки...');
  }
}

testProjectList();