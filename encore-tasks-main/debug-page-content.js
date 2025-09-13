const puppeteer = require('puppeteer');

async function debugPageContent() {
  console.log('🚀 Запуск отладки содержимого страницы...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  // Переходим на главную страницу
  console.log('📍 Переход на главную страницу...');
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
  
  // Ждем загрузки
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Получаем заголовок страницы
  const title = await page.title();
  console.log('📄 Заголовок страницы:', title);
  
  // Получаем URL
  const url = await page.url();
  console.log('🔗 Текущий URL:', url);
  
  // Ищем все кнопки и ссылки
  console.log('\n🔍 Поиск всех кнопок и ссылок...');
  const buttons = await page.evaluate(() => {
    const allButtons = Array.from(document.querySelectorAll('button, a, [role="button"], input[type="submit"]'));
    return allButtons.map(btn => ({
      tag: btn.tagName,
      text: btn.textContent?.trim() || '',
      type: btn.type || '',
      className: btn.className || '',
      id: btn.id || '',
      href: btn.href || ''
    })).filter(btn => btn.text.length > 0);
  });
  
  console.log('\n📋 Найденные кнопки и ссылки:');
  buttons.forEach((btn, index) => {
    console.log(`${index + 1}. [${btn.tag}] "${btn.text}" (class: ${btn.className}, id: ${btn.id})`);
  });
  
  // Ищем формы
  console.log('\n🔍 Поиск форм...');
  const forms = await page.evaluate(() => {
    const allForms = Array.from(document.querySelectorAll('form'));
    return allForms.map(form => ({
      action: form.action || '',
      method: form.method || '',
      className: form.className || '',
      id: form.id || '',
      inputs: Array.from(form.querySelectorAll('input')).map(input => ({
        type: input.type,
        name: input.name,
        placeholder: input.placeholder || '',
        id: input.id || ''
      }))
    }));
  });
  
  console.log('\n📋 Найденные формы:');
  forms.forEach((form, index) => {
    console.log(`${index + 1}. Форма (action: ${form.action}, method: ${form.method})`);
    form.inputs.forEach((input, inputIndex) => {
      console.log(`   ${inputIndex + 1}. Input: type=${input.type}, name=${input.name}, placeholder="${input.placeholder}"`);
    });
  });
  
  // Ищем элементы с текстом "вход", "login", "sign in"
  console.log('\n🔍 Поиск элементов авторизации...');
  const authElements = await page.evaluate(() => {
    const allElements = Array.from(document.querySelectorAll('*'));
    const authKeywords = ['вход', 'войти', 'login', 'sign in', 'log in', 'авторизация', 'auth'];
    
    return allElements.filter(el => {
      const text = el.textContent?.trim().toLowerCase() || '';
      return authKeywords.some(keyword => text.includes(keyword));
    }).map(el => ({
      tag: el.tagName,
      text: el.textContent?.trim() || '',
      className: el.className || '',
      id: el.id || ''
    }));
  });
  
  console.log('\n📋 Элементы авторизации:');
  authElements.forEach((el, index) => {
    console.log(`${index + 1}. [${el.tag}] "${el.text}" (class: ${el.className}, id: ${el.id})`);
  });
  
  // Делаем скриншот
  console.log('\n📸 Создание скриншота...');
  await page.screenshot({ path: 'debug-page-screenshot.png', fullPage: true });
  console.log('✅ Скриншот сохранен как debug-page-screenshot.png');
  
  console.log('\n⏸️  Браузер остается открытым для ручной проверки...');
  console.log('Нажмите Ctrl+C для завершения');
  
  // Оставляем браузер открытым
  await new Promise(() => {});
}

debugPageContent().catch(console.error);