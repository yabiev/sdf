const { Pool } = require('pg');
require('dotenv').config();

// Конфигурация подключения к PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'encore_tasks',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'encore_password_2024',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function fixBoardsSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Начинаем исправление схемы таблицы boards...');
    
    // Проверяем существование столбцов
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'boards' AND table_schema = 'public'
    `);
    
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    console.log('📋 Существующие столбцы:', existingColumns);
    
    // Добавляем недостающие столбцы
    const columnsToAdd = [
      { name: 'visibility', sql: 'ALTER TABLE boards ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT \'private\';' },
      { name: 'color', sql: 'ALTER TABLE boards ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT \'#3B82F6\';' },
      { name: 'settings', sql: 'ALTER TABLE boards ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT \'{}\';' },
      { name: 'created_by', sql: 'ALTER TABLE boards ADD COLUMN IF NOT EXISTS created_by UUID;' }
    ];
    
    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        console.log(`➕ Добавляем столбец ${column.name}...`);
        await client.query(column.sql);
        console.log(`✅ Столбец ${column.name} добавлен`);
      } else {
        console.log(`⏭️ Столбец ${column.name} уже существует`);
      }
    }
    
    // Добавляем ограничения
    try {
      await client.query(`
        ALTER TABLE boards 
        ADD CONSTRAINT IF NOT EXISTS boards_visibility_check 
        CHECK (visibility IN ('private', 'public'))
      `);
      console.log('✅ Ограничение для visibility добавлено');
    } catch (error) {
      console.log('⚠️ Ограничение для visibility уже существует или не может быть добавлено');
    }
    
    // Добавляем внешний ключ для created_by
    try {
      await client.query(`
        ALTER TABLE boards 
        ADD CONSTRAINT IF NOT EXISTS fk_boards_created_by 
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('✅ Внешний ключ для created_by добавлен');
    } catch (error) {
      console.log('⚠️ Внешний ключ для created_by уже существует или не может быть добавлен');
    }
    
    // Обновляем существующие записи
    await client.query(`
      UPDATE boards 
      SET 
        visibility = COALESCE(visibility, 'private'),
        color = COALESCE(color, '#3B82F6'),
        settings = COALESCE(settings, '{}'::jsonb)
      WHERE visibility IS NULL OR color IS NULL OR settings IS NULL
    `);
    
    console.log('🎉 Схема таблицы boards успешно исправлена!');
    
  } catch (error) {
    console.error('❌ Ошибка при исправлении схемы:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await fixBoardsSchema();
    console.log('✅ Миграция завершена успешно');
  } catch (error) {
    console.error('❌ Ошибка миграции:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixBoardsSchema };