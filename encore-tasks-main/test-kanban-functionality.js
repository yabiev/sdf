const puppeteer = require('puppeteer');

async function testKanbanFunctionality() {
  console.log('📋 Тестирование функциональности Kanban досок...');
  
  const browser = await puppeteer.launch({ headless: false, devtools: true });
  const page = await browser.newPage();
  
  try {
    // Переходим на страницу приложения
    await page.goto('http://localhost:3000');
    
    // Ждем загрузки страницы
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🔍 Проверяем наличие элементов интерфейса...');
    
    // Проверяем наличие основных элементов
    const topBar = await page.$('.top-bar, [data-testid="top-bar"], header');
    if (topBar) {
      console.log('✅ Верхняя панель найдена');
    }
    
    // Проверяем наличие кнопки создания проекта
    const createProjectBtn = await page.$('button[data-testid="create-project"], button');
    if (createProjectBtn) {
      console.log('✅ Кнопка создания проекта найдена');
    }
    
    // Проверяем наличие kanban доски
    const kanbanBoard = await page.$('.kanban-board, [data-testid="kanban-board"], .board');
    if (kanbanBoard) {
      console.log('✅ Kanban доска найдена');
      
      // Проверяем наличие колонок
      const columns = await page.$$('.column, [data-testid="column"], .kanban-column');
      console.log(`📊 Найдено колонок: ${columns.length}`);
      
      // Проверяем наличие задач
      const tasks = await page.$$('.task, [data-testid="task"], .kanban-task');
      console.log(`📝 Найдено задач: ${tasks.length}`);
      
    } else {
      console.log('ℹ️ Kanban доска не найдена - возможно, нужно создать проект');
    }
    
    // Проверяем наличие модальных окон
    const modals = await page.$$('.modal, [data-testid="modal"], .dialog');
    console.log(`🪟 Найдено модальных окон: ${modals.length}`);
    
    // Проверяем консоль браузера на ошибки
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (logs.length > 0) {
      console.log('⚠️ Найдены ошибки в консоли:');
      logs.forEach(log => console.log('  -', log));
    } else {
      console.log('✅ Ошибок в консоли не найдено');
    }
    
    // Проверяем сетевые запросы
    const responses = [];
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        responses.push({
          url: response.url(),
          status: response.status()
        });
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (responses.length > 0) {
      console.log('🌐 API запросы:');
      responses.forEach(resp => {
        const status = resp.status >= 200 && resp.status < 300 ? '✅' : '❌';
        console.log(`  ${status} ${resp.status} ${resp.url}`);
      });
    }
    
    console.log('✅ Тест функциональности Kanban завершен');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  } finally {
    await browser.close();
  }
}

testKanbanFunctionality().catch(console.error);