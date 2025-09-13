const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'encore_tasks',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

const pool = new Pool(config);

async function testAuthAndProject() {
  try {
    const client = await pool.connect();
    
    // Получаем пользователя
    const userResult = await client.query('SELECT * FROM users WHERE email = $1', ['axelencore@mail.ru']);
    if (userResult.rows.length === 0) {
      console.log('❌ Пользователь не найден');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('👤 Найден пользователь:', { id: user.id, email: user.email, name: user.name });
    
    // Создаем JWT токен
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign(
      { 
        userId: user.id.toString(), 
        email: user.email 
      }, 
      jwtSecret, 
      { expiresIn: '24h' }
    );
    
    console.log('🔑 JWT токен создан:', token.substring(0, 50) + '...');
    
    // Тестируем создание проекта напрямую через адаптер
    console.log('\n🏗️ Тестируем создание проекта...');
    
    const projectData = {
      name: 'Тестовый проект',
      description: 'Проект для тестирования API',
      color: '#3B82F6'
    };
    
    // Используем тот же SQL что и в адаптере
    const projectResult = await client.query(
      `INSERT INTO projects (name, description, color, owner_id, is_active, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [projectData.name, projectData.description, projectData.color, user.id, true]
    );
    
    const project = projectResult.rows[0];
    console.log('✅ Проект создан успешно:', {
      id: project.id,
      name: project.name,
      description: project.description,
      color: project.color,
      owner_id: project.owner_id
    });
    
    client.release();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error('Детали ошибки:', error);
  } finally {
    await pool.end();
  }
}

testAuthAndProject();