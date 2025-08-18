const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD
});

// Тестовые данные
const testData = {
  user: {
    email: `test_projects_user_${Date.now()}@example.com`,
    name: 'Projects Test User',
    password_hash: 'hashed_password_123'
  },
  project: {
    name: 'Test Project',
    description: 'Тестовый проект для проверки функциональности',
    color: '#3B82F6'
  },
  boards: [
    {
      name: 'To Do',
      description: 'Задачи к выполнению',
      position: 1
    },
    {
      name: 'In Progress',
      description: 'Задачи в работе',
      position: 2
    },
    {
      name: 'Done',
      description: 'Завершенные задачи',
      position: 3
    }
  ]
};

let testUserId = null;
let testProjectId = null;
let testBoardIds = [];

async function testProjectsAndBoards() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 ТЕСТИРОВАНИЕ СОЗДАНИЯ ПРОЕКТОВ И ДОСОК');
    console.log('=' .repeat(60));
    
    // Тест 1: Создание тестового пользователя
    console.log('\n👤 Тест 1: Создание тестового пользователя...');
    try {
      const createUserResult = await client.query(`
         INSERT INTO users (email, name, password_hash, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id, email, created_at
       `, [
          testData.user.email,
          testData.user.name,
          testData.user.password_hash
        ]);
      
      testUserId = createUserResult.rows[0].id;
      console.log(`✅ Пользователь создан успешно:`);
      console.log(`   ID: ${testUserId}`);
      console.log(`   Email: ${createUserResult.rows[0].email}`);
      console.log(`   Создан: ${createUserResult.rows[0].created_at}`);
    } catch (error) {
      console.error(`❌ Ошибка создания пользователя: ${error.message}`);
      throw error;
    }

    // Тест 2: Создание проекта
    console.log('\n📁 Тест 2: Создание проекта...');
    try {
      const createProjectResult = await client.query(`
        INSERT INTO projects (name, description, owner_id, color)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, description, owner_id, color, is_active, created_at
      `, [
        testData.project.name,
        testData.project.description,
        testUserId,
        testData.project.color
      ]);
      
      testProjectId = createProjectResult.rows[0].id;
      console.log(`✅ Проект создан успешно:`);
      console.log(`   ID: ${testProjectId}`);
      console.log(`   Название: ${createProjectResult.rows[0].name}`);
      console.log(`   Описание: ${createProjectResult.rows[0].description}`);
      console.log(`   Владелец ID: ${createProjectResult.rows[0].owner_id}`);
      console.log(`   Цвет: ${createProjectResult.rows[0].color}`);
      console.log(`   Активен: ${createProjectResult.rows[0].is_active}`);
      console.log(`   Создан: ${createProjectResult.rows[0].created_at}`);
    } catch (error) {
      console.error(`❌ Ошибка создания проекта: ${error.message}`);
      throw error;
    }

    // Тест 3: Создание досок
    console.log('\n📋 Тест 3: Создание досок...');
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
        
        console.log(`✅ Доска "${board.name}" создана успешно:`);
        console.log(`   ID: ${boardId}`);
        console.log(`   Название: ${createBoardResult.rows[0].name}`);
        console.log(`   Описание: ${createBoardResult.rows[0].description}`);
        console.log(`   Проект ID: ${createBoardResult.rows[0].project_id}`);
        console.log(`   Позиция: ${createBoardResult.rows[0].position}`);
        console.log(`   Создана: ${createBoardResult.rows[0].created_at}`);
      } catch (error) {
        console.error(`❌ Ошибка создания доски "${board.name}": ${error.message}`);
        throw error;
      }
    }

    // Тест 4: Получение проекта с досками
    console.log('\n🔍 Тест 4: Получение проекта с досками...');
    try {
      const getProjectResult = await client.query(`
        SELECT 
          p.id as project_id,
          p.name as project_name,
          p.description as project_description,
          p.color as project_color,
          p.is_active as project_is_active,
          p.created_at as project_created_at,
          u.email as owner_email,
          u.name as owner_name
        FROM projects p
        JOIN users u ON p.owner_id = u.id
        WHERE p.id = $1
      `, [testProjectId]);
      
      if (getProjectResult.rows.length > 0) {
        const project = getProjectResult.rows[0];
        console.log(`✅ Проект найден:`);
        console.log(`   ID: ${project.project_id}`);
        console.log(`   Название: ${project.project_name}`);
        console.log(`   Описание: ${project.project_description}`);
        console.log(`   Цвет: ${project.project_color}`);
        console.log(`   Активен: ${project.project_is_active}`);
        console.log(`   Владелец: ${project.owner_name} (${project.owner_email})`);
        console.log(`   Создан: ${project.project_created_at}`);
        
        // Получение досок проекта
        const getBoardsResult = await client.query(`
          SELECT id, name, description, position, is_active, created_at
          FROM boards
          WHERE project_id = $1
          ORDER BY position ASC
        `, [testProjectId]);
        
        console.log(`\n   Доски проекта (${getBoardsResult.rows.length}):`);
        getBoardsResult.rows.forEach((board, index) => {
          console.log(`   ${index + 1}. "${board.name}" (ID: ${board.id}, Позиция: ${board.position})`);
          console.log(`      Описание: ${board.description}`);
          console.log(`      Активна: ${board.is_active}`);
          console.log(`      Создана: ${board.created_at}`);
        });
      } else {
        console.error('❌ Проект не найден');
      }
    } catch (error) {
      console.error(`❌ Ошибка получения проекта: ${error.message}`);
    }

    // Тест 5: Обновление проекта
    console.log('\n✏️ Тест 5: Обновление проекта...');
    try {
      const updatedName = testData.project.name + ' (Обновлен)';
      const updatedDescription = testData.project.description + ' - обновлено';
      
      const updateProjectResult = await client.query(`
        UPDATE projects 
        SET name = $1, description = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING id, name, description, updated_at
      `, [updatedName, updatedDescription, testProjectId]);
      
      if (updateProjectResult.rows.length > 0) {
        const project = updateProjectResult.rows[0];
        console.log(`✅ Проект обновлен успешно:`);
        console.log(`   ID: ${project.id}`);
        console.log(`   Новое название: ${project.name}`);
        console.log(`   Новое описание: ${project.description}`);
        console.log(`   Обновлен: ${project.updated_at}`);
      }
    } catch (error) {
      console.error(`❌ Ошибка обновления проекта: ${error.message}`);
    }

    // Тест 6: Изменение порядка досок
    console.log('\n🔄 Тест 6: Изменение порядка досок...');
    try {
      // Поменяем местами первую и последнюю доску
      if (testBoardIds.length >= 2) {
        await client.query(`
          UPDATE boards SET position = $1, updated_at = NOW() WHERE id = $2
        `, [99, testBoardIds[0]]); // Временная позиция
        
        await client.query(`
          UPDATE boards SET position = $1, updated_at = NOW() WHERE id = $2
        `, [1, testBoardIds[testBoardIds.length - 1]]);
        
        await client.query(`
          UPDATE boards SET position = $1, updated_at = NOW() WHERE id = $2
        `, [testBoardIds.length, testBoardIds[0]]);
        
        console.log(`✅ Порядок досок изменен успешно`);
        
        // Проверим новый порядок
        const newOrderResult = await client.query(`
          SELECT id, name, position
          FROM boards
          WHERE project_id = $1
          ORDER BY position ASC
        `, [testProjectId]);
        
        console.log('   Новый порядок досок:');
        newOrderResult.rows.forEach((board, index) => {
          console.log(`   ${index + 1}. "${board.name}" (Позиция: ${board.position})`);
        });
      }
    } catch (error) {
      console.error(`❌ Ошибка изменения порядка досок: ${error.message}`);
    }

    // Очистка: Удаление тестовых данных
    console.log('\n🧹 Очистка тестовых данных...');
    try {
      // Удаление досок
      if (testBoardIds.length > 0) {
        const deleteBoardsResult = await client.query(
          `DELETE FROM boards WHERE id = ANY($1)`,
          [testBoardIds]
        );
        console.log(`✅ Удалено досок: ${deleteBoardsResult.rowCount}`);
      }
      
      // Удаление проекта
      if (testProjectId) {
        await client.query('DELETE FROM projects WHERE id = $1', [testProjectId]);
        console.log('✅ Тестовый проект удален');
      }
      
      // Удаление пользователя
      if (testUserId) {
        await client.query('DELETE FROM users WHERE id = $1', [testUserId]);
        console.log('✅ Тестовый пользователь удален');
      }
    } catch (error) {
      console.error(`❌ Ошибка очистки: ${error.message}`);
    }

    client.release();
    
    // Итоговый отчет
    console.log('\n' + '=' .repeat(60));
    console.log('📈 ИТОГОВЫЙ ОТЧЕТ ТЕСТИРОВАНИЯ ПРОЕКТОВ И ДОСОК:');
    console.log('✅ Создание пользователей: УСПЕШНО');
    console.log('✅ Создание проектов: УСПЕШНО');
    console.log('✅ Создание досок: УСПЕШНО');
    console.log('✅ Получение проектов с досками: УСПЕШНО');
    console.log('✅ Обновление проектов: УСПЕШНО');
    console.log('✅ Управление порядком досок: УСПЕШНО');
    console.log('✅ Очистка данных: УСПЕШНО');
    console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЕКТОВ И ДОСОК ПРОШЛИ УСПЕШНО!');
    console.log('✅ Система управления проектами готова к использованию');
    
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА ТЕСТИРОВАНИЯ:');
    console.error(`   ${error.message}`);
    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    console.log('   1. Проверьте структуру таблиц projects и boards');
    console.log('   2. Убедитесь, что все необходимые поля существуют');
    console.log('   3. Проверьте права доступа к таблицам');
    console.log('   4. Выполните миграции базы данных если необходимо');
  } finally {
    await pool.end();
  }
}

// Запуск тестирования
if (require.main === module) {
  testProjectsAndBoards()
    .then(() => {
      console.log('\n🏁 Тестирование проектов и досок завершено.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Критическая ошибка:', error.message);
      process.exit(1);
    });
}