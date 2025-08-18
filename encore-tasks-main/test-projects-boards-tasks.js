const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Загрузка переменных окружения из .env файла
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
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  });
  
  return env;
}

// Генерация тестовых данных
function generateTestData() {
  const timestamp = Date.now();
  return {
    user: {
      email: `test_user_${timestamp}@example.com`,
      name: 'Test User',
      password_hash: crypto.createHash('sha256').update('test_password_123').digest('hex')
    },
    project: {
      name: `Test Project ${timestamp}`,
      description: 'Тестовый проект для проверки PostgreSQL'
    },
    boards: [
      {
        name: 'To Do',
        description: 'Задачи к выполнению',
        position: 0
      },
      {
        name: 'In Progress',
        description: 'Задачи в работе',
        position: 1
      },
      {
        name: 'Done',
        description: 'Завершенные задачи',
        position: 2
      }
    ],
    tasks: [
      {
        title: 'Первая тестовая задача',
        description: 'Описание первой задачи',
        status: 'todo',
        priority: 'medium',
        position: 0
      },
      {
        title: 'Вторая тестовая задача',
        description: 'Описание второй задачи',
        status: 'in_progress',
        priority: 'high',
        position: 1
      },
      {
        title: 'Третья тестовая задача',
        description: 'Описание третьей задачи',
        status: 'done',
        priority: 'low',
        position: 2
      }
    ]
  };
}

// Основная функция тестирования
async function testProjectsBoardsTasks() {
  console.log('📋 Тестирование создания проектов, досок и задач...');
  console.log('=' .repeat(60));

  // Загрузка конфигурации
  const env = loadEnvFile();
  
  const config = {
    host: env.POSTGRES_HOST || 'localhost',
    port: parseInt(env.POSTGRES_PORT) || 5432,
    database: env.POSTGRES_DB || 'encore_tasks',
    user: env.POSTGRES_USER || 'postgres',
    password: env.POSTGRES_PASSWORD || ''
  };

  const pool = new Pool(config);
  let testUserId = null;
  let testProjectId = null;
  let testBoardIds = [];
  let testTaskIds = [];

  try {
    const client = await pool.connect();
    console.log('✅ Подключение к PostgreSQL установлено\n');

    // Генерация тестовых данных
    const testData = generateTestData();
    console.log('📋 Тестовые данные сгенерированы:');
    console.log(`   Проект: ${testData.project.name}`);
    console.log(`   Досок: ${testData.boards.length}`);
    console.log(`   Задач: ${testData.tasks.length}`);
    console.log('');

    // Тест 1: Создание тестового пользователя
    console.log('👤 Тест 1: Создание тестового пользователя...');
    try {
      const createUserResult = await client.query(`
        INSERT INTO users (email, name, password_hash, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING id, email, name, created_at
      `, [
        testData.user.email,
        testData.user.name,
        testData.user.password_hash
      ]);
      
      testUserId = createUserResult.rows[0].id;
      console.log(`✅ Пользователь создан успешно:`);
      console.log(`   ID: ${testUserId}`);
      console.log(`   Email: ${createUserResult.rows[0].email}`);
      console.log(`   Name: ${createUserResult.rows[0].name}`);
    } catch (error) {
      console.error(`❌ Ошибка создания пользователя: ${error.message}`);
      throw error;
    }

    // Тест 2: Создание проекта
    console.log('\n📁 Тест 2: Создание проекта...');
    try {
      const createProjectResult = await client.query(`
        INSERT INTO projects (name, description, owner_id)
        VALUES ($1, $2, $3)
        RETURNING id, name, description, owner_id, created_at
      `, [
        testData.project.name,
        testData.project.description,
        testUserId
      ]);
      
      testProjectId = createProjectResult.rows[0].id;
      console.log(`✅ Проект создан успешно:`);
      console.log(`   ID: ${testProjectId}`);
      console.log(`   Название: ${createProjectResult.rows[0].name}`);
      console.log(`   Описание: ${createProjectResult.rows[0].description}`);
      console.log(`   Владелец ID: ${createProjectResult.rows[0].owner_id}`);
    } catch (error) {
      console.error(`❌ Ошибка создания проекта: ${error.message}`);
      throw error;
    }

    // Тест 3: Создание досок
    console.log('\n📊 Тест 3: Создание досок...');
    for (let i = 0; i < testData.boards.length; i++) {
      const board = testData.boards[i];
      try {
        const createBoardResult = await client.query(`
          INSERT INTO boards (name, description, project_id, position, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          RETURNING id, name, description, project_id, position, created_at
        `, [
          board.name,
          board.description,
          testProjectId,
          board.position
        ]);
        
        const boardId = createBoardResult.rows[0].id;
        testBoardIds.push(boardId);
        console.log(`✅ Доска ${i + 1} создана:`);
        console.log(`   ID: ${boardId}`);
        console.log(`   Название: ${createBoardResult.rows[0].name}`);
        console.log(`   Позиция: ${createBoardResult.rows[0].position}`);
      } catch (error) {
        console.error(`❌ Ошибка создания доски ${board.name}: ${error.message}`);
        throw error;
      }
    }

    // Тест 4: Создание задач
    console.log('\n✅ Тест 4: Создание задач...');
    for (let i = 0; i < testData.tasks.length; i++) {
      const task = testData.tasks[i];
      const boardId = testBoardIds[i % testBoardIds.length]; // Распределяем задачи по доскам
      
      try {
        const createTaskResult = await client.query(`
          INSERT INTO tasks (title, description, status, priority, project_id, board_id, position, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          RETURNING id, title, description, status, priority, project_id, board_id, position, created_at
        `, [
          task.title,
          task.description,
          task.status,
          task.priority,
          testProjectId,
          boardId,
          task.position
        ]);
        
        const taskId = createTaskResult.rows[0].id;
        testTaskIds.push(taskId);
        console.log(`✅ Задача ${i + 1} создана:`);
        console.log(`   ID: ${taskId}`);
        console.log(`   Название: ${createTaskResult.rows[0].title}`);
        console.log(`   Статус: ${createTaskResult.rows[0].status}`);
        console.log(`   Приоритет: ${createTaskResult.rows[0].priority}`);
        console.log(`   Доска ID: ${createTaskResult.rows[0].board_id}`);
      } catch (error) {
        console.error(`❌ Ошибка создания задачи ${task.title}: ${error.message}`);
        throw error;
      }
    }

    // Тест 5: Получение проекта с досками и задачами
    console.log('\n🔍 Тест 5: Получение полной структуры проекта...');
    try {
      const projectStructureResult = await client.query(`
        SELECT 
          p.id as project_id, p.name as project_name, p.description as project_description,
          b.id as board_id, b.name as board_name, b.position as board_position,
          t.id as task_id, t.title as task_title, t.status as task_status, t.priority as task_priority
        FROM projects p
        LEFT JOIN boards b ON p.id = b.project_id
        LEFT JOIN tasks t ON b.id = t.board_id
        WHERE p.id = $1
        ORDER BY b.position, t.position
      `, [testProjectId]);
      
      console.log(`✅ Структура проекта получена:`);
      console.log(`   Проект: ${projectStructureResult.rows[0]?.project_name}`);
      
      const boardsMap = new Map();
      projectStructureResult.rows.forEach(row => {
        if (row.board_id && !boardsMap.has(row.board_id)) {
          boardsMap.set(row.board_id, {
            name: row.board_name,
            position: row.board_position,
            tasks: []
          });
        }
        if (row.task_id) {
          boardsMap.get(row.board_id).tasks.push({
            title: row.task_title,
            status: row.task_status,
            priority: row.task_priority
          });
        }
      });
      
      boardsMap.forEach((board, boardId) => {
        console.log(`   Доска: ${board.name} (позиция: ${board.position})`);
        board.tasks.forEach(task => {
          console.log(`     - ${task.title} [${task.status}] (${task.priority})`);
        });
      });
    } catch (error) {
      console.error(`❌ Ошибка получения структуры проекта: ${error.message}`);
    }

    // Тест 6: Обновление статуса задачи
    console.log('\n🔄 Тест 6: Обновление статуса задачи...');
    if (testTaskIds.length > 0) {
      try {
        const updateTaskResult = await client.query(`
          UPDATE tasks 
          SET status = $1, updated_at = NOW()
          WHERE id = $2
          RETURNING id, title, status, updated_at
        `, ['completed', testTaskIds[0]]);
        
        console.log(`✅ Статус задачи обновлен:`);
        console.log(`   ID: ${updateTaskResult.rows[0].id}`);
        console.log(`   Название: ${updateTaskResult.rows[0].title}`);
        console.log(`   Новый статус: ${updateTaskResult.rows[0].status}`);
        console.log(`   Обновлено: ${updateTaskResult.rows[0].updated_at}`);
      } catch (error) {
        console.error(`❌ Ошибка обновления задачи: ${error.message}`);
      }
    }

    // Тест 7: Подсчет статистики
    console.log('\n📊 Тест 7: Статистика проекта...');
    try {
      const statsResult = await client.query(`
        SELECT 
          COUNT(DISTINCT b.id) as total_boards,
          COUNT(t.id) as total_tasks,
          COUNT(CASE WHEN t.status = 'todo' THEN 1 END) as todo_tasks,
          COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
          COUNT(CASE WHEN t.status = 'done' OR t.status = 'completed' THEN 1 END) as completed_tasks
        FROM projects p
        LEFT JOIN boards b ON p.id = b.project_id
        LEFT JOIN tasks t ON b.id = t.board_id
        WHERE p.id = $1
      `, [testProjectId]);
      
      const stats = statsResult.rows[0];
      console.log(`✅ Статистика проекта:`);
      console.log(`   Всего досок: ${stats.total_boards}`);
      console.log(`   Всего задач: ${stats.total_tasks}`);
      console.log(`   К выполнению: ${stats.todo_tasks}`);
      console.log(`   В работе: ${stats.in_progress_tasks}`);
      console.log(`   Завершено: ${stats.completed_tasks}`);
    } catch (error) {
      console.error(`❌ Ошибка получения статистики: ${error.message}`);
    }

    // Очистка тестовых данных
    console.log('\n🧹 Очистка тестовых данных...');
    try {
      // Удаляем в правильном порядке (задачи -> доски -> проекты -> пользователи)
      await client.query('DELETE FROM tasks WHERE board_id = ANY($1)', [testBoardIds]);
      await client.query('DELETE FROM boards WHERE project_id = $1', [testProjectId]);
      await client.query('DELETE FROM projects WHERE id = $1', [testProjectId]);
      await client.query('DELETE FROM users WHERE id = $1', [testUserId]);
      
      console.log('✅ Тестовые данные успешно удалены');
    } catch (error) {
      console.error(`❌ Ошибка очистки данных: ${error.message}`);
    }

    client.release();
    console.log('\n🎉 Все тесты завершены успешно!');
    
  } catch (error) {
    console.error('\n💥 Критическая ошибка:', error.message);
    console.error('\n🔧 Рекомендации:');
    console.error('   1. Проверьте параметры подключения в .env файле');
    console.error('   2. Убедитесь, что PostgreSQL сервер доступен');
    console.error('   3. Проверьте, что все необходимые таблицы существуют');
    console.error('   4. Убедитесь, что у пользователя есть права на создание/изменение данных');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Запуск тестирования
if (require.main === module) {
  testProjectsBoardsTasks().catch(console.error);
}

module.exports = { testProjectsBoardsTasks };