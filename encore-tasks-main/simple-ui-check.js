const puppeteer = require('puppeteer');

async function simpleUICheck() {
  console.log('🔍 Простая проверка интерфейса...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  try {
    const page = await browser.newPage();
    
    console.log('📄 Переход на главную страницу...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    
    console.log('📊 Анализ элементов страницы...');
    
    // Получение всех кнопок
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(btn => ({
        text: btn.textContent.trim(),
        id: btn.id,
        className: btn.className,
        type: btn.type,
        visible: btn.offsetParent !== null
      }));
    });
    
    console.log('\n🔘 Найденные кнопки:');
    buttons.forEach((btn, i) => {
      console.log(`  ${i + 1}. "${btn.text}" (visible: ${btn.visible}, id: ${btn.id}, class: ${btn.className})`);
    });
    
    // Получение всех ссылок
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(link => ({
        text: link.textContent.trim(),
        href: link.href,
        visible: link.offsetParent !== null
      }));
    });
    
    console.log('\n🔗 Найденные ссылки:');
    links.forEach((link, i) => {
      console.log(`  ${i + 1}. "${link.text}" (href: ${link.href}, visible: ${link.visible})`);
    });
    
    // Поиск элементов, связанных с проектами
    const projectElements = await page.evaluate(() => {
      const allText = document.body.textContent.toLowerCase();
      const hasProject = allText.includes('проект') || allText.includes('project');
      const hasCreate = allText.includes('создать') || allText.includes('create');
      const hasNew = allText.includes('новый') || allText.includes('new');
      
      return {
        hasProject,
        hasCreate,
        hasNew,
        pageText: document.body.textContent.substring(0, 500)
      };
    });
    
    console.log('\n📁 Анализ содержимого страницы:');
    console.log('Содержит "проект/project":', projectElements.hasProject);
    console.log('Содержит "создать/create":', projectElements.hasCreate);
    console.log('Содержит "новый/new":', projectElements.hasNew);
    console.log('\nТекст страницы (первые 500 символов):');
    console.log(projectElements.pageText);
    
    // Ждем 5 секунд для ручного анализа
    console.log('\n⏳ Ожидание 5 секунд для ручного анализа...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.error('💥 Ошибка:', error.message);
  } finally {
    await browser.close();
    console.log('🔒 Браузер закрыт');
  }
}

simpleUICheck().catch(console.error);