const BASE_URL = 'http://localhost:3001';

// Функция для выполнения HTTP запросов
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return {
      status: response.status,
      ok: response.ok,
      data
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

// Функция для логирования результатов
function logResult(testName, result) {
  const status = result.status || 'ERROR';
  const statusColor = result.ok ? '✅' : '❌';
  console.log(`${statusColor} ${testName}: ${status}`);
  
  if (!result.ok) {
    console.log(`   Error: ${result.error || JSON.stringify(result.data, null, 2)}`);
  } else if (result.data) {
    console.log(`   Response: ${JSON.stringify(result.data, null, 2)}`);
  }
  console.log('');
}

// Основная функция тестирования
async function runTests() {
  console.log('🚀 Starting API Tests...\n');
  
  let authToken = null;
  let projectId = null;
  let boardId = null;
  let columnId = null;
  let taskId = null;
  
  // 1. Тест авторизации
  console.log('📝 Testing Authentication...');
  const loginResult = await makeRequest(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'password123'
    })
  });
  
  logResult('POST /api/auth/login', loginResult);
  
  if (loginResult.ok && loginResult.data.token) {
    authToken = loginResult.data.token;
    console.log('🔑 Auth token obtained\n');
  } else {
    console.log('❌ Cannot proceed without auth token\n');
    return;
  }
  
  const authHeaders = {
    'Authorization': `Bearer ${authToken}`
  };
  
  // 2. Тест проектов
  console.log('📁 Testing Projects...');
  
  // GET /api/projects
  const projectsResult = await makeRequest(`${BASE_URL}/api/projects`, {
    headers: authHeaders
  });
  logResult('GET /api/projects', projectsResult);
  
  if (projectsResult.ok && projectsResult.data.data && projectsResult.data.data.length > 0) {
    projectId = projectsResult.data.data[0].id;
    console.log(`📌 Using project ID: ${projectId}\n`);
  }
  
  // POST /api/projects
  const createProjectResult = await makeRequest(`${BASE_URL}/api/projects`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Test Project API',
      description: 'Test project for API testing'
    })
  });
  logResult('POST /api/projects', createProjectResult);
  
  if (createProjectResult.ok && createProjectResult.data.data) {
    projectId = createProjectResult.data.data.id;
  }
  
  // 3. Тест досок
  console.log('📋 Testing Boards...');
  
  if (projectId) {
    // GET /api/boards
    const boardsResult = await makeRequest(`${BASE_URL}/api/boards?projectId=${projectId}`, {
      headers: authHeaders
    });
    logResult('GET /api/boards', boardsResult);
    
    // POST /api/boards
    const createBoardResult = await makeRequest(`${BASE_URL}/api/boards`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Test Board API',
        description: 'Test board for API testing',
        project_id: projectId
      })
    });
    logResult('POST /api/boards', createBoardResult);
    
    if (createBoardResult.ok && createBoardResult.data.data) {
      boardId = createBoardResult.data.data.id;
    }
  }
  
  // 4. Тест колонок
  console.log('📊 Testing Columns...');
  
  if (boardId) {
    // GET /api/columns
    const columnsResult = await makeRequest(`${BASE_URL}/api/columns?boardId=${boardId}`, {
      headers: authHeaders
    });
    logResult('GET /api/columns', columnsResult);
    
    // POST /api/columns
    const createColumnResult = await makeRequest(`${BASE_URL}/api/columns`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Test Column API',
        board_id: boardId,
        position: 1
      })
    });
    logResult('POST /api/columns', createColumnResult);
    
    if (createColumnResult.ok && createColumnResult.data.data) {
      columnId = createColumnResult.data.data.id;
    }
  }
  
  // 5. Тест задач
  console.log('📝 Testing Tasks...');
  
  if (columnId) {
    // GET /api/tasks
    const tasksResult = await makeRequest(`${BASE_URL}/api/tasks?columnId=${columnId}`, {
      headers: authHeaders
    });
    logResult('GET /api/tasks', tasksResult);
    
    // POST /api/tasks
    const createTaskResult = await makeRequest(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Test Task API',
        description: 'Test task for API testing',
        column_id: columnId,
        priority: 'medium',
        status: 'todo'
      })
    });
    logResult('POST /api/tasks', createTaskResult);
    
    if (createTaskResult.ok && createTaskResult.data.data) {
      taskId = createTaskResult.data.data.id;
      
      // GET /api/tasks/[id]
      const taskDetailResult = await makeRequest(`${BASE_URL}/api/tasks/${taskId}`, {
        headers: authHeaders
      });
      logResult('GET /api/tasks/[id]', taskDetailResult);
      
      // PUT /api/tasks/[id]
      const updateTaskResult = await makeRequest(`${BASE_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          title: 'Updated Test Task API',
          description: 'Updated test task for API testing',
          priority: 'high'
        })
      });
      logResult('PUT /api/tasks/[id]', updateTaskResult);
      
      // DELETE /api/tasks/[id]
      const deleteTaskResult = await makeRequest(`${BASE_URL}/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      logResult('DELETE /api/tasks/[id]', deleteTaskResult);
    }
  }
  
  // 6. Тест пользователей
  console.log('👥 Testing Users...');
  
  // GET /api/users
  const usersResult = await makeRequest(`${BASE_URL}/api/users`, {
    headers: authHeaders
  });
  logResult('GET /api/users', usersResult);
  
  console.log('🏁 All tests completed!');
}

// Запуск тестов
runTests().catch(console.error);