const http = require('http');

// Test configuration
const API_BASE = 'http://localhost:3000';
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User'
};

let authToken = null;
let testProjectId = null;
let testBoardId = null;
let testColumnId = null;
let testTaskId = null;

// HTTP request helper
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: jsonBody, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test functions
async function registerUser() {
  console.log('\n=== Registering test user ===');
  const response = await makeRequest('POST', '/api/auth/register', TEST_USER);
  console.log(`Status: ${response.status}`);
  if (response.status !== 201 && response.status !== 409) {
    console.log('Response:', response.data);
    throw new Error('Failed to register user');
  }
  console.log('✓ User registration successful');
}

async function loginUser() {
  console.log('\n=== Logging in test user ===');
  const response = await makeRequest('POST', '/api/auth/login', {
    email: TEST_USER.email,
    password: TEST_USER.password
  });
  console.log(`Status: ${response.status}`);
  if (response.status !== 200) {
    console.log('Response:', response.data);
    throw new Error('Failed to login user');
  }
  authToken = response.data.token;
  console.log('✓ User login successful');
}

async function createTestProject() {
  console.log('\n=== Creating test project ===');
  const response = await makeRequest('POST', '/api/projects', {
    name: 'Test Project',
    description: 'Test project for API testing'
  }, { Authorization: `Bearer ${authToken}` });
  console.log(`Status: ${response.status}`);
  if (response.status !== 201) {
    console.log('Response:', response.data);
    throw new Error('Failed to create project');
  }
  testProjectId = response.data.data ? response.data.data.id : response.data.id;
  console.log('✓ Test project created:', testProjectId);
}

async function createTestBoard() {
  console.log('\n=== Creating test board ===');
  const response = await makeRequest('POST', '/api/boards', {
    name: 'Test Board',
    description: 'Test board for API testing',
    project_id: testProjectId,
    icon: '📋'
  }, { Authorization: `Bearer ${authToken}` });
  console.log(`Status: ${response.status}`);
  if (response.status !== 201) {
    console.log('Response:', response.data);
    throw new Error('Failed to create board');
  }
  testBoardId = response.data.data ? response.data.data.id : response.data.id;
  console.log('✓ Test board created:', testBoardId);
}

async function createTestColumn() {
  console.log('\n=== Creating test column ===');
  const response = await makeRequest('POST', '/api/columns', {
    title: 'Test Column',
    board_id: testBoardId,
    position: 0
  }, { Authorization: `Bearer ${authToken}` });
  console.log(`Status: ${response.status}`);
  if (response.status !== 201) {
    console.log('Response:', response.data);
    throw new Error('Failed to create column');
  }
  testColumnId = response.data.column ? response.data.column.id : response.data.id;
  console.log('✓ Test column created:', testColumnId);
}

async function testGetTasks() {
  console.log('\n=== Testing GET /api/tasks ===');
  const response = await makeRequest('GET', '/api/tasks', null, { Authorization: `Bearer ${authToken}` });
  console.log(`Status: ${response.status}`);
  if (response.status === 500) {
    console.log('❌ GET /api/tasks returned 500 error');
    console.log('Response:', response.data);
    return false;
  }
  console.log('✓ GET /api/tasks successful');
  return true;
}

async function testCreateTask() {
  console.log('\n=== Testing POST /api/tasks ===');
  const taskData = {
    title: 'Test Task',
    description: 'This is a test task',
    column_id: String(testColumnId),
    priority: 'medium',
    status: 'todo'
  };
  const response = await makeRequest('POST', '/api/tasks', taskData, { Authorization: `Bearer ${authToken}` });
  console.log(`Status: ${response.status}`);
  if (response.status === 500) {
    console.log('❌ POST /api/tasks returned 500 error');
    console.log('Response:', response.data);
    return false;
  }
  if (response.status === 201) {
    testTaskId = response.data.id;
    console.log('✓ POST /api/tasks successful, task ID:', testTaskId);
    return true;
  }
  console.log('Response:', response.data);
  return false;
}

async function testUpdateTask() {
  if (!testTaskId) {
    console.log('\n=== Skipping PUT test - no task ID ===');
    return true;
  }
  console.log('\n=== Testing PUT /api/tasks/[id] ===');
  const updateData = {
    title: 'Updated Test Task',
    description: 'This task has been updated',
    priority: 'high'
  };
  const response = await makeRequest('PUT', `/api/tasks/${testTaskId}`, updateData, { Authorization: `Bearer ${authToken}` });
  console.log(`Status: ${response.status}`);
  if (response.status === 500) {
    console.log('❌ PUT /api/tasks/[id] returned 500 error');
    console.log('Response:', response.data);
    return false;
  }
  console.log('✓ PUT /api/tasks/[id] successful');
  return true;
}

async function testDeleteTask() {
  if (!testTaskId) {
    console.log('\n=== Skipping DELETE test - no task ID ===');
    return true;
  }
  console.log('\n=== Testing DELETE /api/tasks/[id] ===');
  const response = await makeRequest('DELETE', `/api/tasks/${testTaskId}`, null, { Authorization: `Bearer ${authToken}` });
  console.log(`Status: ${response.status}`);
  if (response.status === 500) {
    console.log('❌ DELETE /api/tasks/[id] returned 500 error');
    console.log('Response:', response.data);
    return false;
  }
  console.log('✓ DELETE /api/tasks/[id] successful');
  return true;
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Tasks API tests...');
  
  try {
    // Setup
    await registerUser();
    await loginUser();
    await createTestProject();
    await createTestBoard();
    await createTestColumn();
    
    // Test Tasks API
    const results = {
      get: await testGetTasks(),
      post: await testCreateTask(),
      put: await testUpdateTask(),
      delete: await testDeleteTask()
    };
    
    // Summary
    console.log('\n=== TEST RESULTS ===');
    console.log(`GET /api/tasks: ${results.get ? '✓ PASS' : '❌ FAIL'}`);
    console.log(`POST /api/tasks: ${results.post ? '✓ PASS' : '❌ FAIL'}`);
    console.log(`PUT /api/tasks/[id]: ${results.put ? '✓ PASS' : '❌ FAIL'}`);
    console.log(`DELETE /api/tasks/[id]: ${results.delete ? '✓ PASS' : '❌ FAIL'}`);
    
    const allPassed = Object.values(results).every(result => result);
    console.log(`\n${allPassed ? '🎉 All tests passed!' : '⚠️  Some tests failed'}`);
    
    if (!allPassed) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Test setup failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests();