const http = require('http');
const fs = require('fs');
const path = require('path');

// Функция для выполнения HTTP запроса
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Функция для логина
async function login() {
  const loginData = {
    email: 'admin@example.com',
    password: 'admin123'
  };
  
  const options = {
    hostname: 'localhost',
    port: 3002,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  try {
    const response = await makeRequest(options, loginData);
    console.log('Ответ авторизации:', response.statusCode, response.body);
    
    if (response.statusCode === 200 && response.body && response.body.success) {
      console.log('✅ Успешная авторизация');
      return response.body.token;
    } else {
      console.error('❌ Ошибка авторизации:', response.body);
      return null;
    }
  } catch (error) {
    console.error('❌ Ошибка при авторизации:', error.message);
    return null;
  }
}

// Функция для выполнения SQL через API
async function executeSql(token, sql) {
  const options = {
    hostname: 'localhost',
    port: 3002,
    path: '/api/admin/sql',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  try {
    const response = await makeRequest(options, { sql });
    console.log('SQL ответ:', response.statusCode, response.body);
    return response;
  } catch (error) {
    console.error('❌ Ошибка при выполнении SQL:', error.message);
    return null;
  }
}

async function createMissingTables() {
  try {
    console.log('🔧 Подключение к API сервера...');
    
    // Авторизация
    const token = await login();
    if (!token) {
      console.error('❌ Не удалось получить токен авторизации');
      return;
    }
    
    console.log('📋 Проверяем существование таблицы task_assignees...');
    
    // Проверяем, существует ли таблица task_assignees
    const checkTableSql = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'task_assignees'
      ) as table_exists;
    `;
    
    const checkResult = await executeSql(token, checkTableSql);
    
    if (checkResult && checkResult.statusCode === 200) {
      const exists = checkResult.body.rows && checkResult.body.rows[0] && checkResult.body.rows[0].table_exists;
      console.log(`Таблица task_assignees существует: ${exists}`);
      
      if (!exists) {
        console.log('🔨 Создаем таблицу task_assignees...');
        
        // Создаем таблицу напрямую
        const createTableSql = `
          CREATE TABLE IF NOT EXISTS task_assignees (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
            UNIQUE(task_id, user_id)
          );
        `;
        
        const createResult = await executeSql(token, createTableSql);
        
        if (createResult && createResult.statusCode === 200) {
          console.log('✅ Таблица task_assignees успешно создана!');
          
          // Создаем индексы
          const indexSql = `
            CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON task_assignees(task_id);
            CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON task_assignees(user_id);
            CREATE INDEX IF NOT EXISTS idx_task_assignees_assigned_by ON task_assignees(assigned_by);
          `;
          
          const indexResult = await executeSql(token, indexSql);
          if (indexResult && indexResult.statusCode === 200) {
            console.log('✅ Индексы успешно созданы!');
          }
        } else {
          console.error('❌ Ошибка при создании таблицы:', createResult);
        }
      } else {
        console.log('ℹ️ Таблица task_assignees уже существует');
      }
    } else {
      console.error('❌ Ошибка при проверке таблицы:', checkResult);
    }
    
    console.log('\n🎉 Проверка завершена!');
    
  } catch (error) {
    console.error('❌ Ошибка при создании таблиц:', error);
    process.exit(1);
  }
}

// Запускаем скрипт
createMissingTables();