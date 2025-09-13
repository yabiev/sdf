const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Загружаем переменные окружения
require('dotenv').config();

async function applyMigration() {
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
    
    client.release();
  } catch (error) {
    console.error('❌ Ошибка применения миграции:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();