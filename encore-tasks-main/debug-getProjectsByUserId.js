const { Pool } = require('pg');

// Настройки подключения к PostgreSQL
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'encore_tasks',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true'
});

async function debugGetProjectsByUserId() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Отладка метода getProjectsByUserId');
    
    // Проверим пользователя с ID 1
    const userId = 1;
    console.log(`\n1️⃣ Проверка пользователя с ID: ${userId}`);
    
    // Сначала проверим все проекты в таблице
    console.log('\n📋 Все проекты в таблице:');
    const allProjectsResult = await client.query('SELECT * FROM projects ORDER BY created_at DESC');
    console.log('Количество проектов:', allProjectsResult.rows.length);
    allProjectsResult.rows.forEach(project => {
      console.log(`  - ID: ${project.id}, Название: ${project.name}, owner_id: ${project.owner_id}, is_active: ${project.is_active}`);
    });
    
    // Теперь проверим SQL запрос из getProjectsByUserId
    console.log('\n🔍 Выполнение SQL запроса getProjectsByUserId:');
    const query = `
      SELECT DISTINCT p.* FROM projects p 
      LEFT JOIN project_members pm ON p.id = pm.project_id 
      WHERE (p.owner_id = $1 OR pm.user_id = $1) AND p.is_active = true 
      ORDER BY p.created_at DESC
    `;
    console.log('SQL:', query);
    console.log('Параметры:', [userId]);
    
    const result = await client.query(query, [userId]);
    console.log('\n✅ Результат запроса:');
    console.log('Количество найденных проектов:', result.rows.length);
    result.rows.forEach(project => {
      console.log(`  - ID: ${project.id}, Название: ${project.name}, owner_id: ${project.owner_id}`);
    });
    
    // Проверим таблицу project_members
    console.log('\n👥 Проверка таблицы project_members:');
    const membersResult = await client.query('SELECT * FROM project_members WHERE user_id = $1', [userId]);
    console.log('Количество записей в project_members для пользователя:', membersResult.rows.length);
    membersResult.rows.forEach(member => {
      console.log(`  - project_id: ${member.project_id}, user_id: ${member.user_id}, role: ${member.role}`);
    });
    
    // Проверим условие owner_id отдельно
    console.log('\n👤 Проекты где пользователь является владельцем:');
    const ownerResult = await client.query('SELECT * FROM projects WHERE owner_id = $1 AND is_active = true', [userId]);
    console.log('Количество проектов как владелец:', ownerResult.rows.length);
    ownerResult.rows.forEach(project => {
      console.log(`  - ID: ${project.id}, Название: ${project.name}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка при отладке:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

debugGetProjectsByUserId().catch(console.error);