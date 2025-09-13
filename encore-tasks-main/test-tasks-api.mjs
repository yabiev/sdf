import { createClient } from '@supabase/supabase-js';

async function testTasksAPI() {
  const supabaseUrl = 'https://euxwfktskphfspcaqhfz.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eHdma3Rza3BoZnNwY2FxaGZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzI0NTM1NywiZXhwIjoyMDcyODIxMzU3fQ.QAWk6Z4jOC52eXchMJbC5uXXRbJ0aPIKPmvCGURH_SE';
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const baseUrl = 'http://localhost:3000';
  
  let testUserId = null;
  let testProjectId = null;
  let testBoardId = null;
  let testColumnId = null;
  let testTaskId = null;
  
  try {
    console.log('🚀 Starting Tasks API tests...');
    
    // Создаем тестовые данные
    console.log('\n📋 Setting up test data...');
    
    // 1. Создаем пользователя
     const { data: user, error: userError } = await supabase
       .from('users')
       .insert({
         email: 'test@example.com',
         password_hash: 'test-hash-123',
         name: 'Test User'
       })
       .select()
       .single();
    
    if (userError) {
      console.error('❌ Error creating test user:', userError);
      return;
    }
    
    testUserId = user.id;
    console.log('✅ Created test user:', user.id);
    
    // 2. Создаем проект
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: 'Test Project for API',
        description: 'Test project for API testing',
        owner_id: 'test-user-id'
      })
      .select()
      .single();
    
    if (projectError) {
      console.error('❌ Error creating test project:', projectError);
      return;
    }
    
    testProjectId = project.id;
    console.log('✅ Created test project:', project.id);
    
    // 2. Создаем доску
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .insert({
        name: 'Test Board',
        project_id: testProjectId
      })
      .select()
      .single();
    
    if (boardError) {
      console.error('❌ Error creating test board:', boardError);
      return;
    }
    
    testBoardId = board.id;
    console.log('✅ Created test board:', board.id);
    
    // 3. Создаем колонку
    const { data: column, error: columnError } = await supabase
      .from('columns')
      .insert({
        name: 'Test Column',
        board_id: testBoardId,
        position: 1
      })
      .select()
      .single();
    
    if (columnError) {
      console.error('❌ Error creating test column:', columnError);
      return;
    }
    
    testColumnId = column.id;
    console.log('✅ Created test column:', column.id);
    
    // Теперь тестируем API
    console.log('\n🧪 Testing Tasks API endpoints...');
    
    // Test 1: GET /api/tasks
    console.log('\n1️⃣ Testing GET /api/tasks');
    try {
      const response = await fetch(`${baseUrl}/api/tasks`);
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ GET /api/tasks - Success');
        console.log('   Response:', data);
      } else {
        console.log('❌ GET /api/tasks - Failed');
        console.log('   Status:', response.status);
        console.log('   Error:', data);
      }
    } catch (error) {
      console.log('❌ GET /api/tasks - Network Error:', error.message);
    }
    
    // Test 2: POST /api/tasks
    console.log('\n2️⃣ Testing POST /api/tasks');
    try {
      const taskData = {
        title: 'Test Task',
        description: 'This is a test task',
        column_id: testColumnId,
        position: 1,
        priority: 'medium'
      };
      
      const response = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ POST /api/tasks - Success');
        console.log('   Created task:', data);
        testTaskId = data.id;
      } else {
        console.log('❌ POST /api/tasks - Failed');
        console.log('   Status:', response.status);
        console.log('   Error:', data);
      }
    } catch (error) {
      console.log('❌ POST /api/tasks - Network Error:', error.message);
    }
    
    // Test 3: PUT /api/tasks/[id] (только если задача была создана)
    if (testTaskId) {
      console.log('\n3️⃣ Testing PUT /api/tasks/' + testTaskId);
      try {
        const updateData = {
          title: 'Updated Test Task',
          description: 'This task has been updated',
          priority: 'high'
        };
        
        const response = await fetch(`${baseUrl}/api/tasks/${testTaskId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
          console.log('✅ PUT /api/tasks/' + testTaskId + ' - Success');
          console.log('   Updated task:', data);
        } else {
          console.log('❌ PUT /api/tasks/' + testTaskId + ' - Failed');
          console.log('   Status:', response.status);
          console.log('   Error:', data);
        }
      } catch (error) {
        console.log('❌ PUT /api/tasks/' + testTaskId + ' - Network Error:', error.message);
      }
    }
    
    // Test 4: DELETE /api/tasks/[id] (только если задача была создана)
    if (testTaskId) {
      console.log('\n4️⃣ Testing DELETE /api/tasks/' + testTaskId);
      try {
        const response = await fetch(`${baseUrl}/api/tasks/${testTaskId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          console.log('✅ DELETE /api/tasks/' + testTaskId + ' - Success');
        } else {
          const data = await response.json();
          console.log('❌ DELETE /api/tasks/' + testTaskId + ' - Failed');
          console.log('   Status:', response.status);
          console.log('   Error:', data);
        }
      } catch (error) {
        console.log('❌ DELETE /api/tasks/' + testTaskId + ' - Network Error:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test setup error:', error.message);
  } finally {
    // Очищаем тестовые данные
    console.log('\n🧹 Cleaning up test data...');
    
    if (testColumnId) {
      await supabase.from('columns').delete().eq('id', testColumnId);
      console.log('✅ Deleted test column');
    }
    
    if (testBoardId) {
      await supabase.from('boards').delete().eq('id', testBoardId);
      console.log('✅ Deleted test board');
    }
    
    if (testProjectId) {
      await supabase.from('projects').delete().eq('id', testProjectId);
      console.log('✅ Deleted test project');
    }
    
    if (testUserId) {
      await supabase.from('users').delete().eq('id', testUserId);
      console.log('✅ Deleted test user');
    }
    
    console.log('\n🎉 Tests completed!');
  }
}

testTasksAPI();