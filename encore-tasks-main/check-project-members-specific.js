const http = require('http');

async function checkProjectData() {
  const projectId = '9ad068a1-1ca8-45b3-b1bc-4c8800cb79ee';
  const userId = 'a7395264-ae97-466d-8dd3-65410a7266aa';
  
  console.log('Checking project data for:');
  console.log('Project ID:', projectId);
  console.log('User ID:', userId);
  console.log('');

  // Функция для выполнения HTTP запроса
  function makeRequest(path) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (e) {
            resolve(data);
          }
        });
      });

      req.on('error', (e) => {
        reject(e);
      });

      req.end();
    });
  }

  try {
    // Получаем информацию о проектах
    console.log('Fetching projects...');
    const projects = await makeRequest('/api/projects');
    console.log('Projects response:', JSON.stringify(projects, null, 2));
    console.log('');

    // Ищем наш проект
    const targetProject = projects.find(p => p.id === projectId);
    if (targetProject) {
      console.log('Target project found:');
      console.log('- Name:', targetProject.name);
      console.log('- Creator ID:', targetProject.creator_id);
      console.log('- Is user the creator?', targetProject.creator_id === userId);
    } else {
      console.log('Target project NOT found in projects list');
    }
    console.log('');

    // Получаем информацию о пользователях
    console.log('Fetching users...');
    const users = await makeRequest('/api/users');
    console.log('Users response:', JSON.stringify(users, null, 2));
    console.log('');

    // Ищем нашего пользователя
    const targetUser = users.find(u => u.id === userId);
    if (targetUser) {
      console.log('Target user found:');
      console.log('- Name:', targetUser.name);
      console.log('- Email:', targetUser.email);
      console.log('- Role:', targetUser.role);
    } else {
      console.log('Target user NOT found in users list');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkProjectData().catch(console.error);