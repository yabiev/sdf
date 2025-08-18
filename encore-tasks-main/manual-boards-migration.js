const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Конфигурация подключения к PostgreSQL
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'encore_tasks',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'encore_password_2024'
};

async function runBoardsMigration() {
  const client = new Client(dbConfig);
  
  try {
    console.log('Подключение к PostgreSQL...');
    await client.connect();
    console.log('✅ Подключение установлено');
    
    // Проверяем текущую структуру таблицы boards
    console.log('\n📋 Проверка текущей структуры таблицы boards...');
    const currentStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'boards' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Текущие столбцы в таблице boards:');
    currentStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Читаем и выполняем миграцию
    console.log('\n🔄 Выполнение миграции boards...');
    const migrationPath = path.join(__dirname, 'migrations', '007_update_boards_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(migrationSQL);
    console.log('✅ Миграция boards выполнена успешно');
    
    // Проверяем обновленную структуру
    console.log('\n📋 Проверка обновленной структуры таблицы boards...');
    const updatedStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'boards' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Обновленные столбцы в таблице boards:');
    updatedStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Проверяем количество записей
    const countResult = await client.query('SELECT COUNT(*) as count FROM boards');
    console.log(`\n📊 Количество досок в базе данных: ${countResult.rows[0].count}`);
    
    console.log('\n🎉 Миграция boards завершена успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка при выполнении миграции boards:', error.message);
    console.error('Детали ошибки:', error);
  } finally {
    await client.end();
    console.log('🔌 Соединение с базой данных закрыто');
  }
}

// Запуск миграции
if (require.main === module) {
  runBoardsMigration();
}

module.exports = { runBoardsMigration };