const puppeteer = require('puppeteer');

async function testSimpleProjectCreation() {
  let browser;
  
  try {
    console.log('🚀 Запуск простого теста создания проекта...');
    
    browser = await puppeteer.launch({ 
      headless: false, 
      defaultViewport: null,
      args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    // Переход на страницу
    console.log('📄 Переход на страницу...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Проверим, что на странице
    const pageTitle = await page.title();
    console.log('Заголовок страницы:', pageTitle);
    
    const pageContent = await page.evaluate(() => document.body.textContent);
    console.log('Содержимое страницы (первые 200 символов):', pageContent.substring(0, 200));
    
    // Попробуем найти любые кнопки
    const allButtons = await page.$$eval('button', buttons => 
      buttons.map(btn => ({
        text: btn.textContent.trim(),
        visible: btn.offsetParent !== null,
        disabled: btn.disabled
      }))
    );
    
    console.log('Все кнопки на странице:', allButtons);
    
    // Попробуем найти ссылки
    const allLinks = await page.$$eval('a', links => 
      links.map(link => ({
        text: link.textContent.trim(),
        href: link.href,
        visible: link.offsetParent !== null
      }))
    );
    
    console.log('Все ссылки на странице:', allLinks);
    
    // Попробуем найти формы
    const forms = await page.$$eval('form', forms => 
      forms.map(form => ({
        action: form.action,
        method: form.method,
        inputs: Array.from(form.querySelectorAll('input')).map(input => ({
          type: input.type,
          name: input.name,
          placeholder: input.placeholder
        }))
      }))
    );
    
    console.log('Формы на странице:', forms);
    
    // Сделаем скриншот для анализа
    await page.screenshot({ path: 'current-page-state.png', fullPage: true });
    console.log('Скриншот сохранен как current-page-state.png');
    
    console.log('\n📊 АНАЛИЗ ЗАВЕРШЕН');
    console.log('Проверьте скриншот и логи для понимания текущего состояния приложения');
    
  } catch (error) {
    console.error('❌ Ошибка при анализе:', error.message);
  } finally {
    if (browser) {
      console.log('🔚 Закрытие браузера...');
      await browser.close();
    }
  }
}

// Запуск анализа
testSimpleProjectCreation();