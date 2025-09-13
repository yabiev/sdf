const { Pool } = require('pg');

// Конфигурация подключения к PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'encore_tasks',
  password: 'postgres',
  port: 5432,
});

async function testUserProjects() {
  try {
    console.log('🔍 Тестирование getUserProjects...');
    
    const userId = 2;
    console.log('👤 Проверяем проекты для пользователя:', userId);
    
    // Проверяем существование пользователя
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    console.log('👤 Пользователь найден:', userResult.rows.length > 0);
    if (userResult.rows.length > 0) {
      console.log('👤 Данные пользователя:', userResult.rows[0]);
    }
    
    // Проверяем проекты, созданные пользователем
    const ownedProjectsResult = await pool.query('SELECT * FROM projects WHERE owner_id = $1', [userId]);
    console.log('📋 Проекты, созданные пользователем:', ownedProjectsResult.rows.length);
    console.log('📋 Данные проектов:', ownedProjectsResult.rows);
    
    // Проверяем членство в проектах
    const membershipResult = await pool.query('SELECT * FROM project_members WHERE user_id = $1', [userId]);
    console.log('👥 Членство в проектах:', membershipResult.rows.length);
    console.log('👥 Данные членства:', membershipResult.rows);
    
    // Выполняем основной запрос getUserProjects
    console.log('🔍 Выполняем основной запрос getUserProjects...');
    const startTime = Date.now();
    
    const result = await pool.query(
      `SELECT DISTINCT p.* FROM projects p 
       LEFT JOIN project_members pm ON p.id = pm.project_id 
       WHERE (p.owner_id = $1 OR pm.user_id = $1) 
       ORDER BY p.created_at DESC`,
      [userId]
    );
    
    const endTime = Date.now();
    console.log(`⏱️ Запрос выполнен за ${endTime - startTime}ms`);
    console.log('📊 Результат запроса:', result.rows.length, 'проектов');
    console.log('📊 Данные проектов:', result.rows);
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  } finally {
    await pool.end();
  }
}

testUserProjects();