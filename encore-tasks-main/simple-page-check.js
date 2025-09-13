const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Простая проверка страницы...');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    console.log('📄 Переход на localhost:3001...');
    await page.goto('http://localhost:3001', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });
    
    console.log('✅ Страница загружена');
    
    // Получаем заголовок страницы
    const title = await page.title();
    console.log('📋 Заголовок страницы:', title);
    
    // Получаем текст body
    const bodyText = await page.evaluate(() => {
      return document.body.textContent || '';
    });
    
    console.log('📝 Текст на странице (первые 500 символов):');
    console.log(bodyText.substring(0, 500));
    
    // Ищем все кнопки и ссылки
    const buttons = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]'));
      return btns.map(btn => ({
        tag: btn.tagName,
        text: btn.textContent?.trim() || btn.value || '',
        href: btn.href || '',
        type: btn.type || ''
      })).filter(btn => btn.text.length > 0);
    });
    
    console.log('\n🔘 Найденные кнопки и ссылки:');
    buttons.forEach((btn, i) => {
      console.log(`  ${i + 1}. ${btn.tag}: "${btn.text}"${btn.href ? ` (${btn.href})` : ''}`);
    });
    
    // Проверяем наличие форм
    const forms = await page.evaluate(() => {
      const formElements = Array.from(document.querySelectorAll('form'));
      return formElements.map(form => ({
        action: form.action || '',
        method: form.method || '',
        inputs: Array.from(form.querySelectorAll('input')).map(input => ({
          type: input.type,
          name: input.name,
          placeholder: input.placeholder
        }))
      }));
    });
    
    console.log('\n📝 Найденные формы:');
    forms.forEach((form, i) => {
      console.log(`  ${i + 1}. Форма: action="${form.action}", method="${form.method}"`);
      form.inputs.forEach((input, j) => {
        console.log(`    ${j + 1}. Input: type="${input.type}", name="${input.name}", placeholder="${input.placeholder}"`);
      });
    });
    
    console.log('\n✅ Анализ завершен');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Браузер закрыт');
    }
  }
})();