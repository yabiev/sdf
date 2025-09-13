const puppeteer = require('puppeteer');

async function debugAfterLogin() {
  console.log('🔍 Отладка состояния после авторизации...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('📍 Переход на главную страницу...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    
    console.log('⏳ Ожидание загрузки страницы...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Ищем кнопку "Вход" для переключения на форму входа
    console.log('🔍 Поиск кнопки входа...');
    const loginTabButton = await page.$('button');
    if (loginTabButton) {
      const buttonText = await page.evaluate(btn => btn.textContent, loginTabButton);
      console.log('📋 Текст первой кнопки:', buttonText);
      if (buttonText.includes('Вход')) {
        console.log('✅ Найдена кнопка "Вход", кликаем...');
        await loginTabButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Заполняем форму входа
    console.log('📝 Заполнение формы входа...');
    
    // Ищем поле email
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      console.log('✅ Найдено поле email');
      await emailInput.click();
      await emailInput.type('test@example.com');
    }
    
    // Ищем поле пароля
    const passwordInput = await page.$('input[type="password"]');
    if (passwordInput) {
      console.log('✅ Найдено поле пароля');
      await passwordInput.click();
      await passwordInput.type('password123');
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Отправляем форму
    console.log('📤 Отправка формы входа...');
    const submitButtons = await page.$$('button[type="submit"]');
    for (const btn of submitButtons) {
      const text = await page.evaluate(b => b.textContent, btn);
      if (text.includes('Войти')) {
        console.log('✅ Кликаем кнопку "Войти"');
        await btn.click();
        break;
      }
    }
    
    // Ждем авторизации
    console.log('⏳ Ожидание завершения авторизации...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Проверяем состояние после авторизации
    console.log('\n🔍 АНАЛИЗ СТРАНИЦЫ ПОСЛЕ АВТОРИЗАЦИИ:');
    
    // Получаем URL
    const currentUrl = page.url();
    console.log('📍 Текущий URL:', currentUrl);
    
    // Получаем заголовок
    const title = await page.title();
    console.log('📋 Заголовок страницы:', title);
    
    // Анализируем все кнопки
    const allButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.map((btn, index) => ({
        index: index,
        text: btn.textContent?.trim() || '',
        type: btn.type || '',
        className: btn.className || '',
        id: btn.id || '',
        disabled: btn.disabled,
        innerHTML: btn.innerHTML.substring(0, 100) + '...'
      }));
    });
    
    console.log('\n📋 Все кнопки после авторизации:');
    allButtons.forEach((btn) => {
      console.log(`${btn.index + 1}. "${btn.text}" (type: ${btn.type}, disabled: ${btn.disabled})`);
      console.log(`   className: "${btn.className}", id: "${btn.id}"`);
      console.log('---');
    });
    
    // Ищем кнопки создания проекта
    console.log('\n🔍 ПОИСК КНОПОК СОЗДАНИЯ ПРОЕКТА:');
    
    const projectButtons = allButtons.filter(btn => 
      btn.text.toLowerCase().includes('создать') || 
      btn.text.toLowerCase().includes('проект') ||
      btn.text.toLowerCase().includes('create') ||
      btn.text.toLowerCase().includes('project') ||
      btn.text.toLowerCase().includes('новый') ||
      btn.text.toLowerCase().includes('добавить') ||
      btn.text.toLowerCase().includes('+') ||
      btn.className.includes('create') ||
      btn.className.includes('add')
    );
    
    if (projectButtons.length > 0) {
      console.log('✅ Найдены потенциальные кнопки создания проекта:');
      projectButtons.forEach(btn => {
        console.log(`   ${btn.index + 1}. "${btn.text}" (className: "${btn.className}")`);
      });
    } else {
      console.log('❌ Кнопки создания проекта не найдены');
    }
    
    // Анализируем ссылки
    const allLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links.map((link, index) => ({
        index: index,
        text: link.textContent?.trim() || '',
        href: link.href || '',
        className: link.className || '',
        id: link.id || ''
      }));
    });
    
    console.log('\n📋 Все ссылки на странице:');
    allLinks.forEach((link) => {
      console.log(`${link.index + 1}. "${link.text}" -> ${link.href}`);
      console.log(`   className: "${link.className}", id: "${link.id}"`);
      console.log('---');
    });
    
    // Ищем элементы с текстом о проектах
    const textContent = await page.evaluate(() => {
      return document.body.textContent || '';
    });
    
    console.log('\n📝 Поиск текста о проектах на странице:');
    const projectKeywords = ['проект', 'создать', 'добавить', 'новый', 'project', 'create', 'add', 'new'];
    const foundKeywords = projectKeywords.filter(keyword => 
      textContent.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (foundKeywords.length > 0) {
      console.log('✅ Найдены ключевые слова:', foundKeywords.join(', '));
    } else {
      console.log('❌ Ключевые слова о проектах не найдены');
    }
    
    // Проверяем наличие элементов навигации
    const navElements = await page.evaluate(() => {
      const navs = Array.from(document.querySelectorAll('nav, .nav, [role="navigation"]'));
      return navs.map((nav, index) => ({
        index: index,
        text: nav.textContent?.trim().substring(0, 100) || '',
        className: nav.className || '',
        id: nav.id || ''
      }));
    });
    
    if (navElements.length > 0) {
      console.log('\n📋 Элементы навигации:');
      navElements.forEach((nav) => {
        console.log(`${nav.index + 1}. "${nav.text}..."`);
        console.log(`   className: "${nav.className}", id: "${nav.id}"`);
        console.log('---');
      });
    }
    
    console.log('\n📸 Создание скриншота после авторизации...');
    await page.screenshot({ path: 'debug-after-login-screenshot.png', fullPage: true });
    console.log('✅ Скриншот сохранен: debug-after-login-screenshot.png');
    
    console.log('\n⏳ Оставляем браузер открытым для ручной проверки (60 секунд)...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    
  } catch (error) {
    console.error('❌ Ошибка отладки:', error);
  } finally {
    await browser.close();
  }
}

debugAfterLogin().catch(console.error);