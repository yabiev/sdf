const { Pool } = require('pg');
require('dotenv').config();

// Сначала подключаемся к базе postgres для проверки
const defaultPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: 'postgres', // Попробуем стандартный пароль
  ssl: process.env.DB_SSL === 'true'
});

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'encore_tasks',
  user: process.env.DB_USER || 'postgres',
  password: 'postgres',
  ssl: process.env.DB_SSL === 'true'
});

async function checkProjectMembers() {
  try {
    console.log('🔍 Проверяем подключение к PostgreSQL...');
    
    // Сначала проверяем подключение к postgres
    let defaultClient;
    try {
      defaultClient = await defaultPool.connect();
      console.log('✅ Подключение к PostgreSQL успешно');
      
      // Проверяем существование базы данных encore_tasks
      const dbCheck = await defaultClient.query(`
        SELECT 1 FROM pg_database WHERE datname = 'encore_tasks'
      `);
      
      if (dbCheck.rows.length === 0) {
        console.log('📦 База данных encore_tasks не найдена, создаём...');
        await defaultClient.query('CREATE DATABASE encore_tasks');
        console.log('✅ База данных encore_tasks создана');
      } else {
        console.log('✅ База данных encore_tasks существует');
      }
      
      defaultClient.release();
    } catch (error) {
      console.error('❌ Ошибка подключения к PostgreSQL:', error.message);
      if (defaultClient) defaultClient.release();
      return;
    }
    
    console.log('🔍 Подключение к базе данных encore_tasks...');
    
    // Проверяем подключение к encore_tasks
    const client = await pool.connect();
    console.log('✅ Подключение к encore_tasks успешно');
    
    // Сначала проверим структуру таблицы users
    const tableCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Структура таблицы users:');
    tableCheck.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });
    
    // Получаем всех пользователей (используем правильные названия столбцов)
    const usersResult = await client.query('SELECT id, name, email FROM users ORDER BY id');
    console.log('\n👥 Пользователи:');
    usersResult.rows.forEach(user => {
      console.log(`  ID: ${user.id}, Name: ${user.name}, Email: ${user.email}`);
    });
    
    // Проверим структуру таблицы projects
    const projectTableCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'projects' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Структура таблицы projects:');
    projectTableCheck.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });
    
    // Получаем все проекты (используем правильные названия столбцов)
    const projectsResult = await client.query('SELECT id, name, owner_id FROM projects ORDER BY id');
    console.log('\n📁 Проекты:');
    projectsResult.rows.forEach(project => {
      console.log(`  ID: ${project.id}, Name: ${project.name}, Owner: ${project.owner_id}`);
    });
    
    // Получаем всех участников проектов
    const membersResult = await client.query(`
      SELECT 
        pm.project_id, 
        pm.user_id, 
        pm.role,
        p.name as project_name,
        u.name as user_name
      FROM project_members pm
      JOIN projects p ON pm.project_id = p.id
      JOIN users u ON pm.user_id = u.id
      ORDER BY pm.project_id, pm.user_id
    `);
    
    console.log('\n🔗 Участники проектов:');
    if (membersResult.rows.length === 0) {
      console.log('  ❌ Нет участников в проектах!');
    } else {
      membersResult.rows.forEach(member => {
        console.log(`  Проект: ${member.project_name} (ID: ${member.project_id}), Пользователь: ${member.user_name} (ID: ${member.user_id}), Роль: ${member.role}`);
      });
    }
    
    // Проверяем конкретно первого пользователя и первый проект
    if (usersResult.rows.length > 0 && projectsResult.rows.length > 0) {
      const firstUser = usersResult.rows[0];
      const firstProject = projectsResult.rows[0];
      
      console.log(`\n🔍 Проверяем доступ пользователя ${firstUser.name} (ID: ${firstUser.id}) к проекту ${firstProject.name} (ID: ${firstProject.id})`);
      
      const accessCheck = await client.query(`
        SELECT EXISTS(
          SELECT 1 FROM project_members 
          WHERE project_id = $1 AND user_id = $2
        ) as has_access
      `, [firstProject.id, firstUser.id]);
      
      console.log(`  Доступ: ${accessCheck.rows[0].has_access ? '✅ Есть' : '❌ Нет'}`);
      
      // Если доступа нет, добавляем пользователя как участника
      if (!accessCheck.rows[0].has_access) {
        console.log(`\n➕ Добавляем пользователя ${firstUser.name} в проект ${firstProject.name} с ролью 'member'`);
        await client.query(`
          INSERT INTO project_members (project_id, user_id, role, created_at)
          VALUES ($1, $2, 'member', NOW())
        `, [firstProject.id, firstUser.id]);
        console.log('✅ Пользователь добавлен!');
      }
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
    await defaultPool.end();
  }
}

checkProjectMembers();