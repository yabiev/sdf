const { Pool } = require('pg');

// Настройки подключения к базе данных
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'encore_tasks',
  password: 'postgres',
  port: 5432,
});

async function testPermissions() {
  try {
    console.log('🧪 Testing access permissions system...');
    console.log('=' .repeat(50));
    
    // 1. Проверяем структуру ролей в системе
    console.log('\n1. Checking user roles in the system:');
    const usersQuery = 'SELECT id, name, email FROM users';
    const usersResult = await pool.query(usersQuery);
    
    console.log('Users in system:');
    usersResult.rows.forEach(user => {
      console.log(`  - ${user.name} (${user.email})`);
    });
    
    // 2. Проверяем проекты и их владельцев
    console.log('\n2. Checking projects and ownership:');
    const projectsQuery = `
      SELECT p.id, p.name, p.owner_id, u.name as owner_name
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
    `;
    const projectsResult = await pool.query(projectsQuery);
    
    console.log('Projects:');
    projectsResult.rows.forEach(project => {
      console.log(`  - ${project.name} (ID: ${project.id})`);
      console.log(`    Owner: ${project.owner_name}`);
    });
    
    // 3. Проверяем участников проектов
    console.log('\n3. Checking project memberships:');
    const membersQuery = `
      SELECT pm.project_id, p.name as project_name, pm.user_id, u.name as user_name, pm.role
      FROM project_members pm
      LEFT JOIN projects p ON pm.project_id = p.id
      LEFT JOIN users u ON pm.user_id = u.id
      ORDER BY p.name, pm.role
    `;
    const membersResult = await pool.query(membersQuery);
    
    console.log('Project memberships:');
    const projectMemberships = {};
    membersResult.rows.forEach(member => {
      if (!projectMemberships[member.project_name]) {
        projectMemberships[member.project_name] = [];
      }
      projectMemberships[member.project_name].push({
        user: member.user_name,
        role: member.role
      });
    });
    
    Object.keys(projectMemberships).forEach(projectName => {
      console.log(`  ${projectName}:`);
      projectMemberships[projectName].forEach(member => {
        console.log(`    - ${member.user} (${member.role})`);
      });
    });
    
    // 4. Проверяем доски в проектах
    console.log('\n4. Checking boards in projects:');
    const boardsQuery = `
      SELECT b.id, b.name, b.project_id, p.name as project_name
      FROM boards b
      LEFT JOIN projects p ON b.project_id = p.id
      ORDER BY p.name, b.name
    `;
    const boardsResult = await pool.query(boardsQuery);
    
    console.log('Boards:');
    const projectBoards = {};
    boardsResult.rows.forEach(board => {
      if (!projectBoards[board.project_name]) {
        projectBoards[board.project_name] = [];
      }
      projectBoards[board.project_name].push(board.name);
    });
    
    Object.keys(projectBoards).forEach(projectName => {
      console.log(`  ${projectName}:`);
      projectBoards[projectName].forEach(boardName => {
        console.log(`    - ${boardName}`);
      });
    });
    
    // 5. Тестируем права доступа для создания досок
    console.log('\n5. Testing board creation permissions:');
    
    // Получаем первый проект для тестирования
    if (projectsResult.rows.length > 0) {
      const testProject = projectsResult.rows[0];
      console.log(`Testing with project: ${testProject.name}`);
      
      // Проверяем права владельца проекта
      console.log(`\n  Testing owner permissions (${testProject.owner_name}):`);
      const ownerCanCreate = await testCanUserCreateBoard(testProject.id, testProject.owner_id);
      console.log(`    Can create board: ${ownerCanCreate ? '✅ YES' : '❌ NO'}`);
      
      // Проверяем права участников проекта
      const projectMembers = membersResult.rows.filter(m => m.project_id === testProject.id);
      for (const member of projectMembers) {
        console.log(`\n  Testing ${member.role} permissions (${member.user_name}):`);
        const memberCanCreate = await testCanUserCreateBoard(testProject.id, member.user_id);
        console.log(`    Can create board: ${memberCanCreate ? '✅ YES' : '❌ NO'}`);
      }
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ Permission testing completed!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

// Функция для тестирования прав создания досок
async function testCanUserCreateBoard(projectId, userId) {
  try {
    // Проверяем, является ли пользователь владельцем проекта
    const ownerQuery = 'SELECT owner_id FROM projects WHERE id = $1';
    const ownerResult = await pool.query(ownerQuery, [projectId]);
    
    if (ownerResult.rows.length > 0 && ownerResult.rows[0].owner_id === userId) {
      return true;
    }
    
    // Проверяем членство в проекте
    const memberQuery = 'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2';
    const memberResult = await pool.query(memberQuery, [projectId, userId]);
    
    if (memberResult.rows.length > 0) {
      const role = memberResult.rows[0].role;
      return role === 'admin' || role === 'member';
    }
    
    return false;
  } catch (error) {
    console.error(`Error testing permissions for user ${userId}:`, error.message);
    return false;
  }
}

testPermissions();