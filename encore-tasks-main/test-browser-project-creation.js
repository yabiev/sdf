// Test script to verify project creation works in browser
// Run this in browser console after opening http://localhost:3000

async function testProjectCreationInBrowser() {
  console.log('🧪 Testing project creation in browser...');
  
  // Get auth token from cookies
  const authToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1];
    
  if (!authToken) {
    console.error('❌ No auth token found in cookies');
    return;
  }
  
  console.log('✅ Auth token found:', authToken.substring(0, 50) + '...');
  
  const testData = {
    name: 'Browser Test Project ' + Date.now(),
    description: 'Test project created from browser',
    color: '#10b981',
    isPrivate: false
  };
  
  try {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📊 Response status:', response.status);
    
    const responseData = await response.json();
    console.log('📄 Response data:', responseData);
    
    if (response.ok && responseData.data) {
      console.log('✅ Project created successfully!');
      console.log('Project ID:', responseData.data.id);
      console.log('Project Name:', responseData.data.name);
      
      // Reload the page to see the new project
      setTimeout(() => {
        console.log('🔄 Reloading page to show new project...');
        window.location.reload();
      }, 1000);
    } else {
      console.error('❌ Project creation failed:', responseData);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

// Instructions for user
console.log(`
📋 INSTRUCTIONS:
1. Open http://localhost:3000 in browser
2. Make sure you are logged in
3. Open browser console (F12)
4. Copy and paste this entire script
5. Run: testProjectCreationInBrowser()
`);

// Auto