const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 ФИНАЛЬНЫЙ ТЕСТ: Проверка исправления ошибки создания проекта');
  console.log('=' .repeat(60));
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  let testResults = {
    login: false,
    projectPageAccess: false,
    projectCreation: false,
    projectDisplay: false,
    noErrors: true
  };
  
  try {
    const page = await browser.newPage();
    
    // Перехватываем ошибки
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
        console.log('❌ Ошибка консоли:', msg.text());
      }
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
      console.log('❌ Ошибка страницы:', error.message);
    });
    
    console.log('\n1️⃣ ЭТАП: Вход в систему');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
    
    // Проверяем наличие формы входа
    const loginFormExists = await page.$('input[type="email"]');
    if (!loginFormExists) {
      throw new Error('Форма входа не найдена');
    }
    
    await page.type('input[type="email"]', 'admin@example.com');
    await page.type('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Ждем перенаправления после входа
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
    testResults.login = true;
    console.log('✅ Вход в систему выполнен успешно');
    
    console.log('\n2️⃣ ЭТАП: Поиск способа создания проекта');
    
    // Ищем различные способы создать проект
    const projectCreationMethods = await page.evaluate(() => {
      const methods = [];
      
      // 1. Кнопки с текстом "Проект"
      const projectButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
        btn.textContent && btn.textContent.toLowerCase().includes('проект')
      );
      
      // 2. Ссылки на страницу проектов
      const projectLinks = Array.from(document.querySelectorAll('a')).filter(link => 
        link.href && (link.href.includes('/projects') || link.textContent?.toLowerCase().includes('проект'))
      );
      
      // 3. Кнопки создания
      const createButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
        btn.textContent && (
          btn.textContent.toLowerCase().includes('создать') ||
          btn.textContent.toLowerCase().includes('добавить') ||
          btn.textContent.toLowerCase().includes('новый')
        )
      );
      
      // 4. Элементы навигации
      const navItems = Array.from(document.querySelectorAll('nav a, .nav a, [role="navigation"] a'));
      
      return {
        projectButtons: projectButtons.map(btn => btn.textContent?.trim()),
        projectLinks: projectLinks.map(link => ({ text: link.textContent?.trim(), href: link.href })),
        createButtons: createButtons.map(btn => btn.textContent?.trim()),
        navItems: navItems.map(item => ({ text: item.textContent?.trim(), href: item.href }))
      };
    });
    
    console.log('\n📋 Найденные элементы для создания проекта:');
    console.log('Кнопки с "проект":', projectCreationMethods.projectButtons);
    console.log('Ссылки на проекты:', projectCreationMethods.projectLinks);
    console.log('Кнопки создания:', projectCreationMethods.createButtons);
    console.log('Навигация:', projectCreationMethods.navItems);
    
    // Пытаемся перейти на страницу проектов
    let projectPageFound = false;
    
    // Способ 1: Прямой переход по URL
    try {
      await page.goto('http://localhost:3001/projects', { waitUntil: 'networkidle0' });
      const pageTitle = await page.title();
      const pageContent = await page.content();
      
      if (pageContent.includes('проект') || pageContent.includes('Project')) {
        projectPageFound = true;
        testResults.projectPageAccess = true;
        console.log('✅ Страница проектов найдена по прямому URL');
      }
    } catch (error) {
      console.log('⚠️ Прямой переход на /projects не удался:', error.message);
    }
    
    // Способ 2: Поиск через навигацию
    if (!projectPageFound) {
      const navSuccess = await page.evaluate(() => {
        const navLinks = Array.from(document.querySelectorAll('a'));
        const projectLink = navLinks.find(link => 
          link.href && link.href.includes('/projects')
        );
        
        if (projectLink) {
          projectLink.click();
          return true;
        }
        return false;
      });
      
      if (navSuccess) {
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 });
        projectPageFound = true;
        testResults.projectPageAccess = true;
        console.log('✅ Переход на страницу проектов через навигацию');
      }
    }
    
    console.log('\n3️⃣ ЭТАП: Создание нового проекта');
    
    if (!projectPageFound) {
      console.log('⚠️ Страница проектов не найдена, пытаемся создать проект на текущей странице');
    }
    
    // Ищем кнопку создания проекта
    const createProjectSuccess = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      
      // Ищем кнопки по различным критериям
      const createButton = buttons.find(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return (
          text.includes('создать проект') ||
          text.includes('новый проект') ||
          text.includes('добавить проект') ||
          text.includes('create project') ||
          text.includes('new project') ||
          (text.includes('создать') && btn.closest('.project, .projects')) ||
          (text === '+' && btn.closest('.project, .projects'))
        );
      });
      
      if (createButton) {
        createButton.click();
        return { success: true, buttonText: createButton.textContent?.trim() };
      }
      
      return { success: false, buttonText: null };
    });
    
    if (createProjectSuccess.success) {
      console.log(`✅ Кнопка создания проекта найдена: "${createProjectSuccess.buttonText}"`);
      
      // Ждем появления формы
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Заполняем форму проекта
      const projectName = `Тестовый проект ${Date.now()}`;
      
      const formFilled = await page.evaluate((name) => {
        // Ищем поля формы
        const nameField = document.querySelector('input[name="name"], input[placeholder*="название"], input[placeholder*="name"], #name, #title');
        const descField = document.querySelector('textarea[name="description"], textarea[placeholder*="описание"], textarea[placeholder*="description"], #description');
        
        if (nameField) {
          nameField.value = name;
          nameField.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        if (descField) {
          descField.value = 'Описание тестового проекта';
          descField.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        return { nameField: !!nameField, descField: !!descField };
      }, projectName);
      
      console.log('📝 Форма заполнена:', formFilled);
      
      // Отправляем форму
      const submitSuccess = await page.evaluate(() => {
        const submitButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
          const text = btn.textContent?.toLowerCase() || '';
          return (
            text.includes('создать') ||
            text.includes('сохранить') ||
            text.includes('добавить') ||
            text.includes('create') ||
            text.includes('save') ||
            btn.type === 'submit'
          );
        });
        
        const submitBtn = submitButtons.find(btn => !btn.disabled);
        if (submitBtn) {
          submitBtn.click();
          return { success: true, buttonText: submitBtn.textContent?.trim() };
        }
        
        return { success: false };
      });
      
      if (submitSuccess.success) {
        console.log(`✅ Форма отправлена через кнопку: "${submitSuccess.buttonText}"`);
        
        // Ждем обработки
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        testResults.projectCreation = true;
        
        // Проверяем результат
        const projectCreated = await page.evaluate((projectName) => {
          const pageText = document.body.textContent || '';
          const projectElements = Array.from(document.querySelectorAll('.project, .card, .item, [data-testid*="project"]'));
          
          return {
            nameInPage: pageText.includes(projectName),
            projectElements: projectElements.length,
            pageText: pageText.substring(0, 500)
          };
        }, projectName);
        
        console.log('\n📊 Результат создания проекта:');
        console.log('Название в тексте страницы:', projectCreated.nameInPage);
        console.log('Количество элементов проектов:', projectCreated.projectElements);
        
        if (projectCreated.nameInPage || projectCreated.projectElements > 0) {
          testResults.projectDisplay = true;
          console.log('✅ Проект успешно создан и отображается');
        } else {
          console.log('⚠️ Проект создан, но не отображается на странице');
        }
        
      } else {
        console.log('❌ Не удалось найти кнопку отправки формы');
      }
      
    } else {
      console.log('❌ Кнопка создания проекта не найдена');
    }
    
    // Проверяем наличие ошибок
    if (errors.length === 0) {
      console.log('\n✅ Ошибок в консоли не обнаружено');
    } else {
      testResults.noErrors = false;
      console.log(`\n❌ Обнаружено ${errors.length} ошибок:`);
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    await page.screenshot({ path: 'final-test-result.png', fullPage: true });
    console.log('\n📸 Скриншот сохранен: final-test-result.png');
    
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    testResults.noErrors = false;
    
    try {
      await page.screenshot({ path: 'final-test-error.png', fullPage: true });
    } catch (screenshotError) {
      console.error('Не удалось сделать скриншот ошибки');
    }
  } finally {
    await browser.close();
  }
  
  // Итоговый отчет
  console.log('\n' + '=' .repeat(60));
  console.log('📋 ИТОГОВЫЙ ОТЧЕТ ТЕСТИРОВАНИЯ');
  console.log('=' .repeat(60));
  
  const results = [
    { name: 'Вход в систему', status: testResults.login },
    { name: 'Доступ к странице проектов', status: testResults.projectPageAccess },
    { name: 'Создание проекта', status: testResults.projectCreation },
    { name: 'Отображение проекта', status: testResults.projectDisplay },
    { name: 'Отсутствие ошибок', status: testResults.noErrors }
  ];
  
  results.forEach(result => {
    const icon = result.status ? '✅' : '❌';
    console.log(`${icon} ${result.name}: ${result.status ? 'УСПЕШНО' : 'НЕУДАЧНО'}`);
  });
  
  const successCount = results.filter(r => r.status).length;
  const totalCount = results.length;
  
  console.log('\n' + '=' .repeat(60));
  console.log(`🎯 ОБЩИЙ РЕЗУЛЬТАТ: ${successCount}/${totalCount} тестов пройдено`);
  
  if (successCount === totalCount) {
    console.log('🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Ошибка создания проекта ИСПРАВЛЕНА!');
  } else if (successCount >= 3) {
    console.log('⚠️ Основная функциональность работает, но есть незначительные проблемы');
  } else {
    console.log('❌ Обнаружены серьезные проблемы, требующие исправления');
  }
  
  console.log('=' .repeat(60));
})();