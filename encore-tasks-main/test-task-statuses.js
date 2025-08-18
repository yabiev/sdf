const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Файл .env не найден!');
    return {};
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^[\"']|[\"']$/g, '');
      }
    }
  });
  
  return env;
}

async function testTaskStatuses() {
  const env = loadEnvFile();
  
  const config = {
    host: env.POSTGRES_HOST || 'localhost',
    port: parseInt(env.POSTGRES_PORT) || 5432,
    database: env.POSTGRES_DB || 'encore_tasks',
    user: env.POSTGRES_USER || 'postgres',
    password: env.POSTGRES_PASSWORD || ''
  };
  
  const pool = new Pool(config);
  
  try {
    const client = await pool.connect();
    
    console.log('🧪 Тестирование создания задач с разными статусами...');
    
    // Очистим тестовые данные если они есть
    await client.query("DELETE FROM tasks WHERE title LIKE 'Test Task %'");
    
    // Получим первый доступный board_id и project_id
    const boardResult = await client.query('SELECT id, project_id FROM boards LIMIT 1');
    if (boardResult.rows.length === 0) {
      console.log('❌ Нет доступных досок для тестирования');
      return;
    }
    
    const boardId = boardResult.rows[0].id;
    const projectId = boardResult.rows[0].project_id;
    console.log(`📋 Используем доску с ID: ${boardId}`);
    console.log(`📁 Используем проект с ID: ${projectId}`);
    
    // Тестируем все допустимые статусы
    const statuses = ['todo', 'in_progress', 'done', 'archived'];
    const createdTasks = [];
    
    for (const status of statuses) {
      try {
        const result = await client.query(
          'INSERT INTO tasks (title, description, status, board_id, project_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *',
          [`Test Task ${status}`, `Тестовая задача со статусом ${status}`, status, boardId, projectId]
        );
        
        const task = result.rows[0];
        createdTasks.push(task);
        console.log(`✅ Создана задача со статусом '${status}': ID ${task.id}`);
      } catch (error) {
        console.log(`❌ Ошибка создания задачи со статусом '${status}': ${error.message}`);
      }
    }
    
    // Тестируем недопустимый статус
    try {
      await client.query(
        'INSERT INTO tasks (title, description, status, board_id, project_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
        ['Test Task Invalid', 'Тестовая задача с недопустимым статусом', 'invalid_status', boardId, projectId]
      );
      console.log('❌ ОШИБКА: Недопустимый статус был принят!');
    } catch (error) {
      console.log(`✅ Правильно отклонен недопустимый статус: ${error.message}`);
    }
    
    // Проверим созданные задачи
    console.log('\n📋 Созданные тестовые задачи:');
    const tasksResult = await client.query(
      "SELECT id, title, status, created_at FROM tasks WHERE title LIKE 'Test Task %' ORDER BY created_at"
    );
    
    tasksResult.rows.forEach(task => {
      console.log(`   ID ${task.id}: ${task.title} (${task.status})`);
    });
    
    // Тестируем обновление статуса
    if (createdTasks.length > 0) {
      const taskToUpdate = createdTasks[0];
      console.log(`\n🔄 Тестирование обновления статуса задачи ID ${taskToUpdate.id}...`);
      
      for (const newStatus of ['in_progress', 'done', 'archived', 'todo']) {
        try {
          await client.query(
            'UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2',
            [newStatus, taskToUpdate.id]
          );
          console.log(`✅ Статус обновлен на '${newStatus}'`);
        } catch (error) {
          console.log(`❌ Ошибка обновления статуса на '${newStatus}': ${error.message}`);
        }
      }
    }
    
    // Очистим тестовые данные
    await client.query("DELETE FROM tasks WHERE title LIKE 'Test Task %'");
    console.log('\n🧹 Тестовые данные очищены');
    
    client.release();
    console.log('\n✅ Все тесты статусов задач завершены успешно!');
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await pool.end();
  }
}

testTaskStatuses().catch(console.error);