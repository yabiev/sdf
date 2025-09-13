const puppeteer = require('puppeteer');

async function debugUIAfterLogin() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('🚀 Запуск отладки UI после авторизации...');
    
    // Переход на главную страницу
    await page.goto('http://localhost:3001');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Авторизация
    console.log('\n=== АВТОРИЗАЦИЯ ===');
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
      return;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Заполнение формы
    await page.type('input[type="email"]', 'test@example.com');
    await page.type('input[type="password"]', 'password123');
    
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      await submitButton.click();
      console.log('✅ Форма отправлена');
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Анализ интерфейса после авторизации
    console.log('\n=== АНАЛИЗ ИНТЕРФЕЙСА ПОСЛЕ АВТОРИЗАЦИИ ===');
    
    const pageInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        bodyText: document.body.innerText.substring(0, 500)
      };
    });
    
    console.log('📍 URL:', pageInfo.url);
    console.log('📋 Заголовок:', pageInfo.title);
    console.log('📄 Содержимое страницы (первые 500 символов):');
    console.log(pageInfo.bodyText);
    
    // Поиск всех кнопок
    const buttons = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      return allButtons.map((btn, index) => ({
        index: index + 1,
        text: btn.textContent?.trim() || '',
        className: btn.className || '',
        id: btn.id || '',
        type: btn.type || '',
        visible: btn.offsetParent !== null
      })).filter(btn => btn.visible && btn.text);
    });
    
    console.log('\n🔘 Все видимые кнопки:');
    buttons.forEach(btn => {
      console.log(`   ${btn.index}. "${btn.text}" (type: ${btn.type}, id: ${btn.id})`);
    });
    
    // Поиск ссылок
    const links = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a'));
      return allLinks.map((link, index) => ({
        index: index + 1,
        text: link.textContent?.trim() || '',
        href: link.href || '',
        visible: link.offsetParent !== null
      })).filter(link => link.visible && link.text);
    });
    
    console.log('\n🔗 Все видимые ссылки:');
    links.forEach(link => {
      console.log(`   ${link.index}. "${link.text}" -> ${link.href}`);
    });
    
    // Поиск элементов навигации
    const navElements = await page.evaluate(() => {
      const navs = Array.from(document.querySelectorAll('nav, .nav, [role="navigation"]'));
      const menus = Array.from(document.querySelectorAll('.menu, .navbar, .header'));
      const allNavElements = [...navs, ...menus];
      
      return allNavElements.map((el, index) => ({
        index: index + 1,
        tagName: el.tagName,
        className: el.className || '',
        text: el.textContent?.trim().substring(0, 200) || ''
      }));
    });
    
    console.log('\n🧭 Элементы навигации:');
    navElements.forEach(nav => {
      console.log(`   ${nav.index}. <${nav.tagName}> (class: ${nav.className})`);
      console.log(`      Текст: ${nav.text}`);
    });
    
    // Поиск форм
    const forms = await page.evaluate(() => {
      const allForms = Array.from(document.querySelectorAll('form'));
      return allForms.map((form, index) => {
        const inputs = Array.from(form.querySelectorAll('input, textarea, select'));
        return {
          index: index + 1,
          action: form.action || '',
          method: form.method || '',
          inputs: inputs.map(input => ({
            type: input.type || input.tagName,
            name: input.name || '',
            placeholder: input.placeholder || '',
            id: input.id || ''
          }))
        };
      });
    });
    
    console.log('\n📝 Формы на странице:');
    forms.forEach(form => {
      console.log(`   ${form.index}. Форма (action: ${form.action}, method: ${form.method})`);
      form.inputs.forEach((input, i) => {
        console.log(`      ${i + 1}. ${input.type} (name: ${input.name}, placeholder: ${input.placeholder})`);
      });
    });
    
    // Поиск элементов с ключевыми словами
    const keywordElements = await page.evaluate(() => {
      const keywords = ['проект', 'project', 'создать', 'create', 'добавить', 'add', 'новый', 'new'];
      const allElements = Array.from(document.querySelectorAll('*'));
      
      const found = [];
      allElements.forEach(el => {
        const text = el.textContent?.toLowerCase() || '';
        const hasKeyword = keywords.some(keyword => text.includes(keyword.toLowerCase()));
        
        if (hasKeyword && el.offsetParent !== null && text.length < 100) {
          found.push({
            tagName: el.tagName,
            text: el.textContent?.trim() || '',
            className: el.className || '',
            id: el.id || ''
          });
        }
      });
      
      return found.slice(0, 10); // Ограничиваем до 10 элементов
    });
    
    console.log('\n🔍 Элементы с ключевыми словами:');
    keywordElements.forEach((el, index) => {
      console.log(`   ${index + 1}. <${el.tagName}> "${el.text}" (class: ${el.className})`);
    });
    
    // Сохранение скриншота
    await page.screenshot({ path: 'debug-ui-after-login-screenshot.png', fullPage: true });
    console.log('\n📸 Скриншот сохранен: debug-ui-after-login-screenshot.png');
    
    console.log('\n⏳ Браузер остается открытым 60 секунд для ручной проверки...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    
  } catch (error) {
    console.error('💥 Ошибка:', error.message);
    await page.screenshot({ path: 'debug-ui-error-screenshot.png' });
  } finally {
    await browser.close();
  }
}

debugUIAfterLogin();