async function testAPI() {
  console.log('🚀 Testing Tasks API...');
  
  try {
    // Test GET /api/tasks
    console.log('\n1️⃣ Testing GET /api/tasks');
    const response = await fetch('http://localhost:3000/api/tasks');
    console.log('Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success! Tasks:', data.length);
    } else {
      const error = await response.text();
      console.log('❌ Error:', error);
    }
    
    // Test POST /api/tasks
    console.log('\n2️⃣ Testing POST /api/tasks');
    const postResponse = await fetch('http://localhost:3000/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Test Task',
        description: 'Test Description',
        column_id: 'test-column',
        reporter_id: 'test-user',
        priority: 'medium'
      })
    });
    
    console.log('Status:', postResponse.status);
    
    if (postResponse.ok) {
      const data = await postResponse.json();
      console.log('✅ Success! Created task:', data.id);
    } else {
      const error = await postResponse.text();
      console.log('❌ Error:', error);
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

testAPI();