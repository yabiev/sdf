const puppeteer = require('puppeteer');

async function debugUIElements() {
  console.log('🔍 Отладка элементов интерфейса...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  try {
    const page = await browser.newPage();
    
    // Переход на главную страницу
    console.log('📄 Переход на главную страницу...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    
    // Проверка статуса авторизации
    console.log('🔍 Проверка статуса авторизации...');
    const authStatus = await page.evaluate(() => {
      // Ищем индикаторы авторизации
      const logoutButton = document.querySelector('button');
      const authElements = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent && (
          el.textContent.includes('Выйти') ||
          el.textContent.includes('Logout') ||
          el.textContent.includes('Profile') ||
          el.textContent.includes('Профиль')
        )
      );
      
      return {
        hasLogoutButton: !!logoutButton,
        authElementsCount: authElements.length,
        authElementsText: authElements.map(el => el.textContent.trim())
      };
    });
    
    console.log('🔐 Статус авторизации:', authStatus);
    
    // Если не авторизован, выполняем вход
    if (authStatus.authElementsCount === 0) {
      console.log('🔑 Выполняем вход...');
      
      // Поиск кнопки входа
      const loginButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        return buttons.find(btn => 
          btn.textContent.includes('Войти') || 
          btn.textContent.includes('Login') ||
          btn.textContent.includes('Sign in')
        );
      });
      
      if (loginButton && loginButton.asElement()) {
        await loginButton.asElement().click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Заполнение формы входа
        await page.type('input[type="email"], input[name="email"]', 'test@example.com');
        await page.type('input[type="password"], input[name="password"]', 'password123');
        
        // Отправка формы
        const submitButton = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(btn => 
            btn.textContent.includes('Войти') || 
            btn.textContent.includes('Login') ||
            btn.textContent.includes('Sign in') ||
            btn.type === 'submit'
          );
        });
        
        if (submitButton && submitButton.asElement()) {
          await submitButton.asElement().click();
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }
    
    // Анализ всех элементов на странице
    console.log('🔍 Анализ всех элементов на странице...');
    const pageElements = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const links = Array.from(document.querySelectorAll('a'));
      const inputs = Array.from(document.querySelectorAll('input'));
      const forms = Array.from(document.querySelectorAll('form'));
      
      return {
        buttons: buttons.map(btn => ({
          text: btn.textContent.trim(),
          id: btn.id,
          className: btn.className,
          type: btn.type,
          dataTestId: btn.getAttribute('data-testid')
        })),
        links: links.map(link => ({
          text: link.textContent.trim(),
          href: link.href,
          id: link.id,
          className: link.className
        })),
        inputs: inputs.map(input => ({
          type: input.type,
          name: input.name,
          placeholder: input.placeholder,
          id: input.id
        })),
        forms: forms.length,
        pageTitle: document.title,
        url: window.location.href
      };
    });
    
    console.log('📊 Элементы страницы:');
    console.log('Заголовок:', pageElements.pageTitle);
    console.log('URL:', pageElements.url);
    console.log('\n🔘 Кнопки:');
    pageElements.buttons.forEach((btn, i) => {
      console.log(`  ${i + 1}. "${btn.text}" (id: ${btn.id}, class: ${btn.className}, type: ${btn.type}, testId: ${btn.dataTestId})`);
    });
    
    console.log('\n🔗 Ссылки:');
    pageElements.links.forEach((link, i) => {
      console.log(`  ${i + 1}. "${link.text}" (href: ${link.href}, id: ${link.id})`);
    });
    
    console.log('\n📝 Поля ввода:');
    pageElements.inputs.forEach((input, i) => {
      console.log(`  ${i + 1}. ${input.type} (name: ${input.name}, placeholder: ${input.placeholder})`);
    });
    
    console.log(`\n📋 Форм на странице: ${pageElements.forms}`);
    
    // Поиск элементов, связанных с проектами
    console.log('\n🔍 Поиск элементов, связанных с проектами...');
    const projectElements = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));
      const projectRelated = allElements.filter(el => {
        const text = el.textContent.toLowerCase();
        return text.includes('проект') || 
               text.includes('project') || 
               text.includes('создать') ||
               text.includes('create') ||
               text.includes('новый') ||
               text.includes('new') ||
               text.includes('+');
      });
      
      return projectRelated.map(el => ({
        tagName: el.tagName,
        text: el.textContent.trim().substring(0, 100),
        id: el.id,
        className: el.className,
        dataTestId: el.getAttribute('data-testid')
      }));
    });
    
    console.log('📁 Элементы, связанные с проектами:');
    projectElements.forEach((el, i) => {
      console.log(`  ${i + 1}. ${el.tagName}: "${el.text}" (id: ${el.id}, class: ${el.className}, testId: ${el.dataTestId})`);
    });
    
    // Ждем 10 секунд для ручного анализа
    console.log('\n⏳ Ожидание 10 секунд для ручного анализа...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('💥 Ошибка во время отладки:', error.message);
  } finally {
    await browser.close();
    console.log('🔒 Браузер закрыт');
  }
}

debugUIElements().catch(console.error);