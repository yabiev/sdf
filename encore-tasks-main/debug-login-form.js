const puppeteer = require('puppeteer');

async function debugLoginForm() {
  console.log('🔍 Отладка формы входа...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('📍 Переход на главную страницу...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    
    console.log('⏳ Ожидание загрузки страницы...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Ищем кнопку "Вход" для переключения на форму входа
    console.log('🔍 Поиск кнопки входа...');
    const loginTabButton = await page.$('button');
    if (loginTabButton) {
      const buttonText = await page.evaluate(btn => btn.textContent, loginTabButton);
      console.log('📋 Текст первой кнопки:', buttonText);
      if (buttonText.includes('Вход')) {
        console.log('✅ Найдена кнопка "Вход", кликаем...');
        await loginTabButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Заполняем форму входа
    console.log('📝 Заполнение формы входа...');
    
    // Ищем поле email
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      console.log('✅ Найдено поле email');
      await emailInput.click();
      await emailInput.type('test@example.com');
    }
    
    // Ищем поле пароля
    const passwordInput = await page.$('input[type="password"]');
    if (passwordInput) {
      console.log('✅ Найдено поле пароля');
      await passwordInput.click();
      await passwordInput.type('password123');
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Теперь проверим все кнопки после заполнения формы
    console.log('\n🔍 АНАЛИЗ ВСЕХ КНОПОК ПОСЛЕ ЗАПОЛНЕНИЯ ФОРМЫ:');
    
    const allButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.map((btn, index) => ({
        index: index,
        text: btn.textContent?.trim() || '',
        type: btn.type || '',
        className: btn.className || '',
        id: btn.id || '',
        disabled: btn.disabled,
        form: btn.form ? btn.form.id || 'form-exists' : 'no-form',
        innerHTML: btn.innerHTML
      }));
    });
    
    console.log('📋 Все кнопки на странице:');
    allButtons.forEach((btn) => {
      console.log(`${btn.index + 1}. "${btn.text}" (type: ${btn.type}, disabled: ${btn.disabled}, form: ${btn.form})`);
      console.log(`   className: "${btn.className}", id: "${btn.id}"`);
      console.log(`   innerHTML: ${btn.innerHTML}`);
      console.log('---');
    });
    
    // Проверим также input элементы с type="submit"
    const submitInputs = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="submit"]'));
      return inputs.map((input, index) => ({
        index: index,
        value: input.value || '',
        className: input.className || '',
        id: input.id || '',
        disabled: input.disabled
      }));
    });
    
    if (submitInputs.length > 0) {
      console.log('\n📋 Input элементы с type="submit":');
      submitInputs.forEach((input) => {
        console.log(`${input.index + 1}. value: "${input.value}" (disabled: ${input.disabled})`);
        console.log(`   className: "${input.className}", id: "${input.id}"`);
      });
    }
    
    // Проверим формы
    const forms = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map((form, index) => ({
        index: index,
        action: form.action || '',
        method: form.method || '',
        className: form.className || '',
        id: form.id || '',
        innerHTML: form.innerHTML.substring(0, 200) + '...'
      }));
    });
    
    if (forms.length > 0) {
      console.log('\n📋 Формы на странице:');
      forms.forEach((form) => {
        console.log(`${form.index + 1}. action: "${form.action}", method: "${form.method}"`);
        console.log(`   className: "${form.className}", id: "${form.id}"`);
        console.log(`   innerHTML: ${form.innerHTML}`);
        console.log('---');
      });
    }
    
    // Попробуем найти кнопки по разным критериям
    console.log('\n🔍 ПОИСК КНОПОК ПО КРИТЕРИЯМ:');
    
    // 1. Кнопки с текстом "Войти"
    const loginButtons = allButtons.filter(btn => 
      btn.text.toLowerCase().includes('войти') || 
      btn.text.toLowerCase().includes('login') ||
      btn.text.toLowerCase().includes('sign in')
    );
    
    if (loginButtons.length > 0) {
      console.log('✅ Кнопки с текстом "Войти":');
      loginButtons.forEach(btn => {
        console.log(`   ${btn.index + 1}. "${btn.text}" (type: ${btn.type})`);
      });
    } else {
      console.log('❌ Кнопки с текстом "Войти" не найдены');
    }
    
    // 2. Кнопки с type="submit"
    const submitButtons = allButtons.filter(btn => btn.type === 'submit');
    
    if (submitButtons.length > 0) {
      console.log('✅ Кнопки с type="submit":');
      submitButtons.forEach(btn => {
        console.log(`   ${btn.index + 1}. "${btn.text}" (disabled: ${btn.disabled})`);
      });
    } else {
      console.log('❌ Кнопки с type="submit" не найдены');
    }
    
    // 3. Кнопки внутри формы
    const formButtons = allButtons.filter(btn => btn.form !== 'no-form');
    
    if (formButtons.length > 0) {
      console.log('✅ Кнопки внутри формы:');
      formButtons.forEach(btn => {
        console.log(`   ${btn.index + 1}. "${btn.text}" (type: ${btn.type}, form: ${btn.form})`);
      });
    } else {
      console.log('❌ Кнопки внутри формы не найдены');
    }
    
    console.log('\n📸 Создание скриншота для анализа...');
    await page.screenshot({ path: 'debug-login-form-screenshot.png', fullPage: true });
    console.log('✅ Скриншот сохранен: debug-login-form-screenshot.png');
    
    console.log('\n⏳ Оставляем браузер открытым для ручной проверки (30 секунд)...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('❌ Ошибка отладки:', error);
  } finally {
    await browser.close();
  }
}

debugLoginForm().catch(console.error);