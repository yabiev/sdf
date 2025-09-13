const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Функция ожидания
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testRegistrationAndProjectCreation() {
    console.log('🚀 Запуск теста регистрации и создания проекта...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    // Слушаем ошибки консоли
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('❌ Ошибка в консоли:', msg.text());
        }
    });
    
    page.on('pageerror', error => {
        console.log('❌ Ошибка страницы:', error.message);
    });
    
    try {
        console.log('📄 Переход на страницу...');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
        
        await wait(2000);
        
        // Получаем содержимое страницы для анализа
        const pageContent = await page.content();
        console.log('Содержимое страницы (первые 300 символов):', pageContent.substring(0, 300));
        
        // Ищем кнопку регистрации более простыми селекторами
        const registerButtons = await page.$$eval('button, a', elements => {
            return elements.map(el => ({
                text: el.textContent.trim(),
                tagName: el.tagName,
                href: el.href || '',
                className: el.className
            })).filter(el => 
                el.text.toLowerCase().includes('регистрац') ||
                el.text.toLowerCase().includes('signup') ||
                el.href.includes('register') ||
                el.href.includes('signup')
            );
        });
        
        console.log('🔍 Найденные кнопки регистрации:', registerButtons);
        
        // Пытаемся найти и кликнуть кнопку регистрации
        let registerClicked = false;
        
        // Ищем кнопку регистрации по тексту
        const allButtons = await page.$$('button');
        for (let button of allButtons) {
            const text = await page.evaluate(el => el.textContent.trim(), button);
            if (text.toLowerCase().includes('регистрац')) {
                console.log('✅ Найдена кнопка регистрации:', text);
                await button.click();
                registerClicked = true;
                await wait(2000);
                break;
            }
        }
        
        if (!registerClicked) {
            console.log('❌ Кнопка регистрации не найдена, попробуем найти форму регистрации напрямую');
        }
        
        // Ищем поля регистрации
        await wait(1000);
        
        // Генерируем уникальный email для тестирования
        const testEmail = `test${Date.now()}@example.com`;
        const testPassword = 'TestPassword123!';
        const testName = 'Тестовый Пользователь';
        
        console.log('📝 Попытка заполнения формы регистрации...');
        console.log('📧 Используем email:', testEmail);
        
        // Ищем поля ввода
        const emailInput = await page.$('input[type="email"]');
        const passwordInput = await page.$('input[type="password"]');
        const nameInput = await page.$('input[name="name"]');
        
        if (emailInput) {
            console.log('✅ Найдено поле email');
            await page.evaluate(input => input.value = '', emailInput);
            await emailInput.type(testEmail);
        } else {
            console.log('❌ Поле email не найдено');
        }
        
        if (passwordInput) {
            console.log('✅ Найдено поле пароля');
            await page.evaluate(input => input.value = '', passwordInput);
            await passwordInput.type(testPassword);
        } else {
            console.log('❌ Поле пароля не найдено');
        }
        
        if (nameInput) {
            console.log('✅ Найдено поле имени');
            await page.evaluate(input => input.value = '', nameInput);
            await nameInput.type(testName);
        } else {
            console.log('❌ Поле имени не найдено');
        }
        
        await wait(1000);
        
        // Ищем кнопку отправки формы
        const submitButton = await page.$('button[type="submit"]');
        
        if (submitButton) {
            console.log('✅ Найдена кнопка отправки формы');
            await submitButton.click();
            await wait(3000);
        } else {
            console.log('❌ Кнопка отправки не найдена, ищем другие варианты...');
            
            // Ищем кнопки с текстом регистрации
            const allSubmitButtons = await page.$$('button');
            for (let button of allSubmitButtons) {
                const text = await page.evaluate(el => el.textContent.trim(), button);
                if (text.toLowerCase().includes('зарегистр') || text.toLowerCase().includes('создать') || text.toLowerCase().includes('войти')) {
                    console.log('✅ Найдена кнопка отправки:', text);
                    await button.click();
                    await wait(3000);
                    break;
                }
            }
        }
        
        // Проверяем, успешна ли регистрация
        const currentUrl = page.url();
        console.log('🌐 Текущий URL после регистрации:', currentUrl);
        
        // Ищем элементы создания проекта
        console.log('🔍 Поиск элементов создания проекта...');
        
        // Ищем кнопки и ссылки, связанные с созданием проекта
        const projectElements = await page.$$eval('button, a, div[role="button"]', elements => {
            return elements.map(el => ({
                text: el.textContent.trim(),
                tagName: el.tagName,
                className: el.className,
                id: el.id
            })).filter(el => 
                el.text.toLowerCase().includes('проект') ||
                el.text.toLowerCase().includes('создать') ||
                el.text.toLowerCase().includes('новый') ||
                el.text.includes('+') ||
                el.className.toLowerCase().includes('create') ||
                el.className.toLowerCase().includes('add') ||
                el.id.toLowerCase().includes('create')
            );
        });
        
        console.log('🎯 Найденные элементы создания проекта:', projectElements);
        
        if (projectElements.length === 0) {
            console.log('❌ Элементы создания проекта не найдены');
            
            // Попробуем найти любые кнопки на странице
            const allPageButtons = await page.$$eval('button, a', elements => {
                return elements.map(el => ({
                    text: el.textContent.trim(),
                    tagName: el.tagName,
                    className: el.className
                })).filter(el => el.text.length > 0);
            });
            
            console.log('🔍 Все кнопки на странице:', allPageButtons.slice(0, 10));
        } else {
            console.log('✅ Найдено элементов создания проекта:', projectElements.length);
            
            // Попробуем кликнуть на первый найденный элемент
            if (projectElements.length > 0) {
                console.log('🎯 Попытка клика на элемент создания проекта...');
                
                const createButtons = await page.$$('button, a, div[role="button"]');
                for (let button of createButtons) {
                    const text = await page.evaluate(el => el.textContent.trim(), button);
                    if (text.toLowerCase().includes('проект') || text.toLowerCase().includes('создать') || text.includes('+')) {
                        console.log('✅ Кликаем на:', text);
                        await button.click();
                        await wait(2000);
                        break;
                    }
                }
            }
        }
        
        // Сохраняем скриншот
        await page.screenshot({ path: 'registration-test-result.png', fullPage: true });
        console.log('📸 Скриншот сохранен: registration-test-result.png');
        
        // Собираем ошибки из консоли
        const errors = await page.evaluate(() => {
            return window.console.errors || [];
        });
        
        if (errors.length > 0) {
            console.log('❌ Ошибки в консоли:', errors);
        } else {
            console.log('✅ Ошибок в консоли не обнаружено');
        }
        
    } catch (error) {
        console.log('❌ Ошибка при тестировании:', error.message);
        await page.screenshot({ path: 'error-screenshot.png' });
        console.log('📸 Скриншот ошибки сохранен');
    } finally {
        console.log('🔚 Закрытие браузера через 15 секунд...');
        await wait(15000);
        await browser.close();
    }
}

testRegistrationAndProjectCreation();