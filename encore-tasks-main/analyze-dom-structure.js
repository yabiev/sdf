const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Анализ DOM-структуры страницы...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('📄 Переход на главную страницу...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    
    // Ждем загрузки страницы
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🔑 Проверяем состояние авторизации...');
    
    // Проверяем, есть ли форма входа
    const loginForm = await page.$('form');
    const loginButton = await page.$('button:contains("Вход"), button:contains("Login"), a:contains("Вход"), a:contains("Login")');
    
    if (loginForm || loginButton) {
      console.log('📝 Выполняем вход...');
      
      // Ищем кнопку входа
      const loginBtn = await page.$x('//button[contains(text(), "Вход")] | //a[contains(text(), "Вход")] | //button[contains(text(), "Login")] | //a[contains(text(), "Login")] | //button[contains(text(), "Войти")] | //a[contains(text(), "Войти")] | //input[@value="Войти"] | //input[@value="Login"]');
      
      if (loginBtn.length > 0) {
        await loginBtn[0].click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Заполняем форму
        const emailInput = await page.$('input[type="email"], input[name="email"], input[placeholder*="email"], input[placeholder*="Email"], input[placeholder*="почта"]');
        const passwordInput = await page.$('input[type="password"], input[name="password"], input[placeholder*="password"], input[placeholder*="пароль"]');
        
        if (emailInput && passwordInput) {
          await emailInput.type('test@example.com');
          await passwordInput.type('password123');
          
          // Ищем кнопку отправки формы
          const submitBtn = await page.$x('//button[contains(text(), "Войти")] | //button[contains(text(), "Login")] | //input[@type="submit"] | //button[@type="submit"]');
          
          if (submitBtn.length > 0) {
            await submitBtn[0].click();
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      }
    }
    
    console.log('🔍 Анализируем DOM после входа...');
    
    // Получаем полную структуру DOM
    const bodyHTML = await page.evaluate(() => {
      return document.body.innerHTML;
    });
    
    console.log('📊 HTML содержимое body (первые 2000 символов):');
    console.log(bodyHTML.substring(0, 2000));
    
    // Ищем все кнопки
    const allButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a[role="button"]'));
      return buttons.map(btn => ({
        tagName: btn.tagName,
        text: btn.textContent?.trim() || '',
        className: btn.className || '',
        id: btn.id || '',
        type: btn.type || '',
        href: btn.href || ''
      }));
    });
    
    console.log('\n🔘 Все найденные кнопки и ссылки:');
    allButtons.forEach((btn, index) => {
      console.log(`  ${index + 1}. ${btn.tagName}: "${btn.text}" (class: ${btn.className}, id: ${btn.id})`);
    });
    
    // Ищем элементы, связанные с проектами
    const projectElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const projectRelated = elements.filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        const className = el.className?.toLowerCase() || '';
        const id = el.id?.toLowerCase() || '';
        
        return text.includes('проект') || text.includes('project') || 
               text.includes('создать') || text.includes('create') || 
               text.includes('новый') || text.includes('new') ||
               className.includes('project') || className.includes('create') ||
               id.includes('project') || id.includes('create');
      });
      
      return projectRelated.map(el => ({
        tagName: el.tagName,
        text: el.textContent?.trim().substring(0, 100) || '',
        className: el.className || '',
        id: el.id || ''
      }));
    });
    
    console.log('\n📋 Элементы, связанные с проектами:');
    projectElements.forEach((el, index) => {
      console.log(`  ${index + 1}. ${el.tagName}: "${el.text}" (class: ${el.className}, id: ${el.id})`);
    });
    
    // Ищем навигационные элементы
    const navElements = await page.evaluate(() => {
      const navs = Array.from(document.querySelectorAll('nav, .nav, .navigation, .menu, .header, .sidebar'));
      return navs.map(nav => ({
        tagName: nav.tagName,
        text: nav.textContent?.trim().substring(0, 200) || '',
        className: nav.className || '',
        id: nav.id || ''
      }));
    });
    
    console.log('\n🧭 Навигационные элементы:');
    navElements.forEach((nav, index) => {
      console.log(`  ${index + 1}. ${nav.tagName}: "${nav.text}" (class: ${nav.className}, id: ${nav.id})`);
    });
    
    // Проверяем наличие модальных окон или скрытых элементов
    const hiddenElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('[style*="display: none"], [style*="visibility: hidden"], .hidden, .d-none'));
      return elements.map(el => ({
        tagName: el.tagName,
        text: el.textContent?.trim().substring(0, 100) || '',
        className: el.className || '',
        id: el.id || ''
      }));
    });
    
    console.log('\n👻 Скрытые элементы:');
    hiddenElements.forEach((el, index) => {
      console.log(`  ${index + 1}. ${el.tagName}: "${el.text}" (class: ${el.className}, id: ${el.id})`);
    });
    
    console.log('\n⏳ Ожидание 15 секунд для ручного анализа...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await browser.close();
    console.log('🔒 Браузер закрыт');
  }
})