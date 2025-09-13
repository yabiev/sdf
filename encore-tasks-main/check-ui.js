const puppeteer = require('puppeteer');

(async () => {
  console.log('Проверка структуры UI после входа...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  try {
    const page = await browser.newPage();
    
    console.log('1. Переход на главную страницу...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
    
    console.log('2. Ожидание загрузки формы входа...');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    console.log('3. Заполнение формы входа...');
    await page.type('input[type="email"]', 'admin@example.com');
    await page.type('input[type="password"]', 'admin123');
    
    console.log('4. Нажатие кнопки входа...');
    await page.click('button[type="submit"]');
    
    console.log('5. Ожидание загрузки главной страницы...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('6. Анализ структуры страницы...');
    
    // Получаем все кнопки и ссылки
    const buttons = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
      return allButtons.map(btn => ({
        text: btn.textContent?.trim() || '',
        tagName: btn.tagName,
        className: btn.className,
        id: btn.id
      })).filter(btn => btn.text.length > 0);
    });
    
    console.log('\n=== Найденные кнопки и ссылки ===');
    buttons.forEach((btn, index) => {
      console.log(`${index + 1}. ${btn.tagName}: "${btn.text}" (class: ${btn.className}, id: ${btn.id})`);
    });
    
    // Ищем элементы навигации
    const navElements = await page.evaluate(() => {
      const navs = Array.from(document.querySelectorAll('nav, .sidebar, .navigation, [role="navigation"]'));
      return navs.map(nav => ({
        tagName: nav.tagName,
        className: nav.className,
        id: nav.id,
        text: nav.textContent?.substring(0, 200) || ''
      }));
    });
    
    console.log('\n=== Элементы навигации ===');
    navElements.forEach((nav, index) => {
      console.log(`${index + 1}. ${nav.tagName}: class="${nav.className}", id="${nav.id}"`);
      console.log(`   Текст: ${nav.text.substring(0, 100)}...`);
    });
    
    // Проверяем наличие канбан доски
    const kanbanExists = await page.evaluate(() => {
      return !!document.querySelector('.kanban, [class*="kanban"], [data-testid*="kanban"]');
    });
    
    console.log(`\n=== Канбан доска найдена: ${kanbanExists} ===`);
    
    // Ищем элементы с текстом "Проекты"
    const projectElements = await page.evaluate(() => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      const textNodes = [];
      let node;
      
      while (node = walker.nextNode()) {
        if (node.textContent.includes('Проект') || node.textContent.includes('Project')) {
          textNodes.push({
            text: node.textContent.trim(),
            parentTag: node.parentElement?.tagName,
            parentClass: node.parentElement?.className
          });
        }
      }
      
      return textNodes;
    });
    
    console.log('\n=== Элементы с текстом "Проект" ===');
    projectElements.forEach((elem, index) => {
      console.log(`${index + 1}. "${elem.text}" в ${elem.parentTag} (class: ${elem.parentClass})`);
    });
    
    await page.screenshot({ path: 'ui-analysis.png', fullPage: true });
    console.log('\nСкриншот сохранен: ui-analysis.png');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await browser.close();
  }
})();