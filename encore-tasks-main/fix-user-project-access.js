const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function fixUserProjectAccess() {
  console.log('🔧 Исправление доступа пользователя к проектам через Supabase...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Отсутствуют переменные окружения Supabase');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    console.log('✅ Supabase клиент инициализирован');
    
    // Ищем или создаем тестового пользователя
    let { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', 'test@example.com')
      .single();
    
    let user;
    if (userError || !users) {
      console.log('👤 Пользователь test@example.com не найден, создаем нового...');
      
      // Создаем нового пользователя
      const { data: newUser, error: createUserError } = await supabase
        .from('users')
        .insert({
          email: 'test@example.com',
          name: 'Test User',
          password_hash: 'test_hash' // В реальном приложении должен быть хеш
        })
        .select()
        .single();
      
      if (createUserError) {
        console.error('❌ Ошибка создания пользователя:', createUserError.message);
        return;
      }
      
      user = newUser;
      console.log('✅ Создан новый пользователь:', user);
    } else {
      user = users;
      console.log('👤 Найден существующий пользователь:', user);
    }
    
    // Проверяем существующие проекты
     const { data: projects, error: projectsError } = await supabase
       .from('projects')
       .select('id, name, created_by')
       .order('created_at', { ascending: false })
       .limit(5);
    
    if (projectsError) {
      console.error('❌ Ошибка получения проектов:', projectsError.message);
      return;
    }
    
    console.log('📋 Существующие проекты:', projects);
    
    // Создаем тестовый проект если его нет
    let projectId;
    if (!projects || projects.length === 0) {
      console.log('🆕 Создаем новый тестовый проект...');
      const { data: newProject, error: createError } = await supabase
        .from('projects')
        .insert({
           name: 'Тестовый проект',
           description: 'Проект для тестирования функциональности',
           created_by: user.id
         })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Ошибка создания проекта:', createError.message);
        return;
      }
      
      projectId = newProject.id;
      console.log('✅ Создан проект:', newProject);
    } else {
      projectId = projects[0].id;
      console.log('📋 Используем существующий проект:', projects[0]);
    }
    
    // Проверяем членство в проекте
    const { data: membership, error: membershipError } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();
    
    if (membershipError && membershipError.code !== 'PGRST116') {
      console.error('❌ Ошибка проверки членства:', membershipError.message);
      return;
    }
    
    if (!membership) {
      console.log('➕ Добавляем пользователя в проект как администратора...');
      const { error: addMemberError } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: user.id,
          role: 'admin'
        });
      
      if (addMemberError) {
        console.error('❌ Ошибка добавления в проект:', addMemberError.message);
        return;
      }
      
      console.log('✅ Пользователь добавлен в проект');
    } else {
      console.log('✅ Пользователь уже является членом проекта:', membership);
    }
    
    // Проверяем доски проекта
    const { data: boards, error: boardsError } = await supabase
      .from('boards')
      .select('id, name')
      .eq('project_id', projectId);
    
    if (boardsError) {
      console.error('❌ Ошибка получения досок:', boardsError.message);
      return;
    }
    
    let boardId;
    if (!boards || boards.length === 0) {
      console.log('🆕 Создаем доску для проекта...');
      const { data: newBoard, error: createBoardError } = await supabase
        .from('boards')
        .insert({
          name: 'Основная доска',
          description: 'Главная доска проекта',
          project_id: projectId,
          created_by: user.id
        })
        .select()
        .single();
      
      if (createBoardError) {
        console.error('❌ Ошибка создания доски:', createBoardError.message);
        return;
      }
      
      boardId = newBoard.id;
      console.log('✅ Создана доска:', newBoard);
    } else {
      boardId = boards[0].id;
      console.log('📋 Используем существующую доску:', boards[0]);
    }
    
    // Проверяем колонки доски
    const { data: columns, error: columnsError } = await supabase
      .from('columns')
      .select('id, name, position')
      .eq('board_id', boardId)
      .order('position');
    
    if (columnsError) {
      console.error('❌ Ошибка получения колонок:', columnsError.message);
      return;
    }
    
    if (!columns || columns.length === 0) {
      console.log('🆕 Создаем базовые колонки...');
      const columnsToCreate = [
        { name: 'К выполнению', board_id: boardId, position: 0 },
        { name: 'В работе', board_id: boardId, position: 1 },
        { name: 'Выполнено', board_id: boardId, position: 2 }
      ];
      
      const { error: createColumnsError } = await supabase
        .from('columns')
        .insert(columnsToCreate);
      
      if (createColumnsError) {
        console.error('❌ Ошибка создания колонок:', createColumnsError.message);
        return;
      }
      
      console.log('✅ Созданы базовые колонки');
    } else {
      console.log('📋 Существующие колонки:', columns);
    }
    
    console.log('\n🎉 Настройка доступа завершена успешно!');
    console.log(`👤 Пользователь: ${user.email}`);
    console.log(`📋 Проект ID: ${projectId}`);
    console.log(`🗂️ Доска ID: ${boardId}`);
    
  } catch (error) {
    console.error('❌ Ошибка при настройке доступа:', error);
  }
}

fixUserProjectAccess().catch(console.error);