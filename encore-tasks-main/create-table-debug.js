const http = require('http');

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

async function createTableViaDebug() {
  try {
    console.log('🔧 Создание таблицы task_assignees через debug endpoint...');
    
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS task_assignees (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE(task_id, user_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON task_assignees(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON task_assignees(user_id);
      CREATE INDEX IF NOT EXISTS idx_task_assignees_assigned_by ON task_assignees(assigned_by);
    `;
    
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: '/api/debug',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const response = await makeRequest(options, { 
      action: 'execute_sql',
      sql: createTableSql
    });
    
    console.log('Debug ответ:', response.statusCode, response.body);
    
    if (response.statusCode === 200) {
      console.log('✅ Таблица task_assignees успешно создана!');
    } else {
      console.error('❌ Ошибка при создании таблицы:', response.body);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// Запускаем скрипт
createTableViaDebug();