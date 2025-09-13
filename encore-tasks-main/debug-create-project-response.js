const fetch = require('node-fetch');
const fs = require('fs');

// Read auth token from get-auth-token.js output or use a test token
const getAuthToken = () => {
  try {
    // Try to read from a previous auth token file if it exists
    if (fs.existsSync('./auth-token.txt')) {
      return fs.readFileSync('./auth-token.txt', 'utf8').trim();
    }
    // Fallback: use a test token (you may need to update this)
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzYTAyOGRkNS01MzI3LTQ1N2EtYjhkNC0xMWM3ZTJjNzA2Y2UiLCJlbWFpbCI6ImF4ZWxlbmNvcmVAbWFpbC5ydSIsInRpbWVzdGFtcCI6MTc1NjI4MDc3MTAwMiwicmFuZG9tIjoia3VtanRrNjJhNGQiLCJpYXQiOjE3NTYyODA3NzEsImV4cCI6MTc1Njg4NTU3MX0.DvsANsi_fE5vVoX6TGo3E7TGxUxb-YjAvUiHu-SprcM';
  } catch (error) {
    console.error('Error reading auth token:', error);
    return null;
  }
};

async function debugCreateProjectResponse() {
  const authToken = getAuthToken();
  
  if (!authToken) {
    console.error('❌ No auth token available');
    return;
  }

  console.log('🔍 Debugging createProject API response format');
  console.log('📝 Auth token:', authToken.substring(0, 50) + '...');
  
  const testProjectData = {
    name: 'Debug Test Project ' + Date.now(),
    description: 'Test project for debugging API response format',
    color: '#6366f1',
    isPrivate: false
  };
  
  console.log('📤 Sending request with data:', testProjectData);
  
  try {
    const response = await fetch('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Cookie': `auth-token=${authToken}`
      },
      body: JSON.stringify(testProjectData)
    });
    
    console.log('\n📊 RESPONSE ANALYSIS:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('\n📄 Raw Response Body:');
    console.log(responseText);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('\n🔍 Parsed Response Data:');
      console.log(JSON.stringify(responseData, null, 2));
      
      console.log('\n🧪 STRUCTURE ANALYSIS:');
      console.log('response.data exists:', !!responseData.data);
      console.log('response.data?.project exists:', !!responseData.data?.project);
      console.log('response.error exists:', !!responseData.error);
      
      if (responseData.data) {
        console.log('\n📋 response.data structure:');
        console.log('Keys in response.data:', Object.keys(responseData.data));
        
        if (responseData.data.project) {
          console.log('\n✅ response.data.project found:');
          console.log('Project ID:', responseData.data.project.id);
          console.log('Project Name:', responseData.data.project.name);
        } else {
          console.log('\n❌ response.data.project NOT found');
          console.log('Available keys in response.data:', Object.keys(responseData.data));
        }
      }
      
      console.log('\n🎯 EXPECTED vs ACTUAL:');
      console.log('AppContext expects: response.data?.project');
      console.log('Actual structure: response.data.' + (responseData.data ? Object.keys(responseData.data).join(', ') : 'undefined'));
      
    } catch (parseError) {
      console.error('❌ Failed to parse response as JSON:', parseError);
      console.log('Response might not be JSON format');
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

// Run the debug function
debugCreateProjectResponse().catch(console.error);