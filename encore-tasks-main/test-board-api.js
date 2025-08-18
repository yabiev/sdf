const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhNzM5NTI2NC1hZTk3LTQ2NmQtOGRkMy02NTQxMGE3MjY2YWEiLCJlbWFpbCI6ImF4ZWxlbmNvckBtYWlsLnJ1IiwiaWF0IjoxNzU1MzQxMDg4LCJleHAiOjE3NTU5NDU4ODh9.s9GZnXfPVfY8oCc0PAWwwg2l5pYvPgcNxaV71stZWGc';

const data = JSON.stringify({
  name: 'Test Board API',
  description: 'Test board created via API',
  projectId: '48d2ead8-a39b-4050-8179-8860f747f2dc',
  visibility: 'private',
  color: '#3B82F6'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/boards',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': `auth-token=${token}`,
    'Content-Length': data.length
  }
};

console.log('Sending request to create board...');
console.log('Token:', token.substring(0, 50) + '...');
console.log('Data:', data);

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk.toString();
  });
  
  res.on('end', () => {
    console.log('Response:', responseData);
    if (res.statusCode === 201) {
      console.log('✅ Board created successfully!');
    } else {
      console.log('❌ Failed to create board');
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(data);
req.end();