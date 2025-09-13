const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Настройка подключения к PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'encore_tasks',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true'
});

async function testProjectCreation() {
  try {
    console.log('🔑 Создаем JWT токен и сессию для тестирования');
    
    // Создаем JWT токен для тестового пользователя
    const testUserId = 1;
    const token = jwt.sign(
      { 
        userId: testUserId, 
        email: 'axelencore@mail.ru',
        timestamp: Date.now(),
        random: Math.random().toString(36).substring(2, 15)
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Создаем сессию в базе данных
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 дней
    await pool.query(
      'INSERT INTO sessions (session_token, user_id, expires_at, created_at) VALUES ($1, $2, $3, NOW())',
      [token, testUserId, expiresAt]
    );
    
    console.log('✅ Сессия создана в базе данных');

    
    // Данные для создания проекта
    const projectData = {
      name: 'API Test Project',
      description: 'Проект для тестирования API через скрипт',
      color: '#10B981'
    };
    
    console.log('📤 Отправляем запрос на создание проекта...');
    
    // Отправляем POST запрос с аутентификацией
    const response = await fetch('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Cookie': `auth-token=${token}`
      },
      body: JSON.stringify(projectData)
    });
    
    console.log('📊 Статус ответа:', response.status);
    
    const responseData = await response.json();
    console.log('📋 Ответ сервера:', JSON.stringify(responseData, null, 2));
    
    if (response.ok) {
      console.log('✅ Проект успешно создан через API!');
    } else {
      console.log('❌ Ошибка при создании проекта:', responseData.error);
    }
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании API:', error.message);
  }
}

testProjectCreation();