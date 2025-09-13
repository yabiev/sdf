const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Загружаем переменные окружения
require('dotenv').config();

async function resetDatabase() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT) || 5432,
    database: process.env.POSTGRES_DB || 'postgres',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    ssl: false
  });

  try {
    console.log('🔄 Подключение к PostgreSQL...');
    const client = await pool.connect();
    
    console.log('🗑️ Удаление существующих таблиц...');
    
    // Удаляем таблицы в правильном порядке (учитывая внешние ключи)
    const dropTables = [
      'task_tags',
      'attachments', 
      'comments',
      'tasks',
      'columns',
      'boards',
      'project_members',
      'user_projects',
      'projects',
      'tags',
      'notifications',
      'user_sessions',
      'sessions',
      'users',
      '_prisma_migrations'
    ];
    
    for (const table of dropTables) {
      try {
        await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`✅ Таблица ${table} удалена`);
      } catch (error) {
        console.log(`⚠️ Таблица ${table} не найдена или уже удалена`);
      }
    }
    
    console.log('📄 Чтение файла миграции...');
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '001_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('⚡ Применение миграции...');
    await client.query(migrationSQL);
    
    console.log('✅ Миграция успешно применена!');
    
    // Создаем административного пользователя
    console.log('👤 Создание административного пользователя...');
    const adminEmail = 'axelencore@mail.ru';
    const adminPassword = 'admin123';
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    await client.query(`
      INSERT INTO users (email, password_hash, name, role) 
      VALUES ($1, $2, $3, $4) 
      ON CONFLICT (email) DO NOTHING
    `, [adminEmail, passwordHash, 'Admin User', 'admin']);
    
    console.log('✅ Административный пользователь создан!');
    console.log('🎉 База данных успешно сброшена и настроена!');
    
    client.release();
  } catch (error) {
    console.error('❌ Ошибка сброса базы данных:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetDatabase();