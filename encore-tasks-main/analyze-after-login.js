const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Анализ страницы после входа...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('📱 Переход на localhost:3001...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    
    // Выполняем вход
    console.log('🔐 Выполняем вход в систему...');
    await page.type('input[type="email"]', 'test@example.com');
    await page.type('input[type="password"]', 'password123');
    
    await page.click('button[type="submit"]');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('📍 Текущий URL:', page.url());
    
    // Получаем полный HTML страницы
    const fullHTML = await page.content();
    console.log('📄 Полный HTML страницы (первые 2000 символов):');
    console.log(fullHTML.substring(0, 2000));
    
    // Ищем все элементы с текстом, содержащим "проект", "project", "создать", "create", "new"
    console.log('\n🔍 Поиск элементов связанных с проектами...');
    
    const projectElements = await page.evaluate(() => {
      const elements = [];
      const searchTerms = ['проект', 'project', 'создать', 'create', 'new', 'добавить', 'add', '+'];
      
      // Ищем во всех текстовых узлах
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.toLowerCase().trim();
        if (text && searchTerms.some(term => text.includes(term))) {
          const parent = node.parentElement;
          if (parent) {
            elements.push({
              tag: parent.tagName,
              text: text,
              className: parent.className,
              id: parent.id,
              outerHTML: parent.outerHTML.substring(0, 200)
            });
          }
        }
      }
      
      return elements;
    });
    
    console.log('🎯 Найденные элементы с ключевыми словами:');
    projectElements.forEach((el, index) => {
      console.log(`${index + 1}. ${el.tag}: "${el.text}" (class: ${el.className})`);
      console.log(`   HTML: ${el.outerHTML}`);
    });
    
    // Ищем все кнопки и ссылки
    console.log('\n🔘 Все кнопки на странице:');
    const buttons = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a, [role="button"]'));
      return btns.map(btn => ({
        tag: btn.tagName,
        text: btn.textContent.trim(),
        className: btn.className,
        href: btn.href || '',
        onclick: btn.onclick ? btn.onclick.toString() : ''
      }));
    });
    
    buttons.forEach((btn, index) => {
      console.log(`${index + 1}. ${btn.tag}: "${btn.text}" (class: ${btn.className})`);
      if (btn.href) console.log(`   href: ${btn.href}`);
    });
    
    // Проверяем наличие модальных окон или скрытых элементов
    console.log('\n👁️ Проверка скрытых элементов...');
    const hiddenElements = await page.evaluate(() => {
      const hidden = Array.from(document.querySelectorAll('[style*="display: none"], [style*="visibility: hidden"], .hidden'));
      return hidden.map(el => ({
        tag: el.tagName,
        className: el.className,
        text: el.textContent.trim().substring(0, 100)
      }));
    });
    
    console.log('🔍 Скрытые элементы:');
    hiddenElements.forEach((el, index) => {
      console.log(`${index + 1}. ${el.tag}: "${el.text}" (class: ${el.className})`);
    });
    
    console.log('\n⏳ Ожидание 15 секунд для ручного анализа...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    console.log('🔒 Браузер закрыт');
    await browser.close();
  }
})();