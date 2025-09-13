const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

async function testSQLiteUserCreation() {
  console.log('🧪 Тестирование создания пользователя в SQLite...');
  
  const dbPath = path.join(__dirname, 'database.sqlite');
  const db = new Database(dbPath);
  
  try {
    // Тестовые данные пользователя
    const userData = {
      email: `test-${Date.now()}@example.com`,
      name: 'Test User SQLite',
      password: 'testpassword123',
      role: 'user',
      isApproved: true
    };
    
    console.log('📝 Создание пользователя:', userData.email);
    
    // Хешируем пароль
    const password_hash = await bcrypt.hash(userData.password, 10);
    const id = uuidv4();
    const now = new Date().toISOString();
    
    // Создаем пользователя
    const insertUserStmt = db.prepare(`
      INSERT INTO users (id, email, name, avatar_url, role, approval_status, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Преобразуем isApproved в число для approval_status (BOOLEAN в SQLite)
    const approvalStatus = userData.isApproved ? 1 : 0;
    
    insertUserStmt.run(id, userData.email, userData.name, null, userData.role, approvalStatus, password_hash, now, now);
    
    console.log('✅ Пользователь создан:', {
      id: id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      approval_status: approvalStatus
    });
    
    // Проверяем аутентификацию
    console.log('🔐 Проверка аутентификации...');
    const userStmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = userStmt.get(userData.email);
    
    if (user && await bcrypt.compare(userData.password, user.password_hash)) {
      console.log('✅ Аутентификация успешна');
    } else {
      console.log('❌ Ошибка аутентификации');
      return;
    }
    
    // Создаем проект
    console.log('📁 Создание проекта...');
    const projectId = uuidv4();
    const projectData = {
      name: 'Test Project SQLite',
      description: 'Test project for SQLite',
      creator_id: id
    };
    
    const insertProjectStmt = db.prepare(`
      INSERT INTO projects (id, name, description, creator_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    insertProjectStmt.run(projectId, projectData.name, projectData.description, projectData.creator_id, now, now);
    
    console.log('✅ Проект создан:', {
      id: projectId,
      name: projectData.name,
      creator_id: projectData.creator_id
    });
    
    // Добавляем создателя в project_members
    const insertMemberStmt = db.prepare(`
      INSERT INTO project_members (project_id, user_id, role, joined_at)
      VALUES (?, ?, ?, ?)
    `);
    
    insertMemberStmt.run(projectId, id, 'owner', now);
    console.log('✅ Создатель добавлен в участники проекта');
    
    // Проверяем членство в проекте
    console.log('👥 Проверка членства в проекте...');
    const memberStmt = db.prepare(`
      SELECT COUNT(*) as count FROM project_members 
      WHERE project_id = ? AND user_id = ?
    `);
    const memberCheck = memberStmt.get(projectId, id);
    const hasAccess = memberCheck.count > 0;
    console.log('✅ Доступ к проекту:', hasAccess);
    
    // Создаем доску
    console.log('📋 Создание доски...');
    const boardId = uuidv4();
    const boardData = {
      name: 'Test Board SQLite',
      project_id: projectId
    };
    
    const insertBoardStmt = db.prepare(`
      INSERT INTO boards (id, name, project_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    insertBoardStmt.run(boardId, boardData.name, boardData.project_id, now, now);
    
    console.log('✅ Доска создана:', {
      id: boardId,
      name: boardData.name,
      project_id: boardData.project_id
    });
    
    // Создаем колонку
    console.log('📊 Создание колонки...');
    const columnId = uuidv4();
    const columnData = {
      name: 'Test Column',
      board_id: boardId,
      position: 0,
      color: '#6B7280'
    };
    
    const insertColumnStmt = db.prepare(`
      INSERT INTO columns (id, name, board_id, position, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertColumnStmt.run(columnId, columnData.name, columnData.board_id, columnData.position, columnData.color, now, now);
    
    console.log('✅ Колонка создана:', {
      id: columnId,
      name: columnData.name,
      board_id: columnData.board_id,
      position: columnData.position
    });
    
    // Создаем задачу
    console.log('📝 Создание задачи...');
    const taskId = uuidv4();
    const taskData = {
      title: 'Test Task SQLite',
      description: 'Test task description',
      column_id: columnId,
      position: 0,
      priority: 'medium',
      created_by: id
    };
    
    const insertTaskStmt = db.prepare(`
      INSERT INTO tasks (id, title, description, column_id, position, priority, status, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertTaskStmt.run(taskId, taskData.title, taskData.description, taskData.column_id, taskData.position, taskData.priority, 'todo', taskData.created_by, now, now);
    
    console.log('✅ Задача создана:', {
      id: taskId,
      title: taskData.title,
      column_id: taskData.column_id,
      created_by: taskData.created_by
    });
    
    console.log('\n🎉 Все тесты SQLite прошли успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка в тестах SQLite:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    db.close();
  }
}

testSQLiteUserCreation();