const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('Testing login API...');
    
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });

    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    const text = await response.text();
    console.log('Response length:', text.length);
    console.log('First 200 chars:', text.substring(0, 200));
    
    if (response.ok) {
      try {
        const data = JSON.parse(text);
        console.log('✅ Login successful!');
        console.log('Token received:', data.token ? 'YES' : 'NO');
        console.log('User:', data.user ? data.user.email : 'NO USER');
        return data;
      } catch (e) {
        console.log('❌ Failed to parse JSON:', e.message);
        return null;
      }
    } else {
      console.log('❌ Request failed with status:', response.status);
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Добавим небольшую задержку, чтобы сервер успел запуститься
setTimeout(testLogin, 2000);