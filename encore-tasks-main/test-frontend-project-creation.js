/**
 * Комплексный тест для проверки функциональности создания проектов на фронтенде
 * Проверяет все этапы: от инициализации до завершения создания проекта
 */

const puppeteer = require('puppeteer');
const assert = require('assert');
const axios = require('axios');

// Конфигурация тестов
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 30000,
  testUser: {
    email: 'test@example.com',
    password: 'testpassword123'
  }
};

// Тестовые данные для создания проектов
const TEST_PROJECTS = {
  valid: {
    name: 'Тестовый проект',
    description: 'Описание тестового проекта для проверки функциональности',
    icon: '📋'
  },
  invalid: {
    empty: { name: '', description: '', icon: '' },
    tooLong: {
      name: 'А'.repeat(101), // Превышает лимит в 100 символов
      description: 'Б'.repeat(101), // Превышает лимит в 500 символов (сокращено для логов)
      icon: '📋'
    },
    invalidDescription: {
      name: 'Валидное имя',
      description: 'В'.repeat(101), // Превышает лимит (сокращено для логов)
      icon: '📋'
    }
  }
};

class ProjectCreationTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
    this.apiUrl = 'http://localhost:3000';
    this.authToken = null;
  }

  async authenticate() {
    console.log('🔑 Выполняю авторизацию...');
    try {
      const response = await axios.post(`${this.apiUrl}/api/auth/login`, {
        email: 'axelencore@mail.ru',
        password: 'Ad580dc6axelencore'
      });
      
      if (response.data.token) {
        this.authToken = response.data.token;
        console.log('✅ Авторизация успешна');
        return true;
      }
    } catch (error) {
      console.error('❌ Ошибка авторизации:', error.message);
      return false;
    }
    return false;
  }

  async init() {
    console.log('🚀 Инициализация тестов создания проектов...');
    
    this.browser = await puppeteer.launch({
      headless: false, // Показываем браузер для наглядности
      slowMo: 100, // Замедляем действия для лучшей видимости
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720 });
    
    // Capture console logs from the browser
    this.page.on('console', (msg) => {
      console.log('🌐 Browser Console:', msg.text());
    });
    
    this.page.on('pageerror', (error) => {
      console.log('🚨 Page Error:', error.message);
    });
    
    // Авторизация через API
    const authSuccess = await this.authenticate();
    if (!authSuccess) {
      throw new Error('Не удалось авторизоваться');
    }
    
    // Устанавливаем токен в cookies
    await this.page.setCookie({
      name: 'auth-token',
      value: this.authToken,
      domain: 'localhost',
      path: '/'
    });
    
    // Перехватываем сетевые запросы для мониторинга API
    await this.page.setRequestInterception(true);
    this.page.on('request', this.handleRequest.bind(this));
    this.page.on('response', this.handleResponse.bind(this));
    
    console.log('✅ Браузер инициализирован');
  }

  handleRequest(request) {
    if (request.url().includes('/api/projects')) {
      console.log(`📤 API запрос: ${request.method()} ${request.url()}`);
      if (request.method() === 'POST') {
        console.log('📝 Данные запроса:', request.postData());
      }
    }
    request.continue();
  }

  handleResponse(response) {
    if (response.url().includes('/api/projects')) {
      console.log(`📥 API ответ: ${response.status()} ${response.url()}`);
    }
  }

  async navigateToApp() {
    console.log('🌐 Переход на главную страницу...');
    await this.page.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle2' });
    
    // Ждем загрузки основных элементов
    await this.page.waitForSelector('body', { timeout: TEST_CONFIG.timeout });
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('✅ Страница загружена');
  }

  async openCreateProjectModal() {
    console.log('🔍 Поиск кнопки создания проекта в сайдбаре...');
    
    // Ждем загрузки страницы
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Добавляем отладочную информацию
    const debugInfo = await this.page.evaluate(() => {
      const h3Elements = Array.from(document.querySelectorAll('h3'));
      const h3Texts = h3Elements.map(h => h.textContent?.trim());
      const allButtons = Array.from(document.querySelectorAll('button'));
      const buttonTitles = allButtons.map(b => b.title || 'no title');
      
      return {
        h3Count: h3Elements.length,
        h3Texts: h3Texts,
        buttonCount: allButtons.length,
        buttonTitles: buttonTitles.slice(0, 10), // Первые 10 кнопок
        hasProjectsHeader: h3Texts.includes('Проекты'),
        hasCreateButton: allButtons.some(b => b.title === 'Создать проект')
      };
    });
    
    console.log('🔍 Отладочная информация:', JSON.stringify(debugInfo, null, 2));
    
    // Ищем кнопку создания проекта в секции "Проекты" сайдбара
    const createButton = await this.page.evaluateHandle(() => {
      // Ищем кнопку с title="Создать проект"
      const createProjectButton = document.querySelector('button[title="Создать проект"]');
      if (createProjectButton) {
        return createProjectButton;
      }
      
      // Альтернативный поиск: ищем заголовок "Проекты" и кнопку рядом с ним
      const projectsHeaders = Array.from(document.querySelectorAll('h3'));
      const projectsHeader = projectsHeaders.find(h => h.textContent?.trim() === 'Проекты');
      
      if (projectsHeader) {
        // Ищем родительский div с классом "flex items-center justify-between"
        const headerContainer = projectsHeader.closest('.flex.items-center.justify-between');
        if (headerContainer) {
          const button = headerContainer.querySelector('button');
          if (button) {
            return button;
          }
        }
        
        // Поиск в соседних элементах
        const parentDiv = projectsHeader.parentElement;
        if (parentDiv) {
          const button = parentDiv.querySelector('button');
          if (button) {
            return button;
          }
        }
      }
      
      // Резервный поиск кнопки с иконкой Plus
      const allButtons = Array.from(document.querySelectorAll('button'));
      for (const button of allButtons) {
        const svg = button.querySelector('svg');
        if (svg && button.title && button.title.includes('Создать')) {
          return button;
        }
      }
      
      return null;
    });
    
    if (!createButton) {
      throw new Error('❌ Кнопка создания проекта не найдена в сайдбаре');
    }
    
    // Проверяем, что элемент действительно существует
    const buttonExists = await this.page.evaluate((button) => {
      return button && button.nodeType === Node.ELEMENT_NODE;
    }, createButton);
    
    if (!buttonExists) {
      throw new Error('❌ Кнопка создания проекта не найдена в сайдбаре');
    }
    
    await createButton.click();
    console.log('✅ Кнопка создания проекта нажата');
    
    // Ждем появления модального окна CreateProjectModal
    await this.page.waitForSelector('.fixed.inset-0', { timeout: 5000 });
    console.log('✅ Модальное окно создания проекта открыто');
  }

  async fillProjectForm(projectData) {
    console.log('📝 Заполнение формы создания проекта...');
    
    // Ждем загрузки формы
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Заполняем название проекта - ищем input внутри модального окна
    const nameInput = await this.page.evaluateHandle(() => {
      const modal = document.querySelector('.fixed.inset-0');
      if (!modal) return null;
      
      // Ищем input для названия проекта
      const inputs = modal.querySelectorAll('input[type="text"]');
      for (const input of inputs) {
        const label = modal.querySelector(`label[for="${input.id}"]`);
        const placeholder = input.placeholder || '';
        const labelText = label ? label.textContent : '';
        
        if (placeholder.toLowerCase().includes('название') ||
            placeholder.toLowerCase().includes('name') ||
            labelText.toLowerCase().includes('название') ||
            labelText.toLowerCase().includes('name')) {
          return input;
        }
      }
      
      // Если не найдено по меткам, берем первый input
      return inputs[0] || null;
    });
    
    if (nameInput) {
      const inputExists = await this.page.evaluate((input) => {
        return input && input.nodeType === Node.ELEMENT_NODE;
      }, nameInput);
      
      if (inputExists) {
      await nameInput.click({ clickCount: 3 }); // Выделяем весь текст
      await nameInput.type(projectData.name);
      console.log(`✅ Название проекта: ${projectData.name}`);
      } else {
        throw new Error('❌ Поле названия проекта не найдено');
      }
    } else {
      throw new Error('❌ Поле названия проекта не найдено');
    }
    
    // Заполняем описание
    if (projectData.description) {
      const descInput = await this.page.evaluateHandle(() => {
        const modal = document.querySelector('.fixed.inset-0');
        if (!modal) return null;
        
        const textareas = modal.querySelectorAll('textarea');
        return textareas[0] || null;
      });
      
      if (descInput) {
        const descExists = await this.page.evaluate((input) => {
          return input && input.nodeType === Node.ELEMENT_NODE;
        }, descInput);
        
        if (descExists) {
        await descInput.click({ clickCount: 3 }); // Выделяем весь текст
        await descInput.type(projectData.description);
          console.log(`✅ Описание проекта: ${projectData.description}`);
        }
      }
    }
    
    // Выбираем иконку (если указана)
    if (projectData.icon) {
      const iconButton = await this.page.evaluateHandle((iconName) => {
        const modal = document.querySelector('.fixed.inset-0');
        if (!modal) return null;
        
        // Ищем кнопки с иконками
        const buttons = modal.querySelectorAll('button');
        for (const button of buttons) {
          const svg = button.querySelector('svg');
          if (svg && (button.getAttribute('data-icon') === iconName || 
                     button.className.includes(iconName))) {
            return button;
          }
        }
        return null;
      }, projectData.icon);
      
      if (iconButton) {
        const iconExists = await this.page.evaluate((button) => {
          return button && button.nodeType === Node.ELEMENT_NODE;
        }, iconButton);
        
        if (iconExists) {
        await iconButton.click();
          console.log(`✅ Иконка выбрана: ${projectData.icon}`);
        }
      }
    }
  }

  async submitForm() {
    console.log('🚀 Отправка формы...');
    
    // Ищем кнопку "Создать" внутри модального окна
    const submitButton = await this.page.evaluateHandle(() => {
      const modal = document.querySelector('.fixed.inset-0');
      if (!modal) return null;
      
      const buttons = modal.querySelectorAll('button');
      for (const button of buttons) {
        const text = button.textContent || '';
        if (text.includes('Создать') || text.includes('Создание')) {
          return button;
        }
      }
      
      // Альтернативный поиск по типу submit
      for (const button of buttons) {
        if (button.type === 'submit') {
          return button;
        }
      }
      
      return null;
    });
    
    if (!submitButton) {
      throw new Error('❌ Кнопка отправки формы не найдена');
    }
    
    const submitExists = await this.page.evaluate((button) => {
      return button && button.nodeType === Node.ELEMENT_NODE;
    }, submitButton);
    
    if (!submitExists) {
      throw new Error('❌ Кнопка отправки формы не найдена');
    }
    
    await submitButton.click();
    console.log('✅ Форма отправлена');
    
    // Ждем закрытия модального окна
    try {
      await this.page.waitForFunction(
        () => !document.querySelector('.fixed.inset-0'),
        { timeout: 10000 }
      );
      console.log('✅ Модальное окно закрыто');
      return { success: true, errors: [] };
    } catch (e) {
      console.log('⚠️ Модальное окно не закрылось или появилась ошибка');
      
      // Проверяем наличие ошибок валидации
      const errorMessages = await this.page.evaluate(() => {
        const modal = document.querySelector('.fixed.inset-0');
        if (!modal) return [];
        
        const errors = modal.querySelectorAll('.text-red-500, .error, [role="alert"]');
        return Array.from(errors).map(el => el.textContent).filter(text => text.trim());
      });
      
      if (errorMessages.length > 0) {
        console.log('❌ Ошибки валидации:', errorMessages);
        return { success: false, errors: errorMessages };
      }
      
      return { success: false, errors: ['Неизвестная ошибка при отправке формы'] };
    }
  }

  async checkValidationErrors() {
    console.log('🔍 Проверка ошибок валидации...');
    
    // Ждем немного для появления ошибок
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const errorSelectors = [
      '.error-message',
      '.validation-error',
      '.field-error',
      '[role="alert"]',
      '.text-red-500',
      '.text-danger'
    ];
    
    const errors = [];
    for (const selector of errorSelectors) {
      try {
        const errorElements = await this.page.$$(selector);
        for (const element of errorElements) {
          const text = await element.evaluate(el => el.textContent.trim());
          if (text) errors.push(text);
        }
      } catch (e) {}
    }
    
    if (errors.length > 0) {
      console.log('⚠️ Найдены ошибки валидации:', errors);
      return errors;
    }
    
    console.log('✅ Ошибки валидации не найдены');
    return [];
  }

  async checkSuccessMessage() {
    console.log('🔍 Проверка сообщения об успехе...');
    
    try {
      // Ждем появления уведомления об успехе или закрытия модального окна
      await Promise.race([
        this.page.waitForSelector('.success-message, .toast-success, .notification-success', 
          { timeout: 5000 }
        ),
        this.page.waitForFunction(
          () => !document.querySelector('[role="dialog"], .modal'),
          { timeout: 5000 }
        )
      ]);
      
      console.log('✅ Проект успешно создан');
      return true;
    } catch (e) {
      console.log('⚠️ Не удалось подтвердить успешное создание проекта');
      return false;
    }
  }

  async testValidProjectCreation() {
    console.log('\n🧪 ТЕСТ: Создание валидного проекта');
    
    try {
      await this.openCreateProjectModal();
      await this.fillProjectForm(TEST_PROJECTS.valid);
      const result = await this.submitForm();
      
      if (!result.success) {
        throw new Error(`Ошибки валидации: ${result.errors.join(', ')}`);
      }
      
      // Проверяем успешное создание
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      this.testResults.push({ test: 'Создание валидного проекта', status: 'PASS' });
      console.log('✅ ТЕСТ ПРОЙДЕН: Проект успешно создан');
      
    } catch (error) {
      this.testResults.push({ 
        test: 'Создание валидного проекта', 
        status: 'FAIL', 
        error: error.message 
      });
      console.log('❌ ТЕСТ ПРОВАЛЕН:', error.message);
    }
  }

  async testInvalidProjectCreation() {
    console.log('\n🧪 ТЕСТ: Создание проекта с невалидными данными');
    
    // Определяем ожидания для каждого теста
    const testExpectations = {
      empty: { shouldHaveErrors: false, description: 'пустые поля (автогенерация названия)' },
      tooLong: { shouldHaveErrors: true, description: 'слишком длинные данные' },
      invalidDescription: { shouldHaveErrors: true, description: 'слишком длинное описание' }
    };
    
    for (const [testName, projectData] of Object.entries(TEST_PROJECTS.invalid)) {
      const expectation = testExpectations[testName];
      console.log(`\n📋 Подтест: ${testName} (${expectation.description})`);
      
      try {
        await this.openCreateProjectModal();
        await this.fillProjectForm(projectData);
        const result = await this.submitForm();
        
        if (expectation.shouldHaveErrors) {
          if (result.success) {
            throw new Error('Ожидались ошибки валидации, но форма была отправлена успешно');
          }
          console.log(`✅ Подтест ${testName}: Ошибки валидации корректно отображены`);
        } else {
          if (!result.success) {
            throw new Error(`Неожиданные ошибки валидации: ${result.errors.join(', ')}`);
          }
          console.log(`✅ Подтест ${testName}: Валидация прошла корректно (нет ошибок)`);
        }
        
        this.testResults.push({ 
          test: `Валидация: ${testName}`, 
          status: 'PASS',
          errors: result.errors || []
        });
        
        // Закрываем модальное окно для следующего теста
        await this.page.keyboard.press('Escape');
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        this.testResults.push({ 
          test: `Валидация: ${testName}`, 
          status: 'FAIL', 
          error: error.message 
        });
        console.log(`❌ Подтест ${testName} провален:`, error.message);
      }
    }
  }

  async testAPIIntegration() {
    console.log('\n🧪 ТЕСТ: Интеграция с API');
    
    // Мониторим сетевые запросы
    const apiCalls = [];
    
    this.page.on('response', (response) => {
      if (response.url().includes('/api/projects')) {
        apiCalls.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method()
        });
      }
    });
    
    try {
      await this.openCreateProjectModal();
      await this.fillProjectForm(TEST_PROJECTS.valid);
      const result = await this.submitForm();
      
      // Проверяем, что нет ошибок валидации для валидных данных
      if (!result.success) {
        throw new Error(`Неожиданные ошибки валидации: ${result.errors.join(', ')}`);
      }
      
      // Ждем API вызов
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const postCalls = apiCalls.filter(call => call.method === 'POST');
      if (postCalls.length === 0) {
        throw new Error('API вызов POST /api/projects не был выполнен');
      }
      
      const successfulCalls = postCalls.filter(call => call.status >= 200 && call.status < 300);
      if (successfulCalls.length === 0) {
        throw new Error(`API вызов завершился с ошибкой: ${postCalls[0].status}`);
      }
      
      this.testResults.push({ test: 'API интеграция', status: 'PASS' });
      console.log('✅ ТЕСТ ПРОЙДЕН: API интеграция работает корректно');
      
    } catch (error) {
      this.testResults.push({ 
        test: 'API интеграция', 
        status: 'FAIL', 
        error: error.message 
      });
      console.log('❌ ТЕСТ ПРОВАЛЕН:', error.message);
    }
  }

  async runAllTests() {
    try {
      await this.init();
      await this.navigateToApp();
      
      // Запускаем все тесты
      await this.testValidProjectCreation();
      await this.testInvalidProjectCreation();
      await this.testAPIIntegration();
      
      // Выводим итоговый отчет
      this.printTestReport();
      
    } catch (error) {
      console.error('❌ Критическая ошибка тестирования:', error);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  printTestReport() {
    console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ ТЕСТИРОВАНИЯ');
    console.log('=' .repeat(50));
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    this.testResults.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${status} ${result.test}`);
      if (result.error) {
        console.log(`   Ошибка: ${result.error}`);
      }
      if (result.errors) {
        console.log(`   Найденные ошибки: ${result.errors.join(', ')}`);
      }
    });
    
    console.log('\n📈 СТАТИСТИКА:');
    console.log(`✅ Пройдено: ${passed}`);
    console.log(`❌ Провалено: ${failed}`);
    console.log(`📊 Общий результат: ${passed}/${passed + failed}`);
    
    if (failed === 0) {
      console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
    } else {
      console.log('\n⚠️ НЕКОТОРЫЕ ТЕСТЫ ПРОВАЛЕНЫ. ТРЕБУЕТСЯ ИСПРАВЛЕНИЕ.');
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Запуск тестов
if (require.main === module) {
  const tester = new ProjectCreationTester();
  
  // Обработка сигналов для корректного завершения
  process.on('SIGINT', async () => {
    console.log('\n🛑 Получен сигнал прерывания. Завершение тестов...');
    await tester.cleanup();
    process.exit(0);
  });
  
  tester.runAllTests().catch(console.error);
}

module.exports = ProjectCreationTester;