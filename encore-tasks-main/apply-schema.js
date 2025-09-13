const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Конфигурация базы данных
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'encore_tasks',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.DB_HOST && process.env.DB_HOST.includes('supabase.co') ? {
    rejectUnauthorized: false
  } : false
};

async function applySchema() {
  const pool = new Pool(config);
  
  try {
    console.log('Подключение к базе данных...');
    
    // Читаем файл схемы
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    let schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Удаляем команды создания базы данных и подключения
    schema = schema.replace(/CREATE DATABASE.*?;/gi, '');
    schema = schema.replace(/\\c .*?;/gi, '');
    
    // Разделяем на отдельные команды
    const commands = schema
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`Выполнение ${commands.length} команд...`);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.trim()) {
        try {
          await pool.query(command);
          console.log(`✅ Команда ${i + 1}/${commands.length} выполнена`);
        } catch (error) {
          if (error.code === '42P07') {
            console.log(`⚠️  Команда ${i + 1}/${commands.length} пропущена (объект уже существует)`);
          } else {
            console.error(`❌ Ошибка в команде ${i + 1}:`, error.message);
            console.error('Команда:', command.substring(0, 100) + '...');
          }
        }
      }
    }
    
    console.log('\n✅ Схема базы данных применена успешно!');
    
    // Проверяем созданные таблицы
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\nСозданные таблицы:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка при применении схемы:', error);
  } finally {
    await pool.end();
  }
}

applySchema();