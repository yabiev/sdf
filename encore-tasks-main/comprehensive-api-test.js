const https = require('https');
const http = require('http');

// Disable SSL verification for local testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BASE_URL = 'http://localhost:3002';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInRpbWVzdGFtcCI6MTc1NzE1NDg3NTM1MCwicmFuZG9tIjoiandoYm1jdG81MiIsImlhdCI6MTc1NzE1NDg3NSwiZXhwIjoxNzU3NzU5Njc1fQ.EiOIYsAqC82DundGe4rMtKM37sBUplv2gS6NbLFv9m8';

class APITester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, BASE_URL);
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKEN}`,
          ...headers
        }
      };

      const req = http.request(url, options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const jsonBody = body ? JSON.parse(body) : null;
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: jsonBody,
              rawBody: body
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: null,
              rawBody: body,
              parseError: e.message
            });
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  async test(name, testFn) {
    try {
      console.log(`\n🧪 Testing: ${name}`);
      await testFn();
      this.results.passed++;
      console.log(`✅ PASSED: ${name}`);
    } catch (error) {
      this.results.failed++;
      this.results.errors.push({ test: name, error: error.message });
      console.log(`❌ FAILED: ${name} - ${error.message}`);
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive API Tests\n');

    // Test Auth API
    await this.test('Auth - Login with valid credentials', async () => {
      const response = await this.makeRequest('POST', '/api/auth/login', {
        email: 'test@example.com',
        password: 'password123'
      });
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${response.rawBody}`);
      }
      
      if (!response.body || !response.body.token) {
        throw new Error('No token in response');
      }
    });

    // Test Projects API
    await this.test('Projects - GET all projects', async () => {
      const response = await this.makeRequest('GET', '/api/projects');
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${response.rawBody}`);
      }
      
      if (!Array.isArray(response.body)) {
        throw new Error('Response should be an array');
      }
    });

    await this.test('Projects - POST create new project', async () => {
      const response = await this.makeRequest('POST', '/api/projects', {
        name: 'Test Project API',
        description: 'Test project for API validation'
      });
      
      if (response.status !== 201 && response.status !== 200) {
        throw new Error(`Expected 201/200, got ${response.status}: ${response.rawBody}`);
      }
    });

    // Test Boards API
    await this.test('Boards - GET all boards', async () => {
      const response = await this.makeRequest('GET', '/api/boards');
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${response.rawBody}`);
      }
    });

    await this.test('Boards - POST create new board', async () => {
      const newBoard = {
        name: 'Test Board',
        description: 'Test board description',
        project_id: '94'
      };
      const response = await this.makeRequest('POST', '/api/boards', newBoard);
      
      if (response.status !== 201 && response.status !== 200) {
        throw new Error(`Expected 201/200, got ${response.status}: ${response.rawBody}`);
      }
    });

    // Test Columns API
    await this.test('Columns - GET columns for board', async () => {
      const response = await this.makeRequest('GET', '/api/columns?board_id=10');
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${response.rawBody}`);
      }
    });

    await this.test('Columns - POST create new column', async () => {
      const response = await this.makeRequest('POST', '/api/columns', {
        title: 'Test Column API',
        board_id: 10,
        position: 0
      });
      
      if (response.status !== 201 && response.status !== 200) {
        throw new Error(`Expected 201/200, got ${response.status}: ${response.rawBody}`);
      }
    });

    // Test Tasks API - This is where we expect to find 500 errors
    await this.test('Tasks - GET all tasks', async () => {
      const response = await this.makeRequest('GET', '/api/tasks');
      
      if (response.status === 500) {
        throw new Error(`Server error 500: ${response.rawBody}`);
      }
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${response.rawBody}`);
      }
    });

    await this.test('Tasks - GET tasks for column', async () => {
      const response = await this.makeRequest('GET', '/api/tasks?column_id=37');
      
      if (response.status === 500) {
        throw new Error(`Server error 500: ${response.rawBody}`);
      }
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${response.rawBody}`);
      }
    });

    await this.test('Tasks - POST create new task', async () => {
      const newTask = {
        title: 'Test Task',
        description: 'Test task description',
        column_id: 37,
        priority: 'medium',
        status: 'todo'
      };
      const response = await this.makeRequest('POST', '/api/tasks', newTask);
      
      if (response.status === 500) {
        throw new Error(`Server error 500: ${response.rawBody}`);
      }
      
      if (response.status !== 201 && response.status !== 200) {
        throw new Error(`Expected 201/200, got ${response.status}: ${response.rawBody}`);
      }
    });

    // Test error scenarios
    await this.test('Error handling - Invalid endpoint', async () => {
      const response = await this.makeRequest('GET', '/api/nonexistent');
      
      if (response.status !== 404) {
        throw new Error(`Expected 404, got ${response.status}`);
      }
    });

    await this.test('Error handling - Unauthorized request', async () => {
      const response = await this.makeRequest('GET', '/api/projects', null, {
        'Authorization': 'Bearer invalid-token'
      });
      
      if (response.status !== 401) {
        throw new Error(`Expected 401, got ${response.status}`);
      }
    });

    this.printResults();
  }

  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
    
    if (this.results.errors.length > 0) {
      console.log('\n🚨 ERRORS FOUND:');
      this.results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.test}: ${error.error}`);
      });
    }
    
    console.log('\n' + '='.repeat(50));
    
    if (this.results.failed === 0) {
      console.log('🎉 ALL TESTS PASSED! API is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please check the errors above.');
    }
  }
}

// Run the tests
const tester = new APITester();
tester.runAllTests().catch(console.error);