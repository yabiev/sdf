const puppeteer = require('puppeteer');

(async () => {
  console.log('Тест API запросов при создании задачи...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  try {
    const page = await browser.newPage();
    
    // Перехватываем все сетевые запросы
    const requests = [];
    const responses = [];
    
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        postData: request.postData(),
        headers: request.headers()
      });
    });
    
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
    });
    
    // Перехватываем ошибки консоли
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Ошибка консоли:', msg.text());
      }
    });
    
    console.log('1. Переход на главную страницу...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
    
    console.log('2. Вход в систему...');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', 'admin@example.com');
    await page.type('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('3. Очистка списка запросов...');
    requests.length = 0;
    responses.length = 0;
    
    console.log('4. Открытие формы создания задачи...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const taskBtn = buttons.find(btn => btn.textContent && btn.textContent.includes('Задача'));
      if (taskBtn) taskBtn.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('5. Заполнение формы...');
    const taskName = 'Тестовая задача ' + Date.now();
    
    const nameField = await page.$('#title');
    if (nameField) {
      await nameField.click({ clickCount: 3 });
      await nameField.type(taskName);
    }
    
    const descField = await page.$('#description');
    if (descField) {
      await descField.click({ clickCount: 3 });
      await descField.type('Описание тестовой задачи');
    }
    
    console.log('6. Отправка формы...');
    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent?.includes('Создать задачу') || btn.type === 'submit'
      );
      if (submitBtn) {
        console.log('Кликаем по кнопке создания задачи');
        submitBtn.click();
      }
    });
    
    // Ждем завершения запросов
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n=== АНАЛИЗ СЕТЕВЫХ ЗАПРОСОВ ===');
    
    // Фильтруем API запросы
    const apiRequests = requests.filter(req => 
      req.url.includes('/api/') || 
      req.method === 'POST' || 
      req.method === 'PUT' || 
      req.method === 'PATCH'
    );
    
    console.log(`\nВсего запросов: ${requests.length}`);
    console.log(`API запросов: ${apiRequests.length}`);
    
    if (apiRequests.length > 0) {
      console.log('\n=== API ЗАПРОСЫ ===');
      apiRequests.forEach((req, index) => {
        console.log(`${index + 1}. ${req.method} ${req.url}`);
        if (req.postData) {
          console.log(`   Данные: ${req.postData.substring(0, 200)}`);
        }
      });
    }
    
    // Анализ ответов
    const apiResponses = responses.filter(res => 
      res.url.includes('/api/') && res.status >= 400
    );
    
    if (apiResponses.length > 0) {
      console.log('\n=== ОШИБКИ API ===');
      apiResponses.forEach((res, index) => {
        console.log(`${index + 1}. ${res.status} ${res.statusText} - ${res.url}`);
      });
    }
    
    // Проверяем создание задачи
    const createTaskRequest = apiRequests.find(req => 
      req.url.includes('/api/tasks') && req.method === 'POST'
    );
    
    if (createTaskRequest) {
      console.log('\n✅ Найден запрос создания задачи!');
      console.log('URL:', createTaskRequest.url);
      console.log('Данные:', createTaskRequest.postData);
      
      const createResponse = responses.find(res => 
        res.url === createTaskRequest.url
      );
      
      if (createResponse) {
        console.log('Ответ:', createResponse.status, createResponse.statusText);
        
        if (createResponse.status === 200 || createResponse.status === 201) {
          console.log('✅ Задача создана успешно!');
        } else {
          console.log('❌ Ошибка при создании задачи');
        }
      }
    } else {
      console.log('\n❌ Запрос создания задачи НЕ найден!');
      console.log('Возможные причины:');
      console.log('- Форма не отправляется');
      console.log('- Неправильный URL API');
      console.log('- Проблема с валидацией формы');
    }
    
    // Проверяем текущее состояние страницы
    console.log('\n=== СОСТОЯНИЕ СТРАНИЦЫ ===');
    
    const currentUrl = page.url();
    console.log('Текущий URL:', currentUrl);
    
    const modalVisible = await page.evaluate(() => {
      const modal = document.querySelector('.modal, [role="dialog"], .dialog, .popup');
      return modal && modal.offsetParent !== null;
    });
    
    console.log('Модальное окно видимо:', modalVisible);
    
    const tasksCount = await page.evaluate(() => {
      return document.querySelectorAll('.task, .card, .item, [data-testid*="task"]').length;
    });
    
    console.log('Количество задач на странице:', tasksCount);
    
    await page.screenshot({ path: 'api-test-result.png', fullPage: true });
    console.log('\nСкриншот сохранен: api-test-result.png');
    
  } catch (error) {
    console.error('❌ Ошибка в тесте:', error);
    try {
      await page.screenshot({ path: 'api-error.png', fullPage: true });
    } catch (screenshotError) {
      console.error('Не удалось сделать скриншот:', screenshotError.message);
    }
  } finally {
    await browser.close();
  }
})();